// C01, Ajustes (T-107): los interruptores cambian `<html>` y se guardan, y
// «Cerrar sesión» sale o avisa si no puede. Desde la T-206, antes de salir
// avisa de las anotaciones sin enviar de la cola. Desde la T-301c, una línea por
// equipo seguido con «Dejar de seguir».
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
import type { Session } from '@supabase/supabase-js';

const cerrarSesion = vi.hoisted(() => vi.fn<() => Promise<void>>());

const contarPendientes = vi.hoisted(() => vi.fn<(userId: string) => Promise<number>>());

const dejarDeSeguir = vi.hoisted(() => vi.fn<(teamId: string) => Promise<void>>());

vi.mock('@modules/auth/api/session', () => ({ cerrarSesion }));
vi.mock('@modules/auth/api/solicitudes', () => ({ dejarDeSeguir }));
vi.mock('@modules/sync', () => ({ contarPendientes }));

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

function montar(conSesion = false, esAdministrador = false, estado: Partial<AuthState> = {}) {
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
      <AuthContext
        value={{
          ...AUTH,
          profile: perfil('Isaac', esAdministrador),
          session: conSesion ? ({ user: { id: 'usuario-1' } } as Session) : null,
          ...estado,
        }}
      >
        <AnnounceContext value={{ anunciar }}>
          <RouterProvider router={router} />
        </AnnounceContext>
      </AuthContext>
    </QueryClientProvider>,
  );

  return { anunciar };
}

function perfil(nombre: string, esAdministrador = false): AuthState['profile'] {
  return {
    id: 'usuario-1',
    display_name: nombre,
    avatar_url: null,
    is_platform_admin: esAdministrador,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  };
}

describe('AjustesPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    cerrarSesion.mockReset();
    contarPendientes.mockReset();
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

  it('el enlace al registro de errores sale solo para el administrador de plataforma', () => {
    montar(false, true);

    expect(screen.getByRole('link', { name: 'Registro de errores' })).toHaveAttribute(
      'href',
      '/admin/logs',
    );
  });

  it('sin ser administrador no sale el enlace al registro de errores', () => {
    montar();

    expect(screen.queryByRole('link', { name: 'Registro de errores' })).not.toBeInTheDocument();
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

  it('con anotaciones sin enviar, avisa antes de salir y deja quedarse', async () => {
    contarPendientes.mockResolvedValue(3);
    const { anunciar } = montar(true);

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(contarPendientes).toHaveBeenCalledWith('usuario-1');
    expect(await screen.findByText(/Hay 3 anotaciones sin enviar/)).toHaveFocus();
    expect(anunciar).toHaveBeenCalledWith('Hay 3 anotaciones sin enviar en este dispositivo');
    expect(cerrarSesion).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Seguir dentro' }));

    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toHaveFocus();
    expect(cerrarSesion).not.toHaveBeenCalled();
  });

  it('con anotaciones sin enviar, sale si se confirma', async () => {
    contarPendientes.mockResolvedValue(1);
    cerrarSesion.mockResolvedValue(undefined);
    montar(true);

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión igualmente' }));

    expect(cerrarSesion).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Pantalla de acceso')).toBeInTheDocument();
  });

  it('con la cola vacía, sale sin preguntar', async () => {
    contarPendientes.mockResolvedValue(0);
    cerrarSesion.mockResolvedValue(undefined);
    montar(true);

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByText('Pantalla de acceso')).toBeInTheDocument();
  });

  it('sin equipos seguidos, lo dice y enlaza a «Unirse a un equipo»', () => {
    montar();

    expect(screen.queryByRole('button', { name: /Dejar de seguir/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Seguir a otro equipo' })).toHaveAttribute(
      'href',
      '/unirse',
    );
  });

  it('«Dejar de seguir» llama a la API con el equipo y recarga el contexto', async () => {
    dejarDeSeguir.mockResolvedValue(undefined);
    const reintentarContexto = vi.fn();
    const usuario = userEvent.setup();
    const { anunciar } = montar(true, false, {
      reintentarContexto,
      activeTeamId: 'eq-1',
      teams: [
        {
          teamMemberId: null,
          role: null,
          team: {
            id: 'eq-1',
            clubId: 'club-1',
            name: 'Cadete A',
            category: 'Cadete',
            crestUrl: null,
            primaryColor: null,
          },
          permissions: new Set(),
          seguidor: true,
        },
      ],
    });

    await usuario.click(screen.getByRole('button', { name: 'Dejar de seguir a Cadete A' }));

    await vi.waitFor(() => {
      expect(dejarDeSeguir).toHaveBeenCalledWith('eq-1');
    });
    await vi.waitFor(() => {
      expect(reintentarContexto).toHaveBeenCalledTimes(1);
    });
    expect(anunciar).toHaveBeenCalledWith('Has dejado de seguir a Cadete A');
  });
});
