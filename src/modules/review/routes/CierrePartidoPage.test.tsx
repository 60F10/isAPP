// Pantalla A13 (T-210a): cierre y reapertura del partido.
//
// La red se sustituye en la frontera de `api/cierre` y `api/local` (DOC 06
// §11). `@modules/match` se sustituye entero: su barrel arrastra las rutas
// del directo y, con ellas, Dexie (D06-26), y aquí solo hace falta
// `describirEvento`.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@modules/auth';
import { AnnounceContext } from '@shared/hooks/announceContext';

import { CierrePartidoPage } from './CierrePartidoPage';

import type { DatosDelCierre } from '../model/cierre';
import type { AppPermission, AuthState } from '@modules/auth';
import type { Session } from '@supabase/supabase-js';

const api = vi.hoisted(() => ({
  fetchCierre: vi.fn(),
  cerrarPartido: vi.fn(),
  reabrirPartido: vi.fn(),
  guardarOrigen: vi.fn(),
  CON_PENDIENTES: 'CON_PENDIENTES',
  PARTIDO_CAMBIADO: 'PARTIDO_CAMBIADO',
}));
const local = vi.hoisted(() => ({
  leerColaDelPartido: vi.fn(),
  enviarAhora: vi.fn(),
  limpiarPartido: vi.fn(),
}));
const match = vi.hoisted(() => ({
  describirEvento: vi.fn(() => 'Evento de prueba'),
}));

vi.mock('../api/cierre', () => api);
vi.mock('../api/local', () => local);
vi.mock('@modules/match', () => match);
vi.mock('@shared/lib/supabase', () => ({ supabase: {} }));

const PARTIDO_BASE: DatosDelCierre['partido'] = {
  id: 'par-1',
  teamId: 'eq-1',
  opponentName: 'UD Orotava',
  competitionName: 'Cadete Primera Tenerife G2',
  isHome: true,
  kickoffAt: new Date(2026, 9, 3, 12, 0).toISOString(),
  status: 'finished',
  isRetroactive: false,
  periodos: 2,
  minutosDeParte: 25,
  suspendidoEnParte: null,
  suspendidoEnSegundo: null,
  actaAFavor: null,
  actaEnContra: null,
  cerradoEn: null,
};

function datos(
  opciones: {
    partido?: Partial<DatosDelCierre['partido']>;
    eventos?: DatosDelCierre['eventos'];
    calculado?: DatosDelCierre['calculado'];
  } = {},
): DatosDelCierre {
  return {
    partido: { ...PARTIDO_BASE, ...opciones.partido },
    convocatoria: [],
    eventos: opciones.eventos ?? [],
    partes: [],
    calculado: opciones.calculado ?? { aFavor: 1, enContra: 1 },
  };
}

function auth(permisos: AppPermission[]): AuthState {
  return {
    session: { user: { id: 'usuario-1' } } as Session,
    cargando: false,
    permisos: new Set(permisos),
    profile: null,
    teams: [],
    activeTeamId: 'eq-1',
    activeSeasonId: 'temp-1',
    setActiveTeam: () => undefined,
    errorContexto: null,
    reintentarContexto: () => undefined,
  };
}

function montar(permisos: AppPermission[] = ['match.live.write', 'event.approve']) {
  const anunciar = vi.fn();
  const router = createMemoryRouter(
    [
      { path: '/partidos/:id/cierre', element: <CierrePartidoPage /> },
      { path: '/calendario', element: <p>Calendario</p> },
    ],
    { initialEntries: ['/partidos/par-1/cierre'] },
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

beforeEach(() => {
  api.fetchCierre.mockReset();
  api.cerrarPartido.mockReset();
  api.reabrirPartido.mockReset();
  api.guardarOrigen.mockReset();
  local.leerColaDelPartido.mockReset();
  local.enviarAhora.mockReset();
  local.limpiarPartido.mockReset();
  match.describirEvento.mockReset();

  match.describirEvento.mockReturnValue('Evento de prueba');
  local.leerColaDelPartido.mockResolvedValue({ sinEnviar: 0, rechazados: 0 });
});

describe('A13 · Cierre del partido', () => {
  it('con un evento pendiente, se ve y no se puede cerrar', async () => {
    api.fetchCierre.mockResolvedValue(
      datos({
        eventos: [
          {
            clientEventId: 'evt-1',
            tipo: 'goal',
            periodo: 1,
            segundos: 600,
            rival: false,
            jugador: null,
            segundo: null,
            detalles: {},
            estado: 'pending',
            propio: false,
          },
        ],
      }),
    );
    montar();

    expect(await screen.findByText('Evento de prueba')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Queda 1 evento pendiente de revisar.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cerrar el partido' })).toBeNull();
  });

  it('sin pendientes, si el acta no coincide avisa y cierra con lo escrito', async () => {
    api.fetchCierre.mockResolvedValue(datos());
    api.cerrarPartido.mockResolvedValue(0);
    local.limpiarPartido.mockResolvedValue(undefined);
    montar();

    const aFavor = await screen.findByLabelText(/^Goles a favor/);
    await userEvent.clear(aFavor);
    await userEvent.type(aFavor, '2');

    expect(
      await screen.findByText(
        'El acta (2 - 1) no coincide con lo calculado (1 - 1). Se puede cerrar igual.',
      ),
    ).toBeInTheDocument();

    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar el partido' }));
    expect(await screen.findByText('¿Cerrar el partido con 2 - 1 en el acta?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sí, cerrar el partido' }));

    expect(api.cerrarPartido).toHaveBeenCalledWith(
      expect.objectContaining({ acta: { aFavor: 2, enContra: 1 } }),
    );
  });

  it('con el acta vacía no se cierra ni se pregunta', async () => {
    api.fetchCierre.mockResolvedValue(datos());
    montar();

    const aFavor = await screen.findByLabelText(/^Goles a favor/);
    await userEvent.clear(aFavor);
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar el partido' }));

    expect(await screen.findByText('Escribe un número entre 0 y 99.')).toBeInTheDocument();
    expect(screen.queryByText(/¿Cerrar el partido/)).toBeNull();
    expect(api.cerrarPartido).not.toHaveBeenCalled();
  });

  it('un partido cerrado se reabre', async () => {
    api.fetchCierre.mockResolvedValue(
      datos({
        partido: {
          status: 'closed',
          actaAFavor: 2,
          actaEnContra: 1,
          cerradoEn: new Date(2026, 9, 3, 14, 0).toISOString(),
        },
        calculado: { aFavor: 2, enContra: 1 },
      }),
    );
    api.reabrirPartido.mockResolvedValue(undefined);
    montar();

    await userEvent.click(await screen.findByRole('button', { name: 'Reabrir el partido' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sí, reabrir el partido' }));

    expect(api.reabrirPartido).toHaveBeenCalledWith(expect.objectContaining({ id: 'par-1' }));
  });

  it('un partido programado todavía no se puede cerrar', async () => {
    api.fetchCierre.mockResolvedValue(datos({ partido: { status: 'scheduled' } }));
    montar();

    expect(await screen.findByText('El partido todavía no se ha jugado.')).toBeInTheDocument();
  });
});
