// La cobertura declarada en IndexedDB y en la cola (D06-37, T-209a).
//
// Vive en la instantánea del partido, bajo `cobertura`, al lado de `estado` y
// sin mezclarse con él: `escribirEstado` y esto se respetan lo del otro. Cada
// cambio encola su fila y escribe la instantánea en una sola transacción
// (`encolarJunto`, D06-30), sobre la cola y `matchSnapshots` nada más (D06-35).
//
// LO QUE MANDA ES LA INSTANTÁNEA, NO LA PANTALLA. Dentro de la transacción se
// mira qué cobertura hay abierta, y si no es la que la pantalla creía —otra
// pestaña, un doble toque, el efecto de arranque repetido— no se guarda ni se
// encola nada: se devuelve la que hay. Así no salen dos altas ni dos cierres.
//
// Todas devuelven la cobertura que queda ABIERTA en el aparato, o `null`.

import { encolarJunto } from '@modules/sync';
import { db } from '@shared/lib/db';

import { cerrar, declarar } from '../model/cobertura';
import { SIN_PRECARGA } from './directo';

import type { CoberturaLocal, Declaracion, Instante } from '../model/cobertura';
import type { Instantanea } from '../model/paquete';
import type { EntradaDeTrabajo } from '@modules/sync';

/** La instantánea ya no tiene abierta la cobertura que se esperaba. */
const DESFASE = 'COBERTURA_DESFASADA';

function abiertaDe(datos: Instantanea): CoberturaLocal | null {
  return datos.cobertura !== undefined && datos.cobertura.abierta ? datos.cobertura : null;
}

/** La cobertura abierta en este aparato, o `null` si no hay ninguna. */
export async function leerCobertura(partidoId: string): Promise<CoberturaLocal | null> {
  const guardada = await db.matchSnapshots.get(partidoId);

  return guardada === undefined ? null : abiertaDe(guardada.datos as Instantanea);
}

/**
 * Encola los trabajos y escribe la cobertura, todo o nada, si la que hay
 * abierta en la instantánea es `esperada` (`null`: ninguna). Si es otra, no
 * hace nada y devuelve la que hay.
 */
async function aplicar(
  partidoId: string,
  esperada: string | null,
  nueva: CoberturaLocal,
  trabajos: readonly EntradaDeTrabajo[],
): Promise<CoberturaLocal | null> {
  // Lo que se ve dentro de la transacción, para contarlo fuera si se aborta.
  const vista: { abierta: CoberturaLocal | null } = { abierta: null };

  try {
    await encolarJunto(trabajos, async () => {
      const guardada = await db.matchSnapshots.get(partidoId);

      if (guardada === undefined) {
        throw new Error(SIN_PRECARGA);
      }

      const datos = guardada.datos as Instantanea;
      vista.abierta = abiertaDe(datos);

      if ((vista.abierta === null ? null : vista.abierta.id) !== esperada) {
        // Lanzar dentro aborta la transacción: lo encolado tampoco queda.
        throw new Error(DESFASE);
      }

      await db.matchSnapshots.put({ ...guardada, datos: { ...datos, cobertura: nueva } });
    }, [db.matchSnapshots]);
  } catch (error) {
    if (error instanceof Error && error.message === DESFASE) {
      return vista.abierta;
    }

    throw error;
  }

  return nueva.abierta ? nueva : null;
}

/**
 * Declara lo que sigue quien anota. Si el aparato ya tiene una abierta, no
 * declara otra y devuelve esa. `null` si no hay nada que declarar (la
 * competición no tiene tipos activos).
 */
export async function declararCobertura(datos: Declaracion): Promise<CoberturaLocal | null> {
  const alta = declarar(datos);

  if (alta === null) {
    return null;
  }

  return aplicar(datos.partidoId, null, alta.cobertura, [alta.trabajo]);
}

/** Cierra la cobertura en ese instante: al salir del directo y al finalizar. */
export async function cerrarCobertura(
  partidoId: string,
  cobertura: CoberturaLocal,
  hasta: Instante,
): Promise<CoberturaLocal | null> {
  const cierre = cerrar(partidoId, cobertura, hasta);

  return aplicar(partidoId, cobertura.id, cierre.cobertura, [cierre.trabajo]);
}

/**
 * Cambia lo que se sigue: cierra la anterior en `datos.desde` y abre la nueva
 * desde ese mismo instante, en una transacción y en ese orden en la cola. Sin
 * anterior, solo declara. Si la nueva no se puede declarar, no cambia nada y
 * devuelve la anterior.
 */
export async function cambiarCobertura(
  anterior: CoberturaLocal | null,
  datos: Declaracion,
): Promise<CoberturaLocal | null> {
  const alta = declarar(datos);

  if (alta === null) {
    return anterior;
  }

  if (anterior === null) {
    return aplicar(datos.partidoId, null, alta.cobertura, [alta.trabajo]);
  }

  const cierre = cerrar(datos.partidoId, anterior, datos.desde);

  return aplicar(datos.partidoId, anterior.id, alta.cobertura, [cierre.trabajo, alta.trabajo]);
}
