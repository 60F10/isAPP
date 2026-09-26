import { describe, expect, it } from 'vitest';

import { formatoReloj, minutoDePresentacion, segundosDeParte } from './reloj';

import type { ParteLocal } from './directo';

function parte(cambios: Partial<ParteLocal> = {}): ParteLocal {
  return {
    id: 'p1',
    numero: 1,
    inicio: 1_000_000,
    pausadoMs: 0,
    pausaDesde: null,
    segundosReales: null,
    ...cambios,
  };
}

describe('segundosDeParte', () => {
  it('se calcula por anclaje: ahora menos el arranque', () => {
    expect(segundosDeParte(parte(), 1_000_000 + 125_900)).toBe(125);
  });

  it('descuenta lo pausado y congela mientras dura la pausa', () => {
    const pausada = parte({ pausadoMs: 10_000, pausaDesde: 1_000_000 + 70_000 });

    expect(segundosDeParte(pausada, 1_000_000 + 70_000)).toBe(60);
    expect(segundosDeParte(pausada, 1_000_000 + 500_000)).toBe(60);
  });

  it('una parte cerrada vale su duración real, pase lo que pase con el reloj', () => {
    expect(segundosDeParte(parte({ segundosReales: 2_490 }), 9_999_999_999)).toBe(2_490);
  });

  it('nunca da negativo, aunque el reloj del móvil vaya por detrás del arranque', () => {
    expect(segundosDeParte(parte(), 999_000)).toBe(0);
  });
});

describe('formatoReloj', () => {
  it('pinta mm:ss con ceros, también pasados los sesenta minutos', () => {
    expect(formatoReloj(0)).toBe('00:00');
    expect(formatoReloj(2_052)).toBe('34:12');
    expect(formatoReloj(3_725)).toBe('62:05');
  });
});

describe('minutoDePresentacion', () => {
  it('dentro de la duración prevista, minuto en curso', () => {
    expect(minutoDePresentacion(0, 1, 40)).toBe("1'");
    expect(minutoDePresentacion(2_052, 1, 40)).toBe("35'");
  });

  it('en la segunda parte arranca donde acabó la primera prevista', () => {
    expect(minutoDePresentacion(0, 2, 40)).toBe("41'");
    expect(minutoDePresentacion(59, 2, 40)).toBe("41'");
    expect(minutoDePresentacion(60, 2, 40)).toBe("42'");
  });

  it('en el descuento, el minuto previsto más lo añadido', () => {
    expect(minutoDePresentacion(2_400, 1, 40)).toBe("40+1'");
    expect(minutoDePresentacion(2_530, 1, 40)).toBe("40+3'");
    expect(minutoDePresentacion(2_460, 2, 40)).toBe("80+2'");
  });
});
