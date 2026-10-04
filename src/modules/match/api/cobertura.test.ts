// La cobertura en el aparato (T-209a). Lo que se vigila: declarar, cerrar y
// cambiar encolan su trabajo y escriben la instantánea en la misma
// transacción, o nada; con una ya abierta no se declara otra; y el estado del
// directo que hay en la instantánea no se toca.
//
// Dexie va de verdad, sobre `fake-indexeddb`: lo que se prueba es la
// transacción. De `sync` entra de verdad el encolado y se queda fuera el
// vaciado, que es la red.

// Antes que nada: Dexie mira si hay IndexedDB al cargarse, y `jsdom` no trae.
import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@shared/lib/db';

import { cambiarCobertura, cerrarCobertura, declararCobertura, leerCobertura } from './cobertura';

import type { CoberturaLocal } from '../model/cobertura';
import type { Instantanea, PaqueteDePartido } from '../model/paquete';

vi.mock('@shared/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: { id: 'usuario-1' } } } }),
    },
  },
}));

vi.mock('@modules/sync', async () => {
  const almacen = await vi.importActual<typeof import('@modules/sync/api/almacen')>(
    '@modules/sync/api/almacen',
  );

  return { encolarJunto: almacen.encolarTrabajosJunto };
});

// La instantánea solo necesita existir: la cobertura no mira el paquete.
const PAQUETE = { partido: { id: 'par-1' } } as PaqueteDePartido;
const ESTADO = { partidoId: 'par-1', fase: 'en_juego' } as Instantanea['estado'];

const DECLARACION = {
  id: 'cob-1',
  partidoId: 'par-1',
  userId: 'usuario-1',
  alcance: 'full_team',
  jugador: null,
  tiposActivos: ['goal', 'yellow_card', 'corner'],
  desde: { periodo: 1, segundos: 0 },
  diferido: false,
} as const;

async function instantanea(): Promise<Instantanea> {
  const guardada = await db.matchSnapshots.get('par-1');

  return guardada?.datos as Instantanea;
}

async function cola() {
  const trabajos = await db.outbox.toArray();

  // En el orden en que saldrán: la cola los manda por `createdAt`.
  return trabajos
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((trabajo) => ({
      entity: trabajo.entity,
      op: trabajo.op,
      userId: trabajo.userId,
      payload: trabajo.payload,
    }));
}

beforeEach(async () => {
  // Cada encolado, en su milisegundo: la cola ordena por `createdAt`, y dos
  // llamadas seguidas de una prueba caben en el mismo.
  let reloj = Date.UTC(2026, 9, 4, 11, 0, 0);
  vi.spyOn(Date, 'now').mockImplementation(() => (reloj += 10));

  await db.outbox.clear();
  await db.matchSnapshots.clear();
  await db.matchSnapshots.put({
    matchId: 'par-1',
    updatedAt: 5,
    datos: { paquete: PAQUETE, descargadoEn: 5, estado: ESTADO } satisfies Instantanea,
  });
});

describe('declararCobertura', () => {
  it('encola el alta y escribe la instantánea, sin tocar el estado del directo', async () => {
    const abierta = await declararCobertura(DECLARACION);

    expect(abierta).toMatchObject({ id: 'cob-1', alcance: 'full_team', abierta: true });
    expect(await cola()).toEqual([
      {
        entity: 'coverage',
        op: 'insert',
        userId: 'usuario-1',
        payload: {
          valores: expect.objectContaining({
            id: 'cob-1',
            match_id: 'par-1',
            user_id: 'usuario-1',
            scope: 'full_team',
          }) as unknown,
        },
      },
    ]);
    expect(await instantanea()).toEqual({
      paquete: PAQUETE,
      descargadoEn: 5,
      estado: ESTADO,
      cobertura: abierta,
    });
    expect(await leerCobertura('par-1')).toEqual(abierta);
  });

  it('sin instantánea no queda nada en la cola: es todo o nada', async () => {
    await db.matchSnapshots.clear();

    await expect(declararCobertura(DECLARACION)).rejects.toThrow('SIN_PRECARGA');
    expect(await cola()).toEqual([]);
  });

  it('con una ya abierta no declara otra: devuelve la que hay y no encola nada', async () => {
    const primera = await declararCobertura(DECLARACION);
    const segunda = await declararCobertura({ ...DECLARACION, id: 'cob-2' });

    expect(segunda).toEqual(primera);
    expect(await cola()).toHaveLength(1);
  });

  it('sin tipos que cubrir no declara nada', async () => {
    expect(await declararCobertura({ ...DECLARACION, tiposActivos: [] })).toBeNull();
    expect(await cola()).toEqual([]);
    expect(await leerCobertura('par-1')).toBeNull();
  });
});

describe('cerrarCobertura', () => {
  it('encola el cierre con el instante y deja de estar abierta en el aparato', async () => {
    const abierta = (await declararCobertura(DECLARACION)) as CoberturaLocal;

    expect(await cerrarCobertura('par-1', abierta, { periodo: 2, segundos: 900 })).toBeNull();
    expect((await cola()).map((trabajo) => [trabajo.op, trabajo.payload])).toEqual([
      ['insert', expect.anything()],
      ['update', { valores: { end_period: 2, end_seconds: 900 }, clave: { id: 'cob-1' } }],
    ]);
    expect((await instantanea()).cobertura).toEqual({ ...abierta, abierta: false });
    expect(await leerCobertura('par-1')).toBeNull();
  });

  it('cerrarla dos veces no encola dos cierres', async () => {
    const abierta = (await declararCobertura(DECLARACION)) as CoberturaLocal;

    await cerrarCobertura('par-1', abierta, { periodo: 2, segundos: 900 });
    await cerrarCobertura('par-1', abierta, { periodo: 2, segundos: 950 });

    expect(await cola()).toHaveLength(2);
  });
});

describe('cambiarCobertura', () => {
  it('cierra la anterior y abre la nueva desde el mismo instante, en ese orden', async () => {
    const abierta = (await declararCobertura(DECLARACION)) as CoberturaLocal;
    const nueva = await cambiarCobertura(abierta, {
      ...DECLARACION,
      id: 'cob-2',
      alcance: 'single_player',
      jugador: 'p7',
      desde: { periodo: 1, segundos: 600 },
    });

    expect(nueva).toMatchObject({
      id: 'cob-2',
      alcance: 'single_player',
      jugador: 'p7',
      desde: { periodo: 1, segundos: 600 },
      abierta: true,
    });
    expect((await cola()).slice(1)).toEqual([
      {
        entity: 'coverage',
        op: 'update',
        userId: 'usuario-1',
        payload: { valores: { end_period: 1, end_seconds: 600 }, clave: { id: 'cob-1' } },
      },
      {
        entity: 'coverage',
        op: 'insert',
        userId: 'usuario-1',
        payload: {
          valores: expect.objectContaining({
            id: 'cob-2',
            scope: 'single_player',
            target_player_id: 'p7',
            start_period: 1,
            start_seconds: 600,
          }) as unknown,
        },
      },
    ]);
    expect((await instantanea()).cobertura).toEqual(nueva);
  });

  it('sin ninguna abierta, solo declara', async () => {
    const nueva = await cambiarCobertura(null, { ...DECLARACION, alcance: 'goals_cards' });

    expect(nueva).toMatchObject({ alcance: 'goals_cards', abierta: true });
    expect((await cola()).map((trabajo) => trabajo.op)).toEqual(['insert']);
  });
});
