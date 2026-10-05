import { describe, expect, it } from 'vitest';

import { formatoReloj, segundosDesde } from './reloj';

import type { Reloj } from './reloj';

function reloj(cambios: Partial<Reloj> = {}): Reloj {
  return { inicio: 1_000_000, pausadoMs: 0, pausaDesde: null, ...cambios };
}

describe('segundosDesde', () => {
  it('corriendo, cuenta desde el arranque y redondea hacia abajo', () => {
    expect(segundosDesde(reloj(), 1_000_000 + 125_900)).toBe(125);
  });

  it('descuenta lo que ha estado en pausa', () => {
    expect(segundosDesde(reloj({ pausadoMs: 30_000 }), 1_000_000 + 125_900)).toBe(95);
  });

  it('en pausa se queda en el instante en que se paró, pase lo que pase después', () => {
    const pausado = reloj({ pausaDesde: 1_000_000 + 60_000 });

    expect(segundosDesde(pausado, 1_000_000 + 70_000)).toBe(60);
    expect(segundosDesde(pausado, 1_000_000 + 500_000)).toBe(60);
  });

  it('con el reloj de pared por detrás del arranque, nunca es negativo', () => {
    expect(segundosDesde(reloj(), 999_000)).toBe(0);
  });
});

describe('formatoReloj', () => {
  it('dos cifras, y los minutos siguen pasados los sesenta', () => {
    expect(formatoReloj(0)).toBe('00:00');
    expect(formatoReloj(2_052)).toBe('34:12');
    expect(formatoReloj(3_725)).toBe('62:05');
  });
});
