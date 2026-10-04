// Pantalla A13 (T-210a y T-210b): cierre y reapertura del partido, y el panel
// que revisa sus eventos.
//
// La red se sustituye en la frontera de `api/cierre`, `api/discordancias` y
// `api/local` (DOC 06 §11). `@modules/match` se sustituye entero: su barrel
// arrastra las rutas del directo y, con ellas, Dexie (D06-26). Aquí solo hace
// falta `describirEvento`, de mentira, y las dos funciones del reloj que
// validan el minuto, que son puras y entran de verdad.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@modules/auth';
import { AnnounceContext } from '@shared/hooks/announceContext';

import { CierrePartidoPage } from './CierrePartidoPage';

import type { DatosDelCierre } from '../model/cierre';
import type { EventoRevisable } from '../model/discordancias';
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
const discordancias = vi.hoisted(() => ({
  marcarRepetidos: vi.fn(),
  resolverEvento: vi.fn(),
  aprobarPendientes: vi.fn(),
  cambiarMinuto: vi.fn(),
  fetchAutores: vi.fn(),
  EVENTO_CAMBIADO: 'EVENTO_CAMBIADO',
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
vi.mock('../api/discordancias', () => discordancias);
vi.mock('../api/local', () => local);
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

function evento(cambios: Partial<EventoRevisable> & { id: string }): EventoRevisable {
  return {
    clientEventId: `cliente-${cambios.id}`,
    tipo: 'goal',
    periodo: 1,
    segundos: 600,
    rival: false,
    jugador: null,
    segundo: null,
    detalles: {},
    estado: 'pending',
    propio: false,
    autorId: 'usuario-2',
    grupo: null,
    ...cambios,
  };
}

/**
 * El servidor de mentira: `fetchCierre` devuelve siempre lo último que hay, y
 * cada prueba lo cambia desde la escritura que sustituye. Hace falta porque
 * la pantalla vuelve a pedir el cierre tras marcar los repetidos y tras cada
 * cambio, y no se sabe cuántas veces.
 */
function servidor(eventos: EventoRevisable[]) {
  const estado = { eventos };

  api.fetchCierre.mockImplementation(() => Promise.resolve(datos({ eventos: estado.eventos })));

  return estado;
}

/**
 * Pulsa un botón del panel cuando ya se puede: mientras la lista se vuelve a
 * pedir, los botones esperan desactivados.
 */
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
  discordancias.marcarRepetidos.mockReset();
  discordancias.resolverEvento.mockReset();
  discordancias.aprobarPendientes.mockReset();
  discordancias.cambiarMinuto.mockReset();
  discordancias.fetchAutores.mockReset();

  discordancias.marcarRepetidos.mockResolvedValue(0);
  discordancias.fetchAutores.mockResolvedValue(new Map());

  match.describirEvento.mockReturnValue('Evento de prueba');
  local.leerColaDelPartido.mockResolvedValue({ sinEnviar: 0, rechazados: 0 });
});

describe('A13 · Cierre del partido', () => {
  it('con un evento pendiente, se ve y no se puede cerrar', async () => {
    api.fetchCierre.mockResolvedValue(
      datos({
        eventos: [evento({ id: 'id-1' })],
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

describe('A13 · Panel de eventos (T-210b)', () => {
  it('con un pendiente y `event.approve`, «Aprobar» llama a la API con el `id` y el partido ya se puede cerrar', async () => {
    const estado = servidor([evento({ id: 'id-1' })]);
    discordancias.resolverEvento.mockImplementation(() => {
      estado.eventos = [evento({ id: 'id-1', estado: 'approved' })];

      return Promise.resolve();
    });
    const { anunciar } = montar();

    expect(await screen.findByText('Queda 1 evento pendiente de revisar.')).toBeInTheDocument();
    await pulsar(/^Aprobar: /);

    expect(discordancias.resolverEvento).toHaveBeenCalledWith({
      id: 'id-1',
      de: 'pending',
      a: 'approved',
      userId: 'usuario-1',
    });
    expect(await screen.findByRole('button', { name: 'Cerrar el partido' })).toBeInTheDocument();
    expect(screen.getByText('Aprobado')).toBeInTheDocument();
    expect(anunciar).toHaveBeenCalledWith('Evento aprobado.');
  });

  it('«Aprobar los 2 pendientes» llama una vez a `aprobarPendientes`', async () => {
    const estado = servidor([
      evento({ id: 'id-1' }),
      evento({ id: 'id-2', segundos: 900 }),
      evento({ id: 'id-3', segundos: 1200, estado: 'approved' }),
    ]);
    discordancias.aprobarPendientes.mockImplementation(() => {
      estado.eventos = estado.eventos.map((uno) => ({ ...uno, estado: 'approved' }));

      return Promise.resolve(2);
    });
    montar();

    await pulsar('Aprobar los 2 pendientes');

    expect(discordancias.aprobarPendientes).toHaveBeenCalledTimes(1);
    expect(discordancias.aprobarPendientes).toHaveBeenCalledWith({
      ids: ['id-1', 'id-2'],
      userId: 'usuario-1',
    });
    expect(await screen.findByText('No queda ningún evento pendiente.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Aprobar los/ })).toBeNull();
  });

  it('«Descartar» y luego «Recuperar» sobre el mismo evento', async () => {
    const estado = servidor([evento({ id: 'id-1', estado: 'approved' })]);
    discordancias.resolverEvento.mockImplementation((cambio: { a: EventoRevisable['estado'] }) => {
      estado.eventos = [evento({ id: 'id-1', estado: cambio.a })];

      return Promise.resolve();
    });
    montar();

    await pulsar(/^Descartar: /);

    expect(discordancias.resolverEvento).toHaveBeenLastCalledWith({
      id: 'id-1',
      de: 'approved',
      a: 'rejected',
      userId: 'usuario-1',
    });

    // Descartado, ya no se le cambia el minuto ni se descarta otra vez.
    expect(await screen.findByRole('button', { name: /^Recuperar: / })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^(Cambiar minuto|Descartar): / })).toBeNull();

    await pulsar(/^Recuperar: /);

    expect(discordancias.resolverEvento).toHaveBeenLastCalledWith({
      id: 'id-1',
      de: 'rejected',
      a: 'approved',
      userId: 'usuario-1',
    });
    expect(await screen.findByRole('button', { name: /^Descartar: / })).toBeInTheDocument();
  });

  it('si otro cambió el evento, lo dice y no lo da por hecho', async () => {
    servidor([evento({ id: 'id-1' })]);
    discordancias.resolverEvento.mockRejectedValue(new Error('EVENTO_CAMBIADO'));
    const { anunciar } = montar();

    await pulsar(/^Aprobar: /);

    expect(await screen.findByText('Ese evento ha cambiado: vuelve a mirar.')).toBeInTheDocument();
    expect(anunciar).toHaveBeenCalledWith('Ese evento ha cambiado: vuelve a mirar.');
  });

  it('«Cambiar minuto» fuera de la parte da el error del rango y no llama a la API; con uno bueno, llama con parte y segundos', async () => {
    servidor([evento({ id: 'id-1', estado: 'approved' })]);
    discordancias.cambiarMinuto.mockResolvedValue(undefined);
    const { anunciar } = montar();

    await pulsar(/^Cambiar minuto: /);

    // La misma ayuda del directo: las partes de la prueba son de 25 minutos.
    const minuto = screen.getByLabelText(/^Minuto/);
    expect(
      screen.getByText('De 1 a 25, como en el acta. En el descuento, 25+2.'),
    ).toBeInTheDocument();

    await userEvent.type(minuto, '40');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar el minuto' }));

    expect(
      await screen.findByText(
        'Ese minuto no es de la 1.ª parte: va de 1 a 25, o 25+2 en el descuento.',
      ),
    ).toBeInTheDocument();
    expect(discordancias.cambiarMinuto).not.toHaveBeenCalled();

    // El 40 sí es de la segunda: va del 26 al 50.
    await userEvent.selectOptions(screen.getByLabelText('Parte'), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar el minuto' }));

    expect(discordancias.cambiarMinuto).toHaveBeenCalledWith({
      id: 'id-1',
      periodo: 2,
      segundos: 14 * 60,
    });
    await waitFor(() => {
      expect(anunciar).toHaveBeenCalledWith('Minuto cambiado.');
    });
    expect(screen.queryByLabelText(/^Minuto/)).toBeNull();
  });

  it('sin `event.approve`, la lista sale sin botones y no se llama a `marcarRepetidos`', async () => {
    servidor([
      evento({ id: 'id-1' }),
      evento({ id: 'id-2', segundos: 900, estado: 'approved' }),
      evento({ id: 'id-3', segundos: 1200, estado: 'rejected' }),
    ]);
    montar(['match.live.write']);

    expect(await screen.findAllByText('Evento de prueba')).toHaveLength(3);
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Descartado')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^(Aprobar|Descartar|Recuperar|Cambiar minuto)/ }),
    ).toBeNull();
    expect(discordancias.marcarRepetidos).not.toHaveBeenCalled();
  });

  it('con `event.approve` busca los repetidos una sola vez al abrir', async () => {
    servidor([evento({ id: 'id-1', estado: 'approved' })]);
    montar();

    await screen.findByRole('button', { name: /^Descartar: / });
    await waitFor(() => {
      expect(api.fetchCierre).toHaveBeenCalledTimes(2);
    });

    expect(discordancias.marcarRepetidos).toHaveBeenCalledTimes(1);
    expect(discordancias.marcarRepetidos).toHaveBeenCalledWith('par-1');
  });

  it('dos eventos con el mismo grupo salen con «Posible repetido»', async () => {
    servidor([
      evento({ id: 'id-1', estado: 'approved', grupo: 'g-1', autorId: 'usuario-1' }),
      evento({ id: 'id-2', segundos: 610, estado: 'approved', grupo: 'g-1' }),
      evento({ id: 'id-3', segundos: 1200, estado: 'approved' }),
    ]);
    montar();

    expect(await screen.findAllByText('Posible repetido')).toHaveLength(2);
  });

  it('dice quién apuntó cada evento, y «Otra persona» si no se le ve', async () => {
    servidor([
      evento({ id: 'id-1', estado: 'approved', autorId: 'usuario-1' }),
      evento({ id: 'id-2', segundos: 900, estado: 'approved', autorId: 'usuario-9' }),
    ]);
    discordancias.fetchAutores.mockResolvedValue(new Map([['usuario-1', 'Isaac']]));
    montar();

    expect(await screen.findByText('Lo apuntó: Isaac')).toBeInTheDocument();
    expect(screen.getByText('Lo apuntó: Otra persona')).toBeInTheDocument();
    expect(discordancias.fetchAutores).toHaveBeenCalledWith(['usuario-1', 'usuario-9']);
  });
});
