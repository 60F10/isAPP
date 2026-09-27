// Lo que el cierre mira y limpia en este aparato (T-210a).
//
// La cola es de `sync` y la precarga de `match`: aquí solo se juntan. Todo
// esto arrastra Dexie, así que solo lo carga la A13, que es perezosa.

import { olvidarPartido } from '@modules/match';
import { contarDelPartido, purgarPartido, sincronizarAhora } from '@modules/sync';
import { quitarPartidoEnCurso } from '@shared/lib/partidoEnCurso';

import type { ColaDelPartido } from '@modules/sync';

export type { ColaDelPartido };

/** Cuánto de este partido queda en la cola de este aparato. */
export function leerColaDelPartido(partidoId: string): Promise<ColaDelPartido> {
  return contarDelPartido(partidoId);
}

/** Intenta enviar ya lo que haya en la cola. */
export function enviarAhora(): Promise<void> {
  return sincronizarAhora();
}

/**
 * Con el partido cerrado en el servidor, este aparato ya no necesita su
 * precarga, sus eventos locales ni lo enviado de la cola (DOC 06 §8.5). Lo
 * rechazado se queda para revisarlo. Los demás aparatos no se enteran: lo
 * suyo se purga a las 48 horas o cuando cierren ellos.
 */
export async function limpiarPartido(partidoId: string): Promise<void> {
  await purgarPartido(partidoId);
  await olvidarPartido(partidoId);
  quitarPartidoEnCurso(partidoId);
}
