// Pantallas A15a y A15b (T-228): el horario de entrenamientos, «Entrenamiento
// de hoy», y el alta, la edición y el borrado.
//
// La red se sustituye en la frontera de `api/` (DOC 06 §11): la de `training`
// y la de `core`, de donde sale el campo de casa del club.
//
// Las fechas se construyen alrededor del día en que corre la prueba, porque
// «hoy» lo decide el reloj: hoy a mediodía, mañana y ayer.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
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

  return { anunciar, router };
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
