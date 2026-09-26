// `guardarConvocatoria` son dos escrituras que se pueden repetir (T-205). Lo
// que se vigila: la primera crea las líneas que faltan con `created_by`, sin
// convocar, y no pisa las que ya hay; la segunda escribe todas sin tocar
// `created_by`; y si la base devuelve menos líneas de las mandadas, sale
// `SIN_FILAS`.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SIN_FILAS } from '@shared/lib/guardado';

import { guardarConvocatoria } from './convocatoria';

import type { LineaAGuardar } from '../model/convocatoria';

interface Resultado {
  data: unknown;
  error: unknown;
}

const llamadas = vi.hoisted(() => ({
  upserts: [] as { tabla: string; filas: unknown; opciones: unknown }[],
  respuestas: [] as Resultado[],
}));

// Un cliente de mentira con la forma justa de las cadenas que usa `api/`: la
// primera escritura se espera tal cual y la segunda pide `select`.
vi.mock('@shared/lib/supabase', () => ({
  supabase: {
    from: (tabla: string) => ({
      upsert: (filas: unknown, opciones: unknown) => {
        llamadas.upserts.push({ tabla, filas, opciones });
        const respuesta = llamadas.respuestas.shift() ?? { data: null, error: null };

        return Object.assign(Promise.resolve(respuesta), {
          select: () => Promise.resolve(respuesta),
        });
      },
    }),
  },
}));

const LINEAS: LineaAGuardar[] = [
  { player_id: 'p1', call_status: 'starter', shirt_number: 1, position: 'GK' },
  { player_id: 'p2', call_status: 'not_called', shirt_number: null, position: null },
];

beforeEach(() => {
  llamadas.upserts = [];
  llamadas.respuestas = [
    { data: null, error: null },
    { data: [{ player_id: 'p1' }, { player_id: 'p2' }], error: null },
  ];
});

describe('guardarConvocatoria', () => {
  it('crea las que faltan sin convocar y con created_by, sin pisar las que hay, y después las escribe todas', async () => {
    await guardarConvocatoria('par-1', 'usuario-1', LINEAS);

    expect(llamadas.upserts).toEqual([
      {
        tabla: 'match_squad',
        filas: [
          {
            match_id: 'par-1',
            player_id: 'p1',
            call_status: 'not_called',
            created_by: 'usuario-1',
          },
          {
            match_id: 'par-1',
            player_id: 'p2',
            call_status: 'not_called',
            created_by: 'usuario-1',
          },
        ],
        opciones: { onConflict: 'match_id,player_id', ignoreDuplicates: true },
      },
      {
        tabla: 'match_squad',
        filas: [
          { ...LINEAS[0], match_id: 'par-1' },
          { ...LINEAS[1], match_id: 'par-1' },
        ],
        opciones: { onConflict: 'match_id,player_id' },
      },
    ]);
  });

  it('lanza SIN_FILAS si la base devuelve menos líneas de las mandadas', async () => {
    llamadas.respuestas[1] = { data: [{ player_id: 'p1' }], error: null };

    await expect(guardarConvocatoria('par-1', 'usuario-1', LINEAS)).rejects.toThrow(SIN_FILAS);
  });

  it('no sigue si la primera escritura falla', async () => {
    const fallo = { code: '42501', message: 'rls' };
    llamadas.respuestas[0] = { data: null, error: fallo };

    await expect(guardarConvocatoria('par-1', 'usuario-1', LINEAS)).rejects.toBe(fallo);
    expect(llamadas.upserts).toHaveLength(1);
  });
});
