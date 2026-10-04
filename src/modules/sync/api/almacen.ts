// La cola sobre Dexie (DOC 06 §8.2 y §8.4, T-206): el almacén que usa el
// vaciador, `encolar` y el estado observable para la banda C04.

import { liveQuery } from 'dexie';

import { db } from '@shared/lib/db';
import { supabase } from '@shared/lib/supabase';

import { contar, crearTrabajo, purgables } from '../model/cola';

import type { EntradaDeTrabajo, EstadoDeCola } from '../model/cola';
import type { Almacen } from '../model/vaciador';
import type { Trabajo } from '@shared/lib/db';
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

/** Cuántos trabajos siguen por enviar de esa persona. Para avisar antes de salir. */
export async function contarPendientes(userId: string): Promise<number> {
  return (await almacenDexie.pendientes(userId)).length;
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
 * @returns si lo borró.
 */
export async function descartarRechazado(id: string, userId: string): Promise<boolean> {
  const trabajo = await db.outbox.get(id);

  if (trabajo === undefined || trabajo.status !== 'failed' || trabajo.userId !== userId) {
    return false;
  }

  await db.outbox.delete(id);

  return true;
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
