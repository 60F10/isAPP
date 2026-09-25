// Pruebas del cálculo de caducidad de la sesión (DOC 02 §5.1, criterio 2.2.1).

import { describe, expect, it } from 'vitest';

import { AVISO_CADUCIDAD_MS, faseDeSesion } from './caducidad';

// Supabase da `expires_at` en segundos desde 1970; el reloj va en milisegundos.
const EXPIRA_SEG = 1_000_000;
const EXPIRA_MS = EXPIRA_SEG * 1000;

describe('faseDeSesion', () => {
  it('sin fecha de caducidad no avisa de nada', () => {
    expect(faseDeSesion(undefined, EXPIRA_MS)).toBe('vigente');
  });

  it('con más margen que el aviso, vigente', () => {
    expect(faseDeSesion(EXPIRA_SEG, EXPIRA_MS - AVISO_CADUCIDAD_MS - 1)).toBe('vigente');
  });

  it('dentro del margen del aviso, por caducar', () => {
    expect(faseDeSesion(EXPIRA_SEG, EXPIRA_MS - AVISO_CADUCIDAD_MS)).toBe('por_caducar');
    expect(faseDeSesion(EXPIRA_SEG, EXPIRA_MS - 1)).toBe('por_caducar');
  });

  it('en el instante de caducar y después, caducada', () => {
    expect(faseDeSesion(EXPIRA_SEG, EXPIRA_MS)).toBe('caducada');
    expect(faseDeSesion(EXPIRA_SEG, EXPIRA_MS + 5000)).toBe('caducada');
  });

  it('respeta un margen de aviso distinto', () => {
    expect(faseDeSesion(EXPIRA_SEG, EXPIRA_MS - 90_000, 120_000)).toBe('por_caducar');
  });

  it('el margen por defecto deja al menos veinte segundos para reaccionar', () => {
    // Criterio 2.2.1: aviso con al menos 20 s para ampliar. La banda comprueba
    // cada `INTERVALO` segundos, así que el margen tiene que cubrir los dos.
    expect(AVISO_CADUCIDAD_MS).toBeGreaterThanOrEqual(20_000 + 15_000);
  });
});
