// Acceso a datos de los entrenamientos (D06-07, T-228).
//
// Solo el horario de `training_sessions`: equipo, temporada, cuándo, dónde y
// con qué objetivo. La asistencia (`training_attendance`) es de la T-229.
//
// La RLS deja leer el horario a quien tiene función en el equipo —en el club,
// cuando se aplique la T-227 (DOC 05 §14.10)— y pide `training.manage` para
// insertar, cambiar y borrar. Un seguidor no lee ninguna fila.
//
// LA COLUMNA `notes` NO SE TOCA. La fila la ve todo el club, así que ahí no va
// ninguna observación: no está en `COLUMNAS`, ni en el alta, ni en la edición.
// La observación del entrenamiento tendrá su tabla en la T-233.
//
// Mismo cuidado que en el resto: la actualización y el borrado piden la fila
// de vuelta y lanzan `SIN_FILAS` si la RLS no deja tocarla.

import { SIN_FILAS } from '@shared/lib/guardado';
import { supabase } from '@shared/lib/supabase';

import type { Entrenamiento } from '../model/entrenamiento';

const COLUMNAS = 'id, team_id, season_id, scheduled_at, location, focus';

interface Fila {
  id: string;
  team_id: string;
  season_id: string;
  scheduled_at: string;
  location: string | null;
  focus: string | null;
}

function aEntrenamiento(fila: Fila): Entrenamiento {
  return {
    id: fila.id,
    teamId: fila.team_id,
    seasonId: fila.season_id,
    scheduledAt: fila.scheduled_at,
    location: fila.location,
    focus: fila.focus,
  };
}

export interface DatosDeEntrenamiento {
  scheduled_at: string;
  location: string | null;
  focus: string | null;
}

/** Los entrenamientos del equipo en la temporada. */
export async function fetchEntrenamientos(
  equipoId: string,
  temporadaId: string,
): Promise<Entrenamiento[]> {
  const { data, error } = await supabase
    .from('training_sessions')
    .select(COLUMNAS)
    .eq('team_id', equipoId)
    .eq('season_id', temporadaId);

  if (error) {
    throw error;
  }

  return data.map(aEntrenamiento);
}

/** Un entrenamiento, o `null` si no existe o la RLS no deja leerlo. */
export async function fetchEntrenamiento(id: string): Promise<Entrenamiento | null> {
  const { data, error } = await supabase
    .from('training_sessions')
    .select(COLUMNAS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data === null ? null : aEntrenamiento(data);
}

export async function crearEntrenamiento(
  destino: { equipoId: string; temporadaId: string; userId: string },
  datos: DatosDeEntrenamiento,
): Promise<Entrenamiento> {
  const { data, error } = await supabase
    .from('training_sessions')
    .insert({
      ...datos,
      team_id: destino.equipoId,
      season_id: destino.temporadaId,
      created_by: destino.userId,
    })
    .select(COLUMNAS)
    .single();

  if (error) {
    throw error;
  }

  return aEntrenamiento(data);
}

/** Cambia cuándo, dónde y el objetivo. Lanza `SIN_FILAS` si la RLS no lo deja. */
export async function actualizarEntrenamiento(
  id: string,
  datos: DatosDeEntrenamiento,
): Promise<Entrenamiento> {
  const { data, error } = await supabase
    .from('training_sessions')
    .update(datos)
    .eq('id', id)
    .select(COLUMNAS)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error(SIN_FILAS);
  }

  return aEntrenamiento(data);
}

/**
 * Borra un entrenamiento, y con él, en cascada, su lista de asistencia. Lanza
 * `SIN_FILAS` si la RLS no lo deja.
 */
export async function borrarEntrenamiento(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('training_sessions')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error(SIN_FILAS);
  }
}
