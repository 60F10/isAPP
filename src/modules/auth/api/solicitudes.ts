// Acceso a datos de seguir y de pedir permisos (T-301c, DOC 05 §14.8).
//
// CASI TODO VA POR FUNCIÓN. Quien sigue o pide todavía no es nadie en el
// equipo y ninguna política le dejaría escribir; y quien resuelve lo hace por
// `resolver_solicitud`, que crea al miembro con su rol y sus permisos de una
// vez. `access_requests` no tiene ninguna política de escritura.
//
// Dos cosas sí se escriben en su tabla, con la política de siempre: quitar a
// un seguidor (`team_followers`, con `members.manage`) y la casilla de la
// lista (`teams.accepts_requests`, con `team.manage`). Las dos piden la fila
// de vuelta: si la RLS dice que no, PostgREST no da error, devuelve cero
// filas, y eso aquí es `SIN_FILAS`.
//
// De `players` no se lee nada. De las personas, solo `display_name`.

import { SIN_FILAS } from '@shared/lib/guardado';
import { supabase } from '@shared/lib/supabase';

import type { AppPermission, TeamRole } from '../model/permissions';
import type {
  EquipoDeLaLista,
  MiSolicitud,
  Seguidor,
  SolicitudRecibida,
} from '../model/solicitudes';

// Los tipos generados dan por rellenas todas las columnas de lo que devuelve
// una función. La categoría, el nombre del perfil y el mensaje pueden venir
// vacíos, y por eso se leen como `string | null`.
function oNulo(valor: string): string | null {
  return (valor as string | null) ?? null;
}

/** Los equipos que están en la lista, por club y por nombre. */
export async function equiposDeLaLista(): Promise<EquipoDeLaLista[]> {
  const { data, error } = await supabase.rpc('equipos_que_admiten_solicitudes');

  if (error) {
    throw error;
  }

  return data
    .map((fila) => ({
      teamId: fila.team_id,
      teamName: fila.team_name,
      clubName: fila.club_name,
      category: oNulo(fila.category),
    }))
    .sort(
      (a, b) =>
        a.clubName.localeCompare(b.clubName, 'es') || a.teamName.localeCompare(b.teamName, 'es'),
    );
}

/** Sigue a un equipo de la lista. Es inmediato: no lo aprueba nadie. */
export async function seguirEquipo(teamId: string): Promise<void> {
  const { error } = await supabase.rpc('seguir_equipo', { p_team_id: teamId });

  if (error) {
    throw error;
  }
}

export async function dejarDeSeguir(teamId: string): Promise<void> {
  const { error } = await supabase.rpc('dejar_de_seguir', { p_team_id: teamId });

  if (error) {
    throw error;
  }
}

/**
 * Deja una solicitud de permisos pendiente. No da acceso a nada: la resuelve
 * quien tiene `members.manage` en el equipo.
 */
export async function solicitarAcceso(teamId: string, mensaje: string | null): Promise<void> {
  const { error } = await supabase.rpc('solicitar_acceso', {
    p_team_id: teamId,
    p_message: mensaje ?? undefined,
  });

  if (error) {
    throw error;
  }
}

/**
 * Las solicitudes de quien ha entrado, la más reciente primero.
 *
 * Se filtra por `user_id` porque la política deja leer también las del equipo
 * a quien tiene `members.manage`. No se anida el equipo: quien pide todavía no
 * puede leer `teams`, y el nombre sale de la lista.
 */
export async function misSolicitudes(userId: string): Promise<MiSolicitud[]> {
  const { data, error } = await supabase
    .from('access_requests')
    .select('id, team_id, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data.map((fila) => ({
    id: fila.id,
    teamId: fila.team_id,
    status: fila.status,
    createdAt: fila.created_at,
  }));
}

/** Cancela una solicitud propia que sigue pendiente. */
export async function cancelarSolicitud(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('cancelar_solicitud', { p_request_id: requestId });

  if (error) {
    throw error;
  }
}

/** Las solicitudes pendientes del equipo, con el nombre de quien pide. */
export async function solicitudesDelEquipo(teamId: string): Promise<SolicitudRecibida[]> {
  const { data, error } = await supabase.rpc('solicitudes_del_equipo', { p_team_id: teamId });

  if (error) {
    throw error;
  }

  return data.map((fila) => ({
    id: fila.id,
    userId: fila.user_id,
    nombre: oNulo(fila.display_name),
    mensaje: oNulo(fila.message),
    createdAt: fila.created_at,
  }));
}

export type Decision =
  { aprobar: true; role: TeamRole; permissions: AppPermission[] } | { aprobar: false };

/**
 * Acepta una solicitud, con el rol y los permisos elegidos, o la rechaza. A
 * quien se rechaza no se le quita de seguidor.
 */
export async function resolverSolicitud(requestId: string, decision: Decision): Promise<void> {
  const { error } = await supabase.rpc(
    'resolver_solicitud',
    decision.aprobar
      ? {
          p_request_id: requestId,
          p_aprobar: true,
          p_role: decision.role,
          p_permissions: decision.permissions,
        }
      : { p_request_id: requestId, p_aprobar: false },
  );

  if (error) {
    throw error;
  }
}

/** Quién sigue al equipo, con su nombre, del más antiguo al más reciente. */
export async function seguidoresDelEquipo(teamId: string): Promise<Seguidor[]> {
  const { data, error } = await supabase.rpc('seguidores_del_equipo', { p_team_id: teamId });

  if (error) {
    throw error;
  }

  return data
    .map((fila) => ({
      userId: fila.user_id,
      nombre: oNulo(fila.display_name),
      createdAt: fila.created_at,
    }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Quita a un seguidor. No hay lista de bloqueados (DOC 05 §14.8): puede volver
 * a seguir mientras el equipo esté en la lista. Lanza `SIN_FILAS` si la RLS no
 * lo deja o si ya no seguía.
 */
export async function quitarSeguidor(teamId: string, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('team_followers')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .select('user_id');

  if (error) {
    throw error;
  }

  if (data.length === 0) {
    throw new Error(SIN_FILAS);
  }
}

/** Si el equipo está en la lista (`teams.accepts_requests`). */
export async function fetchEnLaLista(teamId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('teams')
    .select('accepts_requests')
    .eq('id', teamId)
    .single();

  if (error) {
    throw error;
  }

  return data.accepts_requests;
}

/** Pone o quita al equipo de la lista. Lanza `SIN_FILAS` si la RLS no lo deja. */
export async function guardarEnLaLista(teamId: string, enLaLista: boolean): Promise<void> {
  const { data, error } = await supabase
    .from('teams')
    .update({ accepts_requests: enLaLista })
    .eq('id', teamId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error(SIN_FILAS);
  }
}
