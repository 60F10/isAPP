// Clientes de `supabase-js` para Node (T-236).
//
// Dos, y sirven para cosas distintas:
//
//  - `clienteDe(persona)`: habla con la base COMO esa persona, con su sesión
//    y bajo la RLS. Es con el que se prueba qué deja y qué no deja la base.
//  - `clienteDeServicio()`: clave de servicio LOCAL, se salta la RLS. Solo
//    para preparar datos y para leer lo que guardó una pantalla. Nunca para
//    probar un permiso: con él todo entra.
//
// La API local va por HTTPS con el certificado autofirmado de la CLI. Node lo
// da por bueno porque el flujo pone `NODE_EXTRA_CA_CERTS`.

import { createClient } from '@supabase/supabase-js';

import { entorno } from './entorno';
import { sesionDe } from './personas';

import type { Database } from '../../src/types/database.types';
import type { Persona } from './personas';
import type { SupabaseClient } from '@supabase/supabase-js';

export type Cliente = SupabaseClient<Database>;

/** Sin sesión guardada ni renovación: es un cliente de usar y tirar. */
const SIN_PERSISTENCIA = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
} as const;

/** La base, vista por una de las tres personas. La RLS manda. */
export function clienteDe(persona: Persona): Cliente {
  const { supabaseUrl, anonKey } = entorno();
  const { accessToken } = sesionDe(persona);

  return createClient<Database>(supabaseUrl, anonKey, {
    accessToken: () => Promise.resolve(accessToken),
  });
}

/** La base, sin RLS. Solo para preparar y para comprobar lo guardado. */
export function clienteDeServicio(): Cliente {
  const { supabaseUrl, serviceRoleKey } = entorno();

  return createClient<Database>(supabaseUrl, serviceRoleKey, { auth: SIN_PERSISTENCIA });
}

/** Un cliente sin sesión, para que la preparación inicie la de cada persona. */
export function clienteAnonimo(almacen: {
  getItem: (clave: string) => string | null;
  setItem: (clave: string, valor: string) => void;
  removeItem: (clave: string) => void;
}): Cliente {
  const { supabaseUrl, anonKey } = entorno();

  return createClient<Database>(supabaseUrl, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: almacen,
    },
  });
}
