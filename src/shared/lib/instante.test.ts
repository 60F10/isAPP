// Fecha y hora de formulario al instante de la base, y vuelta (T-204; aquí
// desde la T-228).

import { describe, expect, it } from 'vitest';

import { aInstante, partesDeInstante } from './instante';

describe('aInstante y partesDeInstante', () => {
  it('fecha y hora locales van y vuelven sin moverse', () => {
    const instante = aInstante('2026-10-25', '11:30');

    expect(instante).not.toBeNull();
    expect(partesDeInstante(instante ?? '')).toEqual({ fecha: '2026-10-25', hora: '11:30' });
  });

  it('el instante es la hora local convertida a UTC, como la guarda la base', () => {
    expect(aInstante('2026-10-25', '11:30')).toBe(new Date(2026, 9, 25, 11, 30).toISOString());
  });

  it('una fecha u hora mal escrita no da instante', () => {
    expect(aInstante('', '11:30')).toBeNull();
    expect(aInstante('2026-10-25', '')).toBeNull();
    expect(aInstante('2026-13-40', '11:30')).toBeNull();
    expect(aInstante('2026-10-25', '25:00')).toBeNull();
    expect(aInstante('2026-02-31', '11:30')).toBeNull();
  });

  it('los minutos de más no pasan a la hora siguiente del mismo día', () => {
    // `Date` convertiría 10:60 en 11:00 sin quejarse, y en el mismo día.
    expect(aInstante('2026-10-25', '10:60')).toBeNull();
  });
});
