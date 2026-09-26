// Registrar y deshacer eventos del directo: lógica pura (T-208, DOC 04 §4.3,
// §5, §7 y §8.3).
//
// Lo llama el reductor de `directo.ts`. Cada evento sale como una fila de
// `match_events` comprobada contra los tipos generados (DOC 13, punto 49), y
// el estado del directo se recalcula con él: quién está en el campo, quién
// puede entrar, quién está amonestado.
//
// EL SEGUNDO LO PONE EL APARATO (DOC 13, punto 55). Con reloj, la parte en
// curso y los segundos por anclaje, pausa descontada; y `occurred_at` al lado,
// por si otro día hace falta cuadrarlo. El servidor solo deriva los segundos
// cuando no llegan, y no conoce la pausa.
//
// EN DIFERIDO, EL MINUTO VA A MANO (DOC 04 §5.4, punto 59): parte y segundos
// escritos, sin `occurred_at`. Si la parte todavía no existe, se crea con su
// duración prevista, que es la que manda cuando no se sabe la real.

import { amonestados, calcularEnCampo, cambiosHechos, expulsados, sustituidos } from './eventos';
import { segundosDeParte } from './reloj';

import type { EstadoDirecto, ParteLocal, Resultado } from './directo';
import type { EventoDelDirecto } from './eventos';
import type { TablesInsert } from '@app-types/database.types';
import type { TipoDeEvento } from '@modules/rules';
import type { EntradaDeTrabajo } from '@modules/sync';

/** Lo que la pantalla ha reunido al terminar el flujo de registro. */
export interface BorradorDeEvento {
  tipo: TipoDeEvento;
  rival: boolean;
  jugador: string | null;
  /** Asistente, o quien entra en un cambio. */
  segundo: string | null;
  detalles: Record<string, string>;
}

export interface AccionRegistrar {
  tipo: 'registrar';
  ahora: number;
  clientEventId: string;
  /** Por si hay que crear la parte en diferido. Si no hace falta, no se usa. */
  parteId: string;
  userId: string;
  /** Quien tiene `event.approve` registra eventos que nacen aprobados (DOC 04 §8.3). */
  aprobado: boolean;
  borrador: BorradorDeEvento;
  /** Solo en diferido: la parte y los segundos escritos a mano. */
  minuto?: { periodo: number; segundos: number };
}

/** Del rival solo se registran goles, córners y tarjetas (DOC 04 §7.2). */
const DEL_RIVAL: readonly TipoDeEvento[] = [
  'goal',
  'own_goal',
  'yellow_card',
  'second_yellow',
  'red_card',
  'corner',
];

const POSICIONES = ['GK', 'DF', 'MF', 'FW'];

/** El estado con otra lista de eventos, y el campo recalculado con ella. */
export function conEventos(estado: EstadoDirecto, eventos: EventoDelDirecto[]): EstadoDirecto {
  return { ...estado, eventos, enCampo: calcularEnCampo(estado.titulares, eventos) };
}

function ilegal(estado: EstadoDirecto, error: string): Resultado {
  return { estado, trabajos: [], error };
}

interface Momento {
  periodo: number;
  segundos: number;
  occurredAt: string | null;
  /** La parte que hay que crear, en diferido. */
  parteNueva: ParteLocal | null;
}

/** Cuándo pasó: de la parte en curso, del descanso o del minuto escrito. */
function momento(estado: EstadoDirecto, accion: AccionRegistrar): Momento | string {
  const cuando = new Date(accion.ahora).toISOString();

  if (estado.diferido) {
    if (accion.minuto === undefined) {
      return 'Escribe el minuto.';
    }

    const { periodo, segundos } = accion.minuto;

    if (periodo < 1 || periodo > estado.periodos) {
      return `Esta competición tiene ${estado.periodos} partes.`;
    }

    const existe = estado.partes.some((parte) => parte.numero === periodo);

    return {
      periodo,
      segundos,
      occurredAt: null,
      parteNueva: existe
        ? null
        : {
            id: accion.parteId,
            numero: periodo,
            inicio: 0,
            pausadoMs: 0,
            pausaDesde: null,
            segundosReales: estado.minutosDeParte * 60,
          },
    };
  }

  const abierta = estado.partes.find((parte) => parte.segundosReales === null);

  if ((estado.fase === 'en_juego' || estado.fase === 'pausado') && abierta !== undefined) {
    return {
      periodo: abierta.numero,
      segundos: segundosDeParte(abierta, accion.ahora),
      occurredAt: cuando,
      parteNueva: null,
    };
  }

  const ultima = estado.partes[estado.partes.length - 1];

  if (estado.fase === 'descanso' && ultima !== undefined) {
    // Un cambio en el descanso se apunta al inicio de la parte siguiente
    // (DOC 04 §5.2). Lo demás, al final de la que acaba de terminar.
    if (accion.borrador.tipo === 'substitution' && estado.partes.length < estado.periodos) {
      return { periodo: ultima.numero + 1, segundos: 0, occurredAt: cuando, parteNueva: null };
    }

    return {
      periodo: ultima.numero,
      segundos: ultima.segundosReales ?? 0,
      occurredAt: cuando,
      parteNueva: null,
    };
  }

  return 'Empieza la 1ª parte antes de apuntar nada.';
}

/**
 * Comprueba el borrador contra el reglamento y lo que sabe el aparato.
 * Devuelve el tipo definitivo —una amarilla a un amonestado es la segunda—,
 * o el motivo del rechazo en palabras. Sin segunda amarilla encendida en la
 * competición, la segunda amarilla se apunta como roja: expulsa igual.
 */
type Validacion = { tipo: TipoDeEvento } | { error: string };

function validar(estado: EstadoDirecto, borrador: BorradorDeEvento): Validacion {
  const { tipo, rival, jugador, segundo, detalles } = borrador;

  if (!estado.tiposActivos.includes(tipo)) {
    return { error: 'Ese tipo de evento está apagado en esta competición.' };
  }

  if (rival) {
    if (!DEL_RIVAL.includes(tipo)) {
      return { error: 'Del rival solo se apuntan goles, córners y tarjetas.' };
    }

    return jugador === null && segundo === null
      ? { tipo }
      : { error: 'Del rival no se apunta jugador.' };
  }

  const enCampo = new Set(estado.enCampo);
  const convocados = new Set(estado.convocados);
  const fuera = expulsados(estado.eventos);

  const enElCampo = (id: string | null) => id !== null && enCampo.has(id);

  switch (tipo) {
    case 'goal':
      if (!enElCampo(jugador)) {
        return { error: 'Ese jugador no está en el campo.' };
      }

      if (segundo !== null && (segundo === jugador || !enCampo.has(segundo))) {
        return { error: 'La asistencia es de otro jugador del campo.' };
      }

      return { tipo };

    case 'own_goal':
    case 'foul_committed':
      return enElCampo(jugador) ? { tipo } : { error: 'Ese jugador no está en el campo.' };

    case 'foul_received':
      return jugador === null || enCampo.has(jugador)
        ? { tipo }
        : { error: 'Ese jugador no está en el campo.' };

    case 'yellow_card':
    case 'second_yellow':
    case 'red_card': {
      if (jugador === null || !convocados.has(jugador)) {
        return { error: 'Ese jugador no está convocado.' };
      }

      if (fuera.has(jugador)) {
        return { error: 'Ese jugador ya está expulsado.' };
      }

      const yaAmonestado = amonestados(estado.eventos).has(jugador);

      if (tipo === 'yellow_card' && yaAmonestado) {
        return {
          tipo: estado.tiposActivos.includes('second_yellow') ? 'second_yellow' : 'red_card',
        };
      }

      if (tipo === 'second_yellow' && !yaAmonestado) {
        return { error: 'Ese jugador no tiene ninguna amarilla.' };
      }

      return { tipo };
    }

    case 'corner':
      return jugador === null ? { tipo } : { error: 'El córner no lleva jugador.' };

    case 'substitution': {
      if (!enElCampo(jugador)) {
        return { error: 'Quien sale tiene que estar en el campo.' };
      }

      if (segundo === null || !convocados.has(segundo) || enCampo.has(segundo)) {
        return { error: 'Quien entra tiene que estar en el banquillo.' };
      }

      if (fuera.has(segundo)) {
        return { error: 'Un jugador expulsado no puede entrar.' };
      }

      if (estado.cambiosFijos && sustituidos(estado.eventos).has(segundo)) {
        return { error: 'Con cambios fijos, quien sale no vuelve a entrar.' };
      }

      if (cambiosHechos(estado.eventos) >= estado.cambiosMax) {
        return { error: `Ya se han hecho los ${estado.cambiosMax} cambios del reglamento.` };
      }

      return { tipo };
    }

    case 'position_change':
      if (!enElCampo(jugador)) {
        return { error: 'Ese jugador no está en el campo.' };
      }

      return POSICIONES.includes(detalles.posicion ?? '')
        ? { tipo }
        : { error: 'Elige la posición nueva.' };

    case 'note':
      if (jugador !== null && !convocados.has(jugador)) {
        return { error: 'Ese jugador no está convocado.' };
      }

      return (detalles.texto ?? '').trim() === '' ? { error: 'Escribe la nota.' } : { tipo };

    default:
      return { error: 'Ese tipo de evento no se apunta desde el directo.' };
  }
}

export function registrar(estado: EstadoDirecto, accion: AccionRegistrar): Resultado {
  if (estado.fase === 'finalizado') {
    return ilegal(estado, 'El partido ha terminado: lo que falte se corrige en el cierre.');
  }

  const validacion = validar(estado, accion.borrador);

  if ('error' in validacion) {
    return ilegal(estado, validacion.error);
  }

  const { tipo } = validacion;

  const cuando = momento(estado, accion);

  if (typeof cuando === 'string') {
    return ilegal(estado, cuando);
  }

  const { borrador } = accion;
  const status = accion.aprobado ? 'approved' : 'pending';
  const fila: TablesInsert<'match_events'> = {
    client_event_id: accion.clientEventId,
    match_id: estado.partidoId,
    event_type: tipo,
    period: cuando.periodo,
    seconds: cuando.segundos,
    occurred_at: cuando.occurredAt,
    is_opponent: borrador.rival,
    player_id: borrador.jugador,
    secondary_player_id: borrador.segundo,
    details: borrador.detalles,
    status,
    created_by: accion.userId,
  };

  const trabajos: EntradaDeTrabajo[] = [];
  let partes = estado.partes;

  if (cuando.parteNueva !== null) {
    const parte = cuando.parteNueva;
    const filaDeParte: TablesInsert<'match_periods'> = {
      id: parte.id,
      match_id: estado.partidoId,
      period_number: parte.numero,
      planned_seconds: estado.minutosDeParte * 60,
      actual_seconds: estado.minutosDeParte * 60,
    };

    trabajos.push({
      entity: 'match_period',
      op: 'insert',
      matchId: estado.partidoId,
      payload: { valores: filaDeParte },
    });
    partes = [...estado.partes, parte].sort((a, b) => a.numero - b.numero);
  }

  trabajos.push({
    entity: 'match_event',
    op: 'insert',
    matchId: estado.partidoId,
    payload: { valores: fila },
  });

  const evento: EventoDelDirecto = {
    clientEventId: accion.clientEventId,
    tipo,
    periodo: cuando.periodo,
    segundos: cuando.segundos,
    rival: borrador.rival,
    jugador: borrador.jugador,
    segundo: borrador.segundo,
    detalles: borrador.detalles,
    estado: status,
    propio: true,
  };

  return {
    estado: conEventos({ ...estado, partes }, [...estado.eventos, evento]),
    trabajos,
    error: null,
  };
}

/**
 * Deshace un evento apuntado en este aparato (E8-10): lo quita de la lista y
 * encola su borrado. Si todavía no se había enviado, la cola manda antes la
 * inserción y después el borrado, en orden. Lo de otros aparatos se corrige en
 * el cierre, no aquí.
 */
export function deshacer(estado: EstadoDirecto, clientEventId: string): Resultado {
  if (estado.fase === 'finalizado') {
    return ilegal(estado, 'El partido ha terminado: lo que falte se corrige en el cierre.');
  }

  const evento = estado.eventos.find((otro) => otro.clientEventId === clientEventId);

  if (evento === undefined || !evento.propio) {
    return ilegal(estado, 'Solo se deshace lo apuntado en este aparato.');
  }

  return {
    estado: conEventos(
      estado,
      estado.eventos.filter((otro) => otro.clientEventId !== clientEventId),
    ),
    trabajos: [
      {
        entity: 'match_event',
        op: 'delete',
        matchId: estado.partidoId,
        payload: { valores: {}, clave: { client_event_id: clientEventId } },
      },
    ],
    error: null,
  };
}
