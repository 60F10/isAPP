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
  cola: { pendientes: 0, fallidos: 0, ultimoError: null, rechazados: [] } as EstadoDeCola,
}));
const sincronizarAhora = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const descartarRechazado = vi.hoisted(() => vi.fn(() => Promise.resolve(true)));

vi.mock('../hooks/useEstadoDeSync', () => ({
  useEnLinea: () => estado.enLinea,
  useEstadoDeCola: () => estado.cola,
}));
vi.mock('../api/arranque', () => ({ sincronizarAhora }));
vi.mock('../api/almacen', () => ({ descartarRechazado }));

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
  estado.cola = { pendientes: 0, fallidos: 0, ultimoError: null, rechazados: [] };
  sincronizarAhora.mockClear();
  descartarRechazado.mockClear();
});

function cola2(): EstadoDeCola {
  return {
    pendientes: 0,
    fallidos: 2,
    ultimoError: '42501 · rls',
    rechazados: [
      { id: 'r1', entity: 'match_event', op: 'insert', createdAt: 2, lastError: '42501 · rls' },
      { id: 'r2', entity: 'match', op: 'update', createdAt: 1, lastError: null },
    ],
  };
}

describe('C04 · Banda de sincronización', () => {
  it('con red y la cola vacía no enseña nada', () => {
    const { container } = montar();

    expect(container).toBeEmptyDOMElement();
  });

  it('sin red lo dice, y cuánto hay guardado esperando', () => {
    estado.enLinea = false;
    estado.cola = { pendientes: 3, fallidos: 0, ultimoError: null, rechazados: [] };
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
    estado.cola = { pendientes: 1, fallidos: 0, ultimoError: null, rechazados: [] };
    montar();

    expect(screen.getByText('1 anotación por enviar')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sincronizar ahora' }));

    expect(sincronizarAhora).toHaveBeenCalledTimes(1);
  });

  it('cuenta los rechazados y guarda plegado lo que dijo el servidor', () => {
    estado.cola = cola2();
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

  it('lista cada rechazado con su nombre y lo que dijo el servidor', async () => {
    estado.cola = cola2();
    montar();

    await userEvent.click(screen.getByText('Qué dijo el servidor'));

    const elementos = screen.getAllByRole('listitem');
    expect(elementos).toHaveLength(2);
    expect(elementos[0]).toHaveTextContent('Anotación');
    expect(elementos[0]).toHaveTextContent('42501 · rls');
    expect(elementos[1]).toHaveTextContent('Estado del partido');
    expect(elementos[1]).toHaveTextContent('El servidor no dijo por qué.');
  });

  it('descartar pide confirmación y «No» no borra', async () => {
    estado.cola = cola2();
    montar();

    await userEvent.click(screen.getByText('Qué dijo el servidor'));
    await userEvent.click(screen.getAllByRole('button', { name: 'Descartar' })[0]);

    expect(screen.getByText('¿Descartar? No se puede recuperar.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'No' }));

    expect(descartarRechazado).not.toHaveBeenCalled();
    expect(screen.queryByText('¿Descartar? No se puede recuperar.')).toBeNull();
  });

  it('«Sí, descartar» borra ese trabajo y lo anuncia', async () => {
    estado.cola = cola2();
    const { anunciar } = montar();

    await userEvent.click(screen.getByText('Qué dijo el servidor'));
    await userEvent.click(screen.getAllByRole('button', { name: 'Descartar' })[1]);
    await userEvent.click(screen.getByRole('button', { name: 'Sí, descartar' }));

    expect(descartarRechazado).toHaveBeenCalledWith('r2', 'u1');
    expect(anunciar).toHaveBeenCalledWith('Anotación descartada');
  });
});
