// Pantallas A15a y A15b (T-228): el horario de entrenamientos, «Entrenamiento
// de hoy», y el alta, la edición y el borrado.
//
// La red se sustituye en la frontera de `api/` (DOC 06 §11): la de `training`
// y la de `core`, de donde sale el campo de casa del club.
//
// Las fechas se construyen alrededor del día en que corre la prueba, porque
// «hoy» lo decide el reloj: hoy a mediodía, mañana y ayer.
//
// «Repetir cada semana» (T-230) se prueba con fechas fijas de noviembre de
// 2099, escritas en el campo: el 3, el 10, el 17 y el 24 son martes.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext } from '@modules/auth';
import { AnnounceContext } from '@shared/hooks/announceContext';

import { EditarEntrenamientoPage, NuevoEntrenamientoPage } from './EntrenamientoPage';
import { EntrenamientosPage } from './EntrenamientosPage';

import type { Entrenamiento } from '../model/entrenamiento';
import type { AppPermission, AuthState } from '@modules/auth';
import type { Session } from '@supabase/supabase-js';

const api = vi.hoisted(() => ({
  fetchEntrenamientos: vi.fn(),
  fetchEntrenamiento: vi.fn(),
  crearEntrenamiento: vi.fn(),
  crearEntrenamientos: vi.fn(),
  fetchFinDeTemporada: vi.fn(),
  actualizarEntrenamiento: vi.fn(),
  borrarEntrenamiento: vi.fn(),
}));
const core = vi.hoisted(() => ({ fetchClub: vi.fn() }));

vi.mock('../api/entrenamientos', () => api);
vi.mock('@modules/core/api/clubYEquipos', () => core);
vi.mock('@shared/lib/supabase', () => ({ supabase: {} }));

const CAMPO = 'Campo de Fútbol Izquierdo Rodríguez';
const CLUB = {
  id: 'club-1',
  name: 'C.D. Unión Tejina',
  shortName: null,
  crestUrl: null,
  homeVenue: CAMPO,
  homeVenueAddress: 'Av. Milán, 27-29, 38260 La Laguna, Santa Cruz de Tenerife',
};

const DIA = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const HORA = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });

/** Un día contado desde hoy, a la hora que se diga, en la hora local. */
function dia(desdeHoy: number, horas = 18, minutos = 0): Date {
  const hoy = new Date();

  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + desdeHoy, horas, minutos);
}

/** Como lo escribe la fila: «jue, 8 oct · 18:00». */
function cuando(instante: Date): string {
  return `${DIA.format(instante)} · ${HORA.format(instante)}`;
}

function entrenamiento(
  id: string,
  instante: Date,
  cambios: Partial<Entrenamiento> = {},
): Entrenamiento {
  return {
    id,
    teamId: 'eq-1',
    seasonId: 'temp-1',
    scheduledAt: instante.toISOString(),
    location: CAMPO,
    focus: null,
    ...cambios,
  };
}

function auth(permisos: AppPermission[]): AuthState {
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

function montar(ruta: string, permisos: AppPermission[] = ['training.manage']) {
  const anunciar = vi.fn();
  const router = createMemoryRouter(
    [
      { path: '/entrenamientos', element: <EntrenamientosPage /> },
      { path: '/entrenamientos/nuevo', element: <NuevoEntrenamientoPage /> },
      { path: '/entrenamientos/:id/editar', element: <EditarEntrenamientoPage /> },
      // La lista de asistencia es de la T-229: aquí basta con saber que se llega.
      { path: '/entrenamientos/:id/lista', element: <h1>Lista de asistencia</h1> },
    ],
    { initialEntries: [ruta] },
  );

  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={cliente}>
      <AuthContext value={auth(permisos)}>
        <AnnounceContext value={{ anunciar }}>
          <RouterProvider router={router} />
        </AnnounceContext>
      </AuthContext>
    </QueryClientProvider>,
  );

  return { anunciar, router, cliente };
}

/**
 * Vuelve a pedir todo lo que hay en la caché y espera a que conteste, como
 * cuando el móvil recupera la red con el dato caducado. Si la petición falla,
 * la consulta se queda en error con el dato de antes dentro.
 */
async function releer(cliente: QueryClient): Promise<void> {
  await act(async () => {
    await cliente.invalidateQueries();
    // TanStack Query avisa a React en una tarea aparte: sin esperarla, la
    // pantalla seguiría pintada con el estado de antes y la prueba no vería
    // nada de lo que la relectura cambia.
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
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
  for (const simulada of [...Object.values(api), core.fetchClub]) {
    simulada.mockReset();
  }

  core.fetchClub.mockResolvedValue(CLUB);
  // Sin fin de temporada conocido, salvo que la prueba diga otra cosa.
  api.fetchFinDeTemporada.mockResolvedValue(null);
});

describe('A15a · Entrenamientos', () => {
  it('con training.manage, próximos y pasados, cada fila con «Pasar lista» y «Editar»', async () => {
    const manana = dia(1);
    const ayer = dia(-1);
    api.fetchEntrenamientos.mockResolvedValue([
      entrenamiento('ent-ayer', ayer, { focus: 'Salida de balón' }),
      entrenamiento('ent-manana', manana, { location: 'Campo anexo' }),
    ]);
    montar('/entrenamientos');

    const proximos = await tarjeta('Próximos');
    const pasados = await tarjeta('Pasados');

    expect(api.fetchEntrenamientos).toHaveBeenCalledWith('eq-1', 'temp-1');
    expect(screen.getByRole('heading', { level: 1, name: 'Entrenamientos' })).toBeInTheDocument();

    expect(within(proximos).getByText(cuando(manana))).toBeInTheDocument();
    expect(within(proximos).getByText('Campo anexo')).toBeInTheDocument();
    expect(
      within(proximos).getByRole('link', { name: `Pasar lista: ${cuando(manana)}` }),
    ).toHaveAttribute('href', '/entrenamientos/ent-manana/lista');
    expect(
      within(proximos).getByRole('link', { name: `Editar: ${cuando(manana)}` }),
    ).toHaveAttribute('href', '/entrenamientos/ent-manana/editar');

    expect(within(pasados).getByText(cuando(ayer))).toBeInTheDocument();
    expect(within(pasados).getByText(CAMPO)).toBeInTheDocument();
    expect(within(pasados).getByText('Salida de balón')).toBeInTheDocument();
    expect(
      within(pasados).getByRole('link', { name: `Pasar lista: ${cuando(ayer)}` }),
    ).toHaveAttribute('href', '/entrenamientos/ent-ayer/lista');
    expect(within(pasados).getByRole('link', { name: `Editar: ${cuando(ayer)}` })).toHaveAttribute(
      'href',
      '/entrenamientos/ent-ayer/editar',
    );

    expect(screen.getByRole('link', { name: 'Nuevo entrenamiento' })).toHaveAttribute(
      'href',
      '/entrenamientos/nuevo',
    );
  });

  it('sin training.manage, el mismo horario y ni un botón', async () => {
    const manana = dia(1);
    const ayer = dia(-1);
    api.fetchEntrenamientos.mockResolvedValue([
      entrenamiento('ent-ayer', ayer),
      entrenamiento('ent-manana', manana),
    ]);
    montar('/entrenamientos', []);

    const proximos = await tarjeta('Próximos');
    const pasados = await tarjeta('Pasados');

    expect(within(proximos).getByText(cuando(manana))).toBeInTheDocument();
    expect(within(pasados).getByText(cuando(ayer))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Entrenamiento de hoy' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Nuevo entrenamiento' })).toBeNull();
    expect(screen.queryByRole('link', { name: /Pasar lista/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /Editar/ })).toBeNull();
    // Solo mira: no hace falta el campo de casa, que es para proponer el lugar.
    expect(core.fetchClub).not.toHaveBeenCalled();
  });

  it('sin entrenamientos, lo dice en cada tarjeta', async () => {
    api.fetchEntrenamientos.mockResolvedValue([]);
    montar('/entrenamientos', []);

    expect(
      within(await tarjeta('Próximos')).getByText('No hay entrenamientos programados.'),
    ).toBeInTheDocument();
    expect(
      within(await tarjeta('Pasados')).getByText('Todavía no hay ninguno esta temporada.'),
    ).toBeInTheDocument();
  });

  it('sin ninguno hoy, «Entrenamiento de hoy» crea uno y sale hacia su lista', async () => {
    api.fetchEntrenamientos.mockResolvedValue([entrenamiento('ent-ayer', dia(-1))]);
    api.crearEntrenamiento.mockResolvedValue(entrenamiento('ent-nuevo', new Date()));
    const antes = Date.now();
    const { router } = montar('/entrenamientos');

    await tarjeta('Próximos');
    expect(screen.queryByRole('link', { name: 'Pasar lista de hoy' })).toBeNull();
    // Quien crea necesita el campo de casa del club, por si no hay lugar anterior.
    expect(core.fetchClub).toHaveBeenCalledWith('club-1');

    await userEvent.click(screen.getByRole('button', { name: 'Entrenamiento de hoy' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Lista de asistencia' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/entrenamientos/ent-nuevo/lista');
    expect(api.crearEntrenamiento).toHaveBeenCalledTimes(1);

    const [destino, datos] = api.crearEntrenamiento.mock.calls[0] as [
      unknown,
      { scheduled_at: string; location: string | null; focus: string | null },
    ];
    const instante = new Date(datos.scheduled_at);

    expect(destino).toEqual({ equipoId: 'eq-1', temporadaId: 'temp-1', userId: 'usuario-1' });
    // El lugar del más reciente, que es el de ayer, y sin objetivo.
    expect(datos.location).toBe(CAMPO);
    expect(datos.focus).toBeNull();
    // Ahora mismo, con los segundos a cero.
    expect(instante.getSeconds()).toBe(0);
    expect(instante.getMilliseconds()).toBe(0);
    expect(instante.getTime()).toBeLessThanOrEqual(Date.now());
    expect(instante.getTime()).toBeGreaterThan(antes - 60_000);
  });

  it('con uno hoy, sale «Pasar lista de hoy» y no el botón', async () => {
    api.fetchEntrenamientos.mockResolvedValue([
      entrenamiento('ent-hoy', dia(0, 12)),
      entrenamiento('ent-manana', dia(1)),
    ]);
    montar('/entrenamientos');

    expect(await screen.findByRole('link', { name: 'Pasar lista de hoy' })).toHaveAttribute(
      'href',
      '/entrenamientos/ent-hoy/lista',
    );
    expect(screen.queryByRole('button', { name: 'Entrenamiento de hoy' })).toBeNull();
    // El de hoy es próximo todo el día.
    expect(within(await tarjeta('Próximos')).getAllByRole('listitem')).toHaveLength(2);
  });

  it('si crear el de hoy falla, se lee el mensaje con el foco en él y no se navega', async () => {
    api.fetchEntrenamientos.mockResolvedValue([]);
    api.crearEntrenamiento.mockRejectedValue({ code: '42501', message: 'permission denied' });
    const { anunciar, router } = montar('/entrenamientos');

    await tarjeta('Próximos');
    await userEvent.click(screen.getByRole('button', { name: 'Entrenamiento de hoy' }));

    const mensaje = await screen.findByText('No tienes permiso para cambiar esto.');

    expect(mensaje).toHaveFocus();
    expect(anunciar).toHaveBeenCalledWith('No tienes permiso para cambiar esto.');
    expect(router.state.location.pathname).toBe('/entrenamientos');
    expect(screen.getByRole('button', { name: 'Entrenamiento de hoy' })).toBeEnabled();
  });

  it('con doce pasados se ven diez, y «Ver los 2 anteriores» enseña el resto', async () => {
    api.fetchEntrenamientos.mockResolvedValue(
      Array.from({ length: 12 }, (_, indice) => entrenamiento(`ent-${indice}`, dia(-1 - indice))),
    );
    montar('/entrenamientos', []);

    const pasados = await tarjeta('Pasados');

    expect(within(pasados).getAllByRole('listitem')).toHaveLength(10);
    // Los diez más recientes: el de hace doce días no está.
    expect(within(pasados).getByText(cuando(dia(-1)))).toBeInTheDocument();
    expect(within(pasados).queryByText(cuando(dia(-12)))).toBeNull();

    await userEvent.click(within(pasados).getByRole('button', { name: 'Ver los 2 anteriores' }));

    const filas = within(pasados).getAllByRole('listitem');

    expect(filas).toHaveLength(12);
    expect(within(pasados).getByText(cuando(dia(-12)))).toBeInTheDocument();
    expect(within(pasados).queryByRole('button', { name: /^Ver los/ })).toBeNull();
    // El botón se ha ido: el foco pasa a la primera fila que acaba de salir.
    expect(filas[10]).toHaveFocus();
  });

  it('si la carga falla, deja reintentar', async () => {
    api.fetchEntrenamientos.mockRejectedValueOnce(new Error('sin red'));
    api.fetchEntrenamientos.mockResolvedValue([entrenamiento('ent-manana', dia(1))]);
    montar('/entrenamientos', []);

    expect(
      await screen.findByText(
        'No se han podido cargar los entrenamientos. Suele ser falta de cobertura.',
      ),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(within(await tarjeta('Próximos')).getByText(cuando(dia(1)))).toBeInTheDocument();
  });
});

describe('A15b · Nuevo entrenamiento', () => {
  it('sin hora enseña el error bajo el campo, con el foco en él, y no llama a la base', async () => {
    // Sin ninguno anterior, la hora llega vacía y el lugar es el campo de casa.
    api.fetchEntrenamientos.mockResolvedValue([]);
    const { anunciar } = montar('/entrenamientos/nuevo');

    const datos = await tarjeta('Datos del entrenamiento');
    const hoy = dia(0);
    const dos = (numero: number) => String(numero).padStart(2, '0');

    expect(screen.getByRole('heading', { level: 1, name: 'Nuevo entrenamiento' })).toBeVisible();
    expect(within(datos).getByLabelText(/^Fecha/)).toHaveValue(
      `${hoy.getFullYear()}-${dos(hoy.getMonth() + 1)}-${dos(hoy.getDate())}`,
    );
    expect(within(datos).getByLabelText(/^Hora/)).toHaveValue('');
    expect(within(datos).getByLabelText(/^Lugar/)).toHaveValue(CAMPO);

    await userEvent.click(within(datos).getByRole('button', { name: 'Guardar entrenamiento' }));

    expect(within(datos).getByText('Escribe la hora.')).toBeInTheDocument();
    expect(within(datos).getByLabelText(/^Hora/)).toHaveAttribute('aria-invalid', 'true');
    expect(within(datos).getByLabelText(/^Hora/)).toHaveFocus();
    expect(anunciar).toHaveBeenCalledWith('Revisa los campos marcados');
    expect(api.crearEntrenamiento).not.toHaveBeenCalled();
  });

  it('propone la hora y el lugar del más reciente, guarda y vuelve a la lista', async () => {
    api.fetchEntrenamientos.mockResolvedValue([
      entrenamiento('ent-ayer', dia(-1, 18, 30), { location: 'Campo anexo' }),
    ]);
    api.crearEntrenamiento.mockResolvedValue(entrenamiento('ent-nuevo', dia(5, 18, 30)));
    const { anunciar } = montar('/entrenamientos/nuevo');

    const datos = await tarjeta('Datos del entrenamiento');

    expect(within(datos).getByLabelText(/^Hora/)).toHaveValue('18:30');
    expect(within(datos).getByLabelText(/^Lugar/)).toHaveValue('Campo anexo');

    await userEvent.clear(within(datos).getByLabelText(/^Fecha/));
    await userEvent.type(within(datos).getByLabelText(/^Fecha/), '2099-11-08');
    await userEvent.type(within(datos).getByLabelText(/^Objetivo de la sesión/), 'Presión alta');
    await userEvent.click(within(datos).getByRole('button', { name: 'Guardar entrenamiento' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Entrenamientos' }),
    ).toBeInTheDocument();
    expect(api.crearEntrenamiento).toHaveBeenCalledWith(
      { equipoId: 'eq-1', temporadaId: 'temp-1', userId: 'usuario-1' },
      {
        scheduled_at: new Date(2099, 10, 8, 18, 30).toISOString(),
        location: 'Campo anexo',
        focus: 'Presión alta',
      },
    );
    expect(anunciar).toHaveBeenCalledWith('Entrenamiento guardado.');
  });

  it('si guardar falla, lo dice y el formulario sigue abierto con lo escrito', async () => {
    api.fetchEntrenamientos.mockResolvedValue([entrenamiento('ent-ayer', dia(-1))]);
    api.crearEntrenamiento.mockRejectedValue(new TypeError('Failed to fetch'));
    const { anunciar } = montar('/entrenamientos/nuevo');

    const datos = await tarjeta('Datos del entrenamiento');
    await userEvent.type(within(datos).getByLabelText(/^Objetivo de la sesión/), 'Presión alta');
    await userEvent.click(within(datos).getByRole('button', { name: 'Guardar entrenamiento' }));

    const mensaje = await within(datos).findByText(
      'No hay conexión. No se ha guardado nada: vuelve a intentarlo con cobertura.',
    );

    expect(mensaje).toHaveFocus();
    expect(anunciar).toHaveBeenCalledWith(
      'No hay conexión. No se ha guardado nada: vuelve a intentarlo con cobertura.',
    );
    expect(within(datos).getByLabelText(/^Objetivo de la sesión/)).toHaveValue('Presión alta');
    expect(screen.getByRole('heading', { level: 1, name: 'Nuevo entrenamiento' })).toBeVisible();
  });

  it('si una relectura falla con el alta abierta, el formulario sigue con lo escrito (T-234)', async () => {
    api.fetchEntrenamientos.mockResolvedValue([entrenamiento('ent-ayer', dia(-1))]);
    const { cliente } = montar('/entrenamientos/nuevo');

    const datos = await tarjeta('Datos del entrenamiento');
    await userEvent.type(within(datos).getByLabelText(/^Objetivo de la sesión/), 'Presión alta');

    // La cobertura se va: el horario y el club se vuelven a pedir y fallan.
    api.fetchEntrenamientos.mockRejectedValue(new TypeError('Failed to fetch'));
    core.fetchClub.mockRejectedValue(new TypeError('Failed to fetch'));
    await releer(cliente);

    expect(api.fetchEntrenamientos).toHaveBeenCalledTimes(2);
    expect(core.fetchClub).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/^No se ha podido cargar/)).toBeNull();
    expect(screen.getByLabelText(/^Objetivo de la sesión/)).toHaveValue('Presión alta');
    expect(screen.getByRole('button', { name: 'Guardar entrenamiento' })).toBeEnabled();
  });
});

describe('A15b · Nuevo entrenamiento, repetir cada semana', () => {
  const DESTINO = { equipoId: 'eq-1', temporadaId: 'temp-1', userId: 'usuario-1' };

  /** Un martes de noviembre de 2099, a las 18:00 en la hora local. */
  function martes(diaDelMes: number): Date {
    return new Date(2099, 10, diaDelMes, 18, 0);
  }

  /**
   * Abre el alta con la hora de las 18:00 propuesta, escribe el 3 de noviembre
   * de 2099 en la fecha y marca «Repetir cada semana».
   */
  async function abrirRepitiendo(existentes: Entrenamiento[] = []) {
    api.fetchEntrenamientos.mockResolvedValue([entrenamiento('ent-ayer', dia(-1)), ...existentes]);
    api.fetchFinDeTemporada.mockResolvedValue('2099-11-26');
    const montado = montar('/entrenamientos/nuevo');
    const datos = await tarjeta('Datos del entrenamiento');

    await userEvent.clear(within(datos).getByLabelText(/^Fecha/));
    await userEvent.type(within(datos).getByLabelText(/^Fecha/), '2099-11-03');
    await userEvent.click(within(datos).getByRole('checkbox', { name: 'Repetir cada semana' }));

    return { ...montado, datos };
  }

  it('sin marcar la casilla, el alta es la de siempre y llama a `crearEntrenamiento`', async () => {
    api.fetchEntrenamientos.mockResolvedValue([entrenamiento('ent-ayer', dia(-1))]);
    api.crearEntrenamiento.mockResolvedValue(entrenamiento('ent-nuevo', martes(3)));
    const { anunciar } = montar('/entrenamientos/nuevo');

    const datos = await tarjeta('Datos del entrenamiento');

    expect(within(datos).getByRole('checkbox', { name: 'Repetir cada semana' })).not.toBeChecked();
    expect(within(datos).queryByRole('group', { name: 'Días' })).toBeNull();
    expect(within(datos).queryByLabelText(/^Hasta/)).toBeNull();
    expect(within(datos).queryByLabelText(/^Desde/)).toBeNull();

    await userEvent.clear(within(datos).getByLabelText(/^Fecha/));
    await userEvent.type(within(datos).getByLabelText(/^Fecha/), '2099-11-03');
    await userEvent.click(within(datos).getByRole('button', { name: 'Guardar entrenamiento' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Entrenamientos' }),
    ).toBeInTheDocument();
    expect(api.crearEntrenamiento).toHaveBeenCalledWith(DESTINO, {
      scheduled_at: martes(3).toISOString(),
      location: CAMPO,
      focus: null,
    });
    expect(api.crearEntrenamientos).not.toHaveBeenCalled();
    expect(anunciar).toHaveBeenCalledWith('Entrenamiento guardado.');
  });

  it('la edición no ofrece repetir', async () => {
    api.fetchEntrenamiento.mockResolvedValue(entrenamiento('ent-1', dia(1)));
    montar('/entrenamientos/ent-1/editar');

    const datos = await tarjeta('Datos del entrenamiento');

    expect(within(datos).queryByRole('checkbox', { name: 'Repetir cada semana' })).toBeNull();
    expect(api.fetchFinDeTemporada).not.toHaveBeenCalled();
  });

  it('al marcarla sale marcado el día de «Desde», y el resumen dice cuántos se van a crear', async () => {
    const { datos } = await abrirRepitiendo();

    // «Fecha» pasa a llamarse «Desde», con lo que tenía escrito.
    expect(within(datos).queryByLabelText(/^Fecha/)).toBeNull();
    expect(within(datos).getByLabelText(/^Desde/)).toHaveValue('2099-11-03');

    const dias = within(datos).getByRole('group', { name: 'Días' });

    expect(within(dias).getAllByRole('checkbox')).toHaveLength(7);
    expect(within(dias).getByRole('checkbox', { name: 'Martes' })).toBeChecked();

    for (const nombre of ['Lunes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']) {
      expect(within(dias).getByRole('checkbox', { name: nombre })).not.toBeChecked();
    }

    // «Hasta» trae el fin de la temporada.
    expect(within(datos).getByLabelText(/^Hasta/)).toHaveValue('2099-11-26');

    const resumen = within(datos).getByText(
      `Se van a crear 4 entrenamientos, del ${DIA.format(martes(3))} al ${DIA.format(martes(24))}.`,
    );

    expect(resumen).toHaveAttribute('aria-live', 'polite');
    expect(within(datos).getByRole('button', { name: 'Crear 4 entrenamientos' })).toBeEnabled();
    expect(within(datos).queryByRole('button', { name: 'Guardar entrenamiento' })).toBeNull();
  });

  it('el resumen se recalcula con cada cambio, y cambiar «Desde» no toca los días', async () => {
    const { datos } = await abrirRepitiendo();
    const dias = within(datos).getByRole('group', { name: 'Días' });

    // Con los jueves: 5, 12, 19 y 26, que es el último día y entra.
    await userEvent.click(within(dias).getByRole('checkbox', { name: 'Jueves' }));

    expect(
      within(datos).getByText(
        `Se van a crear 8 entrenamientos, del ${DIA.format(martes(3))} al ${DIA.format(new Date(2099, 10, 26, 18, 0))}.`,
      ),
    ).toBeInTheDocument();

    await userEvent.clear(within(datos).getByLabelText(/^Hasta/));
    await userEvent.type(within(datos).getByLabelText(/^Hasta/), '2099-11-03');

    expect(
      within(datos).getByText(`Se va a crear 1 entrenamiento, el ${DIA.format(martes(3))}.`),
    ).toBeInTheDocument();
    expect(within(datos).getByRole('button', { name: 'Crear 1 entrenamiento' })).toBeEnabled();

    // El 4 es miércoles: los días siguen siendo martes y jueves.
    await userEvent.clear(within(datos).getByLabelText(/^Desde/));
    await userEvent.type(within(datos).getByLabelText(/^Desde/), '2099-11-04');

    expect(within(dias).getByRole('checkbox', { name: 'Martes' })).toBeChecked();
    expect(within(dias).getByRole('checkbox', { name: 'Jueves' })).toBeChecked();
    expect(within(dias).getByRole('checkbox', { name: 'Miércoles' })).not.toBeChecked();
  });

  it('con uno que ya existe, el resumen lo dice y `crearEntrenamientos` no lo recibe', async () => {
    api.crearEntrenamientos.mockResolvedValue(3);
    const { datos } = await abrirRepitiendo([entrenamiento('ent-10', martes(10))]);

    expect(
      within(datos).getByText(
        `Se van a crear 3 entrenamientos, del ${DIA.format(martes(3))} al ${DIA.format(martes(24))}. 1 ya existe y no se repite.`,
      ),
    ).toBeInTheDocument();

    await userEvent.type(within(datos).getByLabelText(/^Objetivo de la sesión/), 'Presión alta');
    await userEvent.click(within(datos).getByRole('button', { name: 'Crear 3 entrenamientos' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Entrenamientos' }),
    ).toBeInTheDocument();
    expect(api.crearEntrenamientos).toHaveBeenCalledTimes(1);
    // El lugar y el objetivo, los del formulario, iguales en todos. El del 10 no va.
    expect(api.crearEntrenamientos).toHaveBeenCalledWith(
      DESTINO,
      [martes(3), martes(17), martes(24)].map((instante) => ({
        scheduled_at: instante.toISOString(),
        location: CAMPO,
        focus: 'Presión alta',
      })),
    );
    expect(api.crearEntrenamiento).not.toHaveBeenCalled();
  });

  it('si ya existen todos, lo dice, no ofrece crear ninguno y no llama a la base', async () => {
    const { datos, anunciar } = await abrirRepitiendo(
      [3, 10, 17, 24].map((diaDelMes) => entrenamiento(`ent-${diaDelMes}`, martes(diaDelMes))),
    );

    expect(
      within(datos).getByText('No se va a crear ninguno. 4 ya existen y no se repiten.'),
    ).toBeInTheDocument();

    await userEvent.click(within(datos).getByRole('button', { name: 'Crear entrenamientos' }));

    expect(within(datos).getByText('No hay ninguno que crear en esas fechas.')).toBeInTheDocument();
    expect(within(datos).getByLabelText(/^Hasta/)).toHaveAttribute('aria-invalid', 'true');
    expect(within(datos).getByLabelText(/^Hasta/)).toHaveFocus();
    expect(anunciar).toHaveBeenCalledWith('Revisa los campos marcados');
    expect(api.crearEntrenamientos).not.toHaveBeenCalled();
  });

  it('sin ningún día, se lee el error en el grupo y no se llama a la base', async () => {
    const { datos, anunciar } = await abrirRepitiendo();
    const dias = within(datos).getByRole('group', { name: 'Días' });

    await userEvent.click(within(dias).getByRole('checkbox', { name: 'Martes' }));
    await userEvent.click(within(datos).getByRole('button', { name: 'Crear entrenamientos' }));

    expect(within(dias).getByText('Elige al menos un día.')).toBeInTheDocument();
    expect(dias).toHaveAccessibleDescription('Elige al menos un día.');
    // El foco, a la primera casilla del grupo, que es donde se arregla.
    expect(within(dias).getByRole('checkbox', { name: 'Lunes' })).toHaveFocus();
    expect(anunciar).toHaveBeenCalledWith('Revisa los campos marcados');
    expect(api.crearEntrenamientos).not.toHaveBeenCalled();
    expect(api.crearEntrenamiento).not.toHaveBeenCalled();
  });

  it('el error se va al arreglarlo, sin esperar a otro envío', async () => {
    const { datos } = await abrirRepitiendo();
    const dias = within(datos).getByRole('group', { name: 'Días' });

    await userEvent.click(within(dias).getByRole('checkbox', { name: 'Martes' }));
    await userEvent.click(within(datos).getByRole('button', { name: 'Crear entrenamientos' }));

    expect(within(dias).getByText('Elige al menos un día.')).toBeInTheDocument();

    await userEvent.click(within(dias).getByRole('checkbox', { name: 'Martes' }));

    // El resumen ya dice que se crean cuatro: el error no puede seguir ahí.
    expect(within(dias).queryByText('Elige al menos un día.')).toBeNull();
    expect(dias).not.toHaveAttribute('aria-describedby');
    expect(within(datos).getByRole('button', { name: 'Crear 4 entrenamientos' })).toBeEnabled();
  });

  it('con más de 150, el resumen lo dice en vez de prometerlos, y no se llama a la base', async () => {
    api.fetchEntrenamientos.mockResolvedValue([entrenamiento('ent-ayer', dia(-1))]);
    montar('/entrenamientos/nuevo');

    const datos = await tarjeta('Datos del entrenamiento');

    await userEvent.clear(within(datos).getByLabelText(/^Fecha/));
    await userEvent.type(within(datos).getByLabelText(/^Fecha/), '2099-01-01');
    await userEvent.click(within(datos).getByRole('checkbox', { name: 'Repetir cada semana' }));

    const dias = within(datos).getByRole('group', { name: 'Días' });

    for (const nombre of [
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
      'Domingo',
    ]) {
      if (!within(dias).getByRole<HTMLInputElement>('checkbox', { name: nombre }).checked) {
        await userEvent.click(within(dias).getByRole('checkbox', { name: nombre }));
      }
    }

    // Del 1 de enero al 31 de mayo, todos los días: 151.
    await userEvent.type(within(datos).getByLabelText(/^Hasta/), '2099-05-31');

    expect(within(datos).getByText('Son demasiados de una vez: como mucho, 150.')).toHaveAttribute(
      'aria-live',
      'polite',
    );

    await userEvent.click(within(datos).getByRole('button', { name: 'Crear entrenamientos' }));

    expect(within(datos).getByLabelText(/^Hasta/)).toHaveAttribute('aria-invalid', 'true');
    expect(within(datos).getByLabelText(/^Hasta/)).toHaveAccessibleDescription(
      'Son demasiados de una vez: como mucho, 150.',
    );
    expect(api.crearEntrenamientos).not.toHaveBeenCalled();

    // Con un día menos caben.
    await userEvent.clear(within(datos).getByLabelText(/^Hasta/));
    await userEvent.type(within(datos).getByLabelText(/^Hasta/), '2099-05-30');

    expect(within(datos).getByRole('button', { name: 'Crear 150 entrenamientos' })).toBeEnabled();
    expect(within(datos).getByLabelText(/^Hasta/)).not.toHaveAttribute('aria-invalid');
  });

  it('el resumen es una región viva que está desde antes de marcar la casilla', async () => {
    api.fetchEntrenamientos.mockResolvedValue([entrenamiento('ent-ayer', dia(-1))]);
    montar('/entrenamientos/nuevo');

    const datos = await tarjeta('Datos del entrenamiento');
    const viva = datos.querySelector('[aria-live="polite"]');

    expect(viva).toBeEmptyDOMElement();

    await userEvent.clear(within(datos).getByLabelText(/^Fecha/));
    await userEvent.type(within(datos).getByLabelText(/^Fecha/), '2099-11-03');
    await userEvent.click(within(datos).getByRole('checkbox', { name: 'Repetir cada semana' }));
    await userEvent.type(within(datos).getByLabelText(/^Hasta/), '2099-11-10');

    // Es el mismo elemento, que ha cambiado de texto.
    expect(viva).toHaveTextContent(/^Se van a crear 2 entrenamientos/);

    await userEvent.click(within(datos).getByRole('checkbox', { name: 'Repetir cada semana' }));

    expect(viva).toBeEmptyDOMElement();
    expect(within(datos).getByRole('button', { name: 'Guardar entrenamiento' })).toBeEnabled();
  });

  it('con «Hasta» pasada la temporada, lo dice bajo su campo', async () => {
    const { datos } = await abrirRepitiendo();

    await userEvent.clear(within(datos).getByLabelText(/^Hasta/));
    await userEvent.type(within(datos).getByLabelText(/^Hasta/), '2099-12-01');
    await userEvent.click(within(datos).getByRole('button', { name: 'Crear entrenamientos' }));

    expect(
      within(datos).getByText('La temporada termina el 26 de noviembre de 2099.'),
    ).toBeInTheDocument();
    expect(within(datos).getByLabelText(/^Hasta/)).toHaveFocus();
    expect(api.crearEntrenamientos).not.toHaveBeenCalled();
  });

  it('sin fin de temporada conocido, «Hasta» llega vacía y se puede escribir', async () => {
    api.fetchEntrenamientos.mockResolvedValue([entrenamiento('ent-ayer', dia(-1))]);
    api.fetchFinDeTemporada.mockRejectedValue({ code: '42501', message: 'permission denied' });
    montar('/entrenamientos/nuevo');

    const datos = await tarjeta('Datos del entrenamiento');

    await userEvent.clear(within(datos).getByLabelText(/^Fecha/));
    await userEvent.type(within(datos).getByLabelText(/^Fecha/), '2099-11-03');
    await userEvent.click(within(datos).getByRole('checkbox', { name: 'Repetir cada semana' }));

    expect(within(datos).getByLabelText(/^Hasta/)).toHaveValue('');
    expect(within(datos).getByRole('button', { name: 'Crear entrenamientos' })).toBeEnabled();

    await userEvent.type(within(datos).getByLabelText(/^Hasta/), '2099-11-10');

    expect(within(datos).getByRole('button', { name: 'Crear 2 entrenamientos' })).toBeEnabled();
  });

  it('al guardar se anuncia cuántos se crearon y se vuelve a la lista', async () => {
    api.crearEntrenamientos.mockResolvedValue(4);
    const { datos, anunciar, router } = await abrirRepitiendo();

    await userEvent.click(within(datos).getByRole('button', { name: 'Crear 4 entrenamientos' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Entrenamientos' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/entrenamientos');
    expect(anunciar).toHaveBeenCalledWith('4 entrenamientos creados.');
    expect(api.crearEntrenamientos).toHaveBeenCalledWith(
      DESTINO,
      [martes(3), martes(10), martes(17), martes(24)].map((instante) => ({
        scheduled_at: instante.toISOString(),
        location: CAMPO,
        focus: null,
      })),
    );
  });

  it('si falla, lo dice con el foco en el mensaje y el formulario sigue como estaba', async () => {
    api.crearEntrenamientos.mockRejectedValue(new TypeError('Failed to fetch'));
    const { datos, anunciar } = await abrirRepitiendo();

    await userEvent.click(within(datos).getByRole('button', { name: 'Crear 4 entrenamientos' }));

    const mensaje = await within(datos).findByText(
      'No hay conexión. No se ha guardado nada: vuelve a intentarlo con cobertura.',
    );

    expect(mensaje).toHaveFocus();
    expect(anunciar).toHaveBeenCalledWith(
      'No hay conexión. No se ha guardado nada: vuelve a intentarlo con cobertura.',
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Nuevo entrenamiento' })).toBeVisible();
    expect(within(datos).getByRole('checkbox', { name: 'Repetir cada semana' })).toBeChecked();
    expect(within(datos).getByLabelText(/^Hasta/)).toHaveValue('2099-11-26');
    expect(within(datos).getByRole('button', { name: 'Crear 4 entrenamientos' })).toBeEnabled();
  });
});

describe('A15b · Editar entrenamiento', () => {
  it('trae lo guardado, guarda y vuelve a la lista', async () => {
    const guardado = entrenamiento('ent-1', new Date(2099, 9, 13, 18, 0), {
      focus: 'Salida de balón',
    });
    api.fetchEntrenamientos.mockResolvedValue([guardado]);
    api.fetchEntrenamiento.mockResolvedValue(guardado);
    api.actualizarEntrenamiento.mockResolvedValue(guardado);
    const { anunciar } = montar('/entrenamientos/ent-1/editar');

    const datos = await tarjeta('Datos del entrenamiento');

    expect(api.fetchEntrenamiento).toHaveBeenCalledWith('ent-1');
    expect(screen.getByRole('heading', { level: 1, name: 'Editar entrenamiento' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Volver a entrenamientos' })).toHaveAttribute(
      'href',
      '/entrenamientos',
    );
    expect(within(datos).getByLabelText(/^Fecha/)).toHaveValue('2099-10-13');
    expect(within(datos).getByLabelText(/^Hora/)).toHaveValue('18:00');
    expect(within(datos).getByLabelText(/^Lugar/)).toHaveValue(CAMPO);
    expect(within(datos).getByLabelText(/^Objetivo de la sesión/)).toHaveValue('Salida de balón');

    await userEvent.clear(within(datos).getByLabelText(/^Hora/));
    await userEvent.type(within(datos).getByLabelText(/^Hora/), '19:30');
    await userEvent.clear(within(datos).getByLabelText(/^Lugar/));
    await userEvent.click(within(datos).getByRole('button', { name: 'Guardar cambios' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Entrenamientos' }),
    ).toBeInTheDocument();
    expect(api.actualizarEntrenamiento).toHaveBeenCalledWith('ent-1', {
      scheduled_at: new Date(2099, 9, 13, 19, 30).toISOString(),
      location: null,
      focus: 'Salida de balón',
    });
    expect(anunciar).toHaveBeenCalledWith('Entrenamiento guardado.');
  });

  it('borrar pregunta antes, y «No, dejarlo» no borra y devuelve el foco', async () => {
    api.fetchEntrenamiento.mockResolvedValue(entrenamiento('ent-1', dia(1)));
    montar('/entrenamientos/ent-1/editar');

    const borrar = await tarjeta('Borrar');
    await userEvent.click(within(borrar).getByRole('button', { name: 'Borrar entrenamiento' }));

    expect(
      within(borrar).getByText(
        '¿Borrar este entrenamiento? Se borra también su lista de asistencia. No se puede deshacer.',
      ),
    ).toHaveFocus();
    expect(api.borrarEntrenamiento).not.toHaveBeenCalled();

    await userEvent.click(within(borrar).getByRole('button', { name: 'No, dejarlo' }));

    expect(api.borrarEntrenamiento).not.toHaveBeenCalled();
    expect(within(borrar).getByRole('button', { name: 'Borrar entrenamiento' })).toHaveFocus();
    expect(within(borrar).queryByRole('button', { name: 'Sí, borrar' })).toBeNull();
  });

  it('«Sí, borrar» borra y vuelve a la lista', async () => {
    // Como la base: una vez borrado, ya no se puede leer.
    api.fetchEntrenamiento.mockResolvedValueOnce(entrenamiento('ent-1', dia(1)));
    api.fetchEntrenamiento.mockResolvedValue(null);
    api.fetchEntrenamientos.mockResolvedValue([]);
    api.borrarEntrenamiento.mockResolvedValue(undefined);
    const { anunciar } = montar('/entrenamientos/ent-1/editar');

    const borrar = await tarjeta('Borrar');
    await userEvent.click(within(borrar).getByRole('button', { name: 'Borrar entrenamiento' }));
    await userEvent.click(within(borrar).getByRole('button', { name: 'Sí, borrar' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Entrenamientos' }),
    ).toBeInTheDocument();
    expect(api.borrarEntrenamiento).toHaveBeenCalledWith('ent-1');
    expect(anunciar).toHaveBeenCalledWith('Entrenamiento borrado.');
  });

  it('si una relectura falla con la edición abierta, el formulario sigue con lo escrito (T-234)', async () => {
    api.fetchEntrenamiento.mockResolvedValue(entrenamiento('ent-1', dia(1)));
    const { cliente } = montar('/entrenamientos/ent-1/editar');

    const datos = await tarjeta('Datos del entrenamiento');
    await userEvent.type(within(datos).getByLabelText(/^Objetivo de la sesión/), 'Salida de balón');

    api.fetchEntrenamiento.mockRejectedValue(new TypeError('Failed to fetch'));
    await releer(cliente);

    expect(api.fetchEntrenamiento).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/^No se ha podido cargar/)).toBeNull();
    expect(screen.getByLabelText(/^Objetivo de la sesión/)).toHaveValue('Salida de balón');
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Borrar entrenamiento' })).toBeInTheDocument();
  });

  it('si la primera carga falla, lo dice y deja reintentar (T-234)', async () => {
    api.fetchEntrenamiento.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    api.fetchEntrenamiento.mockResolvedValue(entrenamiento('ent-1', dia(1)));
    montar('/entrenamientos/ent-1/editar');

    expect(
      await screen.findByText(
        'No se ha podido cargar el entrenamiento. Suele ser falta de cobertura.',
      ),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await tarjeta('Datos del entrenamiento')).toBeInTheDocument();
  });

  it('si no existe o no se puede ver, lo dice y deja volver', async () => {
    api.fetchEntrenamiento.mockResolvedValue(null);
    montar('/entrenamientos/ent-9/editar');

    expect(
      await screen.findByText('Ese entrenamiento no existe o no puedes verlo.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a entrenamientos' })).toHaveAttribute(
      'href',
      '/entrenamientos',
    );
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Borrar entrenamiento' })).toBeNull();
  });
});
