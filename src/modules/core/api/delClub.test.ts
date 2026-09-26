// `fetchDelClubSinInscribir` (DOC 13, punto 29). Lo que se vigila: de
// `players` solo se pide el apodo, y no sale quien ya tiene fila en el equipo
// y la temporada, aunque sea de baja.

import { describe, expect, it, vi } from 'vitest';

import { fetchDelClubSinInscribir } from './plantilla';

const red = vi.hoisted(() => ({ selects: {} as Record<string, string> }));

vi.mock('@shared/lib/supabase', () => ({
  supabase: {
    from: (tabla: string) => ({
      select: (columnas: string) => {
        red.selects[tabla] = columnas;
        const respuesta =
          tabla === 'players'
            ? {
                data: [
                  { id: 'j1', nickname: 'Zape' },
                  { id: 'j2', nickname: 'Ángel' },
                  { id: 'j3', nickname: 'Baja' },
                ],
                error: null,
              }
            : { data: [{ player_id: 'j3' }], error: null };
        const cadena = {
          eq: () => cadena,
          then: (resolver: (valor: unknown) => void) => {
            resolver(respuesta);
          },
        };

        return cadena;
      },
    }),
  },
}));

describe('fetchDelClubSinInscribir', () => {
  it('solo pide el apodo, deja fuera a quien ya tiene fila y ordena por apodo', async () => {
    const jugadores = await fetchDelClubSinInscribir('club-1', 'eq-1', 'temp-1');

    expect(red.selects.players).toBe('id, nickname');
    expect(jugadores).toEqual([
      { playerId: 'j2', nickname: 'Ángel' },
      { playerId: 'j1', nickname: 'Zape' },
    ]);
  });
});
