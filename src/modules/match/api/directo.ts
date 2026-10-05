// Carga y guardado del directo en IndexedDB (DOC 06 §5.4 y §8.3, T-207).
//
// El directo lee de local, no de la red (D06-11). Al abrir se intenta
// refrescar la precarga; si no hay cobertura, se usa la que haya. Sin ninguna,
// no se puede jugar: la pantalla lo dice.
//
// El estado del reductor se guarda en la misma instantánea del partido, y
// junto con los trabajos que genera, en una sola transacción (`encolarJunto`).
//
// DESDE LA T-209b, LO DESCARGADO SE FUNDE CON LO DEL APARATO (D06-38), al
// abrir y en cada refresco, mirando la cola: lo que este aparato tiene de
// camino se queda, lo que ha deshecho no vuelve y lo que otro borró se quita.

import { encolarJunto, pendientesDelPartido } from '@modules/sync';
import { db } from '@shared/lib/db';

import { desdePaquete, fusionar } from '../model/directo';
import { descargarPaquete, guardarPaquete, leerInstantanea, precargarPartido } from './precarga';

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

/**
 * Un estado guardado antes de la T-226 no trae `suspension`. No se descarta
 * por eso, como el de antes de la T-208: se lee como `null`, que es lo que
 * era, un partido sin suspender.
 */
function conSuspension(estado: EstadoDirecto): EstadoDirecto {
  const guardado: Omit<EstadoDirecto, 'suspension'> & Partial<Pick<EstadoDirecto, 'suspension'>> =
    estado;

  return guardado.suspension === undefined ? { ...estado, suspension: null } : estado;
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
  const local = esCompleto(instantanea.estado) ? conSuspension(instantanea.estado) : undefined;
  // La cola se mira desde que se pidió el paquete que se va a usar.
  const enCola = await pendientesDelPartido(
    partidoId,
    instantanea.pedidoEn ?? instantanea.descargadoEn,
  );
  // SIN COBERTURA NO SE QUITA NADA DE LO DEL APARATO. El paquete es el de la
  // última vez, y lo enviado desde entonces no está en él sin que nadie lo
  // haya borrado; si además la cola ya lo purgó, tampoco estaría en `altas`.
  // Sin descarga nueva, todo sigue como antes de la T-209b, salvo lo deshecho
  // aquí, que no vuelve.
  const pendientes = refrescado
    ? enCola
    : {
        altas: new Set((local?.eventos ?? []).map((evento) => evento.clientEventId)),
        bajas: enCola.bajas,
      };

  return {
    paquete: instantanea.paquete,
    estado: fusionar(local, servidor, pendientes),
    descargadoEn: instantanea.descargadoEn,
    refrescado,
  };
}

/** Lo que trae un refresco del directo (T-209b). */
export interface Refresco {
  paquete: PaqueteDePartido;
  /** El estado que sale del paquete, para `fusionar`. */
  servidor: EstadoDirecto;
  /** Cuándo se pidió la descarga: desde cuándo hay que mirar la cola. */
  desde: number;
}

/**
 * Vuelve a descargar el paquete del partido y lo guarda, sin tocar el estado
 * del aparato ni su cobertura, que `guardarPaquete` conserva. Lanza si no hay
 * red o falla la descarga: el refresco se calla y el directo sigue igual.
 *
 * No funde nada. La pantalla lee la cola después y funde en el mismo turno
 * en que cambia el estado, que es lo que impide que un refresco se coma un
 * toque (D06-38).
 */
export async function refrescarDirecto(partidoId: string): Promise<Refresco> {
  const desde = Date.now();
  const paquete = await descargarPaquete(partidoId);
  await guardarPaquete(paquete, Date.now(), desde);

  return { paquete, servidor: desdePaquete(paquete), desde };
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
