// Pruebas de la lógica pura del registro de errores (DOC 06 §10.1, DOC 05 §9.5).
//
// Lo que se vigila aquí es lo que no se puede escapar a `error_logs`: tokens,
// correos y contenido de formulario. Un fallo en estas funciones no rompe la
// aplicación, pero guarda en la base justo lo que la regla prohíbe guardar.

import { describe, expect, it } from 'vitest';

import {
  construirFilaDeError,
  crearLimitador,
  LARGO_MENSAJE,
  LARGO_TRAZA,
  limpiarTexto,
  normalizarError,
} from './errorLog';

import type { EntradaDeError } from './errorLog';

// Forma de un JWT, inventado. No vale para nada.
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dGhpcy1ub3QtYS1yZWFsLXNpZ25hdHVyZQ';

describe('limpiarTexto', () => {
  it('deja intacto un mensaje sin nada sensible', () => {
    expect(limpiarTexto('No se pudo leer la plantilla')).toBe('No se pudo leer la plantilla');
  });

  it('tapa un JWT suelto', () => {
    expect(limpiarTexto(`Fallo con ${JWT} en la cabecera`)).toBe(
      'Fallo con [token] en la cabecera',
    );
  });

  it('tapa el valor de los parámetros de sesión de una URL', () => {
    const limpio = limpiarTexto(
      'https://x.netlify.app/auth/callback?code=abc123&state=9#access_token=zzz&refresh_token=yyy',
    );

    expect(limpio).not.toContain('abc123');
    expect(limpio).not.toContain('zzz');
    expect(limpio).not.toContain('yyy');
    expect(limpio).toContain('code=[oculto]');
    expect(limpio).toContain('access_token=[oculto]');
    expect(limpio).toContain('refresh_token=[oculto]');
  });

  it('tapa una cabecera Bearer', () => {
    expect(limpiarTexto('Authorization: Bearer abc.def-ghi')).toBe('Authorization: Bearer [token]');
  });

  it('tapa las direcciones de correo', () => {
    expect(limpiarTexto('Sin perfil para isaac.entrenador@example.com')).toBe(
      'Sin perfil para [correo]',
    );
  });
});

describe('normalizarError', () => {
  it('saca mensaje y traza de un Error', () => {
    const error = new Error('Se rompió');
    const { mensaje, traza } = normalizarError(error);

    expect(mensaje).toBe('Se rompió');
    expect(traza).toContain('Se rompió');
  });

  it('acepta un texto lanzado a pelo', () => {
    expect(normalizarError('texto suelto')).toEqual({ mensaje: 'texto suelto', traza: null });
  });

  it('acepta un error de Supabase, que es un objeto con `message` y no un Error', () => {
    expect(normalizarError({ message: 'permission denied', code: '42501' })).toEqual({
      mensaje: 'permission denied',
      traza: null,
    });
  });

  it('no deja el mensaje vacío con algo que no sabe leer', () => {
    expect(normalizarError(undefined).mensaje).toBe('Error sin mensaje');
    expect(normalizarError({}).mensaje).toBe('Error sin mensaje');
  });
});

describe('construirFilaDeError', () => {
  const base: EntradaDeError = {
    origen: 'boundary',
    mensaje: 'Se rompió',
    traza: 'Error: Se rompió\n    at Componente',
    ruta: '/partidos/1/directo',
    userId: 'usuario-1',
    clubId: 'club-1',
    appVersion: 'abc1234',
    dispositivo: { ancho: 390, alto: 844, enLinea: true },
  };

  it('pone el origen delante del mensaje y rellena las columnas', () => {
    expect(construirFilaDeError(base)).toEqual({
      user_id: 'usuario-1',
      club_id: 'club-1',
      route: '/partidos/1/directo',
      message: '[boundary] Se rompió',
      stack: 'Error: Se rompió\n    at Componente',
      device: { ancho: 390, alto: 844, enLinea: true },
      app_version: 'abc1234',
    });
  });

  it('guarda solo el camino de la ruta, sin consulta ni fragmento', () => {
    const fila = construirFilaDeError({
      ...base,
      ruta: `/auth/callback?code=1#access_token=${JWT}`,
    });

    expect(fila.route).toBe('/auth/callback');
  });

  it('limpia mensaje y traza', () => {
    const fila = construirFilaDeError({
      ...base,
      mensaje: `Token ${JWT} caducado`,
      traza: `at fetch (https://x.supabase.co/rest?apikey=${JWT})`,
    });

    expect(fila.message).not.toContain(JWT);
    expect(fila.stack).not.toContain(JWT);
  });

  it('recorta mensaje y traza a su largo máximo', () => {
    const fila = construirFilaDeError({
      ...base,
      mensaje: 'a'.repeat(LARGO_MENSAJE * 2),
      traza: 'b'.repeat(LARGO_TRAZA * 2),
    });

    expect(fila.message.length).toBeLessThanOrEqual(LARGO_MENSAJE);
    expect(fila.stack?.length).toBeLessThanOrEqual(LARGO_TRAZA);
  });
});

describe('crearLimitador', () => {
  it('deja pasar la primera vez y frena el mismo mensaje dentro de la ventana', () => {
    const dejar = crearLimitador({ maximo: 10, ventanaMs: 60_000 });

    expect(dejar('A', 0)).toBe(true);
    expect(dejar('A', 30_000)).toBe(false);
    expect(dejar('B', 30_000)).toBe(true);
  });

  it('vuelve a dejar pasar el mismo mensaje cuando la ventana acaba', () => {
    const dejar = crearLimitador({ maximo: 10, ventanaMs: 60_000 });

    expect(dejar('A', 0)).toBe(true);
    expect(dejar('A', 60_000)).toBe(true);
  });

  it('corta en seco al llegar al máximo de la carga, sea cual sea el mensaje', () => {
    const dejar = crearLimitador({ maximo: 2, ventanaMs: 60_000 });

    expect(dejar('A', 0)).toBe(true);
    expect(dejar('B', 0)).toBe(true);
    expect(dejar('C', 0)).toBe(false);
    expect(dejar('D', 10 * 60_000)).toBe(false);
  });
});
