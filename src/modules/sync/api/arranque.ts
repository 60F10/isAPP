// Quién y cuándo vacía la cola (DOC 06 §8.5, D06-13, D06-35, T-206, T-216).
//
// CUÁNDO: al arrancar, al volver el evento `online`, al volver la pestaña a
// primer plano, cada 10 segundos si hay red, al encolar algo y cuando alguien
// pulsa «Sincronizar ahora». Vaciar sin nada listo es una consulta a
// IndexedDB y nada más.
//
// QUIÉN: la pestaña que se ve y se lleva el cerrojo `sasi-outbox`. Sin
// cerrojo, dos pestañas abiertas mandarían lo mismo dos veces.
//
// SOLO LA QUE SE VE (D06-35). Una pestaña oculta ni pide el cerrojo ni empieza
// un vaciado, y si se oculta a medias, lo deja antes del siguiente trabajo.
// Chrome en Android despierta una pestaña oculta una vez por minuto: cogía el
// cerrojo, mandaba un trabajo y se dormía con él cogido, y la que se veía no
// vaciaba nunca. Los registros del 04/10 lo enseñan: una petición por minuto.
//
// EL CERROJO SE ROBA. Si la pestaña que se ve se lo encuentra ocupado dos
// veces seguidas, lo pide con `steal`. Es seguro: dos vaciadores mandan lo
// mismo, los `insert` repetidos vuelven con `23505`, que ya cuenta como
// éxito, y `update` y `delete` se pueden repetir. El orden se mantiene porque
// los dos eligen el primero sin enviar de cada partido. A quien se lo roban,
// el navegador le rechaza la petición con `AbortError`: no es un fallo, y
// deja de vaciar.
//
// Donde no hay API de cerrojos, vacía la pestaña que se ve, sin más.
//
// EN LA APLICACIÓN, NO EN EL SERVICE WORKER (D06-13): Safari de iOS no tiene
// Background Sync. Si se cierra la aplicación con trabajos en cola, salen al
// volver a abrirla.

import { registrarError } from '@modules/logging';

import { decidirTurno } from '../model/turno';
import { vaciar } from '../model/vaciador';
import { almacenDexie, purgarEnviados, usuarioActual } from './almacen';
import { enviar } from './transporte';

import type { Turno } from '../model/turno';

const CERROJO = 'sasi-outbox';
const INTERVALO_MS = 10_000;

let vaciando = false;
let otraVuelta = false;
let arrancada = false;
/** Intentos seguidos de esta pestaña con el cerrojo ocupado. */
let fallosSeguidos = 0;

function seVe(): boolean {
  return document.visibilityState === 'visible';
}

function esAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
  );
}

async function vaciarUnaVez(seguir: () => boolean): Promise<void> {
  const userId = await usuarioActual();

  if (userId === null) {
    return;
  }

  const resumen = await vaciar({
    almacen: almacenDexie,
    enviar,
    userId,
    ahora: Date.now,
    azar: Math.random,
    seguir,
  });

  // Lo rechazado se registra (DOC 06 §8.5) con la tabla, la operación y lo
  // que dijo el servidor. Ni la fila ni sus valores: podrían llevar datos.
  for (const fallido of resumen.fallidos) {
    void registrarError(
      new Error(`Trabajo rechazado: ${fallido.entity} ${fallido.op} · ${fallido.lastError ?? ''}`),
      'sync',
    );
  }
}

/**
 * Pide el cerrojo, pregunta a `decidir` qué hacer según se haya conseguido o
 * no, y vacía con él cogido si toca. Devuelve lo decidido.
 *
 * Si a media tarea otra pestaña roba el cerrojo, la petición se rechaza con
 * `AbortError` aunque la tarea siga: se marca para que `seguir` dé `false` y
 * se espera a que suelte el trabajo que tenía entre manos.
 */
async function conCerrojo(
  opciones: LockOptions,
  decidir: (libre: boolean) => Turno,
): Promise<Turno> {
  let turno: Turno = 'esperar';
  let quitado = false;
  let enCurso: Promise<void> = Promise.resolve();

  try {
    await navigator.locks.request(CERROJO, opciones, (cerrojo) => {
      turno = decidir(cerrojo !== null);

      if (turno === 'vaciar') {
        enCurso = vaciarUnaVez(() => seVe() && !quitado);
      }

      return enCurso;
    });
  } catch (error) {
    if (!esAbortError(error)) {
      throw error;
    }

    quitado = true;
    await enCurso;
  }

  return turno;
}

async function vaciarSiToca(): Promise<void> {
  if (!seVe()) {
    return;
  }

  if (!('locks' in navigator)) {
    await vaciarUnaVez(seVe);
    return;
  }

  const turno = await conCerrojo({ ifAvailable: true }, (libre) => {
    fallosSeguidos = libre ? 0 : fallosSeguidos + 1;

    return decidirTurno(seVe(), libre, fallosSeguidos);
  });

  if (turno === 'robar') {
    fallosSeguidos = 0;
    // Quien roba se lo lleva siempre; solo queda mirar si la pestaña se sigue
    // viendo.
    await conCerrojo({ steal: true }, () => decidirTurno(seVe(), true, 0));
  }
}

/**
 * Vacía la cola ahora, si la pestaña se ve: una oculta sale sin hacer nada
 * (D06-35). Si ya se está vaciando en esta pestaña, apunta otra vuelta en vez
 * de lanzar un vaciado en paralelo: lo encolado mientras tanto sale al
 * terminar, sin esperar diez segundos.
 */
export async function sincronizarAhora(): Promise<void> {
  if (!seVe()) {
    return;
  }

  if (vaciando) {
    otraVuelta = true;
    return;
  }

  vaciando = true;

  try {
    do {
      otraVuelta = false;
      await vaciarSiToca();
    } while (otraVuelta);
  } catch (error) {
    // IndexedDB cerrada o sin espacio: se registra y se reintenta en la
    // siguiente vuelta. Nada de lo encolado se ha borrado.
    void registrarError(error, 'sync');
  } finally {
    vaciando = false;
  }
}

/**
 * Arranca la sincronización. Una sola vez por pestaña: la segunda llamada no
 * hace nada. Devuelve la función que la para, para el desmontaje.
 */
export function arrancarSincronizacion(): () => void {
  if (arrancada) {
    return () => undefined;
  }

  arrancada = true;

  const pedir = () => {
    void sincronizarAhora();
  };

  const alVolver = () => {
    if (seVe()) {
      pedir();
    }
  };

  void purgarEnviados(Date.now()).catch((error: unknown) => registrarError(error, 'sync'));
  pedir();

  window.addEventListener('online', pedir);
  document.addEventListener('visibilitychange', alVolver);
  // Con la página oculta no se pide nada: los navegadores del móvil la
  // despiertan una vez por minuto, y de ahí salía el vaciado a cuentagotas.
  const temporizador = window.setInterval(() => {
    if (navigator.onLine && seVe()) {
      pedir();
    }
  }, INTERVALO_MS);

  return () => {
    arrancada = false;
    window.removeEventListener('online', pedir);
    document.removeEventListener('visibilitychange', alVolver);
    window.clearInterval(temporizador);
  };
}
