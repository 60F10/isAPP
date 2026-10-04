// La cola de salida: lógica pura (DOC 06 §8.4 y §8.5, T-206).
//
// Sin red, sin IndexedDB y sin reloj propio: la hora y el azar entran como
// argumento, para poder probarlo todo. El vaciador (`vaciador.ts`) y el
// almacén (`api/almacen.ts`) se apoyan en estas funciones.
//
// LA COLA NO SABE QUÉ ES UN GOL (DOC 06 §4.2). Un trabajo es una fila que
// viaja a una tabla; lo que significa es cosa de `match`.

import type { CargaDeTrabajo, Entidad, Operacion, Trabajo } from '@shared/lib/db';

/** Lo enviado se purga a las 48 horas de confirmarlo (DOC 06 §8.5). */
export const PURGA_MS = 48 * 60 * 60 * 1000;

const RETRASO_INICIAL_MS = 1_000;
const RETRASO_MAXIMO_MS = 60_000;
/** Para que los cuatro dispositivos no vuelvan a la vez cuando regresa la cobertura. */
const MARGEN_ALEATORIO_MS = 1_000;

/** Lo que devuelve el transporte, reducido a lo que decide qué hacer. */
export interface ResultadoDeEnvio {
  ok: boolean;
  /** Estado HTTP. `0` es que no hubo respuesta: sin red o cortada a mitad. */
  status: number;
  /** Código de PostgreSQL o de PostgREST, o `SIN_FILAS`. */
  code: string | null;
  mensaje: string | null;
}

export type Decision = 'exito' | 'reintentar' | 'definitivo';

/**
 * Espera antes del siguiente intento: 1 s, 2 s, 4 s, 8 s… hasta 60 s, más
 * hasta un segundo al azar.
 *
 * @param intentos los hechos ya, contando el que acaba de fallar.
 * @param azar entre 0 y 1, `Math.random()` en la aplicación.
 */
export function retrasoTras(intentos: number, azar: number): number {
  const exponente = Math.max(0, intentos - 1);
  const base = Math.min(RETRASO_INICIAL_MS * 2 ** exponente, RETRASO_MAXIMO_MS);

  return base + Math.floor(azar * MARGEN_ALEATORIO_MS);
}

/**
 * Qué hacer con un envío.
 *
 * - El duplicado de una inserción (23505) es éxito: la fila lleva una clave
 *   que genera el dispositivo, como `client_event_id` (D06-12), y si ya está
 *   es que el primer envío llegó aunque la respuesta se perdiera.
 * - Sin respuesta, 5xx, 401 (sesión caducada, se renueva sola), 408 y 429 se
 *   reintentan: son de la red o del momento, no del dato.
 * - El resto de 4xx y `SIN_FILAS` son definitivos: una violación de RLS o de
 *   una regla del reglamento no se arregla repitiéndola.
 */
export function clasificar(resultado: ResultadoDeEnvio, op: Operacion): Decision {
  if (resultado.ok) {
    return 'exito';
  }

  if (op === 'insert' && resultado.code === '23505') {
    return 'exito';
  }

  const { status } = resultado;

  if (status === 0 || status >= 500 || status === 401 || status === 408 || status === 429) {
    return 'reintentar';
  }

  return 'definitivo';
}

function listoParaEnviar(trabajo: Trabajo): boolean {
  return trabajo.status === 'pending' || trabajo.status === 'sending';
}

/**
 * Lo que toca enviar ya: el primero sin enviar de cada partido, si le ha
 * llegado la hora.
 *
 * Orden por partido y no global (DOC 06 §8.5): dentro de un partido, un
 * trabajo aplazado frena a los de detrás, porque una sustitución va antes que
 * el gol de quien entró; entre partidos, uno atascado no frena a los demás.
 * Uno fallido no frena: ya no se va a enviar, y se enseña en la interfaz.
 *
 * `sending` cuenta como pendiente. Con un solo vaciador por cerrojo, uno que
 * se encuentra así es de una pestaña que murió a mitad de envío, y reenviarlo
 * es seguro por la idempotencia.
 */
export function elegirListos(trabajos: readonly Trabajo[], ahora: number): Trabajo[] {
  const primeros = new Map<string, Trabajo>();

  for (const trabajo of trabajos) {
    if (!listoParaEnviar(trabajo)) {
      continue;
    }

    const actual = primeros.get(trabajo.matchId);

    if (actual === undefined || trabajo.createdAt < actual.createdAt) {
      primeros.set(trabajo.matchId, trabajo);
    }
  }

  return [...primeros.values()]
    .filter((trabajo) => trabajo.nextAttemptAt <= ahora)
    .sort((a, b) => a.createdAt - b.createdAt);
}

function textoDeError(resultado: ResultadoDeEnvio): string | null {
  const partes = [resultado.code, resultado.mensaje].filter(
    (parte): parte is string => parte !== null && parte !== '',
  );

  return partes.length === 0 ? null : partes.join(' · ');
}

/** El trabajo después de un envío, según lo decidido. Devuelve uno nuevo. */
export function aplicarDecision(
  trabajo: Trabajo,
  decision: Decision,
  resultado: ResultadoDeEnvio,
  ahora: number,
  azar: number,
): Trabajo {
  const attempts = trabajo.attempts + 1;

  if (decision === 'exito') {
    return { ...trabajo, attempts, status: 'sent', sentAt: ahora, lastError: null };
  }

  if (decision === 'reintentar') {
    return {
      ...trabajo,
      attempts,
      status: 'pending',
      nextAttemptAt: ahora + retrasoTras(attempts, azar),
      lastError: resultado.mensaje,
    };
  }

  return { ...trabajo, attempts, status: 'failed', lastError: textoDeError(resultado) };
}

/**
 * Los identificadores de lo que ya se puede borrar: lo enviado hace más de 48
 * horas. Lo fallido no se purga solo: nadie lo ha visto todavía.
 */
export function purgables(trabajos: readonly Trabajo[], ahora: number): string[] {
  return trabajos
    .filter(
      (trabajo) =>
        trabajo.status === 'sent' && trabajo.sentAt !== null && ahora - trabajo.sentAt > PURGA_MS,
    )
    .map((trabajo) => trabajo.id);
}

/** Un trabajo que el servidor rechazó, con lo justo para enseñarlo y descartarlo. */
export interface Rechazado {
  id: string;
  entity: Entidad;
  op: Operacion;
  createdAt: number;
  lastError: string | null;
}

export interface EstadoDeCola {
  /** Por enviar: pendientes y a medio enviar. */
  pendientes: number;
  /** Rechazados por el servidor, que no se van a reintentar. */
  fallidos: number;
  /** Lo que dijo el servidor del fallido más reciente. */
  ultimoError: string | null;
  /** Los rechazados de esta persona, del más reciente al más antiguo. */
  rechazados: Rechazado[];
}

/** El estado de la cola de una persona. Lo de otras cuentas no cuenta. */
export function contar(trabajos: readonly Trabajo[], userId: string): EstadoDeCola {
  const propios = trabajos.filter((trabajo) => trabajo.userId === userId);
  const fallidos = propios
    .filter((trabajo) => trabajo.status === 'failed')
    .sort((a, b) => b.createdAt - a.createdAt);
  const ultimo = fallidos[0];

  return {
    pendientes: propios.filter(listoParaEnviar).length,
    fallidos: fallidos.length,
    ultimoError: ultimo === undefined ? null : ultimo.lastError,
    rechazados: fallidos.map(({ id, entity, op, createdAt, lastError }) => ({
      id,
      entity,
      op,
      createdAt,
      lastError,
    })),
  };
}

export interface EntradaDeTrabajo {
  entity: Entidad;
  op: Operacion;
  matchId: string;
  payload: CargaDeTrabajo;
}

/**
 * Un trabajo nuevo, listo para enviar ya. Si la fila lleva
 * `client_event_id`, se copia aparte: es lo que hace seguro el reintento.
 */
export function crearTrabajo(
  entrada: EntradaDeTrabajo,
  marca: { id: string; userId: string; ahora: number },
): Trabajo {
  const clave = entrada.payload.valores.client_event_id;

  return {
    ...entrada,
    id: marca.id,
    userId: marca.userId,
    clientEventId: typeof clave === 'string' ? clave : null,
    createdAt: marca.ahora,
    attempts: 0,
    nextAttemptAt: marca.ahora,
    status: 'pending',
    lastError: null,
    sentAt: null,
  };
}
