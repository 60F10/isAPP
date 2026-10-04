// Carga y guardado del directo (T-207). Lo que se vigila: sin cobertura se
// usa lo precargado, sin precarga no se abre, el estado guardado en el
// aparato se tiene en cuenta, y guardar con trabajos va por `encolarJunto`.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@shared/lib/db';

import { desdePaquete } from '../model/directo';
import { aplicarTransicion, cargarDirecto, refrescarDirecto, SIN_PRECARGA } from './directo';

import type { EstadoDirecto } from '../model/directo';
import type { Instantanea, PaqueteDePartido } from '../model/paquete';

const precarga = vi.hoisted(() => ({
  precargarPartido: vi.fn(),
  leerInstantanea: vi.fn(),
  descargarPaquete: vi.fn(),
  guardarPaquete: vi.fn(),
}));
const sync = vi.hoisted(() => ({ encolarJunto: vi.fn(), pendientesDelPartido: vi.fn() }));
const almacen = vi.hoisted(() => ({ guardada: undefined as unknown, puestas: [] as unknown[] }));

vi.mock('./precarga', () => precarga);
vi.mock('@modules/sync', () => sync);
vi.mock('@shared/lib/db', () => ({
  db: {
    matchSnapshots: {
      get: () => Promise.resolve(almacen.guardada),
      put: (fila: unknown) => {
        almacen.puestas.push(fila);
        return Promise.resolve();
      },
    },
    transaction: (_modo: string, _tabla: unknown, cuerpo: () => Promise<void>) => cuerpo(),
  },
}));

const PAQUETE: PaqueteDePartido = {
  partido: {
    id: 'par-1',
    teamId: 'eq-1',
    competitionId: 'comp-1',
    opponentName: 'At. Tacoronte',
    isHome: false,
    kickoffAt: '2026-10-04T11:00:00Z',
    venue: null,
    status: 'called',
    isRetroactive: false,
  },
  reglamento: {
    periods_count: 2,
    period_minutes: 40,
    halftime_minutes: 15,
    clock_mode: 'running',
    substitution_type: 'fixed',
    substitutions_max: 5,
    squad_max: 18,
    players_on_pitch: 1,
    yellow_cards_for_ban: 5,
    red_card_default_bans: 1,
    enabled_event_types: ['goal'],
  },
  convocatoria: [
    { playerId: 'p1', nickname: 'Pepe', callStatus: 'starter', shirtNumber: 1, position: null },
  ],
  partes: [],
  eventos: [],
};

const ARRANQUE = Date.parse('2026-10-04T11:00:00Z');

/** Una parte abierta en este aparato, con el `id` que generó al empezarla. */
const PARTE_LOCAL = {
  id: 'parte-B',
  numero: 1,
  inicio: ARRANQUE + 5_000,
  pausadoMs: 0,
  pausaDesde: null,
  segundosReales: null,
};

/** El estado guardado en el aparato: la parte 1 abierta y en pausa, sin enviar todavía. */
const EN_PAUSA: EstadoDirecto = {
  ...desdePaquete(PAQUETE),
  fase: 'pausado',
  partes: [{ ...PARTE_LOCAL, pausaDesde: ARRANQUE + 60_000 }],
};

beforeEach(() => {
  precarga.precargarPartido.mockReset();
  precarga.leerInstantanea.mockReset();
  precarga.descargarPaquete.mockReset();
  precarga.guardarPaquete.mockReset();
  precarga.guardarPaquete.mockResolvedValue(undefined);
  sync.encolarJunto.mockReset();
  sync.pendientesDelPartido.mockReset();
  sync.pendientesDelPartido.mockResolvedValue({ altas: new Set(), bajas: new Set() });
  almacen.guardada = undefined;
  almacen.puestas = [];
});

describe('cargarDirecto', () => {
  it('con cobertura refresca la precarga y sale del servidor', async () => {
    precarga.precargarPartido.mockResolvedValue({});
    precarga.leerInstantanea.mockResolvedValue({ paquete: PAQUETE, descargadoEn: 5 });

    const cargado = await cargarDirecto('par-1');

    expect(cargado).toMatchObject({ refrescado: true, descargadoEn: 5 });
    expect(cargado.estado).toEqual(desdePaquete(PAQUETE));
  });

  it('sin cobertura sigue con lo precargado y lo dice', async () => {
    precarga.precargarPartido.mockRejectedValue(new TypeError('Failed to fetch'));
    precarga.leerInstantanea.mockResolvedValue({ paquete: PAQUETE, descargadoEn: 5 });

    expect((await cargarDirecto('par-1')).refrescado).toBe(false);
  });

  it('sin precarga no abre', async () => {
    precarga.precargarPartido.mockRejectedValue(new TypeError('Failed to fetch'));
    precarga.leerInstantanea.mockResolvedValue(null);

    await expect(cargarDirecto('par-1')).rejects.toThrow(SIN_PRECARGA);
  });

  it('recupera el estado guardado en el aparato', async () => {
    const local = EN_PAUSA;
    precarga.precargarPartido.mockResolvedValue({});
    precarga.leerInstantanea.mockResolvedValue({
      paquete: PAQUETE,
      descargadoEn: 5,
      estado: local,
    });

    expect((await cargarDirecto('par-1')).estado).toEqual(local);
  });

  it('descarta un estado guardado con la forma de antes de la T-208', async () => {
    const viejo = { partidoId: 'par-1', fase: 'pausado', partes: [], enCampo: ['p1'] };
    precarga.precargarPartido.mockResolvedValue({});
    precarga.leerInstantanea.mockResolvedValue({
      paquete: PAQUETE,
      descargadoEn: 5,
      estado: viejo,
    });

    expect((await cargarDirecto('par-1')).estado).toEqual(desdePaquete(PAQUETE));
  });

  it('suma los eventos del servidor que el estado del aparato no conocía', async () => {
    const local = EN_PAUSA;
    const conGol = {
      ...PAQUETE,
      eventos: [
        {
          client_event_id: 'ajeno',
          event_type: 'goal',
          period: 1,
          seconds: 5,
          is_opponent: true,
          player_id: null,
          status: 'approved',
        },
      ],
    };
    precarga.precargarPartido.mockResolvedValue({});
    precarga.leerInstantanea.mockResolvedValue({ paquete: conGol, descargadoEn: 5, estado: local });

    const { estado } = await cargarDirecto('par-1');

    expect(estado.fase).toBe('pausado');
    expect(estado.eventos.map((e) => e.clientEventId)).toEqual(['ajeno']);
  });
});

// T-209b: al abrir se funde con la misma lectura de la cola que en un refresco.
describe('cargarDirecto con la cola', () => {
  const GOL = {
    client_event_id: 'gol-1',
    event_type: 'goal',
    period: 1,
    seconds: 5,
    is_opponent: true,
    player_id: null,
    status: 'approved',
  };

  it('deshacer un evento enviado y volver a cargar con el borrado en la cola: no vuelve', async () => {
    // El servidor todavía lo tiene; este aparato lo deshizo y su estado ya no.
    const local = EN_PAUSA;
    precarga.precargarPartido.mockResolvedValue({});
    precarga.leerInstantanea.mockResolvedValue({
      paquete: { ...PAQUETE, eventos: [GOL] },
      descargadoEn: 5,
      estado: local,
    });
    sync.pendientesDelPartido.mockResolvedValue({ altas: new Set(), bajas: new Set(['gol-1']) });

    const { estado } = await cargarDirecto('par-1');

    expect(estado.eventos).toEqual([]);
    expect(estado.fase).toBe('pausado');
  });

  it('lo apuntado aquí que el paquete no trae se queda si sigue en la cola, y si no, se quita', async () => {
    const [evento] = desdePaquete({ ...PAQUETE, eventos: [GOL] }).eventos;
    const local: EstadoDirecto = {
      ...desdePaquete(PAQUETE),
      eventos: [
        { ...evento, clientEventId: 'sin-enviar', propio: true },
        { ...evento, clientEventId: 'borrado-fuera', propio: true },
      ],
    };
    precarga.precargarPartido.mockResolvedValue({});
    precarga.leerInstantanea.mockResolvedValue({
      paquete: PAQUETE,
      descargadoEn: 5,
      estado: local,
    });
    sync.pendientesDelPartido.mockResolvedValue({
      altas: new Set(['sin-enviar']),
      bajas: new Set(),
    });

    const { estado } = await cargarDirecto('par-1');

    expect(estado.eventos.map((e) => e.clientEventId)).toEqual(['sin-enviar']);
  });

  it('mira la cola desde que se pidió el paquete que acaba de descargar', async () => {
    precarga.precargarPartido.mockResolvedValue({});
    precarga.leerInstantanea.mockResolvedValue({
      paquete: PAQUETE,
      descargadoEn: 90,
      pedidoEn: 70,
    });

    await cargarDirecto('par-1');

    expect(sync.pendientesDelPartido).toHaveBeenCalledWith('par-1', 70);
  });

  it('con una precarga de antes de la T-209b, desde que se descargó', async () => {
    precarga.precargarPartido.mockRejectedValue(new TypeError('Failed to fetch'));
    precarga.leerInstantanea.mockResolvedValue({ paquete: PAQUETE, descargadoEn: 90 });

    await cargarDirecto('par-1');

    expect(sync.pendientesDelPartido).toHaveBeenCalledWith('par-1', 90);
  });

  it('sin cobertura no quita nada de lo del aparato, aunque ya no esté en la cola', async () => {
    // El paquete es el de la última vez: lo enviado desde entonces no está en
    // él, y la cola puede haberlo purgado. Nadie ha dicho que se borrara.
    const [evento] = desdePaquete({ ...PAQUETE, eventos: [GOL] }).eventos;
    const local: EstadoDirecto = {
      ...desdePaquete(PAQUETE),
      eventos: [{ ...evento, clientEventId: 'enviado-hace-dias', propio: true }],
    };
    precarga.precargarPartido.mockRejectedValue(new TypeError('Failed to fetch'));
    precarga.leerInstantanea.mockResolvedValue({
      paquete: PAQUETE,
      descargadoEn: 5,
      estado: local,
    });

    const { estado } = await cargarDirecto('par-1');

    expect(estado.eventos.map((e) => e.clientEventId)).toEqual(['enviado-hace-dias']);
  });

  it('sin cobertura, lo deshecho aquí tampoco vuelve del paquete guardado', async () => {
    const local = EN_PAUSA;
    precarga.precargarPartido.mockRejectedValue(new TypeError('Failed to fetch'));
    precarga.leerInstantanea.mockResolvedValue({
      paquete: { ...PAQUETE, eventos: [GOL] },
      descargadoEn: 5,
      estado: local,
    });
    sync.pendientesDelPartido.mockResolvedValue({ altas: new Set(), bajas: new Set(['gol-1']) });

    expect((await cargarDirecto('par-1')).estado.eventos).toEqual([]);
  });
});

// T-209c: las partes se concilian con las del servidor al abrir (D06-39).
describe('cargarDirecto con las partes de otro aparato', () => {
  const [gol] = desdePaquete({
    ...PAQUETE,
    eventos: [
      {
        client_event_id: 'sin-enviar',
        event_type: 'goal',
        period: 1,
        seconds: 5,
        is_opponent: true,
        player_id: null,
        status: 'pending',
      },
    ],
  }).eventos;
  const local: EstadoDirecto = {
    ...desdePaquete(PAQUETE),
    fase: 'en_juego',
    partes: [PARTE_LOCAL],
    eventos: [{ ...gol, propio: true }],
  };
  const PARTE_A = {
    id: 'parte-A',
    periodNumber: 1,
    plannedSeconds: 2_400,
    actualSeconds: null,
    startedAt: '2026-10-04T11:00:00Z',
    endedAt: null,
  };

  beforeEach(() => {
    precarga.precargarPartido.mockResolvedValue({});
    sync.pendientesDelPartido.mockResolvedValue({
      altas: new Set(['sin-enviar']),
      bajas: new Set(),
    });
  });

  it('con un evento sin enviar y el servidor más avanzado, lo conserva', async () => {
    precarga.leerInstantanea.mockResolvedValue({
      paquete: {
        ...PAQUETE,
        partido: { ...PAQUETE.partido, status: 'live' },
        partes: [
          { ...PARTE_A, actualSeconds: 2_430, endedAt: '2026-10-04T11:40:30Z' },
          { ...PARTE_A, id: 'parte-A2', periodNumber: 2, startedAt: '2026-10-04T11:55:00Z' },
        ],
      },
      descargadoEn: 5,
      estado: local,
    });

    const { estado } = await cargarDirecto('par-1');

    expect(estado.eventos.map((e) => e.clientEventId)).toEqual(['sin-enviar']);
    expect(estado.fase).toBe('en_juego');
    expect(estado.partes.map((parte) => parte.id)).toEqual(['parte-A', 'parte-A2']);
    expect(estado.partes[0]?.segundosReales).toBe(2_430);
  });

  it('si otro aparato abrió antes la misma parte, adopta su `id` y su arranque', async () => {
    precarga.leerInstantanea.mockResolvedValue({
      paquete: {
        ...PAQUETE,
        partido: { ...PAQUETE.partido, status: 'live' },
        partes: [PARTE_A],
      },
      descargadoEn: 5,
      estado: local,
    });

    const { estado } = await cargarDirecto('par-1');

    expect(estado.partes).toEqual([{ ...PARTE_LOCAL, id: 'parte-A', inicio: ARRANQUE }]);
    expect(estado.eventos.map((e) => e.clientEventId)).toEqual(['sin-enviar']);
  });
});

describe('refrescarDirecto', () => {
  it('descarga el paquete, lo guarda y devuelve el estado del servidor y desde cuándo mirar la cola', async () => {
    const horas = [1_000, 1_250];
    vi.spyOn(Date, 'now').mockImplementation(() => horas.shift() ?? 9_999);
    precarga.descargarPaquete.mockResolvedValue(PAQUETE);

    const refresco = await refrescarDirecto('par-1');

    expect(precarga.descargarPaquete).toHaveBeenCalledWith('par-1');
    // Se guarda con la hora de la descarga y con la de la petición.
    expect(precarga.guardarPaquete).toHaveBeenCalledWith(PAQUETE, 1_250, 1_000);
    expect(refresco).toEqual({ paquete: PAQUETE, servidor: desdePaquete(PAQUETE), desde: 1_000 });
  });

  it('si la descarga falla no guarda nada y lanza: quien llama lo calla', async () => {
    precarga.descargarPaquete.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(refrescarDirecto('par-1')).rejects.toThrow('Failed to fetch');
    expect(precarga.guardarPaquete).not.toHaveBeenCalled();
  });
});

describe('aplicarTransicion', () => {
  const estado: EstadoDirecto = { ...desdePaquete(PAQUETE), fase: 'pausado' };

  beforeEach(() => {
    almacen.guardada = {
      matchId: 'par-1',
      updatedAt: 5,
      datos: { paquete: PAQUETE, descargadoEn: 5 } satisfies Instantanea,
    };
  });

  it('sin trabajos, solo guarda el estado en la instantánea', async () => {
    await aplicarTransicion(estado, []);

    expect(sync.encolarJunto).not.toHaveBeenCalled();
    expect(almacen.puestas).toEqual([
      { matchId: 'par-1', updatedAt: 5, datos: { paquete: PAQUETE, descargadoEn: 5, estado } },
    ]);
  });

  it('con trabajos, los encola junto con el estado', async () => {
    sync.encolarJunto.mockImplementation(
      async (_trabajos: unknown, tambien: () => Promise<void>) => {
        await tambien();
      },
    );
    const trabajos = [
      {
        entity: 'match' as const,
        op: 'update' as const,
        matchId: 'par-1',
        payload: { valores: { status: 'live' }, clave: { id: 'par-1' } },
      },
    ];

    await aplicarTransicion(estado, trabajos);

    // La transacción se abre solo sobre la cola y la instantánea (T-216).
    expect(sync.encolarJunto).toHaveBeenCalledWith(trabajos, expect.any(Function), [
      db.matchSnapshots,
    ]);
    expect(almacen.puestas).toHaveLength(1);
  });

  it('sin instantánea no guarda nada', async () => {
    almacen.guardada = undefined;

    await expect(aplicarTransicion(estado, [])).rejects.toThrow(SIN_PRECARGA);
  });
});
