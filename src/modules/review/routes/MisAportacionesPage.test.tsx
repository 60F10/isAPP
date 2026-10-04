// Pantalla A14 (T-211): lo que ha apuntado uno mismo, con corregir y borrar.
//
// La red se sustituye en la frontera de `api/aportaciones` y
// `api/discordancias` (DOC 06 §11). `@modules/match` se sustituye entero, como
// en la prueba de la A13: su barril arrastra las rutas del directo y, con
// ellas, Dexie (D06-26). `describirEvento` es de mentira —«Evento» y el `id`—
// y las dos funciones del reloj que validan el minuto entran de verdad.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@modules/auth';
import { AnnounceContext } from '@shared/hooks/announceContext';

import { MisAportacionesPage } from './MisAportacionesPage';

import type {
  Aportacion,
  DatosDeAportaciones,
  PartidoConAportaciones,
} from '../model/aportaciones';
import type { AppPermission, AuthState } from '@modules/auth';
import type { Session } from '@supabase/supabase-js';

const api = vi.hoisted(() => ({
  fetchAportaciones: vi.fn(),
  cambiarJugador: vi.fn(),
  cambiarSegundo: vi.fn(),
  borrarEvento: vi.fn(),
}));
const discordancias = vi.hoisted(() => ({
  cambiarMinuto: vi.fn(),
}));
const match = vi.hoisted(() => ({
  describirEvento: vi.fn(),
}));

vi.mock('../api/aportaciones', () => api);
vi.mock('../api/discordancias', () => discordancias);
vi.mock('@modules/match', async () => {
  const reloj = await vi.importActual<typeof import('@modules/match/model/reloj')>(
    '@modules/match/model/reloj',
  );

  return {
    ...match,
    segundosDeMinuto: reloj.segundosDeMinuto,
    rangoDeParte: reloj.rangoDeParte,
  };
});
vi.mock('@shared/lib/supabase', () => ({ supabase: {} }));

const CONVOCATORIA: PartidoConAportaciones['convocatoria'] = [
  { playerId: 'jug-7', nickname: 'Chicho', shirtNumber: 7, convocado: true },
  { playerId: 'jug-9', nickname: 'Yeray', shirtNumber: 9, convocado: true },
  { playerId: 'jug-10', nickname: 'Nauzet', shirtNumber: 10, convocado: true },
  { playerId: 'jug-4', nickname: 'Ayoze', shirtNumber: 4, convocado: false },
];

function partido(
  cambios: Partial<PartidoConAportaciones> & { id: string },
): PartidoConAportaciones {
  return {
    opponentName: 'UD Orotava',
    kickoffAt: new Date(2026, 9, 3, 12, 0).toISOString(),
    status: 'finished',
    periodos: 2,
    minutosDeParte: 40,
    convocatoria: CONVOCATORIA,
    ...cambios,
  };
}

function evento(cambios: Partial<Aportacion> & { id: string }): Aportacion {
  return {
    clientEventId: `cliente-${cambios.id}`,
    partidoId: 'par-1',
    tipo: 'goal',
    periodo: 1,
    segundos: 600,
    rival: false,
    jugador: 'jug-7',
    segundo: 'jug-9',
    detalles: {},
    estado: 'pending',
    propio: false,
    ...cambios,
  };
}

/** `fetchAportaciones` devuelve siempre lo mismo: la pantalla lo vuelve a pedir tras cada cambio. */
function servidor(datos: DatosDeAportaciones) {
  api.fetchAportaciones.mockImplementation(() => Promise.resolve(datos));
}

/** Pulsa un botón cuando ya se puede: mientras la lista se vuelve a pedir, esperan desactivados. */
async function pulsar(nombre: RegExp | string) {
  const boton = await screen.findByRole('button', { name: nombre });

  await waitFor(() => {
    expect(boton).toBeEnabled();
  });
  await userEvent.click(boton);
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

function montar(permisos: AppPermission[] = ['match.live.write']) {
  const anunciar = vi.fn();
  const router = createMemoryRouter(
    [{ path: '/mis-aportaciones', element: <MisAportacionesPage /> }],
    {
      initialEntries: ['/mis-aportaciones'],
    },
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
  api.fetchAportaciones.mockReset();
  api.cambiarJugador.mockReset().mockResolvedValue(undefined);
  api.cambiarSegundo.mockReset().mockResolvedValue(undefined);
  api.borrarEvento.mockReset().mockResolvedValue(undefined);
  discordancias.cambiarMinuto.mockReset().mockResolvedValue(undefined);
  match.describirEvento.mockReset().mockImplementation((uno: { id: string }) => `Evento ${uno.id}`);
});

describe('MisAportacionesPage', () => {
  it('pide lo del usuario en el equipo y la temporada activos', async () => {
    servidor({ partidos: [], eventos: [] });
    montar();

    await screen.findByText('Todavía no has apuntado nada en esta temporada.');
    expect(api.fetchAportaciones).toHaveBeenCalledWith('eq-1', 'temp-1', 'usuario-1');
  });

  it('lista dos partidos con sus eventos; el cerrado sale plegado y sin acciones', async () => {
    servidor({
      partidos: [
        partido({
          id: 'par-0',
          opponentName: 'CD Tacoronte',
          kickoffAt: new Date(2026, 8, 26, 12, 0).toISOString(),
          status: 'closed',
        }),
        partido({ id: 'par-1' }),
      ],
      eventos: [
        evento({ id: 'e0', partidoId: 'par-0', estado: 'approved' }),
        evento({ id: 'e1' }),
        evento({ id: 'e2', periodo: 2, segundos: 60 }),
      ],
    });
    montar(['match.live.write', 'event.approve']);

    const titulos = await screen.findAllByRole('heading', { level: 2 });

    expect(titulos.map((titulo) => titulo.textContent)).toEqual([
      'Contra UD Orotava',
      'Contra CD Tacoronte',
    ]);

    const abierto = titulos[0].closest('section');
    const cerrado = titulos[1].closest('section');
    const plegado = cerrado?.querySelector('details') ?? null;

    if (abierto === null || cerrado === null || plegado === null) {
      throw new Error('Falta la tarjeta de un partido, o el cerrado no sale plegado.');
    }

    expect(within(abierto).getByText(/· Terminado, sin cerrar$/)).toBeVisible();
    expect(within(abierto).getByText('Evento e1')).toBeVisible();
    expect(within(abierto).getByText('Evento e2')).toBeVisible();
    expect(within(abierto).getByRole('button', { name: 'Borrar: Evento e1' })).toBeVisible();

    expect(within(cerrado).getByText(/· Cerrado$/)).toBeVisible();
    expect(plegado).not.toHaveAttribute('open');
    expect(within(plegado).getByText('Ver el evento que apuntaste')).toBeInTheDocument();
    expect(within(plegado).getByText('Evento e0')).toBeInTheDocument();
    expect(within(plegado).getByText('Aprobado')).toBeInTheDocument();
    expect(
      within(cerrado).getByText(
        'Partido cerrado: para corregirlo hay que reabrirlo desde su cierre.',
      ),
    ).toBeInTheDocument();
    expect(within(cerrado).queryByRole('button')).toBeNull();

    expect(screen.getByText('Lo que este móvil aún no ha enviado no sale aquí.')).toBeVisible();
  });

  it('en un gol, «Asistencia» y «Sin asistencia» llama a la API con `null`', async () => {
    servidor({ partidos: [partido({ id: 'par-1' })], eventos: [evento({ id: 'e1' })] });
    const { anunciar } = montar();

    await pulsar('Asistencia: Evento e1');

    const opciones = within(screen.getByRole('group', { name: 'Asistencia de: Evento e1' }))
      .getAllByRole('button')
      .map((boton) => boton.textContent);

    // «Sin asistencia», la primera; sin el goleador ni el no convocado.
    expect(opciones).toEqual(['Sin asistencia', '9 · Yeray (ahora)', '10 · Nauzet', 'Cancelar']);

    await pulsar('Sin asistencia');

    await waitFor(() => {
      expect(api.cambiarSegundo).toHaveBeenCalledWith({
        id: 'e1',
        partidoId: 'par-1',
        segundo: null,
      });
    });
    await waitFor(() => {
      expect(anunciar).toHaveBeenCalledWith('Asistencia quitada.');
    });
  });

  it('«Jugador» y elegir otro llama con su `id`', async () => {
    servidor({ partidos: [partido({ id: 'par-1' })], eventos: [evento({ id: 'e1' })] });
    montar();

    await pulsar('Jugador: Evento e1');
    await pulsar('10 · Nauzet');

    await waitFor(() => {
      expect(api.cambiarJugador).toHaveBeenCalledWith({
        id: 'e1',
        partidoId: 'par-1',
        jugador: 'jug-10',
      });
    });
    // Tras el cambio se vuelve a pedir la lista.
    await waitFor(() => {
      expect(api.fetchAportaciones).toHaveBeenCalledTimes(2);
    });
  });

  it('en un cambio, «Entra» escribe el segundo jugador', async () => {
    servidor({
      partidos: [partido({ id: 'par-1' })],
      eventos: [evento({ id: 'e1', tipo: 'substitution' })],
    });
    montar();

    await pulsar('Entra: Evento e1');

    expect(screen.queryByRole('button', { name: 'Sin asistencia' })).toBeNull();

    await pulsar('10 · Nauzet');

    await waitFor(() => {
      expect(api.cambiarSegundo).toHaveBeenCalledWith({
        id: 'e1',
        partidoId: 'par-1',
        segundo: 'jug-10',
      });
    });
  });

  it('«Minuto» guarda la parte y los segundos con la función del cierre', async () => {
    servidor({ partidos: [partido({ id: 'par-1' })], eventos: [evento({ id: 'e1' })] });
    montar();

    await pulsar('Minuto: Evento e1');
    await userEvent.type(screen.getByLabelText(/^Minuto/), '12');
    await pulsar('Guardar el minuto');

    await waitFor(() => {
      expect(discordancias.cambiarMinuto).toHaveBeenCalledWith({
        id: 'e1',
        partidoId: 'par-1',
        periodo: 1,
        segundos: 660,
      });
    });
  });

  it('«Borrar» pide confirmación y, al confirmar, llama a la API', async () => {
    servidor({ partidos: [partido({ id: 'par-1' })], eventos: [evento({ id: 'e1' })] });
    const { anunciar } = montar();

    await pulsar('Borrar: Evento e1');

    expect(screen.getByText('¿Borrar Evento e1? No se puede deshacer.')).toHaveFocus();
    expect(api.borrarEvento).not.toHaveBeenCalled();

    await pulsar('Sí, borrar');

    await waitFor(() => {
      expect(api.borrarEvento).toHaveBeenCalledWith({ id: 'e1', partidoId: 'par-1' });
    });
    await waitFor(() => {
      expect(anunciar).toHaveBeenCalledWith('Evento borrado.');
    });
  });

  it('«Cancelar» en el borrado no borra nada', async () => {
    servidor({ partidos: [partido({ id: 'par-1' })], eventos: [evento({ id: 'e1' })] });
    montar();

    await pulsar('Borrar: Evento e1');
    await pulsar('Cancelar');

    expect(api.borrarEvento).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Borrar: Evento e1' })).toBeVisible();
  });

  it('con `SIN_FILAS`, sale el texto propio y se vuelve a pedir la lista', async () => {
    servidor({ partidos: [partido({ id: 'par-1' })], eventos: [evento({ id: 'e1' })] });
    api.cambiarJugador.mockRejectedValue(new Error('SIN_FILAS'));
    montar();

    await pulsar('Jugador: Evento e1');
    await pulsar('10 · Nauzet');

    expect(
      await screen.findByText(
        'Ese evento ya no se puede cambiar: lo han revisado o lo han borrado.',
      ),
    ).toBeVisible();
    await waitFor(() => {
      expect(api.fetchAportaciones).toHaveBeenCalledTimes(2);
    });
  });

  it('enseña tal cual el mensaje con el que la base rechaza un cambio', async () => {
    servidor({ partidos: [partido({ id: 'par-1' })], eventos: [evento({ id: 'e1' })] });
    api.cambiarJugador.mockRejectedValue({
      code: 'P0001',
      message: 'El jugador no está convocado en este partido',
    });
    montar();

    await pulsar('Jugador: Evento e1');
    await pulsar('10 · Nauzet');

    expect(await screen.findByText('El jugador no está convocado en este partido')).toBeVisible();
  });

  it('tras un fallo que no es `SIN_FILAS`, el foco vuelve a la leyenda del formulario', async () => {
    servidor({ partidos: [partido({ id: 'par-1' })], eventos: [evento({ id: 'e1' })] });
    api.cambiarJugador.mockRejectedValue({ code: 'P0001', message: 'No está convocado' });
    montar();

    await pulsar('Jugador: Evento e1');
    await pulsar('10 · Nauzet');

    await screen.findByText('No está convocado');
    const leyenda = screen.getByText(/^.+: Evento e1$/, { selector: 'legend' });

    expect(leyenda).toHaveAttribute('tabindex', '-1');
    await waitFor(() => {
      expect(leyenda).toHaveFocus();
    });
  });

  it('un evento ya revisado, sin el permiso de aprobar, no ofrece nada y lo dice', async () => {
    servidor({
      partidos: [partido({ id: 'par-1' })],
      eventos: [evento({ id: 'e1', estado: 'approved' })],
    });
    montar();

    expect(
      await screen.findByText('Ya está revisado: lo corrige quien cierra el partido.'),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: /Evento e1/ })).toBeNull();
  });

  it('un evento del rival solo ofrece el minuto y borrar', async () => {
    servidor({
      partidos: [partido({ id: 'par-1' })],
      eventos: [evento({ id: 'e1', rival: true, jugador: null, segundo: null })],
    });
    montar();

    await screen.findByRole('button', { name: 'Minuto: Evento e1' });

    expect(
      screen.getAllByRole('button', { name: /Evento e1/ }).map((boton) => boton.textContent),
    ).toEqual(['Minuto', 'Borrar']);
  });

  it('sin nada apuntado, el texto de vacío', async () => {
    servidor({ partidos: [], eventos: [] });
    montar();

    expect(
      await screen.findByText('Todavía no has apuntado nada en esta temporada.'),
    ).toBeVisible();
    expect(screen.getByText('Lo que este móvil aún no ha enviado no sale aquí.')).toBeVisible();
  });
});
