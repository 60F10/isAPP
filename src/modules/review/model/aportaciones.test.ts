// Mis aportaciones, lógica pura (T-211).

import { describe, expect, it } from 'vitest';

import { accionesDe, agruparPorPartido, candidatos } from './aportaciones';

import type { Aportacion, Convocado, PartidoConAportaciones } from './aportaciones';

function partido(
  cambios: Partial<PartidoConAportaciones> & { id: string },
): PartidoConAportaciones {
  return {
    opponentName: 'UD Orotava',
    kickoffAt: '2026-10-03T11:00:00.000Z',
    status: 'finished',
    periodos: 2,
    minutosDeParte: 40,
    convocatoria: [],
    ...cambios,
  };
}

function evento(cambios: Partial<Aportacion> & { id: string }): Aportacion {
  return {
    clientEventId: `cliente-${cambios.id}`,
    partidoId: 'par-1',
    tipo: 'goal',
    periodo: 1,
    segundos: 0,
    rival: false,
    jugador: 'jug-1',
    segundo: null,
    detalles: {},
    estado: 'pending',
    propio: false,
    ...cambios,
  };
}

function convocado(cambios: Partial<Convocado> & { playerId: string }): Convocado {
  return { nickname: cambios.playerId, shirtNumber: null, convocado: true, ...cambios };
}

describe('agruparPorPartido', () => {
  it('pone primero el partido más reciente y ordena dentro por parte y segundo', () => {
    const grupos = agruparPorPartido(
      [
        partido({ id: 'par-viejo', kickoffAt: '2026-09-26T11:00:00.000Z' }),
        partido({ id: 'par-nuevo', kickoffAt: '2026-10-03T11:00:00.000Z' }),
      ],
      [
        evento({ id: 'c', partidoId: 'par-nuevo', periodo: 2, segundos: 30 }),
        evento({ id: 'v', partidoId: 'par-viejo' }),
        evento({ id: 'b', partidoId: 'par-nuevo', periodo: 1, segundos: 900 }),
        evento({ id: 'a', partidoId: 'par-nuevo', periodo: 1, segundos: 120 }),
      ],
    );

    expect(grupos.map((grupo) => grupo.partido.id)).toEqual(['par-nuevo', 'par-viejo']);
    expect(grupos[0].eventos.map((uno) => uno.id)).toEqual(['a', 'b', 'c']);
    expect(grupos[1].eventos.map((uno) => uno.id)).toEqual(['v']);
  });

  it('deja el evento sin segundos al final de su parte', () => {
    const [grupo] = agruparPorPartido(
      [partido({ id: 'par-1' })],
      [
        evento({ id: 'sin', periodo: 1, segundos: null }),
        evento({ id: 'segunda', periodo: 2, segundos: 0 }),
        evento({ id: 'con', periodo: 1, segundos: 2000 }),
      ],
    );

    expect(grupo.eventos.map((uno) => uno.id)).toEqual(['con', 'sin', 'segunda']);
  });

  it('no enseña los partidos en los que no se apuntó nada', () => {
    const grupos = agruparPorPartido(
      [partido({ id: 'par-1' }), partido({ id: 'par-2' })],
      [evento({ id: 'a', partidoId: 'par-2' })],
    );

    expect(grupos.map((grupo) => grupo.partido.id)).toEqual(['par-2']);
  });
});

describe('accionesDe', () => {
  const abierto = partido({ id: 'par-1', status: 'finished' });

  it('ofrece todas las suyas a un evento pendiente', () => {
    expect(accionesDe(evento({ id: 'gol' }), abierto, false)).toEqual([
      'minuto',
      'jugador',
      'asistencia',
      'borrar',
    ]);
    expect(accionesDe(evento({ id: 'cambio', tipo: 'substitution' }), abierto, false)).toEqual([
      'minuto',
      'jugador',
      'entra',
      'borrar',
    ]);
    expect(accionesDe(evento({ id: 'tarjeta', tipo: 'yellow_card' }), abierto, false)).toEqual([
      'minuto',
      'jugador',
      'borrar',
    ]);
  });

  it('no ofrece ninguna a un evento ya revisado sin el permiso de aprobar', () => {
    expect(accionesDe(evento({ id: 'a', estado: 'approved' }), abierto, false)).toEqual([]);
    expect(accionesDe(evento({ id: 'r', estado: 'rejected' }), abierto, false)).toEqual([]);
  });

  it('las ofrece todas a un evento aprobado con el permiso de aprobar', () => {
    expect(accionesDe(evento({ id: 'a', estado: 'approved' }), abierto, true)).toEqual([
      'minuto',
      'jugador',
      'asistencia',
      'borrar',
    ]);
  });

  it('no ofrece ninguna en un partido cerrado, ni con el permiso', () => {
    const cerrado = partido({ id: 'par-1', status: 'closed' });

    expect(accionesDe(evento({ id: 'a' }), cerrado, true)).toEqual([]);
    expect(accionesDe(evento({ id: 'b', estado: 'approved' }), cerrado, true)).toEqual([]);
  });

  it('de un evento del rival solo deja cambiar el minuto y borrar', () => {
    expect(accionesDe(evento({ id: 'a', rival: true, jugador: null }), abierto, true)).toEqual([
      'minuto',
      'borrar',
    ]);
  });

  it('no ofrece «Jugador» en un evento propio que no lleva jugador', () => {
    expect(accionesDe(evento({ id: 'a', tipo: 'corner', jugador: null }), abierto, false)).toEqual([
      'minuto',
      'borrar',
    ]);
  });
});

describe('candidatos', () => {
  const convocatoria = [
    convocado({ playerId: 'jug-9', shirtNumber: 9 }),
    convocado({ playerId: 'jug-1', shirtNumber: 1 }),
    convocado({ playerId: 'jug-7', shirtNumber: 7 }),
    convocado({ playerId: 'jug-fuera', shirtNumber: 4, convocado: false }),
  ];

  it('deja fuera al otro jugador del evento y a los no convocados', () => {
    const gol = evento({ id: 'gol', jugador: 'jug-9', segundo: 'jug-7' });

    expect(candidatos(convocatoria, gol, 'jugador').map((uno) => uno.playerId)).toEqual([
      'jug-1',
      'jug-9',
    ]);
    expect(candidatos(convocatoria, gol, 'segundo').map((uno) => uno.playerId)).toEqual([
      'jug-1',
      'jug-7',
    ]);
  });

  it('ordena por dorsal, con los que no lo tienen al final', () => {
    const lista = candidatos(
      [
        convocado({ playerId: 'sin-dorsal' }),
        convocado({ playerId: 'jug-10', shirtNumber: 10 }),
        convocado({ playerId: 'jug-2', shirtNumber: 2 }),
      ],
      evento({ id: 'gol', jugador: null }),
      'jugador',
    );

    expect(lista.map((uno) => uno.playerId)).toEqual(['jug-2', 'jug-10', 'sin-dorsal']);
  });
});
