// Contexto de sesión y sus hooks (DOC 06 §5.5).
//
// Van en un archivo aparte del proveedor a propósito: un módulo que exporta a
// la vez un componente y un hook rompe el refresco en caliente de React y lo
// avisa `react/only-export-components`.

import { createContext, useContext } from 'react';

import type { Membership, Profile } from '@modules/auth';
import type { Session } from '@supabase/supabase-js';

export interface AuthState {
  /** Sesión de Supabase, o `null` si nadie ha entrado. */
  session: Session | null;
  /**
   * `true` mientras no se sepa todavía si hay sesión.
   *
   * Solo cubre la sesión, NO el contexto de acceso: bloquear la aplicación
   * entera hasta que contesten los permisos dejaría el inicio —que no pide
   * ninguno— esperando por nada. Del contexto informa `permisos`.
   */
  cargando: boolean;
  /**
   * Permisos efectivos del usuario en el equipo activo.
   *
   * `null` significa «todavía no se sabe», que no es lo mismo que un conjunto
   * vacío: el vacío es «se preguntó y no tiene ninguno». Tratar el `null` como
   * un «no» manda a /403 a quien sí tiene el permiso.
   */
  permisos: ReadonlySet<string> | null;
  /** Perfil del usuario, espejo de `auth.users` (DOC 05 §5.1). */
  profile: Profile | null;
  /**
   * Equipos del usuario con su función y sus permisos, o `null` mientras no
   * se sepan. Un usuario puede tener función en varios (decisión H3).
   */
  teams: readonly Membership[] | null;
  /** Equipo activo. Se recuerda en `localStorage` (DOC 06 §5.5). */
  activeTeamId: string | null;
  /** Temporada en curso del club del equipo activo. */
  activeSeasonId: string | null;
  /** Cambia el equipo activo. Ignora un equipo que no sea suyo. */
  setActiveTeam: (teamId: string) => void;
  /**
   * Fallo al leer el contexto de acceso.
   *
   * Nadie lo pinta todavía: las pantallas de error son la T-106. Mientras
   * tanto vale para depurar por qué una ruta guardada no se abre.
   */
  errorContexto: Error | null;
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
