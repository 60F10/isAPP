// Pantalla A15 (T-229): la lista de asistencia de un entrenamiento.
//
// La red se sustituye en la frontera de `api/` (DOC 06 §11): la de `training`
// y la de `core`, de donde sale la plantilla. El `localStorage` es el de
// verdad, el de jsdom: ahí viven la partida de la lista y el borrador.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@modules/auth';
import { AnnounceContext } from '@shared/hooks/announceContext';

import { ListaPage } from './ListaPage';

import type { Entrenamiento } from '../model/entrenamiento';
import type { Asistencia, FilaDeAsistencia } from '../model/lista';
import type { AuthState } from '@modules/auth';
import type { LecturaDePlantilla } from '@modules/core';
import type { Session } from '@supabase/supabase-js';

const sesiones = vi.hoisted(() => ({ fetchEntrenamiento: vi.fn() }));
const api = vi.hoisted(() => ({ fetchAsistencia: vi.fn(), guardarAsistencia: vi.fn() }));
const core = vi.hoisted(() => ({ fetchPlantillaDeLectura: vi.fn() }));

vi.mock('../api/entrenamientos', () => sesiones);
vi.mock('../api/asistencia', () => api);
vi.mock('@modules/core/api/plantilla', () => core);
vi.mock('@shared/lib/supabase', () => ({ supabase: {} }));

const CLAVE_PARTIDA = 'sasi.lista-de-partida';
const CLAVE_BORRADOR = 'sasi.lista.ent-1';

const ENTRENAMIENTO: Entrenamiento = {
  id: 'ent-1',
  teamId: 'eq-1',
  seasonId: 'temp-1',
  scheduledAt: new Date(2026, 9, 8, 18, 0).toISOString(),
  location: 'Campo de Fútbol Izquierdo Rodríguez',
  focus: null,
};

// Desordenada a propósito: el orden lo pone `core`, por dorsal.
const PLANTILLA: LecturaDePlantilla[] = [
  { playerId: 'p3', nickname: 'Nano', shirtNumber: 10, defaultPosition: 'FW' },
  { playerId: 'p1', nickname: 'Tito', shirtNumber: 1, defaultPosition: 'GK' },
  { playerId: 'p2', nickname: 'Chicho', shirtNumber: 7, defaultPosition: null },
];

function auth(userId: string): AuthState {
  return {
    session: { user: { id: userId } } as Session,
    cargando: false,
    permisos: new Set(['training.manage']),
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
        permissions: new Set(['training.manage']),
      },
    ],
    activeTeamId: 'eq-1',
    activeSeasonId: 'temp-1',
    setActiveTeam: () => undefined,
    errorContexto: null,
    reintentarContexto: () => undefined,
  };
}

function montar(userId = 'usuario-1') {
  const anunciar = vi.fn();
  const router = createMemoryRouter(
    [
      { path: '/entrenamientos/:id/lista', element: <ListaPage /> },
      { path: '/entrenamientos', element: <h1>Entrenamientos</h1> },
      { path: '/equipo', element: <h1>Mi equipo</h1> },
    ],
    { initialEntries: ['/entrenamientos/ent-1/lista'] },
  );

  const vista = render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AuthContext value={auth(userId)}>
        <AnnounceContext value={{ anunciar }}>
          <RouterProvider router={router} />
        </AnnounceContext>
      </AuthContext>
    </QueryClientProvider>,
  );

  return { anunciar, router, desmontar: vista.unmount };
}

/** El grupo de radios de un jugador, cuando la lista ya está pintada. */
async function asistenciaDe(apodo: string): Promise<HTMLElement> {
  return screen.findByRole('group', { name: `Asistencia de ${apodo}` });
}

function radio(grupo: HTMLElement, nombre: string): HTMLElement {
  return within(grupo).getByRole('radio', { name: nombre });
}

/** Los tres radios del jugador, sin ninguno marcado. */
function sinMarcar(grupo: HTMLElement): boolean {
  return within(grupo)
    .getAllByRole('radio')
    .every((opcion) => !(opcion as HTMLInputElement).checked);
}

/** Lo que la base devolvería al releer tras guardar esas filas. */
function comoGuardadas(filas: readonly FilaDeAsistencia[]): Asistencia[] {
  return filas.map((fila) => ({
    playerId: fila.player_id,
    nickname: PLANTILLA.find((jugador) => jugador.playerId === fila.player_id)?.nickname ?? '—',
    status: fila.status,
    notes: fila.notes,
  }));
}

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
  sesiones.fetchEntrenamiento.mockResolvedValue(ENTRENAMIENTO);
  core.fetchPlantillaDeLectura.mockResolvedValue(PLANTILLA);
  api.fetchAsistencia.mockResolvedValue([]);
  // Guardar bien deja en la base lo guardado: la relectura lo trae.
  api.guardarAsistencia.mockImplementation(
    (_sesion: string, _usuario: string, filas: readonly FilaDeAsistencia[]) => {
      api.fetchAsistencia.mockResolvedValue(comoGuardadas(filas));

      return Promise.resolve();
    },
  );
});

describe('ListaPage · una lista nueva', () => {
  it('con la partida en presentes, sale con todos en «Presente» y el recuento lo dice', async () => {
    montar();

    for (const apodo of ['Tito', 'Chicho', 'Nano']) {
      expect(radio(await asistenciaDe(apodo), 'Presente')).toBeChecked();
    }

    expect(
      screen.getByText('3 presentes · 0 ausentes · 0 retrasos · 0 sin marcar'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('group', { name: 'Una lista nueva empieza con' })).getByRole(
        'radio',
        { name: 'Todos presentes' },
      ),
    ).toBeChecked();
    expect(screen.queryByText(/sin marcar\. Puedes guardar/)).not.toBeInTheDocument();
  });

  it('pinta a los jugadores en el orden de la plantilla, con su dorsal', async () => {
    montar();
    await asistenciaDe('Tito');

    expect(
      screen.getAllByRole('heading', { level: 3 }).map((encabezado) => encabezado.textContent),
    ).toEqual(['1 · Tito', '7 · Chicho', '10 · Nano']);
    expect(core.fetchPlantillaDeLectura).toHaveBeenCalledWith('eq-1', 'temp-1');
    expect(api.fetchAsistencia).toHaveBeenCalledWith('ent-1');
  });

  it('enseña el día, la hora y el lugar del entrenamiento, y el enlace de volver', async () => {
    montar();
    await asistenciaDe('Tito');

    expect(screen.getByRole('heading', { level: 1, name: 'Lista de asistencia' })).toBeVisible();
    expect(screen.getByText(/8 oct · 18:00/)).toBeInTheDocument();
    expect(screen.getByText('Campo de Fútbol Izquierdo Rodríguez')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a entrenamientos' })).toHaveAttribute(
      'href',
      '/entrenamientos',
    );
  });

  it('se lee el aviso de salud', async () => {
    montar();
    await asistenciaDe('Tito');

    expect(
      screen.getByText(
        'Las observaciones son para lo deportivo. No apuntes lesiones ni datos de salud.',
      ),
    ).toBeInTheDocument();
  });

  it('al cambiar a «Todos sin marcar», los no tocados pierden la marca y el tocado la conserva', async () => {
    montar();

    await userEvent.click(radio(await asistenciaDe('Chicho'), 'Retraso'));
    await userEvent.click(screen.getByRole('radio', { name: 'Todos sin marcar' }));

    expect(sinMarcar(await asistenciaDe('Tito'))).toBe(true);
    expect(sinMarcar(await asistenciaDe('Nano'))).toBe(true);
    expect(radio(await asistenciaDe('Chicho'), 'Retraso')).toBeChecked();
    expect(
      screen.getByText('0 presentes · 0 ausentes · 1 retraso · 2 sin marcar'),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem(CLAVE_PARTIDA)).toBe('sin_marcar');
  });

  it('recuerda la partida elegida la próxima vez', async () => {
    window.localStorage.setItem(CLAVE_PARTIDA, 'sin_marcar');
    montar();

    expect(sinMarcar(await asistenciaDe('Tito'))).toBe(true);
    expect(screen.getByRole('radio', { name: 'Todos sin marcar' })).toBeChecked();
  });
});

describe('ListaPage · guardar', () => {
  it('marcar un ausente y guardar manda sus filas y anuncia el recuento', async () => {
    const { anunciar } = montar();

    await userEvent.click(radio(await asistenciaDe('Chicho'), 'Ausente'));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar lista' }));

    expect(await screen.findByText(/^Guardada a las \d{1,2}:\d{2}$/)).toBeInTheDocument();
    expect(api.guardarAsistencia).toHaveBeenCalledTimes(1);
    expect(api.guardarAsistencia).toHaveBeenCalledWith('ent-1', 'usuario-1', [
      { player_id: 'p1', status: 'present', notes: null },
      { player_id: 'p2', status: 'absent', notes: null },
      { player_id: 'p3', status: 'present', notes: null },
    ]);
    expect(anunciar).toHaveBeenCalledWith('Lista guardada: 2 presentes, 1 ausente y 0 retrasos.');
    // Se queda en la pantalla, con lo guardado a la vista, y el foco vuelve al
    // botón, que lo había perdido al desactivarse.
    expect(radio(await asistenciaDe('Chicho'), 'Ausente')).toBeChecked();
    expect(screen.getByRole('button', { name: 'Guardar lista' })).toHaveFocus();
    expect(screen.getByRole('heading', { level: 1, name: 'Lista de asistencia' })).toBeVisible();
  });

  it('con jugadores sin marcar, dice cuántos quedan y guardar no los manda', async () => {
    window.localStorage.setItem(CLAVE_PARTIDA, 'sin_marcar');
    montar();

    await userEvent.click(radio(await asistenciaDe('Tito'), 'Presente'));

    expect(
      screen.getByText('Quedan 2 sin marcar. Puedes guardar y terminar después.'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Guardar lista' }));
    await screen.findByText(/^Guardada a las/);

    expect(api.guardarAsistencia).toHaveBeenCalledWith('ent-1', 'usuario-1', [
      { player_id: 'p1', status: 'present', notes: null },
    ]);
    expect(sinMarcar(await asistenciaDe('Nano'))).toBe(true);
  });

  it('mientras guarda dice «Guardando…» y no responde a otro toque', async () => {
    let soltar: () => void = () => undefined;
    api.guardarAsistencia.mockReturnValue(
      new Promise<void>((resolver) => {
        soltar = resolver;
      }),
    );
    montar();
    await asistenciaDe('Tito');

    await userEvent.click(screen.getByRole('button', { name: 'Guardar lista' }));

    const boton = await screen.findByRole('button', { name: 'Guardando…' });

    expect(boton).toBeDisabled();
    await userEvent.click(boton);
    expect(api.guardarAsistencia).toHaveBeenCalledTimes(1);

    soltar();
    expect(await screen.findByRole('button', { name: 'Guardar lista' })).toBeEnabled();
  });

  it('lo que se marca mientras se guarda no se pierde: queda sin guardar', async () => {
    let soltar: () => void = () => undefined;
    api.guardarAsistencia.mockReturnValue(
      new Promise<void>((resolver) => {
        soltar = resolver;
      }),
    );
    api.fetchAsistencia.mockResolvedValue([]);
    montar();

    await userEvent.click(radio(await asistenciaDe('Chicho'), 'Ausente'));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar lista' }));
    await screen.findByRole('button', { name: 'Guardando…' });
    await userEvent.click(radio(await asistenciaDe('Nano'), 'Retraso'));

    api.fetchAsistencia.mockResolvedValue([
      { playerId: 'p1', nickname: 'Tito', status: 'present', notes: null },
      { playerId: 'p2', nickname: 'Chicho', status: 'absent', notes: null },
      { playerId: 'p3', nickname: 'Nano', status: 'present', notes: null },
    ]);
    soltar();
    await screen.findByText(/^Guardada a las/);

    expect(radio(await asistenciaDe('Nano'), 'Retraso')).toBeChecked();
    expect(screen.getByRole('button', { name: 'Descartar cambios' })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(CLAVE_BORRADOR) ?? 'null')).toEqual({
      userId: 'usuario-1',
      estados: { p3: 'late' },
      observaciones: {},
    });
  });

  it('si guardar falla, se lee el mensaje, lo marcado sigue y el borrador también', async () => {
    api.guardarAsistencia.mockRejectedValue(new Error('se cayó'));
    const { anunciar } = montar();

    await userEvent.click(radio(await asistenciaDe('Chicho'), 'Ausente'));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar lista' }));

    const mensaje = await screen.findByText(
      'No se ha podido guardar. Lo marcado sigue aquí: vuelve a intentarlo.',
    );

    expect(mensaje).toHaveFocus();
    expect(anunciar).toHaveBeenCalledWith(
      'No se ha podido guardar. Lo marcado sigue aquí: vuelve a intentarlo.',
    );
    expect(radio(await asistenciaDe('Chicho'), 'Ausente')).toBeChecked();
    expect(JSON.parse(window.localStorage.getItem(CLAVE_BORRADOR) ?? 'null')).toEqual({
      userId: 'usuario-1',
      estados: { p2: 'absent' },
      observaciones: {},
    });
    expect(screen.queryByText(/^Guardada a las/)).not.toBeInTheDocument();
  });

  it('si se sigue escribiendo mientras guarda, la respuesta no le quita el foco', async () => {
    let soltar: () => void = () => undefined;
    api.guardarAsistencia.mockReturnValue(
      new Promise<void>((resolver) => {
        soltar = resolver;
      }),
    );
    const { anunciar } = montar();
    await asistenciaDe('Tito');

    await userEvent.click(screen.getByRole('button', { name: 'Guardar lista' }));
    await screen.findByRole('button', { name: 'Guardando…' });
    await userEvent.click(screen.getByRole('button', { name: 'Añadir observación: Tito' }));

    const campo = screen.getByRole('textbox', { name: 'Observación de Tito' });

    await userEvent.type(campo, 'Bien');
    soltar();
    await screen.findByText(/^Guardada a las/);

    expect(campo).toHaveFocus();
    expect(campo).toHaveValue('Bien');
    expect(anunciar).toHaveBeenCalledWith('Lista guardada: 3 presentes, 0 ausentes y 0 retrasos.');
  });

  it('si la base dice por qué, se lee su mensaje', async () => {
    api.guardarAsistencia.mockRejectedValue({ code: '42501', message: 'rls' });
    montar();
    await asistenciaDe('Tito');

    await userEvent.click(screen.getByRole('button', { name: 'Guardar lista' }));

    expect(await screen.findByText('No tienes permiso para cambiar esto.')).toHaveFocus();
  });
});

describe('ListaPage · el borrador', () => {
  it('al volver a montar la pantalla con un borrador, lo recupera y lo dice', async () => {
    const primera = montar();

    await userEvent.click(radio(await asistenciaDe('Nano'), 'Retraso'));
    expect(screen.queryByText('Tienes cambios sin guardar de antes.')).not.toBeInTheDocument();
    primera.desmontar();

    montar();

    expect(radio(await asistenciaDe('Nano'), 'Retraso')).toBeChecked();
    expect(screen.getByText('Tienes cambios sin guardar de antes.')).toBeInTheDocument();
  });

  it('tras guardar bien, el borrador ya no está', async () => {
    montar();

    await userEvent.click(radio(await asistenciaDe('Nano'), 'Retraso'));
    expect(window.localStorage.getItem(CLAVE_BORRADOR)).not.toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Guardar lista' }));
    await screen.findByText(/^Guardada a las/);

    expect(window.localStorage.getItem(CLAVE_BORRADOR)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Descartar cambios' })).not.toBeInTheDocument();
  });

  it('si se sale mientras guarda, el borrador no se queda con lo ya guardado', async () => {
    let soltar: () => void = () => undefined;
    api.guardarAsistencia.mockReturnValue(
      new Promise<void>((resolver) => {
        soltar = resolver;
      }),
    );
    const primera = montar();

    await userEvent.click(radio(await asistenciaDe('Nano'), 'Retraso'));
    await userEvent.click(screen.getByRole('button', { name: 'Guardar lista' }));
    await screen.findByRole('button', { name: 'Guardando…' });
    primera.desmontar();

    expect(window.localStorage.getItem(CLAVE_BORRADOR)).not.toBeNull();

    soltar();

    await vi.waitFor(() => {
      expect(window.localStorage.getItem(CLAVE_BORRADOR)).toBeNull();
    });
  });

  it('el borrador de otra cuenta no se recupera', async () => {
    window.localStorage.setItem(
      CLAVE_BORRADOR,
      JSON.stringify({ userId: 'usuario-2', estados: { p3: 'absent' }, observaciones: {} }),
    );
    montar();

    expect(radio(await asistenciaDe('Nano'), 'Presente')).toBeChecked();
    expect(screen.queryByText('Tienes cambios sin guardar de antes.')).not.toBeInTheDocument();
  });

  it('«Descartar cambios» sale solo con cambios, vuelve a lo guardado y borra el borrador', async () => {
    api.fetchAsistencia.mockResolvedValue([
      { playerId: 'p3', nickname: 'Nano', status: 'absent', notes: null },
    ]);
    const { anunciar } = montar();
    await asistenciaDe('Nano');

    expect(screen.queryByRole('button', { name: 'Descartar cambios' })).not.toBeInTheDocument();

    await userEvent.click(radio(await asistenciaDe('Nano'), 'Presente'));
    await userEvent.click(screen.getByRole('button', { name: 'Descartar cambios' }));

    expect(radio(await asistenciaDe('Nano'), 'Ausente')).toBeChecked();
    expect(window.localStorage.getItem(CLAVE_BORRADOR)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Descartar cambios' })).not.toBeInTheDocument();
    expect(anunciar).toHaveBeenCalledWith('Cambios descartados.');
    expect(screen.getByRole('button', { name: 'Guardar lista' })).toHaveFocus();
  });
});

describe('ListaPage · la observación', () => {
  it('«Añadir observación» abre el campo del jugador y lo guarda con su fila', async () => {
    montar();
    await asistenciaDe('Tito');

    await userEvent.click(screen.getByRole('button', { name: 'Añadir observación: Tito' }));

    const campo = screen.getByRole('textbox', { name: 'Observación de Tito' });

    expect(campo).toHaveFocus();
    expect(campo).toHaveAttribute('maxlength', '280');

    await userEvent.type(campo, 'Muy atento');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar lista' }));
    await screen.findByText(/^Guardada a las/);

    expect(api.guardarAsistencia).toHaveBeenCalledWith(
      'ent-1',
      'usuario-1',
      expect.arrayContaining([{ player_id: 'p1', status: 'present', notes: 'Muy atento' }]),
    );
    expect(screen.getByRole('textbox', { name: 'Observación de Tito' })).toHaveValue('Muy atento');
  });

  it('si el jugador ya tiene una, el campo sale abierto', async () => {
    api.fetchAsistencia.mockResolvedValue([
      { playerId: 'p2', nickname: 'Chicho', status: 'late', notes: 'Llegó en guagua' },
    ]);
    montar();
    await asistenciaDe('Chicho');

    expect(screen.getByRole('textbox', { name: 'Observación de Chicho' })).toHaveValue(
      'Llegó en guagua',
    );
    expect(
      screen.queryByRole('button', { name: 'Añadir observación: Chicho' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Añadir observación: Tito' })).toBeInTheDocument();
  });

  it('a un jugador sin marcar le avisa de que no se guarda sola, y no se pierde al guardar', async () => {
    window.localStorage.setItem(CLAVE_PARTIDA, 'sin_marcar');
    montar();
    await asistenciaDe('Tito');

    await userEvent.click(screen.getByRole('button', { name: 'Añadir observación: Tito' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Observación de Tito' }), 'Pendiente');

    expect(screen.getByText('Márcalo para guardar la observación.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Guardar lista' }));
    await screen.findByText(/^Guardada a las/);

    expect(api.guardarAsistencia).toHaveBeenCalledWith('ent-1', 'usuario-1', []);
    expect(screen.getByRole('textbox', { name: 'Observación de Tito' })).toHaveValue('Pendiente');
    expect(screen.getByText('Márcalo para guardar la observación.')).toBeInTheDocument();

    await userEvent.click(radio(await asistenciaDe('Tito'), 'Presente'));

    expect(screen.queryByText('Márcalo para guardar la observación.')).not.toBeInTheDocument();
  });
});

describe('ListaPage · lo que no es la lista', () => {
  it('quien tiene fila y ya no está en la plantilla sale al final, y no se cambia', async () => {
    api.fetchAsistencia.mockResolvedValue([
      { playerId: 'p9', nickname: 'Yeray', status: 'late', notes: 'Vino con el juvenil' },
    ]);
    montar();
    await asistenciaDe('Tito');

    const encabezado = screen.getByRole('heading', { name: 'Ya no están en la plantilla' });
    const seccion = encabezado.closest('section');

    if (seccion === null) {
      throw new Error('La sección de fuera de la plantilla no está.');
    }

    expect(within(seccion).getByText('Yeray')).toBeInTheDocument();
    expect(within(seccion).getByText('Retraso')).toBeInTheDocument();
    expect(within(seccion).getByText('Vino con el juvenil')).toBeInTheDocument();
    expect(within(seccion).queryByRole('radio')).not.toBeInTheDocument();
    expect(within(seccion).queryByRole('textbox')).not.toBeInTheDocument();
    expect(
      screen.getByText('3 presentes · 0 ausentes · 1 retraso · 0 sin marcar'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Guardar lista' }));
    await screen.findByText(/^Guardada a las/);

    // Su fila no viaja: lo que no se puede cambiar no se reescribe.
    expect(api.guardarAsistencia.mock.calls[0][2]).toHaveLength(3);
  });

  it('si el entrenamiento no existe, lo dice y deja volver', async () => {
    sesiones.fetchEntrenamiento.mockResolvedValue(null);
    montar();

    expect(
      await screen.findByText('Ese entrenamiento no existe o no puedes verlo.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a entrenamientos' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar lista' })).not.toBeInTheDocument();
  });

  it('sin jugadores, lo dice y enlaza al equipo', async () => {
    core.fetchPlantillaDeLectura.mockResolvedValue([]);
    montar();

    expect(await screen.findByText('La plantilla no tiene jugadores.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir al equipo' })).toHaveAttribute('href', '/equipo');
    expect(screen.queryByRole('button', { name: 'Guardar lista' })).not.toBeInTheDocument();
  });

  it('si falla la carga, lo dice y «Reintentar» vuelve a pedirla', async () => {
    api.fetchAsistencia.mockRejectedValueOnce(new Error('sin red'));
    montar();

    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));

    expect(radio(await asistenciaDe('Tito'), 'Presente')).toBeChecked();
    expect(api.fetchAsistencia).toHaveBeenCalledTimes(2);
  });
});
