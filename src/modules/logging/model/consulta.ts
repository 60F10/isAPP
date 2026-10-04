// Lógica pura de la C02, registro de errores (T-303).
//
// El origen de un error no tiene columna propia: va delante del mensaje, entre
// corchetes (`construirFilaDeError`). Aquí se saca de nuevo, y se dice con
// palabras.

import type { OrigenDeError } from './errorLog';

/** Largo del resumen de cada fila. El mensaje entero se ve en el detalle. */
export const LARGO_RESUMEN = 120;

/** Cuántas filas trae cada página. */
export const TAMANO_DE_PAGINA = 50;

export type OrigenConocido = OrigenDeError;

/** Los seis orígenes, en el orden en que se ofrecen. */
export const ORIGENES: readonly OrigenConocido[] = [
  'boundary',
  'ruta',
  'global',
  'promesa',
  'contexto',
  'sync',
];

export const NOMBRES_DE_ORIGEN: Record<OrigenConocido | 'desconocido', string> = {
  boundary: 'Pantalla rota',
  ruta: 'Ruta',
  global: 'Error global',
  promesa: 'Promesa rechazada',
  contexto: 'Contexto',
  sync: 'Sincronización',
  desconocido: 'Desconocido',
};

export interface FiltrosDeErrores {
  origen: OrigenConocido | 'todos';
  /** Texto que ha de contener la ruta. Vacío, sin filtrar. */
  ruta: string;
  /** Solo lo ocurrido desde las 00:00 de la hora del móvil. */
  soloHoy: boolean;
}

/** La última fila vista: la página siguiente pide lo anterior a ella. */
export interface CursorDeErrores {
  createdAt: string;
  id: string;
}

export const SIN_FILTROS: FiltrosDeErrores = { origen: 'todos', ruta: '', soloHoy: false };

const CON_ORIGEN = /^\[([a-z]+)\]\s*/;

/** El origen que abre el mensaje, o «desconocido» si no es uno de los seis. */
export function origenDe(mensaje: string): OrigenConocido | 'desconocido' {
  const coincidencia = CON_ORIGEN.exec(mensaje);
  const candidato = coincidencia === null ? undefined : coincidencia[1];

  return ORIGENES.find((origen) => origen === candidato) ?? 'desconocido';
}

/** El mensaje sin su origen y cortado a `LARGO_RESUMEN` letras. */
export function resumenDeMensaje(mensaje: string): string {
  const coincidencia = CON_ORIGEN.exec(mensaje);
  const sinOrigen =
    coincidencia !== null && origenDe(mensaje) !== 'desconocido'
      ? mensaje.slice(coincidencia[0].length)
      : mensaje;

  return sinOrigen.length <= LARGO_RESUMEN
    ? sinOrigen
    : `${sinOrigen.slice(0, LARGO_RESUMEN - 1)}…`;
}
