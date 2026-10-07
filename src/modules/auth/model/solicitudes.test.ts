// Seguir y pedir permisos (T-301c): el mensaje de la solicitud y los nombres
// de estado.

import { describe, expect, it } from 'vitest';

import {
  LARGO_MAXIMO_DEL_MENSAJE,
  mensajeDeLaBase,
  NOMBRES_DE_ESTADO,
  nombreDePersona,
  validarMensaje,
} from './solicitudes';

describe('validarMensaje', () => {
  it('recorta los espacios de los bordes', () => {
    expect(validarMensaje('  Soy el padre de Dani \n')).toEqual({
      mensaje: 'Soy el padre de Dani',
      error: null,
    });
  });

  it('vacío, o solo espacios, es `null` y se puede enviar', () => {
    expect(validarMensaje('')).toEqual({ mensaje: null, error: null });
    expect(validarMensaje('   ')).toEqual({ mensaje: null, error: null });
  });

  it('con 280 caracteres justos se envía', () => {
    const justo = 'a'.repeat(LARGO_MAXIMO_DEL_MENSAJE);

    expect(validarMensaje(justo)).toEqual({ mensaje: justo, error: null });
  });

  it('si pasa de 280 no se envía, y dice cuántos sobran', () => {
    const resultado = validarMensaje('a'.repeat(LARGO_MAXIMO_DEL_MENSAJE + 3));

    expect(resultado.mensaje).toBeNull();
    expect(resultado.error).toMatch(/280/);
    expect(resultado.error).toMatch(/Sobran 3/);
  });
});

describe('NOMBRES_DE_ESTADO', () => {
  it('dice cada estado en palabras', () => {
    expect(NOMBRES_DE_ESTADO).toEqual({
      pending: 'Pendiente',
      approved: 'Aceptada',
      rejected: 'Rechazada',
      cancelled: 'Cancelada',
    });
  });
});

describe('nombreDePersona', () => {
  it('sin nombre en el perfil, lo dice', () => {
    expect(nombreDePersona(null)).toBe('Sin nombre');
    expect(nombreDePersona('  ')).toBe('Sin nombre');
    expect(nombreDePersona('Marta')).toBe('Marta');
  });
});

describe('mensajeDeLaBase', () => {
  it('lo que rechaza una función de la base se enseña tal cual', () => {
    expect(mensajeDeLaBase({ code: 'P0002', message: 'Ya tienes una solicitud pendiente.' })).toBe(
      'Ya tienes una solicitud pendiente.',
    );
  });

  it('un `P0002` enseña el mensaje de la base', () => {
    expect(mensajeDeLaBase({ code: 'P0002', message: 'La invitación ya no está vigente.' })).toBe(
      'La invitación ya no está vigente.',
    );
  });

  it('cualquier otro código —un `57014`, un `PGRST…`, sin red— da el texto genérico', () => {
    const generico = 'No se ha podido completar. Vuelve a intentarlo.';

    expect(mensajeDeLaBase({ code: '57014', message: 'canceling statement' })).toBe(generico);
    expect(mensajeDeLaBase({ code: 'PGRST301', message: 'JWT expired' })).toBe(generico);
    expect(mensajeDeLaBase(new Error('Failed to fetch'))).toBe(generico);
  });
});
