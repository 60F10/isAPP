// Convocatoria: lógica pura de la A11 (T-205, DOC 04 §11).
//
// Sin React ni red. La plantilla se reparte en titulares, suplentes y no
// convocados (L-01); el dorsal y la posición salen de la inscripción y se
// cambian solo para ese partido (L-05, L-06); quien no está disponible no se
// convoca (L-04); y para guardar, los titulares son exactamente los del
// reglamento (L-03) y los convocados no pasan del máximo (R-01).
//
// DEL JUGADOR SOLO SE MANEJAN APODO, DORSAL Y POSICIÓN. La disponibilidad no
// lleva motivo (DOC 04 §12.4).

import type { Disponibilidad, Inscripcion, Posicion } from '@modules/core';

/** Los tres valores de `call_status`. */
export type Llamada = 'starter' | 'substitute' | 'not_called';

export const NOMBRES_DE_LLAMADA: Record<Llamada, string> = {
  starter: 'Titular',
  substitute: 'Suplente',
  not_called: 'No convocado',
};

/** Una línea de `match_squad` tal como está en la base. */
export interface LineaGuardada {
  playerId: string;
  nickname: string;
  callStatus: Llamada;
  shirtNumber: number | null;
  position: Posicion | null;
}

/** Un jugador en la pantalla, con lo que se escribe como texto. */
export interface FilaConvocatoria {
  playerId: string;
  nickname: string;
  /** `null`: tiene línea guardada en el partido pero ya no está en la plantilla. */
  availability: Disponibilidad | null;
  llamada: Llamada;
  dorsal: string;
  posicion: Posicion | '';
  /** Estaba convocado y ya no se puede convocar: se queda fuera al guardar. */
  retirado: boolean;
}

/** Lo que se manda a `match_squad`, con los nombres de sus columnas. */
export interface LineaAGuardar {
  player_id: string;
  call_status: Llamada;
  shirt_number: number | null;
  position: Posicion | null;
}

export interface ResultadoConvocatoria {
  errores: {
    /** Lo que afecta a la convocatoria entera. */
    general: string[];
    /** Por jugador: el aviso va junto a su campo de dorsal. */
    dorsales: Record<string, string>;
  };
  /** Todas las líneas, o `null` si hay algún error. */
  valores: LineaAGuardar[] | null;
}

/** Solo se convoca al disponible. Sancionado, no disponible o dado de baja, no. */
export function sePuedeConvocar(disponibilidad: Disponibilidad | null): boolean {
  return disponibilidad === 'available';
}

function aFila(
  base: { playerId: string; nickname: string; availability: Disponibilidad | null },
  propuesta: { dorsal: number | null; posicion: Posicion | null },
  guardada: LineaGuardada | undefined,
): FilaConvocatoria {
  const llamadaGuardada = guardada === undefined ? 'not_called' : guardada.callStatus;
  const convocable = sePuedeConvocar(base.availability);
  // Lo de ese partido solo manda si iba convocado. Al no convocado se le
  // vuelve a proponer lo de su inscripción, por si entra la próxima vez.
  const usarGuardada = guardada !== undefined && llamadaGuardada !== 'not_called';
  const dorsal = usarGuardada ? guardada.shirtNumber : propuesta.dorsal;
  const posicion = usarGuardada ? guardada.position : propuesta.posicion;

  return {
    ...base,
    llamada: convocable ? llamadaGuardada : 'not_called',
    dorsal: dorsal === null ? '' : String(dorsal),
    posicion: posicion ?? '',
    retirado: !convocable && llamadaGuardada !== 'not_called',
  };
}

/**
 * Junta la plantilla con lo guardado del partido. Todo inscrito sale una vez
 * (L-01), en el orden de la plantilla. Quien tiene línea guardada y ya no está
 * inscrito sale al final, sin poder convocarlo, para que su línea se vea y se
 * pueda quitar.
 */
export function construirConvocatoria(
  plantilla: readonly Inscripcion[],
  guardada: readonly LineaGuardada[],
): FilaConvocatoria[] {
  const porJugador = new Map(guardada.map((linea) => [linea.playerId, linea]));
  const inscritos = new Set(plantilla.map((inscripcion) => inscripcion.playerId));

  const filas = plantilla.map((inscripcion) =>
    aFila(
      {
        playerId: inscripcion.playerId,
        nickname: inscripcion.nickname,
        availability: inscripcion.availability,
      },
      { dorsal: inscripcion.shirtNumber, posicion: inscripcion.defaultPosition },
      porJugador.get(inscripcion.playerId),
    ),
  );

  const fuera = guardada
    .filter((linea) => !inscritos.has(linea.playerId))
    .sort((a, b) => a.nickname.localeCompare(b.nickname, 'es'))
    .map((linea) =>
      aFila(
        { playerId: linea.playerId, nickname: linea.nickname, availability: null },
        { dorsal: linea.shirtNumber, posicion: linea.position },
        linea,
      ),
    );

  return [...filas, ...fuera];
}

export function contar(filas: readonly Pick<FilaConvocatoria, 'llamada'>[]): {
  titulares: number;
  suplentes: number;
  convocados: number;
} {
  const titulares = filas.filter((fila) => fila.llamada === 'starter').length;
  const suplentes = filas.filter((fila) => fila.llamada === 'substitute').length;

  return { titulares, suplentes, convocados: titulares + suplentes };
}

/** El dorsal escrito, `null` si está vacío, o `NaN` si no vale. */
function leerDorsal(texto: string): number | null {
  const limpio = texto.trim();

  if (limpio === '') {
    return null;
  }

  // Solo cifras: «7.5», «-3» o «siete» no son un dorsal.
  const numero = /^\d{1,2}$/.test(limpio) ? Number(limpio) : NaN;

  return numero >= 1 && numero <= 99 ? numero : NaN;
}

/**
 * Valida la convocatoria contra el reglamento de la competición.
 *
 * El dorsal repetido no lo impide la base: `match_squad` no tiene índice
 * único de dorsal por partido. Lo impide esta función, entre convocados.
 */
export function validarConvocatoria(
  filas: readonly FilaConvocatoria[],
  reglamento: { squad_max: number; players_on_pitch: number },
): ResultadoConvocatoria {
  const general: string[] = [];
  const dorsales: Record<string, string> = {};
  const convocados = filas.filter((fila) => fila.llamada !== 'not_called');
  const cuenta = contar(filas);

  for (const fila of convocados) {
    if (!sePuedeConvocar(fila.availability)) {
      general.push(`${fila.nickname} no se puede convocar.`);
    }
  }

  if (cuenta.titulares !== reglamento.players_on_pitch) {
    general.push(
      `Tienen que ser ${reglamento.players_on_pitch} titulares y hay ${cuenta.titulares}.`,
    );
  }

  if (cuenta.convocados > reglamento.squad_max) {
    general.push(`Como mucho ${reglamento.squad_max} convocados y hay ${cuenta.convocados}.`);
  }

  const leidos = new Map(convocados.map((fila) => [fila.playerId, leerDorsal(fila.dorsal)]));

  for (const fila of convocados) {
    const dorsal = leidos.get(fila.playerId);

    if (Number.isNaN(dorsal)) {
      dorsales[fila.playerId] = 'El dorsal va del 1 al 99.';
      continue;
    }

    const otro = convocados.find(
      (companero) =>
        companero.playerId !== fila.playerId && leidos.get(companero.playerId) === dorsal,
    );

    if (dorsal !== null && dorsal !== undefined && otro !== undefined) {
      dorsales[fila.playerId] = `El ${dorsal} lo lleva también ${otro.nickname}.`;
    }
  }

  if (general.length > 0 || Object.keys(dorsales).length > 0) {
    return { errores: { general, dorsales }, valores: null };
  }

  return {
    errores: { general, dorsales },
    valores: filas.map((fila) =>
      fila.llamada === 'not_called'
        ? {
            player_id: fila.playerId,
            call_status: 'not_called',
            shirt_number: null,
            position: null,
          }
        : {
            player_id: fila.playerId,
            call_status: fila.llamada,
            shirt_number: leidos.get(fila.playerId) ?? null,
            position: fila.posicion === '' ? null : fila.posicion,
          },
    ),
  };
}
