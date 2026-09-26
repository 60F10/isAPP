// Pantallas A05 y A06 (T-202): camino feliz y fallos.
//
// La red se sustituye en la frontera de `api/` (DOC 06 §11).

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@modules/auth';
import { AnnounceContext } from '@shared/hooks/announceContext';

import { FichaJugadorPage } from './FichaJugadorPage';
import { PlantillaPage } from './PlantillaPage';

import type { Inscripcion } from '../model/plantilla';
import type { AuthState } from '@modules/auth';
import type { Session } from '@supabase/supabase-js';

const api = vi.hoisted(() => ({
  fetchPlantilla: vi.fn(),
  fetchInscripcion: vi.fn(),
  fetchEquipoDePlantilla: vi.fn(),
  crearJugador: vi.fn(),
  actualizarApodo: vi.fn(),
  actualizarInscripcion: vi.fn(),
}));

vi.mock('../api/plantilla', () => api);
vi.mock('@shared/lib/supabase', () => ({ supabase: {} }));

const EQUIPO = { id: 'eq-1', clubId: 'club-1', name: 'Cadete A', kind: 'managed' };

const PLANTILLA: Inscripcion[] = [
  {
    id: 'ins-2',
    playerId: 'jug-2',
    nickname: 'Pipo',
    shirtNumber: 10,
    defaultPosition: 'FW',
    availability: 'unavailable',
  },
  {
    id: 'ins-1',
    playerId: 'jug-1',
    nickname: 'Tito',
    shirtNumber: 1,
    defaultPosition: 'GK',
    availability: 'available',
  },
];

const AUTH: AuthState = {
  session: { user: { id: 'usuario-1' } } as Session,
  cargando: false,
  permisos: new Set(['roster.manage']),
  profile: null,
  teams: [],
  activeTeamId: 'eq-1',
  activeSeasonId: 'temp-1',
  setActiveTeam: () => undefined,
  errorContexto: null,
  reintentarContexto: () => undefined,
};

function montar(ruta: string, auth: AuthState = AUTH) {
  const anunciar = vi.fn();
  const router = createMemoryRouter(
    [
      { path: '/equipos/:id/plantilla', element: <PlantillaPage /> },
      { path: '/jugadores/:id/editar', element: <FichaJugadorPage /> },
    ],
    { initialEntries: [ruta] },
  );

  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AuthContext value={auth}>
        <AnnounceContext value={{ anunciar }}>
          <RouterProvider router={router} />
        </AnnounceContext>
      </AuthContext>
    </QueryClientProvider>,
  );

  return { anunciar };
}

async function tarjeta(titulo: string | RegExp): Promise<HTMLElement> {
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

  api.fetchEquipoDePlantilla.mockResolvedValue(EQUIPO);
  api.fetchPlantilla.mockResolvedValue(PLANTILLA);
});

describe('A05 · Plantilla', () => {
  it('lista por dorsal, con la posición y la no disponibilidad escritas', async () => {
    montar('/equipos/eq-1/plantilla');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Plantilla de Cadete A' }),
    ).toBeInTheDocument();

    const lista = await tarjeta('Jugadores (2)');
    const filas = within(lista).getAllByRole('listitem');

    expect(filas.map((fila) => within(fila).getByText(/Tito|Pipo/).textContent)).toEqual([
      'Tito',
      'Pipo',
    ]);
    expect(within(filas[1] ?? lista).getByText(/No disponible/)).toBeInTheDocument();
    expect(within(filas[0] ?? lista).getByText('Portero')).toBeInTheDocument();
    expect(within(lista).getByRole('link', { name: 'Editar ficha de Pipo' })).toHaveAttribute(
      'href',
      '/jugadores/jug-2/editar?equipo=eq-1',
    );
  });

  it('da de alta un jugador con solo apodo, dorsal y posición', async () => {
    api.crearJugador.mockResolvedValue({ ...PLANTILLA[1], id: 'ins-3', nickname: 'El Rubio' });
    const { anunciar } = montar('/equipos/eq-1/plantilla');

    const alta = await tarjeta('Añadir jugador');
    await userEvent.type(within(alta).getByLabelText(/^Apodo/), ' El  Rubio ');
    await userEvent.type(within(alta).getByLabelText(/^Dorsal/), '7');
    await userEvent.selectOptions(within(alta).getByLabelText('Posición habitual'), 'MF');
    await userEvent.click(within(alta).getByRole('button', { name: 'Añadir jugador' }));

    expect(api.crearJugador).toHaveBeenCalledWith(
      { clubId: 'club-1', equipoId: 'eq-1', temporadaId: 'temp-1', userId: 'usuario-1' },
      { nickname: 'El Rubio', shirt_number: 7, default_position: 'MF' },
    );
    await vi.waitFor(() => {
      expect(anunciar).toHaveBeenCalledWith('El Rubio añadido a la plantilla');
    });
  });

  it('un dorsal repetido se para en la pantalla, sin llamar a la base', async () => {
    montar('/equipos/eq-1/plantilla');

    const alta = await tarjeta('Añadir jugador');
    await userEvent.type(within(alta).getByLabelText(/^Apodo/), 'Nuevo');
    await userEvent.type(within(alta).getByLabelText(/^Dorsal/), '10');
    await userEvent.click(within(alta).getByRole('button', { name: 'Añadir jugador' }));

    expect(within(alta).getByText('Ese dorsal ya lo lleva otro jugador.')).toBeInTheDocument();
    expect(api.crearJugador).not.toHaveBeenCalled();
  });

  it('si la base rechaza el dorsal, lo dice con palabras', async () => {
    api.crearJugador.mockRejectedValue({ code: '23505', message: 'duplicate key' });
    montar('/equipos/eq-1/plantilla');

    const alta = await tarjeta('Añadir jugador');
    await userEvent.type(within(alta).getByLabelText(/^Apodo/), 'Nuevo');
    await userEvent.type(within(alta).getByLabelText(/^Dorsal/), '5');
    await userEvent.click(within(alta).getByRole('button', { name: 'Añadir jugador' }));

    expect(
      await within(alta).findByText('Ese dorsal ya lo lleva otro jugador.'),
    ).toBeInTheDocument();
  });

  it('un rival no tiene plantilla', async () => {
    api.fetchEquipoDePlantilla.mockResolvedValue({
      ...EQUIPO,
      name: 'CD Tacoronte',
      kind: 'reference',
    });
    montar('/equipos/eq-1/plantilla');

    expect(
      await screen.findByText(/CD Tacoronte es un rival: no tiene plantilla/),
    ).toBeInTheDocument();
    expect(api.fetchPlantilla).not.toHaveBeenCalled();
  });

  it('sin temporada en curso lo explica y no pregunta por la plantilla', async () => {
    montar('/equipos/eq-1/plantilla', { ...AUTH, activeSeasonId: null });

    expect(await screen.findByText(/no tiene ninguna temporada en curso/)).toBeInTheDocument();
    expect(api.fetchPlantilla).not.toHaveBeenCalled();
  });
});

describe('A06 · Ficha de jugador', () => {
  it('guarda dorsal, posición y disponibilidad, y el apodo solo si cambia', async () => {
    api.fetchInscripcion.mockResolvedValue(PLANTILLA[1]);
    api.actualizarInscripcion.mockResolvedValue(undefined);
    const { anunciar } = montar('/jugadores/jug-1/editar?equipo=eq-1');

    const datos = await tarjeta('Datos');
    expect(api.fetchInscripcion).toHaveBeenCalledWith('jug-1', 'eq-1', 'temp-1');

    const dorsal = within(datos).getByLabelText(/^Dorsal/);
    await userEvent.clear(dorsal);
    await userEvent.type(dorsal, '13');
    await userEvent.click(within(datos).getByRole('radio', { name: /No disponible/ }));
    await userEvent.click(within(datos).getByRole('button', { name: 'Guardar ficha' }));

    await vi.waitFor(() => {
      expect(anunciar).toHaveBeenCalledWith('Ficha guardada');
    });
    expect(api.actualizarInscripcion).toHaveBeenCalledWith('ins-1', {
      shirt_number: 13,
      default_position: 'GK',
      availability: 'unavailable',
    });
    expect(api.actualizarApodo).not.toHaveBeenCalled();
  });

  it('a un sancionado no se le cambia la disponibilidad desde aquí', async () => {
    api.fetchInscripcion.mockResolvedValue({ ...PLANTILLA[1], availability: 'sanctioned' });
    api.actualizarInscripcion.mockResolvedValue(undefined);
    montar('/jugadores/jug-1/editar?equipo=eq-1');

    const datos = await tarjeta('Datos');
    expect(within(datos).queryByRole('radio')).toBeNull();
    expect(within(datos).getByText('Sancionado.')).toBeInTheDocument();

    await userEvent.click(within(datos).getByRole('button', { name: 'Guardar ficha' }));

    await vi.waitFor(() => {
      expect(api.actualizarInscripcion).toHaveBeenCalledWith('ins-1', {
        shirt_number: 1,
        default_position: 'GK',
      });
    });
  });

  it('la baja pide confirmación y después vuelve a la plantilla', async () => {
    api.fetchInscripcion.mockResolvedValue(PLANTILLA[1]);
    api.actualizarInscripcion.mockResolvedValue(undefined);
    const { anunciar } = montar('/jugadores/jug-1/editar?equipo=eq-1');

    const baja = await tarjeta('Baja');
    await userEvent.click(within(baja).getByRole('button', { name: 'Dar de baja' }));
    expect(api.actualizarInscripcion).not.toHaveBeenCalled();

    await userEvent.click(within(baja).getByRole('button', { name: 'Sí, dar de baja a Tito' }));

    expect(api.actualizarInscripcion).toHaveBeenCalledWith('ins-1', {
      left_on: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Plantilla de Cadete A' }),
    ).toBeInTheDocument();
    expect(anunciar).toHaveBeenCalledWith('Tito dado de baja');
  });
});
