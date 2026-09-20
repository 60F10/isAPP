// Lógica de acceso del módulo `auth`: membresías, equipo activo y permisos.
//
// Vive en `model/` porque no sabe de React ni de red (DOC 06 §3.2). Un fallo
// aquí no pierde un dato: esconde una pantalla a quien sí puede abrirla, o se
// la enseña a quien no. Se prueba igual, y por eso está separado del
// proveedor, que es donde no se prueba sin montar medio árbol de React.
//
// ESPEJO EXACTO DE `has_team_permission` (DOC 05 §12.2). Los permisos salen de
// `team_member_permissions` del equipo activo y de ningún otro sitio. El
// administrador de plataforma NO suma permisos aquí, porque tampoco se los da
// la base: `is_platform_admin()` abre la lectura —`can_read_team`— y jamás la
// escritura. Dárselos en el cliente sería enseñar botones que la RLS va a
// rechazar, que de las dos formas de equivocarse es la peor.

import type { Enums } from '@app-types/database.types';

export type AppPermission = Enums<'app_permission'>;
export type TeamRole = Enums<'team_role'>;

/** Clave del equipo activo en `localStorage` (DOC 06 §5.5). */
export const CLAVE_EQUIPO_ACTIVO = 'sasi.equipo-activo';

/** Equipo, con lo que la sesión necesita de él y nada más. */
export interface Team {
  id: string;
  clubId: string;
  name: string;
  category: string | null;
  crestUrl: string | null;
  primaryColor: string | null;
}

/** Pertenencia a un equipo, con sus permisos ya resueltos. */
export interface Membership {
  teamMemberId: string;
  role: TeamRole;
  team: Team;
  permissions: ReadonlySet<AppPermission>;
}

/** Fila de `teams` tal como llega anidada desde `api/`. */
export interface FilaEquipo {
  id: string;
  club_id: string;
  name: string;
  category: string | null;
  crest_url: string | null;
  primary_color: string | null;
}

/** Fila de `team_members` con el equipo y los permisos anidados. */
export interface FilaMembresia {
  id: string;
  role: TeamRole;
  teams: FilaEquipo | null;
  team_member_permissions: readonly { permission: AppPermission }[];
}

/** Un solo conjunto vacío compartido. Comparar por identidad sale gratis. */
const SIN_PERMISOS: ReadonlySet<AppPermission> = new Set<AppPermission>();

/**
 * Convierte las filas de la consulta en membresías, ordenadas por nombre de
 * equipo.
 *
 * El orden importa y no es estético: `elegirEquipoActivo` coge la primera
 * cuando no hay nada recordado, y un orden que cambiara entre cargas movería
 * el equipo activo de quien tiene varios sin que él tocara nada.
 */
export function construirMembresias(filas: readonly FilaMembresia[]): Membership[] {
  const membresias: Membership[] = [];

  for (const fila of filas) {
    // Sin equipo legible no hay nada que enseñar. No debería ocurrir —quien es
    // miembro del equipo puede leerlo, DOC 05 §12.3—, pero una fila a medias
    // se descarta en vez de tumbar la sesión entera.
    if (!fila.teams) {
      continue;
    }

    membresias.push({
      teamMemberId: fila.id,
      role: fila.role,
      team: {
        id: fila.teams.id,
        clubId: fila.teams.club_id,
        name: fila.teams.name,
        category: fila.teams.category,
        crestUrl: fila.teams.crest_url,
        primaryColor: fila.teams.primary_color,
      },
      permissions: new Set(fila.team_member_permissions.map((concesion) => concesion.permission)),
    });
  }

  return membresias.sort((a, b) => a.team.name.localeCompare(b.team.name, 'es'));
}

/**
 * Equipo activo: el recordado si sigue siendo suyo, si no el primero, y
 * `null` cuando no pertenece a ninguno.
 *
 * Validar lo recordado contra la lista evita el caso feo: a quien le dan de
 * baja de un equipo le queda el identificador viejo en `localStorage`, y sin
 * esta comprobación se quedaría con la sesión apuntando a un equipo que ya no
 * es suyo y sin un solo permiso, sin entender por qué.
 */
export function elegirEquipoActivo(
  membresias: readonly Membership[],
  recordado: string | null,
): string | null {
  if (membresias.length === 0) {
    return null;
  }

  if (recordado !== null && membresias.some((membresia) => membresia.team.id === recordado)) {
    return recordado;
  }

  return membresias[0].team.id;
}

/**
 * Permisos efectivos en el equipo activo.
 *
 * Devuelve SIEMPRE un conjunto, nunca `null`: si se llega aquí, ya se
 * preguntó. Quien distingue «todavía no se sabe» de «no tiene ninguno» es el
 * proveedor, con `null` frente a este conjunto vacío (DOC 06 §5.5).
 */
export function permisosDe(
  membresias: readonly Membership[],
  equipoActivoId: string | null,
): ReadonlySet<AppPermission> {
  if (equipoActivoId === null) {
    return SIN_PERMISOS;
  }

  const activa = membresias.find((membresia) => membresia.team.id === equipoActivoId);

  return activa ? activa.permissions : SIN_PERMISOS;
}

/** Lee el equipo recordado, o `null` si el navegador no deja leer. */
export function leerEquipoRecordado(): string | null {
  try {
    return window.localStorage.getItem(CLAVE_EQUIPO_ACTIVO);
  } catch {
    // Safari en navegación privada y cualquier navegador con el almacenamiento
    // bloqueado lanzan aquí. Quedarse sin equipo recordado significa coger el
    // primero: una molestia para quien tenga varios, nunca un fallo.
    return null;
  }
}

/** Recuerda el equipo activo, o lo olvida si se le pasa `null`. */
export function recordarEquipo(equipoId: string | null): void {
  try {
    if (equipoId === null) {
      window.localStorage.removeItem(CLAVE_EQUIPO_ACTIVO);
    } else {
      window.localStorage.setItem(CLAVE_EQUIPO_ACTIVO, equipoId);
    }
  } catch {
    // Lo mismo de arriba: no poder recordar el equipo no justifica tumbar la
    // sesión de quien está entrando.
  }
}
