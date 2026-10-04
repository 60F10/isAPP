import { describe, expect, it } from 'vitest';

import { desdePaquete, elegirEstado, enCurso, fusionar, reducir } from './directo';

import type { EstadoDirecto, Pendientes } from './directo';
import type { EventoDelDirecto } from './eventos';
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
          clave: { match_id: 'par-1', period_number: '1' },
        },
      },
    ]);
  });

  it('terminar la parte la busca por partido y número, no por su `id`, que puede ser de otro aparato (T-209c)', () => {
    const descanso = reducir(empezado(), { tipo: 'terminar_parte', ahora: INICIO + 1_000 });
    const segunda = reducir(descanso.estado, {
      tipo: 'empezar_parte',
      ahora: INICIO + 2_000,
      parteId: 'parte-2',
    });
    const { trabajos } = reducir(segunda.estado, { tipo: 'terminar_parte', ahora: INICIO + 3_000 });

    expect(trabajos).toHaveLength(1);
    expect(trabajos[0]).toMatchObject({ entity: 'match_period', op: 'update', matchId: 'par-1' });
    // `clave` es `Record<string, string>`: el número va como texto.
    expect(trabajos[0]?.payload.clave).toEqual({ match_id: 'par-1', period_number: '2' });
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

/** Un gol apuntado en este aparato que todavía no ha llegado al servidor. */
const MIO: EventoDelDirecto = {
  clientEventId: 'sin-enviar',
  tipo: 'goal',
  periodo: 1,
  segundos: 60,
  rival: false,
  jugador: 'p7',
  segundo: null,
  detalles: {},
  estado: 'pending',
  propio: true,
};

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

  it('si otro aparato ha avanzado el partido, la fase y las partes son las del servidor y los eventos los de este', () => {
    const local: EstadoDirecto = { ...empezado(), eventos: [MIO] };
    const delServidor: EstadoDirecto = {
      ...reducir(empezado(), { tipo: 'terminar_parte', ahora: INICIO + 1 }).estado,
      eventos: [],
    };

    const elegido = elegirEstado(local, delServidor);

    expect(elegido.fase).toBe('descanso');
    expect(elegido.partes).toEqual(delServidor.partes);
    expect(elegido.eventos).toBe(local.eventos);
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

// T-209c: las partes se concilian por número con las del servidor (D06-39).
describe('elegirEstado, con las partes de otro aparato', () => {
  const MEDIODIA = Date.UTC(2026, 9, 4, 12, 0, 0);

  type Parte = PaqueteDePartido['partes'][number];

  function parteDelServidor(numero: number, cambios: Partial<Parte> = {}): Parte {
    return {
      id: `A${numero}`,
      periodNumber: numero,
      plannedSeconds: 2_400,
      actualSeconds: null,
      startedAt: '2026-10-04T12:00:00.000Z',
      endedAt: null,
      ...cambios,
    };
  }

  /** Lo que sale del servidor con esas partes: el partido ya está en juego. */
  function servidorCon(
    partes: Parte[],
    status: PaqueteDePartido['partido']['status'] = 'live',
  ): EstadoDirecto {
    const base = paquete();

    return desdePaquete({ ...base, partido: { ...base.partido, status }, partes });
  }

  /** Este aparato abrió la parte 1 cinco segundos después, con su propio `id`. */
  function localConLaSuya(): EstadoDirecto {
    return reducir(desdePaquete(paquete()), {
      tipo: 'empezar_parte',
      ahora: MEDIODIA + 5_000,
      parteId: 'B1',
    }).estado;
  }

  const CERRADA = { actualSeconds: 2_430, endedAt: '2026-10-04T12:40:30.000Z' };

  it('si otro aparato abrió antes la misma parte, se adoptan su `id` y su arranque', () => {
    const elegido = elegirEstado(localConLaSuya(), servidorCon([parteDelServidor(1)]));

    expect(elegido.fase).toBe('en_juego');
    expect(elegido.partes).toEqual([
      {
        id: 'A1',
        numero: 1,
        inicio: MEDIODIA,
        pausadoMs: 0,
        pausaDesde: null,
        segundosReales: null,
      },
    ]);
  });

  it('con este aparato en pausa, sigue en pausa y con su `pausaDesde`', () => {
    let local = localConLaSuya();
    local = reducir(local, { tipo: 'pausar', ahora: MEDIODIA + 60_000 }).estado;
    local = reducir(local, { tipo: 'reanudar', ahora: MEDIODIA + 70_000 }).estado;
    local = reducir(local, { tipo: 'pausar', ahora: MEDIODIA + 120_000 }).estado;

    const elegido = elegirEstado(local, servidorCon([parteDelServidor(1)]));

    expect(elegido.fase).toBe('pausado');
    expect(elegido.partes).toEqual([
      {
        id: 'A1',
        numero: 1,
        inicio: MEDIODIA,
        pausadoMs: 10_000,
        pausaDesde: MEDIODIA + 120_000,
        segundosReales: null,
      },
    ]);
  });

  it('si el servidor cerró la parte, este aparato pasa al descanso con sus segundos y sin pausa', () => {
    const local = reducir(localConLaSuya(), { tipo: 'pausar', ahora: MEDIODIA + 60_000 }).estado;

    const elegido = elegirEstado(local, servidorCon([parteDelServidor(1, CERRADA)]));

    expect(elegido.fase).toBe('descanso');
    expect(elegido.partes).toEqual([
      {
        id: 'A1',
        numero: 1,
        inicio: MEDIODIA,
        pausadoMs: 0,
        pausaDesde: null,
        segundosReales: 2_430,
      },
    ]);
  });

  it('si el servidor tiene abierta la parte 2 y este aparato está en el descanso, pasa a en juego con ella', () => {
    const local = reducir(localConLaSuya(), {
      tipo: 'terminar_parte',
      ahora: MEDIODIA + 2_430_000,
    }).estado;
    const segunda = parteDelServidor(2, { startedAt: '2026-10-04T12:55:00.000Z' });

    const elegido = elegirEstado(local, servidorCon([parteDelServidor(1, CERRADA), segunda]));

    expect(local.fase).toBe('descanso');
    expect(elegido.fase).toBe('en_juego');
    expect(elegido.partes).toHaveLength(2);
    expect(elegido.partes[1]).toEqual({
      id: 'A2',
      numero: 2,
      inicio: MEDIODIA + 3_300_000,
      pausadoMs: 0,
      pausaDesde: null,
      segundosReales: null,
    });
  });

  it('en pausa en la parte 1 y con la parte 2 ya abierta en el servidor, no se queda en una pausa sin parte', () => {
    const local = reducir(localConLaSuya(), { tipo: 'pausar', ahora: MEDIODIA + 60_000 }).estado;
    const segunda = parteDelServidor(2, { startedAt: '2026-10-04T12:55:00.000Z' });

    const elegido = elegirEstado(local, servidorCon([parteDelServidor(1, CERRADA), segunda]));

    expect(elegido.fase).toBe('en_juego');
    expect(elegido.partes.map((parte) => parte.pausaDesde)).toEqual([null, null]);
  });

  it('si el servidor está finalizado, la fase es finalizado y los eventos de este aparato siguen', () => {
    const local: EstadoDirecto = { ...localConLaSuya(), eventos: [MIO] };
    const segunda = parteDelServidor(2, { startedAt: '2026-10-04T12:55:00.000Z', ...CERRADA });

    const elegido = elegirEstado(
      local,
      servidorCon([parteDelServidor(1, CERRADA), segunda], 'finished'),
    );

    expect(elegido.fase).toBe('finalizado');
    expect(elegido.partes.map((parte) => [parte.id, parte.segundosReales])).toEqual([
      ['A1', 2_430],
      ['A2', 2_430],
    ]);
    expect(elegido.eventos).toBe(local.eventos);
  });

  it('si este aparato cerró la parte y el servidor aún no, sigue cerrada: su cierre está en la cola', () => {
    const local = reducir(localConLaSuya(), {
      tipo: 'terminar_parte',
      ahora: MEDIODIA + 2_405_000,
    }).estado;

    const elegido = elegirEstado(local, servidorCon([parteDelServidor(1)]));

    expect(elegido.fase).toBe('descanso');
    expect(elegido.partes).toEqual([
      {
        id: 'A1',
        numero: 1,
        inicio: MEDIODIA,
        pausadoMs: 0,
        pausaDesde: null,
        segundosReales: 2_400,
      },
    ]);
  });

  it('la parte que este aparato abrió y el servidor no conoce se queda: su alta está en la cola', () => {
    const local = localConLaSuya();

    expect(elegirEstado(local, servidorCon([], 'called'))).toBe(local);
  });

  it('sin diferencias devuelve el mismo objeto: no provoca un repintado', () => {
    // Las partes ya adoptadas y el mismo reglamento: el siguiente refresco no cambia nada.
    const conciliado = elegirEstado(localConLaSuya(), servidorCon([parteDelServidor(1)]));
    const pausado = reducir(conciliado, { tipo: 'pausar', ahora: MEDIODIA + 60_000 }).estado;

    expect(elegirEstado(conciliado, servidorCon([parteDelServidor(1)]))).toBe(conciliado);
    expect(elegirEstado(pausado, servidorCon([parteDelServidor(1)]))).toBe(pausado);
  });

  it('en diferido la regla de las partes vale igual y no hay reloj que mover', () => {
    const base = paquete();
    const diferido = (partes: Parte[]): EstadoDirecto =>
      desdePaquete({ ...base, partido: { ...base.partido, isRetroactive: true }, partes });
    const sinArranque = { startedAt: null, actualSeconds: 2_400 };
    const local = diferido([parteDelServidor(1, sinArranque)]);

    const elegido = elegirEstado(
      local,
      diferido([parteDelServidor(1, sinArranque), parteDelServidor(2, sinArranque)]),
    );

    expect(elegido.fase).toBe('inactivo');
    expect(elegido.partes.map((parte) => [parte.id, parte.inicio, parte.segundosReales])).toEqual([
      ['A1', 0, 2_400],
      ['A2', 0, 2_400],
    ]);
  });
});

// T-209b: lo que se queda y lo que se quita cuando llega lo del servidor.
describe('fusionar', () => {
  const NADA: Pendientes = { altas: new Set(), bajas: new Set() };

  function fila(id: string, cambios: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      client_event_id: id,
      event_type: 'goal',
      period: 1,
      seconds: 60,
      is_opponent: false,
      player_id: 'p7',
      secondary_player_id: null,
      details: {},
      status: 'pending',
      ...cambios,
    };
  }

  function evento(id: string, cambios: Partial<EventoDelDirecto> = {}): EventoDelDirecto {
    return {
      clientEventId: id,
      tipo: 'goal',
      periodo: 1,
      segundos: 60,
      rival: false,
      jugador: 'p7',
      segundo: null,
      detalles: {},
      estado: 'pending',
      propio: true,
      ...cambios,
    };
  }

  function conEventos(eventos: EventoDelDirecto[]): EstadoDirecto {
    return { ...empezado(), eventos };
  }

  function servidorCon(filas: Record<string, unknown>[]): EstadoDirecto {
    return { ...empezado(), eventos: desdePaquete(paquete({ eventos: filas })).eventos };
  }

  const ids = (estado: EstadoDirecto) => estado.eventos.map((e) => e.clientEventId);

  it('lo que está en el servidor y este aparato ha deshecho, con el borrado de camino, no sale', () => {
    const fusionado = fusionar(conEventos([]), servidorCon([fila('deshecho')]), {
      altas: new Set(),
      bajas: new Set(['deshecho']),
    });

    expect(ids(fusionado)).toEqual([]);
  });

  it('lo que está en el servidor sale con la copia del servidor, y sigue siendo propio si lo era', () => {
    const local = conEventos([evento('mio'), evento('visto', { propio: false })]);
    const servidor = servidorCon([
      fila('mio', { status: 'approved' }),
      fila('visto'),
      fila('nuevo', { is_opponent: true, player_id: null }),
    ]);

    const fusionado = fusionar(local, servidor, NADA);

    expect(fusionado.eventos).toEqual([
      evento('mio', { estado: 'approved', propio: true }),
      evento('visto', { propio: false }),
      evento('nuevo', { rival: true, jugador: null, propio: false }),
    ]);
  });

  it('lo que solo está en local y sigue en la cola se queda: no ha llegado, o lo rechazó el servidor', () => {
    const local = conEventos([evento('sin-enviar')]);

    const fusionado = fusionar(local, servidorCon([]), {
      altas: new Set(['sin-enviar']),
      bajas: new Set(),
    });

    expect(fusionado.eventos).toEqual([evento('sin-enviar')]);
  });

  it('lo que solo está en local y ya no está en la cola se quita: alguien lo borró en el servidor', () => {
    const local = conEventos([evento('borrado-fuera'), evento('sin-enviar')]);

    const fusionado = fusionar(local, servidorCon([]), {
      altas: new Set(['sin-enviar']),
      bajas: new Set(),
    });

    expect(ids(fusionado)).toEqual(['sin-enviar']);
  });

  it('un cambio apuntado en otro aparato mueve quién está en el campo', () => {
    const local = empezado();
    const servidor = servidorCon([
      fila('cambio', { event_type: 'substitution', player_id: 'p7', secondary_player_id: 'p8' }),
    ]);

    expect(local.enCampo).toEqual(['p1', 'p7']);
    expect(fusionar(local, servidor, NADA).enCampo).toEqual(['p1', 'p8']);
  });

  it('un evento propio corregido en el servidor sale con el minuto y el jugador nuevos', () => {
    const local = conEventos([evento('mio', { segundos: 60, jugador: 'p7' })]);
    const servidor = servidorCon([fila('mio', { seconds: 300, player_id: 'p1' })]);

    expect(fusionar(local, servidor, NADA).eventos).toEqual([
      evento('mio', { segundos: 300, jugador: 'p1', propio: true }),
    ]);
  });

  it('lo demás sale de `elegirEstado`: la pausa es del local y el reglamento del servidor', () => {
    const local = reducir(empezado(), { tipo: 'pausar', ahora: INICIO + 1 }).estado;
    const servidor: EstadoDirecto = { ...empezado(), cambiosMax: 7, eventos: [] };

    const fusionado = fusionar(local, servidor, NADA);

    expect(fusionado.fase).toBe('pausado');
    expect(fusionado.partes).toEqual(local.partes);
    expect(fusionado.cambiosMax).toBe(7);
  });

  it('si otro aparato ha avanzado el partido, lo que este tiene sin enviar no se pierde', () => {
    const local = conEventos([evento('sin-enviar')]);
    const avanzado = reducir(empezado(), { tipo: 'terminar_parte', ahora: INICIO + 1 }).estado;

    const fusionado = fusionar(
      local,
      { ...avanzado, eventos: servidorCon([fila('ajeno')]).eventos },
      { altas: new Set(['sin-enviar']), bajas: new Set() },
    );

    expect(fusionado.fase).toBe('descanso');
    expect(ids(fusionado)).toEqual(['sin-enviar', 'ajeno']);
  });

  it('sin estado local sale lo del servidor, menos lo que este aparato está borrando', () => {
    const servidor = servidorCon([fila('a'), fila('b')]);

    expect(fusionar(undefined, servidor, NADA)).toBe(servidor);
    expect(ids(fusionar(undefined, servidor, { altas: new Set(), bajas: new Set(['a']) }))).toEqual(
      ['b'],
    );
  });

  it('si no cambia nada devuelve el mismo estado, para no repintar la pantalla cada refresco', () => {
    const local = conEventos([evento('mio')]);

    expect(fusionar(local, servidorCon([fila('mio')]), NADA)).toBe(local);
  });
});
