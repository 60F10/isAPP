// Hook de la precarga del partido (T-206).

import { useQuery } from '@tanstack/react-query';

import { precargarPartido } from '../api/precarga';

export const precargaKey = (partidoId: string) => ['match', 'precarga', partidoId] as const;

/**
 * Precarga el partido cada vez que se entra en la pantalla. Sin reintento
 * automático más allá de uno: si falla, la pantalla lo dice y ofrece
 * reintentar, que es lo que D06-11 pide antes de ir al campo.
 */
export function usePrecargaDelPartido(partidoId: string) {
  return useQuery({
    queryKey: precargaKey(partidoId),
    queryFn: () => precargarPartido(partidoId),
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
