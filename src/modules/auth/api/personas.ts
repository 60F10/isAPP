// Acceso a datos de la A07 y de la tarjeta de invitaciones (T-301b).
//
// QUIÉN PUEDE LO DECIDE LA BASE. `team_members`, `team_member_permissions` e
// `invitations` se escriben directamente con `members.manage` (DOC 05 §14.8);
// aceptar una invitación va por función, porque quien acepta todavía no es
// nadie en el equipo y ninguna política le dejaría escribir.
//
// Cada `update` pide la fila de vuelta: si la RLS dice que no, PostgREST no da
// error, devuelve cero filas, y eso aquí es `SIN_FILAS`.
//
// De `players` no se lee nada.

import { SIN_FILAS } from '@shared/lib/guardado';
import { supabase } from '@shared/lib/supabase';

import { GUARDADO_A_MEDIAS } from '../model/personas';

import type { CambiosDePermisos, Invitacion, InvitacionRecibida, Miembro } from '../model/personas';
import type { AppPermission, TeamRole } from '../model/permissions';

// `team_members` tiene dos claves hacia `profiles` (`user_id` e `invited_by`):
// sin nombrar la clave, PostgREST no sabe cuál embeber y rechaza la consulta.
const COLUMNAS_MIEMBRO =
  'id, user_id, role, is_active, profiles!team_members_user_id_fkey(display_name), team_member_permissions(permission)';
const COLUMNAS_INVITACION = 'id, email, role, permissions, expires_at';

interface FilaInvitacion {
  id: string;
  email: string;
  role: TeamRole;
  permissions: AppPermission[];
  expires_at: string;
}

function aInvitacion(fila: FilaInvitacion): Invitacion {
  return {
    id: fila.id,
    email: fila.email,
    role: fila.role,
    permisos: fila.permissions,
    expiresAt: fila.expires_at,
  };
}

/** Los miembros del equipo, activos y de baja, con sus permisos. */
export async function fetchMiembros(teamId: string): Promise<Miembro[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select(COLUMNAS_MIEMBRO)
    .eq('team_id', teamId);

  if (error) {
    throw error;
  }

  return data.map((fila) => ({
    teamMemberId: fila.id,
    userId: fila.user_id,
    // Los tipos dan el perfil por seguro, porque `user_id` es obligatorio. Pero
    // lo filtra la RLS de `profiles`: si no deja leerlo, llega `null`.
    nombre: (fila.profiles as { display_name: string | null } | null)?.display_name ?? null,
    role: fila.role,
    activo: fila.is_active,
    permisos: fila.team_member_permissions.map((concesion) => concesion.permission),
  }));
}

/** Las invitaciones del equipo que siguen pendientes, la más antigua primero. */
export async function fetchInvitaciones(teamId: string): Promise<Invitacion[]> {
  const { data, error } = await supabase
    .from('invitations')
    .select(COLUMNAS_INVITACION)
    .eq('team_id', teamId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data.map(aInvitacion);
}

/**
 * Cambia el rol. Lanza `SIN_FILAS` si la RLS no lo deja. El equipo va en el
 * filtro: la fila tiene que ser de ese equipo, no solo tener ese `id`.
 */
export async function guardarRol(
  teamId: string,
  teamMemberId: string,
  role: TeamRole,
): Promise<void> {
  const { data, error } = await supabase
    .from('team_members')
    .update({ role })
    .eq('id', teamMemberId)
    .eq('team_id', teamId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error(SIN_FILAS);
  }
}

/**
 * Inserta los permisos nuevos, con quién los concede, y borra los quitados.
 *
 * Son dos peticiones sin transacción: si falla la segunda, la primera ya está
 * hecha. Primero van las altas a propósito, para que un fallo a medias deje a
 * la persona con permisos de más y no de menos en mitad de un partido; la
 * lista se recarga y enseña lo que hay.
 *
 * El borrado también pide las filas de vuelta: la RLS que no deja borrar
 * tampoco da error.
 */
export async function guardarPermisos(
  teamMemberId: string,
  grantedBy: string,
  cambios: CambiosDePermisos,
): Promise<void> {
  const hayAltas = cambios.altas.length > 0;

  if (hayAltas) {
    const { error } = await supabase.from('team_member_permissions').insert(
      cambios.altas.map((permission) => ({
        team_member_id: teamMemberId,
        permission,
        granted_by: grantedBy,
      })),
    );

    if (error) {
      throw error;
    }
  }

  if (cambios.bajas.length > 0) {
    const { data, error } = await supabase
      .from('team_member_permissions')
      .delete()
      .eq('team_member_id', teamMemberId)
      .in('permission', cambios.bajas)
      .select('permission');

    // Si las altas ya entraron, la persona se queda con lo nuevo y sin perder
    // lo quitado: se dice que fue a medias y no se disfraza de otro fallo.
    if (error) {
      throw hayAltas ? new Error(GUARDADO_A_MEDIAS, { cause: error }) : error;
    }

    if (data.length === 0) {
      throw hayAltas ? new Error(GUARDADO_A_MEDIAS) : new Error(SIN_FILAS);
    }
  }
}

/**
 * Da de baja (`false`) o reactiva (`true`). No se borra a nadie: la fila se
 * queda con su historial. Lanza `SIN_FILAS` si la RLS no lo deja, si la fila
 * no es de ese equipo o si ya estaba en el estado pedido (el estado de
 * partida va en el filtro, para no pisar lo que otro haya cambiado).
 */
export async function cambiarActivo(
  teamId: string,
  teamMemberId: string,
  activo: boolean,
): Promise<void> {
  const { data, error } = await supabase
    .from('team_members')
    .update({ is_active: activo })
    .eq('id', teamMemberId)
    .eq('team_id', teamId)
    .eq('is_active', !activo)
    .select('id')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error(SIN_FILAS);
  }
}

/**
 * Guarda una invitación. El `token`, la caducidad, `created_by` y el correo
 * normalizado los pone la base (DOC 05 §14.8). No se envía ningún correo.
 */
export async function invitar(
  teamId: string,
  datos: { email: string; role: TeamRole; permissions: AppPermission[] },
): Promise<Invitacion> {
  const { data, error } = await supabase
    .from('invitations')
    .insert({ team_id: teamId, ...datos })
    .select(COLUMNAS_INVITACION)
    .single();

  if (error) {
    throw error;
  }

  return aInvitacion(data);
}

/**
 * Revoca una invitación pendiente. El estado va en el filtro: si ya se aceptó
 * o ya se revocó desde otro aparato, cero filas y `SIN_FILAS`, no se pisa.
 */
export async function revocarInvitacion(invitationId: string): Promise<void> {
  const { data, error } = await supabase
    .from('invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error(SIN_FILAS);
  }
}

/** Las invitaciones pendientes para el correo de la cuenta que ha entrado. */
export async function misInvitaciones(): Promise<InvitacionRecibida[]> {
  const { data, error } = await supabase.rpc('mis_invitaciones');

  if (error) {
    throw error;
  }

  return data.map((fila) => ({
    id: fila.id,
    teamId: fila.team_id,
    teamName: fila.team_name,
    clubName: fila.club_name,
    // Los tipos generados dan por rellenas las columnas de una función; quien
    // invitó puede no tener nombre puesto en su perfil.
    invitedByName: (fila.invited_by_name as string | null) ?? '',
    role: fila.role,
    asFollower: fila.as_follower,
    expiresAt: fila.expires_at,
  }));
}

/** Acepta una invitación. Devuelve lo que devuelve la función de la base. */
export async function aceptarInvitacion(invitationId: string): Promise<string> {
  const { data, error } = await supabase.rpc('aceptar_invitacion', {
    p_invitation_id: invitationId,
  });

  if (error) {
    throw error;
  }

  return data;
}
