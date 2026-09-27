// Hooks del cierre (T-210a): atan `model/` y `api/` a la A13.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@modules/auth';

import { cerrarPartido, fetchCierre, guardarOrigen, reabrirPartido } from '../api/cierre';
import { enviarAhora, leerColaDelPartido, limpiarPartido } from '../api/local';
import { reviewKeys } from '../api/queryKeys';

import type { DatosDelCierre, OrigenDeGol, Resultado } from '../model/cierre';

/** Cada cuánto se vuelve a mirar la cola mientras quede algo por enviar. */
const MIRAR_COLA_MS = 3000;

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
    }) => guardarOrigen(cambio.clientEventId, cambio.detalles, cambio.origen),
    onSettled: () => queryClient.invalidateQueries({ queryKey: reviewKeys.cierre(partidoId) }),
  });
}
