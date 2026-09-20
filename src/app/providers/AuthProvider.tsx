// Proveedor de sesión y contexto de acceso (DOC 06 §5.5).
//
// Aquí conviven dos cosas distintas y conviene no mezclarlas:
//
//   LA SESIÓN la trae Supabase del almacenamiento local y de su propia
//   suscripción. De ella, y solo de ella, habla `cargando`.
//
//   EL CONTEXTO DE ACCESO —perfil, equipos, equipo activo y permisos— es una
//   consulta al servidor. De él habla `permisos`: `null` mientras no conteste
//   y un conjunto en cuanto contesta, vacío incluido.
//
// Esa diferencia es la trampa de esta tarea. Rellenar `permisos` antes de
// tiempo con un conjunto vacío manda a /403 a quien sí tiene el permiso, y el
// fallo parece de permisos cuando es de carga.

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

// Se importa por ruta directa y NO desde `@modules/auth`, y el motivo es
// medible: el enrutador carga ese mismo barril en perezoso, así que tenerlo
// además importado de forma estática desde aquí hace que el empaquetador
// renuncie a separarlo —avisa con INEFFECTIVE_DYNAMIC_IMPORT— y se lleve las
// tres pantallas de `auth` al paquete inicial. El contrato del `index.ts`
// (DOC 06 §4.1, regla 3) rige entre módulos; `app/` es la composición, no un
// módulo, y aquí paga la diferencia en kilobytes.
import { authKeys } from '@modules/auth/api/queryKeys';
import { fetchContextoDeAcceso } from '@modules/auth/api/session';
import {
  elegirEquipoActivo,
  leerEquipoRecordado,
  permisosDe,
  recordarEquipo,
} from '@modules/auth/model/permissions';
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
  const [equipoRecordado, setEquipoRecordado] = useState<string | null>(() =>
    leerEquipoRecordado(),
  );

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

  const userId = session === null ? null : session.user.id;

  const contexto = useQuery({
    queryKey: authKeys.contexto(userId),
    queryFn: () => {
      if (userId === null) {
        throw new Error('No se puede leer el contexto de acceso sin sesión.');
      }

      return fetchContextoDeAcceso(userId);
    },
    // Sin sesión no se pregunta. `enabled` deja la consulta parada, y
    // `permisos` se queda en `null`, que es lo correcto: nadie ha preguntado.
    enabled: userId !== null,
    // Equipos y permisos cambian poco y los cambia otra persona, no esta
    // pantalla. Quince minutos, como la plantilla y la temporada del §5.2.
    staleTime: 15 * 60 * 1000,
  });

  // Al salir, `useQuery` se apaga pero sus datos siguen en la caché. Sin esta
  // puerta, quien cierra sesión se quedaría con los equipos y los permisos del
  // usuario anterior colgando del contexto.
  const datos = session === null ? undefined : contexto.data;
  const membresias = datos === undefined ? null : datos.memberships;

  const activeTeamId = useMemo(
    () => (membresias === null ? null : elegirEquipoActivo(membresias, equipoRecordado)),
    [membresias, equipoRecordado],
  );

  // Deja escrito el equipo que se acabó eligiendo. Esto es un efecto de los
  // buenos: sincroniza con un sistema de fuera —`localStorage`— y no toca
  // estado de React, así que no dispara un render de más. El equipo activo se
  // deriva durante el render; aquí solo se guarda.
  useEffect(() => {
    if (activeTeamId !== null) {
      recordarEquipo(activeTeamId);
    }
  }, [activeTeamId]);

  const setActiveTeam = useCallback(
    (teamId: string) => {
      // Un equipo que no es suyo se ignora. Aceptarlo entregaría una sesión
      // apuntando a un equipo ajeno, sin un solo permiso y sin explicación.
      if (membresias === null || !membresias.some((membresia) => membresia.team.id === teamId)) {
        return;
      }

      setEquipoRecordado(teamId);
    },
    [membresias],
  );

  const activeSeasonId = useMemo(() => {
    if (datos === undefined || activeTeamId === null) {
      return null;
    }

    const activa = datos.memberships.find((membresia) => membresia.team.id === activeTeamId);

    if (activa === undefined) {
      return null;
    }

    const temporada = datos.temporadaPorClub.get(activa.team.clubId);

    return temporada === undefined ? null : temporada;
  }, [datos, activeTeamId]);

  const valor = useMemo<AuthState>(
    () => ({
      session,
      cargando,
      // Aquí está el «todavía no se sabe» frente al «se preguntó y no tiene
      // ninguno»: `null` mientras no haya membresías, y un conjunto —vacío si
      // toca— en cuanto las hay.
      permisos: membresias === null ? null : permisosDe(membresias, activeTeamId),
      profile: datos === undefined ? null : datos.profile,
      teams: membresias,
      activeTeamId,
      activeSeasonId,
      setActiveTeam,
      errorContexto: session === null ? null : contexto.error,
    }),
    [
      session,
      cargando,
      datos,
      membresias,
      activeTeamId,
      activeSeasonId,
      setActiveTeam,
      contexto.error,
    ],
  );

  return <AuthContext value={valor}>{children}</AuthContext>;
}
