// Tarjeta «Invitaciones» de Inicio (T-301b).
//
// La red se sustituye en la frontera de `api/` (DOC 06 §11).

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnnounceContext } from '@shared/hooks/announceContext';

import { AuthContext } from '../hooks/authContext';
import { InvitacionesPendientes } from './InvitacionesPendientes';

import type { AuthState } from '../hooks/authContext';
import type { InvitacionRecibida } from '../model/personas';
import type { Session } from '@supabase/supabase-js';

const api = vi.hoisted(() => ({
  misInvitaciones: vi.fn<() => Promise<InvitacionRecibida[]>>(),
  aceptarInvitacion: vi.fn<(invitationId: string) => Promise<string>>(),
}));

vi.mock('../api/personas', () => api);
vi.mock('@shared/lib/supabase', () => ({ supabase: {} }));

const INVITACION: InvitacionRecibida = {
  id: 'inv-1',
  teamId: 'eq-1',
  teamName: 'Cadete A',
  clubName: 'C.D. Unión Tejina',
  invitedByName: 'Isaac',
  role: 'delegate',
  asFollower: false,
  expiresAt: '2026-10-21T10:00:00Z',
};

function montar() {
  const anunciar = vi.fn();
  const reintentarContexto = vi.fn();
  const auth: AuthState = {
    session: { user: { id: 'usuario-9' } } as Session,
    cargando: false,
    permisos: new Set(),
    profile: null,
    teams: [],
    activeTeamId: null,
    activeSeasonId: null,
    setActiveTeam: () => undefined,
    errorContexto: null,
    reintentarContexto,
  };

  const { container } = render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AuthContext value={auth}>
        <AnnounceContext value={{ anunciar }}>
          <InvitacionesPendientes />
        </AnnounceContext>
      </AuthContext>
    </QueryClientProvider>,
  );

  return { anunciar, reintentarContexto, container };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('InvitacionesPendientes', () => {
  it('sin invitaciones no pinta nada, ni el título', async () => {
    api.misInvitaciones.mockResolvedValue([]);
    const { container } = montar();

    await vi.waitFor(() => {
      expect(api.misInvitaciones).toHaveBeenCalled();
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('si la consulta falla, tampoco pinta nada', async () => {
    api.misInvitaciones.mockRejectedValue(new Error('sin red'));
    const { container } = montar();

    await vi.waitFor(() => {
      expect(api.misInvitaciones).toHaveBeenCalled();
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('con una, dice quién invita y a qué, y «Aceptar» llama a la API y recarga el contexto', async () => {
    api.misInvitaciones.mockResolvedValue([INVITACION]);
    api.aceptarInvitacion.mockResolvedValue('tm-nuevo');
    const usuario = userEvent.setup();
    const { anunciar, reintentarContexto } = montar();

    expect(await screen.findByRole('heading', { name: 'Invitaciones' })).toBeInTheDocument();
    expect(
      screen.getByText('Isaac te invita a Cadete A, de C.D. Unión Tejina, como delegado.'),
    ).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Aceptar la invitación a Cadete A' }));

    await vi.waitFor(() => {
      expect(api.aceptarInvitacion).toHaveBeenCalledWith('inv-1');
    });
    await vi.waitFor(() => {
      expect(reintentarContexto).toHaveBeenCalled();
    });
    expect(anunciar).toHaveBeenCalledWith('Ya formas parte de Cadete A');
  });

  it('si aceptar falla, enseña el mensaje de la base tal cual', async () => {
    api.misInvitaciones.mockResolvedValue([INVITACION]);
    api.aceptarInvitacion.mockRejectedValue({
      code: 'P0001',
      message: 'La invitación ha caducado.',
    });
    const usuario = userEvent.setup();
    const { reintentarContexto } = montar();

    await usuario.click(
      await screen.findByRole('button', { name: 'Aceptar la invitación a Cadete A' }),
    );

    expect(await screen.findByText('La invitación ha caducado.')).toBeInTheDocument();
    expect(reintentarContexto).not.toHaveBeenCalled();
  });
});
