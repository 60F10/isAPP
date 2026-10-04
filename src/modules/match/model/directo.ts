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
// «QUIÉN ESTÁ EN EL CAMPO» es estado de pantalla (DOC 04 §6.5): los
// titulares, movidos por los cambios y las expulsiones que conoce el aparato
// (T-208, `registro.ts`). Los tramos oficiales los recalcula el servidor con
// los eventos aprobados.
//
// LA PAUSA ES LOCAL. Descuenta del reloj de este aparato y de la duración
// real de la parte, pero el servidor no la conoce: otro dispositivo que
// derive los segundos de `started_at` no la verá. Con reloj corrido, como el
// cadete, solo se pausa por un parón largo (DOC 13).

import { calcularEnCampo, desdeFilas, unirEventos } from './eventos';
import { conEventos, deshacer, registrar } from './registro';

import type { EventoDelDirecto } from './eventos';
import type { PaqueteDePartido } from './paquete';
import type { AccionRegistrar } from './registro';
import type { Posicion } from '@modules/core';
import type { TipoDeEvento } from '@modules/rules';
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
  /** Quién está en el campo según este aparato. Se deriva de `titulares` y `eventos`. */
  enCampo: string[];
  titulares: string[];
  /** Titulares y suplentes: los que pueden aparecer en un evento. */
  convocados: string[];
  /** Posición de cada convocado en la convocatoria. Los cambios de posición la mueven. */
  posicionesIniciales: Record<string, Posicion | null>;
  /** Los eventos que conoce el aparato: precargados y apuntados aquí. */
  eventos: EventoDelDirecto[];
  periodos: number;
  minutosDeParte: number;
  titularesPedidos: number;
  cambiosMax: number;
  /** Cambios fijos: quien sale no vuelve (R-05). */
  cambiosFijos: boolean;
  /** Los botones que salen: `enabled_event_types` de la competición (R-09). */
  tiposActivos: TipoDeEvento[];
  /** Partido en diferido: sin reloj, con el minuto a mano (DOC 04 §5.4). */
  diferido: boolean;
}

export type Accion =
  | { tipo: 'empezar_parte'; ahora: number; parteId: string }
  | { tipo: 'pausar' | 'reanudar' | 'terminar_parte' | 'finalizar'; ahora: number }
  | AccionRegistrar
  | { tipo: 'deshacer'; clientEventId: string };

export interface Resultado {
  estado: EstadoDirecto;
  trabajos: EntradaDeTrabajo[];
  error: string | null;
}

/** El estado a partir de lo precargado del servidor. */
export function desdePaquete(paquete: PaqueteDePartido): EstadoDirecto {
  const diferido = paquete.partido.isRetroactive;
  const partes = paquete.partes
    // En diferido las partes no tienen arranque: se crean con su duración.
    .filter((parte) => diferido || parte.startedAt !== null)
    .sort((a, b) => a.periodNumber - b.periodNumber)
    .map((parte): ParteLocal => ({
      id: parte.id,
      numero: parte.periodNumber,
      inicio: parte.startedAt === null ? 0 : Date.parse(parte.startedAt),
      pausadoMs: 0,
      pausaDesde: null,
      segundosReales:
        diferido || parte.endedAt !== null ? (parte.actualSeconds ?? parte.plannedSeconds) : null,
    }));

  const ultima = partes[partes.length - 1];
  const { status } = paquete.partido;
  let fase: Fase = 'inactivo';

  if (status === 'finished' || status === 'closed' || status === 'suspended') {
    fase = 'finalizado';
  } else if (ultima !== undefined && !diferido) {
    fase = ultima.segundosReales === null ? 'en_juego' : 'descanso';
  }

  const convocados = paquete.convocatoria.filter((linea) => linea.callStatus !== 'not_called');
  const titulares = convocados
    .filter((linea) => linea.callStatus === 'starter')
    .map((linea) => linea.playerId);
  const eventos = desdeFilas(paquete.eventos);
  const { reglamento } = paquete;

  return {
    partidoId: paquete.partido.id,
    fase,
    partes,
    enCampo: calcularEnCampo(titulares, eventos),
    titulares,
    convocados: convocados.map((linea) => linea.playerId),
    posicionesIniciales: Object.fromEntries(
      convocados.map((linea) => [linea.playerId, linea.position]),
    ),
    eventos,
    periodos: reglamento.periods_count,
    minutosDeParte: reglamento.period_minutes,
    titularesPedidos: reglamento.players_on_pitch,
    cambiosMax: reglamento.substitutions_max,
    cambiosFijos: reglamento.substitution_type === 'fixed',
    tiposActivos: reglamento.enabled_event_types,
    diferido,
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

      if (estado.diferido) {
        return ilegal(estado, 'En diferido no hay reloj: cada evento lleva su minuto.');
      }

      // R-02: se comprueba antes de empezar, que es cuando todavía se puede
      // volver a la convocatoria.
      if (numero === 1 && estado.titulares.length !== estado.titularesPedidos) {
        return ilegal(
          estado,
          `Tienen que salir ${estado.titularesPedidos} titulares y la convocatoria tiene ${estado.titulares.length}.`,
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

    case 'registrar':
      return registrar(estado, accion);

    case 'deshacer':
      return deshacer(estado, accion.clientEventId);
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
 * Lo que manda siempre el servidor (D06-36): la convocatoria y el reglamento.
 * No son del avance del partido, y pueden cambiar con el directo ya abierto
 * una vez: se sube el límite de cambios, se convoca a alguien más.
 */
const DEL_SERVIDOR = [
  'titulares',
  'convocados',
  'posicionesIniciales',
  'periodos',
  'minutosDeParte',
  'titularesPedidos',
  'cambiosMax',
  'cambiosFijos',
  'tiposActivos',
  'diferido',
] as const satisfies readonly (keyof EstadoDirecto)[];

/**
 * Qué estado manda al abrir el directo: el guardado en este aparato o el que
 * sale de lo precargado del servidor.
 *
 * LA FASE, LAS PARTES Y LOS EVENTOS son del más avanzado —partes abiertas y
 * cerradas, y terminado por encima de todo—, y a igualdad del local, que
 * conoce la pausa. Así, si otro aparato cerró la parte, se ve cerrada; y lo
 * que este aparato hizo sin red no se deshace porque el servidor aún no lo sepa.
 *
 * LA CONVOCATORIA Y EL REGLAMENTO son siempre del servidor (D06-36, T-217),
 * y el campo se recalcula con sus titulares. Sin red, `servidor` sale del
 * último paquete descargado, que es lo mejor que se sabe. Si no cambia nada,
 * devuelve el estado elegido tal cual.
 */
export function elegirEstado(
  local: EstadoDirecto | undefined,
  servidor: EstadoDirecto,
): EstadoDirecto {
  if (local === undefined || avance(servidor) > avance(local)) {
    return servidor;
  }

  const alDia = DEL_SERVIDOR.every(
    (campo) => JSON.stringify(local[campo]) === JSON.stringify(servidor[campo]),
  );

  if (alDia) {
    return local;
  }

  return {
    ...local,
    titulares: servidor.titulares,
    convocados: servidor.convocados,
    posicionesIniciales: servidor.posicionesIniciales,
    periodos: servidor.periodos,
    minutosDeParte: servidor.minutosDeParte,
    titularesPedidos: servidor.titularesPedidos,
    cambiosMax: servidor.cambiosMax,
    cambiosFijos: servidor.cambiosFijos,
    tiposActivos: servidor.tiposActivos,
    diferido: servidor.diferido,
    enCampo: calcularEnCampo(servidor.titulares, local.eventos),
  };
}

/**
 * Suma a un estado los eventos del servidor que no conocía: los de otros
 * aparatos que llegaron con la precarga. Al abrir el directo, después de
 * `elegirEstado`, para que el estado local no los pierda.
 */
export function conEventosDelServidor(
  estado: EstadoDirecto,
  servidor: readonly EventoDelDirecto[],
): EstadoDirecto {
  return conEventos(estado, unirEventos(estado.eventos, servidor));
}
