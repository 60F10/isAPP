// La cola sobre Dexie (DOC 06 §8.2 y §8.4, T-206): el almacén que usa el
// vaciador, `encolar` y el estado observable para la banda C04.

import { liveQuery } from 'dexie';

import { db } from '@shared/lib/db';
import { supabase } from '@shared/lib/supabase';

import { contar, crearTrabajo, purgables } from '../model/cola';

import type { EntradaDeTrabajo, EstadoDeCola } from '../model/cola';
import type { Almacen } from '../model/vaciador';
import type { Trabajo } from '@shared/lib/db';

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

/** Cuántos trabajos siguen por enviar de esa persona. Para avisar antes de salir. */
export async function contarPendientes(userId: string): Promise<number> {
  return (await almacenDexie.pendientes(userId)).length;
}

/** Borra lo enviado hace más de 48 horas (DOC 06 §8.5). */
export async function purgarEnviados(ahora: number): Promise<void> {
  const enviados = await db.outbox.where('status').equals('sent').toArray();
  await db.outbox.bulkDelete(purgables(enviados, ahora));
}

/**
 * Borra lo enviado de un partido. Lo llamará el cierre (T-210): «se purga al
 * cerrar el partido o a las 48 horas, lo que llegue antes».
 */
export async function purgarPartido(matchId: string): Promise<void> {
  await db.outbox
    .where('matchId')
    .equals(matchId)
    .and((trabajo) => trabajo.status === 'sent')
    .delete();
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
