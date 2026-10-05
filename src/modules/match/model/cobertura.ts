// La cobertura declarada: lógica pura (DOC 04 §10.2, D06-37, T-209a).
//
// Cada anotador dice qué sigue —todo el equipo, un jugador o solo goles y
// tarjetas— y desde cuándo. De ahí sale el índice de fiabilidad (DOC 04
// §10.3): sin declaraciones, toda métrica sale «Sin cobertura declarada».
//
// VA APARTE DEL REDUCTOR. No es estado del partido sino de quien anota en
// este aparato: dos móviles en el mismo partido tienen el mismo partido y
// coberturas distintas. Vive en la instantánea bajo su propia clave, fuera de
// `estado`, y viaja por la cola como los eventos: el directo funciona sin red.
//
// DECLARAR NO BLOQUEA (reparto blando, DOC 04 §10.2). Quien sigue a un
// jugador puede apuntar un gol de otro, y cuenta igual: nada de aquí entra en
// la validación de un evento.
//
// LA HORA Y LOS IDENTIFICADORES ENTRAN COMO ARGUMENTO, igual que en el
// reductor: así se prueba entero.

import { segundosDeParte } from './reloj';

import type { EstadoDirecto } from './directo';
import type { TablesInsert, TablesUpdate } from '@app-types/database.types';
import type { TipoDeEvento } from '@modules/rules';
import type { EntradaDeTrabajo } from '@modules/sync';

/** Lo que se ofrece. `custom` existe en la base y no se ofrece (T-209a). */
export type Alcance = 'full_team' | 'single_player' | 'goals_cards';

export const ALCANCES: readonly Alcance[] = ['full_team', 'single_player', 'goals_cards'];

/** Un momento del partido: la parte y los segundos dentro de ella. */
export interface Instante {
  periodo: number;
  segundos: number;
}

/** La declaración en curso de este aparato, como se guarda en la instantánea. */
export interface CoberturaLocal {
  /** El `id` de `coverage_declarations`. Lo genera el aparato. */
  id: string;
  /**
   * De quién es (T-221). El aparato puede cambiar de cuenta con una abierta:
   * la de otra persona no se toma por propia ni se cierra desde aquí. Las
   * guardadas antes de la T-221 no lo traen, y se dan por propias.
   */
  userId?: string;
  alcance: Alcance;
  /** Solo con `single_player`. */
  jugador: string | null;
  tipos: TipoDeEvento[];
  desde: Instante;
  /** `false` cuando este aparato ya ha encolado su cierre. */
  abierta: boolean;
}

/** Lo que cubre «solo goles y tarjetas» (DOC 04 §10.2), antes de cruzarlo. */
const GOLES_Y_TARJETAS: readonly TipoDeEvento[] = [
  'goal',
  'own_goal',
  'yellow_card',
  'second_yellow',
  'red_card',
];

/**
 * En qué momento del partido se está, para abrir o cerrar una cobertura.
 *
 * - Sin partes empezadas: el principio, parte 1 y segundo 0.
 * - En juego o en pausa: la parte en curso y lo que marca el reloj.
 * - En el descanso: el principio de la parte siguiente.
 * - Con todas las partes jugadas, o el partido finalizado: el final de la
 *   última. Una parte más no existe, y es donde `review` termina las que se
 *   quedan abiertas (C-03).
 */
export function instanteActual(
  estado: Pick<EstadoDirecto, 'fase' | 'partes' | 'periodos'>,
  ahora: number,
): Instante {
  const ultima = estado.partes[estado.partes.length - 1];

  if (ultima === undefined) {
    return { periodo: 1, segundos: 0 };
  }

  if (ultima.segundosReales === null) {
    return { periodo: ultima.numero, segundos: segundosDeParte(ultima, ahora) };
  }

  if (estado.fase === 'finalizado' || estado.partes.length >= estado.periodos) {
    return { periodo: ultima.numero, segundos: ultima.segundosReales };
  }

  return { periodo: ultima.numero + 1, segundos: 0 };
}

/** Los tipos de evento que cubre un alcance, de entre los activos de la competición. */
export function tiposDe(alcance: Alcance, tiposActivos: readonly TipoDeEvento[]): TipoDeEvento[] {
  if (alcance === 'goals_cards') {
    return tiposActivos.filter((tipo) => GOLES_Y_TARJETAS.includes(tipo));
  }

  return [...tiposActivos];
}

/**
 * Los alcances que se pueden elegir. Uno que se queda sin tipos no se ofrece:
 * la base no admite una cobertura que no cubre nada (`coverage_types`).
 */
export function alcancesOfrecidos(tiposActivos: readonly TipoDeEvento[]): Alcance[] {
  return ALCANCES.filter((alcance) => tiposDe(alcance, tiposActivos).length > 0);
}

export interface Declaracion {
  /** El `id` de la fila nueva: `crypto.randomUUID()` en la pantalla. */
  id: string;
  partidoId: string;
  /** Quien anota. La base solo deja insertar la propia (RLS). */
  userId: string;
  alcance: Alcance;
  jugador: string | null;
  tiposActivos: readonly TipoDeEvento[];
  desde: Instante;
  /** Partido en diferido: una sola, de todo el equipo y desde el principio. */
  diferido: boolean;
}

export interface CambioDeCobertura {
  cobertura: CoberturaLocal;
  trabajo: EntradaDeTrabajo;
}

/**
 * La cobertura nueva y su alta para la cola. `null` si no hay nada que
 * declarar: un jugador sin jugador, o un alcance sin tipos.
 *
 * En diferido no se elige (DOC 04 §10.6): todo el equipo, desde el minuto 0
 * y marcada como de origen diferido, pida lo que pida quien llama.
 */
export function declarar(datos: Declaracion): CambioDeCobertura | null {
  const alcance = datos.diferido ? 'full_team' : datos.alcance;
  const jugador = alcance === 'single_player' ? datos.jugador : null;
  const tipos = tiposDe(alcance, datos.tiposActivos);

  if (tipos.length === 0 || (alcance === 'single_player' && jugador === null)) {
    return null;
  }

  const desde = datos.diferido ? { periodo: 1, segundos: 0 } : datos.desde;
  const fila: TablesInsert<'coverage_declarations'> = {
    id: datos.id,
    match_id: datos.partidoId,
    user_id: datos.userId,
    scope: alcance,
    target_player_id: jugador,
    covered_event_types: tipos,
    start_period: desde.periodo,
    start_seconds: desde.segundos,
    is_retroactive: datos.diferido,
  };

  return {
    cobertura: {
      id: datos.id,
      userId: datos.userId,
      alcance,
      jugador,
      tipos,
      desde,
      abierta: true,
    },
    trabajo: {
      entity: 'coverage',
      op: 'insert',
      matchId: datos.partidoId,
      payload: { valores: fila },
    },
  };
}

/** La cobertura cerrada y su `update` para la cola, con el `id` de clave. */
export function cerrar(
  partidoId: string,
  cobertura: CoberturaLocal,
  hasta: Instante,
): CambioDeCobertura {
  const valores: TablesUpdate<'coverage_declarations'> = {
    end_period: hasta.periodo,
    end_seconds: hasta.segundos,
  };

  return {
    cobertura: { ...cobertura, abierta: false },
    trabajo: {
      entity: 'coverage',
      op: 'update',
      matchId: partidoId,
      payload: { valores, clave: { id: cobertura.id } },
    },
  };
}

/** Lo que se sigue, en palabras, para la línea «Sigues: …» del directo. */
export function describirCobertura(
  cobertura: Pick<CoberturaLocal, 'alcance' | 'jugador'> | null,
  nombre: (jugadorId: string) => string,
): string {
  if (cobertura === null) {
    return 'sin declarar';
  }

  switch (cobertura.alcance) {
    case 'full_team':
      return 'todo el equipo';
    case 'single_player':
      return cobertura.jugador === null ? 'un jugador' : nombre(cobertura.jugador);
    case 'goals_cards':
      return 'solo goles y tarjetas';
  }
}
