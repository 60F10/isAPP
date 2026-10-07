// Pantalla A07 (T-301b): miembros, permisos e invitaciones.
//
// La red se sustituye en la frontera de `api/` (DOC 06 §11).

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnnounceContext } from '@shared/hooks/announceContext';

import { AuthContext } from '../hooks/authContext';
import { PERMISOS, PLANTILLAS_DE_ROL } from '../model/personas';
import { PersonasPage } from './PersonasPage';

import type { AuthState } from '../hooks/authContext';
import type { Invitacion, Miembro } from '../model/personas';
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

vi.mock('../api/personas', () => api);
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

const AUTH: AuthState = {
  session: { user: { id: 'usuario-1' } } as Session,
  cargando: false,
  permisos: new Set(['members.manage']),
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
      permissions: new Set(['members.manage']),
    },
  ],
  activeTeamId: 'eq-1',
  activeSeasonId: null,
  setActiveTeam: () => undefined,
  errorContexto: null,
  reintentarContexto: () => undefined,
};

function montar(ruta = '/equipos/eq-1/personas') {
  const anunciar = vi.fn();
  const router = createMemoryRouter(
    [{ path: '/equipos/:id/personas', element: <PersonasPage /> }],
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
      expect(api.guardarRol).toHaveBeenCalledWith('tm-2', 'scout');
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
      expect(api.cambiarActivo).toHaveBeenCalledWith('tm-2', false);
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
});
