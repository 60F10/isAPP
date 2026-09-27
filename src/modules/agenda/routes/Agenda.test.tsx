// Pantallas A09 y A10 (T-204): calendario, alta, edición y borrado.
//
// La red se sustituye en la frontera de `api/` (DOC 06 §11): la de `agenda` y
// también la de `core` y `rules`, de donde salen rivales y competiciones.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@modules/auth';
import { AnnounceContext } from '@shared/hooks/announceContext';

import { CalendarioPage } from './CalendarioPage';
import { EditarPartidoPage, NuevoPartidoPage } from './PartidoPage';

import type { Partido } from '../model/partido';
import type { AppPermission, AuthState } from '@modules/auth';
import type { Session } from '@supabase/supabase-js';

const api = vi.hoisted(() => ({
  fetchCalendario: vi.fn(),
  fetchPartido: vi.fn(),
  crearPartido: vi.fn(),
  actualizarPartido: vi.fn(),
  borrarPartido: vi.fn(),
}));
const core = vi.hoisted(() => ({ fetchEquiposDelClub: vi.fn(), fetchClub: vi.fn() }));
const rules = vi.hoisted(() => ({ fetchCompeticiones: vi.fn() }));

vi.mock('../api/partidos', () => api);
vi.mock('@modules/core/api/clubYEquipos', () => core);
vi.mock('@modules/rules/api/competiciones', () => rules);
vi.mock('@shared/lib/supabase', () => ({ supabase: {} }));

const COMPETICION = { id: 'comp-1', name: 'Cadete Primera Tenerife G2' };
const CLUB = {
  id: 'club-1',
  name: 'C.D. Unión Tejina',
  shortName: null,
  crestUrl: null,
  homeVenue: 'Campo de Fútbol Izquierdo Rodríguez',
  homeVenueAddress: 'Av. Milán, 27-29, 38260 La Laguna, Santa Cruz de Tenerife',
};
const EQUIPOS = [
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
    name: 'UD Orotava',
    category: null,
    kind: 'reference',
    crestUrl: null,
  },
];

function partido(cambios: Partial<Partido> = {}): Partido {
  return {
    id: 'par-1',
    teamId: 'eq-1',
    competitionId: 'comp-1',
    competitionName: 'Cadete Primera Tenerife G2',
    opponentTeamId: 'eq-2',
    opponentName: 'UD Orotava',
    isHome: true,
    kickoffAt: new Date(2099, 9, 25, 11, 30).toISOString(),
    venue: 'Campo de Fútbol Izquierdo Rodríguez',
    status: 'scheduled',
    isRetroactive: false,
    ...cambios,
  };
}

function auth(permisos: AppPermission[]): AuthState {
  return {
    session: { user: { id: 'usuario-1' } } as Session,
    cargando: false,
    permisos: new Set(permisos),
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
        permissions: new Set(permisos),
      },
    ],
    activeTeamId: 'eq-1',
    activeSeasonId: 'temp-1',
    setActiveTeam: () => undefined,
    errorContexto: null,
    reintentarContexto: () => undefined,
  };
}

function montar(ruta: string, permisos: AppPermission[] = ['schedule.manage', 'lineup.manage']) {
  const anunciar = vi.fn();
  const router = createMemoryRouter(
    [
      { path: '/calendario', element: <CalendarioPage /> },
      { path: '/partidos/nuevo', element: <NuevoPartidoPage /> },
      { path: '/partidos/:id/editar', element: <EditarPartidoPage /> },
    ],
    { initialEntries: [ruta] },
  );

  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AuthContext value={auth(permisos)}>
        <AnnounceContext value={{ anunciar }}>
          <RouterProvider router={router} />
        </AnnounceContext>
      </AuthContext>
    </QueryClientProvider>,
  );

  return { anunciar };
}

async function tarjeta(titulo: string): Promise<HTMLElement> {
  const encabezado = await screen.findByRole('heading', { level: 2, name: titulo });
  const seccion = encabezado.closest('section');

  if (seccion === null) {
    throw new Error('La tarjeta no está en una <section>.');
  }

  return seccion;
}

beforeEach(() => {
  for (const simulada of [
    ...Object.values(api),
    core.fetchEquiposDelClub,
    core.fetchClub,
    rules.fetchCompeticiones,
  ]) {
    simulada.mockReset();
  }

  core.fetchEquiposDelClub.mockResolvedValue(EQUIPOS);
  core.fetchClub.mockResolvedValue(CLUB);
  rules.fetchCompeticiones.mockResolvedValue([COMPETICION]);
});

describe('A09 · Calendario', () => {
  it('separa por jugar y jugados, con el local delante y el estado escrito', async () => {
    api.fetchCalendario.mockResolvedValue([
      partido(),
      partido({
        id: 'par-0',
        isHome: false,
        status: 'closed',
        kickoffAt: new Date(2026, 8, 20).toISOString(),
      }),
    ]);
    montar('/calendario');

    const porJugar = await tarjeta('Por jugar');
    const jugados = await tarjeta('Jugados');

    expect(api.fetchCalendario).toHaveBeenCalledWith('eq-1', 'temp-1');
    expect(within(porJugar).getByText('Cadete A – UD Orotava')).toBeInTheDocument();
    expect(within(porJugar).getByText('Programado')).toBeInTheDocument();
    expect(within(jugados).getByText('UD Orotava – Cadete A')).toBeInTheDocument();
    expect(within(jugados).getByText('Cerrado')).toBeInTheDocument();
    expect(within(jugados).queryByRole('link')).toBeNull();
    expect(
      within(porJugar).getByRole('link', { name: 'Editar Cadete A – UD Orotava' }),
    ).toHaveAttribute('href', '/partidos/par-1/editar');
    expect(
      within(porJugar).getByRole('link', { name: 'Convocatoria de Cadete A – UD Orotava' }),
    ).toHaveAttribute('href', '/partidos/par-1/convocatoria');
    expect(screen.getByRole('link', { name: 'Nuevo partido' })).toHaveAttribute(
      'href',
      '/partidos/nuevo',
    );
  });

  it('sin permisos de programar ni convocar, solo mirar', async () => {
    api.fetchCalendario.mockResolvedValue([partido()]);
    montar('/calendario', []);

    const porJugar = await tarjeta('Por jugar');

    expect(within(porJugar).getByText('Cadete A – UD Orotava')).toBeInTheDocument();
    expect(within(porJugar).queryByRole('link')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Nuevo partido' })).toBeNull();
  });

  it('el cierre solo se enlaza con el permiso de cerrar', async () => {
    api.fetchCalendario.mockResolvedValue([partido({ status: 'finished' })]);
    montar('/calendario', ['schedule.manage', 'lineup.manage', 'match.close']);

    const jugados = await tarjeta('Jugados');
    expect(
      within(jugados).getByRole('link', { name: 'Cierre de Cadete A – UD Orotava' }),
    ).toHaveAttribute('href', '/partidos/par-1/cierre');

    cleanup();
    api.fetchCalendario.mockResolvedValue([partido({ status: 'finished' })]);
    montar('/calendario', ['schedule.manage', 'lineup.manage']);

    const jugadosSinPermiso = await tarjeta('Jugados');
    expect(within(jugadosSinPermiso).queryByRole('link', { name: /Cierre/ })).toBeNull();
  });
});

describe('A10 · Nuevo partido', () => {
  it('con una sola competición ya elegida y el campo de casa del club propuesto', async () => {
    // Calendario vacío: el campo sale del club, no de un partido anterior.
    api.fetchCalendario.mockResolvedValue([]);
    api.crearPartido.mockResolvedValue(partido({ id: 'par-2', opponentName: 'UD Orotava' }));
    const { anunciar } = montar('/partidos/nuevo');

    const datos = await tarjeta('Datos del partido');
    expect(core.fetchClub).toHaveBeenCalledWith('club-1');
    expect(within(datos).getByLabelText(/^Competición/)).toHaveValue('comp-1');
    expect(within(datos).getByLabelText(/^Campo/)).toHaveValue(
      'Campo de Fútbol Izquierdo Rodríguez',
    );

    await userEvent.selectOptions(within(datos).getByLabelText(/^Rival/), 'eq-2');
    await userEvent.type(within(datos).getByLabelText(/^Fecha/), '2099-11-08');
    await userEvent.type(within(datos).getByLabelText(/^Hora/), '10:00');
    await userEvent.click(within(datos).getByRole('button', { name: 'Añadir al calendario' }));

    expect(api.crearPartido).toHaveBeenCalledWith(
      { clubId: 'club-1', equipoId: 'eq-1', temporadaId: 'temp-1', userId: 'usuario-1' },
      {
        competition_id: 'comp-1',
        opponent_team_id: 'eq-2',
        is_home: true,
        kickoff_at: new Date(2099, 10, 8, 10, 0).toISOString(),
        venue: 'Campo de Fútbol Izquierdo Rodríguez',
        is_retroactive: false,
      },
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Calendario' }),
    ).toBeInTheDocument();
    expect(anunciar).toHaveBeenCalledWith('Cadete A – UD Orotava añadido al calendario');
  });

  it('si el club no tiene campo de casa, propone el del último partido en casa', async () => {
    core.fetchClub.mockResolvedValue({ ...CLUB, homeVenue: null, homeVenueAddress: null });
    api.fetchCalendario.mockResolvedValue([partido({ venue: 'Campo Municipal de Tejina' })]);
    montar('/partidos/nuevo');

    const datos = await tarjeta('Datos del partido');

    expect(within(datos).getByLabelText(/^Campo/)).toHaveValue('Campo Municipal de Tejina');
  });

  it('al pasar de fuera a casa con el campo vacío, propone el del club', async () => {
    api.fetchCalendario.mockResolvedValue([]);
    montar('/partidos/nuevo');

    const datos = await tarjeta('Datos del partido');
    const campo = within(datos).getByLabelText(/^Campo/);
    await userEvent.click(within(datos).getByRole('radio', { name: 'Fuera' }));
    await userEvent.clear(campo);
    await userEvent.click(within(datos).getByRole('radio', { name: 'En casa' }));

    expect(campo).toHaveValue('Campo de Fútbol Izquierdo Rodríguez');
  });

  it('sin rival elegido se para junto al campo, sin llamar a la base', async () => {
    api.fetchCalendario.mockResolvedValue([]);
    montar('/partidos/nuevo');

    const datos = await tarjeta('Datos del partido');
    await userEvent.click(within(datos).getByRole('button', { name: 'Añadir al calendario' }));

    expect(within(datos).getByText('Elige el rival.')).toBeInTheDocument();
    expect(within(datos).getByLabelText(/^Rival/)).toHaveAttribute('aria-invalid', 'true');
    expect(api.crearPartido).not.toHaveBeenCalled();
  });

  it('un partido en diferido con fecha futura no pasa', async () => {
    api.fetchCalendario.mockResolvedValue([]);
    montar('/partidos/nuevo');

    const datos = await tarjeta('Datos del partido');
    await userEvent.selectOptions(within(datos).getByLabelText(/^Rival/), 'eq-2');
    await userEvent.type(within(datos).getByLabelText(/^Fecha/), '2099-11-08');
    await userEvent.type(within(datos).getByLabelText(/^Hora/), '10:00');
    await userEvent.click(within(datos).getByRole('checkbox', { name: /lo meto en diferido/ }));
    await userEvent.click(within(datos).getByRole('button', { name: 'Añadir al calendario' }));

    expect(
      within(datos).getByText(
        'Un partido en diferido ya se jugó: la fecha tiene que ser anterior a ahora.',
      ),
    ).toBeInTheDocument();
    expect(api.crearPartido).not.toHaveBeenCalled();
  });

  it('sin rivales, manda a Equipos a darlos de alta', async () => {
    api.fetchCalendario.mockResolvedValue([]);
    core.fetchEquiposDelClub.mockResolvedValue([EQUIPOS[0]]);
    montar('/partidos/nuevo');

    expect(await screen.findByRole('link', { name: 'Añádelo en Equipos' })).toHaveAttribute(
      'href',
      '/equipos',
    );
    expect(screen.queryByRole('button', { name: 'Añadir al calendario' })).toBeNull();
  });
});

describe('A10 · Editar partido', () => {
  it('rellena el formulario con lo guardado', async () => {
    api.fetchCalendario.mockResolvedValue([partido()]);
    api.fetchPartido.mockResolvedValue(partido({ isHome: false, venue: 'La Manzanilla' }));
    montar('/partidos/par-1/editar');

    const datos = await tarjeta('Datos del partido');

    expect(
      screen.getByRole('heading', { level: 1, name: 'UD Orotava – Cadete A' }),
    ).toBeInTheDocument();
    expect(within(datos).getByLabelText(/^Rival/)).toHaveValue('eq-2');
    expect(within(datos).getByLabelText(/^Fecha/)).toHaveValue('2099-10-25');
    expect(within(datos).getByLabelText(/^Hora/)).toHaveValue('11:30');
    expect(within(datos).getByLabelText(/^Campo/)).toHaveValue('La Manzanilla');
    expect(within(datos).getByRole('radio', { name: 'Fuera' })).toBeChecked();
  });

  it('un partido que ya empezó no se edita ni se borra', async () => {
    api.fetchCalendario.mockResolvedValue([]);
    api.fetchPartido.mockResolvedValue(partido({ status: 'live' }));
    montar('/partidos/par-1/editar');

    expect(
      await screen.findByText(/ya empezó, y su fecha, rival y campo ya no se cambian/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Borrar partido' })).toBeNull();
  });

  it('el borrado pide confirmación y vuelve al calendario', async () => {
    api.fetchCalendario.mockResolvedValue([]);
    api.fetchPartido.mockResolvedValue(partido());
    api.borrarPartido.mockResolvedValue(undefined);
    const { anunciar } = montar('/partidos/par-1/editar');

    const borrar = await tarjeta('Borrar');
    await userEvent.click(within(borrar).getByRole('button', { name: 'Borrar partido' }));
    expect(api.borrarPartido).not.toHaveBeenCalled();

    await userEvent.click(within(borrar).getByRole('button', { name: 'Sí, borrar el partido' }));

    expect(api.borrarPartido).toHaveBeenCalledWith('par-1');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Calendario' }),
    ).toBeInTheDocument();
    expect(anunciar).toHaveBeenCalledWith('Cadete A – UD Orotava borrado');
  });
});
