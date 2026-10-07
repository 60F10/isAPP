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

/**
 * Pertenencia a un equipo, con sus permisos ya resueltos.
 *
 * Desde la T-301c también lo es SEGUIR a un equipo (DOC 04 §15.3): la misma
 * forma, con `seguidor` a `true`, sin fila de miembro, sin rol y con el
 * conjunto de permisos vacío. Así el equipo seguido puede ser el activo y el
 * calendario lo enseña sin que ninguna pantalla aprenda nada nuevo: quien
 * pregunta por un permiso recibe un «no», que es lo que dice la base.
 */
export interface Membership {
  /** `id` de la fila de `team_members`. `null` en quien solo sigue al equipo. */
  teamMemberId: string | null;
  /** `null` en quien solo sigue al equipo: seguir no es una función. */
  role: TeamRole | null;
  team: Team;
  permissions: ReadonlySet<AppPermission>;
  /**
   * `true` si solo sigue al equipo. `construirMembresias` lo pone siempre; es
   * opcional para que una membresía escrita a mano sea de miembro salvo que
   * diga otra cosa.
   */
  seguidor?: boolean;
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

/** Fila de `team_followers` con el equipo anidado. */
export interface FilaSeguido {
  teams: FilaEquipo | null;
}

/** Un solo conjunto vacío compartido. Comparar por identidad sale gratis. */
const SIN_PERMISOS: ReadonlySet<AppPermission> = new Set<AppPermission>();

function aEquipo(fila: FilaEquipo): Team {
  return {
    id: fila.id,
    clubId: fila.club_id,
    name: fila.name,
    category: fila.category,
    crestUrl: fila.crest_url,
    primaryColor: fila.primary_color,
  };
}

function porNombre(a: Membership, b: Membership): number {
  return a.team.name.localeCompare(b.team.name, 'es');
}

/**
 * Convierte las filas de la consulta en membresías: primero los equipos donde
 * tiene función, por nombre, y después los que solo sigue, por nombre.
 *
 * El orden importa y no es estético: `elegirEquipoActivo` coge la primera
 * cuando no hay nada recordado, y un orden que cambiara entre cargas movería
 * el equipo activo de quien tiene varios sin que él tocara nada. Por eso los
 * seguidos van detrás: seguir a otro equipo no le cambia el suyo a nadie.
 *
 * SI ES MIEMBRO Y SEGUIDOR DEL MISMO EQUIPO, MANDA LA DE MIEMBRO (DOC 04
 * §15.3). Las funciones de la base ya impiden que ocurra; si ocurre, una sola
 * membresía, con sus permisos.
 */
export function construirMembresias(
  filas: readonly FilaMembresia[],
  seguidos: readonly FilaSeguido[] = [],
): Membership[] {
  const deMiembro: Membership[] = [];

  for (const fila of filas) {
    // Sin equipo legible no hay nada que enseñar. No debería ocurrir —quien es
    // miembro del equipo puede leerlo, DOC 05 §12.3—, pero una fila a medias
    // se descarta en vez de tumbar la sesión entera.
    if (!fila.teams) {
      continue;
    }

    deMiembro.push({
      teamMemberId: fila.id,
      role: fila.role,
      team: aEquipo(fila.teams),
      permissions: new Set(fila.team_member_permissions.map((concesion) => concesion.permission)),
      seguidor: false,
    });
  }

  const conFuncion = new Set(deMiembro.map((membresia) => membresia.team.id));
  const deSeguidor: Membership[] = [];

  for (const fila of seguidos) {
    if (!fila.teams || conFuncion.has(fila.teams.id)) {
      continue;
    }

    deSeguidor.push({
      teamMemberId: null,
      role: null,
      team: aEquipo(fila.teams),
      permissions: SIN_PERMISOS,
      seguidor: true,
    });
  }

  return [...deMiembro.sort(porNombre), ...deSeguidor.sort(porNombre)];
}

/**
 * Equipo activo, o `null` cuando no pertenece a ninguno ni sigue a ninguno.
 *
 * EL RECORDADO SOLO MANDA SI TIENE FUNCIÓN EN ÉL, O SI NO LA TIENE EN NINGUNO
 * (T-305). En cualquier otro caso, la primera de la lista, que ya trae delante
 * las de función (`construirMembresias`).
 *
 * Son dos casos feos y los dos acaban igual, con la sesión apuntando a un
 * equipo donde no tiene un solo permiso y las rutas guardadas en `/403`:
 *
 * - A quien le dan de baja de un equipo le queda el identificador viejo en
 *   `localStorage`. Por eso lo recordado se valida contra la lista.
 * - Quien sigue a un equipo y después entra como miembro en otro se quedaría
 *   con el seguido de activo. Nadie cambia de equipo desde la aplicación, así
 *   que no tendría salida. Por eso un equipo que solo se sigue no le gana a
 *   uno donde se trabaja.
 *
 * El día que haya dónde elegir el equipo activo, quien tenga función en uno
 * no podrá poner de activo uno que solo sigue: habrá que revisar esta regla.
 */
export function elegirEquipoActivo(
  membresias: readonly Membership[],
  recordado: string | null,
): string | null {
  if (membresias.length === 0) {
    return null;
  }

  const recordada =
    recordado === null
      ? undefined
      : membresias.find((membresia) => membresia.team.id === recordado);

  if (recordada !== undefined) {
    const tieneFuncion = recordada.seguidor !== true;

    if (tieneFuncion || membresias.every((membresia) => membresia.seguidor === true)) {
      return recordada.team.id;
    }
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
