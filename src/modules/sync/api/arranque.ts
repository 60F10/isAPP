// Quién y cuándo vacía la cola (DOC 06 §8.5, D06-13, T-206).
//
// CUÁNDO: al arrancar, al volver el evento `online`, al volver la pestaña a
// primer plano, cada 10 segundos si hay red, al encolar algo y cuando alguien
// pulsa «Sincronizar ahora». Vaciar sin nada listo es una consulta a
// IndexedDB y nada más.
//
// QUIÉN: la pestaña que se lleva el cerrojo `sasi-outbox`. Sin cerrojo, dos
// pestañas abiertas mandarían lo mismo dos veces. Donde no hay API de
// cerrojos, vacía la pestaña visible.
//
// EN LA APLICACIÓN, NO EN EL SERVICE WORKER (D06-13): Safari de iOS no tiene
// Background Sync. Si se cierra la aplicación con trabajos en cola, salen al
// volver a abrirla.

import { registrarError } from '@modules/logging';

import { vaciar } from '../model/vaciador';
import { almacenDexie, purgarEnviados, usuarioActual } from './almacen';
import { enviar } from './transporte';

const CERROJO = 'sasi-outbox';
const INTERVALO_MS = 10_000;

let vaciando = false;
let otraVuelta = false;
let arrancada = false;

async function vaciarUnaVez(): Promise<void> {
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

async function conCerrojo(tarea: () => Promise<void>): Promise<void> {
  if ('locks' in navigator) {
    await navigator.locks.request(CERROJO, { ifAvailable: true }, async (cerrojo) => {
      // Otra pestaña está vaciando: ya lo manda ella.
      if (cerrojo !== null) {
        await tarea();
      }
    });
    return;
  }

  if (document.visibilityState === 'visible') {
    await tarea();
  }
}

/**
 * Vacía la cola ahora. Si ya se está vaciando en esta pestaña, apunta otra
 * vuelta en vez de lanzar un vaciado en paralelo: lo encolado mientras tanto
 * sale al terminar, sin esperar diez segundos.
 */
export async function sincronizarAhora(): Promise<void> {
  if (vaciando) {
    otraVuelta = true;
    return;
  }

  vaciando = true;

  try {
    do {
      otraVuelta = false;
      await conCerrojo(vaciarUnaVez);
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
    if (document.visibilityState === 'visible') {
      pedir();
    }
  };

  void purgarEnviados(Date.now()).catch((error: unknown) => registrarError(error, 'sync'));
  pedir();

  window.addEventListener('online', pedir);
  document.addEventListener('visibilitychange', alVolver);
  const temporizador = window.setInterval(() => {
    if (navigator.onLine) {
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
