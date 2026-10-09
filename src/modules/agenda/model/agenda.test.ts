// Lógica pura de la mezcla de partidos y entrenamientos (T-231).

import { describe, expect, it } from 'vitest';

import {
  DIAS_EN_EL_CALENDARIO,
  DIAS_EN_INICIO,
  esHoy,
  mezclarAgenda,
  proximoEntrenamiento,
  tieneFuncion,
} from './agenda';

// Fechas construidas en hora local: las pruebas valen en cualquier zona.
const AHORA = new Date(2026, 9, 10, 20, 0);

/** Un instante a tantos días de `AHORA`, a la hora que se diga. */
function dia(dias: number, hora = 18, minuto = 0): string {
  return new Date(2026, 9, 10 + dias, hora, minuto).toISOString();
}

function partido(id: string, kickoffAt: string) {
  return { id, kickoffAt };
}

function entrenamiento(id: string, scheduledAt: string) {
  return { id, scheduledAt };
}

/** La mezcla en una línea: «p:par-1 e:ent-1». */
function resumen(
  mezcla: ReturnType<
    typeof mezclarAgenda<ReturnType<typeof partido>, ReturnType<typeof entrenamiento>>
  >,
): string {
  return mezcla
    .map((entrada) =>
      entrada.tipo === 'partido' ? `p:${entrada.partido.id}` : `e:${entrada.entrenamiento.id}`,
    )
    .join(' ');
}

describe('mezclarAgenda', () => {
  it('ordena por fecha partidos y entrenamientos', () => {
    const mezcla = mezclarAgenda(
      [partido('par-1', dia(1, 11, 30)), partido('par-2', dia(8, 11, 30))],
      [
        entrenamiento('ent-3', dia(10)),
        entrenamiento('ent-1', dia(0, 21)),
        entrenamiento('ent-2', dia(3)),
      ],
      AHORA,
    );

    expect(resumen(mezcla)).toBe('e:ent-1 p:par-1 e:ent-2 p:par-2 e:ent-3');
  });

  it('a la misma hora, el partido va delante', () => {
    const mezcla = mezclarAgenda(
      [partido('par-1', dia(2, 18))],
      [entrenamiento('ent-1', dia(2, 18))],
      AHORA,
    );

    expect(resumen(mezcla)).toBe('p:par-1 e:ent-1');
  });

  it('deja fuera el entrenamiento de ayer y el de dentro de quince días', () => {
    const mezcla = mezclarAgenda(
      [],
      [
        entrenamiento('ayer', dia(-1, 23, 59)),
        entrenamiento('quince', dia(DIAS_EN_EL_CALENDARIO + 1, 0, 0)),
      ],
      AHORA,
    );

    expect(mezcla).toEqual([]);
  });

  it('entran el de hoy a las 09:00, con la hora ya pasada, y el del día catorce', () => {
    const mezcla = mezclarAgenda(
      [],
      [
        entrenamiento('catorce', dia(DIAS_EN_EL_CALENDARIO, 23, 59)),
        entrenamiento('hoy', dia(0, 9)),
      ],
      AHORA,
    );

    expect(resumen(mezcla)).toBe('e:hoy e:catorce');
  });

  it('los partidos no se filtran ni cambian de orden entre ellos', () => {
    // Un partido de hace un mes que nadie ha empezado sigue por jugar, y uno
    // de dentro de tres meses también: la ventana es solo de entrenamientos.
    const mezcla = mezclarAgenda(
      [partido('viejo', dia(-30)), partido('lejano', dia(90))],
      [entrenamiento('ent-1', dia(1))],
      AHORA,
    );

    expect(resumen(mezcla)).toBe('p:viejo e:ent-1 p:lejano');
  });

  it('compara instantes, no letras: `Z` y `+00:00` son la misma hora', () => {
    const instante = new Date(2026, 9, 12, 18, 0).toISOString();
    const mezcla = mezclarAgenda(
      [partido('par-1', instante.replace('Z', '+00:00'))],
      [entrenamiento('ent-1', instante)],
      AHORA,
    );

    expect(resumen(mezcla)).toBe('p:par-1 e:ent-1');
  });
});

describe('proximoEntrenamiento', () => {
  it('devuelve el primero dentro de siete días', () => {
    const proximo = proximoEntrenamiento(
      [
        entrenamiento('siete', dia(DIAS_EN_INICIO, 23, 59)),
        entrenamiento('ayer', dia(-1)),
        entrenamiento('pasado-manana', dia(2)),
      ],
      AHORA,
    );

    expect(proximo?.id).toBe('pasado-manana');
  });

  it('el de hoy cuenta todo el día, también después de su hora', () => {
    const proximo = proximoEntrenamiento(
      [entrenamiento('manana', dia(1)), entrenamiento('hoy', dia(0, 9))],
      AHORA,
    );

    expect(proximo?.id).toBe('hoy');
  });

  it('`null` si no hay ninguno dentro de siete días', () => {
    expect(proximoEntrenamiento([], AHORA)).toBeNull();
    expect(
      proximoEntrenamiento(
        [entrenamiento('ayer', dia(-1)), entrenamiento('ocho', dia(DIAS_EN_INICIO + 1, 0, 0))],
        AHORA,
      ),
    ).toBeNull();
  });
});

describe('esHoy', () => {
  it('mira el día en la hora del móvil', () => {
    expect(esHoy(dia(0, 0, 0), AHORA)).toBe(true);
    expect(esHoy(dia(0, 23, 59), AHORA)).toBe(true);
    expect(esHoy(dia(1, 0, 0), AHORA)).toBe(false);
    expect(esHoy(dia(-1, 23, 59), AHORA)).toBe(false);
  });
});

describe('tieneFuncion', () => {
  const MIEMBRO = { team: { id: 'eq-1' }, seguidor: false };
  const SEGUIDOR = { team: { id: 'eq-2' }, seguidor: true };

  it('con función en el equipo, sí; siguiéndolo, no', () => {
    expect(tieneFuncion([MIEMBRO, SEGUIDOR], 'eq-1')).toBe(true);
    expect(tieneFuncion([MIEMBRO, SEGUIDOR], 'eq-2')).toBe(false);
  });

  it('una membresía que no dice si es de seguidor es de miembro', () => {
    expect(tieneFuncion([{ team: { id: 'eq-1' } }], 'eq-1')).toBe(true);
  });

  it('sin equipos, sin equipo activo o con otro equipo, no', () => {
    expect(tieneFuncion(null, 'eq-1')).toBe(false);
    expect(tieneFuncion([MIEMBRO], null)).toBe(false);
    expect(tieneFuncion([MIEMBRO], 'eq-9')).toBe(false);
  });
});
