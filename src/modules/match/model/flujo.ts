// El flujo de registro del directo: lógica pura (T-208, DOC 04 §7.4 y §7.6,
// DOC 02 §4).
//
// `Acción → Jugador → Detalle opcional → Guardado`. Cada botón de la botonera
// es una secuencia de pasos; la pantalla pinta el primero sin responder, a
// pantalla completa y con objetivos grandes. El detalle siempre se puede
// saltar: un gol sin asistencia vale más que ningún gol.
//
// LOS CANDIDATOS SALEN DEL ESTADO. Quien no puede entrar en un cambio no
// aparece entre los entrantes (R-05, R-07); quien no está en el campo no
// aparece como goleador. Lo que el reductor rechazaría, no se ofrece.
//
// LA FICHA DE JUGADOR es el mismo flujo con el jugador ya elegido: tocar a
// alguien del campo, elegir la acción y seguir por donde falte.

import { calcularEnCampo, expulsados, hastaElInstante, incorporados, sustituidos } from './eventos';
import { segundosDeMinuto } from './reloj';

import type { EstadoDirecto } from './directo';
import type { Instante } from './eventos';
import type { BorradorDeEvento } from './registro';
import type { TipoDeEvento } from '@modules/rules';
import type { IconName } from '@shared/ui/icons/registry';

export type Boton =
  'gol' | 'gol_en_propia' | 'tarjeta' | 'falta' | 'corner' | 'cambio' | 'posicion' | 'nota';

type Clave =
  | 'lado'
  | 'color'
  | 'clase'
  | 'jugador'
  | 'segundo'
  | 'motivo'
  | 'posicion'
  | 'texto'
  | 'periodo'
  | 'minuto';

/** Lo respondido. Sin la clave, sin responder; con `null`, saltado. */
export type Respuestas = Partial<Record<Clave, string | null>>;

export interface Flujo {
  boton: Boton;
  respuestas: Respuestas;
}

export interface ContextoDeFlujo {
  enCampo: string[];
  /** Quien puede entrar en un cambio. */
  paraEntrar: string[];
  /** Quien puede ver una tarjeta: los convocados sin expulsar, también suplentes. */
  tarjetables: string[];
  tiposActivos: TipoDeEvento[];
  diferido: boolean;
  periodos: number;
}

interface Opcion {
  valor: string;
  etiqueta: string;
}

export type Paso =
  | { clase: 'minuto'; periodos: number }
  | { clase: 'opciones'; clave: Clave; pregunta: string; opciones: Opcion[]; saltar?: string }
  | {
      clase: 'jugador';
      clave: 'jugador' | 'segundo';
      pregunta: string;
      candidatos: string[];
      saltar?: string;
    }
  | { clase: 'texto'; clave: 'texto'; pregunta: string };

export interface BotonDeBotonera {
  boton: Boton;
  nombre: string;
  /** Qué cuenta, escrito bajo el botón (DOC 04 §7.6). */
  definicion: string;
  /** Icono del DOC 07 §8.2: el del tipo de evento principal. */
  icono: IconName;
  tipos: TipoDeEvento[];
}

/** En el orden de la botonera del DOC 02 §4; los tres últimos, debajo. */
const BOTONERA: readonly BotonDeBotonera[] = [
  {
    boton: 'gol',
    nombre: 'Gol',
    definicion: 'Balón que entra y el árbitro concede. No cuenta el gol anulado.',
    icono: 'goal',
    tipos: ['goal'],
  },
  {
    boton: 'tarjeta',
    nombre: 'Tarjeta',
    definicion: 'Amonestación o expulsión mostrada. No cuenta el aviso verbal.',
    icono: 'yellow_card',
    tipos: ['yellow_card', 'second_yellow', 'red_card'],
  },
  {
    boton: 'falta',
    nombre: 'Falta',
    definicion: 'Falta pitada, manos incluidas. No cuenta el fuera de juego.',
    icono: 'foul_committed',
    tipos: ['foul_committed', 'foul_received'],
  },
  {
    boton: 'corner',
    nombre: 'Córner',
    definicion: 'Saque de esquina concedido. No cuentan banda ni puerta.',
    icono: 'corner',
    tipos: ['corner'],
  },
  {
    boton: 'cambio',
    nombre: 'Cambio',
    definicion: 'Cambio consumado, con el que entra ya dentro.',
    icono: 'substitution',
    tipos: ['substitution'],
  },
  {
    boton: 'gol_en_propia',
    nombre: 'Gol en propia',
    definicion: 'Al jugador que lo mete en su puerta.',
    icono: 'own_goal',
    tipos: ['own_goal'],
  },
  {
    boton: 'posicion',
    nombre: 'Posición',
    definicion: 'Cambio de demarcación sin sustitución.',
    icono: 'position_change',
    tipos: ['position_change'],
  },
  {
    boton: 'nota',
    nombre: 'Nota',
    definicion: 'Lo que no cabe en ningún botón.',
    icono: 'note',
    tipos: ['note'],
  },
];

/** Los botones con algún tipo encendido en la competición (R-09). */
export function botonesActivos(tiposActivos: readonly TipoDeEvento[]): BotonDeBotonera[] {
  return BOTONERA.filter((boton) => boton.tipos.some((tipo) => tiposActivos.includes(tipo)));
}

/** Los botones que se ofrecen en la ficha de un jugador del campo. */
export function botonesDeFicha(tiposActivos: readonly TipoDeEvento[]): BotonDeBotonera[] {
  return botonesActivos(tiposActivos).filter((boton) => boton.boton !== 'corner');
}

const LADO: Opcion[] = [
  { valor: 'nuestro', etiqueta: 'Nuestro' },
  { valor: 'rival', etiqueta: 'Del rival' },
];

const POSICIONES: Opcion[] = [
  { valor: 'GK', etiqueta: 'Portero' },
  { valor: 'DF', etiqueta: 'Defensa' },
  { valor: 'MF', etiqueta: 'Centrocampista' },
  { valor: 'FW', etiqueta: 'Delantero' },
];

const MOTIVOS: Opcion[] = [
  { valor: 'tactica', etiqueta: 'Táctica' },
  { valor: 'cansancio', etiqueta: 'Cansancio' },
  { valor: 'otros', etiqueta: 'Otros' },
];

function falta(respuestas: Respuestas, clave: Clave): boolean {
  return !(clave in respuestas);
}

/** El primer paso sin responder, o `null` si ya se puede guardar. */
export function siguientePaso(flujo: Flujo, contexto: ContextoDeFlujo): Paso | null {
  const r = flujo.respuestas;

  if (contexto.diferido && (falta(r, 'periodo') || falta(r, 'minuto'))) {
    return { clase: 'minuto', periodos: contexto.periodos };
  }

  const jugador = (pregunta: string, candidatos: string[], saltar?: string): Paso =>
    saltar === undefined
      ? { clase: 'jugador', clave: 'jugador', pregunta, candidatos }
      : { clase: 'jugador', clave: 'jugador', pregunta, candidatos, saltar };

  switch (flujo.boton) {
    case 'gol':
      if (falta(r, 'lado')) {
        return {
          clase: 'opciones',
          clave: 'lado',
          pregunta: '¿De quién es el gol?',
          opciones: LADO,
        };
      }

      if (r.lado === 'rival') {
        return null;
      }

      if (falta(r, 'jugador')) {
        return jugador('¿Quién ha marcado?', contexto.enCampo);
      }

      if (falta(r, 'segundo')) {
        return {
          clase: 'jugador',
          clave: 'segundo',
          pregunta: '¿Asistencia?',
          candidatos: contexto.enCampo.filter((id) => id !== r.jugador),
          saltar: 'Sin asistencia',
        };
      }

      return null;

    case 'gol_en_propia':
      if (falta(r, 'lado')) {
        return {
          clase: 'opciones',
          clave: 'lado',
          pregunta: '¿Quién lo ha metido en su puerta?',
          opciones: [
            { valor: 'nuestro', etiqueta: 'Un jugador nuestro' },
            { valor: 'rival', etiqueta: 'Un jugador del rival' },
          ],
        };
      }

      return r.lado === 'nuestro' && falta(r, 'jugador')
        ? jugador('¿Quién ha sido?', contexto.enCampo)
        : null;

    case 'tarjeta': {
      if (falta(r, 'color')) {
        const opciones: Opcion[] = [];

        if (contexto.tiposActivos.includes('yellow_card')) {
          opciones.push({ valor: 'amarilla', etiqueta: 'Amarilla' });
        }

        if (contexto.tiposActivos.includes('red_card')) {
          opciones.push({ valor: 'roja', etiqueta: 'Roja' });
        }

        return { clase: 'opciones', clave: 'color', pregunta: '¿Qué tarjeta?', opciones };
      }

      if (falta(r, 'lado')) {
        return { clase: 'opciones', clave: 'lado', pregunta: '¿A quién?', opciones: LADO };
      }

      return r.lado === 'nuestro' && falta(r, 'jugador')
        ? jugador('¿A quién se la han sacado?', contexto.tarjetables)
        : null;
    }

    case 'falta':
      if (falta(r, 'clase')) {
        return {
          clase: 'opciones',
          clave: 'clase',
          pregunta: '¿Qué falta?',
          opciones: [
            { valor: 'cometida', etiqueta: 'La hacemos nosotros' },
            { valor: 'recibida', etiqueta: 'Nos la hacen' },
          ],
        };
      }

      if (falta(r, 'jugador')) {
        return r.clase === 'cometida'
          ? jugador('¿Quién la ha hecho?', contexto.enCampo)
          : jugador('¿A quién se la han hecho?', contexto.enCampo, 'Sin jugador');
      }

      return null;

    case 'corner':
      return falta(r, 'lado')
        ? {
            clase: 'opciones',
            clave: 'lado',
            pregunta: '¿Para quién?',
            opciones: [
              { valor: 'nuestro', etiqueta: 'A favor' },
              { valor: 'rival', etiqueta: 'En contra' },
            ],
          }
        : null;

    case 'cambio':
      if (falta(r, 'jugador')) {
        return jugador('¿Quién sale?', contexto.enCampo);
      }

      if (falta(r, 'segundo')) {
        return {
          clase: 'jugador',
          clave: 'segundo',
          pregunta: '¿Quién entra?',
          candidatos: contexto.paraEntrar,
        };
      }

      return falta(r, 'motivo')
        ? {
            clase: 'opciones',
            clave: 'motivo',
            pregunta: '¿Por qué?',
            opciones: MOTIVOS,
            saltar: 'Sin motivo',
          }
        : null;

    case 'posicion':
      if (falta(r, 'jugador')) {
        return jugador('¿Quién cambia de posición?', contexto.enCampo);
      }

      return falta(r, 'posicion')
        ? {
            clase: 'opciones',
            clave: 'posicion',
            pregunta: '¿A qué posición?',
            opciones: POSICIONES,
          }
        : null;

    case 'nota':
      if (falta(r, 'jugador')) {
        return jugador('¿De quién es la nota?', contexto.tarjetables, 'Del partido');
      }

      return falta(r, 'texto')
        ? { clase: 'texto', clave: 'texto', pregunta: 'Escribe la nota' }
        : null;
  }
}

function valor(respuestas: Respuestas, clave: Clave): string | null {
  return respuestas[clave] ?? null;
}

/** El borrador que pide el reductor, con lo respondido. */
export function aBorrador(flujo: Flujo): BorradorDeEvento {
  const r = flujo.respuestas;
  const rival = r.lado === 'rival';
  const base = {
    rival,
    jugador: rival ? null : valor(r, 'jugador'),
    segundo: null,
    detalles: {},
  };

  switch (flujo.boton) {
    case 'gol':
      return { ...base, tipo: 'goal', segundo: rival ? null : valor(r, 'segundo') };
    case 'gol_en_propia':
      return { ...base, tipo: 'own_goal' };
    case 'tarjeta':
      return { ...base, tipo: r.color === 'roja' ? 'red_card' : 'yellow_card' };
    case 'falta':
      return {
        ...base,
        rival: false,
        tipo: r.clase === 'cometida' ? 'foul_committed' : 'foul_received',
      };
    case 'corner':
      return { ...base, tipo: 'corner', jugador: null };
    case 'cambio': {
      const motivo = valor(r, 'motivo');

      return {
        ...base,
        tipo: 'substitution',
        segundo: valor(r, 'segundo'),
        detalles: motivo === null ? {} : { motivo },
      };
    }
    case 'posicion':
      return {
        ...base,
        tipo: 'position_change',
        detalles: { posicion: valor(r, 'posicion') ?? '' },
      };
    case 'nota':
      return { ...base, tipo: 'note', detalles: { texto: (valor(r, 'texto') ?? '').trim() } };
  }
}

/** En diferido: la parte y el minuto escritos, o `null` si no valen. */
export function minutoDelFlujo(
  flujo: Flujo,
  minutosDeParte: number,
): { periodo: number; segundos: number } | null {
  const periodo = Number(flujo.respuestas.periodo);
  const segundos = segundosDeMinuto(flujo.respuestas.minuto ?? '', periodo, minutosDeParte);

  return Number.isInteger(periodo) && periodo >= 1 && segundos !== null
    ? { periodo, segundos }
    : null;
}

/**
 * Los candidatos de cada paso, desde el estado del directo.
 *
 * CON RELOJ, el campo es el de ahora mismo: `estado.enCampo`.
 *
 * EN DIFERIDO, CON EL INSTANTE DEL FLUJO (D06-36, T-217), el campo y los
 * expulsados son los de ese instante: con el cambio del 46 ya apuntado, un
 * gol del 20 ofrece a quien salió y no a quien entró. Para entrar, con
 * cambios fijos, no se ofrece a quien ya sale ni a quien ya entra en un
 * cambio apuntado, sea del minuto que sea. Sin instante —no hay flujo, o
 * falta el minuto—, como con reloj.
 */
export function contextoDe(
  estado: Pick<
    EstadoDirecto,
    | 'enCampo'
    | 'titulares'
    | 'convocados'
    | 'eventos'
    | 'cambiosFijos'
    | 'tiposActivos'
    | 'diferido'
    | 'periodos'
  >,
  instante?: Instante,
): ContextoDeFlujo {
  const enElInstante = estado.diferido && instante !== undefined;
  const anteriores = enElInstante ? hastaElInstante(estado.eventos, instante) : estado.eventos;
  const enCampo = enElInstante ? calcularEnCampo(estado.titulares, anteriores) : estado.enCampo;

  const fuera = expulsados(anteriores);
  const salieron = estado.cambiosFijos ? sustituidos(estado.eventos) : new Set<string>();
  const entraron =
    estado.cambiosFijos && enElInstante ? incorporados(estado.eventos) : new Set<string>();
  const campo = new Set(enCampo);

  return {
    enCampo,
    paraEntrar: estado.convocados.filter(
      (id) => !campo.has(id) && !fuera.has(id) && !salieron.has(id) && !entraron.has(id),
    ),
    tarjetables: estado.convocados.filter((id) => !fuera.has(id)),
    tiposActivos: estado.tiposActivos,
    diferido: estado.diferido,
    periodos: estado.periodos,
  };
}
