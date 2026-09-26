// Reglamento de la competición, A08 (T-203). DOC 04 §4.1 y §4.2.
//
// Lo que se vigila: que los rangos sean los mismos que las restricciones de la
// base, que el cadete salga con los valores que Isaac confirmó el 26/09 y que
// la duración nunca sea una constante.

import { describe, expect, it } from 'vitest';

import {
  aFormulario,
  duracionDeJuego,
  LARGO_NOMBRE_COMPETICION,
  LIMITES,
  NOMBRES_DE_EVENTO,
  NOMBRES_DE_TIPO,
  REGLAMENTO_CADETE,
  resumenDelReglamento,
  TIPOS_DEL_MVP,
  validarCompeticion,
} from './competicion';

import type { FormularioReglamento } from './competicion';

const CADETE_G2 = {
  ...REGLAMENTO_CADETE,
  name: 'Cadete Primera Tenerife G2',
  kind: 'league' as const,
};

function formulario(cambios: Partial<FormularioReglamento> = {}): FormularioReglamento {
  return { ...aFormulario(CADETE_G2), ...cambios };
}

describe('REGLAMENTO_CADETE', () => {
  it('son los valores del DOC 04 §4.2 que confirmó Isaac: 2 × 40, cambios fijos, 5, sin reentrada', () => {
    expect(REGLAMENTO_CADETE).toEqual({
      periods_count: 2,
      period_minutes: 40,
      halftime_minutes: 15,
      clock_mode: 'running',
      substitution_type: 'fixed',
      substitutions_max: 5,
      squad_max: 18,
      players_on_pitch: 11,
      yellow_cards_for_ban: 5,
      red_card_default_bans: 1,
      enabled_event_types: TIPOS_DEL_MVP,
    });
  });

  it('enciende los once tipos del MVP y ninguno de los ocho apagados', () => {
    expect([...TIPOS_DEL_MVP].sort()).toEqual(
      [
        'goal',
        'own_goal',
        'yellow_card',
        'second_yellow',
        'red_card',
        'foul_committed',
        'foul_received',
        'corner',
        'substitution',
        'position_change',
        'note',
      ].sort(),
    );
  });
});

describe('LIMITES', () => {
  it('son los de las restricciones `check` de `competitions`', () => {
    expect(LIMITES).toEqual({
      periods_count: { min: 1, max: 4 },
      period_minutes: { min: 10, max: 60 },
      halftime_minutes: { min: 0, max: 30 },
      substitutions_max: { min: 0, max: 99 },
      squad_max: { min: 5, max: 30 },
      players_on_pitch: { min: 5, max: 11 },
      yellow_cards_for_ban: { min: 0, max: 20 },
      red_card_default_bans: { min: 0, max: 10 },
    });
  });
});

describe('duracionDeJuego', () => {
  it('sale de partes por minutos, nunca de una constante', () => {
    expect(duracionDeJuego(REGLAMENTO_CADETE)).toBe(80);
    expect(duracionDeJuego({ periods_count: 4, period_minutes: 12 })).toBe(48);
  });
});

describe('validarCompeticion', () => {
  it('ida y vuelta: el formulario del cadete vuelve a dar el cadete', () => {
    expect(validarCompeticion(formulario(), [])).toEqual({ errores: {}, valores: CADETE_G2 });
  });

  it('limpia el nombre y lo exige', () => {
    expect(validarCompeticion(formulario({ name: '  Cadete  Primera ' }), []).valores?.name).toBe(
      'Cadete Primera',
    );
    expect(validarCompeticion(formulario({ name: ' ' }), []).errores.name).toBe(
      'Escribe el nombre de la competición.',
    );
    expect(
      validarCompeticion(formulario({ name: 'a'.repeat(LARGO_NOMBRE_COMPETICION + 1) }), []).errores
        .name,
    ).toBe(`Como mucho ${LARGO_NOMBRE_COMPETICION} caracteres.`);
  });

  it('no deja repetir el nombre en la temporada, sin mirar mayúsculas', () => {
    const otras = [{ id: 'comp-1', name: 'Cadete Primera Tenerife G2' }];

    expect(
      validarCompeticion(formulario({ name: 'cadete primera tenerife g2' }), otras).errores.name,
    ).toBe('Ya hay una competición con ese nombre esta temporada.');
    expect(validarCompeticion(formulario(), otras, 'comp-1').valores).not.toBeNull();
  });

  it('cada número dentro de su rango, entero y escrito', () => {
    const resultado = validarCompeticion(
      formulario({
        period_minutes: '90',
        periods_count: '0',
        squad_max: '',
        substitutions_max: '2.5',
      }),
      [],
    );

    expect(resultado.valores).toBeNull();
    expect(resultado.errores.period_minutes).toBe('Entre 10 y 60.');
    expect(resultado.errores.periods_count).toBe('Entre 1 y 4.');
    expect(resultado.errores.squad_max).toBe('Entre 5 y 30.');
    expect(resultado.errores.substitutions_max).toBe('Entre 0 y 99.');
  });

  it('los titulares no pueden ser más que los convocados', () => {
    expect(
      validarCompeticion(formulario({ squad_max: '9', players_on_pitch: '11' }), []).errores
        .players_on_pitch,
    ).toBe('No puede haber más titulares que convocados.');
  });

  it('necesita al menos un tipo de evento encendido', () => {
    expect(
      validarCompeticion(formulario({ enabled_event_types: [] }), []).errores.enabled_event_types,
    ).toBe('Deja al menos un botón encendido para el directo.');
  });
});

describe('resumenDelReglamento', () => {
  it('cuenta en una línea lo que importa del cadete', () => {
    expect(resumenDelReglamento(REGLAMENTO_CADETE)).toBe(
      '2 × 40 min · 5 cambios fijos, sin reentrada · 18 convocados, 11 titulares',
    );
  });

  it('cambios volantes y sin límite', () => {
    expect(
      resumenDelReglamento({
        ...REGLAMENTO_CADETE,
        periods_count: 4,
        period_minutes: 12,
        substitution_type: 'rolling',
        substitutions_max: 99,
        squad_max: 12,
        players_on_pitch: 7,
      }),
    ).toBe('4 × 12 min · cambios volantes sin límite · 12 convocados, 7 titulares');
  });
});

describe('nombres', () => {
  it('cada tipo de competición y de evento tiene su nombre en español', () => {
    expect(NOMBRES_DE_TIPO).toEqual({ league: 'Liga', cup: 'Copa', friendly: 'Amistosos' });
    expect(Object.keys(NOMBRES_DE_EVENTO)).toHaveLength(19);
    expect(NOMBRES_DE_EVENTO.second_yellow).toBe('Segunda amarilla');
  });
});
