// C01, Ajustes (T-107): los interruptores cambian `<html>` y se guardan, y
// «Cerrar sesión» sale o avisa si no puede.
//
// La red se sustituye en la frontera de `api/` (DOC 06 §11).

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@modules/auth/hooks/authContext';
import { AnnounceContext } from '@shared/hooks/announceContext';
import { CLAVE_PREFERENCIAS } from '@shared/lib/preferencias';

import { AjustesPage } from './AjustesPage';

import type { AuthState } from '@modules/auth/hooks/authContext';

const cerrarSesion = vi.hoisted(() => vi.fn<() => Promise<void>>());

vi.mock('@modules/auth/api/session', () => ({ cerrarSesion }));

const AUTH: AuthState = {
  session: null,
  cargando: false,
  permisos: new Set(),
  profile: null,
  teams: [],
  activeTeamId: null,
  activeSeasonId: null,
  setActiveTeam: () => undefined,
  errorContexto: null,
  reintentarContexto: () => undefined,
};

function montar() {
  const anunciar = vi.fn();
  const router = createMemoryRouter(
    [
      { path: '/ajustes', element: <AjustesPage /> },
      { path: '/login', element: <p>Pantalla de acceso</p> },
    ],
    { initialEntries: ['/ajustes'] },
  );

  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthContext value={{ ...AUTH, profile: perfil('Isaac') }}>
        <AnnounceContext value={{ anunciar }}>
          <RouterProvider router={router} />
        </AnnounceContext>
      </AuthContext>
    </QueryClientProvider>,
  );

  return { anunciar };
}

function perfil(nombre: string): AuthState['profile'] {
  return {
    id: 'usuario-1',
    display_name: nombre,
    avatar_url: null,
    is_platform_admin: false,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  };
}

describe('AjustesPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    cerrarSesion.mockReset();
  });

  afterEach(() => {
    delete document.documentElement.dataset.contrast;
    delete document.documentElement.dataset.motion;
  });

  it('el alto contraste se aplica a <html> y queda guardado', async () => {
    montar();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Alto contraste' }));

    expect(document.documentElement.dataset.contrast).toBe('high');
    expect(window.localStorage.getItem(CLAVE_PREFERENCIAS)).toContain('"altoContraste":true');

    await userEvent.click(screen.getByRole('checkbox', { name: 'Alto contraste' }));

    expect(document.documentElement.hasAttribute('data-contrast')).toBe(false);
  });

  it('el movimiento reducido se aplica a <html>', async () => {
    montar();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Reducir el movimiento' }));

    expect(document.documentElement.dataset.motion).toBe('reduced');
  });

  it('dice con qué cuenta se ha entrado', () => {
    montar();

    expect(screen.getByText('Isaac')).toBeInTheDocument();
  });

  it('cerrar sesión lleva a la pantalla de acceso', async () => {
    cerrarSesion.mockResolvedValue(undefined);
    const { anunciar } = montar();

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(cerrarSesion).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Pantalla de acceso')).toBeInTheDocument();
    expect(anunciar).toHaveBeenCalledWith('Sesión cerrada');
  });

  it('si no se puede cerrar la sesión, lo dice y se queda', async () => {
    cerrarSesion.mockRejectedValue(new Error('fallo'));
    const { anunciar } = montar();

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(
      await screen.findByText('No se pudo cerrar la sesión. Vuelve a intentarlo.'),
    ).toBeInTheDocument();
    expect(anunciar).toHaveBeenCalledWith('No se pudo cerrar la sesión');
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeEnabled();
  });
});
