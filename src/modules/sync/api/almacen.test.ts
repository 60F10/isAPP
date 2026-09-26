// `encolarTrabajosJunto` (T-207): varios trabajos y otra escritura en una
// sola transacción, con el orden de la lista y solo con sesión.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { encolarTrabajosJunto } from './almacen';

import type { Trabajo } from '@shared/lib/db';

const estado = vi.hoisted(() => ({
  userId: 'u1' as string | null,
  añadidos: [] as Trabajo[],
  enTransaccion: false,
  dentro: [] as string[],
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
