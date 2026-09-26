// Hooks de club y equipos (T-201): atan `model/` y `api/` a las pantallas.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authKeys, useAuth } from '@modules/auth';

import {
  actualizarClub,
  actualizarEquipo,
  crearEquipo,
  fetchClub,
  fetchEquiposDelClub,
} from '../api/clubYEquipos';
import { coreKeys } from '../api/queryKeys';
import { ordenarEquipos } from '../model/clubYEquipos';

import type { TipoDeEquipo } from '../model/clubYEquipos';

/**
 * Club del equipo activo. Es el único club que la pantalla conoce: el
 * usuario llega a él a través de su equipo, no eligiendo un club suelto.
 */
export function useClubActivo(): string | null {
  const { teams, activeTeamId } = useAuth();

  if (teams === null || activeTeamId === null) {
    return null;
  }

  const activo = teams.find((membresia) => membresia.team.id === activeTeamId);

  return activo === undefined ? null : activo.team.clubId;
}

export function useClub(clubId: string | null) {
  return useQuery({
    queryKey: coreKeys.club(clubId ?? ''),
    queryFn: () => {
      if (clubId === null) {
        throw new Error('Sin club activo.');
      }

      return fetchClub(clubId);
    },
    enabled: clubId !== null,
  });
}

export function useEquipos(clubId: string | null) {
  return useQuery({
    queryKey: coreKeys.equipos(clubId ?? ''),
    queryFn: () => {
      if (clubId === null) {
        throw new Error('Sin club activo.');
      }

      return fetchEquiposDelClub(clubId);
    },
    enabled: clubId !== null,
    select: ordenarEquipos,
  });
}

/**
 * Tras cambiar un equipo se invalida también el contexto de acceso: las
 * membresías llevan el nombre del equipo, y sin esto el selector de equipo
 * seguiría enseñando el viejo hasta dentro de quince minutos.
 */
function useInvalidarClub(clubId: string) {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: coreKeys.club(clubId) }),
      queryClient.invalidateQueries({ queryKey: coreKeys.equipos(clubId) }),
      queryClient.invalidateQueries({ queryKey: authKeys.all }),
    ]);
  };
}

export function useActualizarClub(clubId: string) {
  const invalidar = useInvalidarClub(clubId);

  return useMutation({
    mutationFn: (cambios: { name: string; short_name: string | null }) =>
      actualizarClub(clubId, cambios),
    onSuccess: invalidar,
  });
}

export function useCrearEquipo(clubId: string) {
  const { session } = useAuth();
  const invalidar = useInvalidarClub(clubId);

  return useMutation({
    mutationFn: (datos: { name: string; category: string | null; kind: TipoDeEquipo }) => {
      if (session === null) {
        throw new Error('Sin sesión.');
      }

      return crearEquipo(clubId, session.user.id, datos);
    },
    onSuccess: invalidar,
  });
}

export function useActualizarEquipo(clubId: string) {
  const invalidar = useInvalidarClub(clubId);

  return useMutation({
    mutationFn: ({
      equipoId,
      cambios,
    }: {
      equipoId: string;
      cambios: { name: string; category: string | null };
    }) => actualizarEquipo(equipoId, cambios),
    onSuccess: invalidar,
  });
}
