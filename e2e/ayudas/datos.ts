// Los datos de prueba, por su nombre (T-236).
//
// Los pone `e2e/siembra.sql`, con identificadores fijos. Si cambias uno allí,
// cámbialo aquí. Partidos no hay ninguno sembrado: cada prueba crea el suyo
// con `crearPartido` y lo borra al terminar con `borrarPartido`.

import { clienteDeServicio } from './clientes';
import { sesionDe } from './personas';

import type { Database } from '../../src/types/database.types';

export const CLUB = { id: 'e2e00000-0000-4000-8000-000000000001', nombre: 'Club de pruebas' };
export const TEMPORADA = { id: 'e2e00000-0000-4000-8000-000000000002' };
export const EQUIPO = { id: 'e2e00000-0000-4000-8000-000000000003', nombre: 'Equipo de pruebas' };
export const RIVAL = { id: 'e2e00000-0000-4000-8000-000000000004', nombre: 'Rival de pruebas' };
export const LIGA = { id: 'e2e00000-0000-4000-8000-000000000005', nombre: 'Liga de pruebas' };

/** «Jugador 1» a «Jugador 14». El 1 es el portero. */
export const JUGADORES = 14;

/** El identificador de «Jugador n», de 1 a 14. */
export function jugador(numero: number): string {
  return `e2e00000-0000-4000-8000-0000000001${String(numero).padStart(2, '0')}`;
}

type EstadoDePartido = Database['public']['Enums']['match_status'];

interface PartidoNuevo {
  /** Por defecto, `scheduled`: recién programado, sin convocar. */
  estado?: EstadoDePartido;
  /** Cuándo se juega. Por defecto, mañana a esta hora. */
  cuando?: Date;
  enCasa?: boolean;
}

const UN_DIA = 24 * 60 * 60 * 1000;

/**
 * Crea un partido contra el rival de pruebas, en la liga de pruebas, y
 * devuelve su identificador. Va con la clave de servicio: es preparar datos,
 * no probar quién puede programar. Para probar el alta, se usa la pantalla.
 * Queda a nombre del entrenador (`created_by`).
 */
export async function crearPartido({
  estado = 'scheduled',
  cuando = new Date(Date.now() + UN_DIA),
  enCasa = true,
}: PartidoNuevo = {}): Promise<string> {
  const { data, error } = await clienteDeServicio()
    .from('matches')
    .insert({
      club_id: CLUB.id,
      season_id: TEMPORADA.id,
      competition_id: LIGA.id,
      team_id: EQUIPO.id,
      opponent_team_id: RIVAL.id,
      kickoff_at: cuando.toISOString(),
      is_home: enCasa,
      status: estado,
      // Trazabilidad, también en los datos de prueba: lo programa el entrenador.
      created_by: sesionDe('entrenador').userId,
    })
    .select('id')
    .single();

  if (error !== null) {
    throw new Error(`No se pudo crear el partido de prueba: ${error.message}`);
  }

  return data.id;
}

/** Borra un partido y, con él, todo lo que cuelga: eventos, partes y convocatoria. */
export async function borrarPartido(id: string): Promise<void> {
  const { error } = await clienteDeServicio().from('matches').delete().eq('id', id);

  if (error !== null) {
    throw new Error(`No se pudo borrar el partido de prueba: ${error.message}`);
  }
}
