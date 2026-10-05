// La cola sobre Dexie (DOC 06 §8.2 y §8.4, T-206): el almacén que usa el
// vaciador, `encolar` y el estado observable para la banda C04.

import { liveQuery } from 'dexie';

import { db } from '@shared/lib/db';
import { supabase } from '@shared/lib/supabase';

import { contar, crearTrabajo, purgables } from '../model/cola';

import type { EntradaDeTrabajo, EstadoDeCola } from '../model/cola';
import type { Almacen } from '../model/vaciador';
import type { Entidad, Trabajo } from '@shared/lib/db';
import type { Table } from 'dexie';

export const almacenDexie: Almacen = {
  pendientes: async (userId) =>
    (await db.outbox.where('status').anyOf('pending', 'sending').toArray()).filter(
      (trabajo) => trabajo.userId === userId,
    ),
  guardar: async (trabajo) => {
    await db.outbox.put(trabajo);
  },
};

/** Quien tiene la sesión abierta. Lee la sesión guardada: funciona sin red. */
export async function usuarioActual(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();

  return data.session === null ? null : data.session.user.id;
}

/**
 * Mete un trabajo en la cola y lo devuelve. Guardar en local es lo único que
 * tiene que salir bien para no perder el dato (DOC 04, I-07): el envío llega
 * cuando pueda. Lanza si no hay sesión, porque sin ella no se sabría de quién
 * es ni se podría mandar nunca.
 */
export async function encolarTrabajo(entrada: EntradaDeTrabajo): Promise<Trabajo> {
  const userId = await usuarioActual();

  if (userId === null) {
    throw new Error('Sin sesión: no se puede encolar.');
  }

  const trabajo = crearTrabajo(entrada, { id: crypto.randomUUID(), userId, ahora: Date.now() });
  await db.outbox.add(trabajo);

  return trabajo;
}

/**
 * Mete varios trabajos en la cola y ejecuta `tambien` en la misma
 * transacción de IndexedDB: o se guarda todo o no se guarda nada. Es lo que
 * usa el directo para guardar su estado junto con las filas que genera, de
 * forma que un cierre a mitad no deje una parte abierta en el móvil y sin
 * encolar, ni al revés (T-207).
 *
 * `tambien` solo puede tocar Dexie: cualquier otra espera dentro de la
 * transacción la cerraría antes de tiempo. Los trabajos llevan un
 * milisegundo de diferencia para que su orden sea el de la lista.
 *
 * `tablas` son las que toca `tambien` (D06-35, T-216). Con ellas, la
 * transacción se abre sobre la cola y esas tablas, y no espera detrás de lo
 * que otra pestaña tenga a medias en las demás; si `tambien` escribe en una
 * que no está en la lista, Dexie rechaza y no se guarda nada. Sin ellas se
 * abre sobre todas.
 */
export async function encolarTrabajosJunto(
  entradas: readonly EntradaDeTrabajo[],
  tambien: () => Promise<void>,
  tablas?: readonly Table[],
): Promise<Trabajo[]> {
  const userId = await usuarioActual();

  if (userId === null) {
    throw new Error('Sin sesión: no se puede encolar.');
  }

  const ahora = Date.now();
  const trabajos = entradas.map((entrada, orden) =>
    crearTrabajo(entrada, { id: crypto.randomUUID(), userId, ahora: ahora + orden }),
  );

  const enTransaccion = tablas === undefined ? db.tables : [db.outbox, ...tablas];

  await db.transaction('rw', enTransaccion, async () => {
    await db.outbox.bulkAdd(trabajos);
    await tambien();
  });

  return trabajos;
}

/** Qué no entra en la cuenta de `contarPendientes`. */
export interface OpcionesDeCuenta {
  /**
   * Las entidades que no cuentan (T-221). El directo deja fuera `coverage`:
   * la cobertura se encola sola al abrir, y preguntar por «1 anotación sin
   * enviar» a quien no ha apuntado nada es mentirle. La cola sigue sin mirar
   * la fila: solo de qué tabla es (DOC 06 §4.2).
   */
  sin?: readonly Entidad[];
}

/** Cuántos trabajos siguen por enviar de esa persona. Para avisar antes de salir. */
export async function contarPendientes(
  userId: string,
  { sin = [] }: OpcionesDeCuenta = {},
): Promise<number> {
  const pendientes = await almacenDexie.pendientes(userId);

  return pendientes.filter((trabajo) => !sin.includes(trabajo.entity)).length;
}

/** Borra lo enviado hace más de 48 horas (DOC 06 §8.5). */
export async function purgarEnviados(ahora: number): Promise<void> {
  const enviados = await db.outbox.where('status').equals('sent').toArray();
  await db.outbox.bulkDelete(purgables(enviados, ahora));
}

/** Lo que queda en la cola de este aparato de un partido, de cualquier cuenta. */
export interface ColaDelPartido {
  /** Pendiente o enviándose: llegará en cuanto haya cobertura. */
  sinEnviar: number;
  /** Rechazado por el servidor: no llegará nunca solo (DOC 06 §8.5). */
  rechazados: number;
}

/**
 * Cuánto queda en la cola de un partido. Lo mira el cierre (T-210a) antes de
 * dejar cerrar: con cambios sin enviar, el servidor no tiene el partido
 * entero. Cuenta los de todas las cuentas del aparato, porque el partido es
 * el mismo aunque lo anotaran dos personas en el mismo móvil.
 */
export async function contarDelPartido(matchId: string): Promise<ColaDelPartido> {
  const trabajos = await db.outbox.where('matchId').equals(matchId).toArray();

  return {
    sinEnviar: trabajos.filter(
      (trabajo) => trabajo.status === 'pending' || trabajo.status === 'sending',
    ).length,
    rechazados: trabajos.filter((trabajo) => trabajo.status === 'failed').length,
  };
}

/** Lo que la cola de este aparato tiene de camino de los eventos de un partido. */
export interface PendientesDelPartido {
  /** Los `client_event_id` de los eventos apuntados aquí que el servidor puede no tener. */
  altas: Set<string>;
  /** Los de los eventos deshechos aquí que el servidor puede tener todavía. */
  bajas: Set<string>;
}

/**
 * Qué eventos de un partido tiene este aparato de camino (T-209b, D06-38). Lo
 * mira el directo al fundir lo que descarga con lo que tiene en pantalla:
 * sin esto, un refresco borraría lo que aún no ha llegado y resucitaría lo
 * que se acaba de deshacer.
 *
 * Cuenta lo que no está enviado —pendiente, enviándose o rechazado, que
 * sigue en la banda— y lo enviado desde `desde`, que es cuando se pidió la
 * descarga: algo confirmado después puede no venir en ella. De cualquier
 * cuenta del aparato, como `contarDelPartido`.
 *
 * ES LA ÚNICA VEZ QUE `sync` MIRA DENTRO DE UNA `clave`, y solo el campo
 * `client_event_id` de los borrados de `match_event`: una inserción lleva su
 * identificador aparte, en `clientEventId`, pero un borrado solo lo lleva
 * ahí. La cola sigue sin saber qué es un gol (DOC 06 §4.2).
 */
export async function pendientesDelPartido(
  matchId: string,
  desde: number,
): Promise<PendientesDelPartido> {
  const trabajos = await db.outbox.where('matchId').equals(matchId).toArray();
  const pendientes: PendientesDelPartido = { altas: new Set(), bajas: new Set() };

  for (const trabajo of trabajos) {
    if (trabajo.entity !== 'match_event') {
      continue;
    }

    // Enviado sin hora no debería existir; si existe, se cuenta: es mejor
    // conservar un evento de más un refresco que quitar uno que está.
    const deCamino =
      trabajo.status !== 'sent' || trabajo.sentAt === null || trabajo.sentAt >= desde;

    if (!deCamino) {
      continue;
    }

    if (trabajo.op === 'insert' && trabajo.clientEventId !== null) {
      pendientes.altas.add(trabajo.clientEventId);
    } else if (trabajo.op === 'delete') {
      const borrado = trabajo.payload.clave?.client_event_id;

      if (typeof borrado === 'string') {
        pendientes.bajas.add(borrado);
      }
    }
  }

  return pendientes;
}

/**
 * Borra lo enviado de un partido. Lo llama el cierre (T-210a): «se purga al
 * cerrar el partido o a las 48 horas, lo que llegue antes». Lo rechazado se
 * queda: nadie lo ha revisado todavía.
 */
export async function purgarPartido(matchId: string): Promise<void> {
  await db.outbox
    .where('matchId')
    .equals(matchId)
    .and((trabajo) => trabajo.status === 'sent')
    .delete();
}

/**
 * Borra de la cola un trabajo rechazado (T-219). Solo si es `failed` y de esa
 * persona: lo pendiente va a enviarse y lo de otra cuenta no es suyo.
 *
 * Es una sola operación de Dexie (T-221): el estado y el dueño se miran
 * dentro del propio borrado, no antes. Leer, comprobar y borrar en tres pasos
 * dejaba un hueco en el que otra pestaña podía cambiar el trabajo.
 *
 * @returns si lo borró. `false` es que ya no estaba, o que no era descartable.
 */
export async function descartarRechazado(id: string, userId: string): Promise<boolean> {
  const borrados = await db.outbox
    .where('id')
    .equals(id)
    .and((trabajo) => trabajo.status === 'failed' && trabajo.userId === userId)
    .delete();

  return borrados > 0;
}

/**
 * Se suscribe al estado de la cola de una persona. Dexie avisa en cada
 * cambio del almacén, también de los que haga otra pestaña.
 *
 * @returns la función que cancela la suscripción.
 */
export function observarEstado(
  userId: string,
  alCambiar: (estado: EstadoDeCola) => void,
): () => void {
  const suscripcion = liveQuery(() =>
    db.outbox.where('status').anyOf('pending', 'sending', 'failed').toArray(),
  ).subscribe({
    next: (trabajos) => {
      alCambiar(contar(trabajos, userId));
    },
    // Sin IndexedDB —navegación privada de algún navegador viejo— no hay
    // cola que enseñar. No es motivo para romper la pantalla.
    error: () => undefined,
  });

  return () => {
    suscripcion.unsubscribe();
  };
}
