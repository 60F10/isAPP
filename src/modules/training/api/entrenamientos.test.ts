// Acceso a datos de los entrenamientos (T-228). Se dobla el cliente de
// Supabase y se apuntan las llamadas encadenadas.
//
// Lo que se vigila: que el alta lleve equipo, temporada y autor; que ninguna
// consulta nombre `notes`, que es una columna que ve todo el club y no se usa;
// y que cambiar y borrar sin fila de vuelta salgan como `SIN_FILAS`.
//
// Desde la T-230, también que la tanda de «Repetir cada semana» viaje en UN
// solo `insert`: es lo que hace que entren todos o ninguno.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SIN_FILAS } from '@shared/lib/guardado';

import {
  actualizarEntrenamiento,
  borrarEntrenamiento,
  crearEntrenamiento,
  crearEntrenamientos,
  fetchEntrenamiento,
  fetchEntrenamientos,
  fetchFinDeTemporada,
} from './entrenamientos';

interface Paso {
  metodo: string;
  args: unknown[];
}

const red = vi.hoisted(() => ({
  llamadas: [] as { tabla: string; cadena: { metodo: string; args: unknown[] }[] }[],
  respuesta: { data: null, error: null } as { data: unknown; error: unknown },
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

        return cadena(registro, red.respuesta);
      },
    },
  };
});

const COLUMNAS = 'id, team_id, season_id, scheduled_at, location, focus';

const FILA = {
  id: 'ent-1',
  team_id: 'eq-1',
  season_id: 'temp-1',
  scheduled_at: '2026-10-13T17:00:00.000Z',
  location: 'Campo de Fútbol Izquierdo Rodríguez',
  focus: null,
};

const ENTRENAMIENTO = {
  id: 'ent-1',
  teamId: 'eq-1',
  seasonId: 'temp-1',
  scheduledAt: '2026-10-13T17:00:00.000Z',
  location: 'Campo de Fútbol Izquierdo Rodríguez',
  focus: null,
};

const DATOS = {
  scheduled_at: '2026-10-13T17:00:00.000Z',
  location: 'Campo de Fútbol Izquierdo Rodríguez',
  focus: null,
};

function ultima(): { tabla: string; cadena: Paso[] } {
  const llamada = red.llamadas.at(-1);

  if (llamada === undefined) {
    throw new Error('No hubo ninguna llamada.');
  }

  return llamada;
}

function paso(metodo: string): unknown[] {
  const encontrado = ultima().cadena.find((p) => p.metodo === metodo);

  if (encontrado === undefined) {
    throw new Error(`La consulta no llamó a ${metodo}.`);
  }

  return encontrado.args;
}

function eqs(): [unknown, unknown][] {
  return ultima()
    .cadena.filter((p) => p.metodo === 'eq')
    .map((p) => [p.args[0], p.args[1]]);
}

beforeEach(() => {
  red.llamadas.length = 0;
  red.respuesta = { data: FILA, error: null };
});

describe('fetchEntrenamientos', () => {
  it('pide los del equipo en la temporada y los traduce', async () => {
    red.respuesta = { data: [FILA], error: null };

    await expect(fetchEntrenamientos('eq-1', 'temp-1')).resolves.toEqual([ENTRENAMIENTO]);
    expect(ultima().tabla).toBe('training_sessions');
    expect(eqs()).toEqual([
      ['team_id', 'eq-1'],
      ['season_id', 'temp-1'],
    ]);
  });

  it('deja pasar el error de la base', async () => {
    const error = { code: '42501', message: 'permission denied' };
    red.respuesta = { data: null, error };

    await expect(fetchEntrenamientos('eq-1', 'temp-1')).rejects.toBe(error);
  });
});

describe('fetchEntrenamiento', () => {
  it('devuelve el entrenamiento, o nada si la base no lo enseña', async () => {
    await expect(fetchEntrenamiento('ent-1')).resolves.toEqual(ENTRENAMIENTO);
    expect(eqs()).toEqual([['id', 'ent-1']]);

    red.respuesta = { data: null, error: null };

    await expect(fetchEntrenamiento('ent-9')).resolves.toBeNull();
  });
});

describe('crearEntrenamiento', () => {
  it('manda el equipo, la temporada y quién lo crea, y devuelve el creado', async () => {
    const creado = await crearEntrenamiento(
      { equipoId: 'eq-1', temporadaId: 'temp-1', userId: 'usuario-1' },
      DATOS,
    );

    expect(creado).toEqual(ENTRENAMIENTO);
    expect(ultima().tabla).toBe('training_sessions');
    expect(paso('insert')).toEqual([
      {
        scheduled_at: '2026-10-13T17:00:00.000Z',
        location: 'Campo de Fútbol Izquierdo Rodríguez',
        focus: null,
        team_id: 'eq-1',
        season_id: 'temp-1',
        created_by: 'usuario-1',
      },
    ]);
  });
});

describe('crearEntrenamientos', () => {
  const DESTINO = { equipoId: 'eq-1', temporadaId: 'temp-1', userId: 'usuario-1' };
  const LISTA = [
    DATOS,
    { ...DATOS, scheduled_at: '2026-10-15T17:00:00.000Z' },
    { ...DATOS, scheduled_at: '2026-10-20T17:00:00.000Z' },
  ];

  it('hace una sola llamada a `insert`, con todas las filas, y dice cuántas se crearon', async () => {
    red.respuesta = { data: [{ id: 'ent-1' }, { id: 'ent-2' }, { id: 'ent-3' }], error: null };

    await expect(crearEntrenamientos(DESTINO, LISTA)).resolves.toBe(3);

    expect(red.llamadas).toHaveLength(1);
    expect(ultima().tabla).toBe('training_sessions');
    expect(ultima().cadena.filter((p) => p.metodo === 'insert')).toHaveLength(1);

    const [filas] = paso('insert') as [Record<string, unknown>[]];

    expect(Array.isArray(filas)).toBe(true);
    expect(filas).toHaveLength(3);
    expect(filas.map((fila) => fila.scheduled_at)).toEqual([
      '2026-10-13T17:00:00.000Z',
      '2026-10-15T17:00:00.000Z',
      '2026-10-20T17:00:00.000Z',
    ]);

    for (const fila of filas) {
      expect(fila).toMatchObject({
        team_id: 'eq-1',
        season_id: 'temp-1',
        created_by: 'usuario-1',
        location: 'Campo de Fútbol Izquierdo Rodríguez',
        focus: null,
      });
    }
  });

  it('deja pasar el error de la base: no se ha creado ninguno', async () => {
    const error = { code: '42501', message: 'permission denied' };
    red.respuesta = { data: null, error };

    await expect(crearEntrenamientos(DESTINO, LISTA)).rejects.toBe(error);
  });

  it('con la lista vacía no llama a la base', async () => {
    await expect(crearEntrenamientos(DESTINO, [])).resolves.toBe(0);
    expect(red.llamadas).toHaveLength(0);
  });
});

describe('fetchFinDeTemporada', () => {
  it('lee `ends_on` de la temporada', async () => {
    red.respuesta = { data: { ends_on: '2027-06-30' }, error: null };

    await expect(fetchFinDeTemporada('temp-1')).resolves.toBe('2027-06-30');
    expect(ultima().tabla).toBe('seasons');
    expect(paso('select')).toEqual(['ends_on']);
    expect(eqs()).toEqual([['id', 'temp-1']]);
  });

  it('sin fila, no hay fecha', async () => {
    red.respuesta = { data: null, error: null };

    await expect(fetchFinDeTemporada('temp-9')).resolves.toBeNull();
  });

  it('deja pasar el error de la base', async () => {
    const error = { code: '42501', message: 'permission denied' };
    red.respuesta = { data: null, error };

    await expect(fetchFinDeTemporada('temp-1')).rejects.toBe(error);
  });
});

describe('actualizarEntrenamiento', () => {
  it('cambia la fila por su `id` y la pide de vuelta', async () => {
    await expect(actualizarEntrenamiento('ent-1', DATOS)).resolves.toEqual(ENTRENAMIENTO);
    expect(paso('update')).toEqual([DATOS]);
    expect(eqs()).toEqual([['id', 'ent-1']]);
  });

  it('lanza SIN_FILAS si la base no cambió ninguna', async () => {
    red.respuesta = { data: null, error: null };

    await expect(actualizarEntrenamiento('ent-1', DATOS)).rejects.toThrow(SIN_FILAS);
  });
});

describe('borrarEntrenamiento', () => {
  it('borra la fila por su `id` y la pide de vuelta', async () => {
    await expect(borrarEntrenamiento('ent-1')).resolves.toBeUndefined();
    expect(ultima().cadena.map((p) => p.metodo)).toContain('delete');
    expect(eqs()).toEqual([['id', 'ent-1']]);
  });

  it('lanza SIN_FILAS si la base no borró ninguna', async () => {
    red.respuesta = { data: null, error: null };

    await expect(borrarEntrenamiento('ent-1')).rejects.toThrow(SIN_FILAS);
  });
});

describe('la columna `notes`', () => {
  it('ninguna consulta la nombra: ni la lee ni la escribe', async () => {
    red.respuesta = { data: [FILA], error: null };
    await fetchEntrenamientos('eq-1', 'temp-1');

    red.respuesta = { data: FILA, error: null };
    await fetchEntrenamiento('ent-1');
    await crearEntrenamiento(
      { equipoId: 'eq-1', temporadaId: 'temp-1', userId: 'usuario-1' },
      DATOS,
    );
    await actualizarEntrenamiento('ent-1', DATOS);
    await borrarEntrenamiento('ent-1');

    red.respuesta = { data: [{ id: 'ent-2' }], error: null };
    await crearEntrenamientos({ equipoId: 'eq-1', temporadaId: 'temp-1', userId: 'usuario-1' }, [
      DATOS,
    ]);

    red.respuesta = { data: { ends_on: '2027-06-30' }, error: null };
    await fetchFinDeTemporada('temp-1');

    expect(red.llamadas).toHaveLength(7);
    expect(JSON.stringify(red.llamadas)).not.toContain('notes');

    // Y tampoco llega de rebote: cada `select` nombra sus columnas, sin `*`.
    const pedidas = red.llamadas.flatMap((llamada) =>
      llamada.cadena.filter((p) => p.metodo === 'select').map((p) => p.args[0]),
    );

    expect(pedidas).toEqual([COLUMNAS, COLUMNAS, COLUMNAS, COLUMNAS, 'id', 'id', 'ends_on']);
  });
});
