// Precarga del partido a IndexedDB (DOC 06 §8.3, D06-11 y D06-10b, T-206).
//
// Se descarga entero —partido, reglamento, convocatoria, partes y eventos— y
// se guarda en `matchSnapshots` y `matchEvents`. A partir de ahí el directo
// (T-207) lee de local, no de la red. Desde la T-209b trae también las
// ventanas de posible repetido, y el directo lo vuelve a descargar cada poco.
//
// Se descartó persistir la caché de TanStack Query: guarda lo que le apetece
// según cuándo se visitó cada pantalla, y no garantiza que el partido de las
// 10:00 esté completo en el móvil a las 9:55 sin cobertura. Esto sí, y se
// puede enseñar.
//
// DE `players` SOLO SE LEE `nickname`, por la convocatoria.
//
// DEXIE NO VA EN EL ARRANQUE: este archivo solo se carga con las rutas de la
// convocatoria y del directo, en perezoso (D06-26).

import { db } from '@shared/lib/db';
import { supabase } from '@shared/lib/supabase';

import { leerVentanas } from '../model/eventos';
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
  'id, team_id, competition_id, is_home, kickoff_at, venue, status, is_retroactive, suspended_period, suspended_seconds, rival:teams!matches_opponent_team_id_fkey(name), competicion:competitions(periods_count, period_minutes, halftime_minutes, clock_mode, substitution_type, substitutions_max, squad_max, players_on_pitch, yellow_cards_for_ban, red_card_default_bans, enabled_event_types)';

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
  suspended_period: number | null;
  suspended_seconds: number | null;
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

/** La fila de `app_settings` con las ventanas de posible repetido (DOC 04 §9.2). */
const CLAVE_DE_VENTANAS = 'duplicate_window_seconds';

/**
 * Lo descarga todo en paralelo. Lanza si falta el partido o su reglamento.
 *
 * Las ventanas de posible repetido van aparte: si no se pueden leer, el
 * paquete sale sin ellas y el directo usa 30 s. No son motivo para quedarse
 * sin partido.
 */
export async function descargarPaquete(partidoId: string): Promise<PaqueteDePartido> {
  const [partido, convocatoria, partes, eventos, ajuste] = await Promise.all([
    supabase.from('matches').select(COLUMNAS_PARTIDO).eq('id', partidoId).maybeSingle(),
    supabase
      .from('match_squad')
      .select('player_id, call_status, shirt_number, position, players(nickname)')
      .eq('match_id', partidoId),
    supabase
      .from('match_periods')
      .select('id, period_number, planned_seconds, actual_seconds, started_at, ended_at')
      .eq('match_id', partidoId),
    // Con orden (T-223): sin él, PostgREST los devuelve como le viene, y tras
    // revisar eventos en el cierre «Últimos eventos» salía desordenado en un
    // aparato que carga el partido por primera vez.
    supabase
      .from('match_events')
      .select(COLUMNAS_EVENTO)
      .eq('match_id', partidoId)
      .order('created_at')
      .order('client_event_id'),
    supabase.from('app_settings').select('value').eq('key', CLAVE_DE_VENTANAS).maybeSingle(),
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
  const ventanas =
    ajuste.error || ajuste.data === null ? undefined : leerVentanas(ajuste.data.value);

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
      // Dónde se suspendió, para el directo (T-226). `null` si no lo está.
      suspendedPeriod: fila.suspended_period,
      suspendedSeconds: fila.suspended_seconds,
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
      id: parte.id,
      periodNumber: parte.period_number,
      plannedSeconds: parte.planned_seconds,
      actualSeconds: parte.actual_seconds,
      startedAt: parte.started_at,
      endedAt: parte.ended_at,
    })),
    eventos: eventos.data ?? [],
    // Las claves que no hay no se escriben: `undefined` no es lo mismo que nada.
    ...(ventanas === undefined ? {} : { ventanas }),
  };
}

/**
 * Guarda el paquete en una sola transacción: o queda entero o no queda nada.
 * Los eventos del servidor entran como enviados; si había uno local con el
 * mismo `client_event_id`, es que llegó, y la copia del servidor manda.
 *
 * Conserva el estado del directo que hubiera guardado este aparato: refrescar
 * la precarga no puede borrar una pausa ni una parte que el servidor aún no
 * conoce. Qué estado manda lo decide `elegirEstado` al abrir el directo.
 *
 * Y conserva la cobertura declarada aquí (T-209a): si un refresco la borrara,
 * al volver a abrir el directo se declararía otra encima de la que sigue
 * abierta en el servidor.
 *
 * UNA DESCARGA QUE LLEGA TARDE NO PISA A OTRA MÁS NUEVA (T-223). Si lo
 * guardado se pidió después que lo que llega, no se escribe nada: con mala
 * cobertura una petición lenta puede acabar detrás de la siguiente. Sin saber
 * cuándo se pidió alguna de las dos, se escribe como siempre.
 *
 * @param pedidoEn cuándo se pidió la descarga (T-209b). Se apunta para saber
 *   desde cuándo mirar la cola al fundir este paquete con lo del aparato.
 */
export async function guardarPaquete(
  paquete: PaqueteDePartido,
  ahora: number,
  pedidoEn?: number,
): Promise<void> {
  await db.transaction('rw', db.matchSnapshots, db.matchEvents, async () => {
    const anterior = await db.matchSnapshots.get(paquete.partido.id);
    const previa = anterior === undefined ? undefined : (anterior.datos as Instantanea);

    if (pedidoEn !== undefined && previa?.pedidoEn !== undefined && previa.pedidoEn > pedidoEn) {
      return;
    }

    // Las claves que no hay no se escriben: `undefined` no es lo mismo que nada.
    const instantanea: Instantanea = {
      paquete,
      descargadoEn: ahora,
      ...(pedidoEn === undefined ? {} : { pedidoEn }),
      ...(previa?.estado === undefined ? {} : { estado: previa.estado }),
      ...(previa?.cobertura === undefined ? {} : { cobertura: previa.cobertura }),
    };

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
  const pedidoEn = Date.now();
  const paquete = await descargarPaquete(partidoId);
  const ahora = Date.now();
  await guardarPaquete(paquete, ahora, pedidoEn);

  let persistente: boolean | null = null;

  try {
    persistente = await pedirAlmacenPersistente();
  } catch {
    // La precarga ya está guardada. No saber si es persistente no la anula.
  }

  return { descargadoEn: ahora, convocados: contarConvocados(paquete), persistente };
}

/**
 * Borra de este aparato la precarga y los eventos locales de un partido. Lo
 * llama el cierre (T-210a) cuando el partido ya está cerrado en el servidor:
 * a partir de ahí, lo bueno es lo del servidor, y si alguien vuelve a abrir
 * el directo, se descarga de nuevo. La cola no se toca aquí: es de `sync`.
 */
export async function olvidarPartido(partidoId: string): Promise<void> {
  await db.transaction('rw', db.matchSnapshots, db.matchEvents, async () => {
    await db.matchSnapshots.delete(partidoId);
    await db.matchEvents.where('matchId').equals(partidoId).delete();
  });
}

/** El partido precargado, o `null` si no lo hay. Para el directo (T-207). */
export async function leerInstantanea(partidoId: string): Promise<Instantanea | null> {
  const guardada = await db.matchSnapshots.get(partidoId);

  return guardada === undefined ? null : (guardada.datos as Instantanea);
}
