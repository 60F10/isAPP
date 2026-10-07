// Acceso a datos de la plantilla (D06-07, T-202).
//
// Dos tablas: `players` (el jugador, del club) y `squad_memberships` (su
// inscripción en un equipo y una temporada, con dorsal, posición y
// disponibilidad). DOC 05 §6.
//
// DE `players` SOLO SE LEE Y SE ESCRIBE `nickname`. Las columnas del nombre
// real y su consentimiento no aparecen en ninguna consulta de este archivo: ni
// en los `select`, ni en los `insert`, ni en los `update`. Así, aunque alguien
// las rellenara a mano en la base, la aplicación no las pasearía.
//
// Mismo cuidado que en `clubYEquipos.ts`: las actualizaciones piden la fila de
// vuelta y lanzan `SIN_FILAS` si la RLS no deja tocarla.

import { supabase } from '@shared/lib/supabase';

import { SIN_FILAS } from '../model/clubYEquipos';

import type { Disponibilidad, Inscripcion, LecturaDePlantilla, Posicion } from '../model/plantilla';

const COLUMNAS_INSCRIPCION =
  'id, player_id, shirt_number, default_position, availability, players(nickname)';

interface FilaInscripcion {
  id: string;
  player_id: string;
  shirt_number: number | null;
  default_position: Posicion | null;
  availability: Disponibilidad;
  players: { nickname: string } | null;
}

function aInscripcion(fila: FilaInscripcion): Inscripcion {
  return {
    id: fila.id,
    playerId: fila.player_id,
    // Sin jugador legible no debería llegar ninguna fila: quien lee la
    // inscripción lee el club. Si llega, se enseña sin apodo en vez de romper.
    nickname: fila.players === null ? '—' : fila.players.nickname,
    shirtNumber: fila.shirt_number,
    defaultPosition: fila.default_position,
    availability: fila.availability,
  };
}

/** Plantilla activa del equipo en la temporada: las inscripciones sin baja. */
export async function fetchPlantilla(
  equipoId: string,
  temporadaId: string,
): Promise<Inscripcion[]> {
  const { data, error } = await supabase
    .from('squad_memberships')
    .select(COLUMNAS_INSCRIPCION)
    .eq('team_id', equipoId)
    .eq('season_id', temporadaId)
    .is('left_on', null);

  if (error) {
    throw error;
  }

  return data.map(aInscripcion);
}

/**
 * La plantilla para quien solo la lee (T-304, «Mi equipo»): apodo, dorsal y
 * posición. No pide `availability`, que esta pantalla no enseña.
 */
export async function fetchPlantillaDeLectura(
  equipoId: string,
  temporadaId: string,
): Promise<LecturaDePlantilla[]> {
  const { data, error } = await supabase
    .from('squad_memberships')
    .select('player_id, shirt_number, default_position, players(nickname)')
    .eq('team_id', equipoId)
    .eq('season_id', temporadaId)
    .is('left_on', null);

  if (error) {
    throw error;
  }

  return data.map((fila) => ({
    playerId: fila.player_id,
    nickname: fila.players === null ? '—' : fila.players.nickname,
    shirtNumber: fila.shirt_number,
    defaultPosition: fila.default_position,
  }));
}

/** Las bajas del equipo en la temporada: inscripciones con `left_on` (PR #51). */
export async function fetchBajas(equipoId: string, temporadaId: string): Promise<Inscripcion[]> {
  const { data, error } = await supabase
    .from('squad_memberships')
    .select(COLUMNAS_INSCRIPCION)
    .eq('team_id', equipoId)
    .eq('season_id', temporadaId)
    .not('left_on', 'is', null);

  if (error) {
    throw error;
  }

  return data.map(aInscripcion);
}

/**
 * Los jugadores del club sin ninguna inscripción en este equipo y temporada:
 * los que se pueden inscribir sin crear un jugador nuevo (PR #51).
 * Quien ya tiene fila, aunque sea de baja, no sale aquí: se reincorpora.
 *
 * Solo `id` y `nickname` de `players`, como en el resto del archivo.
 */
export async function fetchDelClubSinInscribir(
  clubId: string,
  equipoId: string,
  temporadaId: string,
): Promise<{ playerId: string; nickname: string }[]> {
  const [jugadores, inscritos] = await Promise.all([
    supabase.from('players').select('id, nickname').eq('club_id', clubId).eq('is_active', true),
    supabase
      .from('squad_memberships')
      .select('player_id')
      .eq('team_id', equipoId)
      .eq('season_id', temporadaId),
  ]);

  if (jugadores.error) {
    throw jugadores.error;
  }

  if (inscritos.error) {
    throw inscritos.error;
  }

  const yaEstan = new Set(inscritos.data.map((fila) => fila.player_id));

  return jugadores.data
    .filter((jugador) => !yaEstan.has(jugador.id))
    .map((jugador) => ({ playerId: jugador.id, nickname: jugador.nickname }))
    .sort((a, b) => a.nickname.localeCompare(b.nickname, 'es'));
}

/** Inscribe en el equipo a un jugador que ya es del club, sin dorsal ni posición. */
export async function inscribirDelClub(
  destino: { equipoId: string; temporadaId: string; userId: string },
  jugadorId: string,
): Promise<Inscripcion> {
  const { data, error } = await supabase
    .from('squad_memberships')
    .insert({
      team_id: destino.equipoId,
      season_id: destino.temporadaId,
      player_id: jugadorId,
      created_by: destino.userId,
    })
    .select(COLUMNAS_INSCRIPCION)
    .single();

  if (error) {
    throw error;
  }

  return aInscripcion(data);
}

/** La inscripción activa de un jugador en un equipo y temporada, o `null`. */
export async function fetchInscripcion(
  jugadorId: string,
  equipoId: string,
  temporadaId: string,
): Promise<Inscripcion | null> {
  const { data, error } = await supabase
    .from('squad_memberships')
    .select(COLUMNAS_INSCRIPCION)
    .eq('player_id', jugadorId)
    .eq('team_id', equipoId)
    .eq('season_id', temporadaId)
    .is('left_on', null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data === null ? null : aInscripcion(data);
}

/** El equipo de la ruta: nombre y tipo, para el título y para saber si tiene plantilla. */
export async function fetchEquipoDePlantilla(
  equipoId: string,
): Promise<{ id: string; clubId: string; name: string; kind: 'managed' | 'reference' } | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('id, club_id, name, kind')
    .eq('id', equipoId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data === null
    ? null
    : { id: data.id, clubId: data.club_id, name: data.name, kind: data.kind };
}

/**
 * Da de alta un jugador en el club y lo inscribe en el equipo.
 *
 * Son dos inserciones y PostgREST no las junta en una transacción. Si la
 * segunda falla —un dorsal que otra persona acaba de coger, por ejemplo—, se
 * borra el jugador recién creado para no dejarlo huérfano en el club, y se
 * relanza el error de la inscripción, que es el que explica qué pasó.
 */
export async function crearJugador(
  destino: { clubId: string; equipoId: string; temporadaId: string; userId: string },
  datos: { nickname: string; shirt_number: number | null; default_position: Posicion | null },
): Promise<Inscripcion> {
  const jugador = await supabase
    .from('players')
    .insert({ club_id: destino.clubId, nickname: datos.nickname, created_by: destino.userId })
    .select('id')
    .single();

  if (jugador.error) {
    throw jugador.error;
  }

  const inscripcion = await supabase
    .from('squad_memberships')
    .insert({
      team_id: destino.equipoId,
      season_id: destino.temporadaId,
      player_id: jugador.data.id,
      shirt_number: datos.shirt_number,
      default_position: datos.default_position,
      created_by: destino.userId,
    })
    .select(COLUMNAS_INSCRIPCION)
    .single();

  if (inscripcion.error) {
    // Si esto también falla, queda un jugador sin inscribir en el club: no se
    // ve en ninguna plantilla y no molesta. Lo anota el DOC 13.
    await supabase.from('players').delete().eq('id', jugador.data.id);
    throw inscripcion.error;
  }

  return aInscripcion(inscripcion.data);
}

/** Cambia el apodo. Lanza `SIN_FILAS` si la RLS no lo deja. */
export async function actualizarApodo(jugadorId: string, nickname: string): Promise<void> {
  const { data, error } = await supabase
    .from('players')
    .update({ nickname })
    .eq('id', jugadorId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error(SIN_FILAS);
  }
}

/** Cambia dorsal, posición o disponibilidad. Lanza `SIN_FILAS` si la RLS no lo deja. */
export async function actualizarInscripcion(
  inscripcionId: string,
  cambios: {
    shirt_number?: number | null;
    default_position?: Posicion | null;
    availability?: Disponibilidad;
    left_on?: string | null;
  },
): Promise<void> {
  const { data, error } = await supabase
    .from('squad_memberships')
    .update(cambios)
    .eq('id', inscripcionId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data === null) {
    throw new Error(SIN_FILAS);
  }
}
