// Hooks de la C02, registro de errores (T-303).

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { contarErroresDesde, fetchErrores, fetchEsAdministrador } from '../api/errorLogs';
import type { CursorDeErrores, FiltrosDeErrores } from '../model/consulta';

const clavesDeLogging = {
  all: ['logging'] as const,
  esAdministrador: () => [...clavesDeLogging.all, 'es-administrador'] as const,
  errores: (filtros: FiltrosDeErrores) => [...clavesDeLogging.all, 'errores', filtros] as const,
  recuento: (horas: number) => [...clavesDeLogging.all, 'recuento', horas] as const,
};

const MS_POR_HORA = 3_600_000;

/** Lo dice el perfil de quien mira. `undefined` mientras no conteste. */
export function useEsAdministrador() {
  return useQuery({
    queryKey: clavesDeLogging.esAdministrador(),
    queryFn: fetchEsAdministrador,
  });
}

/**
 * Una página de errores, pedida por cursor: `cursor` es la última fila de la
 * página anterior, o `null` para la primera. Cada página es su propia consulta:
 * no se usa `useInfiniteQuery` porque arrastra al paquete inicial el trozo
 * común de TanStack Query, y la C02 es perezosa.
 *
 * Ninguna página se vuelve a pedir sola —ni al volver el foco a la ventana ni
 * al volver la red—: con una fila nueva por delante, pedirlas otra vez movería
 * sus límites y la lista repetiría o se saltaría una fila. Se pone al día con
 * «Actualizar» (`useActualizarErrores`).
 */
export function useErrores(
  filtros: FiltrosDeErrores,
  cursor: CursorDeErrores | null,
  activo = true,
) {
  return useQuery({
    queryKey: [...clavesDeLogging.errores(filtros), cursor?.createdAt ?? null, cursor?.id ?? null],
    queryFn: () => fetchErrores(filtros, cursor),
    enabled: activo,
    // Varios componentes leen la misma página: sin esto, cada montaje la pide otra vez.
    staleTime: cursor === null ? 30_000 : Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/**
 * Invalida todas las páginas de errores, de cualquier filtro. Resuelve cuando
 * las que están en pantalla han vuelto a llegar.
 */
export function useActualizarErrores() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: [...clavesDeLogging.all, 'errores'] });
}

/** Cuántos errores hay en las últimas `horas` horas. */
export function useRecuento(horas: number, activo: boolean) {
  return useQuery({
    queryKey: clavesDeLogging.recuento(horas),
    queryFn: () => contarErroresDesde(new Date(Date.now() - horas * MS_POR_HORA)),
    enabled: activo,
  });
}
