// Acceso a datos del calendario (D06-07, T-204).
//
// Solo los datos de programación de `matches`: equipo, rival, competición,
// fecha, campo, estado y si es en diferido. El marcador, el cierre y la
// suspensión son del directo y del post-partido.
//
// La RLS pide `schedule.manage` en el equipo para dar de alta y borrar, y el
// disparador `enforce_match_changes` lo pide también para cambiar fecha,
// rival, campo o competición. `club_id` lo rellena otro disparador desde el
// equipo, así que el que se manda aquí se sobrescribe: va solo porque el tipo
// de inserción lo pide.
//
// Mismo cuidado que en el resto: las actualizaciones y el borrado piden la
// fila de vuelta y lanzan `SIN_FILAS` si la RLS no deja tocarla.

import { SIN_FILAS } from '@shared/lib/guardado';
import { supabase } from '@shared/lib/supabase';

import type { EstadoDePartido, Partido } from '../model/partido';

const COLUMNAS =
  'id, team_id, competition_id, opponent_team_id, is_home, kickoff_at, venue, status, is_retroactive, rival:teams!matches_opponent_team_id_fkey(name), competicion:competitions(name)';

interface Fila {
  id: string;
  team_id: string;
  competition_id: string;
  opponent_team_id: string;
  is_home: boolean;
  kickoff_at: string;
  venue: string | null;
  status: EstadoDePartido;
  is_retroactive: boolean;
  rival: { name: string } | null;
  competicion: { name: string } | null;
}

function aPartido(fila: Fila): Partido {
  return {
    id: fila.id,
    teamId: fila.team_id,
    competitionId: fila.competition_id,
    // Sin permiso para leer el rival o la competición no debería llegar
    // ninguna fila: son del mismo club. Si llega, se enseña un guion.
    competitionName: fila.competicion === null ? '—' : fila.competicion.name,
    opponentTeamId: fila.opponent_team_id,
    opponentName: fila.rival === null ? '—' : fila.rival.name,
    isHome: fila.is_home,
    kickoffAt: fila.kickoff_at,
    venue: fila.venue,
    status: fila.status,
    isRetroactive: fila.is_retroactive,
  };
}

export interface DatosDePartido {
  competition_id: string;
  opponent_team_id: string;
  is_home: boolean;
  kickoff_at: string;
  venue: string | null;
  is_retroactive: boolean;
}

/** Los partidos del equipo en la temporada. */
export async function fetchCalendario(equipoId: string, temporadaId: string): Promise<Partido[]> {
  const { data, error } = await supabase
    .from('matches')
    .select(COLUMNAS)
    .eq('team_id', equipoId)
    .eq('season_id', temporadaId);

  if (error) {
    throw error;
  }

  return data.map(aPartido);
}

/** Un partido, o `null` si no existe o la RLS no deja leerlo. */
export async function fetchPartido(partidoId: string): Promise<Partido | null> {
  const { data, error } = await supabase
    .from('matches')
    .select(COLUMNAS)
    .eq('id', partidoId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data === null ? null : aPartido(data);
}

export async function crearPartido(
  destino: { clubId: string; equipoId: string; temporadaId: string; userId: string },
  datos: DatosDePartido,
): Promise<Partido> {
  const { data, error } = await supabase
    .from('matches')
    .insert({
      ...datos,
      club_id: destino.clubId,
      team_id: destino.equipoId,
      season_id: destino.temporadaId,
      created_by: destino.userId,
    })
    .select(COLUMNAS)
    .single();

  if (error) {
    throw error;
  }

  return aPartido(data);
}

/** Cambia la programación. Lanza `SIN_FILAS` si la RLS no lo deja. */
export async function actualizarPartido(
  partidoId: string,
  datos: DatosDePartido,
): Promise<Partido> {
  const { data, error } = await supabase
    .from('matches')
    .update(datos)
    .eq('id', partidoId)
    .select(COLUMNAS)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error(SIN_FILAS);
  }

  return aPartido(data);
}

/**
 * Borra un partido. La pantalla solo lo ofrece antes de jugarse: después
 * arrastraría en cascada sus eventos, convocatoria y tramos.
 */
export async function borrarPartido(partidoId: string): Promise<void> {
  const { data, error } = await supabase
    .from('matches')
    .delete()
    .eq('id', partidoId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error(SIN_FILAS);
  }
}
