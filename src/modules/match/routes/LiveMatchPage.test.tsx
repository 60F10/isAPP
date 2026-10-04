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
import type { AppPermission, AuthState } from '@modules/auth';
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

function montar(permisos?: AppPermission[]) {
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

      expect(screen.getByText(/Ese minuto no es de esa parte/)).toBeInTheDocument();

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
  });
});
