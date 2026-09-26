// Acceso a datos de la convocatoria (D06-07, T-205).
//
// Una tabla: `match_squad`, una línea por jugador y partido, con su llamada,
// el dorsal y la posición de ese partido (DOC 05 §8.3). La RLS pide
// `lineup.manage` en el equipo del partido para escribir.
//
// DE `players` SOLO SE LEE `nickname`, y solo para enseñar a quien tiene línea
// guardada y ya no está en la plantilla.
//
// GUARDAR SON DOS PETICIONES, Y LAS DOS SE PUEDEN REPETIR. La primera crea las
// líneas que faltan con `created_by`, sin convocar, y deja en paz las que ya
// existen; la segunda escribe llamada, dorsal y posición en todas, sin tocar
// `created_by`. Así quien convocó primero sigue constando, y un reintento tras
// un corte no choca con lo que la primera vez sí llegó a guardar. El historial
// de cada cambio lo lleva `audit_log`.
//
// Las líneas nuevas nacen sin convocar a propósito: entre las dos peticiones
// la base nunca ve más convocados que antes ni que después. La base comprueba
// el máximo (R-01) al terminar cada sentencia, con el disparador
// `check_squad_max` (DOC 05 §14.5), así que un cambio de uno por otro con la
// convocatoria llena no la rechaza a medias.

import { SIN_FILAS } from '@shared/lib/guardado';
import { supabase } from '@shared/lib/supabase';

import type { LineaAGuardar, LineaGuardada, Llamada } from '../model/convocatoria';
import type { Posicion } from '@modules/core';

const COLUMNAS = 'player_id, call_status, shirt_number, position, players(nickname)';

interface Fila {
  player_id: string;
  call_status: Llamada;
  shirt_number: number | null;
  position: Posicion | null;
  players: { nickname: string } | null;
}

function aLinea(fila: Fila): LineaGuardada {
  return {
    playerId: fila.player_id,
    nickname: fila.players === null ? '—' : fila.players.nickname,
    callStatus: fila.call_status,
    shirtNumber: fila.shirt_number,
    position: fila.position,
  };
}

/** Lo guardado del partido: vacío si todavía no hay convocatoria. */
export async function fetchConvocatoria(partidoId: string): Promise<LineaGuardada[]> {
  const { data, error } = await supabase
    .from('match_squad')
    .select(COLUMNAS)
    .eq('match_id', partidoId);

  if (error) {
    throw error;
  }

  return data.map(aLinea);
}

/**
 * Guarda todas las líneas del partido. Lanza `SIN_FILAS` si la base devuelve
 * menos de las que se mandaron: la RLS no dejó escribir alguna.
 */
export async function guardarConvocatoria(
  partidoId: string,
  userId: string,
  lineas: readonly LineaAGuardar[],
): Promise<void> {
  const conPartido = lineas.map((linea) => ({ ...linea, match_id: partidoId }));

  const nuevas = await supabase.from('match_squad').upsert(
    lineas.map((linea) => ({
      match_id: partidoId,
      player_id: linea.player_id,
      call_status: 'not_called' as const,
      created_by: userId,
    })),
    { onConflict: 'match_id,player_id', ignoreDuplicates: true },
  );

  if (nuevas.error) {
    throw nuevas.error;
  }

  const { data, error } = await supabase
    .from('match_squad')
    .upsert(conPartido, { onConflict: 'match_id,player_id' })
    .select('player_id');

  if (error) {
    throw error;
  }

  if (data.length !== lineas.length) {
    throw new Error(SIN_FILAS);
  }
}
