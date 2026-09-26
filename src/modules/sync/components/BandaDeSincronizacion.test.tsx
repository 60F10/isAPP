// C04 (T-206): la banda sale sin red, con trabajos por enviar o con trabajos
// rechazados, y se calla en el resto. IndexedDB y la red se sustituyen en la
// frontera de los hooks y de `api/`.

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnnounceContext } from '@shared/hooks/announceContext';

import { BandaDeSincronizacion } from './BandaDeSincronizacion';

import type { EstadoDeCola } from '../model/cola';

const estado = vi.hoisted(() => ({
  enLinea: true,
  cola: { pendientes: 0, fallidos: 0, ultimoError: null } as EstadoDeCola,
}));
const sincronizarAhora = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('../hooks/useEstadoDeSync', () => ({
  useEnLinea: () => estado.enLinea,
  useEstadoDeCola: () => estado.cola,
}));
vi.mock('../api/arranque', () => ({ sincronizarAhora }));

function montar() {
  const anunciar = vi.fn();
  const resultado = render(
    <AnnounceContext value={{ anunciar }}>
      <BandaDeSincronizacion userId="u1" />
    </AnnounceContext>,
  );

  return { anunciar, ...resultado };
}

beforeEach(() => {
  estado.enLinea = true;
  estado.cola = { pendientes: 0, fallidos: 0, ultimoError: null };
  sincronizarAhora.mockClear();
});

describe('C04 · Banda de sincronización', () => {
  it('con red y la cola vacía no enseña nada', () => {
    const { container } = montar();

    expect(container).toBeEmptyDOMElement();
  });

  it('sin red lo dice, y cuánto hay guardado esperando', () => {
    estado.enLinea = false;
    estado.cola = { pendientes: 3, fallidos: 0, ultimoError: null };
    montar();

    expect(screen.getByText('Sin conexión')).toBeInTheDocument();
    expect(
      screen.getByText(
        '3 anotaciones guardadas en este dispositivo. Se envían solas al volver la cobertura.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('con red y trabajos por enviar, ofrece sincronizar ahora', async () => {
    estado.cola = { pendientes: 1, fallidos: 0, ultimoError: null };
    montar();

    expect(screen.getByText('1 anotación por enviar')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sincronizar ahora' }));

    expect(sincronizarAhora).toHaveBeenCalledTimes(1);
  });

  it('cuenta los rechazados y guarda plegado lo que dijo el servidor', () => {
    estado.cola = { pendientes: 0, fallidos: 2, ultimoError: '42501 · rls' };
    montar();

    expect(screen.getByText('2 anotaciones sin guardar')).toBeInTheDocument();
    expect(
      screen.getByText('El servidor ha rechazado 2 anotaciones y no se van a reintentar.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Qué dijo el servidor')).toBeInTheDocument();
    expect(screen.getByText('42501 · rls')).not.toBeVisible();
  });

  it('anuncia el cambio de conexión, no la cuenta', () => {
    const { anunciar, rerender } = montar();

    estado.enLinea = false;
    rerender(
      <AnnounceContext value={{ anunciar }}>
        <BandaDeSincronizacion userId="u1" />
      </AnnounceContext>,
    );

    expect(anunciar).toHaveBeenCalledWith('Sin conexión');
    expect(anunciar).toHaveBeenCalledTimes(1);
  });
});
