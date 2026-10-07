// «Mi equipo» (T-304): el equipo activo con su plantilla en solo lectura.
//
// La red se sustituye en la frontera de `api/` (DOC 06 §11), salvo en la
// prueba de la consulta, que usa la función de verdad con un Supabase falso.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@modules/auth';

import { MiEquipoPage } from './MiEquipoPage';

import type { LecturaDePlantilla } from '../model/plantilla';
import type { AuthState, Membership } from '@modules/auth';
import type { Session } from '@supabase/supabase-js';

const api = vi.hoisted(() => ({ fetchPlantillaDeLectura: vi.fn() }));

const consulta = vi.hoisted(() => {
  const cadena = { select: vi.fn(), eq: vi.fn(), is: vi.fn() };

  cadena.select.mockReturnValue(cadena);
  cadena.eq.mockReturnValue(cadena);
  cadena.is.mockResolvedValue({ data: [], error: null });

  return { cadena, from: vi.fn(() => cadena) };
});

vi.mock('../api/plantilla', () => api);
vi.mock('@shared/lib/supabase', () => ({ supabase: { from: consulta.from } }));

const PLANTILLA: LecturaDePlantilla[] = [
  { playerId: 'jug-2', nickname: 'Pipo', shirtNumber: null, defaultPosition: null },
  { playerId: 'jug-3', nickname: 'Nano', shirtNumber: 10, defaultPosition: 'FW' },
  { playerId: 'jug-1', nickname: 'Tito', shirtNumber: 1, defaultPosition: 'GK' },
];

function membresia(cambios: Partial<Membership> = {}): Membership {
  return {
    teamMemberId: 'miembro-1',
    role: 'coach',
    team: {
      id: 'eq-1',
      clubId: 'club-1',
      name: 'Cadete A',
      category: 'Cadete',
      crestUrl: null,
      primaryColor: null,
    },
    permissions: new Set(),
    seguidor: false,
    ...cambios,
  };
}

function autenticacion(permisos: string[], cambios: Partial<AuthState> = {}): AuthState {
  return {
    session: { user: { id: 'usuario-1' } } as Session,
    cargando: false,
    permisos: new Set(permisos),
    profile: null,
    teams: [membresia()],
    activeTeamId: 'eq-1',
    activeSeasonId: 'temp-1',
    setActiveTeam: () => undefined,
    errorContexto: null,
    reintentarContexto: () => undefined,
    ...cambios,
  };
}

function montar(auth: AuthState) {
  const router = createMemoryRouter([{ path: '/equipo', element: <MiEquipoPage /> }], {
    initialEntries: ['/equipo'],
  });

  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AuthContext value={auth}>
        <RouterProvider router={router} />
      </AuthContext>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchPlantillaDeLectura.mockResolvedValue(PLANTILLA);
});

describe('MiEquipoPage', () => {
  it('enseña el equipo activo y la tabla con dorsal, apodo y posición en palabras', async () => {
    montar(autenticacion([]));

    expect(await screen.findByRole('heading', { level: 1, name: 'Cadete A' })).toBeInTheDocument();
    expect(screen.getByText('Cadete')).toBeInTheDocument();

    const tabla = await screen.findByRole('table', { name: /plantilla/i });

    expect(
      within(tabla)
        .getAllByRole('columnheader')
        .map((celda) => celda.textContent),
    ).toEqual(['Dorsal', 'Apodo', 'Posición']);

    const filas = within(tabla).getAllByRole('row').slice(1);

    // Por dorsal, y el que no tiene va al final, con rayas.
    expect(filas.map((fila) => within(fila).getAllByRole('cell').length)).toEqual([2, 2, 2]);
    expect(filas[0]).toHaveTextContent('1');
    expect(filas[0]).toHaveTextContent('Tito');
    expect(filas[0]).toHaveTextContent('Portero');
    expect(filas[1]).toHaveTextContent('10');
    expect(filas[1]).toHaveTextContent('Delantero');
    expect(filas[2]).toHaveTextContent('Pipo');
    expect(filas[2]).toHaveTextContent('—');
    expect(api.fetchPlantillaDeLectura).toHaveBeenCalledWith('eq-1', 'temp-1');
  });

  it('sin ningún permiso no sale «Gestión»', async () => {
    montar(autenticacion([]));

    await screen.findByRole('table');

    expect(screen.queryByRole('heading', { name: 'Gestión' })).not.toBeInTheDocument();
  });

  it('con roster.manage sale «Editar la plantilla» y no «Personas y permisos»', async () => {
    montar(autenticacion(['roster.manage']));

    const editar = await screen.findByRole('link', { name: 'Editar la plantilla' });

    expect(editar).toHaveAttribute('href', '/equipos/eq-1/plantilla');
    expect(screen.queryByRole('link', { name: 'Personas y permisos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Club' })).not.toBeInTheDocument();
  });

  it('con team.manage y members.manage salen el resto de enlaces', async () => {
    montar(autenticacion(['team.manage', 'members.manage']));

    expect(await screen.findByRole('link', { name: 'Personas y permisos' })).toHaveAttribute(
      'href',
      '/equipos/eq-1/personas',
    );
    expect(screen.getByRole('link', { name: 'Club' })).toHaveAttribute('href', '/club');
    expect(screen.getByRole('link', { name: 'Equipos del club' })).toHaveAttribute(
      'href',
      '/equipos',
    );
  });

  it('mientras los permisos no se saben, no sale ningún enlace de gestión', async () => {
    montar(autenticacion([], { permisos: null }));

    await screen.findByRole('table');

    expect(screen.queryByRole('heading', { name: 'Gestión' })).not.toBeInTheDocument();
  });

  it('sin equipo activo: el texto y el enlace a /unirse', () => {
    montar(autenticacion([], { teams: [], activeTeamId: null, activeSeasonId: null }));

    expect(screen.getByText('Todavía no tienes equipo.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Unirse a un equipo' })).toHaveAttribute(
      'href',
      '/unirse',
    );
    expect(api.fetchPlantillaDeLectura).not.toHaveBeenCalled();
  });

  it('sin temporada en curso lo dice y no pide la plantilla', () => {
    montar(autenticacion([], { activeSeasonId: null }));

    expect(screen.getByText('No hay temporada en curso.')).toBeInTheDocument();
    expect(api.fetchPlantillaDeLectura).not.toHaveBeenCalled();
  });

  it('con la plantilla vacía lo dice', async () => {
    api.fetchPlantillaDeLectura.mockResolvedValue([]);
    montar(autenticacion([]));

    expect(
      await screen.findByText('Todavía no hay jugadores en la plantilla.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('si falla la lectura, da el mensaje y «Reintentar»', async () => {
    api.fetchPlantillaDeLectura.mockRejectedValue(new Error('sin red'));
    montar(autenticacion([]));

    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(screen.getByText(/No se ha podido cargar la plantilla/)).toBeInTheDocument();
  });

  it('a quien solo sigue al equipo se lo dice', async () => {
    montar(autenticacion([], { teams: [membresia({ seguidor: true, role: null })] }));

    expect(
      await screen.findByText('Sigues a este equipo: puedes verlo, no cambiarlo.'),
    ).toBeInTheDocument();
  });

  it('sin categoría no pinta nada debajo del nombre', async () => {
    const sinCategoria = membresia();

    montar(
      autenticacion([], {
        teams: [{ ...sinCategoria, team: { ...sinCategoria.team, category: null } }],
      }),
    );

    await screen.findByRole('table');

    expect(screen.queryByText('Cadete')).not.toBeInTheDocument();
  });
});

describe('fetchPlantillaDeLectura', () => {
  it('la consulta nueva no nombra availability', async () => {
    const { fetchPlantillaDeLectura } =
      await vi.importActual<typeof import('../api/plantilla')>('../api/plantilla');

    await fetchPlantillaDeLectura('eq-1', 'temp-1');

    expect(consulta.from).toHaveBeenCalledWith('squad_memberships');

    const columnas = String(consulta.cadena.select.mock.calls[0]?.[0]);

    expect(columnas).not.toContain('availability');
    expect(columnas).toContain('player_id');
    expect(columnas).toContain('shirt_number');
    expect(columnas).toContain('default_position');
    expect(columnas).toContain('players(nickname)');
  });
});
