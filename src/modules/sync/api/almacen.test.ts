// `encolarTrabajosJunto` (T-207): varios trabajos y otra escritura en una
// sola transacción, con el orden de la lista y solo con sesión.

// Antes que nada: Dexie mira si hay IndexedDB al cargarse, y `jsdom` no trae.
import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { descartarRechazado, encolarTrabajosJunto, pendientesDelPartido } from './almacen';

import type { Trabajo } from '@shared/lib/db';

const estado = vi.hoisted(() => ({
  userId: 'u1' as string | null,
  añadidos: [] as Trabajo[],
  enTransaccion: false,
  dentro: [] as string[],
  guardados: new Map<string, Trabajo>(),
}));

vi.mock('@shared/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({
          data: { session: estado.userId === null ? null : { user: { id: estado.userId } } },
        }),
    },
  },
}));

vi.mock('@shared/lib/db', () => ({
  db: {
    tables: [],
    outbox: {
      get: (id: string) => Promise.resolve(estado.guardados.get(id)),
      where: (indice: 'matchId') => ({
        equals: (valor: string) => ({
          toArray: () =>
            Promise.resolve(
              [...estado.guardados.values()].filter((trabajo) => trabajo[indice] === valor),
            ),
        }),
      }),
      delete: (id: string) => {
        estado.guardados.delete(id);
        return Promise.resolve();
      },
      bulkAdd: (trabajos: Trabajo[]) => {
        estado.dentro.push(estado.enTransaccion ? 'cola' : 'cola-fuera');
        estado.añadidos.push(...trabajos);
        return Promise.resolve();
      },
    },
    transaction: async (_modo: string, _tablas: unknown, cuerpo: () => Promise<void>) => {
      estado.enTransaccion = true;
      await cuerpo();
      estado.enTransaccion = false;
    },
  },
}));

const ENTRADAS = [
  {
    entity: 'match' as const,
    op: 'update' as const,
    matchId: 'm1',
    payload: { valores: { status: 'live' }, clave: { id: 'm1' } },
  },
  {
    entity: 'match_period' as const,
    op: 'insert' as const,
    matchId: 'm1',
    payload: { valores: { id: 'p1' } },
  },
];

beforeEach(() => {
  estado.userId = 'u1';
  estado.añadidos = [];
  estado.dentro = [];
});

describe('encolarTrabajosJunto', () => {
  it('encola y escribe lo demás dentro de la misma transacción', async () => {
    await encolarTrabajosJunto(ENTRADAS, () => {
      estado.dentro.push(estado.enTransaccion ? 'estado' : 'estado-fuera');
      return Promise.resolve();
    });

    expect(estado.dentro).toEqual(['cola', 'estado']);
  });

  it('respeta el orden de la lista: cada trabajo, un milisegundo después del anterior', async () => {
    await encolarTrabajosJunto(ENTRADAS, () => Promise.resolve());

    const [primero, segundo] = estado.añadidos;
    expect(primero?.entity).toBe('match');
    expect(segundo?.entity).toBe('match_period');
    expect((segundo?.createdAt ?? 0) - (primero?.createdAt ?? 0)).toBe(1);
    expect(estado.añadidos.every((t) => t.userId === 'u1' && t.status === 'pending')).toBe(true);
  });

  it('sin sesión no encola nada', async () => {
    estado.userId = null;

    await expect(encolarTrabajosJunto(ENTRADAS, () => Promise.resolve())).rejects.toThrow(
      'Sin sesión',
    );
    expect(estado.añadidos).toEqual([]);
  });
});

// T-216: la transacción se abre solo sobre la cola y las tablas que se le
// pasan. Aquí hace falta Dexie de verdad, sobre `fake-indexeddb`: es Dexie
// quien rechaza una escritura en una tabla que no está en la transacción.
describe('encolarTrabajosJunto con tablas', () => {
  async function cargarDeVerdad() {
    vi.resetModules();
    vi.doUnmock('@shared/lib/db');

    const { db } = await import('@shared/lib/db');
    const almacen = await import('./almacen');
    await Promise.all(db.tables.map((tabla) => tabla.clear()));

    return { db, encolar: almacen.encolarTrabajosJunto };
  }

  it('escribir en una tabla que no está en la lista rechaza y la cola queda vacía', async () => {
    const { db, encolar } = await cargarDeVerdad();

    await expect(
      encolar(ENTRADAS, async () => {
        await db.matchEvents.put({
          clientEventId: 'c1',
          matchId: 'm1',
          syncState: 'pending',
          period: 1,
          fila: {},
        });
      }, [db.matchSnapshots]),
    ).rejects.toThrow();

    expect(await db.outbox.count()).toBe(0);
    expect(await db.matchEvents.count()).toBe(0);
  });

  it('escribir en una tabla de la lista se guarda junto con la cola', async () => {
    const { db, encolar } = await cargarDeVerdad();

    await encolar(ENTRADAS, async () => {
      await db.matchSnapshots.put({ matchId: 'm1', updatedAt: 1, datos: {} });
    }, [db.matchSnapshots]);

    expect(await db.outbox.count()).toBe(2);
    expect(await db.matchSnapshots.count()).toBe(1);
  });

  it('sin lista, la transacción cubre todas las tablas, como antes', async () => {
    const { db, encolar } = await cargarDeVerdad();

    await encolar(ENTRADAS, async () => {
      await db.matchEvents.put({
        clientEventId: 'c1',
        matchId: 'm1',
        syncState: 'pending',
        period: 1,
        fila: {},
      });
    });

    expect(await db.outbox.count()).toBe(2);
    expect(await db.matchEvents.count()).toBe(1);
  });
});

describe('descartarRechazado', () => {
  function guardar(id: string, status: Trabajo['status'], userId: string) {
    estado.guardados.set(id, { id, status, userId } as Trabajo);
  }

  beforeEach(() => {
    estado.guardados.clear();
  });

  it('borra un rechazado propio', async () => {
    guardar('a', 'failed', 'u1');

    await expect(descartarRechazado('a', 'u1')).resolves.toBe(true);
    expect(estado.guardados.has('a')).toBe(false);
  });

  it('no borra uno pendiente', async () => {
    guardar('a', 'pending', 'u1');

    await expect(descartarRechazado('a', 'u1')).resolves.toBe(false);
    expect(estado.guardados.has('a')).toBe(true);
  });

  it('no borra un rechazado de otra cuenta', async () => {
    guardar('a', 'failed', 'otra');

    await expect(descartarRechazado('a', 'u1')).resolves.toBe(false);
    expect(estado.guardados.has('a')).toBe(true);
  });
});

// T-209b: lo que el refresco del directo necesita saber de la cola para no
// comerse lo que este aparato tiene de camino.
describe('pendientesDelPartido', () => {
  function trabajo(id: string, cambios: Partial<Trabajo>): void {
    estado.guardados.set(id, {
      id,
      userId: 'u1',
      entity: 'match_event',
      op: 'insert',
      payload: { valores: { client_event_id: id } },
      clientEventId: id,
      matchId: 'm1',
      createdAt: 1,
      attempts: 0,
      nextAttemptAt: 0,
      status: 'pending',
      lastError: null,
      sentAt: null,
      ...cambios,
    });
  }

  function borrado(id: string, de: string, cambios: Partial<Trabajo> = {}): void {
    trabajo(id, {
      op: 'delete',
      clientEventId: null,
      payload: { valores: {}, clave: { client_event_id: de } },
      ...cambios,
    });
  }

  beforeEach(() => {
    estado.guardados.clear();
  });

  it('`altas` trae lo pendiente, lo fallido y lo enviado después de `desde`', async () => {
    trabajo('pendiente', {});
    trabajo('enviandose', { status: 'sending' });
    trabajo('rechazado', { status: 'failed' });
    trabajo('recien-enviado', { status: 'sent', sentAt: 1_000 });
    trabajo('justo', { status: 'sent', sentAt: 500 });

    const { altas, bajas } = await pendientesDelPartido('m1', 500);

    expect([...altas].sort()).toEqual([
      'enviandose',
      'justo',
      'pendiente',
      'rechazado',
      'recien-enviado',
    ]);
    expect(bajas.size).toBe(0);
  });

  it('`altas` no trae lo enviado antes de `desde` ni lo de otro partido', async () => {
    trabajo('viejo', { status: 'sent', sentAt: 499 });
    trabajo('de-otro', { matchId: 'm2' });
    trabajo('otra-cuenta', { userId: 'u2' });

    const { altas } = await pendientesDelPartido('m1', 500);

    // El partido es el mismo lo anote quien lo anote en este aparato.
    expect([...altas]).toEqual(['otra-cuenta']);
  });

  it('`bajas` saca el identificador de `payload.clave`, con la misma regla de `desde`', async () => {
    borrado('b1', 'gol-deshecho');
    borrado('b2', 'recien-borrado', { status: 'sent', sentAt: 900 });
    borrado('b3', 'borrado-hace-rato', { status: 'sent', sentAt: 100 });
    borrado('b4', 'de-otro', { matchId: 'm2' });

    const { altas, bajas } = await pendientesDelPartido('m1', 500);

    expect([...bajas].sort()).toEqual(['gol-deshecho', 'recien-borrado']);
    expect(altas.size).toBe(0);
  });

  it('solo mira los eventos: una parte o una cobertura no son ni alta ni baja', async () => {
    trabajo('parte', { entity: 'match_period', clientEventId: null });
    trabajo('cobertura', { entity: 'coverage' });
    trabajo('cierre', {
      entity: 'coverage',
      op: 'delete',
      payload: { valores: {}, clave: { client_event_id: 'x' } },
    });

    const { altas, bajas } = await pendientesDelPartido('m1', 0);

    expect(altas.size).toBe(0);
    expect(bajas.size).toBe(0);
  });
});
