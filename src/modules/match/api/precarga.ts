// Precarga del partido a IndexedDB (DOC 06 §8.3, D06-11 y D06-10b, T-206).
//
// Se descarga entero —partido, reglamento, convocatoria, partes y eventos— y
// se guarda en `matchSnapshots` y `matchEvents`. A partir de ahí el directo
// (T-207) lee de local, no de la red.
//
// Se descartó persistir la caché de TanStack Query: guarda lo que le apetece
// según cuándo se visitó cada pantalla, y no garantiza que el partido de las
// 10:00 esté completo en el móvil a las 9:55 sin cobertura. Esto sí, y se
// puede enseñar.
//
// DE `players` SOLO SE LEE `nickname`, por la convocatoria.
//
// DEXIE NO VA EN EL ARRANQUE: este archivo solo se carga desde la ruta de la
// convocatoria, en perezoso. El barril de `match` no lo exporta, porque la
// A12 viaja en el paquete inicial (cabecera de `app/router.tsx`).

import { db } from '@shared/lib/db';
import { supabase } from '@shared/lib/supabase';

import { contarConvocados } from '../model/paquete';

import type {
  EstadoDelPartido,
  Instantanea,
  PaqueteDePartido,
  ResultadoDePrecarga,
} from '../model/paquete';
import type { LineaGuardada, Llamada } from '@modules/lineup';
import type { Reglamento } from '@modules/rules';

const COLUMNAS_PARTIDO =
  'id, team_id, competition_id, is_home, kickoff_at, venue, status, is_retroactive, rival:teams!matches_opponent_team_id_fkey(name), competicion:competitions(periods_count, period_minutes, halftime_minutes, clock_mode, substitution_type, substitutions_max, squad_max, players_on_pitch, yellow_cards_for_ban, red_card_default_bans, enabled_event_types)';

const COLUMNAS_EVENTO =
  'id, client_event_id, match_id, event_type, period, seconds, occurred_at, is_opponent, player_id, secondary_player_id, details, status, created_by, created_at';

/** El partido no existe o la RLS no deja leerlo. */
export const PARTIDO_NO_ENCONTRADO = 'PARTIDO_NO_ENCONTRADO';

interface FilaPartido {
  id: string;
  team_id: string;
  competition_id: string;
  is_home: boolean;
  kickoff_at: string;
  venue: string | null;
  status: EstadoDelPartido;
  is_retroactive: boolean;
  rival: { name: string } | null;
  competicion: Reglamento | null;
}

interface FilaConvocatoria {
  player_id: string;
  call_status: Llamada;
  shirt_number: number | null;
  position: LineaGuardada['position'];
  players: { nickname: string } | null;
}

/** Lo descarga todo en paralelo. Lanza si falta el partido o su reglamento. */
export async function descargarPaquete(partidoId: string): Promise<PaqueteDePartido> {
  const [partido, convocatoria, partes, eventos] = await Promise.all([
    supabase.from('matches').select(COLUMNAS_PARTIDO).eq('id', partidoId).maybeSingle(),
    supabase
      .from('match_squad')
      .select('player_id, call_status, shirt_number, position, players(nickname)')
      .eq('match_id', partidoId),
    supabase
      .from('match_periods')
      .select('period_number, planned_seconds, actual_seconds, started_at, ended_at')
      .eq('match_id', partidoId),
    supabase.from('match_events').select(COLUMNAS_EVENTO).eq('match_id', partidoId),
  ]);

  for (const respuesta of [partido, convocatoria, partes, eventos]) {
    if (respuesta.error) {
      throw respuesta.error;
    }
  }

  const fila: FilaPartido | null = partido.data;

  if (fila === null || fila.competicion === null) {
    throw new Error(PARTIDO_NO_ENCONTRADO);
  }

  const lineas: FilaConvocatoria[] = convocatoria.data ?? [];

  return {
    partido: {
      id: fila.id,
      teamId: fila.team_id,
      competitionId: fila.competition_id,
      opponentName: fila.rival === null ? '—' : fila.rival.name,
      isHome: fila.is_home,
      kickoffAt: fila.kickoff_at,
      venue: fila.venue,
      status: fila.status,
      isRetroactive: fila.is_retroactive,
    },
    reglamento: fila.competicion,
    convocatoria: lineas.map((linea) => ({
      playerId: linea.player_id,
      nickname: linea.players === null ? '—' : linea.players.nickname,
      callStatus: linea.call_status,
      shirtNumber: linea.shirt_number,
      position: linea.position,
    })),
    partes: (partes.data ?? []).map((parte) => ({
      periodNumber: parte.period_number,
      plannedSeconds: parte.planned_seconds,
      actualSeconds: parte.actual_seconds,
      startedAt: parte.started_at,
      endedAt: parte.ended_at,
    })),
    eventos: eventos.data ?? [],
  };
}

/**
 * Guarda el paquete en una sola transacción: o queda entero o no queda nada.
 * Los eventos del servidor entran como enviados; si había uno local con el
 * mismo `client_event_id`, es que llegó, y la copia del servidor manda.
 */
export async function guardarPaquete(paquete: PaqueteDePartido, ahora: number): Promise<void> {
  const instantanea: Instantanea = { paquete, descargadoEn: ahora };

  await db.transaction('rw', db.matchSnapshots, db.matchEvents, async () => {
    await db.matchSnapshots.put({
      matchId: paquete.partido.id,
      updatedAt: ahora,
      datos: instantanea,
    });
    await db.matchEvents.bulkPut(
      paquete.eventos.map((evento) => ({
        clientEventId: String(evento.client_event_id),
        matchId: paquete.partido.id,
        syncState: 'sent' as const,
        period: Number(evento.period),
        fila: evento,
      })),
    );
  });
}

/**
 * Pide que el navegador no borre el almacén (D06-10b): Safari borra lo de
 * los sitios que no se abren en siete días. Se puede denegar, y entonces solo
 * queda avisar. `null` si el navegador no tiene la API.
 */
export async function pedirAlmacenPersistente(): Promise<boolean | null> {
  if (!('storage' in navigator) || typeof navigator.storage.persist !== 'function') {
    return null;
  }

  const persistente = (await navigator.storage.persisted()) || (await navigator.storage.persist());
  await db.meta.put({ key: 'almacenPersistente', value: persistente });

  return persistente;
}

/** Descarga, guarda y pide persistencia. Lanza si no se ha podido guardar. */
export async function precargarPartido(partidoId: string): Promise<ResultadoDePrecarga> {
  const paquete = await descargarPaquete(partidoId);
  const ahora = Date.now();
  await guardarPaquete(paquete, ahora);

  let persistente: boolean | null = null;

  try {
    persistente = await pedirAlmacenPersistente();
  } catch {
    // La precarga ya está guardada. No saber si es persistente no la anula.
  }

  return { descargadoEn: ahora, convocados: contarConvocados(paquete), persistente };
}

/** El partido precargado, o `null` si no lo hay. Para el directo (T-207). */
export async function leerInstantanea(partidoId: string): Promise<Instantanea | null> {
  const guardada = await db.matchSnapshots.get(partidoId);

  return guardada === undefined ? null : (guardada.datos as Instantanea);
}
