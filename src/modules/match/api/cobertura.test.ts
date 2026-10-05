// La cobertura en el aparato (T-209a). Lo que se vigila: declarar, cerrar y
// cambiar encolan su trabajo y escriben la instantánea en la misma
// transacción, o nada; con una ya abierta no se declara otra; y el estado del
// directo que hay en la instantánea no se toca.
//
// Desde la T-221, cada una dice además si se aplicó, y la cobertura lleva de
// quién es: la de otra cuenta en este aparato cuenta como ninguna.
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
    const { cobertura: abierta, aplicado } = await declararCobertura(DECLARACION);

    expect(aplicado).toBe(true);
    expect(abierta).toMatchObject({
      id: 'cob-1',
      userId: 'usuario-1',
      alcance: 'full_team',
      abierta: true,
    });
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
    expect(await leerCobertura('par-1', 'usuario-1')).toEqual(abierta);
  });

  it('sin instantánea no queda nada en la cola: es todo o nada', async () => {
    await db.matchSnapshots.clear();

    await expect(declararCobertura(DECLARACION)).rejects.toThrow('SIN_PRECARGA');
    expect(await cola()).toEqual([]);
  });

  it('con una ya abierta no declara otra: devuelve la que hay y no encola nada', async () => {
    const primera = await declararCobertura(DECLARACION);
    const segunda = await declararCobertura({ ...DECLARACION, id: 'cob-2' });

    expect(primera.aplicado).toBe(true);
    expect(segunda).toEqual({ cobertura: primera.cobertura, aplicado: false });
    expect(await cola()).toHaveLength(1);
  });

  it('sin tipos que cubrir no declara nada', async () => {
    expect(await declararCobertura({ ...DECLARACION, tiposActivos: [] })).toEqual({
      cobertura: null,
      aplicado: false,
    });
    expect(await cola()).toEqual([]);
    expect(await leerCobertura('par-1', 'usuario-1')).toBeNull();
  });

  it('dos a la vez: una fila en la cola y una sola aplicada', async () => {
    const [una, otra] = await Promise.all([
      declararCobertura(DECLARACION),
      declararCobertura({ ...DECLARACION, id: 'cob-2' }),
    ]);

    expect([una.aplicado, otra.aplicado].filter(Boolean)).toHaveLength(1);
    // Las dos devuelven la misma: la que se quedó abierta en el aparato.
    expect(una.cobertura).toEqual(otra.cobertura);
    expect(await cola()).toHaveLength(1);
    expect((await instantanea()).cobertura).toEqual(una.cobertura);
  });
});

// T-221 (DOC 13, punto 75): la cobertura es de quien la declara, no del
// aparato. Otra cuenta que entra en el mismo móvil no hereda la que hay.
describe('la cobertura de otra persona en este aparato', () => {
  // Como las guardaba la T-209a: sin decir de quién.
  const SIN_DUEÑO: CoberturaLocal = {
    id: 'cob-ajena',
    alcance: 'goals_cards',
    jugador: null,
    tipos: ['goal', 'yellow_card'],
    desde: { periodo: 1, segundos: 0 },
    abierta: true,
  };
  const AJENA: CoberturaLocal = { ...SIN_DUEÑO, userId: 'usuario-2' };

  async function dejar(cobertura: CoberturaLocal) {
    await db.matchSnapshots.put({
      matchId: 'par-1',
      updatedAt: 5,
      datos: { paquete: PAQUETE, descargadoEn: 5, estado: ESTADO, cobertura } satisfies Instantanea,
    });
  }

  it('`leerCobertura` solo devuelve la de esa persona', async () => {
    await dejar(AJENA);

    expect(await leerCobertura('par-1', 'usuario-1')).toBeNull();
    expect(await leerCobertura('par-1', 'usuario-2')).toEqual(AJENA);
  });

  it('una guardada sin `userId`, de antes de la T-221, se da por propia', async () => {
    await dejar(SIN_DUEÑO);

    expect(await leerCobertura('par-1', 'usuario-1')).toEqual(SIN_DUEÑO);

    // Y como propia que es, no se declara otra encima.
    expect(await declararCobertura(DECLARACION)).toEqual({
      cobertura: SIN_DUEÑO,
      aplicado: false,
    });
    expect(await cola()).toEqual([]);
  });

  it('declarar abre la propia, la guarda y encola solo el alta: el cierre de la ajena no', async () => {
    await dejar(AJENA);

    const { cobertura: propia, aplicado } = await declararCobertura(DECLARACION);

    expect(aplicado).toBe(true);
    expect(propia).toMatchObject({ id: 'cob-1', userId: 'usuario-1', abierta: true });
    // Se pisa en el aparato: la ajena la termina el cierre del partido (C-03).
    expect((await instantanea()).cobertura).toEqual(propia);
    expect((await cola()).map((trabajo) => [trabajo.entity, trabajo.op])).toEqual([
      ['coverage', 'insert'],
    ]);
    expect((await cola())[0]?.payload.valores).toMatchObject({ id: 'cob-1' });
  });

  it('cambiar sin ninguna propia tampoco cierra la ajena', async () => {
    await dejar(AJENA);

    const { cobertura: propia, aplicado } = await cambiarCobertura(null, {
      ...DECLARACION,
      alcance: 'goals_cards',
    });

    expect(aplicado).toBe(true);
    expect(propia).toMatchObject({ id: 'cob-1', userId: 'usuario-1', alcance: 'goals_cards' });
    expect((await cola()).map((trabajo) => trabajo.op)).toEqual(['insert']);
  });
});

describe('cerrarCobertura', () => {
  it('encola el cierre con el instante y deja de estar abierta en el aparato', async () => {
    const abierta = (await declararCobertura(DECLARACION)).cobertura as CoberturaLocal;

    expect(await cerrarCobertura('par-1', abierta, { periodo: 2, segundos: 900 })).toEqual({
      cobertura: null,
      aplicado: true,
    });
    expect((await cola()).map((trabajo) => [trabajo.op, trabajo.payload])).toEqual([
      ['insert', expect.anything()],
      ['update', { valores: { end_period: 2, end_seconds: 900 }, clave: { id: 'cob-1' } }],
    ]);
    expect((await instantanea()).cobertura).toEqual({ ...abierta, abierta: false });
    expect(await leerCobertura('par-1', 'usuario-1')).toBeNull();
  });

  it('cerrarla dos veces no encola dos cierres', async () => {
    const abierta = (await declararCobertura(DECLARACION)).cobertura as CoberturaLocal;

    await cerrarCobertura('par-1', abierta, { periodo: 2, segundos: 900 });
    const segundo = await cerrarCobertura('par-1', abierta, { periodo: 2, segundos: 950 });

    expect(segundo).toEqual({ cobertura: null, aplicado: false });
    expect(await cola()).toHaveLength(2);
  });
});

describe('cambiarCobertura', () => {
  it('cierra la anterior y abre la nueva desde el mismo instante, en ese orden', async () => {
    const abierta = (await declararCobertura(DECLARACION)).cobertura as CoberturaLocal;
    const { cobertura: nueva, aplicado } = await cambiarCobertura(abierta, {
      ...DECLARACION,
      id: 'cob-2',
      alcance: 'single_player',
      jugador: 'p7',
      desde: { periodo: 1, segundos: 600 },
    });

    expect(aplicado).toBe(true);
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
    const { cobertura: nueva, aplicado } = await cambiarCobertura(null, {
      ...DECLARACION,
      alcance: 'goals_cards',
    });

    expect(aplicado).toBe(true);
    expect(nueva).toMatchObject({ alcance: 'goals_cards', abierta: true });
    expect((await cola()).map((trabajo) => trabajo.op)).toEqual(['insert']);
  });

  it('con la instantánea desfasada devuelve `aplicado: false` y no encola nada', async () => {
    const primera = (await declararCobertura(DECLARACION)).cobertura as CoberturaLocal;
    // Otra pestaña la cambia: la pantalla sigue creyendo que tiene la primera.
    const { cobertura: deLaOtra } = await cambiarCobertura(primera, {
      ...DECLARACION,
      id: 'cob-2',
      alcance: 'goals_cards',
    });
    const antes = await cola();

    const resultado = await cambiarCobertura(primera, {
      ...DECLARACION,
      id: 'cob-3',
      alcance: 'single_player',
      jugador: 'p7',
    });

    expect(resultado).toEqual({ cobertura: deLaOtra, aplicado: false });
    expect(await cola()).toEqual(antes);
    expect((await instantanea()).cobertura).toEqual(deLaOtra);
  });

  it('si la nueva no se puede declarar, deja la anterior y dice que no se aplicó', async () => {
    const abierta = (await declararCobertura(DECLARACION)).cobertura as CoberturaLocal;

    expect(
      await cambiarCobertura(abierta, { ...DECLARACION, id: 'cob-2', tiposActivos: [] }),
    ).toEqual({ cobertura: abierta, aplicado: false });
    expect(await cola()).toHaveLength(1);
  });
});
