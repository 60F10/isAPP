// De qué parte una lista nueva (T-229): todos presentes o todos sin marcar,
// guardado en este dispositivo.

import { describe, expect, it } from 'vitest';

import {
  CLAVE_PARTIDA,
  guardarPartida,
  interpretarPartida,
  leerPartida,
  PARTIDA_POR_DEFECTO,
} from './partida';

/** Almacén que lanza, como `localStorage` con el almacenamiento bloqueado. */
const roto = {
  getItem: (): string | null => {
    throw new Error('SecurityError');
  },
  setItem: (): void => {
    throw new Error('QuotaExceededError');
  },
};

describe('interpretarPartida', () => {
  it('sin nada guardado, todos presentes', () => {
    expect(PARTIDA_POR_DEFECTO).toBe('presentes');
    expect(interpretarPartida(null)).toBe('presentes');
  });

  it('con basura o con un valor desconocido, todos presentes', () => {
    expect(interpretarPartida('')).toBe('presentes');
    expect(interpretarPartida('{"partida":"sin_marcar"}')).toBe('presentes');
    expect(interpretarPartida('ausentes')).toBe('presentes');
    expect(interpretarPartida('SIN_MARCAR')).toBe('presentes');
  });

  it('respeta lo elegido', () => {
    expect(interpretarPartida('sin_marcar')).toBe('sin_marcar');
    expect(interpretarPartida('presentes')).toBe('presentes');
  });
});

describe('leerPartida y guardarPartida', () => {
  it('lo guardado se vuelve a leer, con la clave acordada', () => {
    const datos = new Map<string, string>();
    const almacen = {
      getItem: (clave: string) => datos.get(clave) ?? null,
      setItem: (clave: string, valor: string) => {
        datos.set(clave, valor);
      },
    };

    guardarPartida('sin_marcar', almacen);

    expect(CLAVE_PARTIDA).toBe('sasi.lista-de-partida');
    expect(datos.get('sasi.lista-de-partida')).toBe('sin_marcar');
    expect(leerPartida(almacen)).toBe('sin_marcar');
  });

  it('si el almacenamiento lanza, ni leer ni guardar lanzan', () => {
    expect(leerPartida(roto)).toBe('presentes');
    expect(() => {
      guardarPartida('sin_marcar', roto);
    }).not.toThrow();
  });
});
