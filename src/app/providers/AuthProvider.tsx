// Proveedor de sesión (DOC 06 §7).
//
// Aquí solo vive la sesión de Supabase. El perfil, el club, el equipo activo y
// los permisos de verdad son de la T-105: meterlos ahora obligaría a rehacer
// este archivo entero y a arrastrar consultas que todavía no existen.

import { useEffect, useMemo, useState } from 'react';

import { supabase } from '@shared/lib/supabase';

import { AuthContext } from './authContext';

import type { AuthState } from './authContext';
import type { Session } from '@supabase/supabase-js';
import type { ReactNode } from 'react';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // La sesión se lee del almacenamiento local antes de que conteste ninguna
    // red. Si el componente se desmonta antes, la respuesta se tira: escribir
    // estado en un árbol que ya no está solo genera avisos.
    let montado = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!montado) {
        return;
      }

      setSession(data.session);
      setCargando(false);
    });

    // Cubre el resto de la vida de la sesión: entrada, salida, renovación del
    // testigo y cambio de pestaña.
    const { data } = supabase.auth.onAuthStateChange((_evento, sesionNueva) => {
      setSession(sesionNueva);
      setCargando(false);
    });

    return () => {
      montado = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const valor = useMemo<AuthState>(
    // `permisos` se queda en `null` en toda esta tarea. Lo rellena la T-105,
    // leyendo `team_member_permissions`. `null` es «todavía no se sabe»,
    // distinto de un conjunto vacío, que sería «no tiene ninguno».
    () => ({ session, cargando, permisos: null }),
    [session, cargando],
  );

  return <AuthContext value={valor}>{children}</AuthContext>;
}
