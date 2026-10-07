// «Más» (T-304): un índice con tres enlaces y cada uno, con su condición.

import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { AuthContext } from '@modules/auth/hooks/authContext';

import { MasPage } from './MasPage';

import type { AuthState } from '@modules/auth/hooks/authContext';

function autenticacion(permisos: string[] | null, esAdministrador: boolean): AuthState {
  return {
    session: null,
    cargando: false,
    permisos: permisos === null ? null : new Set(permisos),
    profile: {
      id: 'usuario-1',
      display_name: 'Isaac',
      avatar_url: null,
      is_platform_admin: esAdministrador,
    } as AuthState['profile'],
    teams: [],
    activeTeamId: null,
    activeSeasonId: null,
    setActiveTeam: () => undefined,
    errorContexto: null,
    reintentarContexto: () => undefined,
  };
}

function montar(permisos: string[] | null, esAdministrador = false) {
  const router = createMemoryRouter([{ path: '/mas', element: <MasPage /> }], {
    initialEntries: ['/mas'],
  });

  render(
    <AuthContext value={autenticacion(permisos, esAdministrador)}>
      <RouterProvider router={router} />
    </AuthContext>,
  );
}

describe('MasPage', () => {
  it('«Ajustes» sale siempre', () => {
    montar([]);

    expect(screen.getByRole('heading', { level: 1, name: 'Más' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ajustes' })).toHaveAttribute('href', '/ajustes');
  });

  it('«Mis aportaciones» sale solo con match.live.write', () => {
    montar([]);

    expect(screen.queryByRole('link', { name: 'Mis aportaciones' })).not.toBeInTheDocument();
  });

  it('con match.live.write, «Mis aportaciones» lleva a /mis-aportaciones', () => {
    montar(['match.live.write']);

    expect(screen.getByRole('link', { name: 'Mis aportaciones' })).toHaveAttribute(
      'href',
      '/mis-aportaciones',
    );
  });

  it('mientras los permisos no se saben, «Mis aportaciones» no sale', () => {
    montar(null);

    expect(screen.queryByRole('link', { name: 'Mis aportaciones' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ajustes' })).toBeInTheDocument();
  });

  it('«Registro de errores» sale solo siendo administrador', () => {
    montar(['match.live.write']);

    expect(screen.queryByRole('link', { name: 'Registro de errores' })).not.toBeInTheDocument();
  });

  it('siendo administrador, «Registro de errores» lleva a /admin/logs', () => {
    montar([], true);

    expect(screen.getByRole('link', { name: 'Registro de errores' })).toHaveAttribute(
      'href',
      '/admin/logs',
    );
  });
});
