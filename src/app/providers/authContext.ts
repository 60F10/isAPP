// Contexto de sesión y sus hooks (DOC 06 §7).
//
// Van en un archivo aparte del proveedor a propósito: un módulo que exporta a
// la vez un componente y un hook rompe el refresco en caliente de React y lo
// avisa `react/only-export-components`.

import { createContext, useContext } from 'react';

import type { Session } from '@supabase/supabase-js';

export interface AuthState {
  /** Sesión de Supabase, o `null` si nadie ha entrado. */
  session: Session | null;
  /** `true` mientras no se sepa todavía si hay sesión. */
  cargando: boolean;
  /**
   * Permisos efectivos del usuario en el equipo activo.
   *
   * `null` significa «todavía no se sabe», que no es lo mismo que un conjunto
   * vacío: el vacío es «se preguntó y no tiene ninguno». Quien lo rellene es
   * la T-105; hasta entonces vale `null` siempre.
   */
  permisos: ReadonlySet<string> | null;
}

export const AuthContext = createContext<AuthState | null>(null);

/** Estado de sesión. Lanza si se usa fuera de `<AuthProvider>`. */
export function useAuth(): AuthState {
  const estado = useContext(AuthContext);

  if (estado === null) {
    throw new Error('useAuth() se ha usado fuera de <AuthProvider>.');
  }

  return estado;
}

/**
 * Si el usuario tiene un permiso concreto.
 *
 * Devuelve `undefined` mientras los permisos no se conozcan, para que quien
 * lo use pueda distinguir «espera» de «no». Tratar `undefined` como `false`
 * enseñaría un «sin permiso» a quien sí lo tiene.
 */
export function useHasPermission(permiso: string): boolean | undefined {
  const { permisos } = useAuth();

  if (permisos === null) {
    return undefined;
  }

  return permisos.has(permiso);
}
