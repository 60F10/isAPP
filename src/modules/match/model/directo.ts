// El reductor del partido en directo: lógica pura (DOC 06 §5.4, D06-04,
// DOC 04 §5 y §8.1, T-207).
//
// Toda transición es `(estado, acción) → { estado, trabajos, error }`. Los
// trabajos son las filas que hay que encolar en `sync`; la pantalla las
// encola y guarda el estado en IndexedDB, y así sobrevive a una recarga sin
// ningún trabajo extra. Lo ilegal no lanza: devuelve el mismo estado, ningún
// trabajo y el motivo en palabras.
//
//   inactivo → en_juego ⇄ pausado → descanso → en_juego … → finalizado
//
// LA HORA ENTRA COMO ARGUMENTO. El reductor no llama a `Date.now()` ni genera
// identificadores: así se prueba entero y una acción repetida da lo mismo.
//
// «QUIÉN ESTÁ EN EL CAMPO» es estado de pantalla (DOC 04 §6.5): aquí, los
// titulares. Los cambios y las expulsiones lo mueven desde la T-208. Los
// tramos oficiales los recalcula el servidor con los eventos aprobados.
//
// LA PAUSA ES LOCAL. Descuenta del reloj de este aparato y de la duración
// real de la parte, pero el servidor no la conoce: otro dispositivo que
// derive los segundos de `started_at` no la verá. Con reloj corrido, como el
// cadete, solo se pausa por un parón largo (DOC 13).

import type { PaqueteDePartido } from './paquete';
import type { EntradaDeTrabajo } from '@modules/sync';

export type Fase = 'inactivo' | 'en_juego' | 'pausado' | 'descanso' | 'finalizado';

export interface ParteLocal {
  /** El `id` de `match_periods`. Lo genera el dispositivo que la abre. */
  id: string;
  numero: number;
  /** Instante de arranque en milisegundos: el ancla del reloj (D06-15). */
  inicio: number;
  pausadoMs: number;
  /** Desde cuándo está en pausa, o `null` si corre. */
  pausaDesde: number | null;
  /** Duración real, al cerrarla. `null` mientras está abierta. */
  segundosReales: number | null;
}

export interface EstadoDirecto {
  partidoId: string;
  fase: Fase;
  partes: ParteLocal[];
  /** Quién está en el campo según este aparato. */
  enCampo: string[];
  periodos: number;
  minutosDeParte: number;
  titularesPedidos: number;
}

export type Accion =
  | { tipo: 'empezar_parte'; ahora: number; parteId: string }
  | { tipo: 'pausar' | 'reanudar' | 'terminar_parte' | 'finalizar'; ahora: number };

export interface Resultado {
  estado: EstadoDirecto;
  trabajos: EntradaDeTrabajo[];
  error: string | null;
}

/** El estado a partir de lo precargado del servidor. */
export function desdePaquete(paquete: PaqueteDePartido): EstadoDirecto {
  const partes = paquete.partes
    .filter((parte) => parte.startedAt !== null)
    .sort((a, b) => a.periodNumber - b.periodNumber)
    .map((parte): ParteLocal => ({
      id: parte.id,
      numero: parte.periodNumber,
      inicio: Date.parse(parte.startedAt ?? ''),
      pausadoMs: 0,
      pausaDesde: null,
      segundosReales: parte.endedAt === null ? null : (parte.actualSeconds ?? parte.plannedSeconds),
    }));

  const ultima = partes[partes.length - 1];
  const { status } = paquete.partido;
  let fase: Fase = 'inactivo';

  if (status === 'finished' || status === 'closed' || status === 'suspended') {
    fase = 'finalizado';
  } else if (ultima !== undefined) {
    fase = ultima.segundosReales === null ? 'en_juego' : 'descanso';
  }

  return {
    partidoId: paquete.partido.id,
    fase,
    partes,
    enCampo: paquete.convocatoria
      .filter((linea) => linea.callStatus === 'starter')
      .map((linea) => linea.playerId),
    periodos: paquete.reglamento.periods_count,
    minutosDeParte: paquete.reglamento.period_minutes,
    titularesPedidos: paquete.reglamento.players_on_pitch,
  };
}

/** Empezado y sin terminar: lo que calla el aviso de versión nueva (D06-14). */
export function enCurso(estado: EstadoDirecto): boolean {
  return estado.fase !== 'inactivo' && estado.fase !== 'finalizado';
}

function ilegal(estado: EstadoDirecto, error: string): Resultado {
  return { estado, trabajos: [], error };
}

function estadoDelPartido(partidoId: string, status: 'live' | 'finished'): EntradaDeTrabajo {
  return {
    entity: 'match',
    op: 'update',
    matchId: partidoId,
    payload: { valores: { status }, clave: { id: partidoId } },
  };
}

function conParte(estado: EstadoDirecto, parte: ParteLocal): ParteLocal[] {
  return estado.partes.map((otra) => (otra.id === parte.id ? parte : otra));
}

export function reducir(estado: EstadoDirecto, accion: Accion): Resultado {
  const abierta = estado.partes.find((parte) => parte.segundosReales === null);

  switch (accion.tipo) {
    case 'empezar_parte': {
      if (estado.fase !== 'inactivo' && estado.fase !== 'descanso') {
        return ilegal(estado, 'Ya hay una parte en juego.');
      }

      const numero = estado.partes.length + 1;

      if (numero > estado.periodos) {
        return ilegal(estado, `Esta competición tiene ${estado.periodos} partes.`);
      }

      // R-02: se comprueba antes de empezar, que es cuando todavía se puede
      // volver a la convocatoria.
      if (numero === 1 && estado.enCampo.length !== estado.titularesPedidos) {
        return ilegal(
          estado,
          `Tienen que salir ${estado.titularesPedidos} titulares y la convocatoria tiene ${estado.enCampo.length}.`,
        );
      }

      const parte: ParteLocal = {
        id: accion.parteId,
        numero,
        inicio: accion.ahora,
        pausadoMs: 0,
        pausaDesde: null,
        segundosReales: null,
      };
      const trabajos: EntradaDeTrabajo[] = [
        {
          entity: 'match_period',
          op: 'insert',
          matchId: estado.partidoId,
          payload: {
            valores: {
              id: parte.id,
              match_id: estado.partidoId,
              period_number: numero,
              planned_seconds: estado.minutosDeParte * 60,
              started_at: new Date(accion.ahora).toISOString(),
            },
          },
        },
      ];

      return {
        estado: { ...estado, fase: 'en_juego', partes: [...estado.partes, parte] },
        // El partido pasa a en juego antes que la parte: la cola respeta el
        // orden, y así nadie ve una parte abierta de un partido convocado.
        trabajos:
          numero === 1 ? [estadoDelPartido(estado.partidoId, 'live'), ...trabajos] : trabajos,
        error: null,
      };
    }

    case 'pausar': {
      if (estado.fase !== 'en_juego' || abierta === undefined) {
        return ilegal(estado, 'Solo se pausa una parte en juego.');
      }

      return {
        estado: {
          ...estado,
          fase: 'pausado',
          partes: conParte(estado, { ...abierta, pausaDesde: accion.ahora }),
        },
        trabajos: [],
        error: null,
      };
    }

    case 'reanudar': {
      if (estado.fase !== 'pausado' || abierta === undefined || abierta.pausaDesde === null) {
        return ilegal(estado, 'No hay ninguna parte en pausa.');
      }

      return {
        estado: {
          ...estado,
          fase: 'en_juego',
          partes: conParte(estado, {
            ...abierta,
            pausadoMs: abierta.pausadoMs + (accion.ahora - abierta.pausaDesde),
            pausaDesde: null,
          }),
        },
        trabajos: [],
        error: null,
      };
    }

    case 'terminar_parte': {
      if ((estado.fase !== 'en_juego' && estado.fase !== 'pausado') || abierta === undefined) {
        return ilegal(estado, 'No hay ninguna parte en juego.');
      }

      const hasta = abierta.pausaDesde ?? accion.ahora;
      const segundosReales = Math.max(
        0,
        Math.floor((hasta - abierta.inicio - abierta.pausadoMs) / 1000),
      );

      return {
        estado: {
          ...estado,
          fase: 'descanso',
          partes: conParte(estado, { ...abierta, pausaDesde: null, segundosReales }),
        },
        trabajos: [
          {
            entity: 'match_period',
            op: 'update',
            matchId: estado.partidoId,
            payload: {
              valores: {
                ended_at: new Date(accion.ahora).toISOString(),
                actual_seconds: segundosReales,
              },
              clave: { id: abierta.id },
            },
          },
        ],
        error: null,
      };
    }

    case 'finalizar': {
      if (estado.fase !== 'descanso') {
        return ilegal(estado, 'Termina antes la parte en juego.');
      }

      if (estado.partes.length < estado.periodos) {
        return ilegal(estado, 'Quedan partes por jugar.');
      }

      return {
        estado: { ...estado, fase: 'finalizado' },
        trabajos: [estadoDelPartido(estado.partidoId, 'finished')],
        error: null,
      };
    }
  }
}

function avance(estado: EstadoDirecto): number {
  if (estado.fase === 'finalizado') {
    return Number.MAX_SAFE_INTEGER;
  }

  const cerradas = estado.partes.filter((parte) => parte.segundosReales !== null).length;

  return estado.partes.length + cerradas;
}

/**
 * Qué estado manda al abrir el directo: el guardado en este aparato o el que
 * sale de lo precargado del servidor. Gana el más avanzado —partes abiertas y
 * cerradas, y terminado por encima de todo—, y a igualdad el local, que
 * conoce la pausa. Así, si otro aparato cerró la parte, se ve cerrada; y lo
 * que este aparato hizo sin red no se deshace porque el servidor aún no lo sepa.
 */
export function elegirEstado(
  local: EstadoDirecto | undefined,
  servidor: EstadoDirecto,
): EstadoDirecto {
  if (local === undefined) {
    return servidor;
  }

  return avance(servidor) > avance(local) ? servidor : local;
}

export interface Marcador {
  aFavor: number;
  enContra: number;
  /** Goles sin aprobar que ya cuentan: el marcador lo avisa (DOC 04 §7.3). */
  pendientes: number;
}

/**
 * El marcador del directo (DOC 04 §7.3): goles propios más goles en propia
 * del rival, y al revés. Cuenta los pendientes, porque en directo es lo que
 * se sabe, y no los rechazados.
 */
export function marcador(eventos: readonly Record<string, unknown>[]): Marcador {
  const resultado: Marcador = { aFavor: 0, enContra: 0, pendientes: 0 };

  for (const evento of eventos) {
    const tipo = evento.event_type;

    if ((tipo !== 'goal' && tipo !== 'own_goal') || evento.status === 'rejected') {
      continue;
    }

    const delRival = evento.is_opponent === true;
    const suma = tipo === 'goal' ? !delRival : delRival;

    if (suma) {
      resultado.aFavor += 1;
    } else {
      resultado.enContra += 1;
    }

    if (evento.status === 'pending') {
      resultado.pendientes += 1;
    }
  }

  return resultado;
}
