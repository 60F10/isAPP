// Acceso a datos de la asistencia (D06-07, T-229).
//
// Una tabla: `training_attendance`, una fila por jugador y entrenamiento, con
// su estado (`present`, `absent`, `late`) y su observación (DOC 05 §9.2). Un
// jugador sin marcar no tiene fila (DOC 04 §13, T-07).
//
// La RLS pide `training.manage` en el equipo de la sesión para escribir. Leer,
// hoy, lo puede cualquier miembro; con la T-227 aplicada (DOC 05 §14.10),
// quien tiene `training.manage` y el administrador de la plataforma. La
// pantalla se comporta igual en los dos casos.
//
// DE `players` SOLO SE LEE `nickname`, para enseñar a quien tiene fila
// guardada y ya no está en la plantilla. Un `select('*')` sobre `players`
// falla desde la T-301a, y el nombre real no se nombra en ninguna consulta.
//
// GUARDAR SON DOS PETICIONES, Y LAS DOS SE PUEDEN REPETIR, como en
// `lineup/api/convocatoria.ts`. La primera crea las filas que faltan con
// `created_by` y deja en paz las que ya existen; la segunda escribe estado y
// observación en todas, sin tocar `created_by`. Así quien pasó lista primero
// sigue constando, y un reintento tras un corte no choca con lo que la primera
// vez sí llegó a guardar. No van en una transacción: si la segunda falla, las
// filas nuevas ya están, con su estado y su observación, y las que existían
// siguen como estaban hasta que se reintente.
//
// EL ESTADO SE MANDA SIEMPRE. La columna nace en `present` si no se manda, y
// un ausente guardado como presente por un descuido no se ve.
//
// `training_sessions.notes` no se toca: esto no escribe en esa tabla.

import { SIN_FILAS } from '@shared/lib/guardado';
import { supabase } from '@shared/lib/supabase';

import type { Asistencia, EstadoDeAsistencia, FilaDeAsistencia } from '../model/lista';

const COLUMNAS = 'player_id, status, notes, players(nickname)';

const CONFLICTO = 'session_id,player_id';

interface Fila {
  player_id: string;
  status: EstadoDeAsistencia;
  notes: string | null;
  players: { nickname: string } | null;
}

function aAsistencia(fila: Fila): Asistencia {
  return {
    playerId: fila.player_id,
    // Sin jugador legible no debería llegar ninguna fila. Si llega, se enseña
    // sin apodo en vez de romper.
    nickname: fila.players === null ? '—' : fila.players.nickname,
    status: fila.status,
    notes: fila.notes,
  };
}

/** Lo guardado del entrenamiento: vacío si todavía no se ha pasado lista. */
export async function fetchAsistencia(sesionId: string): Promise<Asistencia[]> {
  const { data, error } = await supabase
    .from('training_attendance')
    .select(COLUMNAS)
    .eq('session_id', sesionId);

  if (error) {
    throw error;
  }

  return data.map(aAsistencia);
}

/**
 * Guarda las filas del entrenamiento. Con cero filas no llama a la base. Lanza
 * `SIN_FILAS` si la base devuelve menos de las que se mandaron: la RLS no dejó
 * escribir alguna.
 */
export async function guardarAsistencia(
  sesionId: string,
  userId: string,
  filas: readonly FilaDeAsistencia[],
): Promise<void> {
  if (filas.length === 0) {
    return;
  }

  const conSesion = filas.map((fila) => ({
    session_id: sesionId,
    player_id: fila.player_id,
    status: fila.status,
    notes: fila.notes,
  }));

  const nuevas = await supabase.from('training_attendance').upsert(
    conSesion.map((fila) => ({ ...fila, created_by: userId })),
    { onConflict: CONFLICTO, ignoreDuplicates: true },
  );

  if (nuevas.error) {
    throw nuevas.error;
  }

  const { data, error } = await supabase
    .from('training_attendance')
    .upsert(conSesion, { onConflict: CONFLICTO })
    .select('player_id');

  if (error) {
    throw error;
  }

  if (data.length !== filas.length) {
    throw new Error(SIN_FILAS);
  }
}
