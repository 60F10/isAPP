// `crearJugador` son dos inserciones sin transacción (T-202). Lo que se
// vigila: si la segunda falla, el jugador recién creado se borra y el error
// que sale es el de la inscripción. Y que a `players` solo viaja el apodo.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { crearJugador } from './plantilla';

interface Resultado {
  data: unknown;
  error: unknown;
}

const llamadas = vi.hoisted(() => ({
  inserciones: [] as { tabla: string; fila: unknown }[],
  borrados: [] as { tabla: string; id: unknown }[],
  respuestas: {} as Record<string, Resultado>,
}));

// Un cliente de mentira con la forma justa de las cadenas que usa `api/`.
vi.mock('@shared/lib/supabase', () => ({
  supabase: {
    from: (tabla: string) => ({
      insert: (fila: unknown) => {
        llamadas.inserciones.push({ tabla, fila });
        return {
          select: () => ({
            single: () => Promise.resolve(llamadas.respuestas[tabla]),
          }),
        };
      },
      delete: () => ({
        eq: (_columna: string, id: unknown) => {
          llamadas.borrados.push({ tabla, id });
          return Promise.resolve({ data: null, error: null });
        },
      }),
    }),
  },
}));

const DESTINO = { clubId: 'club-1', equipoId: 'eq-1', temporadaId: 'temp-1', userId: 'usuario-1' };
const DATOS = { nickname: 'Pipo', shirt_number: 9, default_position: 'FW' as const };

beforeEach(() => {
  llamadas.inserciones = [];
  llamadas.borrados = [];
  llamadas.respuestas = {
    players: { data: { id: 'jug-1' }, error: null },
    squad_memberships: {
      data: {
        id: 'ins-1',
        player_id: 'jug-1',
        shirt_number: 9,
        default_position: 'FW',
        availability: 'available',
        players: { nickname: 'Pipo' },
      },
      error: null,
    },
  };
});

describe('crearJugador', () => {
  it('crea el jugador con solo el apodo y lo inscribe en el equipo y la temporada', async () => {
    const inscrito = await crearJugador(DESTINO, DATOS);

    expect(llamadas.inserciones).toEqual([
      { tabla: 'players', fila: { club_id: 'club-1', nickname: 'Pipo', created_by: 'usuario-1' } },
      {
        tabla: 'squad_memberships',
        fila: {
          team_id: 'eq-1',
          season_id: 'temp-1',
          player_id: 'jug-1',
          shirt_number: 9,
          default_position: 'FW',
          created_by: 'usuario-1',
        },
      },
    ]);
    expect(inscrito).toEqual({
      id: 'ins-1',
      playerId: 'jug-1',
      nickname: 'Pipo',
      shirtNumber: 9,
      defaultPosition: 'FW',
      availability: 'available',
    });
    expect(llamadas.borrados).toEqual([]);
  });

  it('si la inscripción falla, borra el jugador recién creado y lanza el error de la inscripción', async () => {
    const dorsalCogido = { code: '23505', message: 'duplicate key value' };
    llamadas.respuestas.squad_memberships = { data: null, error: dorsalCogido };

    await expect(crearJugador(DESTINO, DATOS)).rejects.toBe(dorsalCogido);
    expect(llamadas.borrados).toEqual([{ tabla: 'players', id: 'jug-1' }]);
  });

  it('si ni siquiera se crea el jugador, no intenta inscribirlo', async () => {
    const sinPermiso = { code: '42501', message: 'row-level security' };
    llamadas.respuestas.players = { data: null, error: sinPermiso };

    await expect(crearJugador(DESTINO, DATOS)).rejects.toBe(sinPermiso);
    expect(llamadas.inserciones).toHaveLength(1);
    expect(llamadas.borrados).toEqual([]);
  });
});
