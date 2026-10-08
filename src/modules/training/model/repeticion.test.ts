// Lógica pura de «Repetir cada semana», en el alta de la A15b (T-230).
//
// `aInstante` se dobla: lo que se vigila del cambio de hora es que cada fecha
// de la tanda pasa por ella con su hora, y no que se le sumen semanas a un
// instante. Salvo que una prueba diga otra cosa, el doble llama a la de verdad.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  diaDeLaFecha,
  DIAS,
  fechasSemanales,
  MAXIMO_DE_LA_TANDA,
  planDeLaTanda,
  validarRepeticion,
} from './repeticion';

const instante = vi.hoisted(() => ({
  aInstante: vi.fn<(fecha: string, hora: string) => string | null>(),
}));

vi.mock('@shared/lib/instante', async () => {
  const real = await vi.importActual<typeof import('@shared/lib/instante')>('@shared/lib/instante');

  return { ...real, aInstante: instante.aInstante };
});

beforeEach(async () => {
  const real = await vi.importActual<typeof import('@shared/lib/instante')>('@shared/lib/instante');

  instante.aInstante.mockReset();
  instante.aInstante.mockImplementation(real.aInstante);
});

/** El instante de una fecha a una hora, en la hora local: vale en cualquier zona. */
function local(anio: number, mes: number, dia: number, horas = 18, minutos = 0): string {
  return new Date(anio, mes - 1, dia, horas, minutos).toISOString();
}

describe('DIAS', () => {
  it('son los siete, de lunes a domingo, con su nombre', () => {
    expect(DIAS).toEqual([
      { dia: 1, nombre: 'Lunes' },
      { dia: 2, nombre: 'Martes' },
      { dia: 3, nombre: 'Miércoles' },
      { dia: 4, nombre: 'Jueves' },
      { dia: 5, nombre: 'Viernes' },
      { dia: 6, nombre: 'Sábado' },
      { dia: 7, nombre: 'Domingo' },
    ]);
  });
});

describe('diaDeLaFecha', () => {
  it('el 13 de octubre de 2026 es martes, y el domingo es el 7', () => {
    expect(diaDeLaFecha('2026-10-13')).toBe(2);
    expect(diaDeLaFecha('2026-10-12')).toBe(1);
    expect(diaDeLaFecha('2026-10-18')).toBe(7);
  });

  it('una fecha que no existe o mal escrita no tiene día', () => {
    expect(diaDeLaFecha('2026-02-31')).toBeNull();
    expect(diaDeLaFecha('')).toBeNull();
    expect(diaDeLaFecha('13/10/2026')).toBeNull();
  });
});

describe('fechasSemanales', () => {
  it('martes y jueves del 13 al 29 de octubre son seis, en orden y con los dos extremos', () => {
    expect(fechasSemanales({ desde: '2026-10-13', hasta: '2026-10-29', dias: [4, 2] })).toEqual([
      '2026-10-13',
      '2026-10-15',
      '2026-10-20',
      '2026-10-22',
      '2026-10-27',
      '2026-10-29',
    ]);
  });

  it('cruza el fin de mes, el fin de año y el 29 de febrero sin saltarse ni repetir ninguna', () => {
    const todos = DIAS.map(({ dia }) => dia);

    expect(fechasSemanales({ desde: '2026-10-26', hasta: '2026-11-09', dias: [1] })).toEqual([
      '2026-10-26',
      '2026-11-02',
      '2026-11-09',
    ]);
    expect(fechasSemanales({ desde: '2026-12-29', hasta: '2027-01-03', dias: todos })).toEqual([
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
      '2027-01-03',
    ]);
    expect(fechasSemanales({ desde: '2028-02-28', hasta: '2028-03-01', dias: todos })).toEqual([
      '2028-02-28',
      '2028-02-29',
      '2028-03-01',
    ]);
  });

  it('un solo día entra si es de los elegidos, y si no, no sale ninguno', () => {
    expect(fechasSemanales({ desde: '2026-10-13', hasta: '2026-10-13', dias: [2] })).toEqual([
      '2026-10-13',
    ]);
    expect(fechasSemanales({ desde: '2026-10-13', hasta: '2026-10-13', dias: [3] })).toEqual([]);
  });

  it('sin días, con el final antes del principio o con una fecha imposible, ninguna', () => {
    expect(fechasSemanales({ desde: '2026-10-13', hasta: '2026-10-29', dias: [] })).toEqual([]);
    expect(fechasSemanales({ desde: '2026-10-29', hasta: '2026-10-13', dias: [2] })).toEqual([]);
    expect(fechasSemanales({ desde: '2026-02-31', hasta: '2026-10-13', dias: [2] })).toEqual([]);
    expect(fechasSemanales({ desde: '2026-10-13', hasta: '', dias: [2] })).toEqual([]);
  });

  it('no pasa por instantes: no llama a `aInstante`', () => {
    fechasSemanales({ desde: '2026-10-13', hasta: '2026-10-29', dias: [2, 4] });

    expect(instante.aInstante).not.toHaveBeenCalled();
  });
});

describe('validarRepeticion', () => {
  const BIEN = {
    desde: '2026-10-13',
    hasta: '2026-12-17',
    dias: [2, 4] as const,
    finDeTemporada: '2027-06-30',
  };

  it('con todo en su sitio no hay errores', () => {
    expect(validarRepeticion(BIEN)).toEqual({});
    // El mismo día de principio y de fin vale: los dos extremos entran.
    expect(validarRepeticion({ ...BIEN, hasta: '2026-10-13' })).toEqual({});
    // Y el último día de la temporada también.
    expect(validarRepeticion({ ...BIEN, hasta: '2027-06-30' })).toEqual({});
  });

  it('sin ningún día, lo pide', () => {
    expect(validarRepeticion({ ...BIEN, dias: [] })).toEqual({ dias: 'Elige al menos un día.' });
  });

  it('sin «hasta», o con una fecha imposible, la pide', () => {
    expect(validarRepeticion({ ...BIEN, hasta: '' })).toEqual({ hasta: 'Indica hasta qué día.' });
    expect(validarRepeticion({ ...BIEN, hasta: '2026-02-31' })).toEqual({
      hasta: 'Indica hasta qué día.',
    });
  });

  it('con «hasta» anterior a «desde», lo dice', () => {
    expect(validarRepeticion({ ...BIEN, hasta: '2026-10-12' })).toEqual({
      hasta: 'Tiene que ser posterior a la fecha de inicio.',
    });
  });

  it('con «hasta» pasada la temporada, dice cuándo termina', () => {
    expect(validarRepeticion({ ...BIEN, hasta: '2027-07-01' })).toEqual({
      hasta: 'La temporada termina el 30 de junio de 2027.',
    });
  });

  it('sin fin de temporada conocido, no se valida contra ella', () => {
    expect(validarRepeticion({ ...BIEN, hasta: '2031-07-01', finDeTemporada: null })).toEqual({});
  });

  it('da los dos errores a la vez, cada uno en su campo', () => {
    expect(validarRepeticion({ ...BIEN, dias: [], hasta: '' })).toEqual({
      dias: 'Elige al menos un día.',
      hasta: 'Indica hasta qué día.',
    });
  });
});

describe('planDeLaTanda', () => {
  it('cada fecha pasa por `aInstante` con su hora, y de ahí salen los nuevos', () => {
    const plan = planDeLaTanda({
      fechas: ['2026-10-13', '2026-10-15'],
      hora: '18:00',
      existentes: [],
    });

    expect(instante.aInstante.mock.calls).toEqual([
      ['2026-10-13', '18:00'],
      ['2026-10-15', '18:00'],
    ]);
    expect(plan).toEqual({
      nuevos: [local(2026, 10, 13), local(2026, 10, 15)],
      repetidos: [],
      imposibles: [],
      error: null,
    });
  });

  it('el instante es el que diga `aInstante` para cada fecha, no el anterior más una semana', () => {
    // Como en una zona que cambia de hora entre las dos fechas: la misma hora
    // de pared cae en un instante que no dista siete días justos.
    instante.aInstante.mockImplementation((fecha) =>
      fecha === '2026-10-20' ? '2026-10-20T17:00:00.000Z' : '2026-10-27T18:00:00.000Z',
    );

    expect(
      planDeLaTanda({ fechas: ['2026-10-20', '2026-10-27'], hora: '18:00', existentes: [] }).nuevos,
    ).toEqual(['2026-10-20T17:00:00.000Z', '2026-10-27T18:00:00.000Z']);
  });

  it('el que ya existe sale en `repetidos`, aunque su texto ISO esté escrito de otra forma', () => {
    // La base escribe `+00:00` donde `toISOString` escribe `.000Z`.
    const comoLaBase = local(2026, 10, 15).replace('.000Z', '+00:00');
    const plan = planDeLaTanda({
      fechas: ['2026-10-13', '2026-10-15', '2026-10-20'],
      hora: '18:00',
      // El del 13 existe, pero a otra hora: ese sí se crea.
      existentes: [comoLaBase, local(2026, 10, 13, 19, 30)],
    });

    expect(comoLaBase).not.toBe(local(2026, 10, 15));
    expect(plan.nuevos).toEqual([local(2026, 10, 13), local(2026, 10, 20)]);
    expect(plan.repetidos).toEqual([local(2026, 10, 15)]);
    expect(plan.imposibles).toEqual([]);
    expect(plan.error).toBeNull();
  });

  it('una fecha en la que esa hora no existe sale en `imposibles`', () => {
    instante.aInstante.mockImplementation((fecha, hora) =>
      fecha === '2026-10-15' ? null : new Date(`${fecha}T${hora}:00.000Z`).toISOString(),
    );

    const plan = planDeLaTanda({
      fechas: ['2026-10-13', '2026-10-15'],
      hora: '02:30',
      existentes: [],
    });

    expect(plan.nuevos).toEqual(['2026-10-13T02:30:00.000Z']);
    expect(plan.imposibles).toEqual(['2026-10-15']);
    expect(plan.error).toBeNull();
  });

  it('con 150 nuevos pasa, y con 151 dice que son demasiados', () => {
    const todos = DIAS.map(({ dia }) => dia);
    const fechas = fechasSemanales({ desde: '2026-09-01', hasta: '2027-01-29', dias: todos });

    expect(MAXIMO_DE_LA_TANDA).toBe(150);
    expect(fechas).toHaveLength(151);
    expect(
      planDeLaTanda({ fechas: fechas.slice(0, 150), hora: '18:00', existentes: [] }).error,
    ).toBeNull();

    const plan = planDeLaTanda({ fechas, hora: '18:00', existentes: [] });

    expect(plan.nuevos).toHaveLength(151);
    expect(plan.error).toBe('Son demasiados de una vez: como mucho, 150.');
  });

  it('los que ya existen no cuentan para el máximo', () => {
    const todos = DIAS.map(({ dia }) => dia);
    const fechas = fechasSemanales({ desde: '2026-09-01', hasta: '2027-01-29', dias: todos });
    const plan = planDeLaTanda({ fechas, hora: '18:00', existentes: [local(2026, 9, 1)] });

    expect(plan.nuevos).toHaveLength(150);
    expect(plan.repetidos).toHaveLength(1);
    expect(plan.error).toBeNull();
  });

  it('con cero nuevos, dice que no hay ninguno que crear', () => {
    expect(planDeLaTanda({ fechas: [], hora: '18:00', existentes: [] }).error).toBe(
      'No hay ninguno que crear en esas fechas.',
    );

    const plan = planDeLaTanda({
      fechas: ['2026-10-13'],
      hora: '18:00',
      existentes: [local(2026, 10, 13)],
    });

    expect(plan.nuevos).toEqual([]);
    expect(plan.repetidos).toEqual([local(2026, 10, 13)]);
    expect(plan.error).toBe('No hay ninguno que crear en esas fechas.');
  });

  it('un rango desmedido no cuelga la pantalla: se corta y sale como demasiados', () => {
    const todos = DIAS.map(({ dia }) => dia);
    const fechas = fechasSemanales({ desde: '1900-01-01', hasta: '9999-12-31', dias: todos });

    expect(fechas.length).toBeLessThanOrEqual(1000);
    expect(fechas[0]).toBe('1900-01-01');

    // Aunque todos existieran ya, una lista cortada nunca pasa por buena.
    const plan = planDeLaTanda({
      fechas,
      hora: '18:00',
      existentes: fechas.map((fecha) => `${fecha}T18:00:00.000Z`),
    });

    expect(plan.error).toBe('Son demasiados de una vez: como mucho, 150.');
  });
});
