// Lógica pura de los entrenamientos, A15a y A15b (T-228).

import { describe, expect, it } from 'vitest';

import {
  entrenamientoDeHoy,
  instanteDeAhora,
  LARGO_LUGAR,
  LARGO_OBJETIVO,
  propuestaDeAlta,
  separarEntrenamientos,
  validarEntrenamiento,
} from './entrenamiento';

import type { Entrenamiento, FormularioEntrenamiento } from './entrenamiento';

// Fechas construidas en hora local: las pruebas valen en cualquier zona.
const AHORA = new Date(2026, 9, 8, 20, 0, 37, 512);

const BIEN: FormularioEntrenamiento = {
  fecha: '2026-10-13',
  hora: '18:00',
  lugar: '  Campo de Fútbol  Izquierdo Rodríguez ',
  objetivo: ' Salida de balón ',
};

function entrenamiento(
  id: string,
  cuando: Date,
  cambios: Partial<Entrenamiento> = {},
): Entrenamiento {
  return {
    id,
    teamId: 'eq-1',
    seasonId: 'temp-1',
    scheduledAt: cuando.toISOString(),
    location: null,
    focus: null,
    ...cambios,
  };
}

describe('validarEntrenamiento', () => {
  it('devuelve las columnas de `training_sessions` con los textos limpios', () => {
    expect(validarEntrenamiento(BIEN)).toEqual({
      errores: {},
      valores: {
        scheduled_at: new Date(2026, 9, 13, 18, 0).toISOString(),
        location: 'Campo de Fútbol Izquierdo Rodríguez',
        focus: 'Salida de balón',
      },
    });
  });

  it('el lugar y el objetivo vacíos se guardan como nulos', () => {
    const { valores } = validarEntrenamiento({ ...BIEN, lugar: '   ', objetivo: '' });

    expect(valores?.location).toBeNull();
    expect(valores?.focus).toBeNull();
  });

  it('sin fecha y sin hora, lo dice en cada campo', () => {
    expect(validarEntrenamiento({ ...BIEN, fecha: '' })).toEqual({
      errores: { fecha: 'Escribe la fecha.' },
      valores: null,
    });
    expect(validarEntrenamiento({ ...BIEN, hora: '' })).toEqual({
      errores: { hora: 'Escribe la hora.' },
      valores: null,
    });
  });

  it('un 31 de febrero y las 25:00 no pasan', () => {
    expect(validarEntrenamiento({ ...BIEN, fecha: '2026-02-31' })).toEqual({
      errores: { fecha: 'La fecha o la hora no son válidas.' },
      valores: null,
    });
    expect(validarEntrenamiento({ ...BIEN, hora: '25:00' })).toEqual({
      errores: { fecha: 'La fecha o la hora no son válidas.' },
      valores: null,
    });
  });

  it('el lugar y el objetivo tienen un largo máximo', () => {
    expect(validarEntrenamiento({ ...BIEN, lugar: 'a'.repeat(LARGO_LUGAR + 1) })).toEqual({
      errores: { lugar: `Como mucho ${LARGO_LUGAR} caracteres.` },
      valores: null,
    });
    expect(
      validarEntrenamiento({ ...BIEN, lugar: 'a'.repeat(LARGO_LUGAR) }).valores,
    ).not.toBeNull();
    expect(
      validarEntrenamiento({ ...BIEN, objetivo: 'a'.repeat(LARGO_OBJETIVO + 1) }).errores.objetivo,
    ).toBe(`Como mucho ${LARGO_OBJETIVO} caracteres.`);
  });

  it('una fecha de ayer pasa: un entrenamiento ya hecho se mete después', () => {
    expect(validarEntrenamiento({ ...BIEN, fecha: '2026-10-07' }).valores?.scheduled_at).toBe(
      new Date(2026, 9, 7, 18, 0).toISOString(),
    );
  });
});

describe('separarEntrenamientos', () => {
  it('el de hoy por la mañana sigue en próximos por la noche, y el de ayer es pasado', () => {
    const { proximos, pasados } = separarEntrenamientos(
      [
        entrenamiento('ayer', new Date(2026, 9, 7, 18, 0)),
        entrenamiento('hoy', new Date(2026, 9, 8, 9, 0)),
      ],
      AHORA,
    );

    expect(proximos.map((e) => e.id)).toEqual(['hoy']);
    expect(pasados.map((e) => e.id)).toEqual(['ayer']);
  });

  it('próximos, del más cercano al más lejano; pasados, del más reciente al más antiguo', () => {
    const { proximos, pasados } = separarEntrenamientos(
      [
        entrenamiento('martes', new Date(2026, 9, 13, 18, 0)),
        entrenamiento('hace-una-semana', new Date(2026, 9, 1, 18, 0)),
        entrenamiento('hoy', new Date(2026, 9, 8, 18, 0)),
        entrenamiento('anteayer', new Date(2026, 9, 6, 18, 0)),
        entrenamiento('medianoche', new Date(2026, 9, 8, 0, 0)),
        entrenamiento('ayer-tarde', new Date(2026, 9, 7, 23, 59)),
      ],
      AHORA,
    );

    expect(proximos.map((e) => e.id)).toEqual(['medianoche', 'hoy', 'martes']);
    expect(pasados.map((e) => e.id)).toEqual(['ayer-tarde', 'anteayer', 'hace-una-semana']);
  });

  it('no cambia la lista que recibe', () => {
    const lista = [
      entrenamiento('b', new Date(2026, 9, 13, 18, 0)),
      entrenamiento('a', new Date(2026, 9, 9, 18, 0)),
    ];
    separarEntrenamientos(lista, AHORA);

    expect(lista.map((e) => e.id)).toEqual(['b', 'a']);
  });
});

describe('entrenamientoDeHoy', () => {
  it('con dos hoy, el primero', () => {
    const hoy = entrenamientoDeHoy(
      [
        entrenamiento('tarde', new Date(2026, 9, 8, 18, 0)),
        entrenamiento('ayer', new Date(2026, 9, 7, 18, 0)),
        entrenamiento('manana-temprano', new Date(2026, 9, 8, 9, 0)),
        entrenamiento('pasado', new Date(2026, 9, 9, 9, 0)),
      ],
      AHORA,
    );

    expect(hoy?.id).toBe('manana-temprano');
  });

  it('sin ninguno hoy, nada', () => {
    expect(
      entrenamientoDeHoy(
        [
          entrenamiento('ayer', new Date(2026, 9, 7, 23, 59)),
          entrenamiento('manana', new Date(2026, 9, 9, 0, 0)),
        ],
        AHORA,
      ),
    ).toBeNull();
    expect(entrenamientoDeHoy([], AHORA)).toBeNull();
  });
});

describe('propuestaDeAlta', () => {
  it('la fecha de hoy, y la hora y el lugar del entrenamiento más reciente', () => {
    expect(
      propuestaDeAlta(
        [
          entrenamiento('viejo', new Date(2026, 9, 1, 17, 0), { location: 'Campo viejo' }),
          entrenamiento('ultimo', new Date(2026, 9, 6, 18, 30), { location: 'Campo anexo' }),
        ],
        'Campo de Fútbol Izquierdo Rodríguez',
        AHORA,
      ),
    ).toEqual({ fecha: '2026-10-08', hora: '18:30', lugar: 'Campo anexo' });
  });

  it('sin ninguno, hora vacía y el campo de casa del club', () => {
    expect(propuestaDeAlta([], ' Campo de Fútbol Izquierdo Rodríguez ', AHORA)).toEqual({
      fecha: '2026-10-08',
      hora: '',
      lugar: 'Campo de Fútbol Izquierdo Rodríguez',
    });
  });

  it('sin ninguno y sin campo de casa, vacío', () => {
    expect(propuestaDeAlta([], null, AHORA)).toEqual({ fecha: '2026-10-08', hora: '', lugar: '' });
  });
});

describe('instanteDeAhora', () => {
  it('es ahora con los segundos a cero', () => {
    expect(instanteDeAhora(AHORA)).toBe(new Date(2026, 9, 8, 20, 0, 0, 0).toISOString());
  });

  it('no cambia la fecha que recibe', () => {
    instanteDeAhora(AHORA);

    expect(AHORA.getSeconds()).toBe(37);
  });
});
