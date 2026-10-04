// Acceso a datos de la C02 (T-222). Se dobla el cliente de Supabase y se
// apuntan las llamadas encadenadas: filtros, orden y cursor.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SIN_FILTROS } from '../model/consulta';

import { escaparComodines, fetchErrores } from './errorLogs';

interface Paso {
  metodo: string;
  args: unknown[];
}

const red = vi.hoisted(() => ({
  llamadas: [] as { tabla: string; cadena: { metodo: string; args: unknown[] }[] }[],
  respuestas: [] as { data: unknown; error: unknown }[],
}));

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

        return cadena(registro, red.respuestas.shift() ?? { data: [], error: null });
      },
    },
  };
});

function consultaDeErrores(): Paso[] {
  const llamada = red.llamadas.find((l) => l.tabla === 'error_logs');

  if (llamada === undefined) {
    throw new Error('No se consultó error_logs.');
  }

  return llamada.cadena;
}

function fila(n: number) {
  return {
    id: `e${String(n).padStart(3, '0')}`,
    user_id: null,
    route: '/x',
    message: '[ruta] fallo',
    stack: null,
    device: null,
    app_version: null,
    created_at: '2026-10-03T10:00:00+00:00',
  };
}

beforeEach(() => {
  red.llamadas.length = 0;
  red.respuestas.length = 0;
});

describe('escaparComodines', () => {
  it('escapa %, _ y la barra, y quita el *', () => {
    expect(escaparComodines('50%')).toBe('50\\%');
    expect(escaparComodines('a_b')).toBe('a\\_b');
    expect(escaparComodines('a\\b')).toBe('a\\\\b');
    expect(escaparComodines('/par*tidos/*')).toBe('/partidos/');
  });
});

describe('fetchErrores', () => {
  it('ordena por created_at e id descendentes y pide una fila de más', async () => {
    await fetchErrores(SIN_FILTROS, null);

    const cadena = consultaDeErrores();

    expect(cadena.filter((p) => p.metodo === 'order').map((p) => [p.args[0], p.args[1]])).toEqual([
      ['created_at', { ascending: false }],
      ['id', { ascending: false }],
    ]);
    expect(cadena.find((p) => p.metodo === 'limit')?.args[0]).toBe(51);
    expect(cadena.some((p) => p.metodo === 'or')).toBe(false);
    expect(cadena.some((p) => p.metodo === 'range')).toBe(false);
  });

  it('la segunda página pide lo anterior a la última fila vista', async () => {
    await fetchErrores(SIN_FILTROS, { createdAt: '2026-10-03T10:00:00+00:00', id: 'e050' });

    const filtro = consultaDeErrores().find((p) => p.metodo === 'or');

    expect(filtro?.args[0]).toBe(
      'created_at.lt.2026-10-03T10:00:00+00:00,and(created_at.eq.2026-10-03T10:00:00+00:00,id.lt.e050)',
    );
  });

  it('los filtros van en la consulta', async () => {
    await fetchErrores({ origen: 'sync', ruta: 'part*idos', soloHoy: true }, null);

    const cadena = consultaDeErrores();

    expect(cadena.find((p) => p.metodo === 'like')?.args).toEqual(['message', '[sync]%']);
    expect(cadena.find((p) => p.metodo === 'ilike')?.args).toEqual(['route', '%partidos%']);
    expect(cadena.find((p) => p.metodo === 'gte')?.args[0]).toBe('created_at');
  });

  it('sin filtros no añade ninguno', async () => {
    await fetchErrores(SIN_FILTROS, null);

    const metodos = consultaDeErrores().map((p) => p.metodo);

    expect(metodos).not.toContain('like');
    expect(metodos).not.toContain('ilike');
    expect(metodos).not.toContain('gte');
  });

  it('con una fila de más hay más páginas y la página trae solo 50', async () => {
    red.respuestas.push({
      data: Array.from({ length: 51 }, (_, n) => fila(n)),
      error: null,
    });

    const pagina = await fetchErrores(SIN_FILTROS, null);

    expect(pagina.hayMas).toBe(true);
    expect(pagina.filas).toHaveLength(50);
  });
});
