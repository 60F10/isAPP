// Consultas y mutaciones de la A07 y de la tarjeta de invitaciones (T-301b).
//
// Las mutaciones de miembros invalidan TODO `auth`, contexto de acceso
// incluido: quien se cambia un permiso a sí mismo tiene que verlo en el resto
// de la aplicación sin esperar a que caduque la caché.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { SIN_FILAS } from '@shared/lib/guardado';

import {
  aceptarInvitacion,
  cambiarActivo,
  fetchInvitaciones,
  fetchMiembros,
  guardarPermisos,
  guardarRol,
  invitar,
  misInvitaciones,
  revocarInvitacion,
} from '../api/personas';
import { authKeys } from '../api/queryKeys';
import {
  esGuardadoAMedias,
  GUARDADO_A_MEDIAS,
  ordenarMiembros,
  PERMISOS_CAMBIADOS,
} from '../model/personas';
import { useAuth } from './authContext';

import type { CambiosDePermisos } from '../model/personas';
import type { AppPermission, TeamRole } from '../model/permissions';

export function useMiembros(teamId: string | null) {
  return useQuery({
    queryKey: authKeys.miembros(teamId ?? ''),
    queryFn: () => {
      if (teamId === null) {
        throw new Error('Sin equipo.');
      }

      return fetchMiembros(teamId);
    },
    enabled: teamId !== null,
    select: ordenarMiembros,
  });
}

export function useInvitaciones(teamId: string | null) {
  return useQuery({
    queryKey: authKeys.invitaciones(teamId ?? ''),
    queryFn: () => {
      if (teamId === null) {
        throw new Error('Sin equipo.');
      }

      return fetchInvitaciones(teamId);
    },
    enabled: teamId !== null,
  });
}

interface GuardarMiembro {
  teamMemberId: string;
  /** El rol nuevo, o `null` si no ha cambiado. */
  role: TeamRole | null;
  cambios: CambiosDePermisos;
}

/** La base dice que la fila ya no es como era: otra persona la cambió. */
function esConflicto(error: unknown): boolean {
  if (error instanceof Error && error.message === SIN_FILAS) {
    return true;
  }

  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

/**
 * Guarda el rol y los permisos de un miembro.
 *
 * DEUDA (T-301b): son hasta tres peticiones sin transacción. Si falla una a
 * medias, lo anterior ya está guardado; por eso se invalida también al fallar,
 * para que la lista se recargue y diga lo que hay de verdad. Desde la T-306 el
 * fallo a medias lleva su marca (`GUARDADO_A_MEDIAS`), y el conflicto con otra
 * persona la suya (`PERMISOS_CAMBIADOS`).
 */
export function useGuardarMiembro(teamId: string) {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teamMemberId, role, cambios }: GuardarMiembro) => {
      if (session === null) {
        throw new Error('Sin sesión.');
      }

      const algoGuardado = role !== null;

      if (role !== null) {
        await guardarRol(teamId, teamMemberId, role);
      }

      if (cambios.altas.length > 0 || cambios.bajas.length > 0) {
        try {
          await guardarPermisos(teamMemberId, session.user.id, cambios);
        } catch (error) {
          if (esGuardadoAMedias(error)) {
            throw error;
          }

          if (algoGuardado) {
            throw new Error(GUARDADO_A_MEDIAS, { cause: error });
          }

          if (esConflicto(error)) {
            throw new Error(PERMISOS_CAMBIADOS, { cause: error });
          }

          throw error;
        }
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: authKeys.all }),
  });
}

/** Da de baja o reactiva a un miembro. */
export function useCambiarActivo(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamMemberId, activo }: { teamMemberId: string; activo: boolean }) =>
      cambiarActivo(teamId, teamMemberId, activo),
    onSettled: () => queryClient.invalidateQueries({ queryKey: authKeys.all }),
  });
}

export function useInvitar(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (datos: { email: string; role: TeamRole; permissions: AppPermission[] }) =>
      invitar(teamId, datos),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.invitaciones(teamId) }),
  });
}

/**
 * Revoca una invitación. Invalida también al fallar: `SIN_FILAS` aquí suele
 * ser que ya la aceptaron o la revocaron desde otro aparato.
 */
export function useRevocarInvitacion(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) => revocarInvitacion(invitationId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: authKeys.invitaciones(teamId) }),
  });
}

/** Invitaciones para la cuenta que ha entrado. Apagada si no hay sesión. */
export function useMisInvitaciones() {
  const { session } = useAuth();
  const userId = session === null ? null : session.user.id;

  return useQuery({
    queryKey: authKeys.misInvitaciones(userId),
    queryFn: misInvitaciones,
    enabled: userId !== null,
  });
}

/**
 * Acepta una invitación.
 *
 * NO invalida aquí el contexto de acceso: de eso se encarga quien llama, con
 * `reintentarContexto()`, que es la puerta que ya tiene el proveedor. Solo se
 * refresca la lista de invitaciones, y sin esperar: al vaciarse, la tarjeta
 * deja de pintarse, y una mutación que espera pierde sus `onSuccess` si quien
 * la llamó se desmonta.
 */
export function useAceptarInvitacion() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session === null ? null : session.user.id;

  return useMutation({
    mutationFn: (invitationId: string) => aceptarInvitacion(invitationId),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.misInvitaciones(userId) });
    },
  });
}
