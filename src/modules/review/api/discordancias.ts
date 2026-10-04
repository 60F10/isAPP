// Acceso a datos del panel de eventos del cierre (T-210b, DOC 04 §8.2 y §9).
//
// La A13 trabaja en línea: esto va directo a Supabase, no por la cola. La
// RLS deja actualizar un evento a quien tiene `event.approve`, y al autor lo
// suyo mientras está pendiente (DOC 05); `flag_duplicate_candidates` exige
// `event.approve`.
//
// CADA `update` PIDE LA FILA DE VUELTA. Si la RLS dice que no, PostgREST no
// da error: devuelve cero filas. Y los que cambian el estado llevan además el
// estado de partida en el filtro: si otro lo cambió mientras tanto, también
// son cero filas, y se dice que el evento ha cambiado en vez de pisarlo.

import { SIN_FILAS } from '@shared/lib/guardado';
import { supabase } from '@shared/lib/supabase';

import type { EventoRevisable } from '../model/discordancias';

/** El evento ya no está en el estado que se vio: otro lo aprobó, lo descartó o lo recuperó. */
export const EVENTO_CAMBIADO = 'EVENTO_CAMBIADO';

type Estado = EventoRevisable['estado'];

/**
 * Recalcula las marcas de posible repetido del partido (DOC 04 §9.2): mismo
 * tipo, mismo bando, misma parte, autores distintos y dentro de la ventana de
 * `app_settings`. No fusiona nada.
 *
 * @returns cuántos eventos han quedado marcados.
 */
export async function marcarRepetidos(partidoId: string): Promise<number> {
  const { data, error } = await supabase.rpc('flag_duplicate_candidates', {
    p_match_id: partidoId,
  });

  if (error) {
    throw error;
  }

  return data;
}

export interface Resolucion {
  id: string;
  /** El estado que se vio en pantalla. */
  de: Estado;
  /** El estado al que pasa. */
  a: Estado;
  userId: string;
}

/**
 * Aprueba, descarta o recupera un evento: escribe el estado, quién lo revisó
 * y cuándo, y nada más. Lanza `EVENTO_CAMBIADO` si el evento ya no está en
 * el estado de partida.
 */
export async function resolverEvento({ id, de, a, userId }: Resolucion): Promise<void> {
  const { data, error } = await supabase
    .from('match_events')
    .update({ status: a, reviewed_by: userId, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', de)
    .select('id')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error(EVENTO_CAMBIADO);
  }
}

/**
 * Aprueba en bloque (C-01) los pendientes que se vieron en pantalla, por su
 * `id`: uno que haya llegado después no se aprueba sin haberlo visto. Los que
 * otro haya resuelto mientras tanto se quedan como están. Lanza
 * `EVENTO_CAMBIADO` si ya no quedaba ninguno pendiente.
 *
 * @returns cuántos se han aprobado.
 */
export async function aprobarPendientes({
  ids,
  userId,
}: {
  ids: readonly string[];
  userId: string;
}): Promise<number> {
  if (ids.length === 0) {
    return 0;
  }

  const { data, error } = await supabase
    .from('match_events')
    .update({ status: 'approved', reviewed_by: userId, reviewed_at: new Date().toISOString() })
    .in('id', ids)
    .eq('status', 'pending')
    .select('id');

  if (error) {
    throw error;
  }

  if (data.length === 0) {
    throw new Error(EVENTO_CAMBIADO);
  }

  return data.length;
}

/**
 * Corrige cuándo pasó un evento: escribe `period` y `seconds`, y nada más. El
 * estado y la revisión no se tocan. Sin permiso, cero filas y `SIN_FILAS`.
 */
export async function cambiarMinuto({
  id,
  periodo,
  segundos,
}: {
  id: string;
  periodo: number;
  segundos: number;
}): Promise<void> {
  const { data, error } = await supabase
    .from('match_events')
    .update({ period: periodo, seconds: segundos })
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

/**
 * El nombre de quien apuntó cada evento. DE QUIEN ANOTA SOLO SE LEE
 * `display_name`. La política de `profiles` solo enseña a los compañeros: de
 * quien no se ve, o no tiene nombre, no viene nada, y la tarjeta dice «Otra
 * persona».
 */
export async function fetchAutores(ids: readonly string[]): Promise<Map<string, string>> {
  const autores = new Map<string, string>();

  if (ids.length === 0) {
    return autores;
  }

  const { data, error } = await supabase.from('profiles').select('id, display_name').in('id', ids);

  if (error) {
    throw error;
  }

  for (const perfil of data) {
    const nombre = perfil.display_name?.trim() ?? '';

    if (nombre !== '') {
      autores.set(perfil.id, nombre);
    }
  }

  return autores;
}
