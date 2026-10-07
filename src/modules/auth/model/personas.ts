// Personas del equipo: roles, permisos e invitaciones (T-301b, pantalla A07).
//
// Vive en `model/` porque no sabe de React ni de red (DOC 06 §3.2). Las
// tablas de aquí son copia del DOC 04 §15: si cambia una plantilla de rol, se
// cambia allí y aquí en el mismo commit.
//
// EL ROL NO DA PERMISOS. Los permisos son filas (`team_member_permissions`) y
// el rol es una plantilla que las rellena al invitar o al pulsar «Poner los
// permisos de su rol». A partir de ahí cada permiso se marca por separado, y
// lo que manda es lo marcado.

import type { AppPermission, TeamRole } from './permissions';

/** Los doce permisos del MVP, en el orden del DOC 04 §15.1. */
export const PERMISOS: readonly AppPermission[] = [
  'team.manage',
  'roster.manage',
  'competition.manage',
  'schedule.manage',
  'lineup.manage',
  'match.live.write',
  'event.approve',
  'match.close',
  'discipline.manage',
  'training.manage',
  'stats.view',
  'members.manage',
];

/** Qué habilita cada permiso, con la frase del DOC 04 §15.1. */
export const DESCRIPCION_DE_PERMISO: Record<AppPermission, string> = {
  'team.manage': 'Editar el equipo y sus datos',
  'roster.manage': 'Crear y editar jugadores e inscripciones',
  'competition.manage': 'Crear competiciones y editar su reglamento',
  'schedule.manage': 'Crear y editar partidos y entrenamientos',
  'lineup.manage': 'Guardar la convocatoria',
  'match.live.write': 'Registrar eventos durante el partido',
  'event.approve': 'Aprobar y rechazar eventos, y editar los ajenos',
  'match.close': 'Cerrar y reabrir el partido, y confirmar el resultado del acta',
  'discipline.manage': 'Sanciones, arrestos y disponibilidad',
  'training.manage': 'Pasar lista y escribir observaciones',
  'stats.view': 'Consultar estadísticas del equipo',
  'members.manage': 'Invitar personas y asignar permisos',
};

/** Los cuatro roles de `team_role`, de más a menos función. */
export const ROLES: readonly TeamRole[] = ['coach', 'delegate', 'scout', 'spectator'];

export const NOMBRES_DE_ROL: Record<TeamRole, string> = {
  coach: 'Entrenador',
  delegate: 'Delegado',
  scout: 'Ojeador',
  spectator: 'Espectador',
};

/**
 * Permisos que rellena cada rol (DOC 04 §15.2).
 *
 * `event.approve` y `members.manage` solo entran en la del entrenador: quien
 * lleva el registro el día del partido es una persona concreta y no un rol, y
 * se le marca a mano. El espectador nace solo con `stats.view`; el
 * `match.live.write` «si el entrenador lo habilita» es eso, marcarlo a mano.
 */
export const PLANTILLAS_DE_ROL: Record<TeamRole, readonly AppPermission[]> = {
  coach: PERMISOS,
  delegate: ['schedule.manage', 'match.live.write', 'training.manage', 'stats.view'],
  scout: ['match.live.write', 'stats.view'],
  spectator: ['stats.view'],
};

/** Una persona con función en el equipo. */
export interface Miembro {
  teamMemberId: string;
  userId: string;
  /** `display_name` del perfil. `null` si la persona no tiene nombre puesto. */
  nombre: string | null;
  role: TeamRole;
  /** `false` es dado de baja: conserva su historial y no entra. */
  activo: boolean;
  permisos: readonly AppPermission[];
}

/** Una invitación que el equipo tiene pendiente de aceptar. */
export interface Invitacion {
  id: string;
  email: string;
  role: TeamRole;
  permisos: readonly AppPermission[];
  expiresAt: string;
}

/** Una invitación dirigida al correo de quien ha entrado (`mis_invitaciones`). */
export interface InvitacionRecibida {
  id: string;
  teamId: string;
  teamName: string;
  clubName: string;
  invitedByName: string;
  role: TeamRole;
  asFollower: boolean;
  expiresAt: string;
}

/** Los permisos de un conjunto, en el orden de la lista cerrada. */
export function enOrden(permisos: Iterable<AppPermission>): AppPermission[] {
  const marcados = new Set(permisos);

  return PERMISOS.filter((permiso) => marcados.has(permiso));
}

export interface CambiosDePermisos {
  /** Los que no tenía y hay que insertar. */
  altas: AppPermission[];
  /** Los que tenía y hay que borrar. */
  bajas: AppPermission[];
}

/**
 * Qué filas hay que insertar y cuáles borrar para pasar de `antes` a
 * `despues`. Sin cambios, las dos listas salen vacías y no se llama a la base.
 */
export function cambiosDePermisos(
  antes: Iterable<AppPermission>,
  despues: Iterable<AppPermission>,
): CambiosDePermisos {
  const tenia = new Set(antes);
  const tendra = new Set(despues);

  return {
    altas: PERMISOS.filter((permiso) => tendra.has(permiso) && !tenia.has(permiso)),
    bajas: PERMISOS.filter((permiso) => tenia.has(permiso) && !tendra.has(permiso)),
  };
}

/**
 * Marca de «el guardado de un miembro se quedó a medias»: el rol o parte de
 * los permisos ya están en la base y lo demás no. La lanzan `api/` y el hook
 * de guardar, y la pantalla la traduce a una frase (T-306).
 */
export const GUARDADO_A_MEDIAS = 'GUARDADO_A_MEDIAS';

/**
 * Marca de «otra persona ha cambiado los permisos mientras se editaban»: la
 * base contestó 23505 o cero filas y todavía no se había guardado nada.
 */
export const PERMISOS_CAMBIADOS = 'PERMISOS_CAMBIADOS';

/** Un error con la marca `marca` como mensaje. */
function esMarca(error: unknown, marca: string): boolean {
  return error instanceof Error && error.message === marca;
}

export function esGuardadoAMedias(error: unknown): boolean {
  return esMarca(error, GUARDADO_A_MEDIAS);
}

export function esPermisosCambiados(error: unknown): boolean {
  return esMarca(error, PERMISOS_CAMBIADOS);
}

export const TEXTO_GUARDADO_A_MEDIAS =
  'Se ha guardado una parte. La lista ya enseña lo que hay: revísala y vuelve a guardar.';

export const TEXTO_PERMISOS_CAMBIADOS =
  'Otra persona ha cambiado estos permisos. La lista ya enseña lo que hay: revísala y vuelve a guardar.';

export interface ResultadoInvitacion {
  /** El correo listo para guardar, o `null` si no vale. */
  email: string | null;
  error: string | null;
}

/** Algo, una arroba y algo más, sin espacios. La base no pide más que eso. */
const FORMA_DE_CORREO = /^[^\s@]+@[^\s@]+$/;

/**
 * Valida el correo de una invitación y lo deja como lo guarda la base: sin
 * espacios en los bordes y en minúsculas.
 *
 * La invitación se casa con el correo de la cuenta de Google de quien entra,
 * así que una mayúscula de más no puede ser la diferencia entre verla y no.
 */
export function validarInvitacion(correo: string): ResultadoInvitacion {
  const email = correo.trim().toLowerCase();

  if (email === '') {
    return { email: null, error: 'Escribe el correo de la persona.' };
  }

  if (!FORMA_DE_CORREO.test(email)) {
    return {
      email: null,
      error: 'Escribe el correo completo, con su arroba: nombre@gmail.com.',
    };
  }

  return { email, error: null };
}

/** «Sin permisos», «1 permiso», «4 permisos». */
export function textoDePermisos(cuantos: number): string {
  if (cuantos === 0) {
    return 'Sin permisos';
  }

  return cuantos === 1 ? '1 permiso' : `${String(cuantos)} permisos`;
}

/** Nombre para enseñar: el del perfil, o un texto que diga que no lo hay. */
export function nombreDeMiembro(miembro: Miembro): string {
  return miembro.nombre === null || miembro.nombre.trim() === '' ? 'Sin nombre' : miembro.nombre;
}

/** Por nombre, con los dados de baja al final. */
export function ordenarMiembros(miembros: readonly Miembro[]): Miembro[] {
  return [...miembros].sort((a, b) => {
    if (a.activo !== b.activo) {
      return a.activo ? -1 : 1;
    }

    return nombreDeMiembro(a).localeCompare(nombreDeMiembro(b), 'es');
  });
}

/**
 * Frase de la tarjeta de Inicio: «Isaac te invita a Cadete A, de C.D. Unión
 * Tejina, como delegado.»
 */
export function fraseDeInvitacion(invitacion: InvitacionRecibida): string {
  const quien = invitacion.invitedByName.trim();
  const como = invitacion.asFollower ? 'seguidor' : NOMBRES_DE_ROL[invitacion.role].toLowerCase();
  const destino = `${invitacion.teamName}, de ${invitacion.clubName}, como ${como}.`;

  return quien === '' ? `Te invitan a ${destino}` : `${quien} te invita a ${destino}`;
}
