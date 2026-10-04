// Lógica pura de la C02 (T-303): el origen sale del mensaje y el resumen lo corta.

import { describe, expect, it } from 'vitest';

import { origenDe, resumenDeMensaje } from './consulta';

describe('origenDe', () => {
  it.each(['boundary', 'ruta', 'global', 'promesa', 'contexto', 'sync'] as const)(
    'saca el origen %s',
    (origen) => {
      expect(origenDe(`[${origen}] Algo falló`)).toBe(origen);
    },
  );

  it('da «desconocido» si el mensaje no empieza por un origen conocido', () => {
    expect(origenDe('Algo falló')).toBe('desconocido');
    expect(origenDe('[otro] Algo falló')).toBe('desconocido');
    expect(origenDe('Algo [sync] falló')).toBe('desconocido');
  });
});

describe('resumenDeMensaje', () => {
  it('quita el origen y deja el resto', () => {
    expect(resumenDeMensaje('[sync] No hay red')).toBe('No hay red');
  });

  it('deja intacto un mensaje sin origen', () => {
    expect(resumenDeMensaje('No hay red')).toBe('No hay red');
  });

  it('corta a 120 letras con puntos suspensivos', () => {
    const resumen = resumenDeMensaje(`[ruta] ${'a'.repeat(300)}`);

    expect(resumen).toHaveLength(120);
    expect(resumen.endsWith('…')).toBe(true);
  });

  it('no corta lo que cabe justo', () => {
    expect(resumenDeMensaje(`[ruta] ${'a'.repeat(120)}`)).toBe('a'.repeat(120));
  });
});
