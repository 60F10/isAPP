import { describe, expect, it } from 'vitest';

import { aBorrador, botonesActivos, contextoDe, minutoDelFlujo, siguientePaso } from './flujo';

import type { ContextoDeFlujo, Flujo } from './flujo';

const CONTEXTO: ContextoDeFlujo = {
  enCampo: ['p1', 'p7'],
  paraEntrar: ['p8'],
  tarjetables: ['p1', 'p7', 'p8'],
  tiposActivos: [
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
  ],
  diferido: false,
  periodos: 2,
};

function flujo(boton: Flujo['boton'], respuestas: Flujo['respuestas'] = {}): Flujo {
  return { boton, respuestas };
}

describe('botonesActivos', () => {
  it('saca los ocho botones con su definición, y ninguno cuyos tipos estén todos apagados', () => {
    expect(botonesActivos(CONTEXTO.tiposActivos).map((b) => b.boton)).toEqual([
      'gol',
      'tarjeta',
      'falta',
      'corner',
      'cambio',
      'gol_en_propia',
      'posicion',
      'nota',
    ]);
    expect(botonesActivos(['goal', 'corner']).map((b) => b.boton)).toEqual(['gol', 'corner']);
    expect(botonesActivos(['goal'])[0]?.definicion).toBe(
      'Balón que entra y el árbitro concede. No cuenta el gol anulado.',
    );
  });
});

describe('siguientePaso', () => {
  it('gol: de quién, quién marca y la asistencia, que se puede saltar', () => {
    expect(siguientePaso(flujo('gol'), CONTEXTO)).toMatchObject({
      clase: 'opciones',
      clave: 'lado',
      opciones: [
        { valor: 'nuestro', etiqueta: 'Nuestro' },
        { valor: 'rival', etiqueta: 'Del rival' },
      ],
    });
    expect(siguientePaso(flujo('gol', { lado: 'nuestro' }), CONTEXTO)).toMatchObject({
      clase: 'jugador',
      clave: 'jugador',
      candidatos: ['p1', 'p7'],
    });
    expect(siguientePaso(flujo('gol', { lado: 'nuestro', jugador: 'p7' }), CONTEXTO)).toMatchObject(
      {
        clase: 'jugador',
        clave: 'segundo',
        candidatos: ['p1'],
        saltar: 'Sin asistencia',
      },
    );
    expect(
      siguientePaso(flujo('gol', { lado: 'nuestro', jugador: 'p7', segundo: null }), CONTEXTO),
    ).toBeNull();
    expect(siguientePaso(flujo('gol', { lado: 'rival' }), CONTEXTO)).toBeNull();
  });

  it('cambio: sale uno del campo, entra uno de los que pueden, y el motivo se puede saltar', () => {
    expect(siguientePaso(flujo('cambio'), CONTEXTO)).toMatchObject({
      clave: 'jugador',
      candidatos: ['p1', 'p7'],
    });
    expect(siguientePaso(flujo('cambio', { jugador: 'p7' }), CONTEXTO)).toMatchObject({
      clave: 'segundo',
      candidatos: ['p8'],
    });
    expect(
      siguientePaso(flujo('cambio', { jugador: 'p7', segundo: 'p8' }), CONTEXTO),
    ).toMatchObject({ clave: 'motivo', saltar: 'Sin motivo' });
  });

  it('tarjeta: sin roja encendida no la ofrece, y del rival no pide jugador', () => {
    const sinRoja = {
      ...CONTEXTO,
      tiposActivos: CONTEXTO.tiposActivos.filter((t) => t !== 'red_card'),
    };

    expect(siguientePaso(flujo('tarjeta'), sinRoja)).toMatchObject({
      clave: 'color',
      opciones: [{ valor: 'amarilla', etiqueta: 'Amarilla' }],
    });
    expect(siguientePaso(flujo('tarjeta', { color: 'roja', lado: 'rival' }), CONTEXTO)).toBeNull();
    expect(
      siguientePaso(flujo('tarjeta', { color: 'roja', lado: 'nuestro' }), CONTEXTO),
    ).toMatchObject({ clave: 'jugador', candidatos: ['p1', 'p7', 'p8'] });
  });

  it('en diferido, lo primero es la parte y el minuto', () => {
    expect(siguientePaso(flujo('corner'), { ...CONTEXTO, diferido: true })).toEqual({
      clase: 'minuto',
      periodos: 2,
    });
  });

  it('la ficha de jugador salta el lado y el jugador', () => {
    expect(
      siguientePaso(flujo('tarjeta', { lado: 'nuestro', jugador: 'p7' }), CONTEXTO),
    ).toMatchObject({ clave: 'color' });
  });
});

describe('aBorrador', () => {
  it('traduce cada botón a su evento', () => {
    expect(aBorrador(flujo('gol', { lado: 'nuestro', jugador: 'p7', segundo: 'p1' }))).toEqual({
      tipo: 'goal',
      rival: false,
      jugador: 'p7',
      segundo: 'p1',
      detalles: {},
    });
    expect(aBorrador(flujo('corner', { lado: 'rival' }))).toMatchObject({
      tipo: 'corner',
      rival: true,
    });
    expect(
      aBorrador(flujo('tarjeta', { color: 'amarilla', lado: 'nuestro', jugador: 'p1' })),
    ).toMatchObject({ tipo: 'yellow_card', jugador: 'p1' });
    expect(aBorrador(flujo('falta', { clase: 'recibida', jugador: null }))).toMatchObject({
      tipo: 'foul_received',
      jugador: null,
    });
    expect(
      aBorrador(flujo('cambio', { jugador: 'p7', segundo: 'p8', motivo: 'cansancio' })),
    ).toMatchObject({ tipo: 'substitution', detalles: { motivo: 'cansancio' } });
    expect(aBorrador(flujo('posicion', { jugador: 'p7', posicion: 'GK' }))).toMatchObject({
      tipo: 'position_change',
      detalles: { posicion: 'GK' },
    });
    expect(aBorrador(flujo('nota', { jugador: null, texto: '  Viento a favor  ' }))).toMatchObject({
      tipo: 'note',
      detalles: { texto: 'Viento a favor' },
    });
  });
});

describe('minutoDelFlujo', () => {
  it('convierte la parte y el minuto escritos', () => {
    expect(minutoDelFlujo(flujo('corner', { periodo: '2', minuto: '50' }), 40)).toEqual({
      periodo: 2,
      segundos: 540,
    });
    expect(minutoDelFlujo(flujo('corner', { periodo: '1', minuto: '50' }), 40)).toBeNull();
  });
});

describe('contextoDe', () => {
  it('quién puede entrar: convocados fuera del campo, sin expulsados ni, con cambios fijos, sustituidos', () => {
    const contexto = contextoDe({
      enCampo: ['p1', 'p8'],
      convocados: ['p1', 'p7', 'p8', 'p9', 'p10'],
      eventos: [
        {
          clientEventId: 'a',
          tipo: 'substitution',
          periodo: 1,
          segundos: 10,
          rival: false,
          jugador: 'p7',
          segundo: 'p8',
          detalles: {},
          estado: 'approved',
          propio: false,
        },
        {
          clientEventId: 'b',
          tipo: 'red_card',
          periodo: 1,
          segundos: 20,
          rival: false,
          jugador: 'p10',
          segundo: null,
          detalles: {},
          estado: 'approved',
          propio: false,
        },
      ],
      cambiosFijos: true,
      tiposActivos: ['goal'],
      diferido: false,
      periodos: 2,
    });

    expect(contexto.paraEntrar).toEqual(['p9']);
    expect(contexto.tarjetables).toEqual(['p1', 'p7', 'p8', 'p9']);
  });
});
