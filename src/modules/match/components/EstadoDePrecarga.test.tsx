// Estado de la precarga (T-206): lista, preparando o fallida con reintento, y
// el aviso de almacén no persistente. La precarga se sustituye en `api/`.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnnounceContext } from '@shared/hooks/announceContext';

import { EstadoDePrecarga } from './EstadoDePrecarga';

const api = vi.hoisted(() => ({ precargarPartido: vi.fn() }));

vi.mock('../api/precarga', () => api);

function montar() {
  const anunciar = vi.fn();

  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })}
    >
      <AnnounceContext value={{ anunciar }}>
        <EstadoDePrecarga partidoId="par-1" />
      </AnnounceContext>
    </QueryClientProvider>,
  );

  return { anunciar };
}

beforeEach(() => {
  api.precargarPartido.mockReset();
});

describe('Estado de la precarga', () => {
  it('avisa mientras prepara y confirma cuando el partido está listo', async () => {
    api.precargarPartido.mockResolvedValue({ descargadoEn: 1, convocados: 18, persistente: true });
    montar();

    expect(screen.getByText('Preparando el partido para usarlo sin conexión…')).toBeInTheDocument();
    expect(await screen.findByText('Partido listo para usar sin conexión')).toBeInTheDocument();
    expect(api.precargarPartido).toHaveBeenCalledWith('par-1');
    expect(screen.queryByText(/puede borrar lo guardado/)).toBeNull();
  });

  it('si el navegador no promete guardar, lo dice', async () => {
    api.precargarPartido.mockResolvedValue({ descargadoEn: 1, convocados: 18, persistente: false });
    montar();

    expect(await screen.findByText(/puede borrar lo guardado/)).toBeInTheDocument();
  });

  it('si falla lo dice antes de ir al campo, lo anuncia y deja reintentar', async () => {
    api.precargarPartido.mockRejectedValue(new TypeError('Failed to fetch'));
    const { anunciar } = montar();

    expect(await screen.findByText(/No se ha podido preparar el partido/)).toBeInTheDocument();
    expect(anunciar).toHaveBeenCalledWith(
      'No se ha podido preparar el partido para usarlo sin conexión',
    );

    api.precargarPartido.mockResolvedValue({ descargadoEn: 2, convocados: 18, persistente: true });
    await userEvent.click(screen.getByRole('button', { name: 'Volver a intentarlo' }));

    expect(await screen.findByText('Partido listo para usar sin conexión')).toBeInTheDocument();
  });
});
