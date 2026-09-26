// Lógica pura de la plantilla, A05 y A06 (T-202).
//
// Lo que más importa vigilar: que del jugador solo salga apodo, dorsal y
// posición. Ningún nombre real (DOC 05 §6.1).

import { describe, expect, it } from 'vitest';

import {
  DISPONIBILIDADES,
  fechaDeHoy,
  LARGO_APODO,
  ordenarPlantilla,
  POSICIONES,
  validarJugador,
} from './plantilla';

const COMPANEROS = [
  { id: 'ins-1', shirtNumber: 1 },
  { id: 'ins-2', shirtNumber: 10 },
  { id: 'ins-3', shirtNumber: null },
];

describe('validarJugador', () => {
  it('devuelve apodo limpio, dorsal como número y posición', () => {
    expect(
      validarJugador({ apodo: '  El   Rubio ', dorsal: ' 7 ', posicion: 'MF' }, COMPANEROS),
    ).toEqual({
      errores: {},
      valores: { nickname: 'El Rubio', shirt_number: 7, default_position: 'MF' },
    });
  });

  it('solo devuelve las tres columnas permitidas: nada de nombre real', () => {
    const { valores } = validarJugador({ apodo: 'Pipo', dorsal: '', posicion: '' }, COMPANEROS);

    expect(valores).not.toBeNull();
    expect(Object.keys(valores ?? {}).sort()).toEqual([
      'default_position',
      'nickname',
      'shirt_number',
    ]);
  });

  it('dorsal y posición vacíos se guardan como nulos', () => {
    expect(
      validarJugador({ apodo: 'Pipo', dorsal: '  ', posicion: '' }, COMPANEROS).valores,
    ).toEqual({
      nickname: 'Pipo',
      shirt_number: null,
      default_position: null,
    });
  });

  it('el apodo es obligatorio y tiene un largo máximo', () => {
    expect(validarJugador({ apodo: ' ', dorsal: '', posicion: '' }, COMPANEROS).errores.apodo).toBe(
      'Escribe el apodo del jugador.',
    );
    expect(
      validarJugador({ apodo: 'a'.repeat(LARGO_APODO + 1), dorsal: '', posicion: '' }, COMPANEROS)
        .errores.apodo,
    ).toBe(`Como mucho ${LARGO_APODO} caracteres.`);
  });

  it('el dorsal va del 1 al 99 y es un número entero', () => {
    for (const dorsal of ['0', '100', '7.5', 'siete', '-3']) {
      expect(
        validarJugador({ apodo: 'Pipo', dorsal, posicion: '' }, COMPANEROS).errores.dorsal,
      ).toBe('El dorsal va del 1 al 99.');
    }
  });

  it('no deja repetir el dorsal de otro jugador de la plantilla', () => {
    const resultado = validarJugador({ apodo: 'Pipo', dorsal: '10', posicion: '' }, COMPANEROS);

    expect(resultado.valores).toBeNull();
    expect(resultado.errores.dorsal).toBe('Ese dorsal ya lo lleva otro jugador.');
  });

  it('al editar, su propio dorsal no cuenta como repetido', () => {
    expect(
      validarJugador({ apodo: 'Pipo', dorsal: '10', posicion: 'FW' }, COMPANEROS, 'ins-2').valores,
    ).toEqual({ nickname: 'Pipo', shirt_number: 10, default_position: 'FW' });
  });
});

describe('ordenarPlantilla', () => {
  it('por dorsal, los que no tienen al final y por apodo a la española', () => {
    const ordenada = ordenarPlantilla([
      { shirtNumber: null, nickname: 'Ñoño' },
      { shirtNumber: 9, nickname: 'Nando' },
      { shirtNumber: 1, nickname: 'Tito' },
      { shirtNumber: null, nickname: 'Adri' },
      { shirtNumber: 10, nickname: 'Pipo' },
    ]);

    expect(ordenada.map((jugador) => jugador.nickname)).toEqual([
      'Tito',
      'Nando',
      'Pipo',
      'Adri',
      'Ñoño',
    ]);
  });

  it('no toca la lista que recibe', () => {
    const lista = [
      { shirtNumber: 2, nickname: 'B' },
      { shirtNumber: 1, nickname: 'A' },
    ];

    ordenarPlantilla(lista);

    expect(lista[0]?.nickname).toBe('B');
  });
});

describe('etiquetas', () => {
  it('las cuatro posiciones y los tres estados, en palabras', () => {
    expect(POSICIONES).toEqual({
      GK: 'Portero',
      DF: 'Defensa',
      MF: 'Centrocampista',
      FW: 'Delantero',
    });
    expect(DISPONIBILIDADES).toEqual({
      available: 'Disponible',
      unavailable: 'No disponible',
      sanctioned: 'Sancionado',
    });
  });
});

describe('fechaDeHoy', () => {
  it('la fecha local en formato de columna date, con ceros delante', () => {
    expect(fechaDeHoy(new Date(2026, 8, 5, 23, 59))).toBe('2026-09-05');
  });
});
