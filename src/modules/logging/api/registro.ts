// Registro silencioso de errores en `error_logs` (DOC 06 §10.1, E12-04).
//
// Una sola puerta: `registrarError`. La llaman el Error Boundary, la pantalla
// de error del enrutador, la captura global de `window` y el contexto de
// acceso cuando no contesta.
//
// TRES REGLAS QUE NO SE NEGOCIAN:
//
//   1. Registrar nunca rompe nada. Si la inserción falla —sin red, sin sesión,
//      la RLS dice que no—, se traga el fallo y sigue. Un registro de errores
//      que lanza errores deja a la aplicación peor de lo que estaba.
//   2. Solo con sesión. La política `error_logs_insert` es para
//      `authenticated`: sin sesión, la fila no entra y ni se intenta. El fallo
//      se queda en la consola, que es lo único que hay.
//   3. Nada personal ni ningún testigo: lo limpia `construirFilaDeError`.

import { supabase } from '@shared/lib/supabase';

import { construirFilaDeError, crearLimitador, normalizarError } from '../model/errorLog';
import { insertarErrorLog } from './errorLogs';

import type { Dispositivo, OrigenDeError } from '../model/errorLog';

// Diez filas por carga y el mismo mensaje, una vez por minuto. El porqué, en
// `crearLimitador`.
const dejarPasar = crearLimitador({ maximo: 10, ventanaMs: 60_000 });

// Club del equipo activo. Lo fija `AuthProvider`, que es quien lo sabe: este
// módulo no puede importar de `auth` (DOC 06 §4.2, `logging` solo depende de
// `shared`), así que es `auth` quien se lo cuenta a `logging` y no al revés.
let clubActivo: string | null = null;

/** Apunta el club del equipo activo para las filas que vengan. */
export function fijarClubDeRegistro(clubId: string | null): void {
  clubActivo = clubId;
}

/**
 * Lo mínimo para reproducir un fallo, y nada que identifique a nadie.
 *
 * El agente de usuario dice navegador, versión y sistema; el tamaño de la
 * ventana explica los fallos de maquetación; `enLinea` separa los fallos de
 * red de los de código; `instalada` dice si se abrió como PWA o en pestaña.
 */
function leerDispositivo(): Dispositivo {
  return {
    agente: navigator.userAgent,
    idioma: navigator.language,
    ancho: window.innerWidth,
    alto: window.innerHeight,
    enLinea: navigator.onLine,
    // `matchMedia` falta en algún navegador viejo y en jsdom. Sin esta guarda,
    // leer el dispositivo lanzaría y se perdería la fila entera por un dato
    // accesorio.
    instalada:
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches,
  };
}

/**
 * Manda un error a `error_logs` en segundo plano. Nunca lanza.
 *
 * @param error lo que se haya lanzado, sea o no un `Error`.
 * @param origen de dónde viene. Sale delante del mensaje, entre corchetes.
 * @param detalle texto técnico extra que se añade a la traza, como la pila de
 *   componentes que da React. Pasa por la misma limpieza que el resto.
 */
export async function registrarError(
  error: unknown,
  origen: OrigenDeError,
  detalle?: string,
): Promise<void> {
  try {
    const { mensaje, traza } = normalizarError(error);

    if (!dejarPasar(`${origen}:${mensaje}`, Date.now())) {
      return;
    }

    // `getSession` lee del almacenamiento local, no pregunta a la red.
    const { data } = await supabase.auth.getSession();

    if (data.session === null) {
      return;
    }

    const trazaCompleta =
      detalle === undefined ? traza : [traza, detalle].filter((parte) => parte !== null).join('\n');

    await insertarErrorLog(
      construirFilaDeError({
        origen,
        mensaje,
        traza: trazaCompleta,
        ruta: window.location.pathname,
        userId: data.session.user.id,
        clubId: clubActivo,
        appVersion: __APP_VERSION__,
        dispositivo: leerDispositivo(),
      }),
    );
  } catch {
    // Regla 1: el registro no rompe nada. Tampoco se pinta en la consola: si
    // la red está caída, cada fallo de registro sería una línea más de ruido.
  }
}

/**
 * Engancha lo que ningún Error Boundary ve: errores en manejadores de eventos,
 * en temporizadores y promesas rechazadas sin `catch`. Devuelve la función que
 * los desengancha, para usarla desde un efecto de React.
 */
export function instalarCapturaGlobal(): () => void {
  const alFallar = (evento: ErrorEvent) => {
    void registrarError(evento.error ?? evento.message, 'global');
  };

  const alRechazar = (evento: PromiseRejectionEvent) => {
    void registrarError(evento.reason, 'promesa');
  };

  window.addEventListener('error', alFallar);
  window.addEventListener('unhandledrejection', alRechazar);

  return () => {
    window.removeEventListener('error', alFallar);
    window.removeEventListener('unhandledrejection', alRechazar);
  };
}
