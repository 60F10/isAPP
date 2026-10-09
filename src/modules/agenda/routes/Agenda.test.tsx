// Pantallas A09 y A10 (T-204): calendario, alta, edición y borrado. Y la A02
// (T-213), que `agenda` sirve con el próximo partido dentro.
//
// La red se sustituye en la frontera de `api/` (DOC 06 §11): la de `agenda` y
// también la de `core` y `rules`, de donde salen rivales y competiciones, y
// desde la T-231 la de `training`, de donde salen los entrenamientos.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@modules/auth';
import { AnnounceContext } from '@shared/hooks/announceContext';

import { CalendarioPage } from './CalendarioPage';
import { InicioPage } from './InicioPage';
import { EditarPartidoPage, NuevoPartidoPage } from './PartidoPage';

import type { Partido } from '../model/partido';
import type { AppPermission, AuthState } from '@modules/auth';
import type { Entrenamiento } from '@modules/training';
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
// El barril de `training` trae sus pantallas, y con ellas toda su `api/`: el
// doble las lleva todas, aunque aquí solo se llame a `fetchEntrenamientos`.
const training = vi.hoisted(() => ({
  fetchEntrenamientos: vi.fn(),
  fetchEntrenamiento: vi.fn(),
  crearEntrenamiento: vi.fn(),
  crearEntrenamientos: vi.fn(),
  fetchFinDeTemporada: vi.fn(),
  actualizarEntrenamiento: vi.fn(),
  borrarEntrenamiento: vi.fn(),
}));

vi.mock('../api/partidos', () => api);
vi.mock('@modules/core/api/clubYEquipos', () => core);
vi.mock('@modules/rules/api/competiciones', () => rules);
vi.mock('@modules/training/api/entrenamientos', () => training);
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

/**
 * Un instante a tantos días de hoy, en la hora del móvil. Los entrenamientos
 * salen por la fecha, no por el estado, así que sus pruebas no pueden clavar
 * un día de 2099 como las de los partidos.
 */
function dentroDe(dias: number, hora = 18, minuto = 0): string {
  const hoy = new Date();

  return new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate() + dias,
    hora,
    minuto,
  ).toISOString();
}

function entrenamiento(cambios: Partial<Entrenamiento> = {}): Entrenamiento {
  return {
    id: 'ent-1',
    teamId: 'eq-1',
    seasonId: 'temp-1',
    scheduledAt: dentroDe(2),
    location: 'Campo de Fútbol Izquierdo Rodríguez',
    focus: 'Salida de balón',
    ...cambios,
  };
}

function auth(permisos: AppPermission[], seguidor = false): AuthState {
  return {
    session: { user: { id: 'usuario-1' } } as Session,
    cargando: false,
    permisos: new Set(permisos),
    profile: null,
    teams: [
      {
        // Quien solo sigue al equipo no tiene fila de miembro ni rol (T-301c).
        teamMemberId: seguidor ? null : 'tm-1',
        role: seguidor ? null : 'coach',
        seguidor,
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

function montar(
  ruta: string,
  permisos: AppPermission[] = ['schedule.manage', 'lineup.manage'],
  seguidor = false,
) {
  const anunciar = vi.fn();
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path: '/', element: <InicioPage /> },
      { path: '/calendario', element: <CalendarioPage /> },
      { path: '/partidos/nuevo', element: <NuevoPartidoPage /> },
      { path: '/partidos/:id/editar', element: <EditarPartidoPage /> },
    ],
    { initialEntries: [ruta] },
  );

  render(
    <QueryClientProvider client={cliente}>
      <AuthContext value={auth(permisos, seguidor)}>
        <AnnounceContext value={{ anunciar }}>
          <RouterProvider router={router} />
        </AnnounceContext>
      </AuthContext>
    </QueryClientProvider>,
  );

  return { anunciar, cliente };
}

/**
 * Espera a que los entrenamientos hayan llegado, o fallado, y a que la
 * pantalla se haya repintado con ello. Hace falta antes de comprobar que algo
 * NO sale: sin esperar, esa comprobación pasa también cuando la consulta
 * todavía está en camino.
 */
async function entrenamientosResueltos(cliente: QueryClient): Promise<void> {
  await waitFor(() => {
    expect(training.fetchEntrenamientos).toHaveBeenCalled();
    expect(cliente.isFetching()).toBe(0);
  });
  // TanStack Query avisa a React en la vuelta siguiente.
  await act(async () => {
    await new Promise((resolver) => {
      setTimeout(resolver, 0);
    });
  });
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
    ...Object.values(training),
    core.fetchEquiposDelClub,
    core.fetchClub,
    rules.fetchCompeticiones,
  ]) {
    simulada.mockReset();
  }

  core.fetchEquiposDelClub.mockResolvedValue(EQUIPOS);
  core.fetchClub.mockResolvedValue(CLUB);
  rules.fetchCompeticiones.mockResolvedValue([COMPETICION]);
  training.fetchEntrenamientos.mockResolvedValue([]);
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

  it('«Todos los entrenamientos» sale con función en el equipo, tenga o no training.manage', async () => {
    api.fetchCalendario.mockResolvedValue([partido()]);
    montar('/calendario', ['training.manage']);

    await tarjeta('Por jugar');
    expect(screen.getByRole('link', { name: 'Todos los entrenamientos' })).toHaveAttribute(
      'href',
      '/entrenamientos',
    );

    cleanup();
    api.fetchCalendario.mockResolvedValue([partido()]);
    montar('/calendario', []);

    await tarjeta('Por jugar');
    expect(screen.getByRole('link', { name: 'Todos los entrenamientos' })).toHaveAttribute(
      'href',
      '/entrenamientos',
    );
    expect(screen.queryByRole('link', { name: 'Nuevo partido' })).toBeNull();
  });

  it('«Todos los entrenamientos» no sale con una membresía de seguidor, que no puede leerlos', async () => {
    api.fetchCalendario.mockResolvedValue([partido()]);
    montar('/calendario', [], true);

    const porJugar = await tarjeta('Por jugar');

    expect(within(porJugar).getByText('Cadete A – UD Orotava')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Todos los entrenamientos' })).toBeNull();
  });

  it('enseña un entrenamiento entre dos partidos, con la palabra «Entrenamiento»', async () => {
    api.fetchCalendario.mockResolvedValue([
      partido({ id: 'par-2', opponentName: 'CD Tacoronte', kickoffAt: dentroDe(3, 11, 30) }),
      partido({ kickoffAt: dentroDe(1, 11, 30) }),
    ]);
    training.fetchEntrenamientos.mockResolvedValue([entrenamiento()]);
    montar('/calendario', []);

    const porJugar = await tarjeta('Por jugar');
    await within(porJugar).findByText('Entrenamiento');

    const filas = within(porJugar).getAllByRole('listitem');

    expect(training.fetchEntrenamientos).toHaveBeenCalledWith('eq-1', 'temp-1');
    expect(filas).toHaveLength(3);
    expect(within(filas[0]).getByText('Cadete A – UD Orotava')).toBeInTheDocument();
    expect(within(filas[1]).getByText('Entrenamiento')).toBeInTheDocument();
    expect(within(filas[1]).getByText('Campo de Fútbol Izquierdo Rodríguez')).toBeInTheDocument();
    expect(within(filas[1]).getByText('Salida de balón')).toBeInTheDocument();
    expect(within(filas[2]).getByText('Cadete A – CD Tacoronte')).toBeInTheDocument();
  });

  it('los entrenamientos de ayer y de dentro de un mes no salen, y «Jugados» es solo de partidos', async () => {
    api.fetchCalendario.mockResolvedValue([partido({ status: 'closed' })]);
    training.fetchEntrenamientos.mockResolvedValue([
      entrenamiento({
        id: 'ent-lejos',
        scheduledAt: dentroDe(30),
        focus: 'El de dentro de un mes',
      }),
      entrenamiento({ id: 'ent-ayer', scheduledAt: dentroDe(-1), focus: 'El de ayer' }),
      entrenamiento({ id: 'ent-cerca', scheduledAt: dentroDe(1), focus: 'El de mañana' }),
    ]);
    montar('/calendario', []);

    const porJugar = await tarjeta('Por jugar');
    const jugados = await tarjeta('Jugados');

    // Sin partidos por jugar, la tarjeta enseña el entrenamiento que sí toca.
    expect(await within(porJugar).findByText('El de mañana')).toBeInTheDocument();
    expect(within(porJugar).getAllByRole('listitem')).toHaveLength(1);
    expect(within(jugados).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getAllByText('Entrenamiento')).toHaveLength(1);
    expect(screen.queryByText('El de ayer')).toBeNull();
    expect(screen.queryByText('El de dentro de un mes')).toBeNull();
  });

  it('sin partidos por jugar ni entrenamientos cercanos, el texto sigue hablando de partidos', async () => {
    api.fetchCalendario.mockResolvedValue([partido({ status: 'closed' })]);
    training.fetchEntrenamientos.mockResolvedValue([
      entrenamiento({ id: 'ent-lejos', scheduledAt: dentroDe(30) }),
    ]);
    const { cliente } = montar('/calendario', []);

    const porJugar = await tarjeta('Por jugar');
    await entrenamientosResueltos(cliente);

    expect(within(porJugar).getByText('No hay partidos programados.')).toBeInTheDocument();
    expect(screen.queryByText('Entrenamiento')).toBeNull();
  });

  it('«Pasar lista» sale con training.manage y no sale sin él', async () => {
    api.fetchCalendario.mockResolvedValue([partido()]);
    training.fetchEntrenamientos.mockResolvedValue([entrenamiento()]);
    montar('/calendario', ['training.manage']);

    const conPermiso = await tarjeta('Por jugar');
    await within(conPermiso).findByText('Entrenamiento');

    // El nombre accesible lleva el día: con varios, dice cuál es cuál.
    expect(
      within(conPermiso).getByRole('link', { name: /^Pasar lista: .+ · 18:00$/ }),
    ).toHaveAttribute('href', '/entrenamientos/ent-1/lista');

    cleanup();
    api.fetchCalendario.mockResolvedValue([partido()]);
    training.fetchEntrenamientos.mockResolvedValue([entrenamiento()]);
    montar('/calendario', []);

    const sinPermiso = await tarjeta('Por jugar');
    await within(sinPermiso).findByText('Entrenamiento');

    expect(within(sinPermiso).queryByRole('link')).toBeNull();
  });

  it('si los entrenamientos fallan, los partidos salen y se dice', async () => {
    api.fetchCalendario.mockResolvedValue([partido()]);
    training.fetchEntrenamientos.mockRejectedValue(new Error('sin red'));
    montar('/calendario', []);

    const porJugar = await tarjeta('Por jugar');

    expect(within(porJugar).getByText('Cadete A – UD Orotava')).toBeInTheDocument();
    expect(
      await screen.findByText('No se han podido cargar los entrenamientos.'),
    ).toBeInTheDocument();
    expect(within(porJugar).getAllByRole('listitem')).toHaveLength(1);
  });

  it('con una membresía de seguidor, los entrenamientos ni se piden', async () => {
    api.fetchCalendario.mockResolvedValue([partido()]);
    training.fetchEntrenamientos.mockResolvedValue([entrenamiento()]);
    montar('/calendario', [], true);

    const porJugar = await tarjeta('Por jugar');

    expect(within(porJugar).getByText('Cadete A – UD Orotava')).toBeInTheDocument();
    expect(training.fetchEntrenamientos).not.toHaveBeenCalled();
    expect(screen.queryByText('Entrenamiento')).toBeNull();
    expect(screen.queryByText('No se han podido cargar los entrenamientos.')).toBeNull();
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

  it('el directo se enlaza convocado o en juego, y solo con el permiso de anotar', async () => {
    api.fetchCalendario.mockResolvedValue([partido({ status: 'called' })]);
    montar('/calendario', ['match.live.write']);

    const convocado = await tarjeta('Por jugar');
    expect(
      within(convocado).getByRole('link', { name: 'Directo de Cadete A – UD Orotava' }),
    ).toHaveAttribute('href', '/partidos/par-1/directo');

    cleanup();
    api.fetchCalendario.mockResolvedValue([partido({ status: 'called', isRetroactive: true })]);
    montar('/calendario', ['match.live.write']);

    const enDiferido = await tarjeta('Por jugar');
    expect(
      within(enDiferido).getByRole('link', { name: 'Apuntar Cadete A – UD Orotava' }),
    ).toHaveAttribute('href', '/partidos/par-1/directo');

    cleanup();
    api.fetchCalendario.mockResolvedValue([partido({ status: 'scheduled' })]);
    montar('/calendario', ['match.live.write']);

    const programado = await tarjeta('Por jugar');
    expect(within(programado).getByText('Cadete A – UD Orotava')).toBeInTheDocument();
    expect(within(programado).queryByRole('link', { name: /Directo|Apuntar/ })).toBeNull();

    cleanup();
    api.fetchCalendario.mockResolvedValue([partido({ status: 'called' })]);
    montar('/calendario', ['lineup.manage']);

    const sinPermiso = await tarjeta('Por jugar');
    expect(within(sinPermiso).getByText('Cadete A – UD Orotava')).toBeInTheDocument();
    expect(within(sinPermiso).queryByRole('link', { name: /Directo|Apuntar/ })).toBeNull();
  });
});

describe('A02 · Inicio', () => {
  it('enseña el partido convocado con el directo y la convocatoria a un toque', async () => {
    api.fetchCalendario.mockResolvedValue([partido({ status: 'called' })]);
    montar('/', ['match.live.write', 'lineup.manage']);

    const proximo = await tarjeta('Próximo evento');

    expect(await within(proximo).findByText('Cadete A – UD Orotava')).toBeInTheDocument();
    expect(api.fetchCalendario).toHaveBeenCalledWith('eq-1', 'temp-1');
    expect(within(proximo).getByText('Convocado')).toBeInTheDocument();
    expect(
      within(proximo).getByRole('link', { name: 'Directo de Cadete A – UD Orotava' }),
    ).toHaveAttribute('href', '/partidos/par-1/directo');
    expect(
      within(proximo).getByRole('link', { name: 'Convocatoria de Cadete A – UD Orotava' }),
    ).toHaveAttribute('href', '/partidos/par-1/convocatoria');
  });

  it('el partido en juego gana al que va antes por fecha', async () => {
    api.fetchCalendario.mockResolvedValue([
      partido({ kickoffAt: new Date(2099, 9, 18, 11, 30).toISOString() }),
      partido({
        id: 'par-2',
        opponentName: 'CD Tacoronte',
        status: 'live',
        kickoffAt: new Date(2099, 9, 25, 11, 30).toISOString(),
      }),
    ]);
    montar('/', ['match.live.write', 'lineup.manage']);

    const proximo = await tarjeta('Próximo evento');

    expect(await within(proximo).findByText('Cadete A – CD Tacoronte')).toBeInTheDocument();
    expect(within(proximo).getByText('En juego')).toBeInTheDocument();
    expect(within(proximo).queryByText('Cadete A – UD Orotava')).toBeNull();
  });

  it('sin nada por jugar, lo dice y no enlaza nada', async () => {
    api.fetchCalendario.mockResolvedValue([partido({ status: 'closed' })]);
    montar('/', ['match.live.write', 'lineup.manage', 'match.close']);

    const proximo = await tarjeta('Próximo evento');

    expect(
      await within(proximo).findByText(/^Todavía no hay partidos por jugar\./),
    ).toBeInTheDocument();
    expect(within(proximo).queryByRole('link')).toBeNull();
  });

  it('si la carga falla, deja reintentar y enseña el partido', async () => {
    api.fetchCalendario.mockRejectedValueOnce(new Error('sin red'));
    api.fetchCalendario.mockResolvedValue([partido({ status: 'called' })]);
    montar('/', ['match.live.write']);

    const proximo = await tarjeta('Próximo evento');

    expect(
      await within(proximo).findByText(
        'No se ha podido cargar el próximo partido. Suele ser falta de cobertura.',
      ),
    ).toBeInTheDocument();

    await userEvent.click(within(proximo).getByRole('button', { name: 'Reintentar' }));

    expect(await within(proximo).findByText('Cadete A – UD Orotava')).toBeInTheDocument();
  });

  it('enseña el próximo entrenamiento debajo del partido, con «Pasar lista» a un toque', async () => {
    api.fetchCalendario.mockResolvedValue([partido({ status: 'called' })]);
    training.fetchEntrenamientos.mockResolvedValue([
      entrenamiento({ id: 'ent-2', scheduledAt: dentroDe(5) }),
      entrenamiento({ scheduledAt: dentroDe(3, 18, 30) }),
    ]);
    montar('/', ['match.live.write', 'training.manage']);

    const proximo = await tarjeta('Próximo evento');
    const titulo = await within(proximo).findByRole('heading', {
      level: 3,
      name: 'Próximo entrenamiento',
    });
    const partidoEnPantalla = within(proximo).getByText('Cadete A – UD Orotava');

    expect(training.fetchEntrenamientos).toHaveBeenCalledWith('eq-1', 'temp-1');
    // Debajo del partido, no encima.
    expect(
      partidoEnPantalla.compareDocumentPosition(titulo) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(within(proximo).getByText(/ · 18:30$/)).toBeInTheDocument();
    expect(within(proximo).queryByText(/^Hoy · /)).toBeNull();
    expect(
      within(proximo).getByText('Campo de Fútbol Izquierdo Rodríguez', { selector: 'p' }),
    ).toBeInTheDocument();
    expect(
      within(proximo).getByRole('link', { name: /^Pasar lista: .+ · 18:30$/ }),
    ).toHaveAttribute('href', '/entrenamientos/ent-1/lista');
    expect(within(proximo).getByRole('link', { name: 'Todos los entrenamientos' })).toHaveAttribute(
      'href',
      '/entrenamientos',
    );
    // El directo sigue a un toque (DOC 02 §3.3).
    expect(
      within(proximo).getByRole('link', { name: 'Directo de Cadete A – UD Orotava' }),
    ).toHaveAttribute('href', '/partidos/par-1/directo');
  });

  it('el entrenamiento de hoy dice «Hoy», y sin training.manage no ofrece pasar lista', async () => {
    api.fetchCalendario.mockResolvedValue([]);
    training.fetchEntrenamientos.mockResolvedValue([
      entrenamiento({ scheduledAt: dentroDe(0, 18, 30), location: null }),
    ]);
    montar('/', []);

    const proximo = await tarjeta('Próximo evento');

    expect(await within(proximo).findByText('Próximo entrenamiento')).toBeInTheDocument();
    expect(within(proximo).getByText('Hoy · 18:30')).toBeInTheDocument();
    expect(within(proximo).queryByRole('link', { name: /Pasar lista/ })).toBeNull();
    expect(within(proximo).getByRole('link', { name: 'Todos los entrenamientos' })).toHaveAttribute(
      'href',
      '/entrenamientos',
    );
  });

  it('sin entrenamientos en siete días, o si su consulta falla, no pinta nada', async () => {
    api.fetchCalendario.mockResolvedValue([partido({ status: 'called' })]);
    training.fetchEntrenamientos.mockResolvedValue([
      entrenamiento({ scheduledAt: dentroDe(10) }),
      entrenamiento({ id: 'ent-ayer', scheduledAt: dentroDe(-1) }),
    ]);
    const primera = montar('/', ['training.manage']);

    const lejos = await tarjeta('Próximo evento');
    await within(lejos).findByText('Cadete A – UD Orotava');
    await entrenamientosResueltos(primera.cliente);

    expect(within(lejos).queryByText('Próximo entrenamiento')).toBeNull();
    expect(within(lejos).queryByRole('link', { name: /entrenamientos/i })).toBeNull();

    cleanup();
    api.fetchCalendario.mockResolvedValue([partido({ status: 'called' })]);
    training.fetchEntrenamientos.mockRejectedValue(new Error('sin red'));
    training.fetchEntrenamientos.mockClear();
    const segunda = montar('/', ['training.manage']);

    const fallo = await tarjeta('Próximo evento');
    await within(fallo).findByText('Cadete A – UD Orotava');
    await entrenamientosResueltos(segunda.cliente);

    expect(within(fallo).queryByText('Próximo entrenamiento')).toBeNull();
    expect(within(fallo).queryByText(/entrenamiento/i)).toBeNull();
  });

  it('con una membresía de seguidor, Inicio tampoco pide los entrenamientos', async () => {
    api.fetchCalendario.mockResolvedValue([partido()]);
    training.fetchEntrenamientos.mockResolvedValue([entrenamiento()]);
    montar('/', [], true);

    const proximo = await tarjeta('Próximo evento');

    expect(await within(proximo).findByText('Cadete A – UD Orotava')).toBeInTheDocument();
    expect(training.fetchEntrenamientos).not.toHaveBeenCalled();
    expect(within(proximo).queryByText('Próximo entrenamiento')).toBeNull();
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
