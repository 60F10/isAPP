// Acceso a datos del cierre del partido (T-210a, DOC 04 §8.4, DOC 05 §12.4).
//
// La A13 se usa después del partido y en línea: lee de Supabase con la caché
// de consultas, no de la precarga. Cerrar son varios pasos contra la base, en
// este orden:
//
//   1. Contar los eventos pendientes otra vez. La pantalla ya los contó,
//      pero entre medias ha podido llegar uno (C-01).
//   2. En diferido, crear las partes que falten con la duración prevista
//      (DOC 04 §5.4). Sin partes, el recálculo no da minutos a nadie.
//   3. Recalcular los tramos con `rebuild_match_stints` (C-04).
//   4. Dar por terminadas las coberturas abiertas en el final del partido
//      (C-03). Hasta la T-209 no hay ninguna.
//   5. Pasar el partido a `closed` con el acta, quién y cuándo. Lo vigila
//      `enforce_match_changes`, que pide `match.close`.
//
// SIN TRANSACCIÓN. Si falla a medias, lo hecho no estorba: los tramos se
// pueden recalcular cuantas veces se quiera, las partes creadas son las que
// el partido necesitaba y el partido sigue sin cerrar. Una función de la base
// que lo hiciera todo de una vez pide migración (DOC 13).

import { desdeFilas } from '@modules/match';
import { SIN_FILAS } from '@shared/lib/guardado';
import { supabase } from '@shared/lib/supabase';

import { admiteCierre, estadoAlReabrir } from '../model/cierre';

import type { DatosDelCierre, EstadoDelPartido, OrigenDeGol, Resultado } from '../model/cierre';
import type { TablesInsert } from '@app-types/database.types';

/** Han llegado eventos pendientes entre que se pintó la pantalla y se pulsó «Cerrar». */
export const CON_PENDIENTES = 'CON_PENDIENTES';

/** El partido ya no está en el estado que se vio: otro lo cerró, lo reabrió o lo cambió. */
export const PARTIDO_CAMBIADO = 'PARTIDO_CAMBIADO';

const COLUMNAS_PARTIDO =
  'id, team_id, is_home, kickoff_at, status, is_retroactive, suspended_period, suspended_seconds, confirmed_goals_for, confirmed_goals_against, closed_at, rival:teams!matches_opponent_team_id_fkey(name), competicion:competitions(name, periods_count, period_minutes)';

const COLUMNAS_EVENTO =
  'client_event_id, event_type, period, seconds, is_opponent, player_id, secondary_player_id, details, status';

/** Estados desde los que se cierra. En diferido se comprueba además `is_retroactive`. */
const DESDE_DIFERIDO: EstadoDelPartido[] = ['finished', 'suspended', 'called', 'live'];
const DESDE: EstadoDelPartido[] = ['finished', 'suspended'];

/** Todo lo que pinta la A13, o `null` si el partido no existe o la RLS no deja leerlo. */
export async function fetchCierre(partidoId: string): Promise<DatosDelCierre | null> {
  const [partido, marcador, eventos, convocatoria, partes] = await Promise.all([
    supabase.from('matches').select(COLUMNAS_PARTIDO).eq('id', partidoId).maybeSingle(),
    supabase
      .from('v_match_scores')
      .select('goals_for, goals_against')
      .eq('match_id', partidoId)
      .maybeSingle(),
    supabase.from('match_events').select(COLUMNAS_EVENTO).eq('match_id', partidoId),
    // DE `players` SOLO SE LEE `nickname`.
    supabase
      .from('match_squad')
      .select('player_id, shirt_number, players(nickname)')
      .eq('match_id', partidoId),
    supabase.from('match_periods').select('period_number').eq('match_id', partidoId),
  ]);

  for (const respuesta of [partido, marcador, eventos, convocatoria, partes]) {
    if (respuesta.error) {
      throw respuesta.error;
    }
  }

  const fila = partido.data;

  if (fila === null || fila.competicion === null) {
    return null;
  }

  return {
    partido: {
      id: fila.id,
      teamId: fila.team_id,
      opponentName: fila.rival === null ? '—' : fila.rival.name,
      competitionName: fila.competicion.name,
      isHome: fila.is_home,
      kickoffAt: fila.kickoff_at,
      status: fila.status,
      isRetroactive: fila.is_retroactive,
      periodos: fila.competicion.periods_count,
      minutosDeParte: fila.competicion.period_minutes,
      suspendidoEnParte: fila.suspended_period,
      suspendidoEnSegundo: fila.suspended_seconds,
      actaAFavor: fila.confirmed_goals_for,
      actaEnContra: fila.confirmed_goals_against,
      cerradoEn: fila.closed_at,
    },
    convocatoria: (convocatoria.data ?? []).map((linea) => ({
      playerId: linea.player_id,
      nickname: linea.players === null ? '—' : linea.players.nickname,
      shirtNumber: linea.shirt_number,
    })),
    eventos: desdeFilas(eventos.data ?? []),
    partes: (partes.data ?? []).map((parte) => parte.period_number),
    calculado: {
      aFavor: marcador.data?.goals_for ?? 0,
      enContra: marcador.data?.goals_against ?? 0,
    },
  };
}

/** Cuántas sustituciones repetidas descartó el recálculo (DOC 04 §6.3). */
function descartadosDe(respuesta: unknown): number {
  if (typeof respuesta === 'object' && respuesta !== null && 'skipped' in respuesta) {
    const { skipped } = respuesta;

    return Array.isArray(skipped) ? skipped.length : 0;
  }

  return 0;
}

export interface Cierre {
  partido: Pick<
    DatosDelCierre['partido'],
    'id' | 'status' | 'isRetroactive' | 'periodos' | 'minutosDeParte'
  >;
  acta: Resultado;
  userId: string;
}

/**
 * Cierra el partido (pasos arriba). Lanza `CON_PENDIENTES` si hay eventos por
 * revisar y `PARTIDO_CAMBIADO` si el partido ya no admite cierre.
 *
 * @returns cuántas sustituciones repetidas no cuentan en los minutos.
 */
export async function cerrarPartido({ partido, acta, userId }: Cierre): Promise<number> {
  if (!admiteCierre(partido)) {
    throw new Error(PARTIDO_CAMBIADO);
  }

  const pendientes = await supabase
    .from('match_events')
    .select('id', { count: 'exact', head: true })
    .eq('match_id', partido.id)
    .eq('status', 'pending');

  if (pendientes.error) {
    throw pendientes.error;
  }

  if ((pendientes.count ?? 0) > 0) {
    throw new Error(CON_PENDIENTES);
  }

  const partes = await supabase
    .from('match_periods')
    .select('period_number, planned_seconds, actual_seconds')
    .eq('match_id', partido.id);

  if (partes.error) {
    throw partes.error;
  }

  const duraciones = new Map(
    partes.data.map((parte) => [
      parte.period_number,
      parte.actual_seconds ?? parte.planned_seconds,
    ]),
  );

  if (partido.isRetroactive) {
    const prevista = partido.minutosDeParte * 60;
    const faltan: TablesInsert<'match_periods'>[] = [];

    for (let numero = 1; numero <= partido.periodos; numero += 1) {
      if (!duraciones.has(numero)) {
        faltan.push({
          match_id: partido.id,
          period_number: numero,
          planned_seconds: prevista,
          actual_seconds: prevista,
        });
        duraciones.set(numero, prevista);
      }
    }

    if (faltan.length > 0) {
      const creadas = await supabase
        .from('match_periods')
        .upsert(faltan, { onConflict: 'match_id,period_number', ignoreDuplicates: true });

      if (creadas.error) {
        throw creadas.error;
      }
    }
  }

  const tramos = await supabase.rpc('rebuild_match_stints', { p_match_id: partido.id });

  if (tramos.error) {
    throw tramos.error;
  }

  const ultima = Math.max(0, ...duraciones.keys());

  if (ultima > 0) {
    const coberturas = await supabase
      .from('coverage_declarations')
      .update({ end_period: ultima, end_seconds: duraciones.get(ultima) ?? 0 })
      .eq('match_id', partido.id)
      .is('end_period', null);

    if (coberturas.error) {
      throw coberturas.error;
    }
  }

  const cerrado = await supabase
    .from('matches')
    .update({
      status: 'closed',
      confirmed_goals_for: acta.aFavor,
      confirmed_goals_against: acta.enContra,
      closed_at: new Date().toISOString(),
      closed_by: userId,
    })
    .eq('id', partido.id)
    .in('status', partido.isRetroactive ? DESDE_DIFERIDO : DESDE)
    .select('id')
    .maybeSingle();

  if (cerrado.error) {
    throw cerrado.error;
  }

  if (cerrado.data === null) {
    throw new Error(PARTIDO_CAMBIADO);
  }

  return descartadosDe(tramos.data);
}

/**
 * Reabre un partido cerrado (C-05): vuelve al estado de antes de cerrarlo
 * (`estadoAlReabrir`) y deja de contar en las estadísticas. El acta se
 * conserva. El disparador `matches_audit` apunta quién y cuándo en `audit_log`;
 * `enforce_match_changes` pide `match.close`.
 */
export async function reabrirPartido(
  partido: Pick<DatosDelCierre['partido'], 'id' | 'suspendidoEnParte' | 'suspendidoEnSegundo'>,
): Promise<void> {
  const { data, error } = await supabase
    .from('matches')
    .update({ status: estadoAlReabrir(partido), closed_at: null, closed_by: null })
    .eq('id', partido.id)
    .eq('status', 'closed')
    .select('id')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error(PARTIDO_CAMBIADO);
  }
}

/**
 * Pone el origen a un gol (DOC 04 §7.5): «se puede rellenar al cerrar». Va
 * directo a la base y no por la cola: la A13 se usa en línea. Conserva el
 * resto de `details`. La RLS pide `event.approve` para tocar un evento
 * aprobado; sin él, cero filas y `SIN_FILAS`.
 */
export async function guardarOrigen(
  clientEventId: string,
  detalles: Readonly<Record<string, string>>,
  origen: OrigenDeGol,
): Promise<void> {
  const { data, error } = await supabase
    .from('match_events')
    .update({ details: { ...detalles, origen } })
    .eq('client_event_id', clientEventId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error(SIN_FILAS);
  }
}
