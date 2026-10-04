// Acceso a datos de «Mis aportaciones» (T-222). Se dobla el cliente de
// Supabase y se apuntan las llamadas encadenadas.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SIN_FILAS } from '@shared/lib/guardado';

import { borrarEvento, cambiarJugador, cambiarSegundo, fetchAportaciones } from './aportaciones';

interface Paso {
  metodo: string;
  args: unknown[];
}

const red = vi.hoisted(() => ({
  llamadas: [] as { tabla: string; cadena: { metodo: string; args: unknown[] }[] }[],
  respuestas: [] as { data: unknown; error: unknown }[],
  porDefecto: { data: null, error: null } as { data: unknown; error: unknown },
}));

vi.mock('@modules/match', () => ({ desdeFilas: () => [] }));
vi.mock('@shared/lib/supabase', () => {
  const cadena = (
    registro: { metodo: string; args: unknown[] }[],
    respuesta: { data: unknown; error: unknown },
  ): unknown =>
    new Proxy(
      {},
      {
        get: (_objetivo, metodo: string) => {
          if (metodo === 'then') {
            return (alResolver: (valor: unknown) => unknown) =>
              Promise.resolve(respuesta).then(alResolver);
          }

          return (...args: unknown[]) => {
            registro.push({ metodo, args });

            return cadena(registro, respuesta);
          };
        },
      },
    );

  return {
    supabase: {
      from: (tabla: string) => {
        const registro: { metodo: string; args: unknown[] }[] = [];

        red.llamadas.push({ tabla, cadena: registro });

        return cadena(registro, red.respuestas.shift() ?? red.porDefecto);
      },
    },
  };
});

function ultima() {
  const llamada = red.llamadas.at(-1);

  if (llamada === undefined) {
    throw new Error('No hubo ninguna llamada.');
  }

  return llamada;
}

function eqs(cadena: Paso[]): [unknown, unknown][] {
  return cadena
    .filter((p) => p.metodo === 'eq' || p.metodo === 'in')
    .map((p) => [p.args[0], p.args[1]]);
}

beforeEach(() => {
  red.llamadas.length = 0;
  red.respuestas.length = 0;
  red.porDefecto = { data: { id: 'e1' }, error: null };
});

describe('fetchAportaciones', () => {
  it('filtra los partidos por equipo y temporada, y los eventos por autor', async () => {
    red.respuestas.push({ data: [{ id: 'p1' }], error: null }, { data: [], error: null });

    await fetchAportaciones('eq-1', 'temp-1', 'u1');

    const partidos = red.llamadas.find((llamada) => llamada.tabla === 'matches');
    const eventos = red.llamadas.find((llamada) => llamada.tabla === 'match_events');

    expect(eqs(partidos?.cadena ?? [])).toEqual([
      ['team_id', 'eq-1'],
      ['season_id', 'temp-1'],
    ]);
    expect(eqs(eventos?.cadena ?? [])).toEqual([
      ['created_by', 'u1'],
      ['match_id', ['p1']],
    ]);
  });

  it('ninguna consulta nombra full_name y de players solo se lee nickname', async () => {
    red.respuestas.push(
      {
        data: [{ id: 'p1', rival: null, competicion: { periods_count: 2, period_minutes: 40 } }],
        error: null,
      },
      { data: [{ match_id: 'p1' }], error: null },
      { data: [], error: null },
    );

    await fetchAportaciones('eq-1', 'temp-1', 'u1');

    const textos = red.llamadas
      .flatMap((llamada) => llamada.cadena)
      .filter((p) => p.metodo === 'select')
      .map((p) => String(p.args[0]));

    expect(textos.length).toBeGreaterThan(0);
    expect(textos.join(' ')).not.toContain('full_name');
    expect(textos.join(' ')).toContain('players(nickname)');
  });
});

describe('correcciones', () => {
  it('cambiarJugador escribe solo player_id, con id y match_id', async () => {
    await cambiarJugador({ id: 'e1', partidoId: 'p1', jugador: 'j9' });

    const { tabla, cadena } = ultima();

    expect(tabla).toBe('match_events');
    expect(cadena.find((p) => p.metodo === 'update')?.args[0]).toEqual({ player_id: 'j9' });
    expect(eqs(cadena)).toEqual([
      ['id', 'e1'],
      ['match_id', 'p1'],
    ]);
  });

  it('cambiarSegundo escribe solo secondary_player_id, y null es «Sin asistencia»', async () => {
    await cambiarSegundo({ id: 'e1', partidoId: 'p1', segundo: null });

    const { cadena } = ultima();

    expect(cadena.find((p) => p.metodo === 'update')?.args[0]).toEqual({
      secondary_player_id: null,
    });
    expect(eqs(cadena)).toEqual([
      ['id', 'e1'],
      ['match_id', 'p1'],
    ]);
  });

  it('borrarEvento es un delete con id y match_id', async () => {
    await borrarEvento({ id: 'e1', partidoId: 'p1' });

    const { cadena } = ultima();

    expect(cadena.some((p) => p.metodo === 'delete')).toBe(true);
    expect(cadena.some((p) => p.metodo === 'update')).toBe(false);
    expect(eqs(cadena)).toEqual([
      ['id', 'e1'],
      ['match_id', 'p1'],
    ]);
  });

  it.each([
    ['cambiarJugador', () => cambiarJugador({ id: 'e1', partidoId: 'p1', jugador: 'j9' })],
    ['cambiarSegundo', () => cambiarSegundo({ id: 'e1', partidoId: 'p1', segundo: 'j9' })],
    ['borrarEvento', () => borrarEvento({ id: 'e1', partidoId: 'p1' })],
  ])('%s con cero filas lanza SIN_FILAS', async (_nombre, llamar) => {
    red.porDefecto = { data: null, error: null };

    await expect(llamar()).rejects.toThrow(SIN_FILAS);
  });

  it('el error de la base pasa tal cual', async () => {
    const fallo = { code: 'P0001', message: 'No está convocado' };

    red.porDefecto = { data: null, error: fallo };

    await expect(cambiarJugador({ id: 'e1', partidoId: 'p1', jugador: 'j9' })).rejects.toBe(fallo);
  });
});
