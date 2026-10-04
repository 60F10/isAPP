import { describe, expect, it, vi } from 'vitest';

import { vaciar } from './vaciador';

import type { ResultadoDeEnvio } from './cola';
import type { Almacen } from './vaciador';
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

/** Un almacén en memoria con la misma forma que el de Dexie. */
function enMemoria(iniciales: Trabajo[]): Almacen & { filas: Map<string, Trabajo> } {
  const filas = new Map(iniciales.map((t) => [t.id, t]));

  return {
    filas,
    pendientes: (userId) =>
      Promise.resolve(
        [...filas.values()].filter(
          (t) => t.userId === userId && (t.status === 'pending' || t.status === 'sending'),
        ),
      ),
    guardar: (t) => {
      filas.set(t.id, t);
      return Promise.resolve();
    },
  };
}

const BIEN: ResultadoDeEnvio = { ok: true, status: 201, code: null, mensaje: null };
const SIN_RED: ResultadoDeEnvio = { ok: false, status: 0, code: null, mensaje: 'sin red' };
const RLS: ResultadoDeEnvio = { ok: false, status: 403, code: '42501', mensaje: 'rls' };

describe('vaciar', () => {
  it('envía todo en orden dentro del partido y lo marca como enviado', async () => {
    const almacen = enMemoria([
      trabajo({ id: 'b', createdAt: 2 }),
      trabajo({ id: 'a', createdAt: 1 }),
      trabajo({ id: 'x', matchId: 'm2', createdAt: 3 }),
    ]);
    const orden: string[] = [];

    const resumen = await vaciar({
      almacen,
      enviar: (t) => {
        orden.push(t.id);
        return Promise.resolve(BIEN);
      },
      userId: 'u1',
      ahora: () => 100,
      azar: () => 0,
    });

    expect(orden).toEqual(['a', 'x', 'b']);
    expect(resumen).toEqual({ enviados: 3, aplazados: 0, fallidos: [] });
    expect([...almacen.filas.values()].every((t) => t.status === 'sent' && t.sentAt === 100)).toBe(
      true,
    );
  });

  it('sin red aplaza el primero y no envía los de detrás de su partido', async () => {
    const almacen = enMemoria([
      trabajo({ id: 'a', createdAt: 1 }),
      trabajo({ id: 'b', createdAt: 2 }),
    ]);
    const enviar = vi.fn(() => Promise.resolve(SIN_RED));

    const resumen = await vaciar({
      almacen,
      enviar,
      userId: 'u1',
      ahora: () => 100,
      azar: () => 0,
    });

    expect(enviar).toHaveBeenCalledTimes(1);
    expect(resumen).toEqual({ enviados: 0, aplazados: 1, fallidos: [] });
    expect(almacen.filas.get('a')).toMatchObject({
      status: 'pending',
      attempts: 1,
      nextAttemptAt: 1_100,
    });
    expect(almacen.filas.get('b')).toMatchObject({ status: 'pending', attempts: 0 });
  });

  it('deja como fallido lo que el servidor rechaza, lo devuelve y sigue con el siguiente', async () => {
    const almacen = enMemoria([
      trabajo({ id: 'a', createdAt: 1 }),
      trabajo({ id: 'b', createdAt: 2 }),
    ]);
    const enviar = vi.fn((t: Trabajo) => Promise.resolve(t.id === 'a' ? RLS : BIEN));

    const resumen = await vaciar({
      almacen,
      enviar,
      userId: 'u1',
      ahora: () => 100,
      azar: () => 0,
    });

    expect(resumen.enviados).toBe(1);
    expect(resumen.fallidos.map((t) => t.id)).toEqual(['a']);
    expect(almacen.filas.get('a')).toMatchObject({ status: 'failed', lastError: '42501 · rls' });
    expect(almacen.filas.get('b')).toMatchObject({ status: 'sent' });
  });

  it('marca el trabajo como enviándose antes de mandarlo', async () => {
    const almacen = enMemoria([trabajo({ id: 'a' })]);
    let estadoAlEnviar: string | undefined;

    await vaciar({
      almacen,
      enviar: () => {
        estadoAlEnviar = almacen.filas.get('a')?.status;
        return Promise.resolve(BIEN);
      },
      userId: 'u1',
      ahora: () => 100,
      azar: () => 0,
    });

    expect(estadoAlEnviar).toBe('sending');
  });

  it('un transporte que lanza cuenta como sin red, no rompe el vaciado', async () => {
    const almacen = enMemoria([trabajo({ id: 'a' })]);

    const resumen = await vaciar({
      almacen,
      enviar: () => Promise.reject(new Error('reventó')),
      userId: 'u1',
      ahora: () => 100,
      azar: () => 0,
    });

    expect(resumen.aplazados).toBe(1);
    expect(almacen.filas.get('a')).toMatchObject({ status: 'pending', lastError: 'reventó' });
  });

  it('si `seguir` da false tras el primer trabajo, el segundo se queda sin tocar', async () => {
    const almacen = enMemoria([
      trabajo({ id: 'a', createdAt: 1 }),
      trabajo({ id: 'x', matchId: 'm2', createdAt: 2 }),
    ]);
    const enviar = vi.fn(() => Promise.resolve(BIEN));

    const resumen = await vaciar({
      almacen,
      enviar,
      userId: 'u1',
      ahora: () => 100,
      azar: () => 0,
      seguir: () => enviar.mock.calls.length === 0,
    });

    expect(enviar).toHaveBeenCalledTimes(1);
    expect(resumen).toEqual({ enviados: 1, aplazados: 0, fallidos: [] });
    expect(almacen.filas.get('a')).toMatchObject({ status: 'sent' });
    expect(almacen.filas.get('x')).toMatchObject({ status: 'pending', attempts: 0 });
  });

  it('si `seguir` da false de entrada, no envía nada', async () => {
    const almacen = enMemoria([trabajo({ id: 'a' })]);
    const enviar = vi.fn(() => Promise.resolve(BIEN));

    await vaciar({
      almacen,
      enviar,
      userId: 'u1',
      ahora: () => 100,
      azar: () => 0,
      seguir: () => false,
    });

    expect(enviar).not.toHaveBeenCalled();
    expect(almacen.filas.get('a')).toMatchObject({ status: 'pending', attempts: 0 });
  });

  it('no toca lo de otra cuenta', async () => {
    const almacen = enMemoria([trabajo({ id: 'ajeno', userId: 'u2' })]);
    const enviar = vi.fn(() => Promise.resolve(BIEN));

    await vaciar({ almacen, enviar, userId: 'u1', ahora: () => 100, azar: () => 0 });

    expect(enviar).not.toHaveBeenCalled();
  });
});
