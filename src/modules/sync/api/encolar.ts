// La puerta de entrada a la cola para el resto de módulos (T-206).

import { encolarTrabajo } from './almacen';
import { sincronizarAhora } from './arranque';

import type { EntradaDeTrabajo } from '../model/cola';
import type { Trabajo } from '@shared/lib/db';

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
