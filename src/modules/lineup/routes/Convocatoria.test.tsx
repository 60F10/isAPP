// Pantalla A11 (T-205): convocatoria y alineación inicial.
//
// La red se sustituye en la frontera de `api/` (DOC 06 §11): la de `lineup` y
// también la de `agenda`, `core` y `rules`, de donde salen el partido, la
// plantilla y el reglamento.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@modules/auth';
import { AnnounceContext } from '@shared/hooks/announceContext';

import { ConvocatoriaPage } from './ConvocatoriaPage';

import type { LineaGuardada } from '../model/convocatoria';
import type { Partido } from '@modules/agenda';
import type { AuthState } from '@modules/auth';
import type { Inscripcion } from '@modules/core';
import type { Session } from '@supabase/supabase-js';

const api = vi.hoisted(() => ({ fetchConvocatoria: vi.fn(), guardarConvocatoria: vi.fn() }));
const agenda = vi.hoisted(() => ({
  fetchCalendario: vi.fn(),
  fetchPartido: vi.fn(),
  crearPartido: vi.fn(),
  actualizarPartido: vi.fn(),
  borrarPartido: vi.fn(),
  marcarComoConvocado: vi.fn(),
}));
const core = vi.hoisted(() => ({ fetchPlantilla: vi.fn() }));
const rules = vi.hoisted(() => ({ fetchCompeticion: vi.fn() }));

vi.mock('../api/convocatoria', () => api);
vi.mock('@modules/agenda/api/partidos', () => agenda);
vi.mock('@modules/core/api/plantilla', () => core);
vi.mock('@modules/rules/api/competiciones', () => rules);
vi.mock('@shared/lib/supabase', () => ({ supabase: {} }));

/** Reglamento corto para que las pruebas no tengan que marcar once titulares. */
const COMPETICION = {
  id: 'comp-1',
  name: 'Cadete Primera Tenerife G2',
  players_on_pitch: 2,
  squad_max: 3,
};

function inscripcion(cambios: Partial<Inscripcion> & { playerId: string }): Inscripcion {
  return {
    id: `ins-${cambios.playerId}`,
    nickname: cambios.playerId,
    shirtNumber: null,
    defaultPosition: null,
    availability: 'available',
    ...cambios,
  };
}

const PLANTILLA = [
  inscripcion({ playerId: 'p1', nickname: 'Pepe', shirtNumber: 1, defaultPosition: 'GK' }),
  inscripcion({
    playerId: 'p5',
    nickname: 'Castigado',
    shirtNumber: 5,
    availability: 'sanctioned',
  }),
  inscripcion({ playerId: 'p7', nickname: 'Juanito', shirtNumber: 7, defaultPosition: 'FW' }),
  inscripcion({ playerId: 'p8', nickname: 'Luis', shirtNumber: 8 }),
  inscripcion({ playerId: 'p9', nickname: 'Nico', availability: 'unavailable' }),
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
    venue: null,
    status: 'scheduled',
    isRetroactive: false,
    ...cambios,
  };
}

function auth(): AuthState {
  return {
    session: { user: { id: 'usuario-1' } } as Session,
    cargando: false,
    permisos: new Set(['lineup.manage']),
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
        permissions: new Set(['lineup.manage']),
      },
    ],
    activeTeamId: 'eq-1',
    activeSeasonId: 'temp-1',
    setActiveTeam: () => undefined,
    errorContexto: null,
    reintentarContexto: () => undefined,
  };
}

function montar(props: Parameters<typeof ConvocatoriaPage>[0] = {}) {
  const anunciar = vi.fn();
  const router = createMemoryRouter(
    [
      { path: '/partidos/:id/convocatoria', element: <ConvocatoriaPage {...props} /> },
      { path: '/calendario', element: <p>Calendario</p> },
    ],
    { initialEntries: ['/partidos/par-1/convocatoria'] },
  );

  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AuthContext value={auth()}>
        <AnnounceContext value={{ anunciar }}>
          <RouterProvider router={router} />
        </AnnounceContext>
      </AuthContext>
    </QueryClientProvider>,
  );

  return { anunciar };
}

/** El grupo de opciones de un jugador, por su leyenda. */
async function jugador(leyenda: string): Promise<HTMLElement> {
  return screen.findByRole('group', { name: leyenda });
}

async function elegir(leyenda: string, opcion: 'Titular' | 'Suplente' | 'No convocado') {
  await userEvent.click(within(await jugador(leyenda)).getByRole('radio', { name: opcion }));
}

beforeEach(() => {
  for (const simulada of [
    ...Object.values(api),
    ...Object.values(agenda),
    core.fetchPlantilla,
    rules.fetchCompeticion,
  ]) {
    simulada.mockReset();
  }

  agenda.fetchPartido.mockResolvedValue(partido());
  agenda.marcarComoConvocado.mockResolvedValue(undefined);
  core.fetchPlantilla.mockResolvedValue(PLANTILLA);
  rules.fetchCompeticion.mockResolvedValue(COMPETICION);
  api.fetchConvocatoria.mockResolvedValue([]);
  api.guardarConvocatoria.mockResolvedValue(undefined);
});

describe('A11 · Convocatoria', () => {
  it('pinta toda la plantilla sin convocar, y a quien no está disponible con el motivo y sin opciones', async () => {
    montar();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Convocatoria: Cadete A – UD Orotava' }),
    ).toBeInTheDocument();
    expect(core.fetchPlantilla).toHaveBeenCalledWith('eq-1', 'temp-1');
    expect(rules.fetchCompeticion).toHaveBeenCalledWith('comp-1');

    for (const leyenda of ['1 · Pepe', '7 · Juanito', '8 · Luis']) {
      expect(
        within(await jugador(leyenda)).getByRole('radio', { name: 'No convocado' }),
      ).toBeChecked();
    }

    expect(screen.getByText('Sancionado: no se puede convocar.')).toBeInTheDocument();
    expect(screen.getByText('No disponible: no se puede convocar.')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /Castigado/ })).toBeNull();
    expect(screen.getAllByText(/Titulares: 0 de 2/)).toHaveLength(2);
  });

  it('convoca, propone el dorsal y la posición de la inscripción, guarda y pasa el partido a convocado', async () => {
    const { anunciar } = montar();

    await elegir('1 · Pepe', 'Titular');
    await elegir('7 · Juanito', 'Titular');
    await elegir('8 · Luis', 'Suplente');

    expect(screen.getByLabelText('Dorsal de Juanito')).toHaveValue('7');
    expect(screen.getByLabelText('Posición de Juanito')).toHaveValue('FW');

    // El dorsal cambia solo para este partido (L-05).
    await userEvent.clear(screen.getByLabelText('Dorsal de Luis'));
    await userEvent.type(screen.getByLabelText('Dorsal de Luis'), '14');
    expect(screen.getAllByText(/Titulares: 2 de 2 · Suplentes: 1/)).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: 'Guardar convocatoria' }));

    expect(await screen.findByText('Calendario')).toBeInTheDocument();
    expect(api.guardarConvocatoria).toHaveBeenCalledWith('par-1', 'usuario-1', [
      { player_id: 'p1', call_status: 'starter', shirt_number: 1, position: 'GK' },
      { player_id: 'p5', call_status: 'not_called', shirt_number: null, position: null },
      { player_id: 'p7', call_status: 'starter', shirt_number: 7, position: 'FW' },
      { player_id: 'p8', call_status: 'substitute', shirt_number: 14, position: null },
      { player_id: 'p9', call_status: 'not_called', shirt_number: null, position: null },
    ]);
    expect(agenda.marcarComoConvocado).toHaveBeenCalledWith('par-1');
    expect(anunciar).toHaveBeenCalledWith('Convocatoria guardada');
  });

  it('no guarda con los titulares de menos (L-03)', async () => {
    const { anunciar } = montar();

    await elegir('1 · Pepe', 'Titular');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar convocatoria' }));

    expect(screen.getByText('Tienen que ser 2 titulares y hay 1.')).toBeInTheDocument();
    expect(anunciar).toHaveBeenCalledWith('Tienen que ser 2 titulares y hay 1.');
    expect(api.guardarConvocatoria).not.toHaveBeenCalled();
  });

  it('no deja pasar del máximo de convocados (R-01)', async () => {
    rules.fetchCompeticion.mockResolvedValue({ ...COMPETICION, squad_max: 2 });
    montar();

    await elegir('1 · Pepe', 'Titular');
    await elegir('7 · Juanito', 'Titular');
    await elegir('8 · Luis', 'Suplente');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar convocatoria' }));

    expect(screen.getByText('Como mucho 2 convocados y hay 3.')).toBeInTheDocument();
    expect(api.guardarConvocatoria).not.toHaveBeenCalled();
  });

  it('marca el dorsal repetido junto a su campo y no guarda', async () => {
    montar();

    await elegir('1 · Pepe', 'Titular');
    await elegir('7 · Juanito', 'Titular');
    await userEvent.clear(screen.getByLabelText('Dorsal de Juanito'));
    await userEvent.type(screen.getByLabelText('Dorsal de Juanito'), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar convocatoria' }));

    expect(screen.getByLabelText('Dorsal de Juanito')).toHaveAccessibleDescription(
      'El 1 lo lleva también Pepe.',
    );
    expect(api.guardarConvocatoria).not.toHaveBeenCalled();
  });

  it('recupera lo guardado y avisa de quien estaba convocado y ya no se puede', async () => {
    const guardada: LineaGuardada[] = [
      { playerId: 'p1', nickname: 'Pepe', callStatus: 'starter', shirtNumber: 13, position: 'DF' },
      {
        playerId: 'p5',
        nickname: 'Castigado',
        callStatus: 'substitute',
        shirtNumber: 5,
        position: null,
      },
    ];
    api.fetchConvocatoria.mockResolvedValue(guardada);
    montar();

    expect(
      within(await jugador('13 · Pepe')).getByRole('radio', { name: 'Titular' }),
    ).toBeChecked();
    expect(screen.getByLabelText('Posición de Pepe')).toHaveValue('DF');
    expect(screen.getByText('Estaba convocado: se quita al guardar.')).toBeInTheDocument();
  });

  it('guarda aunque el partido no pueda pasar a convocado, y lo dice', async () => {
    agenda.marcarComoConvocado.mockRejectedValue(new Error('SIN_FILAS'));
    const { anunciar } = montar();

    await elegir('1 · Pepe', 'Titular');
    await elegir('7 · Juanito', 'Titular');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar convocatoria' }));

    expect(
      await screen.findByText(
        /El partido no ha pasado a «Convocado»: o ya ha empezado, o no tienes/,
      ),
    ).toBeInTheDocument();
    expect(api.guardarConvocatoria).toHaveBeenCalledTimes(1);
    expect(anunciar).toHaveBeenCalledWith(
      'Convocatoria guardada, pero el partido no ha pasado a convocado',
    );
  });

  it('cuenta el fallo al guardar sin salir de la pantalla', async () => {
    api.guardarConvocatoria.mockRejectedValue(new TypeError('Failed to fetch'));
    montar();

    await elegir('1 · Pepe', 'Titular');
    await elegir('7 · Juanito', 'Titular');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar convocatoria' }));

    expect(await screen.findByText(/No hay conexión. No se ha guardado nada/)).toBeInTheDocument();
    expect(agenda.marcarComoConvocado).not.toHaveBeenCalled();
  });

  it('con el partido empezado enseña la convocatoria y no deja cambiarla (L-08)', async () => {
    agenda.fetchPartido.mockResolvedValue(partido({ status: 'live' }));
    api.fetchConvocatoria.mockResolvedValue([
      { playerId: 'p1', nickname: 'Pepe', callStatus: 'starter', shirtNumber: 1, position: 'GK' },
      {
        playerId: 'p8',
        nickname: 'Luis',
        callStatus: 'substitute',
        shirtNumber: 8,
        position: null,
      },
    ]);
    montar();

    expect(await screen.findByText(/la convocatoria ya no se cambia/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Titulares (1)' })).toBeInTheDocument();
    expect(screen.getByText('1 · Pepe · Portero')).toBeInTheDocument();
    expect(screen.getByText('8 · Luis')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar convocatoria' })).toBeNull();
    expect(screen.queryByRole('radio')).toBeNull();
  });

  it('con la plantilla vacía, lleva a darla de alta', async () => {
    core.fetchPlantilla.mockResolvedValue([]);
    montar();

    expect(await screen.findByRole('link', { name: 'Da de alta a los jugadores' })).toHaveAttribute(
      'href',
      '/equipos/eq-1/plantilla',
    );
  });

  it('enseña el aviso que le pasan y avisa al guardar (enganches de la T-206)', async () => {
    const alGuardar = vi.fn();
    montar({ aviso: <p>Partido listo para usar sin conexión</p>, alGuardar });

    expect(await screen.findByText('Partido listo para usar sin conexión')).toBeInTheDocument();

    await elegir('1 · Pepe', 'Titular');
    await elegir('7 · Juanito', 'Titular');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar convocatoria' }));

    expect(await screen.findByText('Calendario')).toBeInTheDocument();
    expect(alGuardar).toHaveBeenCalledTimes(1);
  });
});
