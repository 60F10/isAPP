// Hooks de la C02 (T-224): ninguna página de errores se vuelve a pedir sola.

import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SIN_FILTROS } from '../model/consulta';

import { useErrores } from './useErrores';

import type { ReactNode } from 'react';

import type { CursorDeErrores, FiltrosDeErrores, PaginaDeErrores } from '../api/errorLogs';

const api = vi.hoisted(() => ({
  fetchErrores:
    vi.fn<(filtros: FiltrosDeErrores, desde: CursorDeErrores | null) => Promise<PaginaDeErrores>>(),
  fetchEsAdministrador: vi.fn(),
  contarErroresDesde: vi.fn(),
}));

vi.mock('../api/errorLogs', () => api);

function montar(cursor: CursorDeErrores | null) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const envoltorio = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );

  return renderHook(() => useErrores(SIN_FILTROS, cursor), { wrapper: envoltorio });
}

/** Lo que hace el navegador al volver a la ventana. */
function volverALaVentana() {
  focusManager.setFocused(false);
  focusManager.setFocused(true);
}

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchErrores.mockResolvedValue({ filas: [], hayMas: false });
  // Solo la fecha: pasado el `staleTime`, una consulta con `refetchOnWindowFocus` se pediría de nuevo.
  vi.useFakeTimers({ toFake: ['Date'] });
});

afterEach(() => {
  vi.useRealTimers();
  focusManager.setFocused(undefined);
});

describe('useErrores', () => {
  it('con la primera página cargada, volver a la ventana no la vuelve a pedir', async () => {
    const { result } = montar(null);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(api.fetchErrores).toHaveBeenCalledTimes(1);

    vi.setSystemTime(Date.now() + 10 * 60_000);
    volverALaVentana();
    await Promise.resolve();

    expect(api.fetchErrores).toHaveBeenCalledTimes(1);
  });

  it('una página con cursor tampoco se vuelve a pedir', async () => {
    const { result } = montar({ createdAt: '2026-10-03T10:00:00Z', id: 'e1' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    vi.setSystemTime(Date.now() + 10 * 60_000);
    volverALaVentana();
    await Promise.resolve();

    expect(api.fetchErrores).toHaveBeenCalledTimes(1);
  });
});
