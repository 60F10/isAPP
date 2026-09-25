// Acceso a datos del módulo `logging` (D06-07).

import { supabase } from '@shared/lib/supabase';

import type { FilaDeError } from '../model/errorLog';

/**
 * Inserta una fila en `error_logs`.
 *
 * Sin `.select()` detrás, a propósito: la RLS deja insertar a cualquiera con
 * sesión (`error_logs_insert`, DOC 05 §12), pero leer solo al administrador de
 * plataforma. Pedir la fila de vuelta haría fallar la inserción entera a
 * cualquier otro usuario.
 */
export async function insertarErrorLog(fila: FilaDeError): Promise<void> {
  const { error } = await supabase.from('error_logs').insert(fila);

  if (error) {
    throw error;
  }
}
