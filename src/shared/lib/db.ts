// Almacén local sobre IndexedDB (DOC 06 §8.2, D06-10, T-206).
//
// Cuatro almacenes: la cola de salida (`outbox`), los eventos del partido
// (`matchEvents`), el partido precargado (`matchSnapshots`) y clave y valor
// (`meta`). Los datos van aquí y nunca a la caché del service worker (D06-09).
//
// DEXIE NO VA EN EL PAQUETE INICIAL. Pesa unos 31 kB comprimidos y el margen
// del presupuesto es de 20 kB (DOC 06 §10.3). Este archivo solo lo importan
// trozos perezosos: `sync`, `match` y lo que ellos arrastren. Si algún día lo
// importa algo del arranque, el build lo dirá con el tamaño.
//
// Vive en `shared` porque lo usan `sync` (la cola) y `match` (la precarga), y
// ninguno de los dos puede importar del otro en ese sentido (DOC 06 §4.2).
// Por eso sus tipos no saben nada de goles ni de tarjetas: `payload` y `fila`
// son la fila tal como viaja.

import Dexie from 'dexie';

import type { EntityTable } from 'dexie';

/** Qué tabla toca un trabajo de la cola (DOC 06 §8.4). */
export type Entidad = 'match' | 'match_event' | 'match_period' | 'match_squad' | 'coverage';

export type Operacion = 'insert' | 'update' | 'delete';

/** El estado del transporte, que no es el de la anotación (DOC 06 §8.6). */
export type EstadoDeEnvio = 'pending' | 'sending' | 'sent' | 'failed';

/**
 * La fila tal como va a viajar. `valores` son las columnas; `clave`, en
 * `update` y `delete`, las columnas que identifican la fila.
 */
export interface CargaDeTrabajo {
  valores: Record<string, unknown>;
  clave?: Record<string, string>;
}

/** Una fila de `outbox`: un trabajo pendiente (DOC 06 §8.4). */
export interface Trabajo {
  id: string;
  /**
   * Quién lo encoló. Solo se envía con la sesión de esa misma persona: dos
   * cuentas en un móvil no se mandan lo de la otra (D06-09).
   */
  userId: string;
  entity: Entidad;
  op: Operacion;
  payload: CargaDeTrabajo;
  /** El `client_event_id` del DOC 05, si la fila lo lleva. Da idempotencia. */
  clientEventId: string | null;
  matchId: string;
  createdAt: number;
  attempts: number;
  nextAttemptAt: number;
  status: EstadoDeEnvio;
  lastError: string | null;
  /** Cuándo lo confirmó el servidor. De ahí cuentan las 48 horas de la purga. */
  sentAt: number | null;
}

/** Un evento del partido en local, propio o ajeno. Lo rellena `match`. */
export interface EventoLocal {
  clientEventId: string;
  matchId: string;
  syncState: EstadoDeEnvio;
  period: number;
  fila: Record<string, unknown>;
}

/** El partido precargado. `datos` lo define `match`. */
export interface InstantaneaLocal {
  matchId: string;
  updatedAt: number;
  datos: unknown;
}

export interface EntradaMeta {
  key: string;
  value: unknown;
}

export const db = new Dexie('sasi') as Dexie & {
  outbox: EntityTable<Trabajo, 'id'>;
  matchEvents: EntityTable<EventoLocal, 'clientEventId'>;
  matchSnapshots: EntityTable<InstantaneaLocal, 'matchId'>;
  meta: EntityTable<EntradaMeta, 'key'>;
};

// Los índices del DOC 06 §8.2, sin tocar. `userId` y `sentAt` no llevan
// índice: se filtran en memoria sobre lo que devuelve `status`, que en una
// cola sana son unas pocas filas.
db.version(1).stores({
  outbox: 'id, status, matchId, nextAttemptAt, [matchId+createdAt]',
  matchEvents: 'clientEventId, matchId, syncState, [matchId+period]',
  matchSnapshots: 'matchId, updatedAt',
  meta: 'key',
});
