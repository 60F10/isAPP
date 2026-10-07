// Pruebas del modelo de personas (T-301b): plantillas de rol del DOC 04 §15.2,
// diferencia de permisos y validación del correo de una invitación.

import { describe, expect, it } from 'vitest';

import {
  cambiosDePermisos,
  DESCRIPCION_DE_PERMISO,
  NOMBRES_DE_ROL,
  ordenarMiembros,
  PERMISOS,
  PLANTILLAS_DE_ROL,
  ROLES,
  textoDePermisos,
  validarInvitacion,
} from './personas';

import type { Miembro } from './personas';

describe('PLANTILLAS_DE_ROL', () => {
  it('el entrenador trae los doce permisos de la lista cerrada', () => {
    expect(PERMISOS).toHaveLength(12);
    expect([...PLANTILLAS_DE_ROL.coach]).toEqual([...PERMISOS]);
  });

  it('el delegado, el ojeador y el espectador traen los del DOC 04 §15.2', () => {
    expect([...PLANTILLAS_DE_ROL.delegate]).toEqual([
      'schedule.manage',
      'match.live.write',
      'training.manage',
      'stats.view',
    ]);
    expect([...PLANTILLAS_DE_ROL.scout]).toEqual(['match.live.write', 'stats.view']);
    expect([...PLANTILLAS_DE_ROL.spectator]).toEqual(['stats.view']);
  });

  it('solo la del entrenador trae `event.approve` y `members.manage`', () => {
    for (const rol of ROLES) {
      const esEntrenador = rol === 'coach';

      expect(PLANTILLAS_DE_ROL[rol].includes('event.approve')).toBe(esEntrenador);
      expect(PLANTILLAS_DE_ROL[rol].includes('members.manage')).toBe(esEntrenador);
    }
  });

  it('cada rol y cada permiso tienen su texto', () => {
    for (const rol of ROLES) {
      expect(NOMBRES_DE_ROL[rol]).not.toBe('');
    }

    for (const permiso of PERMISOS) {
      expect(DESCRIPCION_DE_PERMISO[permiso]).not.toBe('');
    }
  });
});

describe('cambiosDePermisos', () => {
  it('da lo que hay que añadir y lo que hay que quitar', () => {
    expect(
      cambiosDePermisos(['stats.view', 'match.live.write'], ['stats.view', 'event.approve']),
    ).toEqual({ altas: ['event.approve'], bajas: ['match.live.write'] });
  });

  it('no da nada si no cambia, aunque cambie el orden', () => {
    expect(
      cambiosDePermisos(['stats.view', 'match.live.write'], ['match.live.write', 'stats.view']),
    ).toEqual({ altas: [], bajas: [] });
  });

  it('desde nada, todo son altas', () => {
    expect(cambiosDePermisos([], ['stats.view'])).toEqual({ altas: ['stats.view'], bajas: [] });
  });
});

describe('validarInvitacion', () => {
  it('normaliza el correo: sin espacios y en minúsculas', () => {
    expect(validarInvitacion('  Colega@Gmail.COM ')).toEqual({
      email: 'colega@gmail.com',
      error: null,
    });
  });

  it('rechaza el correo vacío', () => {
    const resultado = validarInvitacion('   ');

    expect(resultado.email).toBeNull();
    expect(resultado.error).not.toBeNull();
  });

  it('rechaza el que no tiene arroba, o le falta un lado', () => {
    for (const correo of ['colega.gmail.com', 'colega@', '@gmail.com', 'co lega@gmail.com']) {
      const resultado = validarInvitacion(correo);

      expect(resultado.email).toBeNull();
      expect(resultado.error).not.toBeNull();
    }
  });
});

describe('textoDePermisos', () => {
  it('cuenta en palabras, con su singular', () => {
    expect(textoDePermisos(0)).toBe('Sin permisos');
    expect(textoDePermisos(1)).toBe('1 permiso');
    expect(textoDePermisos(4)).toBe('4 permisos');
  });
});

describe('ordenarMiembros', () => {
  const miembro = (nombre: string | null, activo: boolean): Miembro => ({
    teamMemberId: `tm-${nombre ?? 'nadie'}`,
    userId: `u-${nombre ?? 'nadie'}`,
    nombre,
    role: 'spectator',
    activo,
    permisos: [],
  });

  it('por nombre, con los de baja al final', () => {
    const ordenados = ordenarMiembros([
      miembro('Zoe', true),
      miembro('Ana', false),
      miembro('Isaac', true),
    ]);

    expect(ordenados.map((uno) => uno.nombre)).toEqual(['Isaac', 'Zoe', 'Ana']);
  });
});
