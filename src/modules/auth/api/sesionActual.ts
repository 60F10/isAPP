// Lectura de la sesión desde el propio módulo (D06-07).
//
// Existe porque la pantalla de vuelta de Google necesita saber si la sesión ya
// está montada, y NO puede preguntárselo a `AuthProvider`: vive en `app/`, y
// de `app/` no importa nadie (DOC 06 §4.1, regla 1).

import { supabase } from '@shared/lib/supabase';

import type { Session } from '@supabase/supabase-js';

/**
 * Sesión actual.
 *
 * `getSession()` espera a que el cliente termine de arrancar, y ese arranque
 * incluye canjear el código que Google deja en la dirección —`detectSessionInUrl`
 * está encendido en `shared/lib/supabase.ts`—. Por eso al resolver esta promesa
 * la respuesta ya es definitiva: o hay sesión, o el canje falló.
 */
export async function fetchSesionActual(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}
