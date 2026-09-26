// Hooks de la plantilla (T-202): atan `model/` y `api/` a A05 y A06.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@modules/auth';

import {
  actualizarApodo,
  actualizarInscripcion,
  crearJugador,
  fetchEquipoDePlantilla,
  fetchInscripcion,
  fetchPlantilla,
} from '../api/plantilla';
import { coreKeys } from '../api/queryKeys';
import { fechaDeHoy, ordenarPlantilla } from '../model/plantilla';

import type { Disponibilidad, Posicion } from '../model/plantilla';

export function useEquipoDePlantilla(equipoId: string) {
  return useQuery({
    queryKey: coreKeys.equipo(equipoId),
    queryFn: () => fetchEquipoDePlantilla(equipoId),
  });
}

/** `temporadaId` nulo deja la consulta parada: sin temporada no hay plantilla. */
export function usePlantilla(equipoId: string, temporadaId: string | null) {
  return useQuery({
    queryKey: coreKeys.plantilla(equipoId, temporadaId ?? ''),
    queryFn: () => {
      if (temporadaId === null) {
        throw new Error('Sin temporada en curso.');
      }

      return fetchPlantilla(equipoId, temporadaId);
    },
    enabled: temporadaId !== null,
    select: ordenarPlantilla,
  });
}

export function useInscripcion(equipoId: string, temporadaId: string | null, jugadorId: string) {
  return useQuery({
    queryKey: coreKeys.inscripcion(equipoId, temporadaId ?? '', jugadorId),
    queryFn: () => {
      if (temporadaId === null) {
        throw new Error('Sin temporada en curso.');
      }

      return fetchInscripcion(jugadorId, equipoId, temporadaId);
    },
    enabled: temporadaId !== null,
  });
}

function useInvalidarPlantilla(equipoId: string) {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: coreKeys.plantillaDe(equipoId) });
}

export function useCrearJugador(destino: {
  clubId: string;
  equipoId: string;
  temporadaId: string;
}) {
  const { session } = useAuth();
  const invalidar = useInvalidarPlantilla(destino.equipoId);

  return useMutation({
    mutationFn: (datos: {
      nickname: string;
      shirt_number: number | null;
      default_position: Posicion | null;
    }) => {
      if (session === null) {
        throw new Error('Sin sesión.');
      }

      return crearJugador({ ...destino, userId: session.user.id }, datos);
    },
    onSuccess: invalidar,
  });
}

/**
 * Guarda la ficha: primero la inscripción, que es donde puede chocar el
 * dorsal, y después el apodo si ha cambiado. Dos peticiones, porque son dos
 * tablas; si la segunda falla, la primera ya está guardada y el mensaje lo
 * dice igual que cualquier otro fallo.
 */
export function useGuardarFicha(equipoId: string) {
  const invalidar = useInvalidarPlantilla(equipoId);

  return useMutation({
    mutationFn: async (ficha: {
      inscripcionId: string;
      jugadorId: string;
      apodoCambiado: string | null;
      cambios: {
        shirt_number: number | null;
        default_position: Posicion | null;
        availability?: Disponibilidad;
      };
    }) => {
      await actualizarInscripcion(ficha.inscripcionId, ficha.cambios);

      if (ficha.apodoCambiado !== null) {
        await actualizarApodo(ficha.jugadorId, ficha.apodoCambiado);
      }
    },
    onSuccess: invalidar,
  });
}

/**
 * Baja de la plantilla: se rellena `left_on` y nada más. El jugador sigue en
 * el club y sus partidos jugados siguen contando (DOC 05 §6.2).
 */
export function useDarDeBaja(equipoId: string) {
  const invalidar = useInvalidarPlantilla(equipoId);

  return useMutation({
    mutationFn: (inscripcionId: string) =>
      actualizarInscripcion(inscripcionId, { left_on: fechaDeHoy(new Date()) }),
    onSuccess: invalidar,
  });
}
