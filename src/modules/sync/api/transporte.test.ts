// El transporte (T-206): una petición por trabajo, reducida a lo que decide
// la cola. Lo que se vigila: el `update` que no toca filas es `SIN_FILAS`, el
// `delete` que no toca filas es éxito, el error de la base pasa con su código
// y la petición que lanza no rompe nada.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { enviar } from './transporte';

import type { Trabajo } from '@shared/lib/db';

interface Respuesta {
  data: unknown;
  error: { code: string; message: string } | null;
  status: number;
}

const red = vi.hoisted(() => ({
  respuesta: { data: null, error: null, status: 201 } as Respuesta | Error,
  llamadas: [] as { tabla: string; op: string; valores?: unknown; clave?: unknown }[],
}));

function contestar(): Promise<Respuesta> {
  return red.respuesta instanceof Error
    ? Promise.reject(red.respuesta)
    : Promise.resolve(red.respuesta);
}

vi.mock('@shared/lib/supabase', () => ({
  supabase: {
    from: (tabla: string) => ({
      insert: (valores: unknown) => {
        red.llamadas.push({ tabla, op: 'insert', valores });
        return contestar();
      },
      update: (valores: unknown) => ({
        match: (clave: unknown) => ({
          select: () => {
            red.llamadas.push({ tabla, op: 'update', valores, clave });
            return contestar();
          },
        }),
      }),
      delete: () => ({
        match: (clave: unknown) => ({
          select: () => {
            red.llamadas.push({ tabla, op: 'delete', clave });
            return contestar();
          },
        }),
      }),
    }),
  },
}));

function trabajo(cambios: Partial<Trabajo>): Trabajo {
  return {
    id: 't1',
    userId: 'u1',
    entity: 'match_event',
    op: 'insert',
    payload: { valores: { client_event_id: 'ce-1' } },
    clientEventId: 'ce-1',
    matchId: 'm1',
    createdAt: 0,
    attempts: 0,
    nextAttemptAt: 0,
    status: 'sending',
    lastError: null,
    sentAt: null,
    ...cambios,
  };
}

beforeEach(() => {
  red.llamadas = [];
  red.respuesta = { data: null, error: null, status: 201 };
});

describe('enviar', () => {
  it('inserta en la tabla de la entidad', async () => {
    expect(await enviar(trabajo({}))).toEqual({ ok: true, status: 201, code: null, mensaje: null });
    expect(red.llamadas).toEqual([
      { tabla: 'match_events', op: 'insert', valores: { client_event_id: 'ce-1' } },
    ]);
  });

  it('pasa el error de la base con su código', async () => {
    red.respuesta = {
      data: null,
      error: { code: '23505', message: 'duplicate key' },
      status: 409,
    };

    expect(await enviar(trabajo({}))).toEqual({
      ok: false,
      status: 409,
      code: '23505',
      mensaje: 'duplicate key',
    });
  });

  it('un update que no toca ninguna fila es SIN_FILAS', async () => {
    red.respuesta = { data: [], error: null, status: 200 };

    const resultado = await enviar(
      trabajo({
        entity: 'match_period',
        op: 'update',
        payload: { valores: { ended_at: 'x' }, clave: { id: 'p1' } },
      }),
    );

    expect(red.llamadas[0]).toMatchObject({ tabla: 'match_periods', clave: { id: 'p1' } });
    expect(resultado).toMatchObject({ ok: false, code: 'SIN_FILAS' });
  });

  it('un update por partido y número de parte llega con esa misma clave (T-209c)', async () => {
    red.respuesta = { data: [{ id: 'la-del-servidor' }], error: null, status: 200 };

    const resultado = await enviar(
      trabajo({
        entity: 'match_period',
        op: 'update',
        matchId: 'par-1',
        payload: {
          valores: { ended_at: 'x', actual_seconds: 2_400 },
          clave: { match_id: 'par-1', period_number: '2' },
        },
      }),
    );

    expect(red.llamadas).toEqual([
      {
        tabla: 'match_periods',
        op: 'update',
        valores: { ended_at: 'x', actual_seconds: 2_400 },
        clave: { match_id: 'par-1', period_number: '2' },
      },
    ]);
    expect(resultado.ok).toBe(true);
  });

  it('un delete que no toca ninguna fila es éxito: ya no está', async () => {
    red.respuesta = { data: [], error: null, status: 200 };

    const resultado = await enviar(
      trabajo({ op: 'delete', payload: { valores: {}, clave: { client_event_id: 'ce-1' } } }),
    );

    expect(resultado.ok).toBe(true);
  });

  it('una petición que lanza vuelve como sin respuesta', async () => {
    red.respuesta = new TypeError('Failed to fetch');

    expect(await enviar(trabajo({}))).toEqual({
      ok: false,
      status: 0,
      code: null,
      mensaje: 'Failed to fetch',
    });
  });
});
