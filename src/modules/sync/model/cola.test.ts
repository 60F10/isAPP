import { describe, expect, it } from 'vitest';

import {
  aplicarDecision,
  clasificar,
  contar,
  crearTrabajo,
  elegirListos,
  PURGA_MS,
  purgables,
  retrasoTras,
} from './cola';

import type { ResultadoDeEnvio } from './cola';
import type { Trabajo } from '@shared/lib/db';

function trabajo(cambios: Partial<Trabajo> & { id: string }): Trabajo {
  return {
    userId: 'u1',
    entity: 'match_event',
    op: 'insert',
    payload: { valores: {} },
    clientEventId: null,
    matchId: 'm1',
    createdAt: 0,
    attempts: 0,
    nextAttemptAt: 0,
    status: 'pending',
    lastError: null,
    sentAt: null,
    ...cambios,
  };
}

function resultado(cambios: Partial<ResultadoDeEnvio>): ResultadoDeEnvio {
  return { ok: false, status: 400, code: null, mensaje: null, ...cambios };
}

describe('retrasoTras', () => {
  it('dobla desde un segundo y se planta en sesenta, más el margen aleatorio', () => {
    expect([1, 2, 3, 4, 7, 20].map((n) => retrasoTras(n, 0))).toEqual([
      1_000, 2_000, 4_000, 8_000, 60_000, 60_000,
    ]);
    expect(retrasoTras(1, 0.5)).toBe(1_500);
    expect(retrasoTras(20, 0.999)).toBe(60_999);
  });
});

describe('clasificar', () => {
  it('da por bueno lo que llega bien', () => {
    expect(clasificar(resultado({ ok: true, status: 201 }), 'insert')).toBe('exito');
  });

  it('trata como éxito el duplicado de una inserción: el primer envío ya llegó', () => {
    expect(clasificar(resultado({ status: 409, code: '23505' }), 'insert')).toBe('exito');
  });

  it('no trata como éxito un duplicado que no sea de inserción', () => {
    expect(clasificar(resultado({ status: 409, code: '23505' }), 'update')).toBe('definitivo');
  });

  it('reintenta sin red, con el servidor caído, con la sesión caducada y con demasiadas peticiones', () => {
    for (const status of [0, 500, 503, 401, 408, 429]) {
      expect(clasificar(resultado({ status }), 'insert')).toBe('reintentar');
    }
  });

  it('no reintenta lo que la base rechaza: repetirlo no lo arregla', () => {
    expect(clasificar(resultado({ status: 403, code: '42501' }), 'insert')).toBe('definitivo');
    expect(clasificar(resultado({ status: 400, code: 'P0001' }), 'insert')).toBe('definitivo');
    expect(clasificar(resultado({ status: 200, code: 'SIN_FILAS' }), 'update')).toBe('definitivo');
  });
});

describe('elegirListos', () => {
  it('da el primero pendiente de cada partido, por orden de creación', () => {
    const listos = elegirListos(
      [
        trabajo({ id: 'b', createdAt: 2 }),
        trabajo({ id: 'a', createdAt: 1 }),
        trabajo({ id: 'x', matchId: 'm2', createdAt: 5 }),
      ],
      10,
    );

    expect(listos.map((t) => t.id)).toEqual(['a', 'x']);
  });

  it('un trabajo aplazado frena a los que vienen detrás en su partido y a nadie más', () => {
    const listos = elegirListos(
      [
        trabajo({ id: 'a', createdAt: 1, nextAttemptAt: 50 }),
        trabajo({ id: 'b', createdAt: 2 }),
        trabajo({ id: 'x', matchId: 'm2', createdAt: 3 }),
      ],
      10,
    );

    expect(listos.map((t) => t.id)).toEqual(['x']);
  });

  it('salta los enviados y los fallidos, y recoge uno que se quedó enviándose', () => {
    const listos = elegirListos(
      [
        trabajo({ id: 'a', createdAt: 1, status: 'sent' }),
        trabajo({ id: 'b', createdAt: 2, status: 'failed' }),
        trabajo({ id: 'c', createdAt: 3, status: 'sending' }),
      ],
      10,
    );

    expect(listos.map((t) => t.id)).toEqual(['c']);
  });
});

describe('aplicarDecision', () => {
  const base = trabajo({ id: 'a', attempts: 2, status: 'sending' });

  it('marca el éxito como enviado, con su hora', () => {
    expect(aplicarDecision(base, 'exito', resultado({ ok: true }), 100, 0)).toMatchObject({
      status: 'sent',
      sentAt: 100,
      attempts: 3,
      lastError: null,
    });
  });

  it('aplaza el reintento según el número de intentos', () => {
    expect(
      aplicarDecision(base, 'reintentar', resultado({ status: 0, mensaje: 'sin red' }), 100, 0),
    ).toMatchObject({ status: 'pending', attempts: 3, nextAttemptAt: 4_100, lastError: 'sin red' });
  });

  it('deja el definitivo como fallido, con lo que dijo el servidor', () => {
    expect(
      aplicarDecision(base, 'definitivo', resultado({ code: '42501', mensaje: 'rls' }), 100, 0),
    ).toMatchObject({ status: 'failed', attempts: 3, lastError: '42501 · rls' });
  });
});

describe('purgables', () => {
  it('purga lo enviado hace más de 48 horas y nada más', () => {
    const ahora = PURGA_MS + 1_000;

    expect(
      purgables(
        [
          trabajo({ id: 'viejo', status: 'sent', sentAt: 500 }),
          trabajo({ id: 'reciente', status: 'sent', sentAt: 2_000 }),
          trabajo({ id: 'fallido', status: 'failed' }),
          trabajo({ id: 'pendiente' }),
        ],
        ahora,
      ),
    ).toEqual(['viejo']);
  });
});

describe('contar', () => {
  it('cuenta solo lo de quien tiene la sesión, y trae el último error', () => {
    expect(
      contar(
        [
          trabajo({ id: 'a' }),
          trabajo({ id: 'b', status: 'sending' }),
          trabajo({ id: 'c', status: 'failed', lastError: 'viejo', createdAt: 1 }),
          trabajo({ id: 'd', status: 'failed', lastError: 'nuevo', createdAt: 2 }),
          trabajo({ id: 'e', status: 'sent' }),
          trabajo({ id: 'f', userId: 'otra' }),
        ],
        'u1',
      ),
    ).toEqual({ pendientes: 2, fallidos: 2, ultimoError: 'nuevo' });
  });
});

describe('crearTrabajo', () => {
  it('nace pendiente, listo para enviar ya y con el client_event_id de la fila', () => {
    expect(
      crearTrabajo(
        {
          entity: 'match_event',
          op: 'insert',
          matchId: 'm1',
          payload: { valores: { client_event_id: 'ce-1', event_type: 'goal' } },
        },
        { id: 't1', userId: 'u1', ahora: 42 },
      ),
    ).toEqual(
      trabajo({
        id: 't1',
        payload: { valores: { client_event_id: 'ce-1', event_type: 'goal' } },
        clientEventId: 'ce-1',
        createdAt: 42,
        nextAttemptAt: 42,
      }),
    );
  });
});
