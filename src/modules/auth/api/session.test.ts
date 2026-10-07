// Contexto de acceso (T-305). Se dobla el cliente de Supabase con una
// respuesta por tabla: las tres primeras lecturas van a la vez y no se puede
// contar con el orden en que llegan.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchContextoDeAcceso } from './session';

interface Respuesta {
  data: unknown;
  error: unknown;
}

const red = vi.hoisted(() => ({
  tablas: [] as string[],
  respuestas: new Map<string, { data: unknown; error: unknown }>(),
}));

vi.mock('@shared/lib/supabase', () => {
  const cadena = (respuesta: { data: unknown; error: unknown }): unknown =>
    new Proxy(
      {},
      {
        get: (_objetivo, metodo: string) => {
          if (metodo === 'then') {
            return (alResolver: (valor: unknown) => unknown) =>
              Promise.resolve(respuesta).then(alResolver);
          }

          return () => cadena(respuesta);
        },
      },
    );

  return {
    supabase: {
      from: (tabla: string) => {
        red.tablas.push(tabla);

        return cadena(red.respuestas.get(tabla) ?? { data: null, error: null });
      },
    },
  };
});

function equipo(id: string, nombre: string) {
  return {
    id,
    club_id: 'club-1',
    name: nombre,
    category: 'Cadete',
    crest_url: null,
    primary_color: null,
  };
}

const MIEMBRO = {
  id: 'miembro-1',
  role: 'coach',
  teams: equipo('eq-a', 'Cadete A'),
  team_member_permissions: [{ permission: 'match.live.write' }],
};

function responder(tabla: string, respuesta: Respuesta) {
  red.respuestas.set(tabla, respuesta);
}

beforeEach(() => {
  red.tablas.length = 0;
  red.respuestas.clear();
  responder('profiles', { data: null, error: null });
  responder('team_members', { data: [MIEMBRO], error: null });
  responder('team_followers', { data: [{ teams: equipo('eq-b', 'Cadete B') }], error: null });
  responder('seasons', { data: [{ id: 'temp-1', club_id: 'club-1' }], error: null });
});

describe('fetchContextoDeAcceso', () => {
  it('junta las membresías de miembro y las de seguidor, con la temporada del club', async () => {
    const contexto = await fetchContextoDeAcceso('usuario-1');

    expect(contexto.memberships.map((membresia) => membresia.team.id)).toEqual(['eq-a', 'eq-b']);
    expect(contexto.memberships.map((membresia) => membresia.seguidor)).toEqual([false, true]);
    expect(contexto.temporadaPorClub.get('club-1')).toBe('temp-1');
  });

  it('si falla team_followers, vuelve con las membresías de miembro y ninguna de seguidor', async () => {
    responder('team_followers', { data: null, error: new Error('sin permiso para leer') });

    const contexto = await fetchContextoDeAcceso('usuario-1');

    expect(contexto.memberships).toHaveLength(1);
    expect(contexto.memberships[0].team.id).toBe('eq-a');
    expect(contexto.memberships[0].seguidor).toBe(false);
    expect(contexto.memberships[0].permissions.has('match.live.write')).toBe(true);
    expect(contexto.memberships.some((membresia) => membresia.seguidor === true)).toBe(false);
    expect(red.tablas).toContain('seasons');
  });

  it('si falla team_members, lanza', async () => {
    const fallo = new Error('sin red');

    responder('team_members', { data: null, error: fallo });

    await expect(fetchContextoDeAcceso('usuario-1')).rejects.toBe(fallo);
  });

  it('si falla profiles, lanza', async () => {
    const fallo = new Error('sin red');

    responder('profiles', { data: null, error: fallo });

    await expect(fetchContextoDeAcceso('usuario-1')).rejects.toBe(fallo);
  });
});
