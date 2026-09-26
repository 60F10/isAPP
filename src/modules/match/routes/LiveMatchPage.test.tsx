// Pantalla A12, esqueleto (T-207): carga de local, controles del partido,
// confirmaciones, marca de partido en curso y salida con cola.
//
// IndexedDB y la cola se sustituyen en la frontera de `api/directo` y de
// `@modules/sync`.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@modules/auth';
import { AnnounceContext } from '@shared/hooks/announceContext';
import { leerPartidoEnCurso } from '@shared/lib/partidoEnCurso';

import { desdePaquete } from '../model/directo';
import { LiveMatchPage } from './LiveMatchPage';

import type { DirectoCargado } from '../api/directo';
import type { EstadoDirecto } from '../model/directo';
import type { PaqueteDePartido } from '../model/paquete';
import type { AuthState } from '@modules/auth';
import type { Session } from '@supabase/supabase-js';

const api = vi.hoisted(() => ({
  cargarDirecto: vi.fn(),
  aplicarTransicion: vi.fn(),
  SIN_PRECARGA: 'SIN_PRECARGA',
}));
const sync = vi.hoisted(() => ({ contarPendientes: vi.fn() }));

vi.mock('../api/directo', () => api);
vi.mock('@modules/sync', () => sync);
vi.mock('@shared/lib/supabase', () => ({ supabase: {} }));

const PAQUETE: PaqueteDePartido = {
  partido: {
    id: 'par-1',
    teamId: 'eq-1',
    competitionId: 'comp-1',
    opponentName: 'At. Tacoronte',
    isHome: false,
    kickoffAt: '2026-10-04T11:00:00Z',
    venue: null,
    status: 'called',
    isRetroactive: false,
  },
  reglamento: {
    periods_count: 2,
    period_minutes: 40,
    halftime_minutes: 15,
    clock_mode: 'running',
    substitution_type: 'fixed',
    substitutions_max: 5,
    squad_max: 18,
    players_on_pitch: 2,
    yellow_cards_for_ban: 5,
    red_card_default_bans: 1,
    enabled_event_types: ['goal'],
  },
  convocatoria: [
    { playerId: 'p7', nickname: 'Juanito', callStatus: 'starter', shirtNumber: 7, position: null },
    { playerId: 'p1', nickname: 'Pepe', callStatus: 'starter', shirtNumber: 1, position: 'GK' },
    { playerId: 'p8', nickname: 'Luis', callStatus: 'substitute', shirtNumber: 8, position: null },
    { playerId: 'p9', nickname: 'Nico', callStatus: 'not_called', shirtNumber: 9, position: null },
  ],
  partes: [],
  eventos: [{ event_type: 'goal', is_opponent: false, status: 'pending' }],
};

function cargado(estado: Partial<EstadoDirecto> = {}, refrescado = true): DirectoCargado {
  return {
    paquete: PAQUETE,
    estado: { ...desdePaquete(PAQUETE), ...estado },
    descargadoEn: 1,
    refrescado,
  };
}

function auth(): AuthState {
  return {
    session: { user: { id: 'usuario-1' } } as Session,
    cargando: false,
    permisos: new Set(['match.live.write']),
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
        permissions: new Set(['match.live.write']),
      },
    ],
    activeTeamId: 'eq-1',
    activeSeasonId: 'temp-1',
    setActiveTeam: () => undefined,
    errorContexto: null,
    reintentarContexto: () => undefined,
  };
}

function montar() {
  const anunciar = vi.fn();
  const router = createMemoryRouter(
    [
      { path: '/partidos/:id/directo', element: <LiveMatchPage /> },
      { path: '/partidos/:id/convocatoria', element: <p>Convocatoria</p> },
      { path: '/calendario', element: <p>Calendario</p> },
    ],
    { initialEntries: ['/partidos/par-1/directo'] },
  );

  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthContext value={auth()}>
        <AnnounceContext value={{ anunciar }}>
          <RouterProvider router={router} />
        </AnnounceContext>
      </AuthContext>
    </QueryClientProvider>,
  );

  return { anunciar };
}

beforeEach(() => {
  api.cargarDirecto.mockReset();
  api.aplicarTransicion.mockReset();
  api.aplicarTransicion.mockResolvedValue(undefined);
  sync.contarPendientes.mockReset();
  sync.contarPendientes.mockResolvedValue(0);
});

afterEach(() => {
  window.localStorage.clear();
});

describe('A12 · Directo, esqueleto', () => {
  it('abre de lo guardado: reloj a cero, marcador con el local delante, campo y banquillo', async () => {
    api.cargarDirecto.mockResolvedValue(cargado());
    montar();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'At. Tacoronte – Cadete A' }),
    ).toBeInTheDocument();
    expect(api.cargarDirecto).toHaveBeenCalledWith('par-1');
    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(screen.getByText('Sin empezar')).toBeInTheDocument();
    expect(screen.getByText('0 – 1')).toBeInTheDocument();
    expect(screen.getByText('Incluye 1 gol sin aprobar.')).toBeInTheDocument();

    const campo = screen.getByRole('region', { name: 'En el campo (2)' });
    expect(
      within(campo)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['1 · Pepe', '7 · Juanito']);
    expect(
      within(screen.getByRole('region', { name: 'Banquillo (1)' })).getByText('8 · Luis'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Nico/)).toBeNull();
  });

  it('empezar la parte la guarda con sus filas, la anuncia y marca el partido en curso', async () => {
    api.cargarDirecto.mockResolvedValue(cargado());
    const { anunciar } = montar();

    await userEvent.click(await screen.findByRole('button', { name: 'Empezar la 1ª parte' }));

    expect(await screen.findByText(/1ª parte · minuto/)).toBeInTheDocument();
    const [estado, trabajos] = api.aplicarTransicion.mock.calls[0] as [
      EstadoDirecto,
      { entity: string }[],
    ];
    expect(estado.fase).toBe('en_juego');
    expect(trabajos.map((t) => t.entity)).toEqual(['match', 'match_period']);
    expect(anunciar).toHaveBeenCalledWith('1ª parte en juego');
    expect(leerPartidoEnCurso(Date.now())).toBe('par-1');
    expect(screen.getByText(/no puede mantener la pantalla encendida/)).toBeInTheDocument();
  });

  it('si no se puede guardar en el dispositivo, no cambia nada y lo dice', async () => {
    api.cargarDirecto.mockResolvedValue(cargado());
    api.aplicarTransicion.mockRejectedValue(new Error('QuotaExceededError'));
    montar();

    await userEvent.click(await screen.findByRole('button', { name: 'Empezar la 1ª parte' }));

    expect(
      await screen.findByText(/No se ha podido guardar en este dispositivo/),
    ).toBeInTheDocument();
    expect(screen.getByText('Sin empezar')).toBeInTheDocument();
    expect(leerPartidoEnCurso(Date.now())).toBeNull();
  });

  it('terminar la parte pide confirmación en el mismo sitio, con el foco en la pregunta', async () => {
    const inicio = Date.now() - 60_000;
    api.cargarDirecto.mockResolvedValue(
      cargado({
        fase: 'en_juego',
        partes: [
          {
            id: 'parte-1',
            numero: 1,
            inicio,
            pausadoMs: 0,
            pausaDesde: null,
            segundosReales: null,
          },
        ],
      }),
    );
    montar();

    await userEvent.click(await screen.findByRole('button', { name: 'Terminar la 1ª parte' }));

    expect(screen.getByText(/¿Terminar la 1ª parte en el/)).toHaveFocus();

    await userEvent.click(screen.getByRole('button', { name: 'Seguir jugando' }));

    expect(api.aplicarTransicion).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Pausar el reloj' })).toHaveFocus();

    await userEvent.click(screen.getByRole('button', { name: 'Terminar la 1ª parte' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sí, terminar la parte' }));

    expect(await screen.findByText('Descanso')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Empezar la 2ª parte' })).toBeInTheDocument();
  });

  it('sin los titulares exactos no deja empezar y lleva a la convocatoria', async () => {
    api.cargarDirecto.mockResolvedValue(cargado({ enCampo: ['p1'] }));
    montar();

    expect(await screen.findByRole('button', { name: 'Empezar la 1ª parte' })).toBeDisabled();
    expect(
      screen.getByText(/Tienen que salir 2 titulares y la convocatoria tiene 1/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Revisa la convocatoria' })).toHaveAttribute(
      'href',
      '/partidos/par-1/convocatoria',
    );
  });

  it('con las partes jugadas ofrece finalizar, y al finalizar quita la marca', async () => {
    window.localStorage.setItem(
      'sasi.partido-en-curso',
      JSON.stringify({ partidoId: 'par-1', desde: Date.now() }),
    );
    const cerrada = { pausadoMs: 0, pausaDesde: null, segundosReales: 2_400, inicio: 0 };
    api.cargarDirecto.mockResolvedValue(
      cargado({
        fase: 'descanso',
        partes: [
          { id: 'a', numero: 1, ...cerrada },
          { id: 'b', numero: 2, ...cerrada },
        ],
      }),
    );
    montar();

    await userEvent.click(await screen.findByRole('button', { name: 'Finalizar el partido' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sí, finalizar' }));

    expect(await screen.findByText(/El partido ha terminado/)).toBeInTheDocument();
    expect(leerPartidoEnCurso(Date.now())).toBeNull();
  });

  it('sin precarga y sin cobertura lo dice, en vez de una pantalla en blanco', async () => {
    api.cargarDirecto.mockRejectedValue(new Error('SIN_PRECARGA'));
    montar();

    expect(
      await screen.findByText(/no está preparado para jugar sin conexión/),
    ).toBeInTheDocument();
  });

  it('sin cobertura avisa de que sale de lo guardado', async () => {
    api.cargarDirecto.mockResolvedValue(cargado({}, false));
    montar();

    expect(await screen.findByText(/el partido sale de lo guardado/)).toBeInTheDocument();
  });

  it('salir con anotaciones sin enviar lo dice antes; sin ellas, sale', async () => {
    api.cargarDirecto.mockResolvedValue(cargado());
    sync.contarPendientes.mockResolvedValue(2);
    montar();

    await userEvent.click(await screen.findByRole('button', { name: 'Salir del directo' }));

    expect(await screen.findByText(/Hay 2 anotaciones sin enviar/)).toHaveFocus();

    await userEvent.click(screen.getByRole('button', { name: 'Seguir en el directo' }));

    expect(screen.getByRole('button', { name: 'Salir del directo' })).toHaveFocus();

    await userEvent.click(screen.getByRole('button', { name: 'Salir del directo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salir igualmente' }));

    expect(await screen.findByText('Calendario')).toBeInTheDocument();
  });
});
