// El reloj del directo: lógica pura (DOC 04 §5, D06-15, T-207).
//
// POR ANCLAJE, NUNCA POR ACUMULACIÓN. El tiempo de una parte sale de
// `ahora − arranque − pausado`. El temporizador de la pantalla solo repinta:
// los navegadores móviles frenan los temporizadores con la pantalla
// bloqueada, y un reloj que suma en cada vuelta se retrasaría minutos.
//
// Lo que se guarda son segundos dentro de la parte; el minuto «34'» o
// «40+2'» se calcula para enseñarlo y nunca se guarda (DOC 04 §5.1).

import { formatoReloj, segundosDesde } from '@shared/lib/reloj';

import type { ParteLocal } from './directo';

// La cuenta y el formato viven en `shared/lib/reloj.ts` desde la T-225, para
// que la banda del marco marque lo mismo sin importar de `match` (D06-40).
// Se siguen exportando desde aquí: para el directo, el reloj es este archivo.
export { formatoReloj };

/** Segundos jugados de una parte. Cerrada, su duración real. */
export function segundosDeParte(parte: ParteLocal, ahora: number): number {
  if (parte.segundosReales !== null) {
    return parte.segundosReales;
  }

  return segundosDesde(parte, ahora);
}

/**
 * El minuto que se enseña (DOC 04 §5.3): el que está en curso, contando las
 * partes anteriores por su duración prevista, y en el descuento `40+2'`.
 */
export function minutoDePresentacion(
  segundos: number,
  numeroDeParte: number,
  minutosDeParte: number,
): string {
  const previo = (numeroDeParte - 1) * minutosDeParte;
  const minuto = Math.floor(segundos / 60);

  if (minuto < minutosDeParte) {
    return `${previo + minuto + 1}'`;
  }

  return `${previo + minutosDeParte}+${minuto - minutosDeParte + 1}'`;
}

/**
 * Al revés que `minutoDePresentacion`: el minuto que se escribe a mano en un
 * partido en diferido (DOC 04 §5.4), como segundos dentro de su parte. «35»
 * es el minuto 35 en curso; en la segunda parte del cadete se empieza en 41;
 * el descuento se escribe «40+2». `null` si no es un minuto de esa parte.
 */
export function segundosDeMinuto(
  texto: string,
  numeroDeParte: number,
  minutosDeParte: number,
): number | null {
  const partes = /^(\d{1,3})(?:\+(\d{1,2}))?$/.exec(texto.replace(/\s+/g, ''));

  if (partes === null) {
    return null;
  }

  const minuto = Number(partes[1]);
  const previo = (numeroDeParte - 1) * minutosDeParte;

  if (partes[2] === undefined) {
    const dentro = minuto - previo;

    return dentro >= 1 && dentro <= minutosDeParte ? (dentro - 1) * 60 : null;
  }

  const añadido = Number(partes[2]);

  return minuto === previo + minutosDeParte && añadido >= 1
    ? (minutosDeParte + añadido - 1) * 60
    : null;
}

/**
 * Los minutos del acta que caben en una parte (T-218): la 2.ª de 40 va del 41
 * al 80. Es lo que acepta `segundosDeMinuto` sin descuento, dicho en números
 * para la ayuda y el error del minuto en diferido.
 */
export function rangoDeParte(
  numeroDeParte: number,
  minutosDeParte: number,
): { desde: number; hasta: number } {
  const previo = (numeroDeParte - 1) * minutosDeParte;

  return { desde: previo + 1, hasta: previo + minutosDeParte };
}
