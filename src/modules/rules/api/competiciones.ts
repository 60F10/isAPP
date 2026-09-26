// Acceso a datos de competiciones (D06-07, T-203).
//
// La competición es del club y de una temporada (DOC 05 §7.1). La RLS pide
// `competition.manage` en algún equipo del club para escribir.
//
// Mismo cuidado que en `core`: las actualizaciones piden la fila de vuelta y
// lanzan `SIN_FILAS` si la RLS no deja tocarla. Sin borrado: los partidos
// apuntan a su competición con `on delete restrict`, y una competición con
// partidos no se puede borrar de todos modos.

import { SIN_FILAS } from '@shared/lib/guardado';
import { supabase } from '@shared/lib/supabase';

import type { Competicion, DatosDeCompeticion } from '../model/competicion';
import type { Tables } from '@app-types/database.types';

// Con las cuatro de la categoría (DOC 05 §14.4, T-203b).
const COLUMNAS =
  'id, club_id, season_id, name, kind, category, level, scope, group_label, periods_count, period_minutes, halftime_minutes, clock_mode, substitution_type, substitutions_max, squad_max, players_on_pitch, yellow_cards_for_ban, red_card_default_bans, enabled_event_types';

type Fila = Omit<Tables<'competitions'>, 'created_by' | 'created_at' | 'updated_at'>;

function aCompeticion(fila: Fila): Competicion {
  return {
    id: fila.id,
    clubId: fila.club_id,
    seasonId: fila.season_id,
    name: fila.name,
    kind: fila.kind,
    category: fila.category,
    level: fila.level,
    scope: fila.scope,
    group_label: fila.group_label,
    periods_count: fila.periods_count,
    period_minutes: fila.period_minutes,
    halftime_minutes: fila.halftime_minutes,
    clock_mode: fila.clock_mode,
    substitution_type: fila.substitution_type,
    substitutions_max: fila.substitutions_max,
    squad_max: fila.squad_max,
    players_on_pitch: fila.players_on_pitch,
    yellow_cards_for_ban: fila.yellow_cards_for_ban,
    red_card_default_bans: fila.red_card_default_bans,
    enabled_event_types: fila.enabled_event_types,
  };
}

/** Las competiciones del club en una temporada. */
export async function fetchCompeticiones(
  clubId: string,
  temporadaId: string,
): Promise<Competicion[]> {
  const { data, error } = await supabase
    .from('competitions')
    .select(COLUMNAS)
    .eq('club_id', clubId)
    .eq('season_id', temporadaId)
    .order('name');

  if (error) {
    throw error;
  }

  return data.map(aCompeticion);
}

/** Una competición, o `null` si no existe o la RLS no deja leerla. */
export async function fetchCompeticion(competicionId: string): Promise<Competicion | null> {
  const { data, error } = await supabase
    .from('competitions')
    .select(COLUMNAS)
    .eq('id', competicionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data === null ? null : aCompeticion(data);
}

export async function crearCompeticion(
  destino: { clubId: string; temporadaId: string; userId: string },
  datos: DatosDeCompeticion,
): Promise<Competicion> {
  const { data, error } = await supabase
    .from('competitions')
    .insert({
      ...datos,
      club_id: destino.clubId,
      season_id: destino.temporadaId,
      created_by: destino.userId,
    })
    .select(COLUMNAS)
    .single();

  if (error) {
    throw error;
  }

  return aCompeticion(data);
}

/** Cambia nombre, tipo, categoría o reglamento. Lanza `SIN_FILAS` si la RLS no lo deja. */
export async function actualizarCompeticion(
  competicionId: string,
  datos: DatosDeCompeticion,
): Promise<Competicion> {
  const { data, error } = await supabase
    .from('competitions')
    .update(datos)
    .eq('id', competicionId)
    .select(COLUMNAS)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error(SIN_FILAS);
  }

  return aCompeticion(data);
}
