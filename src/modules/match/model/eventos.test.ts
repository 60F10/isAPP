import { describe, expect, it } from 'vitest';

import {
  amonestados,
  calcularEnCampo,
  calcularPosiciones,
  cambiosHechos,
  desdeFilas,
  expulsados,
  hastaElInstante,
  incorporados,
  leerVentanas,
  marcador,
  parejasRepetidas,
  posiblesRepetidos,
  sustituidos,
} from './eventos';

import type { EventoDelDirecto, Ventanas } from './eventos';

function evento(cambios: Partial<EventoDelDirecto> & { clientEventId: string }): EventoDelDirecto {
  return {
    tipo: 'goal',
    periodo: 1,
    segundos: 0,
    rival: false,
    jugador: null,
    segundo: null,
    detalles: {},
    estado: 'approved',
    propio: false,
    ...cambios,
  };
}

describe('desdeFilas', () => {
  it('traduce las filas de match_events al evento del directo', () => {
    expect(
      desdeFilas([
        {
          client_event_id: 'ce-1',
          event_type: 'goal',
          period: 2,
          seconds: 125,
          is_opponent: false,
          player_id: 'p7',
          secondary_player_id: 'p8',
          details: { origen: 'penalti' },
          status: 'pending',
        },
      ]),
    ).toEqual([
      evento({
        clientEventId: 'ce-1',
        periodo: 2,
        segundos: 125,
        jugador: 'p7',
        segundo: 'p8',
        detalles: { origen: 'penalti' },
        estado: 'pending',
      }),
    ]);
  });
});

describe('quién está en el campo', () => {
  const titulares = ['p1', 'p7', 'p10'];

  it('los cambios y las expulsiones mueven el campo, en orden de parte y segundo', () => {
    const eventos = [
      evento({ clientEventId: 'r', tipo: 'red_card', jugador: 'p12', periodo: 2, segundos: 10 }),
      evento({
        clientEventId: 's',
        tipo: 'substitution',
        jugador: 'p7',
        segundo: 'p12',
        periodo: 1,
        segundos: 600,
      }),
      evento({
        clientEventId: 'y',
        tipo: 'second_yellow',
        jugador: 'p10',
        periodo: 1,
        segundos: 900,
      }),
    ];

    expect(calcularEnCampo(titulares, eventos)).toEqual(['p1']);
  });

  it('lo rechazado no cuenta; lo pendiente, sí (DOC 04 §6.5)', () => {
    const eventos = [
      evento({
        clientEventId: 's',
        tipo: 'substitution',
        jugador: 'p7',
        segundo: 'p12',
        estado: 'pending',
      }),
      evento({ clientEventId: 'r', tipo: 'red_card', jugador: 'p1', estado: 'rejected' }),
    ];

    expect(calcularEnCampo(titulares, eventos)).toEqual(['p1', 'p10', 'p12']);
  });

  it('un cambio cuyo entrante ya está en el campo no duplica a nadie', () => {
    const eventos = [
      evento({ clientEventId: 's', tipo: 'substitution', jugador: 'p7', segundo: 'p10' }),
    ];

    expect(calcularEnCampo(titulares, eventos)).toEqual(['p1', 'p10']);
  });
});

describe('listas derivadas', () => {
  const eventos = [
    evento({ clientEventId: 'a', tipo: 'yellow_card', jugador: 'p1' }),
    evento({ clientEventId: 'b', tipo: 'yellow_card', jugador: 'p2', estado: 'rejected' }),
    evento({ clientEventId: 'c', tipo: 'red_card', jugador: 'p3' }),
    evento({ clientEventId: 'd', tipo: 'second_yellow', jugador: 'p4' }),
    evento({ clientEventId: 'e', tipo: 'substitution', jugador: 'p5', segundo: 'p6' }),
    evento({ clientEventId: 'f', tipo: 'substitution', jugador: 'p7', segundo: 'p8' }),
    evento({ clientEventId: 'g', tipo: 'yellow_card', jugador: 'x', rival: true }),
  ];

  it('amonestados, expulsados, sustituidos y cambios hechos', () => {
    expect([...amonestados(eventos)]).toEqual(['p1']);
    expect([...expulsados(eventos)].sort()).toEqual(['p3', 'p4']);
    expect([...sustituidos(eventos)].sort()).toEqual(['p5', 'p7']);
    expect(cambiosHechos(eventos)).toBe(2);
  });
});

describe('calcularPosiciones', () => {
  it('el cambio de posición manda sobre la de la convocatoria, y quien entra hereda nada', () => {
    const posiciones = calcularPosiciones({ p1: 'GK', p7: 'FW' }, [
      evento({
        clientEventId: 'a',
        tipo: 'position_change',
        jugador: 'p7',
        detalles: { posicion: 'GK' },
      }),
      evento({
        clientEventId: 'b',
        tipo: 'position_change',
        jugador: 'p1',
        detalles: { posicion: 'DF' },
        estado: 'rejected',
      }),
    ]);

    expect(posiciones).toEqual({ p1: 'GK', p7: 'GK' });
  });
});

describe('marcador', () => {
  it('suma goles y goles en propia de cada lado, con los pendientes y sin los rechazados', () => {
    expect(
      marcador([
        evento({ clientEventId: '1', tipo: 'goal' }),
        evento({ clientEventId: '2', tipo: 'goal', estado: 'pending' }),
        evento({ clientEventId: '3', tipo: 'goal', estado: 'rejected' }),
        evento({ clientEventId: '4', tipo: 'own_goal', rival: true }),
        evento({ clientEventId: '5', tipo: 'goal', rival: true }),
        evento({ clientEventId: '6', tipo: 'own_goal' }),
        evento({ clientEventId: '7', tipo: 'corner' }),
      ]),
    ).toEqual({ aFavor: 3, enContra: 2, pendientes: 1 });
  });
});

describe('hastaElInstante', () => {
  const eventos = [
    evento({ clientEventId: 'parte-anterior', periodo: 1, segundos: 2_000 }),
    evento({ clientEventId: 'antes', periodo: 2, segundos: 100 }),
    evento({ clientEventId: 'mismo-segundo', periodo: 2, segundos: 300 }),
    evento({ clientEventId: 'despues', periodo: 2, segundos: 301 }),
    evento({ clientEventId: 'sin-segundos', periodo: 1, segundos: null }),
    evento({ clientEventId: 'parte-posterior', periodo: 3, segundos: 0 }),
  ];

  it('deja los de una parte anterior y los de la misma parte hasta ese segundo, incluido', () => {
    expect(
      hastaElInstante(eventos, { periodo: 2, segundos: 300 }).map((e) => e.clientEventId),
    ).toEqual(['parte-anterior', 'antes', 'mismo-segundo']);
  });

  it('los que no tienen segundos quedan fuera, también los de una parte anterior', () => {
    expect(
      hastaElInstante(eventos, { periodo: 3, segundos: 0 }).map((e) => e.clientEventId),
    ).not.toContain('sin-segundos');
  });
});

describe('incorporados', () => {
  it('quienes entran en un cambio, sin los rechazados ni los del rival', () => {
    expect(
      incorporados([
        evento({ clientEventId: 'a', tipo: 'substitution', jugador: 'p7', segundo: 'p8' }),
        evento({
          clientEventId: 'b',
          tipo: 'substitution',
          jugador: 'p1',
          segundo: 'p9',
          estado: 'rejected',
        }),
        evento({ clientEventId: 'c', tipo: 'goal', jugador: 'p1', segundo: 'p10' }),
      ]),
    ).toEqual(new Set(['p8']));
  });
});

// T-209b: el aviso de posible repetido del directo (DOC 04 §9.2).
describe('posiblesRepetidos', () => {
  const VENTANAS: Ventanas = { default: 30, by_type: { goal: 30, corner: 10 } };

  it('dos goles propios seguidos no son repetidos: los apuntó el mismo aparato', () => {
    const eventos = [
      evento({ clientEventId: 'a', segundos: 100, propio: true }),
      evento({ clientEventId: 'b', segundos: 110, propio: true }),
    ];

    expect(posiblesRepetidos(eventos, VENTANAS)).toEqual(new Set());
  });

  it('uno propio y uno de otro aparato a 20 s, sí; a 40 s, no', () => {
    const propio = evento({ clientEventId: 'a', segundos: 100, propio: true });

    expect(
      posiblesRepetidos([propio, evento({ clientEventId: 'b', segundos: 120 })], VENTANAS),
    ).toEqual(new Set(['a', 'b']));
    expect(
      posiblesRepetidos([propio, evento({ clientEventId: 'b', segundos: 140 })], VENTANAS),
    ).toEqual(new Set());
  });

  it('dos de otros aparatos también: no se sabe si son del mismo', () => {
    const eventos = [
      evento({ clientEventId: 'a', segundos: 100 }),
      evento({ clientEventId: 'b', segundos: 95 }),
    ];

    expect(posiblesRepetidos(eventos, VENTANAS)).toEqual(new Set(['a', 'b']));
  });

  it('un córner a 20 s no lo es: su ventana es más corta', () => {
    const eventos = [
      evento({ clientEventId: 'a', tipo: 'corner', segundos: 100, propio: true }),
      evento({ clientEventId: 'b', tipo: 'corner', segundos: 120 }),
    ];

    expect(posiblesRepetidos(eventos, VENTANAS)).toEqual(new Set());
  });

  it('el borde de la ventana cuenta, como en la base', () => {
    const eventos = [
      evento({ clientEventId: 'a', segundos: 100, propio: true }),
      evento({ clientEventId: 'b', segundos: 130 }),
    ];

    expect(posiblesRepetidos(eventos, VENTANAS)).toEqual(new Set(['a', 'b']));
  });

  it('un rechazado no cuenta', () => {
    const eventos = [
      evento({ clientEventId: 'a', segundos: 100, propio: true }),
      evento({ clientEventId: 'b', segundos: 105, estado: 'rejected' }),
    ];

    expect(posiblesRepetidos(eventos, VENTANAS)).toEqual(new Set());
  });

  it('distinto tipo, distinto bando o distinta parte, tampoco', () => {
    const propio = evento({ clientEventId: 'a', segundos: 100, propio: true });

    for (const otro of [
      evento({ clientEventId: 'b', segundos: 105, tipo: 'own_goal' }),
      evento({ clientEventId: 'b', segundos: 105, rival: true }),
      evento({ clientEventId: 'b', segundos: 105, periodo: 2 }),
    ]) {
      expect(posiblesRepetidos([propio, otro], VENTANAS)).toEqual(new Set());
    }
  });

  it('sin segundos no se comparan', () => {
    const eventos = [
      evento({ clientEventId: 'a', segundos: null, propio: true }),
      evento({ clientEventId: 'b', segundos: null }),
    ];

    expect(posiblesRepetidos(eventos, VENTANAS)).toEqual(new Set());
  });

  it('sin ventanas en el paquete, 30 s para todo', () => {
    const eventos = [
      evento({ clientEventId: 'a', tipo: 'corner', segundos: 100, propio: true }),
      evento({ clientEventId: 'b', tipo: 'corner', segundos: 120 }),
    ];

    expect(posiblesRepetidos(eventos, undefined)).toEqual(new Set(['a', 'b']));
  });

  it('las parejas salen una vez cada una, con el más antiguo de la lista delante', () => {
    const eventos = [
      evento({ clientEventId: 'a', segundos: 100, propio: true }),
      evento({ clientEventId: 'b', segundos: 110 }),
      evento({ clientEventId: 'c', segundos: 120 }),
    ];

    expect(parejasRepetidas(eventos, VENTANAS)).toEqual([
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'c'],
    ]);
  });
});

describe('leerVentanas', () => {
  it('lee el valor de `app_settings` y se queda solo con los números', () => {
    expect(
      leerVentanas({ default: 30, by_type: { goal: 30, corner: 10, raro: 'diez', cero: -1 } }),
    ).toEqual({ default: 30, by_type: { goal: 30, corner: 10 } });
  });

  it('con la forma de antes, o sin fila, no hay ventanas: valen los 30 s', () => {
    expect(leerVentanas({ seconds: 30 })).toBeUndefined();
    expect(leerVentanas(null)).toBeUndefined();
    expect(leerVentanas('30')).toBeUndefined();
  });

  it('sin `by_type`, solo la de por defecto', () => {
    expect(leerVentanas({ default: 20 })).toEqual({ default: 20, by_type: {} });
  });
});
