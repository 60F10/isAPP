// Hooks de la plantilla (T-202): atan `model/` y `api/` a A05 y A06.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@modules/auth';

import {
  actualizarApodo,
  actualizarInscripcion,
  crearJugador,
  fetchBajas,
  fetchDelClubSinInscribir,
  fetchEquipoDePlantilla,
  fetchInscripcion,
  fetchPlantilla,
  fetchPlantillaDeLectura,
  inscribirDelClub,
} from '../api/plantilla';
import { coreKeys } from '../api/queryKeys';
import { dorsalAlReincorporar, fechaDeHoy, ordenarPlantilla } from '../model/plantilla';

import type { Disponibilidad, Inscripcion, Posicion } from '../model/plantilla';

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

/**
 * La plantilla en solo lectura (T-304). Con equipo o temporada nulos la
 * consulta se queda parada: «Mi equipo» llama al hook antes de saber si hay
 * equipo activo.
 */
export function usePlantillaDeLectura(equipoId: string | null, temporadaId: string | null) {
  return useQuery({
    queryKey: coreKeys.plantillaDeLectura(equipoId ?? '', temporadaId ?? ''),
    queryFn: () => {
      if (equipoId === null || temporadaId === null) {
        throw new Error('Sin equipo o sin temporada en curso.');
      }

      return fetchPlantillaDeLectura(equipoId, temporadaId);
    },
    enabled: equipoId !== null && temporadaId !== null,
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

/** Las bajas de la temporada, por dorsal (PR #51). */
export function useBajas(equipoId: string, temporadaId: string) {
  return useQuery({
    queryKey: coreKeys.bajas(equipoId, temporadaId),
    queryFn: () => fetchBajas(equipoId, temporadaId),
    select: ordenarPlantilla,
  });
}

/** Los del club que se pueden inscribir en este equipo (PR #51). */
export function useDelClubSinInscribir(clubId: string, equipoId: string, temporadaId: string) {
  return useQuery({
    queryKey: coreKeys.delClubSinInscribir(equipoId, temporadaId),
    queryFn: () => fetchDelClubSinInscribir(clubId, equipoId, temporadaId),
  });
}

export function useInscribirDelClub(destino: { equipoId: string; temporadaId: string }) {
  const { session } = useAuth();
  const invalidar = useInvalidarPlantilla(destino.equipoId);

  return useMutation({
    mutationFn: (jugadorId: string) => {
      if (session === null) {
        throw new Error('Sin sesión.');
      }

      return inscribirDelClub({ ...destino, userId: session.user.id }, jugadorId);
    },
    onSuccess: invalidar,
  });
}

/**
 * Reincorpora una baja: vacía `left_on` y conserva su dorsal si está libre.
 * Devuelve si ha vuelto sin dorsal, para decirlo.
 */
export function useReincorporar(equipoId: string) {
  const invalidar = useInvalidarPlantilla(equipoId);

  return useMutation({
    mutationFn: async (datos: {
      baja: Inscripcion;
      plantilla: readonly Inscripcion[];
    }): Promise<{ sinDorsal: boolean }> => {
      const dorsal = dorsalAlReincorporar(datos.baja, datos.plantilla);

      await actualizarInscripcion(datos.baja.id, { left_on: null, shirt_number: dorsal });

      return { sinDorsal: datos.baja.shirtNumber !== null && dorsal === null };
    },
    onSuccess: invalidar,
  });
}
