// Hooks del cierre (T-210a) y de su panel de eventos (T-210b): atan `model/`
// y `api/` a la A13.

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@modules/auth';

import { cerrarPartido, fetchCierre, guardarOrigen, reabrirPartido } from '../api/cierre';
import {
  aprobarPendientes,
  cambiarMinuto,
  fetchAutores,
  marcarRepetidos,
  resolverEvento,
} from '../api/discordancias';
import { enviarAhora, leerColaDelPartido, limpiarPartido } from '../api/local';
import { reviewKeys } from '../api/queryKeys';

import type { DatosDelCierre, OrigenDeGol, Resultado } from '../model/cierre';
import type { EventoRevisable } from '../model/discordancias';

/** Cada cuánto se vuelve a mirar la cola mientras quede algo por enviar. */
const MIRAR_COLA_MS = 3000;

/** Lo que se da por bueno el nombre de quien anotó: no cambia de un rato para otro. */
const AUTORES_AL_DIA_MS = 5 * 60 * 1000;

export function useCierre(partidoId: string) {
  return useQuery({
    queryKey: reviewKeys.cierre(partidoId),
    queryFn: () => fetchCierre(partidoId),
    enabled: partidoId !== '',
  });
}

/**
 * La cola de este aparato para el partido. Mientras quede algo sin enviar se
 * vuelve a mirar sola: la banda C04 lo va mandando y el cierre se desbloquea
 * sin tocar nada.
 */
export function useColaDelPartido(partidoId: string) {
  return useQuery({
    queryKey: reviewKeys.cola(partidoId),
    queryFn: () => leerColaDelPartido(partidoId),
    enabled: partidoId !== '',
    // Sin IndexedDB no hay cola que mirar, y repetir no lo arregla.
    retry: false,
    refetchInterval: (consulta) =>
      (consulta.state.data?.sinEnviar ?? 0) > 0 ? MIRAR_COLA_MS : false,
  });
}

export function useEnviarAhora(partidoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: enviarAhora,
    onSettled: () => queryClient.invalidateQueries({ queryKey: reviewKeys.cola(partidoId) }),
  });
}

/**
 * Cierra el partido y, si sale bien, limpia este aparato. Un fallo al
 * limpiar no convierte el cierre en fallo: el partido ya está cerrado en el
 * servidor, y lo enviado de la cola se purga igual a las 48 horas.
 *
 * Al terminar se invalida toda la caché: el calendario enseña el estado.
 * SIN ESPERAR a que vuelva, a propósito: con el partido ya en su estado
 * nuevo, la pantalla cambia de sección, el componente que llamó a `mutate`
 * se desmonta y TanStack Query no llama a sus `onSuccess` ni `onError`. Lo
 * mismo al reabrir.
 *
 * @returns cuántas sustituciones repetidas no cuentan en los minutos.
 */
export function useCerrarPartido(datos: DatosDelCierre | null | undefined) {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (acta: Resultado) => {
      if (session === null || datos === null || datos === undefined) {
        throw new Error('Sin sesión o sin partido.');
      }

      const descartados = await cerrarPartido({
        partido: datos.partido,
        acta,
        userId: session.user.id,
      });

      try {
        await limpiarPartido(datos.partido.id);
      } catch {
        // Ver arriba: cerrar ya ha salido bien.
      }

      return descartados;
    },
    onSettled: () => {
      void queryClient.invalidateQueries();
    },
  });
}

export function useReabrirPartido(datos: DatosDelCierre | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (datos === null || datos === undefined) {
        throw new Error('Sin partido.');
      }

      await reabrirPartido(datos.partido);
    },
    onSettled: () => {
      void queryClient.invalidateQueries();
    },
  });
}

export function useGuardarOrigen(partidoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cambio: {
      clientEventId: string;
      detalles: Readonly<Record<string, string>>;
      origen: OrigenDeGol;
    }) => guardarOrigen(cambio.clientEventId, cambio.detalles, cambio.origen, partidoId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: reviewKeys.cierre(partidoId) }),
  });
}

/**
 * Los hooks del panel de eventos (T-210b). Tras cada cambio se invalida la
 * consulta del cierre SIN ESPERAR, como las demás mutaciones de `review`: la
 * lista, el marcador calculado y lo que impide cerrar salen de ella.
 */

/** Recalcula las marcas de posible repetido. La tarjeta lo llama una vez al abrir. */
export function useMarcarRepetidos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (partidoId: string) => marcarRepetidos(partidoId),
    onSettled: (_marcados, _error, partidoId) => {
      void queryClient.invalidateQueries({ queryKey: reviewKeys.cierre(partidoId) });
    },
  });
}

/**
 * El nombre de quien apuntó cada evento, por su identificador. No cuelga de
 * la clave del cierre a propósito: si colgara, cada aprobación volvería a
 * pedir los mismos nombres.
 */
export function useAutores(ids: readonly string[]) {
  return useQuery({
    queryKey: reviewKeys.autores(ids),
    queryFn: () => fetchAutores(ids),
    enabled: ids.length > 0,
    staleTime: AUTORES_AL_DIA_MS,
    // Al aparecer un autor nuevo la clave cambia: sin esto, «Lo apuntó:» se
    // iría de todos los eventos hasta que contestara la consulta.
    placeholderData: keepPreviousData,
  });
}

/** Aprueba, descarta o recupera un evento, con quien revisa. */
export function useResolverEvento(partidoId: string) {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cambio: {
      id: string;
      de: EventoRevisable['estado'];
      a: EventoRevisable['estado'];
    }) => {
      if (session === null) {
        throw new Error('Sin sesión.');
      }

      await resolverEvento({ ...cambio, partidoId, userId: session.user.id });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: reviewKeys.cierre(partidoId) });
    },
  });
}

/**
 * Aprueba en bloque los pendientes que se ven (C-01).
 *
 * @returns cuántos se pidieron y cuántos se han aprobado.
 */
export function useAprobarPendientes(partidoId: string) {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: readonly string[]) => {
      if (session === null) {
        throw new Error('Sin sesión.');
      }

      return aprobarPendientes({ ids, partidoId, userId: session.user.id });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: reviewKeys.cierre(partidoId) });
    },
  });
}

export function useCambiarMinuto(partidoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cambio: { id: string; periodo: number; segundos: number }) =>
      cambiarMinuto({ ...cambio, partidoId }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: reviewKeys.cierre(partidoId) });
    },
  });
}
