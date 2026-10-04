import { describe, expect, it } from 'vitest';

import { decidirTurno, FALLOS_PARA_ROBAR } from './turno';

describe('decidirTurno', () => {
  it('una página oculta espera siempre, esté el cerrojo como esté', () => {
    expect(decidirTurno(false, true, 0)).toBe('esperar');
    expect(decidirTurno(false, false, 1)).toBe('esperar');
    expect(decidirTurno(false, false, FALLOS_PARA_ROBAR)).toBe('esperar');
    expect(decidirTurno(false, false, 50)).toBe('esperar');
  });

  it('visible y con el cerrojo libre, vacía', () => {
    expect(decidirTurno(true, true, 0)).toBe('vaciar');
  });

  it('visible y con el cerrojo ocupado, espera la primera vez y roba a la segunda', () => {
    expect(decidirTurno(true, false, 1)).toBe('esperar');
    expect(decidirTurno(true, false, 2)).toBe('robar');
  });

  it('roba al segundo intento fallido', () => {
    expect(FALLOS_PARA_ROBAR).toBe(2);
  });
});
