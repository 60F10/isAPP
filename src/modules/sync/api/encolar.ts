// La puerta de entrada a la cola para el resto de módulos (T-206).

import { registrarError } from '@modules/logging';

import { encolarTrabajo, encolarTrabajosJunto } from './almacen';
import { sincronizarAhora } from './arranque';

import type { EntradaDeTrabajo } from '../model/cola';
import type { Trabajo } from '@shared/lib/db';
import type { Table } from 'dexie';

/**
 * A partir de cuánto se deja constancia de que guardar en local ha ido lento
 * (D06-35). El 04/10 el guardado se quedaba esperando y no hubo forma de
 * medirlo: con esto, la próxima vez queda el tiempo en `error_logs`.
 */
const ENCOLADO_LENTO_MS = 3_000;

/**
 * Guarda el trabajo en local y pide un vaciado. Cuando la promesa se
 * resuelve, el dato ya no se pierde aunque se cierre la aplicación; el envío
 * sale en segundo plano.
 */
export async function encolar(entrada: EntradaDeTrabajo): Promise<Trabajo> {
  const trabajo = await encolarTrabajo(entrada);
  void sincronizarAhora();

  return trabajo;
}

/**
 * Encola varios trabajos junto con otra escritura en IndexedDB, en una sola
 * transacción, y pide un vaciado. `tablas` son las que toca `tambien`. Ver
 * `encolarTrabajosJunto`.
 *
 * Si guardar tarda más de tres segundos, lo registra: solo el tiempo, ni
 * filas ni valores.
 */
export async function encolarJunto(
  entradas: readonly EntradaDeTrabajo[],
  tambien: () => Promise<void>,
  tablas?: readonly Table[],
): Promise<Trabajo[]> {
  const inicio = performance.now();
  const trabajos = await encolarTrabajosJunto(entradas, tambien, tablas);
  const milisegundos = Math.round(performance.now() - inicio);

  if (milisegundos > ENCOLADO_LENTO_MS) {
    void registrarError(new Error('Encolado lento'), 'sync', `${milisegundos} ms`);
  }

  void sincronizarAhora();

  return trabajos;
}
