import { describe, expect, it } from 'vitest';

import {
  construirConvocatoria,
  contar,
  sePuedeConvocar,
  validarConvocatoria,
} from './convocatoria';

import type { FilaConvocatoria, LineaGuardada } from './convocatoria';
import type { Inscripcion } from '@modules/core';

function inscripcion(cambios: Partial<Inscripcion> & { playerId: string }): Inscripcion {
  return {
    id: `ins-${cambios.playerId}`,
    nickname: cambios.playerId,
    shirtNumber: null,
    defaultPosition: null,
    availability: 'available',
    ...cambios,
  };
}

function fila(cambios: Partial<FilaConvocatoria> & { playerId: string }): FilaConvocatoria {
  return {
    nickname: cambios.playerId,
    availability: 'available',
    llamada: 'not_called',
    dorsal: '',
    posicion: '',
    retirado: false,
    ...cambios,
  };
}

/** `n` titulares con dorsal del 1 en adelante. */
function titulares(n: number): FilaConvocatoria[] {
  return Array.from({ length: n }, (_, i) =>
    fila({ playerId: `t${i + 1}`, llamada: 'starter', dorsal: String(i + 1) }),
  );
}

const CADETE = { squad_max: 18, players_on_pitch: 11 };

describe('construirConvocatoria', () => {
  it('pone a toda la plantilla, sin convocar y con el dorsal y la posición de su inscripción', () => {
    const filas = construirConvocatoria(
      [
        inscripcion({ playerId: 'p1', nickname: 'Pepe', shirtNumber: 1, defaultPosition: 'GK' }),
        inscripcion({ playerId: 'p2', nickname: 'Juanito' }),
      ],
      [],
    );

    expect(filas).toEqual([
      fila({ playerId: 'p1', nickname: 'Pepe', dorsal: '1', posicion: 'GK' }),
      fila({ playerId: 'p2', nickname: 'Juanito' }),
    ]);
  });

  it('respeta lo guardado: llamada, dorsal y posición de ese partido', () => {
    const guardada: LineaGuardada[] = [
      { playerId: 'p1', nickname: 'Pepe', callStatus: 'starter', shirtNumber: 13, position: 'DF' },
    ];

    const [pepe] = construirConvocatoria(
      [inscripcion({ playerId: 'p1', nickname: 'Pepe', shirtNumber: 1, defaultPosition: 'GK' })],
      guardada,
    );

    expect(pepe).toMatchObject({ llamada: 'starter', dorsal: '13', posicion: 'DF' });
  });

  it('a un no convocado guardado le vuelve a proponer lo de su inscripción', () => {
    const [pepe] = construirConvocatoria(
      [inscripcion({ playerId: 'p1', shirtNumber: 1, defaultPosition: 'GK' })],
      [
        {
          playerId: 'p1',
          nickname: 'p1',
          callStatus: 'not_called',
          shirtNumber: null,
          position: null,
        },
      ],
    );

    expect(pepe).toMatchObject({ llamada: 'not_called', dorsal: '1', posicion: 'GK' });
  });

  it('saca de la convocatoria a quien ya no está disponible y lo marca como retirado', () => {
    const filas = construirConvocatoria(
      [
        inscripcion({ playerId: 'p1', availability: 'sanctioned' }),
        inscripcion({ playerId: 'p2', availability: 'unavailable' }),
      ],
      [
        { playerId: 'p1', nickname: 'p1', callStatus: 'starter', shirtNumber: 1, position: null },
        {
          playerId: 'p2',
          nickname: 'p2',
          callStatus: 'not_called',
          shirtNumber: null,
          position: null,
        },
      ],
    );

    expect(filas.map((f) => [f.llamada, f.retirado])).toEqual([
      ['not_called', true],
      ['not_called', false],
    ]);
  });

  it('conserva, al final y no convocable, a quien tiene línea guardada y ya no está en la plantilla', () => {
    const filas = construirConvocatoria(
      [inscripcion({ playerId: 'p1' })],
      [
        {
          playerId: 'p9',
          nickname: 'Baja',
          callStatus: 'substitute',
          shirtNumber: 9,
          position: null,
        },
      ],
    );

    expect(filas[1]).toMatchObject({
      playerId: 'p9',
      nickname: 'Baja',
      availability: null,
      llamada: 'not_called',
      retirado: true,
    });
  });
});

describe('sePuedeConvocar', () => {
  it('solo convoca al disponible', () => {
    expect(sePuedeConvocar('available')).toBe(true);
    expect(sePuedeConvocar('unavailable')).toBe(false);
    expect(sePuedeConvocar('sanctioned')).toBe(false);
    expect(sePuedeConvocar(null)).toBe(false);
  });
});

describe('contar', () => {
  it('cuenta titulares, suplentes y convocados', () => {
    expect(
      contar([
        ...titulares(2),
        fila({ playerId: 's1', llamada: 'substitute' }),
        fila({ playerId: 'n1' }),
      ]),
    ).toEqual({ titulares: 2, suplentes: 1, convocados: 3 });
  });
});

describe('validarConvocatoria', () => {
  it('da por buena una convocatoria de once titulares y siete suplentes', () => {
    const filas = [
      ...titulares(11),
      ...Array.from({ length: 7 }, (_, i) =>
        fila({ playerId: `s${i}`, llamada: 'substitute', dorsal: String(20 + i) }),
      ),
      fila({ playerId: 'n1', dorsal: '30', posicion: 'FW' }),
    ];

    const resultado = validarConvocatoria(filas, CADETE);

    expect(resultado.errores).toEqual({ general: [], dorsales: {} });
    expect(resultado.valores).toHaveLength(19);
  });

  it('guarda dorsal y posición del convocado, y nada de eso del no convocado', () => {
    const filas = [
      fila({ playerId: 'p1', llamada: 'starter', dorsal: '7', posicion: 'FW' }),
      fila({ playerId: 'p2', dorsal: '8', posicion: 'MF' }),
    ];

    const { valores } = validarConvocatoria(filas, { squad_max: 18, players_on_pitch: 1 });

    expect(valores).toEqual([
      { player_id: 'p1', call_status: 'starter', shirt_number: 7, position: 'FW' },
      { player_id: 'p2', call_status: 'not_called', shirt_number: null, position: null },
    ]);
  });

  it('exige exactamente los titulares del reglamento (L-03)', () => {
    const corto = validarConvocatoria(titulares(10), CADETE);
    const largo = validarConvocatoria(titulares(12), CADETE);

    expect(corto.valores).toBeNull();
    expect(corto.errores.general).toEqual(['Tienen que ser 11 titulares y hay 10.']);
    expect(largo.errores.general).toEqual(['Tienen que ser 11 titulares y hay 12.']);
  });

  it('no deja pasar del máximo de convocados (R-01)', () => {
    const filas = [
      ...titulares(11),
      ...Array.from({ length: 8 }, (_, i) =>
        fila({ playerId: `s${i}`, llamada: 'substitute', dorsal: String(20 + i) }),
      ),
    ];

    const resultado = validarConvocatoria(filas, CADETE);

    expect(resultado.valores).toBeNull();
    expect(resultado.errores.general).toEqual(['Como mucho 18 convocados y hay 19.']);
  });

  it('no deja convocar a quien no está disponible (L-04)', () => {
    const filas = [
      ...titulares(10),
      fila({
        playerId: 'x',
        nickname: 'Castigado',
        availability: 'sanctioned',
        llamada: 'starter',
      }),
    ];

    const resultado = validarConvocatoria(filas, CADETE);

    expect(resultado.valores).toBeNull();
    expect(resultado.errores.general).toEqual(['Castigado no se puede convocar.']);
  });

  it('rechaza un dorsal fuera del 1 al 99 en un convocado', () => {
    const filas = [...titulares(10), fila({ playerId: 'x', llamada: 'starter', dorsal: '100' })];

    const resultado = validarConvocatoria(filas, CADETE);

    expect(resultado.valores).toBeNull();
    expect(resultado.errores.dorsales).toEqual({ x: 'El dorsal va del 1 al 99.' });
  });

  it('no mira el dorsal de quien no va convocado', () => {
    const filas = [...titulares(11), fila({ playerId: 'x', dorsal: 'siete' })];

    expect(validarConvocatoria(filas, CADETE).valores).not.toBeNull();
  });

  it('no deja repetir dorsal entre convocados, y marca a los dos', () => {
    const filas = [
      ...titulares(10),
      fila({ playerId: 'x', nickname: 'Otro', llamada: 'substitute', dorsal: '3' }),
      fila({ playerId: 'y', llamada: 'starter', dorsal: '11' }),
    ];

    const resultado = validarConvocatoria(filas, CADETE);

    expect(resultado.valores).toBeNull();
    expect(resultado.errores.dorsales).toEqual({
      t3: 'El 3 lo lleva también Otro.',
      x: 'El 3 lo lleva también t3.',
    });
  });

  it('acepta un convocado sin dorsal', () => {
    const filas = [...titulares(10), fila({ playerId: 'x', llamada: 'starter', dorsal: ' ' })];

    const { valores } = validarConvocatoria(filas, CADETE);

    expect(valores?.[10]).toEqual({
      player_id: 'x',
      call_status: 'starter',
      shirt_number: null,
      position: null,
    });
  });
});
