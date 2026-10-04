// Mis aportaciones, lógica pura (T-211, pantalla A14).
//
// Lo que ha apuntado uno mismo en los partidos de su equipo: cómo se agrupa,
// qué se le puede hacer a cada evento y a quién se puede poner en él. La
// pantalla pinta lo que esto decide; `api/aportaciones.ts` escribe en la base,
// que es la que manda: el autor cambia y borra lo suyo mientras está
// pendiente, y con `event.approve`, en cualquier estado (DOC 05).
//
// UN PARTIDO CERRADO NO SE TOCA. Sus tramos ya están calculados y cuenta en
// las estadísticas: para corregirlo hay que reabrirlo desde su cierre (A13).
//
// Los tipos del directo entran solo como tipos: un `model/` no importa
// barriles en tiempo de ejecución (D06-33).

import type { EstadoDelPartido, LineaDelCierre } from './cierre';
import type { EventoDelDirecto } from '@modules/match';

/** Una línea de `match_squad`: del jugador, solo dorsal y apodo. */
export interface Convocado extends LineaDelCierre {
  /** Titular o suplente. Al no convocado no se le puede poner un evento (R-06). */
  convocado: boolean;
}

export interface PartidoConAportaciones {
  id: string;
  opponentName: string;
  kickoffAt: string;
  status: EstadoDelPartido;
  periodos: number;
  minutosDeParte: number;
  convocatoria: Convocado[];
}

/** Un evento apuntado por quien mira la pantalla. */
export interface Aportacion extends EventoDelDirecto {
  /** El `id` de la fila: los `update` y el `delete` van por él. */
  id: string;
  partidoId: string;
}

export interface DatosDeAportaciones {
  /** Los partidos del equipo y la temporada, con o sin eventos propios. */
  partidos: PartidoConAportaciones[];
  eventos: Aportacion[];
}

export interface GrupoDeAportaciones {
  partido: PartidoConAportaciones;
  eventos: Aportacion[];
}

/**
 * Los eventos, por partido: el más reciente primero y, dentro, en orden de
 * parte y segundo. El que no tiene segundos va al final de su parte. Un
 * partido en el que no se apuntó nada no sale.
 */
export function agruparPorPartido(
  partidos: readonly PartidoConAportaciones[],
  eventos: readonly Aportacion[],
): GrupoDeAportaciones[] {
  const porPartido = new Map<string, Aportacion[]>();

  for (const evento of eventos) {
    const lista = porPartido.get(evento.partidoId);

    if (lista === undefined) {
      porPartido.set(evento.partidoId, [evento]);
    } else {
      lista.push(evento);
    }
  }

  const grupos: GrupoDeAportaciones[] = [];

  for (const partido of partidos) {
    const suyos = porPartido.get(partido.id);

    if (suyos !== undefined) {
      grupos.push({
        partido,
        eventos: suyos.sort(
          (a, b) =>
            a.periodo - b.periodo ||
            (a.segundos ?? Number.MAX_SAFE_INTEGER) - (b.segundos ?? Number.MAX_SAFE_INTEGER),
        ),
      });
    }
  }

  return grupos.sort(
    (a, b) => new Date(b.partido.kickoffAt).getTime() - new Date(a.partido.kickoffAt).getTime(),
  );
}

export type AccionDeAportacion = 'minuto' | 'jugador' | 'asistencia' | 'entra' | 'borrar';

/**
 * Lo que se le puede hacer a un evento propio. En un partido cerrado, nada.
 * Sin cerrar: si está pendiente, siempre; ya revisado, solo con
 * `event.approve`, que es lo que deja la RLS.
 *
 * Del rival solo se cambia el minuto y se borra: no lleva jugador (decisión
 * B3). «Jugador» sale si el evento lo lleva: a un córner a favor no se le
 * pone uno. «Asistencia», en los goles propios; «Entra», en los cambios.
 */
export function accionesDe(
  evento: Pick<Aportacion, 'tipo' | 'estado' | 'rival' | 'jugador'>,
  partido: Pick<PartidoConAportaciones, 'status'>,
  puedeAprobar: boolean,
): AccionDeAportacion[] {
  if (partido.status === 'closed') {
    return [];
  }

  if (evento.estado !== 'pending' && !puedeAprobar) {
    return [];
  }

  if (evento.rival) {
    return ['minuto', 'borrar'];
  }

  const acciones: AccionDeAportacion[] = ['minuto'];

  if (evento.jugador !== null) {
    acciones.push('jugador');
  }

  if (evento.tipo === 'goal') {
    acciones.push('asistencia');
  }

  if (evento.tipo === 'substitution') {
    acciones.push('entra');
  }

  acciones.push('borrar');

  return acciones;
}

/** Cuál de los dos jugadores del evento se cambia: `player_id` o `secondary_player_id`. */
export type CampoDeJugador = 'jugador' | 'segundo';

/**
 * A quién se puede poner en un campo del evento: los convocados del partido,
 * sin el otro jugador del evento —nadie se asiste a sí mismo ni se cambia por
 * sí mismo—, por dorsal. El que ya está puesto sí sale: la pantalla lo marca.
 */
export function candidatos(
  convocatoria: readonly Convocado[],
  evento: Pick<Aportacion, 'jugador' | 'segundo'>,
  campo: CampoDeJugador,
): Convocado[] {
  const otro = campo === 'jugador' ? evento.segundo : evento.jugador;

  return convocatoria
    .filter((linea) => linea.convocado && linea.playerId !== otro)
    .sort(
      (a, b) =>
        (a.shirtNumber ?? Number.MAX_SAFE_INTEGER) - (b.shirtNumber ?? Number.MAX_SAFE_INTEGER) ||
        a.nickname.localeCompare(b.nickname, 'es'),
    );
}
