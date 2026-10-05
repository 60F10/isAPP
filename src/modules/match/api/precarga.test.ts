// Precarga del partido (T-206). Lo que se vigila: el paquete sale completo y
// del jugador solo trae el apodo; sin partido o sin reglamento no se guarda
// nada; lo guardado entra en una transacción con los eventos como enviados;
// y la persistencia se pide sin romper la precarga si el navegador no la da.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  descargarPaquete,
  guardarPaquete,
  PARTIDO_NO_ENCONTRADO,
  pedirAlmacenPersistente,
} from './precarga';

import type { PaqueteDePartido } from '../model/paquete';

const red = vi.hoisted(() => ({
  respuestas: {} as Record<string, { data: unknown; error: unknown }>,
  selects: {} as Record<string, string>,
  ordenes: {} as Record<string, string[]>,
}));

const almacen = vi.hoisted(() => ({
  anterior: undefined as unknown,
  snapshots: [] as unknown[],
  eventos: [] as unknown[],
  meta: [] as unknown[],
  transacciones: 0,
}));

vi.mock('@shared/lib/supabase', () => ({
  supabase: {
    from: (tabla: string) => ({
      select: (columnas: string) => {
        red.selects[tabla] = columnas;
        // La consulta se puede esperar tal cual, ordenar o pedir de una fila.
        const consulta = (): object =>
          Object.assign(Promise.resolve(red.respuestas[tabla]), {
            maybeSingle: () => Promise.resolve(red.respuestas[tabla]),
            order: (columna: string) => {
              red.ordenes[tabla] = [...(red.ordenes[tabla] ?? []), columna];

              return consulta();
            },
          });

        return { eq: consulta };
      },
    }),
  },
}));

vi.mock('@shared/lib/db', () => ({
  db: {
    matchSnapshots: {
      get: () => Promise.resolve(almacen.anterior),
      put: (fila: unknown) => {
        almacen.snapshots.push(fila);
        return Promise.resolve();
      },
    },
    matchEvents: {
      bulkPut: (filas: unknown[]) => {
        almacen.eventos.push(...filas);
        return Promise.resolve();
      },
    },
    meta: {
      put: (fila: unknown) => {
        almacen.meta.push(fila);
        return Promise.resolve();
      },
    },
    transaction: async (_modo: string, _a: unknown, _b: unknown, cuerpo: () => Promise<void>) => {
      almacen.transacciones += 1;
      await cuerpo();
    },
  },
}));

const REGLAMENTO = {
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
  enabled_event_types: ['goal'],
};

beforeEach(() => {
  red.selects = {};
  red.ordenes = {};
  red.respuestas = {
    matches: {
      data: {
        id: 'par-1',
        team_id: 'eq-1',
        competition_id: 'comp-1',
        is_home: false,
        kickoff_at: '2026-10-04T11:00:00Z',
        venue: 'Campo del Tacoronte',
        status: 'called',
        is_retroactive: false,
        rival: { name: 'At. Tacoronte' },
        competicion: REGLAMENTO,
      },
      error: null,
    },
    match_squad: {
      data: [
        {
          player_id: 'p1',
          call_status: 'starter',
          shirt_number: 1,
          position: 'GK',
          players: { nickname: 'Pepe' },
        },
      ],
      error: null,
    },
    match_periods: {
      data: [
        {
          id: 'parte-1',
          period_number: 1,
          planned_seconds: 2400,
          actual_seconds: null,
          started_at: null,
          ended_at: null,
        },
      ],
      error: null,
    },
    match_events: { data: [{ client_event_id: 'ce-1', period: 1 }], error: null },
    app_settings: { data: null, error: null },
  };
  almacen.anterior = undefined;
  almacen.snapshots = [];
  almacen.eventos = [];
  almacen.meta = [];
  almacen.transacciones = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('descargarPaquete', () => {
  it('trae el partido, el reglamento, la convocatoria con solo el apodo, las partes y los eventos', async () => {
    const paquete = await descargarPaquete('par-1');

    expect(paquete).toEqual({
      partido: {
        id: 'par-1',
        teamId: 'eq-1',
        competitionId: 'comp-1',
        opponentName: 'At. Tacoronte',
        isHome: false,
        kickoffAt: '2026-10-04T11:00:00Z',
        venue: 'Campo del Tacoronte',
        status: 'called',
        isRetroactive: false,
      },
      reglamento: REGLAMENTO,
      convocatoria: [
        { playerId: 'p1', nickname: 'Pepe', callStatus: 'starter', shirtNumber: 1, position: 'GK' },
      ],
      partes: [
        {
          id: 'parte-1',
          periodNumber: 1,
          plannedSeconds: 2400,
          actualSeconds: null,
          startedAt: null,
          endedAt: null,
        },
      ],
      eventos: [{ client_event_id: 'ce-1', period: 1 }],
    });
    expect(red.selects.match_squad).toBe(
      'player_id, call_status, shirt_number, position, players(nickname)',
    );
  });

  it('pide del partido la parte y el segundo de la suspensión, y los trae en el paquete (T-226)', async () => {
    red.respuestas.matches = {
      data: {
        ...(red.respuestas.matches?.data as Record<string, unknown>),
        status: 'suspended',
        suspended_period: 1,
        suspended_seconds: 1390,
      },
      error: null,
    };

    const paquete = await descargarPaquete('par-1');

    expect(red.selects.matches).toMatch(/\bsuspended_period\b/);
    expect(red.selects.matches).toMatch(/\bsuspended_seconds\b/);
    expect(paquete.partido).toMatchObject({
      status: 'suspended',
      suspendedPeriod: 1,
      suspendedSeconds: 1390,
    });
  });

  it('sin partido legible no hay paquete', async () => {
    red.respuestas.matches = { data: null, error: null };

    await expect(descargarPaquete('par-1')).rejects.toThrow(PARTIDO_NO_ENCONTRADO);
  });

  it('sin reglamento legible tampoco: el directo no sabría cuánto dura', async () => {
    red.respuestas.matches = {
      data: { ...(red.respuestas.matches.data as object), competicion: null },
      error: null,
    };

    await expect(descargarPaquete('par-1')).rejects.toThrow(PARTIDO_NO_ENCONTRADO);
  });

  it('un error de cualquiera de las cuatro consultas tumba la precarga entera', async () => {
    const fallo = { code: '42501', message: 'rls' };
    red.respuestas.match_events = { data: null, error: fallo };

    await expect(descargarPaquete('par-1')).rejects.toBe(fallo);
  });

  it('trae las ventanas de posible repetido de `app_settings` (T-209b)', async () => {
    red.respuestas.app_settings = {
      data: { value: { default: 30, by_type: { goal: 30, corner: 10 } } },
      error: null,
    };

    const paquete = await descargarPaquete('par-1');

    expect(paquete.ventanas).toEqual({ default: 30, by_type: { goal: 30, corner: 10 } });
    expect(red.selects.app_settings).toBe('value');
  });

  it('pide los eventos por orden de alta, y a igualdad por su `client_event_id` (T-223)', async () => {
    await descargarPaquete('par-1');

    // Sin orden, PostgREST los devuelve como le viene: tras revisar eventos en
    // el cierre, «Últimos eventos» salía desordenado en un aparato nuevo.
    expect(red.ordenes).toEqual({ match_events: ['created_at', 'client_event_id'] });
  });

  it('sin ventanas legibles el paquete sale igual, sin ellas: valen los 30 s', async () => {
    red.respuestas.app_settings = { data: null, error: { code: '42501', message: 'rls' } };

    const paquete = await descargarPaquete('par-1');

    expect(paquete).not.toHaveProperty('ventanas');
    expect(paquete.partido.id).toBe('par-1');
  });
});

describe('guardarPaquete', () => {
  it('guarda la instantánea y los eventos como enviados, en una sola transacción', async () => {
    const paquete: PaqueteDePartido = await descargarPaquete('par-1');

    await guardarPaquete(paquete, 500);

    expect(almacen.transacciones).toBe(1);
    expect(almacen.snapshots).toEqual([
      { matchId: 'par-1', updatedAt: 500, datos: { paquete, descargadoEn: 500 } },
    ]);
    expect(almacen.eventos).toEqual([
      {
        clientEventId: 'ce-1',
        matchId: 'par-1',
        syncState: 'sent',
        period: 1,
        fila: { client_event_id: 'ce-1', period: 1 },
      },
    ]);
  });
});

describe('guardarPaquete con la hora de la petición', () => {
  it('apunta cuándo se pidió, que es desde cuándo hay que mirar la cola (T-209b)', async () => {
    const paquete: PaqueteDePartido = await descargarPaquete('par-1');

    await guardarPaquete(paquete, 500, 420);

    expect(almacen.snapshots).toEqual([
      { matchId: 'par-1', updatedAt: 500, datos: { paquete, descargadoEn: 500, pedidoEn: 420 } },
    ]);
  });
});

// T-223: una descarga lenta que acaba después de otra más nueva no la pisa.
describe('guardarPaquete con una descarga que llega tarde', () => {
  it('no escribe si lo guardado se pidió después; si se pidió antes, sí', async () => {
    const paquete: PaqueteDePartido = await descargarPaquete('par-1');
    almacen.anterior = {
      matchId: 'par-1',
      updatedAt: 250,
      datos: { paquete, descargadoEn: 250, pedidoEn: 200 },
    };

    await guardarPaquete(paquete, 400, 100);

    expect(almacen.snapshots).toEqual([]);
    expect(almacen.eventos).toEqual([]);

    await guardarPaquete(paquete, 500, 300);

    expect(almacen.snapshots).toEqual([
      { matchId: 'par-1', updatedAt: 500, datos: { paquete, descargadoEn: 500, pedidoEn: 300 } },
    ]);
    expect(almacen.eventos).toHaveLength(1);
  });

  it('sin saber cuándo se pidió alguna de las dos, escribe como siempre', async () => {
    const paquete: PaqueteDePartido = await descargarPaquete('par-1');
    // Lo guardado lo sabe y lo que llega no.
    almacen.anterior = {
      matchId: 'par-1',
      updatedAt: 250,
      datos: { paquete, descargadoEn: 250, pedidoEn: 200 },
    };

    await guardarPaquete(paquete, 400);

    // Lo que llega lo sabe y lo guardado no: una precarga de antes de la T-209b.
    almacen.anterior = { matchId: 'par-1', updatedAt: 250, datos: { paquete, descargadoEn: 250 } };

    await guardarPaquete(paquete, 500, 100);

    expect(almacen.snapshots).toEqual([
      { matchId: 'par-1', updatedAt: 400, datos: { paquete, descargadoEn: 400 } },
      { matchId: 'par-1', updatedAt: 500, datos: { paquete, descargadoEn: 500, pedidoEn: 100 } },
    ]);
  });
});

describe('guardarPaquete con estado del directo', () => {
  it('conserva el estado que había guardado este aparato', async () => {
    const paquete: PaqueteDePartido = await descargarPaquete('par-1');
    const estado = { partidoId: 'par-1', fase: 'pausado' };
    almacen.anterior = {
      matchId: 'par-1',
      updatedAt: 1,
      datos: { paquete, descargadoEn: 1, estado },
    };

    await guardarPaquete(paquete, 500);

    expect(almacen.snapshots).toEqual([
      { matchId: 'par-1', updatedAt: 500, datos: { paquete, descargadoEn: 500, estado } },
    ]);
  });

  it('conserva la cobertura declarada en este aparato, con estado o sin él (T-209a)', async () => {
    const paquete: PaqueteDePartido = await descargarPaquete('par-1');
    const cobertura = { id: 'cob-1', alcance: 'full_team', abierta: true };
    almacen.anterior = {
      matchId: 'par-1',
      updatedAt: 1,
      datos: { paquete, descargadoEn: 1, cobertura },
    };

    await guardarPaquete(paquete, 500);

    const estado = { partidoId: 'par-1', fase: 'pausado' };
    almacen.anterior = {
      matchId: 'par-1',
      updatedAt: 1,
      datos: { paquete, descargadoEn: 1, estado, cobertura },
    };

    await guardarPaquete(paquete, 600);

    expect(almacen.snapshots).toEqual([
      { matchId: 'par-1', updatedAt: 500, datos: { paquete, descargadoEn: 500, cobertura } },
      {
        matchId: 'par-1',
        updatedAt: 600,
        datos: { paquete, descargadoEn: 600, estado, cobertura },
      },
    ]);
  });
});

describe('pedirAlmacenPersistente', () => {
  it('sin la API no sabe, y no rompe', async () => {
    vi.stubGlobal('navigator', {});

    expect(await pedirAlmacenPersistente()).toBeNull();
  });

  it('lo pide si todavía no lo es, y apunta la respuesta', async () => {
    const persist = vi.fn(() => Promise.resolve(false));
    vi.stubGlobal('navigator', { storage: { persisted: () => Promise.resolve(false), persist } });

    expect(await pedirAlmacenPersistente()).toBe(false);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(almacen.meta).toEqual([{ key: 'almacenPersistente', value: false }]);
  });

  it('no lo vuelve a pedir si ya lo es', async () => {
    const persist = vi.fn(() => Promise.resolve(true));
    vi.stubGlobal('navigator', { storage: { persisted: () => Promise.resolve(true), persist } });

    expect(await pedirAlmacenPersistente()).toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });
});
