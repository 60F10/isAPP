// Pantallas A03 y A04 (T-201): camino feliz y un fallo de cada una.
//
// La red se sustituye en la frontera de `api/` (DOC 06 §11).

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@modules/auth';
import { AnnounceContext } from '@shared/hooks/announceContext';

import { SIN_FILAS } from '../model/clubYEquipos';
import { ClubPage } from './ClubPage';
import { EquiposPage } from './EquiposPage';

import type { Club, Equipo } from '../model/clubYEquipos';
import type { AuthState } from '@modules/auth';
import type { Session } from '@supabase/supabase-js';
import type { ReactNode } from 'react';

const api = vi.hoisted(() => ({
  fetchClub: vi.fn<(clubId: string) => Promise<Club | null>>(),
  actualizarClub: vi.fn(),
  fetchEquiposDelClub: vi.fn<(clubId: string) => Promise<Equipo[]>>(),
  crearEquipo: vi.fn(),
  actualizarEquipo: vi.fn(),
}));

vi.mock('../api/clubYEquipos', () => api);
// El barril de `auth` trae el cliente de Supabase, y el cliente, `env.ts`, que
// lanza sin configuración. Aquí no se habla con la red: basta un objeto vacío.
vi.mock('@shared/lib/supabase', () => ({ supabase: {} }));

const EQUIPOS: Equipo[] = [
  {
    id: 'eq-1',
    clubId: 'club-1',
    name: 'Cadete A',
    category: 'Cadete',
    kind: 'managed',
    crestUrl: null,
  },
  {
    id: 'eq-2',
    clubId: 'club-1',
    name: 'CD Tacoronte',
    category: null,
    kind: 'reference',
    crestUrl: null,
  },
];

const AUTH: AuthState = {
  session: { user: { id: 'usuario-1' } } as Session,
  cargando: false,
  permisos: new Set(['team.manage']),
  profile: null,
  teams: [
    {
      teamMemberId: 'tm-1',
      role: 'coach',
      team: {
        id: 'eq-1',
        clubId: 'club-1',
        name: 'Cadete A',
        category: 'Cadete',
        crestUrl: null,
        primaryColor: null,
      },
      permissions: new Set(['team.manage']),
    },
  ],
  activeTeamId: 'eq-1',
  activeSeasonId: null,
  setActiveTeam: () => undefined,
  errorContexto: null,
  reintentarContexto: () => undefined,
};

function montar(pantalla: ReactNode) {
  const anunciar = vi.fn();
  const router = createMemoryRouter([{ path: '/', element: pantalla }]);

  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AuthContext value={AUTH}>
        <AnnounceContext value={{ anunciar }}>
          <RouterProvider router={router} />
        </AnnounceContext>
      </AuthContext>
    </QueryClientProvider>,
  );

  return { anunciar };
}

/** La tarjeta cuyo encabezado es `titulo`. `Card` no le pone nombre a su `<section>`. */
async function tarjeta(titulo: string): Promise<HTMLElement> {
  const encabezado = await screen.findByRole('heading', { level: 2, name: titulo });
  const seccion = encabezado.closest('section');

  if (seccion === null) {
    throw new Error(`La tarjeta «${titulo}» no está en una <section>.`);
  }

  return seccion;
}

beforeEach(() => {
  for (const simulada of Object.values(api)) {
    simulada.mockReset();
  }
});

describe('A03 · Club', () => {
  const CLUB: Club = {
    id: 'club-1',
    name: 'C.D. Unión Tejina',
    shortName: null,
    crestUrl: null,
    homeVenue: 'Campo de Fútbol Izquierdo Rodríguez',
    homeVenueAddress: 'Av. Milán, 27-29, 38260 La Laguna, Santa Cruz de Tenerife',
  };

  it('carga el club del equipo activo y guarda el cambio limpio', async () => {
    api.fetchClub.mockResolvedValue(CLUB);
    api.actualizarClub.mockResolvedValue({ ...CLUB, shortName: 'U. Tejina' });
    const { anunciar } = montar(<ClubPage />);

    const corto = await screen.findByLabelText(/Nombre corto/);
    expect(api.fetchClub).toHaveBeenCalledWith('club-1');
    expect(screen.getByLabelText(/^Nombre/, { selector: 'input[required]' })).toHaveValue(
      'C.D. Unión Tejina',
    );

    await userEvent.type(corto, '  U. Tejina ');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(api.actualizarClub).toHaveBeenCalledWith('club-1', {
      name: 'C.D. Unión Tejina',
      short_name: 'U. Tejina',
    });
    await vi.waitFor(() => {
      expect(anunciar).toHaveBeenCalledWith('Club guardado');
    });
  });

  it('si la RLS no deja guardar, lo dice con palabras', async () => {
    api.fetchClub.mockResolvedValue(CLUB);
    api.actualizarClub.mockRejectedValue(new Error(SIN_FILAS));
    montar(<ClubPage />);

    await screen.findByLabelText(/Nombre corto/);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('No tienes permiso para cambiar esto.')).toBeInTheDocument();
  });

  it('si no carga, ofrece reintentar', async () => {
    api.fetchClub.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue(CLUB);
    montar(<ClubPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByLabelText(/Nombre corto/)).toBeInTheDocument();
  });
});

describe('A04 · Equipos', () => {
  it('separa los equipos del club de los rivales', async () => {
    api.fetchEquiposDelClub.mockResolvedValue(EQUIPOS);
    montar(<EquiposPage />);

    const propios = await tarjeta('Equipos del club');
    const rivales = await tarjeta('Rivales');

    expect(within(propios).getByText('Cadete A')).toBeInTheDocument();
    expect(within(propios).getByRole('link', { name: 'Plantilla de Cadete A' })).toHaveAttribute(
      'href',
      '/equipos/eq-1/plantilla',
    );
    expect(within(rivales).getByText('CD Tacoronte')).toBeInTheDocument();
    expect(within(rivales).queryByRole('link')).toBeNull();
  });

  it('da de alta un rival con el texto limpio', async () => {
    api.fetchEquiposDelClub.mockResolvedValue(EQUIPOS);
    api.crearEquipo.mockResolvedValue({ ...EQUIPOS[1], id: 'eq-3', name: 'UD Orotava' });
    const { anunciar } = montar(<EquiposPage />);

    const alta = await tarjeta('Añadir equipo');
    await userEvent.type(within(alta).getByLabelText(/^Nombre/), '  UD   Orotava ');
    await userEvent.click(within(alta).getByRole('button', { name: 'Añadir equipo' }));

    expect(api.crearEquipo).toHaveBeenCalledWith('club-1', 'usuario-1', {
      name: 'UD Orotava',
      category: null,
      kind: 'reference',
    });
    await vi.waitFor(() => {
      expect(anunciar).toHaveBeenCalledWith('UD Orotava añadido');
    });
    expect(within(alta).getByLabelText(/^Nombre/)).toHaveValue('');
  });

  it('un nombre repetido se para en la pantalla, sin llamar a la base', async () => {
    api.fetchEquiposDelClub.mockResolvedValue(EQUIPOS);
    montar(<EquiposPage />);

    const alta = await tarjeta('Añadir equipo');
    await userEvent.type(within(alta).getByLabelText(/^Nombre/), 'cd tacoronte');
    await userEvent.click(within(alta).getByRole('button', { name: 'Añadir equipo' }));

    expect(
      within(alta).getByText('Ya hay un equipo con ese nombre en el club.'),
    ).toBeInTheDocument();
    expect(api.crearEquipo).not.toHaveBeenCalled();
  });

  it('edita un equipo y devuelve el foco al botón al terminar', async () => {
    api.fetchEquiposDelClub.mockResolvedValue(EQUIPOS);
    api.actualizarEquipo.mockResolvedValue({ ...EQUIPOS[1], name: 'CD Tacoronte B' });
    montar(<EquiposPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Editar CD Tacoronte' }));

    const formulario = screen.getByRole('form', { name: 'Editar CD Tacoronte' });
    const nombre = within(formulario).getByLabelText(/^Nombre/);
    expect(nombre).toHaveFocus();

    await userEvent.type(nombre, ' B');
    await userEvent.click(within(formulario).getByRole('button', { name: 'Guardar' }));

    expect(api.actualizarEquipo).toHaveBeenCalledWith('eq-2', {
      name: 'CD Tacoronte B',
      category: null,
    });
    expect(await screen.findByRole('button', { name: 'Editar CD Tacoronte' })).toHaveFocus();
  });
});
