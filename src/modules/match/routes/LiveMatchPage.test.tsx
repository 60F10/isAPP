// Pantalla A12, esqueleto (T-207): carga de local, controles del partido,
// confirmaciones, marca de partido en curso y salida con cola.
//
// IndexedDB y la cola se sustituyen en la frontera de `api/directo` y de
// `@modules/sync`.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@modules/auth';
import { AnnounceContext } from '@shared/hooks/announceContext';
import { leerPartidoEnCurso } from '@shared/lib/partidoEnCurso';

import { desdePaquete } from '../model/directo';
import { LiveMatchPage } from './LiveMatchPage';

import type { DirectoCargado, Refresco } from '../api/directo';
import type { CoberturaLocal, Declaracion } from '../model/cobertura';
import type { EstadoDirecto } from '../model/directo';
import type { PaqueteDePartido } from '../model/paquete';
import type { AppPermission, AuthState } from '@modules/auth';
import type { Session } from '@supabase/supabase-js';

const api = vi.hoisted(() => ({
  cargarDirecto: vi.fn(),
  aplicarTransicion: vi.fn(),
  refrescarDirecto: vi.fn(),
  SIN_PRECARGA: 'SIN_PRECARGA',
}));
const sync = vi.hoisted(() => ({ contarPendientes: vi.fn(), pendientesDelPartido: vi.fn() }));
// La cobertura declarada (T-209a) va aparte del reductor, por su propia API.
const cobertura = vi.hoisted(() => ({
  leerCobertura: vi.fn(),
  declararCobertura: vi.fn(),
  cerrarCobertura: vi.fn(),
  cambiarCobertura: vi.fn(),
}));

vi.mock('../api/directo', () => api);
vi.mock('../api/cobertura', () => cobertura);
vi.mock('@modules/sync', () => sync);
// El canal de Realtime no se abre en las pruebas: el refresco se provoca
// volviendo a tener red, que es otro de sus motivos (T-209b).
vi.mock('../api/tiempoReal', () => ({ escucharPartido: () => () => undefined }));
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
    enabled_event_types: [
      'goal',
      'own_goal',
      'yellow_card',
      'second_yellow',
      'red_card',
      'foul_committed',
      'foul_received',
      'corner',
      'substitution',
      'position_change',
      'note',
    ],
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

function auth(permisos: AppPermission[] = ['match.live.write']): AuthState {
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

function montar(permisos?: AppPermission[], { sinSesion = false } = {}) {
  const anunciar = vi.fn();
  const router = createMemoryRouter(
    [
      { path: '/partidos/:id/directo', element: <LiveMatchPage /> },
      { path: '/partidos/:id/convocatoria', element: <p>Convocatoria</p> },
      { path: '/calendario', element: <p>Calendario</p> },
    ],
    { initialEntries: ['/partidos/par-1/directo'] },
  );
  const cliente = new QueryClient();
  const arbol = (estado: AuthState) => (
    <QueryClientProvider client={cliente}>
      <AuthContext value={estado}>
        <AnnounceContext value={{ anunciar }}>
          <RouterProvider router={router} />
        </AnnounceContext>
      </AuthContext>
    </QueryClientProvider>
  );

  const { rerender } = render(
    arbol(sinSesion ? { ...auth(permisos), session: null } : auth(permisos)),
  );

  return {
    anunciar,
    /** La sesión llega después de pintar: lo que mira el arreglo 10 de la T-221. */
    conSesion: () => {
      rerender(arbol(auth(permisos)));
    },
  };
}

/** La cobertura que devolvería la API al declarar: abierta y con lo pedido. */
function abierta(datos: Declaracion): CoberturaLocal {
  return {
    id: datos.id,
    userId: datos.userId,
    alcance: datos.alcance,
    jugador: datos.jugador,
    tipos: [...datos.tiposActivos],
    desde: datos.desde,
    abierta: true,
  };
}

const TODO_EL_EQUIPO: CoberturaLocal = {
  id: 'cob-1',
  userId: 'usuario-1',
  alcance: 'full_team',
  jugador: null,
  tipos: PAQUETE.reglamento.enabled_event_types,
  desde: { periodo: 1, segundos: 0 },
  abierta: true,
};

beforeEach(() => {
  api.cargarDirecto.mockReset();
  api.aplicarTransicion.mockReset();
  api.aplicarTransicion.mockResolvedValue(undefined);
  api.refrescarDirecto.mockReset();
  api.refrescarDirecto.mockRejectedValue(new TypeError('Failed to fetch'));
  sync.contarPendientes.mockReset();
  sync.contarPendientes.mockResolvedValue(0);
  sync.pendientesDelPartido.mockReset();
  sync.pendientesDelPartido.mockResolvedValue({ altas: new Set(), bajas: new Set() });
  cobertura.leerCobertura.mockReset();
  cobertura.leerCobertura.mockResolvedValue(null);
  cobertura.declararCobertura.mockReset();
  // Desde la T-221, las tres dicen la que queda abierta y si se aplicó.
  cobertura.declararCobertura.mockImplementation((datos: Declaracion) =>
    Promise.resolve({ cobertura: abierta(datos), aplicado: true }),
  );
  cobertura.cerrarCobertura.mockReset();
  cobertura.cerrarCobertura.mockResolvedValue({ cobertura: null, aplicado: true });
  cobertura.cambiarCobertura.mockReset();
  cobertura.cambiarCobertura.mockImplementation((_anterior: unknown, datos: Declaracion) =>
    Promise.resolve({ cobertura: abierta(datos), aplicado: true }),
  );
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
    api.cargarDirecto.mockResolvedValue(cargado({ titulares: ['p1'] }));
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

  describe('cobertura declarada (T-209a)', () => {
    const INICIO = Date.now() - 60_000;
    const enJuego = () =>
      cargado({
        fase: 'en_juego',
        partes: [
          {
            id: 'parte-1',
            numero: 1,
            inicio: INICIO,
            pausadoMs: 0,
            pausaDesde: null,
            segundosReales: null,
          },
        ],
      });

    it('al abrir declara una vez «todo el equipo», desde el principio', async () => {
      api.cargarDirecto.mockResolvedValue(cargado());
      montar();

      expect(await screen.findByText('Sigues: todo el equipo')).toBeInTheDocument();
      // Solo la de quien tiene la sesión: la de otra cuenta no es suya (T-221).
      expect(cobertura.leerCobertura).toHaveBeenCalledWith('par-1', 'usuario-1');
      expect(cobertura.declararCobertura).toHaveBeenCalledTimes(1);
      expect(cobertura.declararCobertura).toHaveBeenCalledWith(
        expect.objectContaining({
          partidoId: 'par-1',
          userId: 'usuario-1',
          alcance: 'full_team',
          jugador: null,
          tiposActivos: PAQUETE.reglamento.enabled_event_types,
          desde: { periodo: 1, segundos: 0 },
          diferido: false,
        }),
      );
    });

    it('al recargar con una abierta en el aparato, no declara otra', async () => {
      api.cargarDirecto.mockResolvedValue(enJuego());
      cobertura.leerCobertura.mockResolvedValue({
        ...TODO_EL_EQUIPO,
        alcance: 'goals_cards',
      });
      montar();

      expect(await screen.findByText('Sigues: solo goles y tarjetas')).toBeInTheDocument();
      expect(cobertura.declararCobertura).not.toHaveBeenCalled();
    });

    it('con el partido en juego, declara desde el minuto en que se entra', async () => {
      api.cargarDirecto.mockResolvedValue(enJuego());
      montar();

      await screen.findByText('Sigues: todo el equipo');

      const [datos] = cobertura.declararCobertura.mock.calls[0] as [Declaracion];
      expect(datos.desde.periodo).toBe(1);
      expect(datos.desde.segundos).toBeGreaterThanOrEqual(60);
      expect(datos.desde.segundos).toBeLessThan(70);
    });

    it('con el partido terminado no declara nada ni ofrece cambiar', async () => {
      api.cargarDirecto.mockResolvedValue(cargado({ fase: 'finalizado' }));
      montar();

      expect(await screen.findByText(/El partido ha terminado/)).toBeInTheDocument();
      expect(cobertura.declararCobertura).not.toHaveBeenCalled();
      expect(screen.queryByText(/^Sigues:/)).toBeNull();
    });

    it('«Cambiar» a un jugador cierra la anterior y abre una `single_player` con ese jugador', async () => {
      api.cargarDirecto.mockResolvedValue(enJuego());
      cobertura.leerCobertura.mockResolvedValue(TODO_EL_EQUIPO);
      const { anunciar } = montar();

      await userEvent.click(await screen.findByRole('button', { name: 'Cambiar lo que sigues' }));

      expect(screen.getByRole('heading', { name: '¿Qué sigues?' })).toHaveFocus();
      expect(screen.getByRole('button', { name: 'Solo goles y tarjetas' })).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Un jugador' }));

      expect(screen.getByRole('heading', { name: '¿A quién sigues?' })).toHaveFocus();
      // Solo los convocados: Nico no lo está.
      expect(screen.queryByRole('button', { name: 'Seguir a 9 · Nico' })).toBeNull();

      await userEvent.click(screen.getByRole('button', { name: 'Seguir a 7 · Juanito' }));

      expect(await screen.findByText('Sigues: 7 · Juanito')).toBeInTheDocument();
      expect(cobertura.cambiarCobertura).toHaveBeenCalledTimes(1);

      const [anterior, datos] = cobertura.cambiarCobertura.mock.calls[0] as [
        CoberturaLocal,
        Declaracion,
      ];
      expect(anterior).toEqual(TODO_EL_EQUIPO);
      expect(datos).toMatchObject({
        partidoId: 'par-1',
        userId: 'usuario-1',
        alcance: 'single_player',
        jugador: 'p7',
        diferido: false,
      });
      expect(datos.id).not.toBe('cob-1');
      expect(datos.desde.periodo).toBe(1);
      expect(datos.desde.segundos).toBeGreaterThanOrEqual(60);
      expect(anunciar).toHaveBeenCalledWith('Ahora sigues: 7 · Juanito');
      expect(screen.getByRole('button', { name: 'Cambiar lo que sigues' })).toHaveFocus();
    });

    it('cancelar el cambio no toca nada y devuelve el foco a «Cambiar»', async () => {
      api.cargarDirecto.mockResolvedValue(cargado());
      montar();

      await userEvent.click(await screen.findByRole('button', { name: 'Cambiar lo que sigues' }));
      await userEvent.click(screen.getByRole('button', { name: 'Seguir como estaba' }));

      expect(cobertura.cambiarCobertura).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Cambiar lo que sigues' })).toHaveFocus();
    });

    it('si el cambio no se puede guardar, sigue como estaba y lo dice', async () => {
      api.cargarDirecto.mockResolvedValue(cargado());
      cobertura.cambiarCobertura.mockRejectedValue(new Error('QuotaExceededError'));
      montar();

      await userEvent.click(await screen.findByRole('button', { name: 'Cambiar lo que sigues' }));
      await userEvent.click(screen.getByRole('button', { name: 'Solo goles y tarjetas' }));

      expect(await screen.findByText(/No se ha podido guardar lo que sigues/)).toBeInTheDocument();
      expect(screen.getByText('Sigues: todo el equipo')).toBeInTheDocument();
    });

    it('salir del directo cierra la cobertura en el instante de salir', async () => {
      api.cargarDirecto.mockResolvedValue(cargado());
      cobertura.leerCobertura.mockResolvedValue(TODO_EL_EQUIPO);
      montar();

      await screen.findByText('Sigues: todo el equipo');
      await userEvent.click(screen.getByRole('button', { name: 'Salir del directo' }));

      expect(await screen.findByText('Calendario')).toBeInTheDocument();
      expect(cobertura.cerrarCobertura).toHaveBeenCalledTimes(1);
      expect(cobertura.cerrarCobertura).toHaveBeenCalledWith('par-1', TODO_EL_EQUIPO, {
        periodo: 1,
        segundos: 0,
      });
    });

    it('con anotaciones sin enviar, la cobertura no se cierra hasta salir de verdad', async () => {
      api.cargarDirecto.mockResolvedValue(cargado());
      cobertura.leerCobertura.mockResolvedValue(TODO_EL_EQUIPO);
      sync.contarPendientes.mockResolvedValue(1);
      montar();

      await screen.findByText('Sigues: todo el equipo');
      await userEvent.click(screen.getByRole('button', { name: 'Salir del directo' }));
      await screen.findByText(/Hay 1 anotación sin enviar/);

      expect(cobertura.cerrarCobertura).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole('button', { name: 'Salir igualmente' }));

      expect(await screen.findByText('Calendario')).toBeInTheDocument();
      expect(cobertura.cerrarCobertura).toHaveBeenCalledTimes(1);
    });

    it('si cerrarla falla, se sale igual: la termina el cierre del partido', async () => {
      api.cargarDirecto.mockResolvedValue(cargado());
      cobertura.leerCobertura.mockResolvedValue(TODO_EL_EQUIPO);
      cobertura.cerrarCobertura.mockRejectedValue(new Error('QuotaExceededError'));
      montar();

      await screen.findByText('Sigues: todo el equipo');
      await userEvent.click(screen.getByRole('button', { name: 'Salir del directo' }));

      expect(await screen.findByText('Calendario')).toBeInTheDocument();
    });

    it('con el cierre de la cobertura colgado, «Salir del directo» navega antes de 2 s', async () => {
      api.cargarDirecto.mockResolvedValue(cargado());
      cobertura.leerCobertura.mockResolvedValue(TODO_EL_EQUIPO);
      // IndexedDB que no contesta: la promesa no se resuelve nunca.
      cobertura.cerrarCobertura.mockReturnValue(new Promise(() => undefined));
      montar();

      await screen.findByText('Sigues: todo el equipo');
      const alPulsar = Date.now();
      await userEvent.click(screen.getByRole('button', { name: 'Salir del directo' }));

      expect(await screen.findByText('Calendario', {}, { timeout: 2_000 })).toBeInTheDocument();
      expect(Date.now() - alPulsar).toBeLessThan(2_000);
      expect(cobertura.cerrarCobertura).toHaveBeenCalledTimes(1);
    });

    it('con solo un trabajo de cobertura pendiente, salir no pregunta', async () => {
      api.cargarDirecto.mockResolvedValue(cargado());
      // Se abrió sin red: en la cola solo está el alta de la cobertura.
      sync.contarPendientes.mockImplementation(
        (_userId: string, opciones?: { sin?: readonly string[] }) =>
          Promise.resolve(opciones?.sin?.includes('coverage') === true ? 0 : 1),
      );
      montar();

      await screen.findByText('Sigues: todo el equipo');
      await userEvent.click(screen.getByRole('button', { name: 'Salir del directo' }));

      expect(await screen.findByText('Calendario')).toBeInTheDocument();
      expect(sync.contarPendientes).toHaveBeenCalledWith('usuario-1', { sin: ['coverage'] });
    });

    it('con `aplicado: false`, pone la que hay y anuncia que no se ha cambiado', async () => {
      api.cargarDirecto.mockResolvedValue(cargado());
      cobertura.leerCobertura.mockResolvedValue(TODO_EL_EQUIPO);
      // Otra pestaña ya la había cambiado a un jugador.
      cobertura.cambiarCobertura.mockResolvedValue({
        cobertura: { ...TODO_EL_EQUIPO, id: 'cob-2', alcance: 'single_player', jugador: 'p7' },
        aplicado: false,
      });
      const { anunciar } = montar();

      await userEvent.click(await screen.findByRole('button', { name: 'Cambiar lo que sigues' }));
      await userEvent.click(screen.getByRole('button', { name: 'Solo goles y tarjetas' }));

      const mensaje = 'No se ha cambiado: este dispositivo ya tenía otra abierta.';
      expect(await screen.findByText('Sigues: 7 · Juanito')).toBeInTheDocument();
      expect(anunciar).toHaveBeenCalledWith(mensaje);
      expect(anunciar).not.toHaveBeenCalledWith(expect.stringMatching(/^Ahora sigues:/));
      expect(screen.getByText(mensaje)).toBeInTheDocument();
    });

    it('sin sesión todavía no mira la cobertura; cuando llega, la declara una vez', async () => {
      api.cargarDirecto.mockResolvedValue(cargado());
      const { conSesion } = montar(undefined, { sinSesion: true });

      await screen.findByText('Sin empezar');

      expect(cobertura.leerCobertura).not.toHaveBeenCalled();
      expect(cobertura.declararCobertura).not.toHaveBeenCalled();

      conSesion();

      expect(await screen.findByText('Sigues: todo el equipo')).toBeInTheDocument();
      expect(cobertura.leerCobertura).toHaveBeenCalledTimes(1);
      expect(cobertura.declararCobertura).toHaveBeenCalledTimes(1);
    });

    it('finalizar el partido cierra la cobertura en el final de la última parte', async () => {
      const cerrada = { pausadoMs: 0, pausaDesde: null, inicio: 0 };
      api.cargarDirecto.mockResolvedValue(
        cargado({
          fase: 'descanso',
          partes: [
            { id: 'a', numero: 1, segundosReales: 2_400, ...cerrada },
            { id: 'b', numero: 2, segundosReales: 2_520, ...cerrada },
          ],
        }),
      );
      cobertura.leerCobertura.mockResolvedValue(TODO_EL_EQUIPO);
      montar();

      await screen.findByText('Sigues: todo el equipo');
      await userEvent.click(screen.getByRole('button', { name: 'Finalizar el partido' }));
      await userEvent.click(screen.getByRole('button', { name: 'Sí, finalizar' }));

      expect(await screen.findByText(/El partido ha terminado/)).toBeInTheDocument();
      expect(cobertura.cerrarCobertura).toHaveBeenCalledWith('par-1', TODO_EL_EQUIPO, {
        periodo: 2,
        segundos: 2_520,
      });
      expect(screen.queryByText(/^Sigues:/)).toBeNull();
    });

    it('en diferido declara una sola, marcada, sin selector, y salir no la cierra', async () => {
      api.cargarDirecto.mockResolvedValue({
        ...cargado({ diferido: true }),
        paquete: { ...PAQUETE, partido: { ...PAQUETE.partido, isRetroactive: true } },
      });
      montar();

      expect(await screen.findByText('Sigues: todo el equipo')).toBeInTheDocument();
      expect(cobertura.declararCobertura).toHaveBeenCalledWith(
        expect.objectContaining({ alcance: 'full_team', diferido: true }),
      );
      expect(screen.queryByRole('button', { name: 'Cambiar lo que sigues' })).toBeNull();

      await userEvent.click(screen.getByRole('button', { name: 'Salir del directo' }));

      expect(await screen.findByText('Calendario')).toBeInTheDocument();
      expect(cobertura.cerrarCobertura).not.toHaveBeenCalled();
    });
  });

  describe('registro (T-208)', () => {
    const INICIO = Date.now() - 60_000;
    const enJuego = () =>
      cargado({
        fase: 'en_juego',
        partes: [
          {
            id: 'parte-1',
            numero: 1,
            inicio: INICIO,
            pausadoMs: 0,
            pausaDesde: null,
            segundosReales: null,
          },
        ],
        eventos: [],
      });

    function ultimaTransicion() {
      const llamada = api.aplicarTransicion.mock.calls.at(-1) as
        | [
            EstadoDirecto,
            { entity: string; op: string; payload: { valores: Record<string, unknown> } }[],
          ]
        | undefined;

      if (llamada === undefined) {
        throw new Error('No se ha guardado nada.');
      }

      return { estado: llamada[0], trabajos: llamada[1] };
    }

    it('gol: de quién, quién marca y sin asistencia; se guarda pendiente, se confirma y vibra', async () => {
      const vibrar = vi.fn();
      Object.defineProperty(navigator, 'vibrate', { value: vibrar, configurable: true });
      api.cargarDirecto.mockResolvedValue(enJuego());
      montar();

      await userEvent.click(await screen.findByRole('button', { name: 'Gol' }));

      expect(
        screen.getByRole('heading', { level: 2, name: 'Gol: ¿De quién es el gol?' }),
      ).toHaveFocus();

      await userEvent.click(screen.getByRole('button', { name: 'Nuestro' }));
      await userEvent.click(screen.getByRole('button', { name: '7 · Juanito' }));
      await userEvent.click(screen.getByRole('button', { name: 'Sin asistencia' }));

      const { trabajos } = ultimaTransicion();
      expect(trabajos[0]?.payload.valores).toMatchObject({
        event_type: 'goal',
        player_id: 'p7',
        secondary_player_id: null,
        status: 'pending',
        created_by: 'usuario-1',
      });
      // La confirmación de 2 s y la línea de «Últimos eventos».
      expect(await screen.findAllByText("Gol · 7 · Juanito · 2'")).toHaveLength(2);
      expect(screen.getByRole('region', { name: 'Últimos eventos' })).toHaveTextContent(
        "Gol · 7 · Juanito · 2' · Pendiente",
      );
      expect(vibrar).toHaveBeenCalledWith(40);
      expect(screen.getByText('0 – 1')).toBeInTheDocument();
    });

    it('con event.approve el evento nace aprobado', async () => {
      api.cargarDirecto.mockResolvedValue(enJuego());
      montar(['match.live.write', 'event.approve']);

      await userEvent.click(await screen.findByRole('button', { name: 'Córner' }));
      await userEvent.click(screen.getByRole('button', { name: 'A favor' }));

      expect(ultimaTransicion().trabajos[0]?.payload.valores.status).toBe('approved');
    });

    it('la ficha de un jugador abre sus acciones y salta el jugador', async () => {
      api.cargarDirecto.mockResolvedValue(enJuego());
      montar();

      await userEvent.click(await screen.findByRole('button', { name: 'Ficha de 7 · Juanito' }));
      await userEvent.click(screen.getByRole('button', { name: 'Tarjeta' }));
      await userEvent.click(screen.getByRole('button', { name: 'Amarilla' }));

      expect(ultimaTransicion().trabajos[0]?.payload.valores).toMatchObject({
        event_type: 'yellow_card',
        player_id: 'p7',
      });
    });

    it('en el cambio solo ofrece a quien puede entrar, y lo mueve del banquillo al campo', async () => {
      api.cargarDirecto.mockResolvedValue(enJuego());
      montar();

      await userEvent.click(await screen.findByRole('button', { name: 'Cambio' }));
      await userEvent.click(screen.getByRole('button', { name: '7 · Juanito' }));

      expect(
        screen.getAllByRole('button', { name: /· / }).map((b) => b.getAttribute('aria-label')),
      ).toEqual(['8 · Luis']);

      await userEvent.click(screen.getByRole('button', { name: '8 · Luis' }));
      await userEvent.click(screen.getByRole('button', { name: 'Cansancio' }));

      expect(ultimaTransicion().estado.enCampo).toEqual(['p1', 'p8']);
      expect(await screen.findByRole('region', { name: 'Banquillo (1)' })).toHaveTextContent(
        '7 · Juanito',
      );
    });

    it('«Atrás» deshace la última respuesta y «Cancelar» tira el evento', async () => {
      api.cargarDirecto.mockResolvedValue(enJuego());
      montar();

      await userEvent.click(await screen.findByRole('button', { name: 'Gol' }));
      await userEvent.click(screen.getByRole('button', { name: 'Nuestro' }));
      await userEvent.click(screen.getByRole('button', { name: 'Atrás' }));

      expect(
        screen.getByRole('heading', { level: 2, name: 'Gol: ¿De quién es el gol?' }),
      ).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(screen.getByRole('button', { name: 'Gol' })).toBeInTheDocument();
      expect(api.aplicarTransicion).not.toHaveBeenCalled();
    });

    it('lo apuntado aquí se deshace: encola el borrado y lo quita de la lista', async () => {
      api.cargarDirecto.mockResolvedValue(enJuego());
      montar();

      await userEvent.click(await screen.findByRole('button', { name: 'Córner' }));
      await userEvent.click(screen.getByRole('button', { name: 'En contra' }));
      await userEvent.click(
        await screen.findByRole('button', { name: "Deshacer: Córner en contra · 2'" }),
      );

      const { estado, trabajos } = ultimaTransicion();
      expect(trabajos[0]).toMatchObject({ entity: 'match_event', op: 'delete' });
      expect(estado.eventos).toEqual([]);
      expect(await screen.findByText('Todavía no hay nada apuntado.')).toBeInTheDocument();
    });

    it('con los cambios agotados, el botón de cambio se desactiva y dice por qué (R-04)', async () => {
      api.cargarDirecto.mockResolvedValue({
        ...enJuego(),
        estado: { ...enJuego().estado, cambiosMax: 0 },
      });
      montar();

      const cambio = await screen.findByRole('button', { name: 'Cambio' });

      expect(cambio).toBeDisabled();
      expect(cambio).toHaveAccessibleDescription('Cambios agotados: 0 de 0.');
    });

    it('si no se puede guardar, el flujo sigue en su último paso y lo dice', async () => {
      api.cargarDirecto.mockResolvedValue(enJuego());
      api.aplicarTransicion.mockRejectedValue(new Error('QuotaExceededError'));
      montar();

      await userEvent.click(await screen.findByRole('button', { name: 'Córner' }));
      await userEvent.click(screen.getByRole('button', { name: 'A favor' }));

      expect(
        await screen.findByText(/No se ha podido guardar en este dispositivo/),
      ).toHaveAttribute('aria-live', 'polite');
      expect(screen.getByRole('button', { name: 'A favor' })).toBeInTheDocument();
    });

    // T-215: lo que ve quien anota mientras el aparato guarda y cuando falla.
    describe('estado de guardado (T-215)', () => {
      const ERROR_DE_DISPOSITIVO =
        'No se ha podido guardar en este dispositivo. No ha cambiado nada: vuelve a intentarlo.';

      /** Deja el guardado a medias y devuelve cómo terminarlo a mano. */
      function guardadoAMedias(): () => void {
        let terminar: () => void = () => undefined;

        api.aplicarTransicion.mockReturnValue(
          new Promise<void>((resolver) => {
            terminar = resolver;
          }),
        );

        return () => {
          terminar();
        };
      }

      it('con el guardado a medias dice «Guardando…», desactiva el paso y no enseña ningún error', async () => {
        api.cargarDirecto.mockResolvedValue(enJuego());
        const terminar = guardadoAMedias();
        montar();

        await userEvent.click(await screen.findByRole('button', { name: 'Córner' }));
        await userEvent.click(screen.getByRole('button', { name: 'A favor' }));

        const flujo = within(screen.getByRole('region', { name: 'Córner' }));

        expect(await flujo.findByText('Guardando…')).toHaveAttribute('aria-live', 'polite');

        for (const boton of flujo.getAllByRole('button')) {
          expect(boton).toBeDisabled();
        }

        expect(screen.queryByText(/No se ha guardado/)).toBeNull();
        expect(screen.queryByText(/No se ha podido guardar/)).toBeNull();

        terminar();
        expect(await screen.findAllByText(/Córner a favor/)).not.toHaveLength(0);
      });

      it('un segundo toque con el guardado a medias no guarda dos veces ni da error', async () => {
        api.cargarDirecto.mockResolvedValue(enJuego());
        const terminar = guardadoAMedias();
        montar();

        await userEvent.click(await screen.findByRole('button', { name: 'Córner' }));
        await userEvent.click(screen.getByRole('button', { name: 'A favor' }));
        await userEvent.click(screen.getByRole('button', { name: 'A favor' }));

        expect(api.aplicarTransicion).toHaveBeenCalledTimes(1);
        expect(screen.queryByText(/No se ha guardado/)).toBeNull();
        expect(screen.queryByText(/No se ha podido guardar/)).toBeNull();

        terminar();

        // La confirmación de 2 s y la línea de «Últimos eventos».
        expect(await screen.findAllByText("Córner a favor · 2'")).toHaveLength(2);
        expect(screen.queryByRole('region', { name: 'Córner' })).toBeNull();
        expect(api.aplicarTransicion).toHaveBeenCalledTimes(1);
      });

      it('si el reglamento dice que no, el motivo se lee en el flujo', async () => {
        api.cargarDirecto.mockResolvedValue(enJuego());
        montar();

        await userEvent.click(await screen.findByRole('button', { name: 'Nota' }));
        await userEvent.click(screen.getByRole('button', { name: 'Del partido' }));
        await userEvent.click(screen.getByRole('button', { name: 'Guardar la nota' }));

        const flujo = within(screen.getByRole('region', { name: 'Nota' }));

        expect(await flujo.findByText('Escribe la nota.')).toHaveAttribute('aria-live', 'polite');
        expect(api.aplicarTransicion).not.toHaveBeenCalled();
      });

      it('si falla el dispositivo, lo dice en el flujo y los botones vuelven a estar activos', async () => {
        api.cargarDirecto.mockResolvedValue(enJuego());
        api.aplicarTransicion.mockRejectedValue(new Error('QuotaExceededError'));
        montar();

        await userEvent.click(await screen.findByRole('button', { name: 'Córner' }));
        await userEvent.click(screen.getByRole('button', { name: 'A favor' }));

        const flujo = within(screen.getByRole('region', { name: 'Córner' }));

        expect(await flujo.findByText(ERROR_DE_DISPOSITIVO)).toHaveAttribute('aria-live', 'polite');

        for (const boton of flujo.getAllByRole('button')) {
          expect(boton).toBeEnabled();
        }

        expect(flujo.queryByText('Guardando…')).toBeNull();
      });

      it('tras fallar el guardado, el foco vuelve a la pregunta del flujo', async () => {
        api.cargarDirecto.mockResolvedValue(enJuego());
        api.aplicarTransicion.mockRejectedValue(new Error('QuotaExceededError'));
        montar();

        await userEvent.click(await screen.findByRole('button', { name: 'Córner' }));
        await userEvent.click(screen.getByRole('button', { name: 'A favor' }));

        await within(screen.getByRole('region', { name: 'Córner' })).findByText(
          ERROR_DE_DISPOSITIVO,
        );

        expect(screen.getByRole('heading', { level: 2, name: /^Córner:/ })).toHaveFocus();
      });

      it('a los 4 s con el guardado a medias, el aviso pasa a «Sigue guardando…»', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });

        try {
          api.cargarDirecto.mockResolvedValue(enJuego());
          guardadoAMedias();
          montar();

          await userEvent.click(await screen.findByRole('button', { name: 'Córner' }));
          await userEvent.click(screen.getByRole('button', { name: 'A favor' }));

          const flujo = within(screen.getByRole('region', { name: 'Córner' }));

          expect(await flujo.findByText('Guardando…')).toBeInTheDocument();

          act(() => {
            vi.advanceTimersByTime(4_000);
          });

          expect(
            await flujo.findByText('Sigue guardando en este dispositivo. No cierres la pantalla.'),
          ).toBeInTheDocument();
        } finally {
          vi.useRealTimers();
        }
      });
    });

    it('la ficha de un jugador se abre con el foco en su título', async () => {
      api.cargarDirecto.mockResolvedValue(enJuego());
      montar();

      await userEvent.click(await screen.findByRole('button', { name: 'Ficha de 7 · Juanito' }));

      expect(
        screen.getByRole('heading', { level: 2, name: '7 · Juanito: ¿qué ha hecho?' }),
      ).toHaveFocus();
    });

    it('sin empezar el partido no hay botonera', async () => {
      api.cargarDirecto.mockResolvedValue(cargado());
      montar();

      await screen.findByText('Sin empezar');

      expect(screen.queryByRole('list', { name: 'Apuntar' })).toBeNull();
    });

    it('en diferido no hay reloj, y cada evento pide su parte y su minuto', async () => {
      const diferido = {
        ...PAQUETE,
        partido: { ...PAQUETE.partido, isRetroactive: true },
      };
      api.cargarDirecto.mockResolvedValue({
        ...cargado(),
        paquete: diferido,
        estado: desdePaquete(diferido),
      });
      montar();

      expect(await screen.findByText(/Partido en diferido: sin reloj/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Empezar la 1ª parte' })).toBeNull();

      await userEvent.click(screen.getByRole('button', { name: 'Córner' }));
      await userEvent.type(screen.getByLabelText(/Minuto/), '50');
      await userEvent.click(screen.getByRole('button', { name: 'Seguir' }));

      expect(
        screen.getByText(/Ese minuto no es de la 1\.ª parte: va de 1 a 40/),
      ).toBeInTheDocument();

      await userEvent.clear(screen.getByLabelText(/Minuto/));
      await userEvent.type(screen.getByLabelText(/Minuto/), '35');
      await userEvent.click(screen.getByRole('button', { name: 'Seguir' }));
      await userEvent.click(screen.getByRole('button', { name: 'A favor' }));

      const { trabajos } = ultimaTransicion();
      expect(trabajos.map((t) => t.entity)).toEqual(['match_period', 'match_event']);
      expect(trabajos[1]?.payload.valores).toMatchObject({
        period: 1,
        seconds: 2_040,
        occurred_at: null,
      });
    });

    describe('resumen del flujo y minuto por parte (T-218)', () => {
      function enDiferido(): DirectoCargado {
        const diferido = { ...PAQUETE, partido: { ...PAQUETE.partido, isRetroactive: true } };

        return { ...cargado(), paquete: diferido, estado: desdePaquete(diferido) };
      }

      async function responderMinuto(parte: string, minuto: string) {
        await userEvent.selectOptions(screen.getByLabelText('Parte'), parte);
        await userEvent.type(screen.getByLabelText(/Minuto/), minuto);
        await userEvent.click(screen.getByRole('button', { name: 'Seguir' }));
      }

      it('en «¿Asistencia?» se lee encima la parte y el minuto, de quién es y quién marcó', async () => {
        api.cargarDirecto.mockResolvedValue(enDiferido());
        montar();

        await userEvent.click(await screen.findByRole('button', { name: 'Gol' }));

        // Recién abierto no hay nada que resumir, y la lista no se pinta.
        expect(screen.queryByRole('list', { name: 'Lo apuntado hasta ahora' })).toBeNull();

        await responderMinuto('2', '55');
        await userEvent.click(screen.getByRole('button', { name: 'Nuestro' }));
        await userEvent.click(screen.getByRole('button', { name: '7 · Juanito' }));

        expect(screen.getByRole('heading', { level: 2, name: 'Gol: ¿Asistencia?' })).toHaveFocus();

        const resumen = screen.getByRole('list', { name: 'Lo apuntado hasta ahora' });
        expect(
          within(resumen)
            .getAllByRole('listitem')
            .map((miga) => miga.textContent),
        ).toEqual(["2.ª parte · 55'", 'Nuestro', '7 · Juanito']);
      });

      it('el selector de la parte dice «1.ª parte» y «2.ª parte»', async () => {
        api.cargarDirecto.mockResolvedValue(enDiferido());
        montar();

        await userEvent.click(await screen.findByRole('button', { name: 'Córner' }));

        expect(
          within(screen.getByLabelText('Parte'))
            .getAllByRole('option')
            .map((opcion) => opcion.textContent),
        ).toEqual(['1.ª parte', '2.ª parte']);
      });

      it('«Sin asistencia» va antes que el primer jugador y guarda el gol sin asistente', async () => {
        api.cargarDirecto.mockResolvedValue(enDiferido());
        montar();

        await userEvent.click(await screen.findByRole('button', { name: 'Gol' }));
        await responderMinuto('1', '10');
        await userEvent.click(screen.getByRole('button', { name: 'Nuestro' }));
        await userEvent.click(screen.getByRole('button', { name: '7 · Juanito' }));

        const saltar = screen.getByRole('button', { name: 'Sin asistencia' });
        const primero = screen.getAllByRole('button', { name: /^\d+ · / })[0];

        expect(primero).toBeDefined();
        expect(
          saltar.compareDocumentPosition(primero as HTMLElement) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();

        await userEvent.click(saltar);

        expect(ultimaTransicion().trabajos.at(-1)?.payload.valores).toMatchObject({
          event_type: 'goal',
          player_id: 'p7',
          secondary_player_id: null,
        });
      });

      it('la ayuda y el error del minuto dicen el rango de la parte elegida', async () => {
        api.cargarDirecto.mockResolvedValue(enDiferido());
        montar();

        await userEvent.click(await screen.findByRole('button', { name: 'Córner' }));

        expect(
          screen.getByText('De 1 a 40, como en el acta. En el descuento, 40+2.'),
        ).toBeInTheDocument();

        await userEvent.selectOptions(screen.getByLabelText('Parte'), '2');

        expect(
          screen.getByText('De 41 a 80, como en el acta. En el descuento, 80+2.'),
        ).toBeInTheDocument();

        await userEvent.type(screen.getByLabelText(/Minuto/), '3');
        await userEvent.click(screen.getByRole('button', { name: 'Seguir' }));

        expect(
          screen.getByText(
            'Ese minuto no es de la 2.ª parte: va de 41 a 80, o 80+2 en el descuento.',
          ),
        ).toBeInTheDocument();
      });

      it('tras guardar un evento de la 2.ª parte, el siguiente flujo abre con ella elegida', async () => {
        api.cargarDirecto.mockResolvedValue(enDiferido());
        montar();

        await userEvent.click(await screen.findByRole('button', { name: 'Córner' }));

        expect(screen.getByLabelText('Parte')).toHaveValue('1');

        await responderMinuto('2', '55');
        await userEvent.click(screen.getByRole('button', { name: 'A favor' }));

        expect(ultimaTransicion().trabajos.at(-1)?.payload.valores).toMatchObject({ period: 2 });

        await userEvent.click(await screen.findByRole('button', { name: 'Córner' }));

        expect(screen.getByLabelText('Parte')).toHaveValue('2');
        expect(
          screen.getByText('De 41 a 80, como en el acta. En el descuento, 80+2.'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('lo que apuntan los demás (T-209b)', () => {
    const INICIO = Date.now() - 60_000;
    const PARTE = {
      id: 'parte-1',
      numero: 1,
      inicio: INICIO,
      pausadoMs: 0,
      pausaDesde: null,
      segundosReales: null,
    };
    const enJuego = (estado: Partial<EstadoDirecto> = {}, refrescado = true) =>
      cargado({ fase: 'en_juego', partes: [PARTE], eventos: [], ...estado }, refrescado);

    function fila(id: string, cambios: Record<string, unknown> = {}): Record<string, unknown> {
      return {
        client_event_id: id,
        event_type: 'goal',
        period: 1,
        seconds: 65,
        is_opponent: false,
        player_id: 'p7',
        secondary_player_id: null,
        details: {},
        status: 'pending',
        ...cambios,
      };
    }

    /** Lo que devuelve `refrescarDirecto`: el partido en juego con esos eventos en el servidor. */
    function refresco(filas: Record<string, unknown>[]): Refresco {
      const paquete: PaqueteDePartido = {
        ...PAQUETE,
        partido: { ...PAQUETE.partido, status: 'live' },
        partes: [
          {
            id: 'parte-1',
            periodNumber: 1,
            plannedSeconds: 2400,
            actualSeconds: null,
            startedAt: new Date(INICIO).toISOString(),
            endedAt: null,
          },
        ],
        eventos: filas,
      };

      return { paquete, servidor: desdePaquete(paquete), desde: 1 };
    }

    /**
     * La cola de verdad, en pequeño: lo que la pantalla guarda entra, y
     * `pendientesDelPartido` lo devuelve. Así la prueba falla si el refresco
     * funde con una lectura de antes del toque.
     */
    function simularCola() {
      const altas = new Set<string>();
      const bajas = new Set<string>();

      api.aplicarTransicion.mockImplementation(
        (
          _estado: EstadoDirecto,
          trabajos: {
            entity: string;
            op: string;
            payload: { valores: Record<string, unknown>; clave?: Record<string, string> };
          }[],
        ) => {
          for (const trabajo of trabajos) {
            if (trabajo.entity === 'match_event' && trabajo.op === 'insert') {
              altas.add(String(trabajo.payload.valores.client_event_id));
            }

            if (trabajo.entity === 'match_event' && trabajo.op === 'delete') {
              bajas.add(String(trabajo.payload.clave?.client_event_id));
            }
          }

          return Promise.resolve();
        },
      );
      sync.pendientesDelPartido.mockImplementation(() =>
        Promise.resolve({ altas: new Set(altas), bajas: new Set(bajas) }),
      );
    }

    /** Vuelve la red: uno de los motivos por los que el directo se refresca. */
    async function llegaUnRefresco() {
      await act(async () => {
        window.dispatchEvent(new Event('online'));
        await Promise.resolve();
      });
    }

    const ultimos = () => screen.getByRole('region', { name: 'Últimos eventos' });

    it('llega un refresco con un gol de otro aparato: el marcador sube y la línea dice «De otro aparato»', async () => {
      api.cargarDirecto.mockResolvedValue(enJuego());
      api.refrescarDirecto.mockResolvedValue(refresco([fila('ajeno')]));
      montar();

      expect(await screen.findByText('0 – 0')).toBeInTheDocument();

      await llegaUnRefresco();

      expect(await screen.findByText('0 – 1')).toBeInTheDocument();
      expect(ultimos()).toHaveTextContent("Gol · 7 · Juanito · 2' · Pendiente · De otro aparato");
      // Lo de otro aparato no se deshace aquí.
      expect(screen.queryByRole('button', { name: /^Deshacer/ })).toBeNull();
      expect(api.refrescarDirecto).toHaveBeenCalledWith('par-1');
      // La cola se mira desde que se pidió la descarga.
      expect(sync.pendientesDelPartido).toHaveBeenCalledWith('par-1', 1);
    });

    it('se apunta un evento mientras el refresco descarga: sigue en pantalla después', async () => {
      api.cargarDirecto.mockResolvedValue(enJuego());
      let llegar = (_refresco: Refresco) => undefined as void;
      api.refrescarDirecto.mockReturnValue(
        new Promise<Refresco>((resolve) => {
          llegar = resolve;
        }),
      );
      simularCola();
      montar();

      await screen.findByRole('button', { name: 'Córner' });
      await llegaUnRefresco();
      expect(api.refrescarDirecto).toHaveBeenCalledTimes(1);

      // El refresco está descargando y el toque entra igual: no hay cerrojo.
      await userEvent.click(screen.getByRole('button', { name: 'Córner' }));
      await userEvent.click(screen.getByRole('button', { name: 'A favor' }));
      expect(await screen.findAllByText("Córner a favor · 2'")).toHaveLength(2);
      expect(api.aplicarTransicion).toHaveBeenCalledTimes(1);

      // Llega la descarga, que se pidió antes del córner y no lo trae.
      await act(async () => {
        llegar(refresco([fila('ajeno')]));
        await Promise.resolve();
      });

      expect(await screen.findByText('0 – 1')).toBeInTheDocument();
      expect(ultimos()).toHaveTextContent("Córner a favor · 2' · Pendiente");
      expect(ultimos()).toHaveTextContent("Gol · 7 · Juanito · 2' · Pendiente · De otro aparato");
      expect(
        screen.getByRole('button', { name: "Deshacer: Córner a favor · 2'" }),
      ).toBeInTheDocument();
    });

    it('se apunta un evento mientras el refresco lee la cola: esa lectura no vale y se repite', async () => {
      api.cargarDirecto.mockResolvedValue(enJuego());
      api.refrescarDirecto.mockResolvedValue(refresco([fila('ajeno')]));
      simularCola();
      // La primera lectura de la cola se queda a medias y, cuando acaba, trae
      // lo de antes del toque: sin el córner.
      let acabarLectura = () => undefined as void;
      sync.pendientesDelPartido.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            acabarLectura = () => {
              resolve({ altas: new Set(), bajas: new Set() });
            };
          }),
      );
      montar();

      await screen.findByRole('button', { name: 'Córner' });
      await llegaUnRefresco();
      expect(sync.pendientesDelPartido).toHaveBeenCalledTimes(1);

      await userEvent.click(screen.getByRole('button', { name: 'Córner' }));
      await userEvent.click(screen.getByRole('button', { name: 'A favor' }));
      expect(await screen.findAllByText("Córner a favor · 2'")).toHaveLength(2);

      await act(async () => {
        acabarLectura();
        await Promise.resolve();
      });

      // Con la lectura vieja no se funde: el gol ajeno todavía no ha entrado.
      expect(screen.getByText('0 – 0')).toBeInTheDocument();

      // Medio segundo después se vuelve a leer la cola, ya con el córner.
      expect(await screen.findByText('0 – 1', undefined, { timeout: 3_000 })).toBeInTheDocument();
      expect(sync.pendientesDelPartido).toHaveBeenCalledTimes(2);
      expect(ultimos()).toHaveTextContent("Córner a favor · 2' · Pendiente");
      expect(
        screen.getByRole('button', { name: "Deshacer: Córner a favor · 2'" }),
      ).toBeInTheDocument();
    });

    it('con un guardado en marcha, el refresco espera a que acabe sin leer la cola ni estorbarlo', async () => {
      api.cargarDirecto.mockResolvedValue(enJuego());
      api.refrescarDirecto.mockResolvedValue(refresco([fila('ajeno')]));
      simularCola();
      const encolar = api.aplicarTransicion.getMockImplementation() as (
        ...argumentos: unknown[]
      ) => Promise<void>;
      let acabarGuardado = () => undefined as void;
      api.aplicarTransicion.mockImplementation(
        (...argumentos: unknown[]) =>
          new Promise<void>((resolve) => {
            acabarGuardado = () => {
              void encolar(...argumentos).then(resolve);
            };
          }),
      );
      montar();

      await userEvent.click(await screen.findByRole('button', { name: 'Córner' }));
      await userEvent.click(screen.getByRole('button', { name: 'A favor' }));
      expect(await screen.findByText('Guardando…')).toBeInTheDocument();

      await llegaUnRefresco();

      expect(api.refrescarDirecto).toHaveBeenCalledTimes(1);
      expect(sync.pendientesDelPartido).not.toHaveBeenCalled();
      expect(screen.getByText('0 – 0')).toBeInTheDocument();

      await act(async () => {
        acabarGuardado();
        await Promise.resolve();
      });

      expect(await screen.findByText('0 – 1', undefined, { timeout: 3_000 })).toBeInTheDocument();
      expect(ultimos()).toHaveTextContent("Córner a favor · 2' · Pendiente");
      expect(ultimos()).toHaveTextContent('De otro aparato');
      expect(api.aplicarTransicion).toHaveBeenCalledTimes(1);
    });

    it('lo deshecho aquí no vuelve con el refresco aunque el servidor todavía lo tenga', async () => {
      api.cargarDirecto.mockResolvedValue(enJuego());
      simularCola();
      montar();

      await userEvent.click(await screen.findByRole('button', { name: 'Córner' }));
      await userEvent.click(screen.getByRole('button', { name: 'En contra' }));
      await userEvent.click(
        await screen.findByRole('button', { name: "Deshacer: Córner en contra · 2'" }),
      );
      expect(await screen.findByText('Todavía no hay nada apuntado.')).toBeInTheDocument();

      // El córner llegó al servidor y su borrado sigue en la cola.
      const [estado, trabajos] = api.aplicarTransicion.mock.calls[0] as [
        EstadoDirecto,
        { payload: { valores: Record<string, unknown> } }[],
      ];
      expect(estado.eventos).toHaveLength(1);
      api.refrescarDirecto.mockResolvedValue(
        refresco([
          fila(String(trabajos[0]?.payload.valores.client_event_id), {
            event_type: 'corner',
            is_opponent: true,
            player_id: null,
          }),
          fila('ajeno'),
        ]),
      );

      await llegaUnRefresco();

      // El gol de otro aparato entra, y es la señal de que el refresco se ha fundido.
      expect(await screen.findByText('0 – 1')).toBeInTheDocument();
      expect(ultimos()).toHaveTextContent('De otro aparato');
      expect(ultimos()).not.toHaveTextContent('Córner en contra');
    });

    it('un evento de otro aparato borrado en el servidor desaparece de la pantalla', async () => {
      const [ajeno] = desdePaquete({ ...PAQUETE, eventos: [fila('ajeno')] }).eventos;
      api.cargarDirecto.mockResolvedValue(enJuego({ eventos: ajeno === undefined ? [] : [ajeno] }));
      api.refrescarDirecto.mockResolvedValue(refresco([]));
      montar();

      expect(await screen.findByText('0 – 1')).toBeInTheDocument();

      await llegaUnRefresco();

      expect(await screen.findByText('0 – 0')).toBeInTheDocument();
      expect(screen.getByText('Todavía no hay nada apuntado.')).toBeInTheDocument();
    });

    it('un gol propio y otro de otro aparato a pocos segundos: «Posible repetido», y se anuncia una vez', async () => {
      api.cargarDirecto.mockResolvedValue(enJuego());
      simularCola();
      const { anunciar } = montar();

      await userEvent.click(await screen.findByRole('button', { name: 'Gol' }));
      await userEvent.click(screen.getByRole('button', { name: 'Nuestro' }));
      await userEvent.click(screen.getByRole('button', { name: '7 · Juanito' }));
      await userEvent.click(screen.getByRole('button', { name: 'Sin asistencia' }));
      expect(await screen.findByText('0 – 1')).toBeInTheDocument();
      expect(ultimos()).not.toHaveTextContent('Posible repetido');

      // Otro aparato apuntó el mismo gol cinco segundos después, a otro jugador.
      api.refrescarDirecto.mockResolvedValue(refresco([fila('ajeno', { player_id: 'p1' })]));
      await llegaUnRefresco();

      expect(await screen.findByText('0 – 2')).toBeInTheDocument();
      const lineas = within(ultimos())
        .getAllByRole('listitem')
        .map((linea) => linea.textContent);
      expect(lineas[0]).toContain(
        "Gol · 1 · Pepe · 2' · Pendiente · De otro aparato · Posible repetido",
      );
      expect(lineas[1]).toContain("Gol · 7 · Juanito · 2' · Pendiente · Posible repetido");
      // El propio se puede deshacer en el sitio.
      expect(
        screen.getByRole('button', { name: "Deshacer: Gol · 7 · Juanito · 2'" }),
      ).toBeInTheDocument();
      expect(anunciar).toHaveBeenCalledWith("Posible repetido: Gol · 1 · Pepe · 2'");

      await llegaUnRefresco();
      await waitFor(() => {
        expect(api.refrescarDirecto).toHaveBeenCalledTimes(2);
      });

      const repetidos = anunciar.mock.calls.filter(([mensaje]) =>
        String(mensaje).startsWith('Posible repetido'),
      );
      expect(repetidos).toHaveLength(1);
      // No roba el foco ni abre nada.
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('los repetidos que ya estaban al abrir se leen en la lista y no se anuncian', async () => {
      const eventos = desdePaquete({
        ...PAQUETE,
        eventos: [fila('uno'), fila('otro', { seconds: 80 }), fila('lejos', { seconds: 400 })],
      }).eventos;
      api.cargarDirecto.mockResolvedValue(enJuego({ eventos }));
      const { anunciar } = montar();

      expect(await screen.findByText('0 – 3')).toBeInTheDocument();
      const lineas = within(ultimos())
        .getAllByRole('listitem')
        .map((linea) => linea.textContent);
      expect(lineas[0]).not.toContain('Posible repetido');
      expect(lineas[1]).toContain('Posible repetido');
      expect(lineas[2]).toContain('Posible repetido');
      expect(anunciar).not.toHaveBeenCalledWith(expect.stringContaining('Posible repetido'));
    });

    it('un refresco que falla se calla: la pantalla sigue igual y sin avisos', async () => {
      api.cargarDirecto.mockResolvedValue(enJuego());
      const { anunciar } = montar();

      await screen.findByRole('button', { name: 'Córner' });
      await llegaUnRefresco();
      await waitFor(() => {
        expect(api.refrescarDirecto).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByText('0 – 0')).toBeInTheDocument();
      expect(screen.queryByText(/No se ha podido/)).toBeNull();
      expect(anunciar).not.toHaveBeenCalled();
      expect(sync.pendientesDelPartido).not.toHaveBeenCalled();
    });

    it('el aviso de «Sin conexión» se quita con el primer refresco que llega al servidor', async () => {
      api.cargarDirecto.mockResolvedValue(enJuego({}, false));
      api.refrescarDirecto.mockResolvedValue(refresco([]));
      montar();

      expect(await screen.findByText(/Sin conexión: el partido sale de lo guardado/)).toBeVisible();

      await llegaUnRefresco();

      await waitFor(() => {
        expect(screen.queryByText(/Sin conexión: el partido sale de lo guardado/)).toBeNull();
      });
    });
  });
});
