// C02, registro de errores (T-303). La red se sustituye en la frontera de `api/`.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RegistroDeErroresPage } from './RegistroDeErroresPage';

import type { ErrorRegistrado, FiltrosDeErrores, PaginaDeErrores } from '../api/errorLogs';

const api = vi.hoisted(() => ({
  fetchEsAdministrador: vi.fn<() => Promise<boolean>>(),
  fetchErrores: vi.fn<(filtros: FiltrosDeErrores, desde: number) => Promise<PaginaDeErrores>>(),
  contarErroresDesde: vi.fn<(desde: Date) => Promise<number>>(),
}));

vi.mock('../api/errorLogs', () => api);

function error(n: number, cambios: Partial<ErrorRegistrado> = {}): ErrorRegistrado {
  return {
    id: `e${n}`,
    createdAt: '2026-10-03T10:30:00Z',
    mensaje: `[ruta] Fallo número ${n}`,
    ruta: `/partidos/${n}/directo`,
    traza: `Error: Fallo ${n}\n    en algo`,
    dispositivo: { plataforma: 'Android' },
    appVersion: '0.1.0',
    nombre: 'Isaac',
    ...cambios,
  };
}

function montar() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RegistroDeErroresPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchEsAdministrador.mockResolvedValue(true);
  api.contarErroresDesde.mockResolvedValue(0);
  api.fetchErrores.mockResolvedValue({ filas: [], hayMas: false });
});

describe('RegistroDeErroresPage', () => {
  it('siendo administrador, lista los errores con fecha, origen, ruta y nombre', async () => {
    api.fetchErrores.mockResolvedValue({
      filas: [error(1), error(2, { mensaje: '[sync] Sin red', nombre: null })],
      hayMas: false,
    });
    montar();

    const tabla = await screen.findByRole('table', { name: /errores/i });
    const filas = within(tabla).getAllByRole('row');
    const textoDeFilas = filas.map((fila) => fila.textContent ?? '').join('|');

    expect(textoDeFilas).toContain('Fallo número 1');
    expect(textoDeFilas).toContain('/partidos/1/directo');
    expect(textoDeFilas).toContain('Isaac');
    expect(textoDeFilas).toContain('Sincronización');
    expect(textoDeFilas).toContain('Otra persona');
    expect(textoDeFilas).toContain('0.1.0');
  });

  it('elegir el origen «Sincronización» vuelve a pedir con ese filtro', async () => {
    api.fetchErrores.mockResolvedValue({ filas: [error(1)], hayMas: false });
    montar();
    await screen.findByRole('table');

    await userEvent.selectOptions(screen.getByLabelText('Origen'), 'Sincronización');

    await vi.waitFor(() => {
      expect(api.fetchErrores).toHaveBeenLastCalledWith(
        expect.objectContaining({ origen: 'sync' }),
        0,
      );
    });
  });

  it('«Cargar 50 más» pide la página siguiente y la añade', async () => {
    api.fetchErrores
      .mockResolvedValueOnce({ filas: [error(1)], hayMas: true })
      .mockResolvedValueOnce({ filas: [error(2)], hayMas: false });
    montar();
    await screen.findByText('Fallo número 1');

    await userEvent.click(screen.getByRole('button', { name: 'Cargar 50 más' }));

    expect(await screen.findByText('Fallo número 2')).toBeInTheDocument();
    expect(screen.getByText('Fallo número 1')).toBeInTheDocument();
    expect(api.fetchErrores).toHaveBeenLastCalledWith(expect.anything(), 50);
    expect(screen.queryByRole('button', { name: 'Cargar 50 más' })).not.toBeInTheDocument();
  });

  it('sin ser administrador, dice la frase de la cuenta y no consulta nada', async () => {
    api.fetchEsAdministrador.mockResolvedValue(false);
    montar();

    expect(
      await screen.findByText('Tu cuenta no puede ver el registro de errores.'),
    ).toBeInTheDocument();
    expect(api.fetchErrores).not.toHaveBeenCalled();
    expect(api.contarErroresDesde).not.toHaveBeenCalled();
  });

  it('siendo administrador y sin errores, lo dice', async () => {
    montar();

    expect(await screen.findByText('No hay ningún error registrado.')).toBeInTheDocument();
  });

  it('enseña el resumen de las últimas 24 horas y los últimos 7 días', async () => {
    api.contarErroresDesde.mockResolvedValueOnce(3).mockResolvedValueOnce(12);
    montar();

    expect(await screen.findByText(/3 errores en las últimas 24 horas/)).toBeInTheDocument();
    expect(screen.getByText(/12 errores en los últimos 7 días/)).toBeInTheDocument();
  });
});
