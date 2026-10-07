// «Unirse a un equipo» (T-301c): seguir, pedir permisos y las solicitudes
// propias.
//
// La red se sustituye en la frontera de `api/` (DOC 06 §11).

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnnounceContext } from '@shared/hooks/announceContext';

import { AuthContext } from '../hooks/authContext';
import { UnirsePage } from './UnirsePage';

import type { AuthState } from '../hooks/authContext';
import type { Membership } from '../model/permissions';
import type { EquipoDeLaLista, MiSolicitud } from '../model/solicitudes';
import type { Session } from '@supabase/supabase-js';

const api = vi.hoisted(() => ({
  equiposDeLaLista: vi.fn<() => Promise<EquipoDeLaLista[]>>(),
  misSolicitudes: vi.fn<(userId: string) => Promise<MiSolicitud[]>>(),
  seguirEquipo: vi.fn<(teamId: string) => Promise<void>>(),
  dejarDeSeguir: vi.fn<(teamId: string) => Promise<void>>(),
  solicitarAcceso: vi.fn<(teamId: string, mensaje: string | null) => Promise<void>>(),
  cancelarSolicitud: vi.fn<(requestId: string) => Promise<void>>(),
}));

vi.mock('../api/solicitudes', () => api);
// El cliente de Supabase trae `env.ts`, que lanza sin configuración.
vi.mock('@shared/lib/supabase', () => ({ supabase: {} }));

const EQUIPOS: EquipoDeLaLista[] = [
  { teamId: 'eq-1', teamName: 'Cadete A', clubName: 'C.D. Unión Tejina', category: 'Cadete' },
  { teamId: 'eq-2', teamName: 'Infantil B', clubName: 'C.D. Unión Tejina', category: null },
];

const SIGUE_AL_CADETE: Membership = {
  teamMemberId: null,
  role: null,
  team: {
    id: 'eq-1',
    clubId: 'club-1',
    name: 'Cadete A',
    category: 'Cadete',
    crestUrl: null,
    primaryColor: null,
  },
  permissions: new Set(),
  seguidor: true,
};

function montar(teams: readonly Membership[] = []) {
  const anunciar = vi.fn();
  const reintentarContexto = vi.fn();
  const auth: AuthState = {
    session: { user: { id: 'usuario-9' } } as Session,
    cargando: false,
    permisos: new Set(),
    profile: null,
    teams,
    activeTeamId: teams.length === 0 ? null : teams[0].team.id,
    activeSeasonId: null,
    setActiveTeam: () => undefined,
    errorContexto: null,
    reintentarContexto,
  };
  const router = createMemoryRouter([{ path: '/unirse', element: <UnirsePage /> }], {
    initialEntries: ['/unirse'],
  });

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

  return { anunciar, reintentarContexto };
}

/** La fila de la tarjeta «Equipos» que nombra a `equipo`. */
async function filaDe(equipo: string): Promise<HTMLElement> {
  const encabezado = await screen.findByRole('heading', { level: 2, name: 'Equipos' });
  const seccion = encabezado.closest('section');

  if (seccion === null) {
    throw new Error('«Equipos» no está en una <section>.');
  }

  const nombre = await within(seccion).findByText(equipo);
  const fila = nombre.closest('li');

  if (fila === null) {
    throw new Error(`«${equipo}» no está en una fila.`);
  }

  return fila;
}

beforeEach(() => {
  vi.clearAllMocks();
  api.equiposDeLaLista.mockResolvedValue(EQUIPOS);
  api.misSolicitudes.mockResolvedValue([]);
  api.seguirEquipo.mockResolvedValue(undefined);
  api.dejarDeSeguir.mockResolvedValue(undefined);
  api.solicitarAcceso.mockResolvedValue(undefined);
  api.cancelarSolicitud.mockResolvedValue(undefined);
});

describe('Unirse a un equipo', () => {
  it('lista los equipos, y «Seguir» sigue y recarga el contexto sin pedir nada más', async () => {
    const usuario = userEvent.setup();
    const { anunciar, reintentarContexto } = montar();

    const fila = within(await filaDe('Cadete A'));
    expect(fila.getByText(/C\.D\. Unión Tejina/)).toBeInTheDocument();
    expect(await filaDe('Infantil B')).toBeInTheDocument();

    await usuario.click(fila.getByRole('button', { name: 'Seguir a Cadete A' }));

    await vi.waitFor(() => {
      expect(api.seguirEquipo).toHaveBeenCalledWith('eq-1');
    });
    await vi.waitFor(() => {
      expect(reintentarContexto).toHaveBeenCalledTimes(1);
    });
    expect(anunciar).toHaveBeenCalledWith('Ya sigues a Cadete A');
    // Seguir no pasa por nadie: ni solicitud, ni confirmación.
    expect(api.solicitarAcceso).not.toHaveBeenCalled();
  });

  it('un equipo que ya se sigue dice «Siguiendo» y ofrece «Dejar de seguir»', async () => {
    const usuario = userEvent.setup();
    const { reintentarContexto } = montar([SIGUE_AL_CADETE]);

    const fila = within(await filaDe('Cadete A'));

    expect(fila.getByText('Siguiendo')).toBeInTheDocument();
    expect(fila.queryByRole('button', { name: 'Seguir a Cadete A' })).not.toBeInTheDocument();

    await usuario.click(fila.getByRole('button', { name: 'Dejar de seguir a Cadete A' }));

    await vi.waitFor(() => {
      expect(api.dejarDeSeguir).toHaveBeenCalledWith('eq-1');
    });
    await vi.waitFor(() => {
      expect(reintentarContexto).toHaveBeenCalledTimes(1);
    });
  });

  it('«Quiero anotar» abre el mensaje y lo envía recortado a `solicitar_acceso`', async () => {
    const usuario = userEvent.setup();
    const { anunciar } = montar();

    const fila = within(await filaDe('Cadete A'));
    await usuario.click(
      fila.getByRole('button', { name: 'Quiero anotar: pedir permisos en Cadete A' }),
    );

    expect(api.solicitarAcceso).not.toHaveBeenCalled();

    await usuario.type(fila.getByLabelText(/Di quién eres/), '  Soy el padre de Dani ');
    await usuario.click(fila.getByRole('button', { name: 'Enviar' }));

    await vi.waitFor(() => {
      expect(api.solicitarAcceso).toHaveBeenCalledWith('eq-1', 'Soy el padre de Dani');
    });
    await vi.waitFor(() => {
      expect(anunciar).toHaveBeenCalledWith(
        'Solicitud enviada. Te tiene que aceptar quien lleva el equipo.',
      );
    });
    // Pedir permisos no sigue al equipo ni da acceso.
    expect(api.seguirEquipo).not.toHaveBeenCalled();
  });

  it('sin mensaje se envía `null`, y el error de la base se enseña tal cual', async () => {
    api.solicitarAcceso.mockRejectedValue({
      code: '23505',
      message: 'Ya tienes una solicitud pendiente en ese equipo',
    });
    const usuario = userEvent.setup();
    montar();

    const fila = within(await filaDe('Cadete A'));
    await usuario.click(
      fila.getByRole('button', { name: 'Quiero anotar: pedir permisos en Cadete A' }),
    );
    await usuario.click(fila.getByRole('button', { name: 'Enviar' }));

    await vi.waitFor(() => {
      expect(api.solicitarAcceso).toHaveBeenCalledWith('eq-1', null);
    });
    expect(
      await fila.findByText('Ya tienes una solicitud pendiente en ese equipo'),
    ).toBeInTheDocument();
  });

  it('una solicitud pendiente propia sale arriba, y «Cancelar» llama a la API', async () => {
    api.misSolicitudes.mockResolvedValue([
      { id: 'sol-1', teamId: 'eq-1', status: 'pending', createdAt: '2026-10-06T10:00:00Z' },
      { id: 'sol-0', teamId: 'eq-2', status: 'rejected', createdAt: '2026-09-20T10:00:00Z' },
    ]);
    const usuario = userEvent.setup();
    const { anunciar } = montar();

    await screen.findByRole('heading', { level: 2, name: 'Mis solicitudes' });
    const encabezados = screen.getAllByRole('heading', { level: 2 });
    expect(encabezados.map((encabezado) => encabezado.textContent)).toEqual([
      'Mis solicitudes',
      'Equipos',
    ]);

    const seccion = encabezados[0].closest('section');
    if (seccion === null) {
      throw new Error('«Mis solicitudes» no está en una <section>.');
    }
    const solicitudes = within(seccion);
    const filas = solicitudes.getAllByRole('listitem');

    expect(api.misSolicitudes).toHaveBeenCalledWith('usuario-9');
    expect(filas[0]).toHaveTextContent('Cadete A');
    expect(filas[0]).toHaveTextContent('Pendiente');
    expect(filas[1]).toHaveTextContent('Infantil B');
    expect(filas[1]).toHaveTextContent('Rechazada');
    // Solo se cancela lo pendiente.
    expect(solicitudes.getAllByRole('button')).toHaveLength(1);

    await usuario.click(
      solicitudes.getByRole('button', { name: 'Cancelar la solicitud a Cadete A' }),
    );

    await vi.waitFor(() => {
      expect(api.cancelarSolicitud).toHaveBeenCalledWith('sol-1');
    });
    await vi.waitFor(() => {
      expect(anunciar).toHaveBeenCalledWith('Solicitud a Cadete A cancelada');
    });
  });

  it('con una solicitud pendiente, el equipo no ofrece pedir permisos otra vez', async () => {
    api.misSolicitudes.mockResolvedValue([
      { id: 'sol-1', teamId: 'eq-1', status: 'pending', createdAt: '2026-10-06T10:00:00Z' },
    ]);
    montar();

    const fila = within(await filaDe('Cadete A'));

    expect(await fila.findByText(/Solicitud pendiente/)).toBeInTheDocument();
    expect(
      fila.queryByRole('button', { name: 'Quiero anotar: pedir permisos en Cadete A' }),
    ).not.toBeInTheDocument();
    // Seguir sigue disponible: no depende de la solicitud.
    expect(fila.getByRole('button', { name: 'Seguir a Cadete A' })).toBeInTheDocument();
  });

  it('sin equipos en la lista, manda a pedir una invitación', async () => {
    api.equiposDeLaLista.mockResolvedValue([]);
    montar();

    expect(
      await screen.findByText(
        'Ningún equipo está en la lista ahora mismo. Pide a quien lleve el tuyo que te invite a este correo.',
      ),
    ).toBeInTheDocument();
  });
});
