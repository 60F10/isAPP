// Hooks de la convocatoria (T-205): atan `model/` y `api/` a la A11.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { agendaKeys, marcarComoConvocado } from '@modules/agenda';
import { useAuth } from '@modules/auth';
import { SIN_FILAS } from '@shared/lib/guardado';

import { fetchConvocatoria, guardarConvocatoria } from '../api/convocatoria';
import { lineupKeys } from '../api/queryKeys';

import type { LineaAGuardar } from '../model/convocatoria';

export function useConvocatoriaGuardada(partidoId: string) {
  return useQuery({
    queryKey: lineupKeys.convocatoria(partidoId),
    queryFn: () => fetchConvocatoria(partidoId),
  });
}

function esFaltaDePermiso(error: unknown): boolean {
  if (error instanceof Error && error.message === SIN_FILAS) {
    return true;
  }

  return typeof error === 'object' && error !== null && 'code' in error && error.code === '42501';
}

/**
 * Guarda la convocatoria y pasa el partido a convocado (L-07).
 *
 * Devuelve `false` en `marcado` cuando la convocatoria se guardó pero el
 * partido no cambió de estado: o ya había empezado, o falta `lineup.manage` en
 * el equipo del partido, que la guardia mira en el equipo activo (punto 26 del
 * DOC 13). Cualquier otro fallo se lanza igual que el de la convocatoria, y
 * reintentar no duplica nada.
 */
export function useGuardarConvocatoria(partidoId: string) {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lineas: LineaAGuardar[]): Promise<{ marcado: boolean }> => {
      if (session === null) {
        throw new Error('Sin sesión.');
      }

      await guardarConvocatoria(partidoId, session.user.id, lineas);

      try {
        await marcarComoConvocado(partidoId);
      } catch (error) {
        if (esFaltaDePermiso(error)) {
          return { marcado: false };
        }

        throw error;
      }

      return { marcado: true };
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: lineupKeys.all }),
        queryClient.invalidateQueries({ queryKey: agendaKeys.all }),
      ]),
  });
}
