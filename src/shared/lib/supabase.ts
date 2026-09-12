// Cliente único de Supabase (DOC 06 §7.1).
//
// Crear el cliente dos veces rompe la sesión y duplica las suscripciones en
// tiempo real. Un archivo, una instancia: cualquier módulo que necesite hablar
// con Supabase importa de aquí, y siempre desde su carpeta `api/` (D06-07),
// nunca desde un componente.
//
// El tipado sale de `database.types.ts`, generado con `npm run db:types` en la
// misma tarea que aplica la migración. Nunca se escribe a mano (DOC 06 §7.3).

import { createClient } from '@supabase/supabase-js';

import type { Database } from '@app-types/database.types';

import { env } from './env';

export const supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
