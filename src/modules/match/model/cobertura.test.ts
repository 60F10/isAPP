import { describe, expect, it } from 'vitest';

import {
  alcancesOfrecidos,
  cerrar,
  declarar,
  describirCobertura,
  instanteActual,
  tiposDe,
} from './cobertura';

import type { CoberturaLocal } from './cobertura';
import type { EstadoDirecto, ParteLocal } from './directo';
import type { TipoDeEvento } from '@modules/rules';

const INICIO = Date.UTC(2026, 9, 4, 11, 0, 0);

const ACTIVOS: TipoDeEvento[] = ['goal', 'yellow_card', 'red_card', 'corner', 'substitution'];

function parte(cambios: Partial<ParteLocal> = {}): ParteLocal {
  return {
    id: 'parte-1',
    numero: 1,
    inicio: INICIO,
    pausadoMs: 0,
    pausaDesde: null,
    segundosReales: null,
    ...cambios,
  };
}

function estado(
  cambios: Partial<Pick<EstadoDirecto, 'fase' | 'partes' | 'periodos'>> = {},
): Pick<EstadoDirecto, 'fase' | 'partes' | 'periodos'> {
  return { fase: 'inactivo', partes: [], periodos: 2, ...cambios };
}

describe('instanteActual', () => {
  it('sin partes empezadas es el principio del partido', () => {
    expect(instanteActual(estado(), INICIO)).toEqual({ periodo: 1, segundos: 0 });
  });

  it('en juego es la parte en curso y los segundos del reloj', () => {
    const enJuego = estado({ fase: 'en_juego', partes: [parte()] });

    expect(instanteActual(enJuego, INICIO + 754_000)).toEqual({ periodo: 1, segundos: 754 });
  });

  it('en pausa es el segundo en que se paró el reloj', () => {
    const enPausa = estado({
      fase: 'pausado',
      partes: [parte({ pausaDesde: INICIO + 600_000 })],
    });

    expect(instanteActual(enPausa, INICIO + 900_000)).toEqual({ periodo: 1, segundos: 600 });
  });

  it('en el descanso es el principio de la parte siguiente', () => {
    const descanso = estado({ fase: 'descanso', partes: [parte({ segundosReales: 2460 })] });

    expect(instanteActual(descanso, INICIO + 3_000_000)).toEqual({ periodo: 2, segundos: 0 });
  });

  it('con todas las partes jugadas es el final de la última, no una parte que no existe', () => {
    const partes = [
      parte({ segundosReales: 2460 }),
      parte({ id: 'parte-2', numero: 2, segundosReales: 2520 }),
    ];

    expect(instanteActual(estado({ fase: 'descanso', partes }), INICIO)).toEqual({
      periodo: 2,
      segundos: 2520,
    });
    expect(instanteActual(estado({ fase: 'finalizado', partes }), INICIO)).toEqual({
      periodo: 2,
      segundos: 2520,
    });
  });
});

describe('tiposDe', () => {
  it('todo el equipo y un jugador cubren los tipos activos', () => {
    expect(tiposDe('full_team', ACTIVOS)).toEqual(ACTIVOS);
    expect(tiposDe('single_player', ACTIVOS)).toEqual(ACTIVOS);
  });

  it('goles y tarjetas se cruza con los activos', () => {
    expect(tiposDe('goals_cards', ACTIVOS)).toEqual(['goal', 'yellow_card', 'red_card']);
    expect(
      tiposDe('goals_cards', ['goal', 'own_goal', 'yellow_card', 'second_yellow', 'red_card']),
    ).toEqual(['goal', 'own_goal', 'yellow_card', 'second_yellow', 'red_card']);
  });

  it('nunca se ofrece un alcance que se queda sin tipos', () => {
    expect(alcancesOfrecidos(ACTIVOS)).toEqual(['full_team', 'single_player', 'goals_cards']);
    expect(alcancesOfrecidos(['corner', 'substitution'])).toEqual(['full_team', 'single_player']);
    expect(alcancesOfrecidos([])).toEqual([]);
  });
});

describe('declarar', () => {
  const BASE = {
    id: 'cob-1',
    partidoId: 'par-1',
    userId: 'usuario-1',
    alcance: 'full_team',
    jugador: null,
    tiposActivos: ACTIVOS,
    desde: { periodo: 1, segundos: 754 },
    diferido: false,
  } as const;

  it('da la cobertura local y una fila con quién, qué partido y el `id` del aparato', () => {
    expect(declarar(BASE)).toEqual({
      cobertura: {
        id: 'cob-1',
        // De quién es (T-221): otra cuenta en este aparato no la toma por suya.
        userId: 'usuario-1',
        alcance: 'full_team',
        jugador: null,
        tipos: ACTIVOS,
        desde: { periodo: 1, segundos: 754 },
        abierta: true,
      },
      trabajo: {
        entity: 'coverage',
        op: 'insert',
        matchId: 'par-1',
        payload: {
          valores: {
            id: 'cob-1',
            match_id: 'par-1',
            user_id: 'usuario-1',
            scope: 'full_team',
            target_player_id: null,
            covered_event_types: ACTIVOS,
            start_period: 1,
            start_seconds: 754,
            is_retroactive: false,
          },
        },
      },
    });
  });

  it('un jugador lleva su jugador, y sin él no hay declaración', () => {
    const uno = declarar({ ...BASE, alcance: 'single_player', jugador: 'p7' });

    expect(uno?.cobertura).toMatchObject({ alcance: 'single_player', jugador: 'p7' });
    expect(uno?.trabajo.payload.valores).toMatchObject({
      scope: 'single_player',
      target_player_id: 'p7',
    });
    expect(declarar({ ...BASE, alcance: 'single_player', jugador: null })).toBeNull();
  });

  it('solo goles y tarjetas no arrastra jugador y cubre sus tipos', () => {
    const goles = declarar({ ...BASE, alcance: 'goals_cards', jugador: 'p7' });

    expect(goles?.cobertura).toMatchObject({ jugador: null });
    expect(goles?.trabajo.payload.valores).toMatchObject({
      scope: 'goals_cards',
      target_player_id: null,
      covered_event_types: ['goal', 'yellow_card', 'red_card'],
    });
  });

  it('sin tipos que cubrir no hay declaración: la base no la admite vacía', () => {
    expect(declarar({ ...BASE, alcance: 'goals_cards', tiposActivos: ['corner'] })).toBeNull();
    expect(declarar({ ...BASE, tiposActivos: [] })).toBeNull();
  });

  it('en diferido es de todo el equipo, desde el principio y marcada', () => {
    const diferida = declarar({
      ...BASE,
      alcance: 'single_player',
      jugador: 'p7',
      diferido: true,
    });

    expect(diferida?.cobertura).toMatchObject({
      alcance: 'full_team',
      jugador: null,
      desde: { periodo: 1, segundos: 0 },
    });
    expect(diferida?.trabajo.payload.valores).toMatchObject({
      scope: 'full_team',
      target_player_id: null,
      start_period: 1,
      start_seconds: 0,
      is_retroactive: true,
    });
  });
});

describe('cerrar', () => {
  const ABIERTA: CoberturaLocal = {
    id: 'cob-1',
    alcance: 'full_team',
    jugador: null,
    tipos: ACTIVOS,
    desde: { periodo: 1, segundos: 0 },
    abierta: true,
  };

  it('conserva de quién es al cerrarla', () => {
    const propia = { ...ABIERTA, userId: 'usuario-1' };

    expect(cerrar('par-1', propia, { periodo: 2, segundos: 1200 }).cobertura).toEqual({
      ...propia,
      abierta: false,
    });
  });

  it('da un `update` con la clave del `id` y el instante', () => {
    expect(cerrar('par-1', ABIERTA, { periodo: 2, segundos: 1200 })).toEqual({
      cobertura: { ...ABIERTA, abierta: false },
      trabajo: {
        entity: 'coverage',
        op: 'update',
        matchId: 'par-1',
        payload: { valores: { end_period: 2, end_seconds: 1200 }, clave: { id: 'cob-1' } },
      },
    });
  });
});

describe('describirCobertura', () => {
  const nombre = (id: string) => (id === 'p7' ? '7 · Juanito' : '—');
  const base: CoberturaLocal = {
    id: 'cob-1',
    alcance: 'full_team',
    jugador: null,
    tipos: ACTIVOS,
    desde: { periodo: 1, segundos: 0 },
    abierta: true,
  };

  it('dice qué se sigue en palabras', () => {
    expect(describirCobertura(base, nombre)).toBe('todo el equipo');
    expect(describirCobertura({ ...base, alcance: 'single_player', jugador: 'p7' }, nombre)).toBe(
      '7 · Juanito',
    );
    expect(describirCobertura({ ...base, alcance: 'goals_cards' }, nombre)).toBe(
      'solo goles y tarjetas',
    );
    expect(describirCobertura(null, nombre)).toBe('sin declarar');
  });
});
