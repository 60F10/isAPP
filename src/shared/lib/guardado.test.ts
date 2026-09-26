// Mensajes comunes al guardar (T-203). Los casos de `core` siguen en
// `core/model/clubYEquipos.test.ts`; aquí, lo que solo tiene la versión común.

import { describe, expect, it } from 'vitest';

import { mensajeDeErrorAlGuardar } from './guardado';

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
