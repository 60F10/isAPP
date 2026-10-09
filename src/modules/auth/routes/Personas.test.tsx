// Pantalla A07 (T-301b): miembros, permisos e invitaciones. Desde la T-301c,
// también las solicitudes de permisos, los seguidores y la casilla de la lista.
//
// La red se sustituye en la frontera de `api/` (DOC 06 §11).

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnnounceContext } from '@shared/hooks/announceContext';

import { AuthContext } from '../hooks/authContext';
import { authKeys } from '../api/queryKeys';
import { GUARDADO_A_MEDIAS, PERMISOS, PLANTILLAS_DE_ROL } from '../model/personas';
import { PersonasPage } from './PersonasPage';

import type { AuthState } from '../hooks/authContext';
import type { Invitacion, Miembro } from '../model/personas';
import type { AppPermission } from '../model/permissions';
import type { Seguidor, SolicitudRecibida } from '../model/solicitudes';
import type { Session } from '@supabase/supabase-js';

const api = vi.hoisted(() => ({
  fetchMiembros: vi.fn<(teamId: string) => Promise<Miembro[]>>(),
  fetchInvitaciones: vi.fn<(teamId: string) => Promise<Invitacion[]>>(),
  guardarRol: vi.fn(),
  guardarPermisos: vi.fn(),
  cambiarActivo: vi.fn(),
  invitar: vi.fn(),
  revocarInvitacion: vi.fn(),
  misInvitaciones: vi.fn(),
  aceptarInvitacion: vi.fn(),
}));

const solicitudes = vi.hoisted(() => ({
  solicitudesDelEquipo: vi.fn<(teamId: string) => Promise<SolicitudRecibida[]>>(),
  resolverSolicitud: vi.fn(),
  seguidoresDelEquipo: vi.fn<(teamId: string) => Promise<Seguidor[]>>(),
  quitarSeguidor: vi.fn(),
  fetchEnLaLista: vi.fn<(teamId: string) => Promise<boolean>>(),
  guardarEnLaLista: vi.fn(),
}));

vi.mock('../api/personas', () => api);
vi.mock('../api/solicitudes', () => solicitudes);
// El cliente de Supabase trae `env.ts`, que lanza sin configuración. Aquí no
// se habla con la red: basta un objeto vacío.
vi.mock('@shared/lib/supabase', () => ({ supabase: {} }));

const MIEMBROS: Miembro[] = [
  {
    teamMemberId: 'tm-1',
    userId: 'usuario-1',
    nombre: 'Raúl',
    role: 'coach',
    activo: true,
    permisos: [...PERMISOS],
  },
  {
    teamMemberId: 'tm-2',
    userId: 'usuario-2',
    nombre: 'Isaac',
    role: 'delegate',
    activo: true,
    permisos: [...PLANTILLAS_DE_ROL.delegate],
  },
];

const INVITACIONES: Invitacion[] = [
  {
    id: 'inv-1',
    email: 'colega@gmail.com',
    role: 'scout',
    permisos: [...PLANTILLAS_DE_ROL.scout],
    expiresAt: '2026-10-21T10:00:00Z',
  },
];

const SOLICITUD: SolicitudRecibida = {
  id: 'sol-1',
  userId: 'usuario-5',
  nombre: 'Dani',
  mensaje: 'Soy el delegado de campo',
  createdAt: '2026-10-06T10:00:00Z',
};

const SEGUIDORA: Seguidor = {
  userId: 'usuario-7',
  nombre: 'Marta',
  createdAt: '2026-10-05T10:00:00Z',
};

/** La sesión de Raúl en el Cadete A, con los permisos que se le pasen. */
function authCon(permisos: readonly AppPermission[], seguidor = false): AuthState {
  return {
    session: { user: { id: 'usuario-1' } } as Session,
    cargando: false,
    permisos: new Set(permisos),
    profile: null,
    teams: [
      {
        teamMemberId: seguidor ? null : 'tm-1',
        role: seguidor ? null : 'coach',
        team: {
          id: 'eq-1',
          clubId: 'club-1',
          name: 'Cadete A',
          category: 'Cadete',
          crestUrl: null,
          primaryColor: null,
        },
        permissions: new Set(permisos),
        seguidor,
      },
    ],
    activeTeamId: 'eq-1',
    activeSeasonId: null,
    setActiveTeam: () => undefined,
    errorContexto: null,
    reintentarContexto: () => undefined,
  };
}

const AUTH = authCon(['members.manage']);

function montar(ruta = '/equipos/eq-1/personas', auth: AuthState = AUTH) {
  const anunciar = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [{ path: '/equipos/:id/personas', element: <PersonasPage /> }],
    { initialEntries: [ruta] },
  );

  render(
    <QueryClientProvider client={client}>
      <AuthContext value={auth}>
        <AnnounceContext value={{ anunciar }}>
          <RouterProvider router={router} />
        </AnnounceContext>
      </AuthContext>
    </QueryClientProvider>,
  );

  return { anunciar, client };
}

/** La tarjeta cuyo encabezado es `titulo`. `Card` no le pone nombre a su `<section>`. */
async function tarjeta(titulo: string): Promise<HTMLElement> {
  const encabezado = await screen.findByRole('heading', { level: 2, name: titulo });
  const seccion = encabezado.closest('section');

  if (seccion === null) {
    throw new Error(`La tarjeta «${titulo}» no está en una <section>.`);
  }

  return seccion;
}

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchMiembros.mockResolvedValue(MIEMBROS);
  api.fetchInvitaciones.mockResolvedValue(INVITACIONES);
  api.guardarRol.mockResolvedValue(undefined);
  api.guardarPermisos.mockResolvedValue(undefined);
  api.cambiarActivo.mockResolvedValue(undefined);
  api.revocarInvitacion.mockResolvedValue(undefined);
  api.invitar.mockResolvedValue({
    id: 'inv-2',
    email: 'nueva@gmail.com',
    role: 'delegate',
    permisos: [...PLANTILLAS_DE_ROL.delegate],
    expiresAt: '2026-10-21T10:00:00Z',
  });
  solicitudes.solicitudesDelEquipo.mockResolvedValue([]);
  solicitudes.seguidoresDelEquipo.mockResolvedValue([]);
  solicitudes.fetchEnLaLista.mockResolvedValue(false);
  solicitudes.resolverSolicitud.mockResolvedValue(undefined);
  solicitudes.quitarSeguidor.mockResolvedValue(undefined);
  solicitudes.guardarEnLaLista.mockResolvedValue(undefined);
});

describe('A07 · Personas y permisos', () => {
  it('lista a los miembros con nombre, rol y número de permisos', async () => {
    montar();

    const miembros = within(await tarjeta('Miembros'));
    const filas = await miembros.findAllByRole('listitem');

    expect(filas).toHaveLength(2);
    // Por nombre: Isaac antes que Raúl.
    expect(filas[0]).toHaveTextContent('Isaac');
    expect(filas[0]).toHaveTextContent('Delegado');
    expect(filas[0]).toHaveTextContent('4 permisos');
    expect(filas[1]).toHaveTextContent('Raúl');
    expect(filas[1]).toHaveTextContent('Entrenador');
    expect(filas[1]).toHaveTextContent('12 permisos');
    expect(api.fetchMiembros).toHaveBeenCalledWith('eq-1');
  });

  it('un equipo que no es suyo no se encuentra, y no se pregunta por él', async () => {
    montar('/equipos/eq-ajeno/personas');

    expect(await screen.findByText('No se encuentra ese equipo.')).toBeInTheDocument();
    expect(api.fetchMiembros).not.toHaveBeenCalled();
  });

  it('marcar un permiso y guardar manda ese permiso de alta y ninguno de baja', async () => {
    const usuario = userEvent.setup();
    const { anunciar } = montar();

    const miembros = within(await tarjeta('Miembros'));
    await usuario.click(await miembros.findByRole('button', { name: 'Editar a Isaac' }));
    await usuario.click(
      miembros.getByRole('checkbox', { name: 'Aprobar y rechazar eventos, y editar los ajenos' }),
    );
    await usuario.click(miembros.getByRole('button', { name: 'Guardar' }));

    await vi.waitFor(() => {
      expect(api.guardarPermisos).toHaveBeenCalledWith('tm-2', 'usuario-1', {
        altas: ['event.approve'],
        bajas: [],
      });
    });
    expect(api.guardarRol).not.toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(anunciar).toHaveBeenCalledWith('Isaac guardado');
    });
  });

  it('cambiar el rol lo guarda, y «Poner los permisos de su rol» marca los de la plantilla', async () => {
    const usuario = userEvent.setup();
    montar();

    const miembros = within(await tarjeta('Miembros'));
    await usuario.click(await miembros.findByRole('button', { name: 'Editar a Isaac' }));
    await usuario.click(miembros.getByRole('radio', { name: 'Ojeador' }));
    await usuario.click(miembros.getByRole('button', { name: 'Poner los permisos de su rol' }));
    await usuario.click(miembros.getByRole('button', { name: 'Guardar' }));

    await vi.waitFor(() => {
      expect(api.guardarRol).toHaveBeenCalledWith('eq-1', 'tm-2', 'scout');
    });
    expect(api.guardarPermisos).toHaveBeenCalledWith('tm-2', 'usuario-1', {
      altas: [],
      bajas: ['schedule.manage', 'training.manage'],
    });
  });

  it('la casilla de `members.manage` de uno mismo está desactivada, y la baja también', async () => {
    const usuario = userEvent.setup();
    montar();

    const miembros = within(await tarjeta('Miembros'));
    await usuario.click(await miembros.findByRole('button', { name: 'Editar a Raúl' }));

    expect(
      miembros.getByRole('checkbox', { name: 'Invitar personas y asignar permisos' }),
    ).toBeDisabled();
    expect(miembros.getByRole('button', { name: 'Dar de baja' })).toBeDisabled();
    expect(miembros.getByText(/No puedes quitarte este permiso/)).toBeInTheDocument();
    expect(miembros.getByText(/No puedes darte de baja/)).toBeInTheDocument();
  });

  it('dar de baja pide confirmación en su sitio', async () => {
    const usuario = userEvent.setup();
    montar();

    const miembros = within(await tarjeta('Miembros'));
    await usuario.click(await miembros.findByRole('button', { name: 'Editar a Isaac' }));
    await usuario.click(miembros.getByRole('button', { name: 'Dar de baja' }));

    expect(api.cambiarActivo).not.toHaveBeenCalled();

    await usuario.click(miembros.getByRole('button', { name: 'Sí, dar de baja' }));

    await vi.waitFor(() => {
      expect(api.cambiarActivo).toHaveBeenCalledWith('eq-1', 'tm-2', false);
    });
  });

  it('invitar con rol «Delegado» manda los cuatro permisos de su plantilla', async () => {
    const usuario = userEvent.setup();
    montar();

    const invitar = within(await tarjeta('Invitar'));
    await usuario.type(invitar.getByLabelText(/Correo/), '  Nueva@Gmail.com ');
    await usuario.click(invitar.getByRole('radio', { name: 'Delegado' }));
    await usuario.click(invitar.getByRole('button', { name: 'Invitar' }));

    await vi.waitFor(() => {
      expect(api.invitar).toHaveBeenCalledWith('eq-1', {
        email: 'nueva@gmail.com',
        role: 'delegate',
        permissions: ['schedule.manage', 'match.live.write', 'training.manage', 'stats.view'],
      });
    });
    expect(await invitar.findByText(/Invitación guardada/)).toBeInTheDocument();
  });

  it('con el 23505 al invitar, sale el texto propio', async () => {
    api.invitar.mockRejectedValue({ code: '23505' });
    const usuario = userEvent.setup();
    montar();

    const invitar = within(await tarjeta('Invitar'));
    await usuario.type(invitar.getByLabelText(/Correo/), 'colega@gmail.com');
    await usuario.click(invitar.getByRole('button', { name: 'Invitar' }));

    expect(
      await invitar.findByText('Ya hay una invitación pendiente para ese correo.'),
    ).toBeInTheDocument();
  });

  it('un correo sin arroba se para en el campo, sin llamar', async () => {
    const usuario = userEvent.setup();
    montar();

    const invitar = within(await tarjeta('Invitar'));
    await usuario.type(invitar.getByLabelText(/Correo/), 'colega.gmail.com');
    await usuario.click(invitar.getByRole('button', { name: 'Invitar' }));

    expect(invitar.getByLabelText(/Correo/)).toBeInvalid();
    expect(api.invitar).not.toHaveBeenCalled();
  });

  it('«Revocar» llama a la API con el `id` de la invitación', async () => {
    const usuario = userEvent.setup();
    montar();

    const pendientes = within(await tarjeta('Invitaciones pendientes'));
    await usuario.click(
      await pendientes.findByRole('button', { name: 'Revocar la invitación de colega@gmail.com' }),
    );

    await vi.waitFor(() => {
      expect(api.revocarInvitacion).toHaveBeenCalledWith('inv-1');
    });
  });
  it('sin solicitudes, la tarjeta no sale; con una, es la primera de la pantalla', async () => {
    montar();

    await tarjeta('Miembros');
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Solicitudes de permisos' }),
    ).not.toBeInTheDocument();
  });

  it('con una solicitud, «Aceptar» pide rol y permisos antes de llamar', async () => {
    solicitudes.solicitudesDelEquipo.mockResolvedValue([SOLICITUD]);
    const usuario = userEvent.setup();
    const { anunciar } = montar();

    const tarjetaDeSolicitudes = await tarjeta('Solicitudes de permisos');
    const encabezados = screen.getAllByRole('heading', { level: 2 });
    expect(encabezados[0]).toHaveTextContent('Solicitudes de permisos');

    const pedidas = within(tarjetaDeSolicitudes);
    expect(pedidas.getByText('Dani')).toBeInTheDocument();
    expect(pedidas.getByText(/Soy el delegado de campo/)).toBeInTheDocument();
    expect(solicitudes.solicitudesDelEquipo).toHaveBeenCalledWith('eq-1');

    await usuario.click(pedidas.getByRole('button', { name: 'Aceptar a Dani' }));

    expect(solicitudes.resolverSolicitud).not.toHaveBeenCalled();

    await usuario.click(pedidas.getByRole('radio', { name: 'Delegado' }));
    await usuario.click(pedidas.getByRole('button', { name: 'Aceptar con estos permisos' }));

    await vi.waitFor(() => {
      expect(solicitudes.resolverSolicitud).toHaveBeenCalledWith('sol-1', {
        aprobar: true,
        role: 'delegate',
        permissions: ['schedule.manage', 'match.live.write', 'training.manage', 'stats.view'],
      });
    });
    await vi.waitFor(() => {
      expect(anunciar).toHaveBeenCalledWith('Dani ya forma parte del equipo');
    });
  });

  it('«Rechazar» pide confirmación en su sitio y llama con `aprobar: false`', async () => {
    solicitudes.solicitudesDelEquipo.mockResolvedValue([SOLICITUD]);
    const usuario = userEvent.setup();
    montar();

    const pedidas = within(await tarjeta('Solicitudes de permisos'));
    await usuario.click(pedidas.getByRole('button', { name: 'Rechazar a Dani' }));

    expect(solicitudes.resolverSolicitud).not.toHaveBeenCalled();
    expect(pedidas.getByText(/Podrá seguir al equipo igualmente/)).toBeInTheDocument();

    await usuario.click(pedidas.getByRole('button', { name: 'Sí, rechazar' }));

    await vi.waitFor(() => {
      expect(solicitudes.resolverSolicitud).toHaveBeenCalledWith('sol-1', { aprobar: false });
    });
  });

  it('«Quitar» a un seguidor avisa de que podrá volver a seguir', async () => {
    solicitudes.seguidoresDelEquipo.mockResolvedValue([SEGUIDORA]);
    const usuario = userEvent.setup();
    montar();

    const seguidores = within(await tarjeta('Seguidores'));
    await usuario.click(await seguidores.findByRole('button', { name: 'Quitar a Marta' }));

    expect(solicitudes.quitarSeguidor).not.toHaveBeenCalled();
    expect(
      seguidores.getByText(/Podrá volver a seguir mientras el equipo esté en la lista\./),
    ).toBeInTheDocument();

    await usuario.click(seguidores.getByRole('button', { name: 'Sí, quitar' }));

    await vi.waitFor(() => {
      expect(solicitudes.quitarSeguidor).toHaveBeenCalledWith('eq-1', 'usuario-7');
    });
  });

  it('la casilla de la lista no sale sin `team.manage`', async () => {
    montar();

    await tarjeta('Seguidores');
    expect(
      screen.queryByRole('checkbox', { name: 'Este equipo está en la lista' }),
    ).not.toBeInTheDocument();
    expect(solicitudes.fetchEnLaLista).not.toHaveBeenCalled();
  });

  it('con `team.manage`, la casilla escribe `accepts_requests`', async () => {
    const usuario = userEvent.setup();
    const { anunciar } = montar(
      '/equipos/eq-1/personas',
      authCon(['members.manage', 'team.manage']),
    );

    const casilla = await screen.findByRole('checkbox', { name: 'Este equipo está en la lista' });
    expect(casilla).not.toBeChecked();
    expect(screen.getByText(/Para anotar hace falta que lo aceptes\./)).toBeInTheDocument();

    await usuario.click(casilla);

    await vi.waitFor(() => {
      expect(solicitudes.guardarEnLaLista).toHaveBeenCalledWith('eq-1', true);
    });
    await vi.waitFor(() => {
      expect(anunciar).toHaveBeenCalledWith('Cadete A está en la lista');
    });
  });

  it('quien solo sigue al equipo no entra en su A07', async () => {
    montar('/equipos/eq-1/personas', authCon([], true));

    expect(await screen.findByText('No se encuentra ese equipo.')).toBeInTheDocument();
    expect(api.fetchMiembros).not.toHaveBeenCalled();
  });
});

describe('A07 · arreglos de la revisión (T-306)', () => {
  it('«Guardar» calcula los cambios contra los permisos de cuando se abrió «Editar»', async () => {
    const usuario = userEvent.setup();
    const { client } = montar();

    const miembros = within(await tarjeta('Miembros'));
    await usuario.click(await miembros.findByRole('button', { name: 'Editar a Isaac' }));

    // Mientras tanto, otra persona le da `event.approve` y la lista se recarga.
    api.fetchMiembros.mockResolvedValue([
      MIEMBROS[0],
      { ...MIEMBROS[1], permisos: [...MIEMBROS[1].permisos, 'event.approve'] },
    ]);
    await client.invalidateQueries({ queryKey: authKeys.all });
    await vi.waitFor(() => {
      expect(api.fetchMiembros).toHaveBeenCalledTimes(2);
    });

    await usuario.click(
      miembros.getByRole('checkbox', { name: 'Aprobar y rechazar eventos, y editar los ajenos' }),
    );
    await usuario.click(miembros.getByRole('button', { name: 'Guardar' }));

    await vi.waitFor(() => {
      expect(api.guardarPermisos).toHaveBeenCalledWith('tm-2', 'usuario-1', {
        altas: ['event.approve'],
        bajas: [],
      });
    });
  });

  it('si otra persona ya había cambiado los permisos, lo dice y vuelve a sembrar el formulario', async () => {
    api.guardarPermisos.mockRejectedValue({ code: '23505' });
    const usuario = userEvent.setup();
    montar();

    const miembros = within(await tarjeta('Miembros'));
    await usuario.click(await miembros.findByRole('button', { name: 'Editar a Isaac' }));
    await usuario.click(
      miembros.getByRole('checkbox', { name: 'Aprobar y rechazar eventos, y editar los ajenos' }),
    );
    await usuario.click(miembros.getByRole('button', { name: 'Guardar' }));

    expect(
      await miembros.findByText(
        'Otra persona ha cambiado estos permisos. La lista ya enseña lo que hay: revísala y vuelve a guardar.',
      ),
    ).toBeInTheDocument();
    expect(
      miembros.getByRole('checkbox', { name: 'Aprobar y rechazar eventos, y editar los ajenos' }),
    ).not.toBeChecked();
  });

  it('con `GUARDADO_A_MEDIAS` sale el texto propio y el foco está en el mensaje', async () => {
    api.guardarPermisos.mockRejectedValue(new Error(GUARDADO_A_MEDIAS));
    const usuario = userEvent.setup();
    montar();

    const miembros = within(await tarjeta('Miembros'));
    await usuario.click(await miembros.findByRole('button', { name: 'Editar a Isaac' }));
    await usuario.click(
      miembros.getByRole('checkbox', { name: 'Aprobar y rechazar eventos, y editar los ajenos' }),
    );
    await usuario.click(miembros.getByRole('button', { name: 'Guardar' }));

    const mensaje = await miembros.findByText(
      'Se ha guardado una parte. La lista ya enseña lo que hay: revísala y vuelve a guardar.',
    );

    await vi.waitFor(() => {
      expect(mensaje).toHaveFocus();
    });
  });

  it('«Dar de baja» lleva el foco a la pregunta, y «No, dejarlo» lo devuelve al botón', async () => {
    const usuario = userEvent.setup();
    montar();

    const miembros = within(await tarjeta('Miembros'));
    await usuario.click(await miembros.findByRole('button', { name: 'Editar a Isaac' }));
    await usuario.click(miembros.getByRole('button', { name: 'Dar de baja' }));

    expect(miembros.getByText(/¿Dar de baja a Isaac\?/)).toHaveFocus();

    await usuario.click(miembros.getByRole('button', { name: 'No, dejarlo' }));

    expect(miembros.getByRole('button', { name: 'Dar de baja' })).toHaveFocus();
  });

  it('tras «Revocar», el foco está en el título de «Invitaciones pendientes»', async () => {
    const usuario = userEvent.setup();
    montar();

    const pendientes = within(await tarjeta('Invitaciones pendientes'));
    await usuario.click(
      await pendientes.findByRole('button', { name: 'Revocar la invitación de colega@gmail.com' }),
    );

    await vi.waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 2, name: 'Invitaciones pendientes' }),
      ).toHaveFocus();
    });
  });

  it('un correo sin arroba lleva el foco al campo', async () => {
    const usuario = userEvent.setup();
    montar();

    const invitar = within(await tarjeta('Invitar'));
    await usuario.type(invitar.getByLabelText(/Correo/), 'colega.gmail.com');
    await usuario.click(invitar.getByRole('button', { name: 'Invitar' }));

    expect(invitar.getByLabelText(/Correo/)).toHaveFocus();
  });

  it('escribir otro correo quita «Invitación guardada»', async () => {
    const usuario = userEvent.setup();
    montar();

    const invitar = within(await tarjeta('Invitar'));
    await usuario.type(invitar.getByLabelText(/Correo/), 'nueva@gmail.com');
    await usuario.click(invitar.getByRole('button', { name: 'Invitar' }));
    expect(await invitar.findByText(/Invitación guardada/)).toBeInTheDocument();

    await usuario.type(invitar.getByLabelText(/Correo/), 'o');

    expect(invitar.queryByText(/Invitación guardada/)).not.toBeInTheDocument();
  });

  it('si invitar falla, el foco está en el mensaje', async () => {
    api.invitar.mockRejectedValue({ code: '23505' });
    const usuario = userEvent.setup();
    montar();

    const invitar = within(await tarjeta('Invitar'));
    await usuario.type(invitar.getByLabelText(/Correo/), 'colega@gmail.com');
    await usuario.click(invitar.getByRole('button', { name: 'Invitar' }));

    const mensaje = await invitar.findByText('Ya hay una invitación pendiente para ese correo.');

    await vi.waitFor(() => {
      expect(mensaje).toHaveFocus();
    });
  });
});

describe('A07 · arreglos de la segunda revisión (T-235)', () => {
  it('al confirmar la baja, el foco va al nombre de esa persona', async () => {
    const usuario = userEvent.setup();
    montar();

    const miembros = within(await tarjeta('Miembros'));
    await usuario.click(await miembros.findByRole('button', { name: 'Editar a Isaac' }));
    await usuario.click(miembros.getByRole('button', { name: 'Dar de baja' }));
    await usuario.click(miembros.getByRole('button', { name: 'Sí, dar de baja' }));

    await vi.waitFor(() => {
      expect(api.cambiarActivo).toHaveBeenCalledWith('eq-1', 'tm-2', false);
    });
    await vi.waitFor(() => {
      expect(miembros.getByText('Isaac')).toHaveFocus();
    });
  });

  it('si resolver una solicitud falla y la lista vuelve vacía, la tarjeta sigue con el mensaje y «Cerrar»', async () => {
    solicitudes.solicitudesDelEquipo.mockResolvedValueOnce([SOLICITUD]).mockResolvedValue([]);
    solicitudes.resolverSolicitud.mockRejectedValue({
      code: 'P0002',
      message: 'Esa solicitud ya está resuelta.',
    });
    const usuario = userEvent.setup();
    montar();

    const pedidas = within(await tarjeta('Solicitudes de permisos'));
    await usuario.click(pedidas.getByRole('button', { name: 'Rechazar a Dani' }));
    await usuario.click(pedidas.getByRole('button', { name: 'Sí, rechazar' }));

    const mensaje = await screen.findByText('Esa solicitud ya está resuelta.');

    // Otra persona ya la había resuelto: la lista se recarga y vuelve vacía.
    await vi.waitFor(() => {
      expect(solicitudes.solicitudesDelEquipo).toHaveBeenCalledTimes(2);
    });
    await vi.waitFor(() => {
      expect(screen.queryByText('Dani')).not.toBeInTheDocument();
    });

    expect(mensaje).toBeInTheDocument();
    expect(mensaje).toHaveFocus();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Solicitudes de permisos' }),
    ).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Cerrar' }));

    await vi.waitFor(() => {
      expect(
        screen.queryByRole('heading', { level: 2, name: 'Solicitudes de permisos' }),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { level: 2, name: 'Miembros' })).toHaveFocus();
  });

  it('tras un conflicto, lo que se marca después no lo borra una recarga de la lista', async () => {
    api.guardarPermisos.mockRejectedValueOnce({ code: '23505' });
    const usuario = userEvent.setup();
    const { client } = montar();

    const miembros = within(await tarjeta('Miembros'));
    await usuario.click(await miembros.findByRole('button', { name: 'Editar a Isaac' }));
    await usuario.click(
      miembros.getByRole('checkbox', { name: 'Aprobar y rechazar eventos, y editar los ajenos' }),
    );
    await usuario.click(miembros.getByRole('button', { name: 'Guardar' }));
    await miembros.findByText(/Otra persona ha cambiado estos permisos\./);

    // Revisa la lista y marca otro permiso.
    const casilla = miembros.getByRole('checkbox', {
      name: 'Aprobar y rechazar eventos, y editar los ajenos',
    });
    expect(casilla).not.toBeChecked();
    await usuario.click(casilla);
    expect(casilla).toBeChecked();

    // Antes de guardar, la lista se recarga con otro cambio ajeno en esa persona.
    api.fetchMiembros.mockResolvedValue([{ ...MIEMBROS[0] }, { ...MIEMBROS[1], role: 'scout' }]);
    await client.invalidateQueries({ queryKey: authKeys.all });
    await vi.waitFor(() => {
      expect(api.fetchMiembros).toHaveBeenCalledTimes(3);
    });
    // TanStack Query avisa a React en una tarea aparte: sin esperarla, la
    // prueba vería la pantalla de antes.
    await new Promise((resolver) => {
      setTimeout(resolver, 20);
    });

    expect(
      miembros.getByRole('checkbox', { name: 'Aprobar y rechazar eventos, y editar los ajenos' }),
    ).toBeChecked();
  });
});
