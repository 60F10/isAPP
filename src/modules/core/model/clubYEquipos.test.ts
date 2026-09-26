// Lógica pura de las pantallas A03 y A04 (T-201): validación de club y
// equipo, orden de la lista y mensajes cuando la base dice que no.

import { describe, expect, it } from 'vitest';

import {
  LARGO_CATEGORIA,
  LARGO_NOMBRE_CLUB,
  LARGO_NOMBRE_CORTO,
  LARGO_NOMBRE_EQUIPO,
  limpiarTexto,
  mensajeDeErrorAlGuardar,
  ordenarEquipos,
  SIN_FILAS,
  validarClub,
  validarEquipo,
} from './clubYEquipos';

describe('limpiarTexto', () => {
  it('quita los espacios de los bordes y junta los de dentro', () => {
    expect(limpiarTexto('  C.D.   Unión   Tejina ')).toBe('C.D. Unión Tejina');
  });
});

describe('validarClub', () => {
  it('devuelve los valores limpios y sin errores', () => {
    expect(validarClub({ nombre: ' C.D. Unión Tejina ', nombreCorto: ' U. Tejina ' })).toEqual({
      errores: {},
      valores: { name: 'C.D. Unión Tejina', short_name: 'U. Tejina' },
    });
  });

  it('el nombre corto vacío se guarda como nulo', () => {
    expect(validarClub({ nombre: 'Tejina', nombreCorto: '   ' }).valores).toEqual({
      name: 'Tejina',
      short_name: null,
    });
  });

  it('el nombre es obligatorio', () => {
    const resultado = validarClub({ nombre: '   ', nombreCorto: '' });

    expect(resultado.valores).toBeNull();
    expect(resultado.errores.nombre).toBe('Escribe el nombre del club.');
  });

  it('rechaza los textos demasiado largos', () => {
    const resultado = validarClub({
      nombre: 'a'.repeat(LARGO_NOMBRE_CLUB + 1),
      nombreCorto: 'b'.repeat(LARGO_NOMBRE_CORTO + 1),
    });

    expect(resultado.valores).toBeNull();
    expect(resultado.errores.nombre).toBe(`Como mucho ${LARGO_NOMBRE_CLUB} caracteres.`);
    expect(resultado.errores.nombreCorto).toBe(`Como mucho ${LARGO_NOMBRE_CORTO} caracteres.`);
  });
});

describe('validarEquipo', () => {
  const otros = [
    { id: 'eq-1', name: 'Cadete A' },
    { id: 'eq-2', name: 'CD Tacoronte' },
  ];

  it('devuelve los valores limpios, con la categoría vacía como nula', () => {
    expect(
      validarEquipo({ nombre: ' UD  Orotava ', categoria: ' ', tipo: 'reference' }, otros),
    ).toEqual({
      errores: {},
      valores: { name: 'UD Orotava', category: null, kind: 'reference' },
    });
  });

  it('el nombre es obligatorio', () => {
    const resultado = validarEquipo({ nombre: '', categoria: 'Cadete', tipo: 'managed' }, otros);

    expect(resultado.valores).toBeNull();
    expect(resultado.errores.nombre).toBe('Escribe el nombre del equipo.');
  });

  it('no deja repetir un nombre del club, sin distinguir mayúsculas ni espacios', () => {
    const resultado = validarEquipo(
      { nombre: '  cadete   a ', categoria: '', tipo: 'managed' },
      otros,
    );

    expect(resultado.valores).toBeNull();
    expect(resultado.errores.nombre).toBe('Ya hay un equipo con ese nombre en el club.');
  });

  it('al editar, el nombre propio no cuenta como repetido', () => {
    expect(
      validarEquipo({ nombre: 'Cadete A', categoria: 'Cadete', tipo: 'managed' }, otros, 'eq-1')
        .valores,
    ).toEqual({ name: 'Cadete A', category: 'Cadete', kind: 'managed' });
  });

  it('rechaza los textos demasiado largos', () => {
    const resultado = validarEquipo(
      {
        nombre: 'a'.repeat(LARGO_NOMBRE_EQUIPO + 1),
        categoria: 'b'.repeat(LARGO_CATEGORIA + 1),
        tipo: 'managed',
      },
      otros,
    );

    expect(resultado.valores).toBeNull();
    expect(resultado.errores.nombre).toBe(`Como mucho ${LARGO_NOMBRE_EQUIPO} caracteres.`);
    expect(resultado.errores.categoria).toBe(`Como mucho ${LARGO_CATEGORIA} caracteres.`);
  });
});

describe('ordenarEquipos', () => {
  it('pone primero los gestionados y ordena cada grupo por nombre, a la española', () => {
    const ordenados = ordenarEquipos([
      { name: 'Ñandú CF', kind: 'reference' },
      { name: 'Cadete B', kind: 'managed' },
      { name: 'Atlético Tacoronte', kind: 'reference' },
      { name: 'Cadete A', kind: 'managed' },
      { name: 'Orotava', kind: 'reference' },
    ]);

    expect(ordenados.map((equipo) => equipo.name)).toEqual([
      'Cadete A',
      'Cadete B',
      'Atlético Tacoronte',
      'Ñandú CF',
      'Orotava',
    ]);
  });

  it('no toca la lista que recibe', () => {
    const lista = [
      { name: 'B', kind: 'managed' as const },
      { name: 'A', kind: 'managed' as const },
    ];

    ordenarEquipos(lista);

    expect(lista[0]?.name).toBe('B');
  });
});

describe('mensajeDeErrorAlGuardar', () => {
  it('nombre repetido, que la base comprueba aunque la pantalla ya lo haya mirado', () => {
    expect(mensajeDeErrorAlGuardar({ code: '23505', message: 'duplicate key' })).toBe(
      'Ya hay un equipo con ese nombre en el club.',
    );
  });

  it('la RLS dice que no, con error o sin tocar ninguna fila', () => {
    const esperado = 'No tienes permiso para cambiar esto.';

    expect(mensajeDeErrorAlGuardar({ code: '42501', message: 'row-level security' })).toBe(
      esperado,
    );
    expect(mensajeDeErrorAlGuardar(new Error(SIN_FILAS))).toBe(esperado);
  });

  it('sin red', () => {
    expect(mensajeDeErrorAlGuardar(new TypeError('Failed to fetch'))).toBe(
      'No hay conexión. No se ha guardado nada: vuelve a intentarlo con cobertura.',
    );
  });

  it('cualquier otro fallo', () => {
    expect(mensajeDeErrorAlGuardar(new Error('algo raro'))).toBe(
      'No se ha podido guardar. Vuelve a intentarlo.',
    );
  });
});
