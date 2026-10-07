// Consultas y mutaciones de seguir y de pedir permisos (T-301c).
//
// NINGUNA MUTACIÓN DE AQUÍ RECARGA EL CONTEXTO DE ACCESO. Seguir y dejar de
// seguir cambian los equipos de quien ha entrado, y de eso se encarga quien
// llama, con `reintentarContexto()`, que es la puerta que ya tiene el
// proveedor (igual que al aceptar una invitación).
//
// Las invalidaciones no se esperan: varias de estas mutaciones hacen
// desaparecer la fila que las lanzó, y una mutación que espera pierde sus
// `onSuccess` si quien la llamó se desmonta.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authKeys } from '../api/queryKeys';
import {
  cancelarSolicitud,
  dejarDeSeguir,
  equiposDeLaLista,
  fetchEnLaLista,
  guardarEnLaLista,
  misSolicitudes,
  quitarSeguidor,
  resolverSolicitud,
  seguidoresDelEquipo,
  seguirEquipo,
  solicitarAcceso,
  solicitudesDelEquipo,
} from '../api/solicitudes';
import { useAuth } from './authContext';

import type { Decision } from '../api/solicitudes';
import type { Seguidor, SolicitudRecibida } from '../model/solicitudes';

// ---------------------------------------------------------------------------
// Quien busca equipo
// ---------------------------------------------------------------------------

export function useEquiposDeLaLista() {
  return useQuery({
    queryKey: authKeys.equiposDeLaLista(),
    queryFn: equiposDeLaLista,
  });
}

/** Las solicitudes de la cuenta que ha entrado. Apagada si no hay sesión. */
export function useMisSolicitudes() {
  const { session } = useAuth();
  const userId = session === null ? null : session.user.id;

  return useQuery({
    queryKey: authKeys.misSolicitudes(userId),
    queryFn: () => {
      if (userId === null) {
        throw new Error('Sin sesión.');
      }

      return misSolicitudes(userId);
    },
    enabled: userId !== null,
  });
}

export function useSeguir() {
  return useMutation({ mutationFn: (teamId: string) => seguirEquipo(teamId) });
}

export function useDejarDeSeguir() {
  return useMutation({ mutationFn: (teamId: string) => dejarDeSeguir(teamId) });
}

/**
 * Deja una solicitud de permisos. Refresca las propias también al fallar: el
 * rechazo más corriente es que ya había una pendiente desde otro aparato.
 */
export function useSolicitarAcceso() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session === null ? null : session.user.id;

  return useMutation({
    mutationFn: ({ teamId, mensaje }: { teamId: string; mensaje: string | null }) =>
      solicitarAcceso(teamId, mensaje),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.misSolicitudes(userId) });
    },
  });
}

export function useCancelarSolicitud() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session === null ? null : session.user.id;

  return useMutation({
    mutationFn: (requestId: string) => cancelarSolicitud(requestId),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.misSolicitudes(userId) });
    },
  });
}

// ---------------------------------------------------------------------------
// Quien lleva el equipo (A07)
// ---------------------------------------------------------------------------

export function useSolicitudesDelEquipo(teamId: string) {
  return useQuery({
    queryKey: authKeys.solicitudes(teamId),
    queryFn: () => solicitudesDelEquipo(teamId),
  });
}

/**
 * Acepta o rechaza una solicitud.
 *
 * Aceptar crea un miembro y, si seguía al equipo, lo quita de seguidor: se
 * refrescan las tres listas. También al fallar, que suele ser que otro ya la
 * resolvió.
 *
 * La solicitud resuelta sale de la lista en cuanto la base contesta, sin
 * esperar a la recarga: mientras siguiera pintada se podría resolver otra vez.
 */
export function useResolverSolicitud(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, decision }: { requestId: string; decision: Decision }) =>
      resolverSolicitud(requestId, decision),
    onSuccess: (_nada, { requestId }) => {
      queryClient.setQueryData<SolicitudRecibida[]>(authKeys.solicitudes(teamId), (antes) =>
        antes?.filter((solicitud) => solicitud.id !== requestId),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.solicitudes(teamId) });
      void queryClient.invalidateQueries({ queryKey: authKeys.miembros(teamId) });
      void queryClient.invalidateQueries({ queryKey: authKeys.seguidores(teamId) });
    },
  });
}

export function useSeguidoresDelEquipo(teamId: string) {
  return useQuery({
    queryKey: authKeys.seguidores(teamId),
    queryFn: () => seguidoresDelEquipo(teamId),
  });
}

export function useQuitarSeguidor(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => quitarSeguidor(teamId, userId),
    onSuccess: (_nada, userId) => {
      queryClient.setQueryData<Seguidor[]>(authKeys.seguidores(teamId), (antes) =>
        antes?.filter((seguidor) => seguidor.userId !== userId),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.seguidores(teamId) });
    },
  });
}

export function useEnLaLista(teamId: string) {
  return useQuery({
    queryKey: authKeys.enLaLista(teamId),
    queryFn: () => fetchEnLaLista(teamId),
  });
}

/**
 * Pone o quita al equipo de la lista. Refresca la lista de equipos, por si
 * quien lo cambia abre después «Unirse a un equipo» en el mismo aparato.
 */
export function useGuardarEnLaLista(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (enLaLista: boolean) => guardarEnLaLista(teamId, enLaLista),
    onSuccess: (_nada, enLaLista) => {
      queryClient.setQueryData<boolean>(authKeys.enLaLista(teamId), enLaLista);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.enLaLista(teamId) });
      void queryClient.invalidateQueries({ queryKey: authKeys.equiposDeLaLista() });
    },
  });
}
