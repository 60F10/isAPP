// Hooks del calendario (T-204): atan `model/` y `api/` a A09 y A10.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@modules/auth';

import {
  actualizarPartido,
  borrarPartido,
  crearPartido,
  fetchCalendario,
  fetchPartido,
} from '../api/partidos';
import { agendaKeys } from '../api/queryKeys';

import type { DatosDePartido } from '../api/partidos';

/** Equipo, club y temporada de trabajo: los del equipo activo. */
export function useEquipoActivo(): {
  equipoId: string | null;
  equipoNombre: string;
  clubId: string | null;
  temporadaId: string | null;
} {
  const { teams, activeTeamId, activeSeasonId } = useAuth();
  const activo =
    teams === null ? undefined : teams.find((membresia) => membresia.team.id === activeTeamId);

  return {
    equipoId: activo === undefined ? null : activo.team.id,
    equipoNombre: activo === undefined ? '' : activo.team.name,
    clubId: activo === undefined ? null : activo.team.clubId,
    temporadaId: activeSeasonId,
  };
}

export function useCalendario(equipoId: string | null, temporadaId: string | null) {
  return useQuery({
    queryKey: agendaKeys.calendario(equipoId ?? '', temporadaId ?? ''),
    queryFn: () => {
      if (equipoId === null || temporadaId === null) {
        throw new Error('Sin equipo o sin temporada.');
      }

      return fetchCalendario(equipoId, temporadaId);
    },
    enabled: equipoId !== null && temporadaId !== null,
  });
}

export function usePartido(partidoId: string) {
  return useQuery({
    queryKey: agendaKeys.partido(partidoId),
    queryFn: () => fetchPartido(partidoId),
  });
}

function useInvalidarAgenda() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: agendaKeys.all });
}

export function useCrearPartido(destino: {
  clubId: string;
  equipoId: string;
  temporadaId: string;
}) {
  const { session } = useAuth();
  const invalidar = useInvalidarAgenda();

  return useMutation({
    mutationFn: (datos: DatosDePartido) => {
      if (session === null) {
        throw new Error('Sin sesión.');
      }

      return crearPartido({ ...destino, userId: session.user.id }, datos);
    },
    onSuccess: invalidar,
  });
}

export function useActualizarPartido(partidoId: string) {
  const invalidar = useInvalidarAgenda();

  return useMutation({
    mutationFn: (datos: DatosDePartido) => actualizarPartido(partidoId, datos),
    onSuccess: invalidar,
  });
}

export function useBorrarPartido(partidoId: string) {
  const invalidar = useInvalidarAgenda();

  return useMutation({
    mutationFn: () => borrarPartido(partidoId),
    onSuccess: invalidar,
  });
}
