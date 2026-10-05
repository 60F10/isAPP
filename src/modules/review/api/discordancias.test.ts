// Acceso a datos del panel de eventos (T-222). Se dobla el cliente de Supabase
// y se apuntan las llamadas encadenadas: lo que se vigila es QUÉ se pide y con
// qué filtros, no lo que hacen las pantallas con un doble entero de `api/`.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SIN_FILAS } from '@shared/lib/guardado';

import {
  aprobarPendientes,
  cambiarMinuto,
  EVENTO_CAMBIADO,
  fetchAutores,
  resolverEvento,
} from './discordancias';

interface Llamada {
  metodo: string;
  args: unknown[];
}

const red = vi.hoisted(() => ({
  llamadas: [] as { tabla: string; cadena: { metodo: string; args: unknown[] }[] }[],
  respuesta: { data: null, error: null } as { data: unknown; error: unknown },
}));

vi.mock('@shared/lib/supabase', () => {
  const cadena = (registro: { metodo: string; args: unknown[] }[]): unknown =>
    new Proxy(
      {},
      {
        get: (_objetivo, metodo: string) => {
          if (metodo === 'then') {
            return (alResolver: (valor: unknown) => unknown) =>
              Promise.resolve(red.respuesta).then(alResolver);
          }

          return (...args: unknown[]) => {
            registro.push({ metodo, args });

            return cadena(registro);
          };
        },
      },
    );

  return {
    supabase: {
      from: (tabla: string) => {
        const registro: { metodo: string; args: unknown[] }[] = [];

        red.llamadas.push({ tabla, cadena: registro });

        return cadena(registro);
      },
    },
  };
});

function ultima(): { tabla: string; cadena: Llamada[] } {
  const llamada = red.llamadas.at(-1);

  if (llamada === undefined) {
    throw new Error('No hubo ninguna llamada.');
  }

  return llamada;
}

function filtros(cadena: Llamada[]): [unknown, unknown][] {
  return cadena
    .filter((paso) => paso.metodo === 'eq' || paso.metodo === 'in')
    .map((paso) => [paso.args[0], paso.args[1]]);
}

function escrito(cadena: Llamada[]): unknown {
  return cadena.find((paso) => paso.metodo === 'update')?.args[0];
}

beforeEach(() => {
  red.llamadas.length = 0;
  red.respuesta = { data: { id: 'e1' }, error: null };
});

describe('resolverEvento', () => {
  it('lleva el id, el partido y el estado de partida, y escribe solo status, reviewed_by y reviewed_at', async () => {
    await resolverEvento({ id: 'e1', partidoId: 'p1', de: 'pending', a: 'approved', userId: 'u1' });

    const { tabla, cadena } = ultima();

    expect(tabla).toBe('match_events');
    expect(filtros(cadena)).toEqual([
      ['id', 'e1'],
      ['match_id', 'p1'],
      ['status', 'pending'],
    ]);
    expect(Object.keys(escrito(cadena) as object).sort()).toEqual([
      'reviewed_at',
      'reviewed_by',
      'status',
    ]);
    expect(escrito(cadena)).toMatchObject({ status: 'approved', reviewed_by: 'u1' });
  });

  it.each([
    ['descartar', 'pending', 'rejected'],
    ['recuperar', 'rejected', 'approved'],
  ] as const)('al %s lleva también el estado de partida', async (_nombre, de, a) => {
    await resolverEvento({ id: 'e1', partidoId: 'p1', de, a, userId: 'u1' });

    expect(filtros(ultima().cadena)).toContainEqual(['status', de]);
    expect(escrito(ultima().cadena)).toMatchObject({ status: a });
  });

  it('con cero filas lanza EVENTO_CAMBIADO', async () => {
    red.respuesta = { data: null, error: null };

    await expect(
      resolverEvento({ id: 'e1', partidoId: 'p1', de: 'pending', a: 'approved', userId: 'u1' }),
    ).rejects.toThrow(EVENTO_CAMBIADO);
  });

  it('el error de la base pasa tal cual', async () => {
    const fallo = { code: '42501', message: 'no' };

    red.respuesta = { data: null, error: fallo };

    await expect(
      resolverEvento({ id: 'e1', partidoId: 'p1', de: 'pending', a: 'approved', userId: 'u1' }),
    ).rejects.toBe(fallo);
  });
});

describe('aprobarPendientes', () => {
  it('lleva los ids, el partido y el estado pendiente, y cuenta pedidos y aprobados', async () => {
    red.respuesta = { data: [{ id: 'e1' }, { id: 'e2' }], error: null };

    const resultado = await aprobarPendientes({
      ids: ['e1', 'e2', 'e3'],
      partidoId: 'p1',
      userId: 'u1',
    });

    expect(resultado).toEqual({ pedidos: 3, aprobados: 2 });
    expect(filtros(ultima().cadena)).toEqual([
      ['id', ['e1', 'e2', 'e3']],
      ['match_id', 'p1'],
      ['status', 'pending'],
    ]);
    expect(Object.keys(escrito(ultima().cadena) as object).sort()).toEqual([
      'reviewed_at',
      'reviewed_by',
      'status',
    ]);
  });

  it('sin ids no llama a la base', async () => {
    const resultado = await aprobarPendientes({ ids: [], partidoId: 'p1', userId: 'u1' });

    expect(resultado).toEqual({ pedidos: 0, aprobados: 0 });
    expect(red.llamadas).toHaveLength(0);
  });

  it('con cero filas lanza EVENTO_CAMBIADO', async () => {
    red.respuesta = { data: [], error: null };

    await expect(aprobarPendientes({ ids: ['e1'], partidoId: 'p1', userId: 'u1' })).rejects.toThrow(
      EVENTO_CAMBIADO,
    );
  });
});

describe('cambiarMinuto', () => {
  it('lleva el id y el partido, y escribe solo period y seconds', async () => {
    await cambiarMinuto({ id: 'e1', partidoId: 'p1', periodo: 2, segundos: 1800 });

    expect(filtros(ultima().cadena)).toEqual([
      ['id', 'e1'],
      ['match_id', 'p1'],
    ]);
    expect(escrito(ultima().cadena)).toEqual({ period: 2, seconds: 1800 });
  });

  it('con cero filas lanza SIN_FILAS', async () => {
    red.respuesta = { data: null, error: null };

    await expect(
      cambiarMinuto({ id: 'e1', partidoId: 'p1', periodo: 1, segundos: 60 }),
    ).rejects.toThrow(SIN_FILAS);
  });
});

describe('las escrituras piden la fila de vuelta', () => {
  it.each([
    [
      'resolverEvento',
      () =>
        resolverEvento({ id: 'e1', partidoId: 'p1', de: 'pending', a: 'approved', userId: 'u1' }),
    ],
    ['aprobarPendientes', () => aprobarPendientes({ ids: ['e1'], partidoId: 'p1', userId: 'u1' })],
    ['cambiarMinuto', () => cambiarMinuto({ id: 'e1', partidoId: 'p1', periodo: 1, segundos: 60 })],
  ])('%s encadena select tras el update', async (_nombre, llamar) => {
    red.respuesta = { data: [{ id: 'e1' }], error: null };

    await llamar();

    const metodos = ultima().cadena.map((paso) => paso.metodo);

    expect(metodos).toContain('update');
    expect(metodos.indexOf('select')).toBeGreaterThan(metodos.indexOf('update'));
  });
});

describe('fetchAutores', () => {
  it('pide solo id y display_name', async () => {
    red.respuesta = {
      data: [
        { id: 'u1', display_name: ' Isaac ' },
        { id: 'u2', display_name: null },
      ],
      error: null,
    };

    const autores = await fetchAutores(['u1', 'u2']);

    const seleccion = ultima().cadena.find((paso) => paso.metodo === 'select');

    expect(ultima().tabla).toBe('profiles');
    expect(seleccion?.args[0]).toBe('id, display_name');
    expect(autores).toEqual(new Map([['u1', 'Isaac']]));
  });

  it('sin ids no llama a la base', async () => {
    expect((await fetchAutores([])).size).toBe(0);
    expect(red.llamadas).toHaveLength(0);
  });
});
