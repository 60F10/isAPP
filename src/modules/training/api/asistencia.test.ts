// Acceso a datos de la asistencia (T-229). Se dobla el cliente de Supabase y
// se apuntan las llamadas.
//
// Lo que se vigila: que guardar sean dos `upsert` que se pueden repetir —el
// primero crea las filas que faltan con `created_by` y no pisa las que hay, el
// segundo las escribe todas sin tocar `created_by`—; que menos filas de vuelta
// salgan como `SIN_FILAS`; que sin filas no se llame a la base; y que de
// `players` solo se pida `nickname`.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SIN_FILAS } from '@shared/lib/guardado';

import { fetchAsistencia, guardarAsistencia } from './asistencia';

import type { FilaDeAsistencia } from '../model/lista';

interface Resultado {
  data: unknown;
  error: unknown;
}

const red = vi.hoisted(() => ({
  upserts: [] as { tabla: string; filas: unknown; opciones: unknown; pide: string | null }[],
  lecturas: [] as { tabla: string; columnas: string; filtro: unknown[] }[],
  respuestas: [] as { data: unknown; error: unknown }[],
}));

// Un cliente de mentira con la forma justa de las cadenas que usa `api/`: la
// primera escritura se espera tal cual, la segunda pide `select`, y la lectura
// es `select` y `eq`.
vi.mock('@shared/lib/supabase', () => ({
  supabase: {
    from: (tabla: string) => ({
      upsert: (filas: unknown, opciones: unknown) => {
        const apunte = { tabla, filas, opciones, pide: null as string | null };
        const respuesta = red.respuestas.shift() ?? { data: null, error: null };

        red.upserts.push(apunte);

        return Object.assign(Promise.resolve(respuesta), {
          select: (columnas: string) => {
            apunte.pide = columnas;

            return Promise.resolve(respuesta);
          },
        });
      },
      select: (columnas: string) => ({
        eq: (...filtro: unknown[]) => {
          red.lecturas.push({ tabla, columnas, filtro });

          return Promise.resolve(red.respuestas.shift() ?? { data: [], error: null });
        },
      }),
    }),
  },
}));

const FILAS: FilaDeAsistencia[] = [
  { player_id: 'p1', status: 'present', notes: null },
  { player_id: 'p2', status: 'absent', notes: 'Avisó' },
];

function respuestas(...lista: Resultado[]) {
  red.respuestas = lista;
}

beforeEach(() => {
  red.upserts = [];
  red.lecturas = [];
  respuestas(
    { data: null, error: null },
    { data: [{ player_id: 'p1' }, { player_id: 'p2' }], error: null },
  );
});

describe('guardarAsistencia', () => {
  it('crea las que faltan con created_by, sin pisar las que hay, y después las escribe todas', async () => {
    await guardarAsistencia('ent-1', 'usuario-1', FILAS);

    expect(red.upserts).toEqual([
      {
        tabla: 'training_attendance',
        filas: [
          {
            session_id: 'ent-1',
            player_id: 'p1',
            status: 'present',
            notes: null,
            created_by: 'usuario-1',
          },
          {
            session_id: 'ent-1',
            player_id: 'p2',
            status: 'absent',
            notes: 'Avisó',
            created_by: 'usuario-1',
          },
        ],
        opciones: { onConflict: 'session_id,player_id', ignoreDuplicates: true },
        pide: null,
      },
      {
        tabla: 'training_attendance',
        filas: [
          { session_id: 'ent-1', player_id: 'p1', status: 'present', notes: null },
          { session_id: 'ent-1', player_id: 'p2', status: 'absent', notes: 'Avisó' },
        ],
        opciones: { onConflict: 'session_id,player_id' },
        pide: 'player_id',
      },
    ]);
  });

  it('manda siempre el estado: la base lo pondría en presente por su cuenta', async () => {
    await guardarAsistencia('ent-1', 'usuario-1', FILAS);

    for (const { filas } of red.upserts) {
      for (const fila of filas as Record<string, unknown>[]) {
        expect(fila.status).toBeDefined();
      }
    }
  });

  it('el segundo no lleva created_by: quien pasó lista primero sigue constando', async () => {
    await guardarAsistencia('ent-1', 'usuario-1', FILAS);

    expect(JSON.stringify(red.upserts[1].filas)).not.toContain('created_by');
  });

  it('lanza SIN_FILAS si la base devuelve menos filas de las mandadas', async () => {
    respuestas({ data: null, error: null }, { data: [{ player_id: 'p1' }], error: null });

    await expect(guardarAsistencia('ent-1', 'usuario-1', FILAS)).rejects.toThrow(SIN_FILAS);
  });

  it('con cero filas no llama a la base', async () => {
    await guardarAsistencia('ent-1', 'usuario-1', []);

    expect(red.upserts).toEqual([]);
  });

  it('no sigue si la primera escritura falla', async () => {
    const fallo = { code: '42501', message: 'rls' };
    respuestas({ data: null, error: fallo });

    await expect(guardarAsistencia('ent-1', 'usuario-1', FILAS)).rejects.toBe(fallo);
    expect(red.upserts).toHaveLength(1);
  });

  it('lanza el error de la segunda escritura', async () => {
    const fallo = { code: '23514', message: 'check' };
    respuestas({ data: null, error: null }, { data: null, error: fallo });

    await expect(guardarAsistencia('ent-1', 'usuario-1', FILAS)).rejects.toBe(fallo);
  });
});

describe('fetchAsistencia', () => {
  it('pide players(nickname) de la sesión y no nombra el nombre real', async () => {
    respuestas({
      data: [
        { player_id: 'p1', status: 'late', notes: null, players: { nickname: 'Tito' } },
        { player_id: 'p2', status: 'absent', notes: 'Avisó', players: null },
      ],
      error: null,
    });

    const asistencia = await fetchAsistencia('ent-1');

    expect(red.lecturas).toEqual([
      {
        tabla: 'training_attendance',
        columnas: 'player_id, status, notes, players(nickname)',
        filtro: ['session_id', 'ent-1'],
      },
    ]);
    expect(red.lecturas[0].columnas).not.toContain('full_name');
    expect(red.lecturas[0].columnas).not.toContain('*');
    expect(asistencia).toEqual([
      { playerId: 'p1', nickname: 'Tito', status: 'late', notes: null },
      { playerId: 'p2', nickname: '—', status: 'absent', notes: 'Avisó' },
    ]);
  });

  it('lanza el error de la base', async () => {
    const fallo = { code: '42501', message: 'rls' };
    respuestas({ data: null, error: fallo });

    await expect(fetchAsistencia('ent-1')).rejects.toBe(fallo);
  });
});
