// Acceso a datos del módulo `auth` (D06-07).
//
// Una función por operación, con tipos del dominio y sin saber nada de React.
// Ningún componente llama a Supabase: llaman aquí, y aquí se llama al cliente
// único de `shared/lib/supabase.ts`.

import { supabase } from '@shared/lib/supabase';

import { construirMembresias } from '../model/permissions';

import type { Membership } from '../model/permissions';
import type { Tables } from '@app-types/database.types';

export type Profile = Tables<'profiles'>;

/** Ruta a la que Google devuelve al usuario. Vive en `BareLayout`. */
export const RUTA_VUELTA = '/auth/callback';

/** Dónde se guarda la ruta a la que iba antes de que le pidieran entrar. */
const CLAVE_DESTINO = 'sasi.destino-tras-entrar';

/** Todo lo que la sesión necesita saber del usuario, en una sola pieza. */
export interface ContextoDeAcceso {
  profile: Profile | null;
  memberships: Membership[];
  /** Temporada en curso de cada club donde el usuario tiene equipo. */
  temporadaPorClub: ReadonlyMap<string, string>;
}

const COLUMNAS_EQUIPO = 'id, club_id, name, category, crest_url, primary_color';

/**
 * Perfil, equipos con sus permisos, equipos que sigue y temporada en curso de
 * cada club.
 *
 * Cuatro consultas y no una: el perfil, los equipos y los seguidos no dependen
 * entre sí, así que van a la vez; las temporadas necesitan saber de qué clubes
 * preguntar, así que esperan. Son dos viajes.
 *
 * LOS EQUIPOS SEGUIDOS SON MEMBRESÍAS SIN PERMISOS (T-301c, DOC 04 §15.3).
 * `team_followers` no tiene `is_active`: se sigue o no se sigue. La política
 * de la tabla deja leer también los seguidores de un equipo a quien tiene
 * `members.manage`, y por eso se filtra por `user_id`.
 *
 * La RLS decide qué vuelve. Aquí no se filtra por seguridad, se filtra por
 * pertinencia: `is_active` deja fuera a quien está dado de baja sin perder su
 * historial (DOC 05 §5.5).
 */
export async function fetchContextoDeAcceso(userId: string): Promise<ContextoDeAcceso> {
  const [perfil, miembros, seguidos] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase
      .from('team_members')
      .select(`id, role, teams(${COLUMNAS_EQUIPO}), team_member_permissions(permission)`)
      .eq('user_id', userId)
      .eq('is_active', true),
    supabase.from('team_followers').select(`teams(${COLUMNAS_EQUIPO})`).eq('user_id', userId),
  ]);

  if (perfil.error) {
    throw perfil.error;
  }

  if (miembros.error) {
    throw miembros.error;
  }

  if (seguidos.error) {
    throw seguidos.error;
  }

  const memberships = construirMembresias(miembros.data ?? [], seguidos.data ?? []);

  return {
    profile: perfil.data,
    memberships,
    temporadaPorClub: await fetchTemporadasEnCurso(memberships),
  };
}

/**
 * Temporada marcada como en curso en cada club donde el usuario tiene equipo.
 *
 * Un índice parcial garantiza que solo haya una por club (DOC 05 §5.3), así
 * que el mapa no puede tener dos candidatas para el mismo club.
 */
async function fetchTemporadasEnCurso(
  membresias: readonly Membership[],
): Promise<ReadonlyMap<string, string>> {
  const clubes = [...new Set(membresias.map((membresia) => membresia.team.clubId))];

  if (clubes.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('seasons')
    .select('id, club_id')
    .in('club_id', clubes)
    .eq('is_current', true);

  if (error) {
    throw error;
  }

  return new Map((data ?? []).map((temporada) => [temporada.club_id, temporada.id]));
}

/**
 * Manda al usuario a Google y guarda a dónde iba.
 *
 * El destino viaja por `sessionStorage` y no dentro de `redirectTo`: Supabase
 * le pega su propia cadena de consulta a esa dirección al devolver el código,
 * y componerla dos veces es pedir un fallo raro el día que el destino lleve un
 * parámetro. La pestaña es la misma durante todo el viaje, así que aguanta.
 *
 * `prompt: 'select_account'` fuerza el selector de cuenta de Google. Cuesta un
 * toque más y evita el caso de quien tiene dos cuentas y entra siempre con la
 * que no quería.
 *
 * REVISADO EN LA T-107, Y SE QUEDA. Ahora hay «Cerrar sesión» en Ajustes, pero
 * eso cierra la sesión de esta aplicación, no la de Google. Sin el selector,
 * volver a entrar reutilizaría en silencio la misma cuenta de Google que sigue
 * abierta en el navegador, y cambiar de cuenta seguiría siendo imposible desde
 * aquí: justo lo que el cierre de sesión tiene que permitir.
 */
export async function signInWithGoogle(destino: string): Promise<void> {
  guardarDestino(destino);

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}${RUTA_VUELTA}`,
      queryParams: { prompt: 'select_account' },
    },
  });

  if (error) {
    throw error;
  }
}

/**
 * Renueva la sesión a mano. Lo pide el aviso de sesión a punto de caducar
 * (T-106) cuando la renovación automática no ha podido.
 *
 * No hace falta devolver la sesión nueva: llega sola por `onAuthStateChange`
 * con el evento `TOKEN_REFRESHED`, y `AuthProvider` la recoge ahí.
 */
export async function renovarSesion(): Promise<void> {
  const { error } = await supabase.auth.refreshSession();

  if (error) {
    throw error;
  }
}

/**
 * Cierra la sesión en ESTE dispositivo (T-107).
 *
 * `scope: 'local'` y no el `global` que Supabase trae por defecto: el global
 * cierra también la sesión del portátil cuando Isaac sale en el móvil, y
 * nadie espera eso de un botón en los ajustes del teléfono.
 *
 * Sin red, Supabase no puede revocar el testigo en el servidor, pero borra la
 * sesión local igual y devuelve el error. Lo que importa aquí es lo segundo:
 * si la sesión ya no está en el dispositivo, el cierre ha funcionado. Solo se
 * lanza si la sesión sigue ahí.
 */
export async function cerrarSesion(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'local' });

  if (error) {
    const { data } = await supabase.auth.getSession();

    if (data.session !== null) {
      throw error;
    }
  }
}

function guardarDestino(destino: string): void {
  try {
    window.sessionStorage.setItem(CLAVE_DESTINO, destino);
  } catch {
    // Sin poder guardarlo, la vuelta lleva al inicio. Se pierde el sitio al
    // que iba, que molesta; tumbar el acceso por eso sería peor.
  }
}

/**
 * Devuelve el destino guardado y lo borra: solo vale para este viaje.
 *
 * Sin el borrado, el destino sobreviviría a la siguiente entrada y mandaría a
 * quien vuelve a entrar a una pantalla que pidió hace dos días.
 */
export function recogerDestino(): string | null {
  try {
    const destino = window.sessionStorage.getItem(CLAVE_DESTINO);
    window.sessionStorage.removeItem(CLAVE_DESTINO);

    return destino;
  } catch {
    return null;
  }
}
