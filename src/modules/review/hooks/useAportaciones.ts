// Hooks de «Mis aportaciones» (T-211): atan `model/` y `api/` a la A14.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@modules/auth';

import {
  borrarEvento,
  cambiarJugador,
  cambiarSegundo,
  fetchAportaciones,
} from '../api/aportaciones';
import { cambiarMinuto } from '../api/discordancias';
import { reviewKeys } from '../api/queryKeys';

/** Lo que ha apuntado quien tiene la sesión, en el equipo y la temporada activos. */
export function useAportaciones() {
  const { session, activeTeamId, activeSeasonId } = useAuth();
  const userId = session === null ? null : session.user.id;

  return useQuery({
    queryKey: reviewKeys.aportacionesDe(activeTeamId ?? '', activeSeasonId ?? '', userId ?? ''),
    queryFn: () => {
      if (activeTeamId === null || activeSeasonId === null || userId === null) {
        throw new Error('Sin equipo, sin temporada o sin sesión.');
      }

      return fetchAportaciones(activeTeamId, activeSeasonId, userId);
    },
    enabled: activeTeamId !== null && activeSeasonId !== null && userId !== null,
  });
}

/** Una corrección de un evento propio. `partidoId` dice qué cierre hay que refrescar. */
export type Correccion = { id: string; partidoId: string } & (
  | { campo: 'minuto'; periodo: number; segundos: number }
  | { campo: 'jugador'; jugador: string }
  | { campo: 'segundo'; segundo: string | null }
  | { campo: 'borrar' }
);

function aplicar(correccion: Correccion): Promise<void> {
  switch (correccion.campo) {
    case 'minuto':
      return cambiarMinuto({
        id: correccion.id,
        partidoId: correccion.partidoId,
        periodo: correccion.periodo,
        segundos: correccion.segundos,
      });
    case 'jugador':
      return cambiarJugador({
        id: correccion.id,
        partidoId: correccion.partidoId,
        jugador: correccion.jugador,
      });
    case 'segundo':
      return cambiarSegundo({
        id: correccion.id,
        partidoId: correccion.partidoId,
        segundo: correccion.segundo,
      });
    case 'borrar':
      return borrarEvento({ id: correccion.id, partidoId: correccion.partidoId });
  }
}

/**
 * Cambia el minuto, el jugador o el segundo jugador de un evento, o lo borra.
 * Una sola mutación para las cuatro: la pantalla no deja hacer dos a la vez.
 *
 * Salga bien o mal, se invalidan la lista de la A14 y el cierre de ese
 * partido, SIN ESPERAR, como las demás mutaciones de `review`. También si
 * falla: `SIN_FILAS` es que el evento ya no está como se veía, y hay que
 * volver a pedirlo.
 */
export function useCorregirAportacion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (correccion: Correccion) => aplicar(correccion),
    onSettled: (_nada, _error, correccion) => {
      void queryClient.invalidateQueries({ queryKey: reviewKeys.aportaciones() });
      void queryClient.invalidateQueries({ queryKey: reviewKeys.cierre(correccion.partidoId) });
    },
  });
}
