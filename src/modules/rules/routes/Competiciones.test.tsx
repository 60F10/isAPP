// Pantallas A08 (T-203): lista con alta y ficha del reglamento.
//
// La red se sustituye en la frontera de `api/` (DOC 06 §11).

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@modules/auth';
import { AnnounceContext } from '@shared/hooks/announceContext';

import { REGLAMENTO_CADETE } from '../model/competicion';
import { CompeticionesPage } from './CompeticionesPage';
import { CompeticionPage } from './CompeticionPage';

import type { Competicion } from '../model/competicion';
import type { AuthState } from '@modules/auth';
import type { Session } from '@supabase/supabase-js';

const api = vi.hoisted(() => ({
  fetchCompeticiones: vi.fn(),
  fetchCompeticion: vi.fn(),
  crearCompeticion: vi.fn(),
  actualizarCompeticion: vi.fn(),
}));

vi.mock('../api/competiciones', () => api);
vi.mock('@shared/lib/supabase', () => ({ supabase: {} }));

const G2: Competicion = {
  ...REGLAMENTO_CADETE,
  id: 'comp-1',
  clubId: 'club-1',
  seasonId: 'temp-1',
  name: 'Cadete Primera Tenerife G2',
  kind: 'league',
};

const AUTH: AuthState = {
  session: { user: { id: 'usuario-1' } } as Session,
  cargando: false,
  permisos: new Set(['competition.manage']),
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
      permissions: new Set(['competition.manage']),
    },
  ],
  activeTeamId: 'eq-1',
  activeSeasonId: 'temp-1',
  setActiveTeam: () => undefined,
  errorContexto: null,
  reintentarContexto: () => undefined,
};

function montar(ruta: string) {
  const anunciar = vi.fn();
  const router = createMemoryRouter(
    [
      { path: '/competiciones', element: <CompeticionesPage /> },
      { path: '/competiciones/:id', element: <CompeticionPage /> },
    ],
    { initialEntries: [ruta] },
  );

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

async function tarjeta(titulo: string): Promise<HTMLElement> {
  const encabezado = await screen.findByRole('heading', { level: 2, name: titulo });
  const seccion = encabezado.closest('section');

  if (seccion === null) {
    throw new Error('La tarjeta no está en una <section>.');
  }

  return seccion;
}

beforeEach(() => {
  for (const simulada of Object.values(api)) {
    simulada.mockReset();
  }
});

describe('A08 · Competiciones', () => {
  it('lista las de la temporada con su reglamento en una línea', async () => {
    api.fetchCompeticiones.mockResolvedValue([G2]);
    montar('/competiciones');

    const lista = await tarjeta('Esta temporada');

    expect(api.fetchCompeticiones).toHaveBeenCalledWith('club-1', 'temp-1');
    expect(within(lista).getByRole('link', { name: 'Cadete Primera Tenerife G2' })).toHaveAttribute(
      'href',
      '/competiciones/comp-1',
    );
    expect(
      within(lista).getByText(
        'Liga · 2 × 40 min · 5 cambios fijos, sin reentrada · 18 convocados, 11 titulares',
      ),
    ).toBeInTheDocument();
  });

  it('crea la liga con el reglamento del cadete y abre su ficha', async () => {
    api.fetchCompeticiones.mockResolvedValue([]);
    api.crearCompeticion.mockResolvedValue(G2);
    api.fetchCompeticion.mockResolvedValue(G2);
    const { anunciar } = montar('/competiciones');

    const alta = await tarjeta('Crear competición');
    await userEvent.type(within(alta).getByLabelText(/^Nombre/), ' Cadete  Primera Tenerife G2 ');
    await userEvent.click(within(alta).getByRole('button', { name: 'Crear competición' }));

    expect(api.crearCompeticion).toHaveBeenCalledWith(
      { clubId: 'club-1', temporadaId: 'temp-1', userId: 'usuario-1' },
      { ...REGLAMENTO_CADETE, name: 'Cadete Primera Tenerife G2', kind: 'league' },
    );
    expect(anunciar).toHaveBeenCalledWith(
      'Cadete Primera Tenerife G2 creada. Revisa su reglamento',
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Cadete Primera Tenerife G2' }),
    ).toBeInTheDocument();
  });

  it('no deja repetir un nombre de la temporada', async () => {
    api.fetchCompeticiones.mockResolvedValue([G2]);
    montar('/competiciones');

    const alta = await tarjeta('Crear competición');
    await userEvent.type(within(alta).getByLabelText(/^Nombre/), 'cadete primera tenerife g2');
    await userEvent.click(within(alta).getByRole('button', { name: 'Crear competición' }));

    expect(
      within(alta).getByText('Ya hay una competición con ese nombre esta temporada.'),
    ).toBeInTheDocument();
    expect(api.crearCompeticion).not.toHaveBeenCalled();
  });
});

describe('A08 · Reglamento', () => {
  it('calcula la duración de lo escrito y guarda el reglamento', async () => {
    api.fetchCompeticion.mockResolvedValue(G2);
    api.fetchCompeticiones.mockResolvedValue([G2]);
    api.actualizarCompeticion.mockResolvedValue(G2);
    const { anunciar } = montar('/competiciones/comp-1');

    const ficha = await tarjeta('Reglamento');
    expect(within(ficha).getByText('Duración: 80 minutos de juego')).toBeInTheDocument();

    const minutos = within(ficha).getByLabelText(/^Minutos por parte/);
    await userEvent.clear(minutos);
    await userEvent.type(minutos, '35');
    expect(within(ficha).getByText('Duración: 70 minutos de juego')).toBeInTheDocument();

    await userEvent.click(within(ficha).getByRole('checkbox', { name: 'Nota' }));
    await userEvent.click(within(ficha).getByRole('button', { name: 'Guardar reglamento' }));

    expect(api.actualizarCompeticion).toHaveBeenCalledWith('comp-1', {
      ...REGLAMENTO_CADETE,
      name: 'Cadete Primera Tenerife G2',
      kind: 'league',
      period_minutes: 35,
      enabled_event_types: REGLAMENTO_CADETE.enabled_event_types.filter((tipo) => tipo !== 'note'),
    });
    await vi.waitFor(() => {
      expect(anunciar).toHaveBeenCalledWith('Reglamento guardado');
    });
  });

  it('un valor fuera de rango se para junto a su campo', async () => {
    api.fetchCompeticion.mockResolvedValue(G2);
    api.fetchCompeticiones.mockResolvedValue([G2]);
    montar('/competiciones/comp-1');

    const ficha = await tarjeta('Reglamento');
    const minutos = within(ficha).getByLabelText(/^Minutos por parte/);
    await userEvent.clear(minutos);
    await userEvent.type(minutos, '90');
    await userEvent.click(within(ficha).getByRole('button', { name: 'Guardar reglamento' }));

    expect(within(ficha).getByText('Entre 10 y 60.')).toBeInTheDocument();
    expect(api.actualizarCompeticion).not.toHaveBeenCalled();
  });

  it('solo ofrece los once botones del MVP y conserva los otros si ya estaban', async () => {
    const conPases = { ...G2, enabled_event_types: [...G2.enabled_event_types, 'pass' as const] };
    api.fetchCompeticion.mockResolvedValue(conPases);
    api.fetchCompeticiones.mockResolvedValue([conPases]);
    api.actualizarCompeticion.mockResolvedValue(conPases);
    montar('/competiciones/comp-1');

    const ficha = await tarjeta('Reglamento');
    expect(within(ficha).getAllByRole('checkbox')).toHaveLength(11);
    expect(within(ficha).queryByRole('checkbox', { name: 'Pase' })).toBeNull();

    await userEvent.click(within(ficha).getByRole('button', { name: 'Guardar reglamento' }));

    expect(api.actualizarCompeticion).toHaveBeenCalledWith(
      'comp-1',
      expect.objectContaining({ enabled_event_types: expect.arrayContaining(['pass', 'goal']) }),
    );
  });
});
