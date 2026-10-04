// `encolarJunto` (T-216): pasa las tablas de la transacción al almacén y deja
// constancia cuando guardar en local tarda más de la cuenta.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { encolarJunto } from './encolar';

const dobles = vi.hoisted(() => ({
  encolarTrabajosJunto: vi.fn(),
  sincronizarAhora: vi.fn(),
  registrarError: vi.fn(),
}));

vi.mock('./almacen', () => ({
  encolarTrabajo: vi.fn(),
  encolarTrabajosJunto: dobles.encolarTrabajosJunto,
}));
vi.mock('./arranque', () => ({ sincronizarAhora: dobles.sincronizarAhora }));
vi.mock('@modules/logging', () => ({ registrarError: dobles.registrarError }));

const ENTRADAS = [
  {
    entity: 'match_event' as const,
    op: 'insert' as const,
    matchId: 'm1',
    payload: { valores: { id: 'e1' } },
  },
];

const nada = () => Promise.resolve();

beforeEach(() => {
  dobles.encolarTrabajosJunto.mockReset();
  dobles.encolarTrabajosJunto.mockResolvedValue([]);
  dobles.sincronizarAhora.mockReset();
  dobles.sincronizarAhora.mockResolvedValue(undefined);
  dobles.registrarError.mockReset();
  dobles.registrarError.mockResolvedValue(undefined);
});

describe('encolarJunto', () => {
  it('si encolar tarda más de tres segundos, registra «Encolado lento» una vez', async () => {
    vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(3_500);

    await encolarJunto(ENTRADAS, nada);

    expect(dobles.registrarError).toHaveBeenCalledTimes(1);
    const [error, origen, detalle] = dobles.registrarError.mock.calls[0] as [Error, string, string];
    expect(error.message).toBe('Encolado lento');
    expect(origen).toBe('sync');
    expect(detalle).toBe('3500 ms');
  });

  it('si encolar va a su ritmo, no registra nada', async () => {
    vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(3_000);

    await encolarJunto(ENTRADAS, nada);

    expect(dobles.registrarError).not.toHaveBeenCalled();
  });

  it('pasa las tablas al almacén y pide un vaciado', async () => {
    const tablas = [{ name: 'matchSnapshots' }] as never;

    await encolarJunto(ENTRADAS, nada, tablas);

    expect(dobles.encolarTrabajosJunto).toHaveBeenCalledWith(ENTRADAS, nada, tablas);
    expect(dobles.sincronizarAhora).toHaveBeenCalledTimes(1);
  });
});
