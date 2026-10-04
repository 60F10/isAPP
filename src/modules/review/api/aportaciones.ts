// Acceso a datos de «Mis aportaciones» (T-211, pantalla A14).
//
// La A14 trabaja en línea, como la A13: esto va directo a Supabase, no por la
// cola. Lo que el móvil aún no ha enviado no está en el servidor y aquí no
// sale.
//
// QUIÉN PUEDE LO DECIDE LA BASE. Las políticas `match_events_update` y
// `match_events_delete` dejan al autor cambiar y borrar lo suyo mientras está
// pendiente y, con `event.approve`, cualquier evento del equipo. El
// disparador `validate_match_event` exige que el jugador y el segundo jugador
// estén convocados, y `match_events_audit` apunta cada cambio y cada borrado
// en `audit_log`.
//
// CADA `update` Y CADA `delete` PIDEN LA FILA DE VUELTA. Si la RLS dice que
// no, o el evento ya no existe, PostgREST no da error: devuelve cero filas, y
// aquí se convierte en `SIN_FILAS`. El `id` del evento y su partido van en el
// filtro, y se escribe solo la columna que se cambia.

import { desdeFilas } from '@modules/match';
import { SIN_FILAS } from '@shared/lib/guardado';
import { supabase } from '@shared/lib/supabase';

import type { DatosDeAportaciones } from '../model/aportaciones';

const COLUMNAS_PARTIDO =
  'id, kickoff_at, status, rival:teams!matches_opponent_team_id_fkey(name), competicion:competitions(periods_count, period_minutes)';

const COLUMNAS_EVENTO =
  'id, match_id, client_event_id, event_type, period, seconds, is_opponent, player_id, secondary_player_id, details, status';

/**
 * Lo que ha apuntado `userId` en los partidos del equipo y la temporada. Tres
 * consultas seguidas y no una con todo embebido: los eventos se filtran por
 * los partidos del equipo, y la convocatoria solo se pide de los partidos en
 * los que hay algo que enseñar.
 */
export async function fetchAportaciones(
  teamId: string,
  seasonId: string,
  userId: string,
): Promise<DatosDeAportaciones> {
  const partidos = await supabase
    .from('matches')
    .select(COLUMNAS_PARTIDO)
    .eq('team_id', teamId)
    .eq('season_id', seasonId);

  if (partidos.error) {
    throw partidos.error;
  }

  if (partidos.data.length === 0) {
    return { partidos: [], eventos: [] };
  }

  const eventos = await supabase
    .from('match_events')
    .select(COLUMNAS_EVENTO)
    .eq('created_by', userId)
    .in(
      'match_id',
      partidos.data.map((partido) => partido.id),
    );

  if (eventos.error) {
    throw eventos.error;
  }

  const conEventos = [...new Set(eventos.data.map((evento) => evento.match_id))];

  if (conEventos.length === 0) {
    return { partidos: [], eventos: [] };
  }

  // DE `players` SOLO SE LEE `nickname`.
  const convocatoria = await supabase
    .from('match_squad')
    .select('match_id, player_id, shirt_number, call_status, players(nickname)')
    .in('match_id', conEventos);

  if (convocatoria.error) {
    throw convocatoria.error;
  }

  return {
    partidos: partidos.data
      .filter((partido) => conEventos.includes(partido.id))
      .map((partido) => ({
        id: partido.id,
        opponentName: partido.rival === null ? '—' : partido.rival.name,
        kickoffAt: partido.kickoff_at,
        status: partido.status,
        periodos: partido.competicion.periods_count,
        minutosDeParte: partido.competicion.period_minutes,
        convocatoria: convocatoria.data
          .filter((linea) => linea.match_id === partido.id)
          .map((linea) => ({
            playerId: linea.player_id,
            nickname: linea.players === null ? '—' : linea.players.nickname,
            shirtNumber: linea.shirt_number,
            convocado: linea.call_status !== 'not_called',
          })),
      })),
    // `desdeFilas` devuelve un evento por fila, en el mismo orden.
    eventos: desdeFilas(eventos.data).map((evento, indice) => {
      const origen = eventos.data[indice];

      return { ...evento, id: origen.id, partidoId: origen.match_id };
    }),
  };
}

/** Lanza `SIN_FILAS` si la base no tocó ninguna fila. */
function exigirFila(respuesta: { data: { id: string } | null; error: unknown }): void {
  if (respuesta.error !== null) {
    throw respuesta.error;
  }

  if (respuesta.data === null) {
    throw new Error(SIN_FILAS);
  }
}

/** Cambia de quién es el evento: escribe `player_id`, y nada más. */
export async function cambiarJugador({
  id,
  partidoId,
  jugador,
}: {
  id: string;
  partidoId: string;
  jugador: string;
}): Promise<void> {
  exigirFila(
    await supabase
      .from('match_events')
      .update({ player_id: jugador })
      .eq('id', id)
      .eq('match_id', partidoId)
      .select('id')
      .maybeSingle(),
  );
}

/**
 * Cambia el segundo jugador —quien asiste en un gol, quien entra en un
 * cambio—: escribe `secondary_player_id`, y nada más. `null` es «Sin
 * asistencia».
 */
export async function cambiarSegundo({
  id,
  partidoId,
  segundo,
}: {
  id: string;
  partidoId: string;
  segundo: string | null;
}): Promise<void> {
  exigirFila(
    await supabase
      .from('match_events')
      .update({ secondary_player_id: segundo })
      .eq('id', id)
      .eq('match_id', partidoId)
      .select('id')
      .maybeSingle(),
  );
}

/**
 * Borra el evento. ES UN `delete` DE VERDAD, no un descarte: la fila
 * desaparece y no se recupera desde la aplicación. Queda en `audit_log`.
 */
export async function borrarEvento({
  id,
  partidoId,
}: {
  id: string;
  partidoId: string;
}): Promise<void> {
  exigirFila(
    await supabase
      .from('match_events')
      .delete()
      .eq('id', id)
      .eq('match_id', partidoId)
      .select('id')
      .maybeSingle(),
  );
}
