// La lista de asistencia (T-229): qué estado tiene cada jugador, cómo se
// compone la pantalla, qué se manda a la base y qué queda en el borrador.

import { describe, expect, it } from 'vitest';

import {
  asistenciaTrasGuardar,
  borrarBorrador,
  cambiosTrasGuardar,
  claveDeBorrador,
  componerLista,
  estadoDe,
  filasAGuardar,
  fraseDeGuardado,
  fraseDelRecuento,
  fraseDeSinMarcar,
  guardarBorrador,
  hayCambios,
  interpretarBorrador,
  LARGO_OBSERVACION,
  leerBorrador,
  recuento,
  SIN_CAMBIOS,
} from './lista';

import type { Asistencia, Cambios, JugadorDeLista } from './lista';

const PLANTILLA: JugadorDeLista[] = [
  { playerId: 'p1', nickname: 'Tito', shirtNumber: 1 },
  { playerId: 'p2', nickname: 'Chicho', shirtNumber: 7 },
  { playerId: 'p3', nickname: 'Nano', shirtNumber: 10 },
  { playerId: 'p4', nickname: 'Pipo', shirtNumber: null },
];

const GUARDADAS: Asistencia[] = [
  { playerId: 'p2', nickname: 'Chicho', status: 'absent', notes: 'Avisó' },
  { playerId: 'p9', nickname: 'Yeray', status: 'late', notes: null },
];

function cambios(parcial: Partial<Cambios> = {}): Cambios {
  return { estados: {}, observaciones: {}, ...parcial };
}

/** Almacén en memoria con la forma de `localStorage`. */
function almacen(inicial: Record<string, string> = {}) {
  const datos = new Map(Object.entries(inicial));

  return {
    datos,
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => {
      datos.set(clave, valor);
    },
    removeItem: (clave: string) => {
      datos.delete(clave);
    },
  };
}

const roto = {
  getItem: (): string | null => {
    throw new Error('SecurityError');
  },
  setItem: (): void => {
    throw new Error('QuotaExceededError');
  },
  removeItem: (): void => {
    throw new Error('SecurityError');
  },
};

describe('estadoDe', () => {
  it('lo tocado gana a lo guardado', () => {
    expect(estadoDe('p2', GUARDADAS, cambios({ estados: { p2: 'late' } }), 'presentes')).toBe(
      'late',
    );
  });

  it('lo guardado gana a la partida', () => {
    expect(estadoDe('p2', GUARDADAS, SIN_CAMBIOS, 'presentes')).toBe('absent');
    expect(estadoDe('p2', GUARDADAS, SIN_CAMBIOS, 'sin_marcar')).toBe('absent');
  });

  it('sin nada, presente o sin marcar según la partida', () => {
    expect(estadoDe('p1', GUARDADAS, SIN_CAMBIOS, 'presentes')).toBe('present');
    expect(estadoDe('p1', GUARDADAS, SIN_CAMBIOS, 'sin_marcar')).toBeNull();
  });
});

describe('componerLista', () => {
  it('respeta el orden de la plantilla, con dorsal, apodo, estado y observación', () => {
    const lineas = componerLista(
      PLANTILLA,
      GUARDADAS,
      cambios({ estados: { p3: 'late' }, observaciones: { p3: 'Llegó en guagua' } }),
      'sin_marcar',
    );

    expect(lineas.slice(0, 4)).toEqual([
      {
        playerId: 'p1',
        nickname: 'Tito',
        shirtNumber: 1,
        status: null,
        notes: '',
        fueraDePlantilla: false,
      },
      {
        playerId: 'p2',
        nickname: 'Chicho',
        shirtNumber: 7,
        status: 'absent',
        notes: 'Avisó',
        fueraDePlantilla: false,
      },
      {
        playerId: 'p3',
        nickname: 'Nano',
        shirtNumber: 10,
        status: 'late',
        notes: 'Llegó en guagua',
        fueraDePlantilla: false,
      },
      {
        playerId: 'p4',
        nickname: 'Pipo',
        shirtNumber: null,
        status: null,
        notes: '',
        fueraDePlantilla: false,
      },
    ]);
  });

  it('pone al final, marcado, a quien tiene fila y ya no está en la plantilla', () => {
    const lineas = componerLista(PLANTILLA, GUARDADAS, SIN_CAMBIOS, 'presentes');

    expect(lineas).toHaveLength(5);
    expect(lineas[4]).toEqual({
      playerId: 'p9',
      nickname: 'Yeray',
      shirtNumber: null,
      status: 'late',
      notes: '',
      fueraDePlantilla: true,
    });
  });

  it('a quien ya no está no le llega lo tocado: se lee y no se cambia', () => {
    const lineas = componerLista(
      PLANTILLA,
      GUARDADAS,
      cambios({ estados: { p9: 'present' }, observaciones: { p9: 'Otra cosa' } }),
      'presentes',
    );

    expect(lineas[4]).toMatchObject({ playerId: 'p9', status: 'late', notes: '' });
  });

  it('la observación tocada gana a la guardada, también si se ha vaciado', () => {
    const lineas = componerLista(
      PLANTILLA,
      GUARDADAS,
      cambios({ observaciones: { p2: '' } }),
      'presentes',
    );

    expect(lineas[1]).toMatchObject({ playerId: 'p2', status: 'absent', notes: '' });
  });
});

describe('recuento', () => {
  it('cuenta los cuatro', () => {
    const lineas = componerLista(
      PLANTILLA,
      GUARDADAS,
      cambios({ estados: { p1: 'present', p3: 'present' } }),
      'sin_marcar',
    );

    expect(recuento(lineas)).toEqual({ presentes: 2, ausentes: 1, retrasos: 1, sinMarcar: 1 });
  });

  it('se escribe con sus plurales', () => {
    expect(fraseDelRecuento({ presentes: 18, ausentes: 2, retrasos: 1, sinMarcar: 0 })).toBe(
      '18 presentes · 2 ausentes · 1 retraso · 0 sin marcar',
    );
    expect(fraseDelRecuento({ presentes: 1, ausentes: 1, retrasos: 2, sinMarcar: 3 })).toBe(
      '1 presente · 1 ausente · 2 retrasos · 3 sin marcar',
    );
    expect(fraseDeGuardado({ presentes: 18, ausentes: 2, retrasos: 1, sinMarcar: 0 })).toBe(
      'Lista guardada: 18 presentes, 2 ausentes y 1 retraso.',
    );
  });

  it('dice cuántos quedan sin marcar, o nada si no queda ninguno', () => {
    expect(fraseDeSinMarcar(0)).toBeNull();
    expect(fraseDeSinMarcar(1)).toBe('Queda 1 sin marcar. Puedes guardar y terminar después.');
    expect(fraseDeSinMarcar(3)).toBe('Quedan 3 sin marcar. Puedes guardar y terminar después.');
  });
});

describe('filasAGuardar', () => {
  it('deja fuera a los sin marcar y manda null en la observación vacía', () => {
    const lineas = componerLista(
      PLANTILLA,
      [],
      cambios({
        estados: { p1: 'present', p2: 'absent', p3: 'late' },
        observaciones: { p1: '   ', p2: '  Avisó   ayer ', p4: 'Sin estado' },
      }),
      'sin_marcar',
    );

    expect(filasAGuardar(lineas)).toEqual([
      { player_id: 'p1', status: 'present', notes: null },
      { player_id: 'p2', status: 'absent', notes: 'Avisó ayer' },
      { player_id: 'p3', status: 'late', notes: null },
    ]);
  });

  it('no manda a quien ya no está en la plantilla: su fila no se toca', () => {
    const lineas = componerLista(PLANTILLA, GUARDADAS, SIN_CAMBIOS, 'sin_marcar');

    expect(filasAGuardar(lineas)).toEqual([{ player_id: 'p2', status: 'absent', notes: 'Avisó' }]);
  });

  it('recorta la observación al largo máximo', () => {
    const lineas = componerLista(
      PLANTILLA.slice(0, 1),
      [],
      cambios({ observaciones: { p1: 'a'.repeat(LARGO_OBSERVACION + 20) } }),
      'presentes',
    );

    expect(LARGO_OBSERVACION).toBe(280);
    expect(filasAGuardar(lineas)[0].notes).toHaveLength(280);
  });
});

describe('tras guardar', () => {
  const enviados = cambios({
    estados: { p1: 'present' },
    observaciones: { p1: ' Bien ', p3: 'Para cuando se marque', p4: '   ' },
  });
  const lineas = componerLista(PLANTILLA, GUARDADAS, enviados, 'sin_marcar');

  it('lo guardado pasa a ser lo que hay en pantalla, con quien ya no está', () => {
    expect(asistenciaTrasGuardar(lineas)).toEqual([
      { playerId: 'p1', nickname: 'Tito', status: 'present', notes: 'Bien' },
      { playerId: 'p2', nickname: 'Chicho', status: 'absent', notes: 'Avisó' },
      { playerId: 'p9', nickname: 'Yeray', status: 'late', notes: null },
    ]);
  });

  it('de lo tocado solo queda la observación de quien sigue sin marcar', () => {
    expect(cambiosTrasGuardar(enviados, enviados, lineas)).toEqual({
      estados: {},
      observaciones: { p3: 'Para cuando se marque' },
    });
  });

  it('con todos marcados, no queda nada', () => {
    const todos = cambios({ estados: { p2: 'late' }, observaciones: { p2: 'Tarde' } });

    expect(
      cambiosTrasGuardar(todos, todos, componerLista(PLANTILLA, [], todos, 'presentes')),
    ).toEqual(SIN_CAMBIOS);
  });

  it('lo que se tocó mientras se guardaba no viajó, y se queda', () => {
    const actuales = cambios({
      // p1 se cambió después de mandar; p3 se marcó después; p2 es nuevo.
      estados: { p1: 'late', p2: 'present', p3: 'absent' },
      observaciones: { p1: ' Bien ', p3: 'Para cuando se marque', p4: 'Ahora sí' },
    });

    expect(cambiosTrasGuardar(actuales, enviados, lineas)).toEqual({
      estados: { p1: 'late', p2: 'present', p3: 'absent' },
      observaciones: { p3: 'Para cuando se marque', p4: 'Ahora sí' },
    });
  });
});

describe('hayCambios', () => {
  it('dice si hay algo tocado', () => {
    expect(hayCambios(SIN_CAMBIOS)).toBe(false);
    expect(hayCambios(cambios({ estados: { p1: 'late' } }))).toBe(true);
    expect(hayCambios(cambios({ observaciones: { p1: '' } }))).toBe(true);
  });
});

describe('el borrador', () => {
  const BORRADOR = JSON.stringify({
    userId: 'usuario-1',
    estados: { p1: 'absent' },
    observaciones: { p1: 'Avisó' },
  });

  it('la clave lleva el entrenamiento', () => {
    expect(claveDeBorrador('ent-1')).toBe('sasi.lista.ent-1');
  });

  it('el de la misma cuenta se recupera', () => {
    expect(interpretarBorrador(BORRADOR, 'usuario-1')).toEqual({
      estados: { p1: 'absent' },
      observaciones: { p1: 'Avisó' },
    });
  });

  it('el de otra cuenta da null', () => {
    expect(interpretarBorrador(BORRADOR, 'usuario-2')).toBeNull();
  });

  it('la basura da null, sin lanzar', () => {
    expect(interpretarBorrador(null, 'usuario-1')).toBeNull();
    expect(interpretarBorrador('', 'usuario-1')).toBeNull();
    expect(interpretarBorrador('{', 'usuario-1')).toBeNull();
    expect(interpretarBorrador('null', 'usuario-1')).toBeNull();
    expect(interpretarBorrador('[1,2]', 'usuario-1')).toBeNull();
    expect(interpretarBorrador('{"userId":"usuario-1"}', 'usuario-1')).toBeNull();
    expect(
      interpretarBorrador('{"userId":"usuario-1","estados":7,"observaciones":"x"}', 'usuario-1'),
    ).toBeNull();
  });

  it('lo que no se entiende se deja fuera, entrada a entrada', () => {
    const crudo = JSON.stringify({
      userId: 'usuario-1',
      estados: { p1: 'late', p2: 'justificada', p3: 4 },
      observaciones: { p1: 'Vale', p2: 12 },
    });

    expect(interpretarBorrador(crudo, 'usuario-1')).toEqual({
      estados: { p1: 'late' },
      observaciones: { p1: 'Vale' },
    });
  });

  it('un borrador sin nada dentro da null', () => {
    const crudo = JSON.stringify({ userId: 'usuario-1', estados: {}, observaciones: {} });

    expect(interpretarBorrador(crudo, 'usuario-1')).toBeNull();
  });

  it('se guarda, se lee y se borra en el almacén', () => {
    const local = almacen();
    const tocado = cambios({ estados: { p1: 'late' } });

    guardarBorrador('ent-1', 'usuario-1', tocado, local);

    expect(local.datos.has('sasi.lista.ent-1')).toBe(true);
    expect(leerBorrador('ent-1', 'usuario-1', local)).toEqual(tocado);
    expect(leerBorrador('ent-1', 'usuario-2', local)).toBeNull();
    expect(leerBorrador('ent-2', 'usuario-1', local)).toBeNull();

    borrarBorrador('ent-1', local);

    expect(local.datos.size).toBe(0);
  });

  it('guardar sin cambios quita el borrador', () => {
    const local = almacen({ 'sasi.lista.ent-1': BORRADOR });

    guardarBorrador('ent-1', 'usuario-1', SIN_CAMBIOS, local);

    expect(local.datos.size).toBe(0);
  });

  it('sin cuenta no hay borrador: ni se lee ni se escribe', () => {
    const deNadie = JSON.stringify({ userId: '', estados: { p1: 'late' }, observaciones: {} });
    const local = almacen();

    expect(interpretarBorrador(deNadie, '')).toBeNull();

    guardarBorrador('ent-1', '', cambios({ estados: { p1: 'late' } }), local);

    expect(local.datos.size).toBe(0);
  });

  it('si el almacenamiento lanza, nada lanza', () => {
    expect(leerBorrador('ent-1', 'usuario-1', roto)).toBeNull();
    expect(() => {
      guardarBorrador('ent-1', 'usuario-1', cambios({ estados: { p1: 'late' } }), roto);
      borrarBorrador('ent-1', roto);
    }).not.toThrow();
  });
});
