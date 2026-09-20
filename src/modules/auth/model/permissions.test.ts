// Pruebas de la lógica de acceso (DOC 06 §11).
//
// Lo que de verdad vigilan estos casos es la distinción que el DOC 13 señala
// como la trampa de esta tarea: «todavía no se sabe» es `null` y lo decide el
// proveedor; «se preguntó y no tiene ninguno» es un conjunto vacío y lo decide
// este módulo. Confundirlas manda a /403 a quien sí tiene permiso.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CLAVE_EQUIPO_ACTIVO,
  construirMembresias,
  elegirEquipoActivo,
  leerEquipoRecordado,
  permisosDe,
  recordarEquipo,
} from './permissions';

import type { AppPermission, FilaMembresia, Membership } from './permissions';

function filaDe(
  idEquipo: string,
  nombre: string,
  permisos: readonly AppPermission[],
): FilaMembresia {
  return {
    id: `miembro-${idEquipo}`,
    role: 'coach',
    teams: {
      id: idEquipo,
      club_id: 'club-1',
      name: nombre,
      category: 'Cadete',
      crest_url: null,
      primary_color: '#0f2e6b',
    },
    team_member_permissions: permisos.map((permission) => ({ permission })),
  };
}

function membresiasDe(...filas: readonly FilaMembresia[]): Membership[] {
  return construirMembresias(filas);
}

describe('construirMembresias', () => {
  it('sin filas devuelve una lista vacía', () => {
    expect(construirMembresias([])).toEqual([]);
  });

  it('traduce la fila a los nombres del dominio y agrupa sus permisos', () => {
    const [membresia] = membresiasDe(filaDe('eq-1', 'Cadete A', ['roster.manage', 'stats.view']));

    expect(membresia.teamMemberId).toBe('miembro-eq-1');
    expect(membresia.role).toBe('coach');
    expect(membresia.team).toEqual({
      id: 'eq-1',
      clubId: 'club-1',
      name: 'Cadete A',
      category: 'Cadete',
      crestUrl: null,
      primaryColor: '#0f2e6b',
    });
    expect([...membresia.permissions].sort()).toEqual(['roster.manage', 'stats.view']);
  });

  it('un equipo sin permisos da un conjunto vacío, nunca nulo', () => {
    const [membresia] = membresiasDe(filaDe('eq-1', 'Cadete A', []));

    expect(membresia.permissions).toBeInstanceOf(Set);
    expect(membresia.permissions.size).toBe(0);
  });

  it('descarta la fila cuya RLS no deja leer el equipo', () => {
    const rota: FilaMembresia = { ...filaDe('eq-1', 'Cadete A', []), teams: null };

    expect(construirMembresias([rota, filaDe('eq-2', 'Cadete B', [])])).toHaveLength(1);
  });

  it('ordena por nombre de equipo para que el primero sea siempre el mismo', () => {
    const membresias = membresiasDe(
      filaDe('eq-3', 'Infantil A', []),
      filaDe('eq-1', 'Cadete A', []),
      filaDe('eq-2', 'Cadete B', []),
    );

    expect(membresias.map((membresia) => membresia.team.name)).toEqual([
      'Cadete A',
      'Cadete B',
      'Infantil A',
    ]);
  });
});

describe('elegirEquipoActivo', () => {
  it('sin equipos no hay equipo activo', () => {
    expect(elegirEquipoActivo([], 'eq-1')).toBeNull();
  });

  it('respeta el equipo recordado cuando sigue siendo suyo', () => {
    const membresias = membresiasDe(filaDe('eq-1', 'Cadete A', []), filaDe('eq-2', 'Cadete B', []));

    expect(elegirEquipoActivo(membresias, 'eq-2')).toBe('eq-2');
  });

  it('sin nada recordado coge el primero', () => {
    const membresias = membresiasDe(filaDe('eq-2', 'Cadete B', []), filaDe('eq-1', 'Cadete A', []));

    expect(elegirEquipoActivo(membresias, null)).toBe('eq-1');
  });

  it('descarta el equipo recordado del que ya le han dado de baja', () => {
    const membresias = membresiasDe(filaDe('eq-1', 'Cadete A', []));

    expect(elegirEquipoActivo(membresias, 'eq-9')).toBe('eq-1');
  });
});

describe('permisosDe', () => {
  it('sin equipo activo devuelve un conjunto vacío, no nulo', () => {
    const permisos = permisosDe([], null);

    expect(permisos).toBeInstanceOf(Set);
    expect(permisos.size).toBe(0);
  });

  it('devuelve los permisos del equipo activo y solo los suyos', () => {
    const membresias = membresiasDe(
      filaDe('eq-1', 'Cadete A', ['match.live.write']),
      filaDe('eq-2', 'Cadete B', ['team.manage', 'members.manage']),
    );

    expect(permisosDe(membresias, 'eq-1').has('match.live.write')).toBe(true);
    expect(permisosDe(membresias, 'eq-1').has('team.manage')).toBe(false);
    expect(permisosDe(membresias, 'eq-2').size).toBe(2);
  });

  it('un equipo activo que no está en la lista no concede nada', () => {
    const membresias = membresiasDe(filaDe('eq-1', 'Cadete A', ['team.manage']));

    expect(permisosDe(membresias, 'eq-9').size).toBe(0);
  });
});

describe('el equipo recordado', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('se guarda y se lee bajo la clave del DOC 06 §5.5', () => {
    recordarEquipo('eq-1');

    expect(window.localStorage.getItem(CLAVE_EQUIPO_ACTIVO)).toBe('eq-1');
    expect(leerEquipoRecordado()).toBe('eq-1');
  });

  it('se olvida al pasar nulo', () => {
    recordarEquipo('eq-1');
    recordarEquipo(null);

    expect(leerEquipoRecordado()).toBeNull();
  });

  it('con el almacenamiento bloqueado devuelve nulo en vez de lanzar', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('el navegador no deja leer');
    });

    expect(leerEquipoRecordado()).toBeNull();
  });

  it('con el almacenamiento bloqueado no revienta al guardar', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('el navegador no deja escribir');
    });

    expect(() => recordarEquipo('eq-1')).not.toThrow();
  });
});
