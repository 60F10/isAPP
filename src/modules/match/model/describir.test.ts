import { describe, expect, it } from 'vitest';

import { describirEvento } from './describir';

import type { EventoDelDirecto } from './eventos';
import type { TipoDeEvento } from '@modules/rules';

function evento(cambios: Partial<EventoDelDirecto>): EventoDelDirecto {
  return {
    clientEventId: 'ce',
    tipo: 'goal',
    periodo: 1,
    segundos: 2_052,
    rival: false,
    jugador: 'p7',
    segundo: null,
    detalles: {},
    estado: 'approved',
    propio: true,
    ...cambios,
  };
}

const NOMBRES = { goal: 'Gol', substitution: 'Cambio', corner: 'Córner' } as Record<
  TipoDeEvento,
  string
>;

const nombre = (id: string) => ({ p7: '7 · Juanito', p8: '8 · Luis' })[id] ?? '—';

describe('describirEvento', () => {
  it('tipo, jugador y minuto, en palabras', () => {
    expect(describirEvento(evento({}), nombre, 40, NOMBRES)).toBe("Gol · 7 · Juanito · 35'");
  });

  it('con asistencia y en la segunda parte', () => {
    expect(
      describirEvento(evento({ segundo: 'p8', periodo: 2, segundos: 0 }), nombre, 40, NOMBRES),
    ).toBe("Gol · 7 · Juanito, asistencia de 8 · Luis · 41'");
  });

  it('el cambio dice quién sale y quién entra', () => {
    expect(
      describirEvento(
        evento({ tipo: 'substitution', segundo: 'p8', segundos: 2_460 }),
        nombre,
        40,
        NOMBRES,
      ),
    ).toBe("Cambio · sale 7 · Juanito, entra 8 · Luis · 40+2'");
  });

  it('del rival y el córner dicen para quién', () => {
    expect(describirEvento(evento({ rival: true, jugador: null }), nombre, 40, NOMBRES)).toBe(
      "Gol del rival · 35'",
    );
    expect(describirEvento(evento({ tipo: 'corner', jugador: null }), nombre, 40, NOMBRES)).toBe(
      "Córner a favor · 35'",
    );
    expect(
      describirEvento(evento({ tipo: 'corner', jugador: null, rival: true }), nombre, 40, NOMBRES),
    ).toBe("Córner en contra · 35'");
  });

  it('sin segundos todavía, sin minuto', () => {
    expect(describirEvento(evento({ segundos: null }), nombre, 40, NOMBRES)).toBe(
      'Gol · 7 · Juanito',
    );
  });
});
