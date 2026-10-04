// Carga y guardado del directo en IndexedDB (DOC 06 §5.4 y §8.3, T-207).
//
// El directo lee de local, no de la red (D06-11). Al abrir se intenta
// refrescar la precarga; si no hay cobertura, se usa la que haya. Sin ninguna,
// no se puede jugar: la pantalla lo dice.
//
// El estado del reductor se guarda en la misma instantánea del partido, y
// junto con los trabajos que genera, en una sola transacción (`encolarJunto`).

import { encolarJunto } from '@modules/sync';
import { db } from '@shared/lib/db';

import { conEventosDelServidor, desdePaquete, elegirEstado } from '../model/directo';
import { leerInstantanea, precargarPartido } from './precarga';

import type { EstadoDirecto } from '../model/directo';
import type { Instantanea, PaqueteDePartido } from '../model/paquete';
import type { EntradaDeTrabajo } from '@modules/sync';

/** No hay precarga y no se ha podido descargar. */
export const SIN_PRECARGA = 'SIN_PRECARGA';

export interface DirectoCargado {
  paquete: PaqueteDePartido;
  estado: EstadoDirecto;
  descargadoEn: number;
  /** Si esta vez se ha podido refrescar con el servidor. */
  refrescado: boolean;
}

function esCompleto(estado: EstadoDirecto | undefined): estado is EstadoDirecto {
  return estado !== undefined && Array.isArray(estado.eventos) && Array.isArray(estado.titulares);
}

export async function cargarDirecto(partidoId: string): Promise<DirectoCargado> {
  let refrescado = true;

  try {
    await precargarPartido(partidoId);
  } catch {
    // Sin cobertura en el campo es lo normal. Se sigue con lo precargado.
    refrescado = false;
  }

  const instantanea = await leerInstantanea(partidoId);

  if (instantanea === null) {
    throw new Error(SIN_PRECARGA);
  }

  const servidor = desdePaquete(instantanea.paquete);
  // Un estado guardado con la forma de antes de la T-208 no tiene eventos ni
  // titulares: se descarta y manda el del servidor, que sí los trae.
  const local = esCompleto(instantanea.estado) ? instantanea.estado : undefined;

  return {
    paquete: instantanea.paquete,
    estado: conEventosDelServidor(elegirEstado(local, servidor), servidor.eventos),
    descargadoEn: instantanea.descargadoEn,
    refrescado,
  };
}

/** Escribe el estado en la instantánea. Solo Dexie: vale dentro de una transacción. */
async function escribirEstado(estado: EstadoDirecto): Promise<void> {
  const guardada = await db.matchSnapshots.get(estado.partidoId);

  if (guardada === undefined) {
    throw new Error(SIN_PRECARGA);
  }

  const datos: Instantanea = { ...(guardada.datos as Instantanea), estado };
  await db.matchSnapshots.put({ ...guardada, datos });
}

/**
 * Guarda el estado nuevo y encola sus trabajos, todo o nada. Sin trabajos,
 * solo el estado (una pausa, por ejemplo).
 */
export async function aplicarTransicion(
  estado: EstadoDirecto,
  trabajos: readonly EntradaDeTrabajo[],
): Promise<void> {
  if (trabajos.length === 0) {
    await db.transaction('rw', db.matchSnapshots, () => escribirEstado(estado));
    return;
  }

  // La transacción, solo sobre la cola y la instantánea (D06-35): así no
  // espera detrás de lo que otra pestaña tenga a medias en las demás tablas.
  await encolarJunto(trabajos, () => escribirEstado(estado), [db.matchSnapshots]);
}
