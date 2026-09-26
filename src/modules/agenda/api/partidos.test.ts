// `marcarComoConvocado` llama a la función `marcar_convocado` de la base
// (DOC 05 §14.5, pieza 5a) en vez de escribir en `matches`: así basta con
// `lineup.manage`. Lo que se vigila: la llamada, que un `false` (partido ya
// empezado o inexistente) salga como `SIN_FILAS`, igual que antes, y que el
// error de la base, con su código, llegue tal cual al hook.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SIN_FILAS } from '@shared/lib/guardado';

import { marcarComoConvocado } from './partidos';

interface Resultado {
  data: unknown;
  error: unknown;
}

const llamadas = vi.hoisted(() => ({
  rpcs: [] as { funcion: string; argumentos: unknown }[],
  respuesta: { data: null, error: null } as Resultado,
}));

vi.mock('@shared/lib/supabase', () => ({
  supabase: {
    rpc: (funcion: string, argumentos: unknown) => {
      llamadas.rpcs.push({ funcion, argumentos });

      return Promise.resolve(llamadas.respuesta);
    },
  },
}));

beforeEach(() => {
  llamadas.rpcs = [];
  llamadas.respuesta = { data: true, error: null };
});

describe('marcarComoConvocado', () => {
  it('llama a marcar_convocado con el partido', async () => {
    await marcarComoConvocado('par-1');

    expect(llamadas.rpcs).toEqual([
      { funcion: 'marcar_convocado', argumentos: { p_match_id: 'par-1' } },
    ]);
  });

  it('lanza SIN_FILAS si la base dice que no cambió nada', async () => {
    llamadas.respuesta = { data: false, error: null };

    await expect(marcarComoConvocado('par-1')).rejects.toThrow(SIN_FILAS);
  });

  it('deja pasar el error de la base con su código', async () => {
    const error = { code: '42501', message: 'Convocar exige el permiso lineup.manage' };
    llamadas.respuesta = { data: null, error };

    await expect(marcarComoConvocado('par-1')).rejects.toBe(error);
  });
});
