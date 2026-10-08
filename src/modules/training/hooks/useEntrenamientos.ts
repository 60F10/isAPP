// Hooks de los entrenamientos (T-228): atan `model/` y `api/` a A15a y A15b.
// Desde la T-230, también los dos de «Repetir cada semana».

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@modules/auth';

import {
  actualizarEntrenamiento,
  borrarEntrenamiento,
  crearEntrenamiento,
  crearEntrenamientos,
  fetchEntrenamiento,
  fetchEntrenamientos,
  fetchFinDeTemporada,
} from '../api/entrenamientos';
import { trainingKeys } from '../api/queryKeys';

import type { DatosDeEntrenamiento } from '../api/entrenamientos';

/**
 * Equipo, club y temporada de trabajo: los del equipo activo. Es el
 * `useEquipoActivo` de `agenda/hooks/usePartidos.ts`, que desde aquí no se
 * puede importar: `training` no importa de `agenda` (DOC 06 §4.2).
 */
export function useEquipoDeTrabajo(): {
  equipoId: string | null;
  clubId: string | null;
  temporadaId: string | null;
} {
  const { teams, activeTeamId, activeSeasonId } = useAuth();
  const activo =
    teams === null ? undefined : teams.find((membresia) => membresia.team.id === activeTeamId);

  return {
    equipoId: activo === undefined ? null : activo.team.id,
    clubId: activo === undefined ? null : activo.team.clubId,
    temporadaId: activeSeasonId,
  };
}

export function useEntrenamientos(equipoId: string | null, temporadaId: string | null) {
  return useQuery({
    queryKey: trainingKeys.lista(equipoId ?? '', temporadaId ?? ''),
    queryFn: () => {
      if (equipoId === null || temporadaId === null) {
        throw new Error('Sin equipo o sin temporada.');
      }

      return fetchEntrenamientos(equipoId, temporadaId);
    },
    enabled: equipoId !== null && temporadaId !== null,
  });
}

export function useEntrenamiento(id: string) {
  return useQuery({
    queryKey: trainingKeys.sesion(id),
    queryFn: () => fetchEntrenamiento(id),
  });
}

/**
 * El último día de la temporada, `2027-06-30`, para proponer hasta cuándo se
 * repite y no dejar pasar de ahí. `null` mientras no se sabe, y también si la
 * consulta falla o no trae fila: entonces no se valida contra él. Es un dato
 * de ayuda, así que no se reintenta ni frena el alta.
 */
export function useFinDeTemporada(temporadaId: string | null): string | null {
  const consulta = useQuery({
    queryKey: trainingKeys.finDeTemporada(temporadaId ?? ''),
    queryFn: () => {
      if (temporadaId === null) {
        throw new Error('Sin temporada.');
      }

      return fetchFinDeTemporada(temporadaId);
    },
    enabled: temporadaId !== null,
    retry: false,
  });

  return consulta.data ?? null;
}

/**
 * Invalida todo lo de `training` SIN ESPERAR a que se vuelva a leer
 * (`CLAUDE.md`, T-210a). Las mutaciones cambian de pantalla al salir
 * bien, y la relectura quita de en medio lo que llamó a `mutate`: tras borrar,
 * la sesión ya no se lee y la edición deja de pintar el botón. Si la mutación
 * esperase a la relectura, ese componente podría no estar ya y TanStack Query
 * no llamaría a su `onSuccess`, que es el que navega.
 */
function useInvalidarEntrenamientos() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: trainingKeys.all });
  };
}

export function useCrearEntrenamiento(destino: { equipoId: string; temporadaId: string }) {
  const { session } = useAuth();
  const invalidar = useInvalidarEntrenamientos();

  return useMutation({
    mutationFn: (datos: DatosDeEntrenamiento) => {
      if (session === null) {
        throw new Error('Sin sesión.');
      }

      return crearEntrenamiento({ ...destino, userId: session.user.id }, datos);
    },
    onSuccess: invalidar,
  });
}

/** Crea de golpe los de «Repetir cada semana». Devuelve cuántos se crearon. */
export function useCrearEntrenamientos(destino: { equipoId: string; temporadaId: string }) {
  const { session } = useAuth();
  const invalidar = useInvalidarEntrenamientos();

  return useMutation({
    mutationFn: (lista: DatosDeEntrenamiento[]) => {
      if (session === null) {
        throw new Error('Sin sesión.');
      }

      return crearEntrenamientos({ ...destino, userId: session.user.id }, lista);
    },
    onSuccess: invalidar,
  });
}

export function useActualizarEntrenamiento(id: string) {
  const invalidar = useInvalidarEntrenamientos();

  return useMutation({
    mutationFn: (datos: DatosDeEntrenamiento) => actualizarEntrenamiento(id, datos),
    onSuccess: invalidar,
  });
}

export function useBorrarEntrenamiento(id: string) {
  const invalidar = useInvalidarEntrenamientos();

  return useMutation({
    mutationFn: () => borrarEntrenamiento(id),
    onSuccess: invalidar,
  });
}
