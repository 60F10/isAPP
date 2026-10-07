// Plantilla: lógica pura de las pantallas A05 y A06 (T-202).
//
// EL JUGADOR SOLO ES APODO, DORSAL Y POSICIÓN. `players` tiene columnas para
// el nombre real y su consentimiento (DOC 05 §6.1), vacías y ocultas: ninguna
// función de aquí las lee ni las devuelve, y `validarJugador` solo produce las
// tres columnas permitidas. Sin fecha de nacimiento, sin foto, sin dato de
// salud: la disponibilidad no lleva motivo (DOC 04 §12.4).

import { limpiarTexto } from './clubYEquipos';

export type Posicion = 'GK' | 'DF' | 'MF' | 'FW';
export type Disponibilidad = 'available' | 'unavailable' | 'sanctioned';

/** Un jugador inscrito en un equipo y una temporada (DOC 05 §6.2). */
export interface Inscripcion {
  id: string;
  playerId: string;
  nickname: string;
  shirtNumber: number | null;
  defaultPosition: Posicion | null;
  availability: Disponibilidad;
}

/**
 * Un jugador tal como lo ve quien solo lee la plantilla (T-304): apodo, dorsal
 * y posición. Sin disponibilidad ni identificadores de la inscripción: lo que
 * no se enseña no se descarga. `ordenarPlantilla` lo admite tal cual.
 */
export interface LecturaDePlantilla {
  playerId: string;
  nickname: string;
  shirtNumber: number | null;
  defaultPosition: Posicion | null;
}

/** Largo de interfaz: el esquema no lo limita. Cabe en una ficha del directo. */
export const LARGO_APODO = 30;

export const POSICIONES: Record<Posicion, string> = {
  GK: 'Portero',
  DF: 'Defensa',
  MF: 'Centrocampista',
  FW: 'Delantero',
};

export const DISPONIBILIDADES: Record<Disponibilidad, string> = {
  available: 'Disponible',
  unavailable: 'No disponible',
  sanctioned: 'Sancionado',
};

export interface ResultadoJugador {
  errores: { apodo?: string; dorsal?: string };
  /** Solo las tres columnas permitidas, o `null` si hay algún error. */
  valores: {
    nickname: string;
    shirt_number: number | null;
    default_position: Posicion | null;
  } | null;
}

/**
 * Valida apodo, dorsal y posición.
 *
 * @param companeros la plantilla activa, para no repetir dorsal. La base lo
 *   impide igual (`squad_shirt_unique`), pero así el aviso sale junto al
 *   campo y antes de gastar red.
 * @param idActual al editar, la propia inscripción, que no cuenta.
 */
export function validarJugador(
  entrada: { apodo: string; dorsal: string; posicion: Posicion | '' },
  companeros: readonly Pick<Inscripcion, 'id' | 'shirtNumber'>[],
  idActual?: string,
): ResultadoJugador {
  const apodo = limpiarTexto(entrada.apodo);
  const dorsalEscrito = entrada.dorsal.trim();
  const errores: ResultadoJugador['errores'] = {};

  if (apodo === '') {
    errores.apodo = 'Escribe el apodo del jugador.';
  } else if (apodo.length > LARGO_APODO) {
    errores.apodo = `Como mucho ${LARGO_APODO} caracteres.`;
  }

  let dorsal: number | null = null;

  if (dorsalEscrito !== '') {
    // Solo cifras: «7.5», «-3» o «siete» no son un dorsal.
    const numero = /^\d{1,2}$/.test(dorsalEscrito) ? Number(dorsalEscrito) : NaN;

    if (!Number.isInteger(numero) || numero < 1 || numero > 99) {
      errores.dorsal = 'El dorsal va del 1 al 99.';
    } else if (companeros.some((otro) => otro.id !== idActual && otro.shirtNumber === numero)) {
      errores.dorsal = 'Ese dorsal ya lo lleva otro jugador.';
    } else {
      dorsal = numero;
    }
  }

  if (Object.keys(errores).length > 0) {
    return { errores, valores: null };
  }

  return {
    errores,
    valores: {
      nickname: apodo,
      shirt_number: dorsal,
      default_position: entrada.posicion === '' ? null : entrada.posicion,
    },
  };
}

/**
 * Por dorsal, como se lee una alineación. Los que no tienen dorsal van al
 * final, por apodo con el orden del español. Devuelve una lista nueva.
 */
export function ordenarPlantilla<T extends Pick<Inscripcion, 'shirtNumber' | 'nickname'>>(
  plantilla: readonly T[],
): T[] {
  return [...plantilla].sort((a, b) => {
    if (a.shirtNumber !== b.shirtNumber) {
      if (a.shirtNumber === null) {
        return 1;
      }

      if (b.shirtNumber === null) {
        return -1;
      }

      return a.shirtNumber - b.shirtNumber;
    }

    return a.nickname.localeCompare(b.nickname, 'es');
  });
}

/**
 * La fecha local de hoy como la guarda una columna `date`: `2026-09-05`.
 *
 * Local y no UTC a propósito: `toISOString()` daría el día anterior a quien
 * da de baja a un jugador pasada la medianoche en Canarias en horario de
 * verano.
 */
export function fechaDeHoy(ahora: Date): string {
  const dos = (numero: number) => String(numero).padStart(2, '0');

  return `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`;
}

/**
 * El dorsal con el que vuelve un jugador dado de baja (PR #51): el
 * suyo, si nadie de la plantilla lo lleva ahora; si no, ninguno, porque la
 * base no deja repetirlo entre activos (`squad_shirt_unique`). Se le pone uno
 * nuevo desde su ficha.
 */
export function dorsalAlReincorporar(
  baja: Pick<Inscripcion, 'shirtNumber'>,
  plantilla: readonly Pick<Inscripcion, 'shirtNumber'>[],
): number | null {
  if (baja.shirtNumber === null) {
    return null;
  }

  return plantilla.some((otro) => otro.shirtNumber === baja.shirtNumber) ? null : baja.shirtNumber;
}
