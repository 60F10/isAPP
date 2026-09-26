// Mensajes comunes al guardar (T-203) y qué errores no se reintentan (DOC 13,
// punto 16). Los casos de `core` siguen en
// `core/model/clubYEquipos.test.ts`; aquí, lo que solo tiene la versión común.

import { describe, expect, it } from 'vitest';

import { esErrorDefinitivo, mensajeDeErrorAlGuardar, SIN_FILAS } from './guardado';

describe('mensajeDeErrorAlGuardar', () => {
  it('sin decir qué no se repite, un duplicado se explica en general', () => {
    expect(mensajeDeErrorAlGuardar({ code: '23505' })).toBe('Ya existe uno igual.');
  });

  it('un valor fuera de rango que se escapó de la pantalla', () => {
    expect(mensajeDeErrorAlGuardar({ code: '23514', message: 'violates check constraint' })).toBe(
      'Algún valor está fuera de lo permitido. Revisa los campos.',
    );
  });
});

describe('esErrorDefinitivo', () => {
  it('lo que rechaza la base o PostgREST por el dato o el permiso no se reintenta', () => {
    for (const code of ['42501', '23505', '23514', '22P02', 'P0001', 'PGRST116', 'PGRST204']) {
      expect(esErrorDefinitivo({ code, message: 'x' })).toBe(true);
    }
  });

  it('la RLS que no deja actualizar, tampoco', () => {
    expect(esErrorDefinitivo(new Error(SIN_FILAS))).toBe(true);
  });

  it('lo que es del servidor, de la conexión o de la sesión caducada sí se reintenta', () => {
    for (const code of ['08006', '53300', '57014', '58000', 'XX000', 'PGRST301', '']) {
      expect(esErrorDefinitivo({ code, message: 'x' })).toBe(false);
    }
  });

  it('sin red se reintenta', () => {
    expect(esErrorDefinitivo(new TypeError('Failed to fetch'))).toBe(false);
    expect(esErrorDefinitivo({ message: 'TypeError: Failed to fetch', code: '' })).toBe(false);
  });

  it('con estado HTTP, los 4xx no se reintentan, salvo 401, 408 y 429', () => {
    expect(esErrorDefinitivo({ status: 403 })).toBe(true);
    expect(esErrorDefinitivo({ status: 404 })).toBe(true);
    for (const status of [401, 408, 429, 500, 503]) {
      expect(esErrorDefinitivo({ status })).toBe(false);
    }
  });

  it('lo que no se reconoce se reintenta: mejor una vez de más que rendirse sin motivo', () => {
    expect(esErrorDefinitivo(null)).toBe(false);
    expect(esErrorDefinitivo('fallo')).toBe(false);
    expect(esErrorDefinitivo(new Error('otra cosa'))).toBe(false);
  });
});
