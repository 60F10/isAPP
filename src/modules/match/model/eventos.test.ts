import { describe, expect, it } from 'vitest';

import {
  amonestados,
  calcularEnCampo,
  calcularPosiciones,
  cambiosHechos,
  desdeFilas,
  expulsados,
  marcador,
  sustituidos,
  unirEventos,
} from './eventos';

import type { EventoDelDirecto } from './eventos';

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

describe('unirEventos', () => {
  it('junta los del aparato y los del servidor sin repetir, y el estado lo pone el servidor', () => {
    const local = evento({ clientEventId: 'a', estado: 'pending', propio: true });
    const soloLocal = evento({ clientEventId: 'b', propio: true });
    const delServidor = evento({ clientEventId: 'a', estado: 'approved' });
    const ajeno = evento({ clientEventId: 'c' });

    expect(unirEventos([local, soloLocal], [delServidor, ajeno])).toEqual([
      { ...delServidor, propio: true },
      soloLocal,
      ajeno,
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
