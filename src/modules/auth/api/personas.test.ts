// Acceso a datos de la A07 (T-306). Se dobla el cliente de Supabase y se
// apuntan las llamadas encadenadas.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SIN_FILAS } from '@shared/lib/guardado';

import { GUARDADO_A_MEDIAS } from '../model/personas';
import { cambiarActivo, guardarPermisos, guardarRol } from './personas';

interface Paso {
  metodo: string;
  args: unknown[];
}

const red = vi.hoisted(() => ({
  llamadas: [] as { tabla: string; cadena: { metodo: string; args: unknown[] }[] }[],
  respuestas: [] as { data: unknown; error: unknown }[],
  porDefecto: { data: null, error: null } as { data: unknown; error: unknown },
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

        return cadena(registro, red.respuestas.shift() ?? red.porDefecto);
      },
    },
  };
});

function filtros(cadena: Paso[]): [unknown, unknown][] {
  return cadena
    .filter((paso) => paso.metodo === 'eq' || paso.metodo === 'in')
    .map((paso) => [paso.args[0], paso.args[1]]);
}

function metodos(cadena: Paso[]): string[] {
  return cadena.map((paso) => paso.metodo);
}

beforeEach(() => {
  red.llamadas.length = 0;
  red.respuestas.length = 0;
  red.porDefecto = { data: { id: 'tm-1' }, error: null };
});

describe('guardarPermisos', () => {
  it('da las altas antes que las bajas, y borra acotado al `team_member_id`', async () => {
    red.respuestas.push(
      { data: null, error: null },
      { data: [{ permission: 'stats.view' }], error: null },
    );

    await guardarPermisos('tm-1', 'usuario-1', {
      altas: ['event.approve'],
      bajas: ['stats.view'],
    });

    expect(red.llamadas).toHaveLength(2);
    expect(metodos(red.llamadas[0].cadena)).toContain('insert');
    expect(metodos(red.llamadas[1].cadena)).toContain('delete');
    expect(filtros(red.llamadas[1].cadena)).toEqual(
      expect.arrayContaining([
        ['team_member_id', 'tm-1'],
        ['permission', ['stats.view']],
      ]),
    );
  });

  it('un borrado sin filas, sin altas por medio, es `SIN_FILAS`', async () => {
    red.respuestas.push({ data: [], error: null });

    await expect(
      guardarPermisos('tm-1', 'usuario-1', { altas: [], bajas: ['stats.view'] }),
    ).rejects.toThrow(SIN_FILAS);
  });

  it('si las altas entraron y las bajas fallan, el fallo es `GUARDADO_A_MEDIAS`', async () => {
    red.respuestas.push({ data: null, error: null }, { data: null, error: { code: '57014' } });

    await expect(
      guardarPermisos('tm-1', 'usuario-1', { altas: ['event.approve'], bajas: ['stats.view'] }),
    ).rejects.toThrow(GUARDADO_A_MEDIAS);
  });

  it('si las altas fallan, no se llega a borrar nada', async () => {
    red.respuestas.push({ data: null, error: { code: '23505' } });

    await expect(
      guardarPermisos('tm-1', 'usuario-1', { altas: ['event.approve'], bajas: ['stats.view'] }),
    ).rejects.toEqual({ code: '23505' });
    expect(red.llamadas).toHaveLength(1);
  });
});

describe('guardarRol', () => {
  it('lleva el `team_id` en el filtro', async () => {
    await guardarRol('eq-1', 'tm-1', 'scout');

    expect(red.llamadas[0].tabla).toBe('team_members');
    expect(filtros(red.llamadas[0].cadena)).toEqual(
      expect.arrayContaining([
        ['id', 'tm-1'],
        ['team_id', 'eq-1'],
      ]),
    );
  });

  it('cero filas es `SIN_FILAS`', async () => {
    red.respuestas.push({ data: null, error: null });

    await expect(guardarRol('eq-1', 'tm-1', 'scout')).rejects.toThrow(SIN_FILAS);
  });
});

describe('cambiarActivo', () => {
  it('al dar de baja lleva el `team_id` y el estado de partida (`is_active` verdadero)', async () => {
    await cambiarActivo('eq-1', 'tm-1', false);

    expect(filtros(red.llamadas[0].cadena)).toEqual(
      expect.arrayContaining([
        ['id', 'tm-1'],
        ['team_id', 'eq-1'],
        ['is_active', true],
      ]),
    );
  });

  it('al reactivar, el estado de partida es `false`; y cero filas es `SIN_FILAS`', async () => {
    red.respuestas.push({ data: null, error: null });

    await expect(cambiarActivo('eq-1', 'tm-1', true)).rejects.toThrow(SIN_FILAS);
    expect(filtros(red.llamadas[0].cadena)).toEqual(expect.arrayContaining([['is_active', false]]));
  });
});
