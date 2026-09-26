// Carga y guardado del directo (T-207). Lo que se vigila: sin cobertura se
// usa lo precargado, sin precarga no se abre, el estado guardado en el
// aparato se tiene en cuenta, y guardar con trabajos va por `encolarJunto`.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { desdePaquete } from '../model/directo';
import { aplicarTransicion, cargarDirecto, SIN_PRECARGA } from './directo';

import type { EstadoDirecto } from '../model/directo';
import type { Instantanea, PaqueteDePartido } from '../model/paquete';

const precarga = vi.hoisted(() => ({ precargarPartido: vi.fn(), leerInstantanea: vi.fn() }));
const sync = vi.hoisted(() => ({ encolarJunto: vi.fn() }));
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

beforeEach(() => {
  precarga.precargarPartido.mockReset();
  precarga.leerInstantanea.mockReset();
  sync.encolarJunto.mockReset();
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
    const local: EstadoDirecto = { ...desdePaquete(PAQUETE), fase: 'pausado' };
    precarga.precargarPartido.mockResolvedValue({});
    precarga.leerInstantanea.mockResolvedValue({
      paquete: PAQUETE,
      descargadoEn: 5,
      estado: local,
    });

    expect((await cargarDirecto('par-1')).estado).toBe(local);
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

    expect(sync.encolarJunto).toHaveBeenCalledWith(trabajos, expect.any(Function));
    expect(almacen.puestas).toHaveLength(1);
  });

  it('sin instantánea no guarda nada', async () => {
    almacen.guardada = undefined;

    await expect(aplicarTransicion(estado, [])).rejects.toThrow(SIN_PRECARGA);
  });
});
