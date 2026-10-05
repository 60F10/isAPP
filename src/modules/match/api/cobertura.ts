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
// LA COBERTURA ES DE QUIEN LA DECLARA, NO DEL APARATO (T-221). Lleva su
// `userId`, y la de otra persona cuenta aquí como ninguna: quien entra con
// otra cuenta declara la suya encima, y el cierre de la ajena NO se encola,
// porque la cola lo mandaría con la sesión de quien no es su dueño y la base
// lo rechazaría (RLS). La ajena la termina el cierre del partido (C-03).
//
// Declarar, cerrar y cambiar devuelven la cobertura que queda ABIERTA para
// esa persona en el aparato, o `null`, y si el cambio se aplicó.

import { encolarJunto } from '@modules/sync';
import { db } from '@shared/lib/db';

import { cerrar, declarar } from '../model/cobertura';
import { SIN_PRECARGA } from './directo';

import type { CoberturaLocal, Declaracion, Instante } from '../model/cobertura';
import type { Instantanea } from '../model/paquete';
import type { EntradaDeTrabajo } from '@modules/sync';

/** La instantánea ya no tiene abierta la cobertura que se esperaba. */
const DESFASE = 'COBERTURA_DESFASADA';

/** Cómo quedó un cambio de cobertura. */
export interface ResultadoDeCobertura {
  /** La que queda abierta para esa persona en el aparato, o `null`. */
  cobertura: CoberturaLocal | null;
  /**
   * Si se guardó y se encoló. `false` es que no se ha tocado nada: la
   * instantánea tenía otra abierta, o no había nada que declarar.
   */
  aplicado: boolean;
}

/**
 * La cobertura abierta de esa persona en la instantánea, o `null`. La de otra
 * cuenta cuenta como ninguna. Una sin `userId` es de antes de la T-221, cuando
 * no se guardaba de quién era, y se da por propia; lo mismo si no se sabe por
 * quién se pregunta.
 */
function abiertaDe(datos: Instantanea, userId: string | undefined): CoberturaLocal | null {
  const guardada = datos.cobertura;

  if (guardada === undefined || !guardada.abierta) {
    return null;
  }

  const ajena = userId !== undefined && guardada.userId !== undefined && guardada.userId !== userId;

  return ajena ? null : guardada;
}

/** La cobertura que esa persona tiene abierta en este aparato, o `null`. */
export async function leerCobertura(
  partidoId: string,
  userId: string,
): Promise<CoberturaLocal | null> {
  const guardada = await db.matchSnapshots.get(partidoId);

  return guardada === undefined ? null : abiertaDe(guardada.datos as Instantanea, userId);
}

/**
 * Encola los trabajos y escribe la cobertura, todo o nada, si la que esa
 * persona tiene abierta en la instantánea es `esperada` (`null`: ninguna). Si
 * es otra, no hace nada y devuelve la que hay.
 *
 * Una abierta de otra persona cuenta como ninguna: se pisa al escribir la
 * nueva, y entre `trabajos` no viene su cierre.
 */
async function aplicar(
  partidoId: string,
  userId: string | undefined,
  esperada: string | null,
  nueva: CoberturaLocal,
  trabajos: readonly EntradaDeTrabajo[],
): Promise<ResultadoDeCobertura> {
  // Lo que se ve dentro de la transacción, para contarlo fuera si se aborta.
  const vista: { abierta: CoberturaLocal | null } = { abierta: null };

  try {
    await encolarJunto(trabajos, async () => {
      const guardada = await db.matchSnapshots.get(partidoId);

      if (guardada === undefined) {
        throw new Error(SIN_PRECARGA);
      }

      const datos = guardada.datos as Instantanea;
      vista.abierta = abiertaDe(datos, userId);

      if ((vista.abierta === null ? null : vista.abierta.id) !== esperada) {
        // Lanzar dentro aborta la transacción: lo encolado tampoco queda.
        throw new Error(DESFASE);
      }

      await db.matchSnapshots.put({ ...guardada, datos: { ...datos, cobertura: nueva } });
    }, [db.matchSnapshots]);
  } catch (error) {
    if (error instanceof Error && error.message === DESFASE) {
      return { cobertura: vista.abierta, aplicado: false };
    }

    throw error;
  }

  return { cobertura: nueva.abierta ? nueva : null, aplicado: true };
}

/**
 * Declara lo que sigue quien anota. Si esa persona ya tiene una abierta en el
 * aparato, no declara otra y devuelve esa, sin aplicar. Sin nada que declarar
 * (la competición no tiene tipos activos), `null` y sin aplicar.
 */
export async function declararCobertura(datos: Declaracion): Promise<ResultadoDeCobertura> {
  const alta = declarar(datos);

  if (alta === null) {
    return { cobertura: null, aplicado: false };
  }

  return aplicar(datos.partidoId, datos.userId, null, alta.cobertura, [alta.trabajo]);
}

/** Cierra la cobertura en ese instante: al salir del directo y al finalizar. */
export async function cerrarCobertura(
  partidoId: string,
  cobertura: CoberturaLocal,
  hasta: Instante,
): Promise<ResultadoDeCobertura> {
  const cierre = cerrar(partidoId, cobertura, hasta);

  return aplicar(partidoId, cobertura.userId, cobertura.id, cierre.cobertura, [cierre.trabajo]);
}

/**
 * Cambia lo que se sigue: cierra la anterior en `datos.desde` y abre la nueva
 * desde ese mismo instante, en una transacción y en ese orden en la cola. Sin
 * anterior, solo declara. Si la nueva no se puede declarar, no cambia nada y
 * devuelve la anterior, sin aplicar.
 */
export async function cambiarCobertura(
  anterior: CoberturaLocal | null,
  datos: Declaracion,
): Promise<ResultadoDeCobertura> {
  const alta = declarar(datos);

  if (alta === null) {
    return { cobertura: anterior, aplicado: false };
  }

  if (anterior === null) {
    return aplicar(datos.partidoId, datos.userId, null, alta.cobertura, [alta.trabajo]);
  }

  const cierre = cerrar(datos.partidoId, anterior, datos.desde);

  return aplicar(datos.partidoId, datos.userId, anterior.id, alta.cobertura, [
    cierre.trabajo,
    alta.trabajo,
  ]);
}
