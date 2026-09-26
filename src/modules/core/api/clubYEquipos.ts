// Acceso a datos de club y equipos (D06-07, T-201).
//
// Una función por operación, con tipos del dominio y sin saber nada de React.
//
// DOS CUIDADOS QUE SE REPITEN:
//
//   · Las actualizaciones piden la fila de vuelta (`.select()`). Si la RLS no
//     deja cambiarla, PostgREST no da error: devuelve cero filas. Sin pedirla
//     de vuelta, un «no» de la base pasaría por un «guardado» en la pantalla.
//
//   · No hay alta de club ni borrado de nada. Crear un club la RLS lo deja,
//     pero nadie podría leerlo después (`clubs_select` pide ser miembro, y en
//     un club nuevo no lo es nadie). Y ni `clubs` ni `teams` tienen política
//     de borrado. El porqué y las salidas, en el DOC 13.

import { supabase } from '@shared/lib/supabase';

import { SIN_FILAS } from '../model/clubYEquipos';

import type { Club, Equipo, TipoDeEquipo } from '../model/clubYEquipos';
import type { Tables } from '@app-types/database.types';

const COLUMNAS_CLUB = 'id, name, short_name, crest_url';
const COLUMNAS_EQUIPO = 'id, club_id, name, category, kind, crest_url';

type FilaClub = Pick<Tables<'clubs'>, 'id' | 'name' | 'short_name' | 'crest_url'>;
type FilaEquipo = Pick<
  Tables<'teams'>,
  'id' | 'club_id' | 'name' | 'category' | 'kind' | 'crest_url'
>;

function aClub(fila: FilaClub): Club {
  return { id: fila.id, name: fila.name, shortName: fila.short_name, crestUrl: fila.crest_url };
}

function aEquipo(fila: FilaEquipo): Equipo {
  return {
    id: fila.id,
    clubId: fila.club_id,
    name: fila.name,
    category: fila.category,
    kind: fila.kind,
    crestUrl: fila.crest_url,
  };
}

/** El club, o `null` si la RLS no deja leerlo. */
export async function fetchClub(clubId: string): Promise<Club | null> {
  const { data, error } = await supabase
    .from('clubs')
    .select(COLUMNAS_CLUB)
    .eq('id', clubId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data === null ? null : aClub(data);
}

/** Cambia nombre y nombre corto. Lanza `SIN_FILAS` si la RLS no lo deja. */
export async function actualizarClub(
  clubId: string,
  cambios: { name: string; short_name: string | null },
): Promise<Club> {
  const { data, error } = await supabase
    .from('clubs')
    .update(cambios)
    .eq('id', clubId)
    .select(COLUMNAS_CLUB)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error(SIN_FILAS);
  }

  return aClub(data);
}

/** Todos los equipos del club, propios y rivales. */
export async function fetchEquiposDelClub(clubId: string): Promise<Equipo[]> {
  const { data, error } = await supabase
    .from('teams')
    .select(COLUMNAS_EQUIPO)
    .eq('club_id', clubId);

  if (error) {
    throw error;
  }

  return data.map(aEquipo);
}

/**
 * Da de alta un equipo en el club.
 *
 * `created_by` se rellena aquí y no lo pone la base: `teams` no tiene
 * disparador que lo haga, y la trazabilidad silenciosa lo pide (CLAUDE.md).
 */
export async function crearEquipo(
  clubId: string,
  userId: string,
  datos: { name: string; category: string | null; kind: TipoDeEquipo },
): Promise<Equipo> {
  const { data, error } = await supabase
    .from('teams')
    .insert({ ...datos, club_id: clubId, created_by: userId })
    .select(COLUMNAS_EQUIPO)
    .single();

  if (error) {
    throw error;
  }

  return aEquipo(data);
}

/**
 * Cambia nombre y categoría. Lanza `SIN_FILAS` si la RLS no lo deja.
 *
 * El tipo NO se cambia después del alta, a propósito: un equipo gestionado
 * con plantilla, personas y partidos que pasara a rival dejaría todo eso
 * colgando de un equipo que, por definición, no tiene jugadores.
 */
export async function actualizarEquipo(
  equipoId: string,
  cambios: { name: string; category: string | null },
): Promise<Equipo> {
  const { data, error } = await supabase
    .from('teams')
    .update(cambios)
    .eq('id', equipoId)
    .select(COLUMNAS_EQUIPO)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error(SIN_FILAS);
  }

  return aEquipo(data);
}
