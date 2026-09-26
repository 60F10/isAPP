// Hooks de competiciones (T-203): atan `model/` y `api/` a la A08.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@modules/auth';

import {
  actualizarCompeticion,
  crearCompeticion,
  fetchCompeticion,
  fetchCompeticiones,
} from '../api/competiciones';
import { rulesKeys } from '../api/queryKeys';

import type { Reglamento, TipoDeCompeticion } from '../model/competicion';

type Datos = Reglamento & { name: string; kind: TipoDeCompeticion };

/**
 * Club y temporada de trabajo: los del equipo activo. Una competición es del
 * club, no del equipo, pero se llega a ella desde el equipo con el que se ha
 * entrado.
 */
export function useClubYTemporada(): { clubId: string | null; temporadaId: string | null } {
  const { teams, activeTeamId, activeSeasonId } = useAuth();
  const activo =
    teams === null ? undefined : teams.find((membresia) => membresia.team.id === activeTeamId);

  return { clubId: activo === undefined ? null : activo.team.clubId, temporadaId: activeSeasonId };
}

export function useCompeticiones(clubId: string | null, temporadaId: string | null) {
  return useQuery({
    queryKey: rulesKeys.competiciones(clubId ?? '', temporadaId ?? ''),
    queryFn: () => {
      if (clubId === null || temporadaId === null) {
        throw new Error('Sin club o sin temporada.');
      }

      return fetchCompeticiones(clubId, temporadaId);
    },
    enabled: clubId !== null && temporadaId !== null,
  });
}

/** Con `competicionId` vacío la consulta espera: la convocatoria no lo sabe hasta leer el partido. */
export function useCompeticion(competicionId: string) {
  return useQuery({
    queryKey: rulesKeys.competicion(competicionId),
    queryFn: () => fetchCompeticion(competicionId),
    enabled: competicionId !== '',
  });
}

export function useCrearCompeticion(clubId: string, temporadaId: string) {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (datos: Datos) => {
      if (session === null) {
        throw new Error('Sin sesión.');
      }

      return crearCompeticion({ clubId, temporadaId, userId: session.user.id }, datos);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rulesKeys.all }),
  });
}

export function useActualizarCompeticion(competicionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (datos: Datos) => actualizarCompeticion(competicionId, datos),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rulesKeys.all }),
  });
}
