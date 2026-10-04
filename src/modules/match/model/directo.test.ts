import { describe, expect, it } from 'vitest';

import { desdePaquete, elegirEstado, enCurso, reducir } from './directo';

import type { EstadoDirecto } from './directo';
import type { PaqueteDePartido } from './paquete';

const INICIO = Date.UTC(2026, 9, 4, 11, 0, 0);

function paquete(cambios: Partial<PaqueteDePartido> = {}): PaqueteDePartido {
  return {
    partido: {
      id: 'par-1',
      teamId: 'eq-1',
      competitionId: 'comp-1',
      opponentName: 'At. Tacoronte',
      isHome: false,
      kickoffAt: '2026-10-04T11:00:00Z',
      venue: null,
      status: 'called',
      isRetroactive: false,
    },
    reglamento: {
      periods_count: 2,
      period_minutes: 40,
      halftime_minutes: 15,
      clock_mode: 'running',
      substitution_type: 'fixed',
      substitutions_max: 5,
      squad_max: 18,
      players_on_pitch: 2,
      yellow_cards_for_ban: 5,
      red_card_default_bans: 1,
      enabled_event_types: ['goal'],
    },
    convocatoria: [
      { playerId: 'p1', nickname: 'Pepe', callStatus: 'starter', shirtNumber: 1, position: 'GK' },
      {
        playerId: 'p7',
        nickname: 'Juanito',
        callStatus: 'starter',
        shirtNumber: 7,
        position: null,
      },
      {
        playerId: 'p8',
        nickname: 'Luis',
        callStatus: 'substitute',
        shirtNumber: 8,
        position: null,
      },
    ],
    partes: [],
    eventos: [],
    ...cambios,
  };
}

function empezado(): EstadoDirecto {
  const { estado } = reducir(desdePaquete(paquete()), {
    tipo: 'empezar_parte',
    ahora: INICIO,
    parteId: 'parte-1',
  });

  return estado;
}

describe('desdePaquete', () => {
  it('un partido sin partes empieza inactivo, con los titulares en el campo', () => {
    const estado = desdePaquete(paquete());

    expect(estado).toMatchObject({ partidoId: 'par-1', fase: 'inactivo', partes: [] });
    expect(estado.enCampo).toEqual(['p1', 'p7']);
  });

  it('recupera una parte abierta del servidor como en juego, anclada a su arranque', () => {
    const estado = desdePaquete(
      paquete({
        partes: [
          {
            id: 'parte-1',
            periodNumber: 1,
            plannedSeconds: 2_400,
            actualSeconds: null,
            startedAt: '2026-10-04T11:00:00Z',
            endedAt: null,
          },
        ],
      }),
    );

    expect(estado.fase).toBe('en_juego');
    expect(estado.partes[0]).toMatchObject({ numero: 1, inicio: INICIO, segundosReales: null });
  });

  it('con la primera parte cerrada, está en el descanso', () => {
    const estado = desdePaquete(
      paquete({
        partes: [
          {
            id: 'parte-1',
            periodNumber: 1,
            plannedSeconds: 2_400,
            actualSeconds: 2_490,
            startedAt: '2026-10-04T11:00:00Z',
            endedAt: '2026-10-04T11:41:30Z',
          },
        ],
      }),
    );

    expect(estado.fase).toBe('descanso');
    expect(estado.partes[0]?.segundosReales).toBe(2_490);
  });

  it('un partido terminado en el servidor llega terminado', () => {
    const base = paquete();

    expect(desdePaquete({ ...base, partido: { ...base.partido, status: 'finished' } }).fase).toBe(
      'finalizado',
    );
  });
});

describe('reducir', () => {
  it('empezar la primera parte pone el partido en juego y abre la parte con su arranque', () => {
    const { estado, trabajos, error } = reducir(desdePaquete(paquete()), {
      tipo: 'empezar_parte',
      ahora: INICIO,
      parteId: 'parte-1',
    });

    expect(error).toBeNull();
    expect(estado.fase).toBe('en_juego');
    expect(trabajos).toEqual([
      {
        entity: 'match',
        op: 'update',
        matchId: 'par-1',
        payload: { valores: { status: 'live' }, clave: { id: 'par-1' } },
      },
      {
        entity: 'match_period',
        op: 'insert',
        matchId: 'par-1',
        payload: {
          valores: {
            id: 'parte-1',
            match_id: 'par-1',
            period_number: 1,
            planned_seconds: 2_400,
            started_at: '2026-10-04T11:00:00.000Z',
          },
        },
      },
    ]);
  });

  it('no empieza sin los titulares exactos del reglamento (R-02)', () => {
    const base = paquete();
    const { estado, trabajos, error } = reducir(
      desdePaquete({ ...base, convocatoria: base.convocatoria.slice(1) }),
      { tipo: 'empezar_parte', ahora: INICIO, parteId: 'parte-1' },
    );

    expect(error).toBe('Tienen que salir 2 titulares y la convocatoria tiene 1.');
    expect(estado.fase).toBe('inactivo');
    expect(trabajos).toEqual([]);
  });

  it('pausa y reanuda sin escribir nada y acumulando lo pausado', () => {
    const pausado = reducir(empezado(), { tipo: 'pausar', ahora: INICIO + 60_000 });
    const reanudado = reducir(pausado.estado, { tipo: 'reanudar', ahora: INICIO + 90_000 });

    expect(pausado.estado.fase).toBe('pausado');
    expect(reanudado.estado.fase).toBe('en_juego');
    expect(reanudado.estado.partes[0]).toMatchObject({ pausadoMs: 30_000, pausaDesde: null });
    expect([...pausado.trabajos, ...reanudado.trabajos]).toEqual([]);
  });

  it('terminar la parte guarda su duración real, descontada la pausa', () => {
    const pausado = reducir(empezado(), { tipo: 'pausar', ahora: INICIO + 60_000 });
    const reanudado = reducir(pausado.estado, { tipo: 'reanudar', ahora: INICIO + 90_000 });
    const { estado, trabajos } = reducir(reanudado.estado, {
      tipo: 'terminar_parte',
      ahora: INICIO + 2_520_000,
    });

    expect(estado.fase).toBe('descanso');
    expect(trabajos).toEqual([
      {
        entity: 'match_period',
        op: 'update',
        matchId: 'par-1',
        payload: {
          valores: { ended_at: '2026-10-04T11:42:00.000Z', actual_seconds: 2_490 },
          clave: { id: 'parte-1' },
        },
      },
    ]);
  });

  it('la segunda parte no vuelve a poner el partido en juego', () => {
    const descanso = reducir(empezado(), { tipo: 'terminar_parte', ahora: INICIO + 2_400_000 });
    const { trabajos } = reducir(descanso.estado, {
      tipo: 'empezar_parte',
      ahora: INICIO + 3_300_000,
      parteId: 'parte-2',
    });

    expect(trabajos.map((t) => [t.entity, t.op])).toEqual([['match_period', 'insert']]);
    expect(trabajos[0]?.payload.valores.period_number).toBe(2);
  });

  it('no abre una tercera parte en una competición de dos', () => {
    let estado = empezado();
    estado = reducir(estado, { tipo: 'terminar_parte', ahora: INICIO + 1 }).estado;
    estado = reducir(estado, { tipo: 'empezar_parte', ahora: INICIO + 2, parteId: 'p2' }).estado;
    estado = reducir(estado, { tipo: 'terminar_parte', ahora: INICIO + 3 }).estado;

    const tercera = reducir(estado, { tipo: 'empezar_parte', ahora: INICIO + 4, parteId: 'p3' });

    expect(tercera.error).toBe('Esta competición tiene 2 partes.');
    expect(tercera.trabajos).toEqual([]);
  });

  it('finaliza solo con todas las partes jugadas, y pone el partido como terminado', () => {
    let estado = empezado();
    estado = reducir(estado, { tipo: 'terminar_parte', ahora: INICIO + 1 }).estado;

    expect(reducir(estado, { tipo: 'finalizar', ahora: INICIO + 2 }).error).toBe(
      'Quedan partes por jugar.',
    );

    estado = reducir(estado, { tipo: 'empezar_parte', ahora: INICIO + 2, parteId: 'p2' }).estado;
    estado = reducir(estado, { tipo: 'terminar_parte', ahora: INICIO + 3 }).estado;
    const final = reducir(estado, { tipo: 'finalizar', ahora: INICIO + 4 });

    expect(final.estado.fase).toBe('finalizado');
    expect(final.trabajos).toEqual([
      {
        entity: 'match',
        op: 'update',
        matchId: 'par-1',
        payload: { valores: { status: 'finished' }, clave: { id: 'par-1' } },
      },
    ]);
  });

  it('rechaza las transiciones ilegales sin tocar nada', () => {
    const inactivo = desdePaquete(paquete());

    for (const accion of [
      { tipo: 'pausar', ahora: INICIO },
      { tipo: 'reanudar', ahora: INICIO },
      { tipo: 'terminar_parte', ahora: INICIO },
    ] as const) {
      const resultado = reducir(inactivo, accion);

      expect(resultado.estado).toBe(inactivo);
      expect(resultado.trabajos).toEqual([]);
      expect(resultado.error).not.toBeNull();
    }
  });
});

describe('enCurso', () => {
  it('está en curso desde que empieza hasta que se finaliza', () => {
    expect(enCurso(desdePaquete(paquete()))).toBe(false);
    expect(enCurso(empezado())).toBe(true);
  });
});

describe('elegirEstado', () => {
  const servidor = desdePaquete(paquete());

  it('sin estado local, manda el del servidor', () => {
    expect(elegirEstado(undefined, servidor)).toBe(servidor);
  });

  it('con el mismo avance, manda el local: guarda la pausa, que el servidor no conoce', () => {
    const local = reducir(empezado(), { tipo: 'pausar', ahora: INICIO + 1 }).estado;
    const delServidor = { ...local, fase: 'en_juego' as const };

    expect(elegirEstado(local, delServidor)).toBe(local);
  });

  it('si otro aparato ha avanzado el partido, manda el del servidor', () => {
    const local = empezado();
    const delServidor = reducir(local, { tipo: 'terminar_parte', ahora: INICIO + 1 }).estado;

    expect(elegirEstado(local, delServidor)).toBe(delServidor);
  });

  it('lo terminado en este aparato no vuelve atrás aunque el servidor no lo sepa todavía', () => {
    let local = empezado();
    local = reducir(local, { tipo: 'terminar_parte', ahora: INICIO + 1 }).estado;
    local = reducir(local, { tipo: 'empezar_parte', ahora: INICIO + 2, parteId: 'p2' }).estado;
    local = reducir(local, { tipo: 'terminar_parte', ahora: INICIO + 3 }).estado;
    local = reducir(local, { tipo: 'finalizar', ahora: INICIO + 4 }).estado;

    expect(elegirEstado(local, empezado())).toBe(local);
  });

  it('el reglamento y la convocatoria salen siempre del servidor; la pausa sigue siendo del local (D06-36)', () => {
    const local = reducir(empezado(), { tipo: 'pausar', ahora: INICIO + 1 }).estado;
    // El mismo avance —una parte abierta—, pero con el límite de cambios
    // subido y un convocado más desde que se abrió el directo.
    const delServidor: EstadoDirecto = {
      ...local,
      fase: 'en_juego',
      partes: local.partes.map((parte) => ({ ...parte, pausadoMs: 0, pausaDesde: null })),
      cambiosMax: 7,
      convocados: [...local.convocados, 'p9'],
      posicionesIniciales: { ...local.posicionesIniciales, p9: null },
    };

    const elegido = elegirEstado(local, delServidor);

    expect(elegido.cambiosMax).toBe(7);
    expect(elegido.convocados).toEqual(['p1', 'p7', 'p8', 'p9']);
    expect(elegido.posicionesIniciales).toHaveProperty('p9', null);
    expect(elegido.fase).toBe('pausado');
    expect(elegido.partes).toEqual(local.partes);
    expect(elegido.eventos).toBe(local.eventos);
  });

  it('si el servidor cambia los titulares, el campo se recalcula con ellos', () => {
    const local = empezado();
    const delServidor: EstadoDirecto = { ...local, titulares: ['p1', 'p8'] };

    const elegido = elegirEstado(local, delServidor);

    expect(elegido.titulares).toEqual(['p1', 'p8']);
    expect(elegido.enCampo).toEqual(['p1', 'p8']);
    expect(elegido.partes).toBe(local.partes);
  });
});
