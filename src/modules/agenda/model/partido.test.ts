// Lógica pura del calendario, A09 y A10 (T-204).

import { describe, expect, it } from 'vitest';

import {
  aInstante,
  campoDeCasaPropuesto,
  enfrentamiento,
  LARGO_CAMPO,
  NOMBRES_DE_ESTADO,
  partesDeInstante,
  separarCalendario,
  sePuedeEditar,
  tieneCierre,
  ultimoCampoDeCasa,
  validarPartido,
} from './partido';

import type { FormularioPartido } from './partido';

// Fechas construidas en hora local: las pruebas valen en cualquier zona.
const AHORA = new Date(2026, 9, 10, 12, 0);

const BIEN: FormularioPartido = {
  competicionId: 'comp-1',
  rivalId: 'eq-2',
  enCasa: true,
  fecha: '2026-10-25',
  hora: '11:30',
  campo: '  Campo de Fútbol  Izquierdo Rodríguez ',
  enDiferido: false,
};

describe('aInstante y partesDeInstante', () => {
  it('fecha y hora locales van y vuelven sin moverse', () => {
    const instante = aInstante('2026-10-25', '11:30');

    expect(instante).not.toBeNull();
    expect(partesDeInstante(instante ?? '')).toEqual({ fecha: '2026-10-25', hora: '11:30' });
  });

  it('el instante es la hora local convertida a UTC, como la guarda la base', () => {
    expect(aInstante('2026-10-25', '11:30')).toBe(new Date(2026, 9, 25, 11, 30).toISOString());
  });

  it('una fecha u hora mal escrita no da instante', () => {
    expect(aInstante('', '11:30')).toBeNull();
    expect(aInstante('2026-10-25', '')).toBeNull();
    expect(aInstante('2026-13-40', '11:30')).toBeNull();
    expect(aInstante('2026-10-25', '25:00')).toBeNull();
    expect(aInstante('2026-02-31', '11:30')).toBeNull();
  });

  it('los minutos de más no pasan a la hora siguiente del mismo día', () => {
    // `Date` convertiría 10:60 en 11:00 sin quejarse, y en el mismo día.
    expect(aInstante('2026-10-25', '10:60')).toBeNull();
  });
});

describe('validarPartido', () => {
  it('devuelve las columnas de `matches` con el campo limpio', () => {
    expect(validarPartido(BIEN, AHORA)).toEqual({
      errores: {},
      valores: {
        competition_id: 'comp-1',
        opponent_team_id: 'eq-2',
        is_home: true,
        kickoff_at: new Date(2026, 9, 25, 11, 30).toISOString(),
        venue: 'Campo de Fútbol Izquierdo Rodríguez',
        is_retroactive: false,
      },
    });
  });

  it('el campo vacío se guarda como nulo y tiene un largo máximo', () => {
    expect(validarPartido({ ...BIEN, campo: '  ' }, AHORA).valores?.venue).toBeNull();
    expect(
      validarPartido({ ...BIEN, campo: 'a'.repeat(LARGO_CAMPO + 1) }, AHORA).errores.campo,
    ).toBe(`Como mucho ${LARGO_CAMPO} caracteres.`);
  });

  it('competición, rival, fecha y hora son obligatorios', () => {
    const { errores, valores } = validarPartido(
      { ...BIEN, competicionId: '', rivalId: '', fecha: '', hora: '' },
      AHORA,
    );

    expect(valores).toBeNull();
    expect(errores).toEqual({
      competicionId: 'Elige la competición.',
      rivalId: 'Elige el rival.',
      fecha: 'Escribe la fecha.',
      hora: 'Escribe la hora.',
    });
  });

  it('un partido en diferido ya se jugó: su fecha es anterior a ahora', () => {
    expect(validarPartido({ ...BIEN, enDiferido: true }, AHORA).errores.fecha).toBe(
      'Un partido en diferido ya se jugó: la fecha tiene que ser anterior a ahora.',
    );
    expect(
      validarPartido({ ...BIEN, enDiferido: true, fecha: '2026-10-04' }, AHORA).valores
        ?.is_retroactive,
    ).toBe(true);
  });
});

describe('separarCalendario', () => {
  const partido = (
    status: 'scheduled' | 'called' | 'live' | 'suspended' | 'finished' | 'closed',
    dia: number,
  ) => ({
    status,
    kickoffAt: new Date(2026, 9, dia, 11, 0).toISOString(),
  });

  it('por jugar, del más cercano al más lejano; jugados, del más reciente al más antiguo', () => {
    const { proximos, jugados } = separarCalendario([
      partido('scheduled', 25),
      partido('closed', 4),
      partido('called', 18),
      partido('finished', 11),
      partido('suspended', 1),
      partido('live', 10),
    ]);

    expect(proximos.map((p) => p.status)).toEqual(['live', 'called', 'scheduled']);
    expect(jugados.map((p) => p.status)).toEqual(['finished', 'closed', 'suspended']);
  });
});

describe('ultimoCampoDeCasa', () => {
  it('el campo del partido en casa más reciente que lo tenga', () => {
    expect(
      ultimoCampoDeCasa([
        { isHome: true, venue: 'Viejo', kickoffAt: new Date(2026, 8, 1).toISOString() },
        { isHome: false, venue: 'Campo del rival', kickoffAt: new Date(2026, 9, 20).toISOString() },
        { isHome: true, venue: null, kickoffAt: new Date(2026, 9, 18).toISOString() },
        {
          isHome: true,
          venue: 'Izquierdo Rodríguez',
          kickoffAt: new Date(2026, 9, 11).toISOString(),
        },
      ]),
    ).toBe('Izquierdo Rodríguez');
  });

  it('sin partidos en casa con campo, vacío', () => {
    expect(ultimoCampoDeCasa([])).toBe('');
  });
});

describe('campoDeCasaPropuesto', () => {
  const ANTERIOR = [
    { isHome: true, venue: 'Campo Municipal', kickoffAt: new Date(2026, 8, 1).toISOString() },
  ];

  it('manda el campo de casa del club, limpio, aunque haya partidos anteriores', () => {
    expect(campoDeCasaPropuesto('  Campo de Fútbol  Izquierdo Rodríguez ', ANTERIOR)).toBe(
      'Campo de Fútbol Izquierdo Rodríguez',
    );
  });

  it('sin campo en el club, el del último partido en casa', () => {
    expect(campoDeCasaPropuesto(null, ANTERIOR)).toBe('Campo Municipal');
    expect(campoDeCasaPropuesto('   ', ANTERIOR)).toBe('Campo Municipal');
  });

  it('sin ninguno de los dos, vacío', () => {
    expect(campoDeCasaPropuesto(null, [])).toBe('');
  });
});

describe('enfrentamiento', () => {
  it('el de casa va primero', () => {
    expect(enfrentamiento({ isHome: true, opponentName: 'UD Orotava' }, 'Cadete A')).toBe(
      'Cadete A – UD Orotava',
    );
    expect(enfrentamiento({ isHome: false, opponentName: 'UD Orotava' }, 'Cadete A')).toBe(
      'UD Orotava – Cadete A',
    );
  });
});

describe('estados', () => {
  it('se edita antes de jugarse y no después', () => {
    expect(sePuedeEditar('scheduled')).toBe(true);
    expect(sePuedeEditar('called')).toBe(true);
    for (const estado of ['live', 'suspended', 'finished', 'closed'] as const) {
      expect(sePuedeEditar(estado)).toBe(false);
    }
  });

  it('cada estado tiene su nombre en español', () => {
    expect(NOMBRES_DE_ESTADO).toEqual({
      scheduled: 'Programado',
      called: 'Convocado',
      live: 'En juego',
      suspended: 'Suspendido',
      finished: 'Terminado, sin cerrar',
      closed: 'Cerrado',
    });
  });
});

describe('tieneCierre', () => {
  it('terminado, suspendido o cerrado, siempre, en diferido o no', () => {
    for (const isRetroactive of [false, true]) {
      expect(tieneCierre({ status: 'finished', isRetroactive })).toBe(true);
      expect(tieneCierre({ status: 'suspended', isRetroactive })).toBe(true);
      expect(tieneCierre({ status: 'closed', isRetroactive })).toBe(true);
    }
  });

  it('convocado o en juego, solo en diferido', () => {
    expect(tieneCierre({ status: 'called', isRetroactive: true })).toBe(true);
    expect(tieneCierre({ status: 'called', isRetroactive: false })).toBe(false);
    expect(tieneCierre({ status: 'live', isRetroactive: true })).toBe(true);
    expect(tieneCierre({ status: 'live', isRetroactive: false })).toBe(false);
  });

  it('programado, nunca, en diferido o no', () => {
    expect(tieneCierre({ status: 'scheduled', isRetroactive: false })).toBe(false);
    expect(tieneCierre({ status: 'scheduled', isRetroactive: true })).toBe(false);
  });
});
