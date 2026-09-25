// Preferencias de pantalla de la C01 (T-107): alto contraste y movimiento
// reducido, guardadas en este dispositivo.

import { describe, expect, it } from 'vitest';

import {
  aplicarPreferencias,
  CLAVE_PREFERENCIAS,
  guardarPreferencias,
  interpretarPreferencias,
  leerPreferencias,
  PREFERENCIAS_POR_DEFECTO,
} from './preferencias';

/** Almacén en memoria con la forma de `localStorage`. */
function almacen(inicial: Record<string, string> = {}) {
  const datos = new Map(Object.entries(inicial));

  return {
    datos,
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => {
      datos.set(clave, valor);
    },
  };
}

/** Almacén que lanza, como `localStorage` en una ventana privada de Safari viejo. */
const roto = {
  getItem: (): string | null => {
    throw new Error('SecurityError');
  },
  setItem: (): void => {
    throw new Error('QuotaExceededError');
  },
};

describe('interpretarPreferencias', () => {
  it('sin nada guardado, los valores por defecto', () => {
    expect(interpretarPreferencias(null)).toEqual(PREFERENCIAS_POR_DEFECTO);
  });

  it('lee lo que se guardó', () => {
    expect(
      interpretarPreferencias(JSON.stringify({ altoContraste: true, movimientoReducido: false })),
    ).toEqual({ altoContraste: true, movimientoReducido: false });
  });

  it('con texto roto, los valores por defecto', () => {
    expect(interpretarPreferencias('{no es json')).toEqual(PREFERENCIAS_POR_DEFECTO);
  });

  it('ignora lo que no sea booleano y completa lo que falte', () => {
    expect(interpretarPreferencias(JSON.stringify({ altoContraste: 'sí' }))).toEqual(
      PREFERENCIAS_POR_DEFECTO,
    );
    expect(interpretarPreferencias(JSON.stringify({ movimientoReducido: true }))).toEqual({
      altoContraste: false,
      movimientoReducido: true,
    });
  });
});

describe('leerPreferencias y guardarPreferencias', () => {
  it('lo guardado se vuelve a leer igual', () => {
    const memoria = almacen();
    const preferencias = { altoContraste: true, movimientoReducido: true };

    guardarPreferencias(preferencias, memoria);

    expect(memoria.datos.has(CLAVE_PREFERENCIAS)).toBe(true);
    expect(leerPreferencias(memoria)).toEqual(preferencias);
  });

  it('un almacén que lanza no rompe nada: se lee el valor por defecto y guardar no lanza', () => {
    expect(leerPreferencias(roto)).toEqual(PREFERENCIAS_POR_DEFECTO);
    expect(() => {
      guardarPreferencias({ altoContraste: true, movimientoReducido: false }, roto);
    }).not.toThrow();
  });
});

describe('aplicarPreferencias', () => {
  it('pone y quita los dos atributos que leen los tokens', () => {
    const raiz = document.createElement('html');

    aplicarPreferencias({ altoContraste: true, movimientoReducido: true }, raiz);

    expect(raiz.dataset.contrast).toBe('high');
    expect(raiz.dataset.motion).toBe('reduced');

    aplicarPreferencias(PREFERENCIAS_POR_DEFECTO, raiz);

    expect(raiz.hasAttribute('data-contrast')).toBe(false);
    expect(raiz.hasAttribute('data-motion')).toBe(false);
  });
});
