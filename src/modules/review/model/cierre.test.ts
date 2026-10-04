// Lógica pura del cierre del partido, A13 (T-210a).

import { describe, expect, it } from 'vitest';

import {
  actaInicial,
  admiteCierre,
  alcanceEnTexto,
  bloqueosDelCierre,
  contarEventos,
  difiere,
  dondeSeSuspendio,
  esOrigen,
  estadoAlReabrir,
  golesAprobados,
  motivoDeEstado,
  origenDe,
  partesQueFaltan,
  resultadoEnTexto,
  tramoEnTexto,
  validarActa,
} from './cierre';

import type { CoberturaDelCierre, DatosDelCierre, PartidoDelCierre, Resultado } from './cierre';
import type { EventoDelDirecto } from '@modules/match';

const PARTIDO: PartidoDelCierre = {
  id: 'par-1',
  teamId: 'eq-1',
  opponentName: 'UD Orotava',
  competitionName: 'Cadete Primera Tenerife G2',
  isHome: true,
  kickoffAt: new Date(2026, 9, 3, 12, 0).toISOString(),
  status: 'finished',
  isRetroactive: false,
  periodos: 2,
  minutosDeParte: 25,
  suspendidoEnParte: null,
  suspendidoEnSegundo: null,
  actaAFavor: null,
  actaEnContra: null,
  cerradoEn: null,
};

function partido(cambios: Partial<PartidoDelCierre> = {}): PartidoDelCierre {
  return { ...PARTIDO, ...cambios };
}

function evento(cambios: Partial<EventoDelDirecto> = {}): EventoDelDirecto {
  return {
    clientEventId: 'evt-1',
    tipo: 'goal',
    periodo: 1,
    segundos: 100,
    rival: false,
    jugador: null,
    segundo: null,
    detalles: {},
    estado: 'approved',
    propio: false,
    ...cambios,
  };
}

describe('admiteCierre', () => {
  it('terminado o suspendido, se cierra siempre', () => {
    expect(admiteCierre(partido({ status: 'finished', isRetroactive: false }))).toBe(true);
    expect(admiteCierre(partido({ status: 'suspended', isRetroactive: false }))).toBe(true);
  });

  it('convocado o en juego, solo en diferido', () => {
    expect(admiteCierre(partido({ status: 'called', isRetroactive: true }))).toBe(true);
    expect(admiteCierre(partido({ status: 'called', isRetroactive: false }))).toBe(false);
    expect(admiteCierre(partido({ status: 'live', isRetroactive: true }))).toBe(true);
    expect(admiteCierre(partido({ status: 'live', isRetroactive: false }))).toBe(false);
  });

  it('programado o cerrado, nunca desde aquí', () => {
    expect(admiteCierre(partido({ status: 'scheduled', isRetroactive: true }))).toBe(false);
    expect(admiteCierre(partido({ status: 'closed', isRetroactive: true }))).toBe(false);
  });
});

describe('motivoDeEstado', () => {
  it('cerrado o cerrable, sin motivo', () => {
    expect(motivoDeEstado(partido({ status: 'closed' }))).toBeNull();
    expect(motivoDeEstado(partido({ status: 'finished' }))).toBeNull();
    expect(motivoDeEstado(partido({ status: 'suspended' }))).toBeNull();
    expect(motivoDeEstado(partido({ status: 'called', isRetroactive: true }))).toBeNull();
  });

  it('en juego, a terminarlo desde el directo', () => {
    expect(motivoDeEstado(partido({ status: 'live', isRetroactive: false }))).toBe(
      'El partido sigue en juego. Finalízalo desde el directo y vuelve aquí.',
    );
  });

  it('sin jugar, el motivo distingue si es en diferido', () => {
    expect(motivoDeEstado(partido({ status: 'scheduled', isRetroactive: false }))).toBe(
      'El partido todavía no se ha jugado.',
    );
    expect(motivoDeEstado(partido({ status: 'scheduled', isRetroactive: true }))).toBe(
      'El partido en diferido necesita su convocatoria antes de cerrarse.',
    );
  });
});

describe('dondeSeSuspendio', () => {
  it('la parte y el minuto:segundo dentro de ella', () => {
    expect(dondeSeSuspendio({ suspendidoEnParte: 2, suspendidoEnSegundo: 1390 })).toBe(
      'en la parte 2, a los 23:10',
    );
  });

  it('sin suspender, null', () => {
    expect(dondeSeSuspendio({ suspendidoEnParte: null, suspendidoEnSegundo: null })).toBeNull();
    expect(dondeSeSuspendio({ suspendidoEnParte: 1, suspendidoEnSegundo: null })).toBeNull();
    expect(dondeSeSuspendio({ suspendidoEnParte: null, suspendidoEnSegundo: 30 })).toBeNull();
  });
});

describe('estadoAlReabrir', () => {
  it('con parte y segundo, vuelve a suspendido', () => {
    expect(estadoAlReabrir({ suspendidoEnParte: 1, suspendidoEnSegundo: 0 })).toBe('suspended');
  });

  it('sin los dos, vuelve a terminado', () => {
    expect(estadoAlReabrir({ suspendidoEnParte: null, suspendidoEnSegundo: null })).toBe(
      'finished',
    );
    expect(estadoAlReabrir({ suspendidoEnParte: 1, suspendidoEnSegundo: null })).toBe('finished');
    expect(estadoAlReabrir({ suspendidoEnParte: null, suspendidoEnSegundo: 10 })).toBe('finished');
  });
});

describe('partesQueFaltan', () => {
  it('sin ninguna creada, todas', () => {
    expect(partesQueFaltan([], 2)).toEqual([1, 2]);
  });

  it('con la primera creada, solo la segunda', () => {
    expect(partesQueFaltan([1], 2)).toEqual([2]);
  });

  it('con todas creadas, ninguna', () => {
    expect(partesQueFaltan([1, 2], 2)).toEqual([]);
  });
});

describe('contarEventos', () => {
  it('separa pendientes de descartados, y no cuenta los aprobados', () => {
    const eventos = [
      evento({ clientEventId: 'e1', estado: 'pending' }),
      evento({ clientEventId: 'e2', estado: 'approved' }),
      evento({ clientEventId: 'e3', estado: 'rejected' }),
      evento({ clientEventId: 'e4', estado: 'rejected' }),
    ];

    expect(contarEventos(eventos)).toEqual({
      pendientes: [evento({ clientEventId: 'e1', estado: 'pending' })],
      descartados: 2,
    });
  });

  it('sin eventos, nada que contar', () => {
    expect(contarEventos([])).toEqual({ pendientes: [], descartados: 0 });
  });
});

describe('bloqueosDelCierre', () => {
  it('pendientes en singular y en plural', () => {
    expect(bloqueosDelCierre({ pendientes: 1, sinEnviar: 0, partesSinPermiso: 0 })).toEqual([
      'Queda 1 evento pendiente de revisar.',
    ]);
    expect(bloqueosDelCierre({ pendientes: 2, sinEnviar: 0, partesSinPermiso: 0 })).toEqual([
      'Quedan 2 eventos pendientes de revisar.',
    ]);
  });

  it('sin enviar en singular y en plural, y sin bloquear si no se sabe o no hay nada', () => {
    expect(bloqueosDelCierre({ pendientes: 0, sinEnviar: 1, partesSinPermiso: 0 })).toEqual([
      'Este móvil tiene 1 cambio del partido sin enviar.',
    ]);
    expect(bloqueosDelCierre({ pendientes: 0, sinEnviar: 2, partesSinPermiso: 0 })).toEqual([
      'Este móvil tiene 2 cambios del partido sin enviar.',
    ]);
    expect(bloqueosDelCierre({ pendientes: 0, sinEnviar: null, partesSinPermiso: 0 })).toEqual([]);
    expect(bloqueosDelCierre({ pendientes: 0, sinEnviar: 0, partesSinPermiso: 0 })).toEqual([]);
  });
});

describe('bloqueosDelCierre, con varios motivos', () => {
  it('partes que faltan y sin permiso para crearlas', () => {
    expect(bloqueosDelCierre({ pendientes: 0, sinEnviar: 0, partesSinPermiso: 1 })).toEqual([
      'Faltan partes del partido y crearlas pide el permiso de anotar en directo, que no tienes.',
    ]);
  });

  it('con los tres motivos juntos, los tres bloqueos', () => {
    expect(bloqueosDelCierre({ pendientes: 1, sinEnviar: 1, partesSinPermiso: 1 })).toHaveLength(3);
  });
});

describe('validarActa', () => {
  it('dos números entre 0 y 99, válidos', () => {
    expect(validarActa({ aFavor: '2', enContra: '1' })).toEqual({
      valores: { aFavor: 2, enContra: 1 },
      errores: {},
    });
  });

  it('recorta los espacios de los bordes', () => {
    expect(validarActa({ aFavor: ' 2 ', enContra: ' 1 ' }).valores).toEqual({
      aFavor: 2,
      enContra: 1,
    });
  });

  it('vacío, con letras, con tres cifras, negativo o con decimales, no vale', () => {
    const mensaje = 'Escribe un número entre 0 y 99.';

    for (const invalido of ['', 'a', '100', '-1', '1.5']) {
      const resultado = validarActa({ aFavor: invalido, enContra: '0' });

      expect(resultado.valores).toBeNull();
      expect(resultado.errores.aFavor).toBe(mensaje);
    }
  });

  it('cada campo lleva su propio error', () => {
    expect(validarActa({ aFavor: '', enContra: '' }).errores).toEqual({
      aFavor: 'Escribe un número entre 0 y 99.',
      enContra: 'Escribe un número entre 0 y 99.',
    });
  });
});

describe('actaInicial', () => {
  const datos = (
    cambiosPartido: Partial<PartidoDelCierre>,
    calculado: Resultado,
  ): Pick<DatosDelCierre, 'partido' | 'calculado'> => ({
    partido: partido(cambiosPartido),
    calculado,
  });

  it('con acta confirmada, la del acta', () => {
    expect(
      actaInicial(datos({ actaAFavor: 2, actaEnContra: 1 }, { aFavor: 3, enContra: 3 })),
    ).toEqual({ aFavor: '2', enContra: '1' });
  });

  it('sin acta confirmada, lo calculado', () => {
    expect(actaInicial(datos({}, { aFavor: 2, enContra: 0 }))).toEqual({
      aFavor: '2',
      enContra: '0',
    });
  });
});

describe('difiere', () => {
  it('el acta y lo calculado, iguales o no', () => {
    expect(difiere({ aFavor: 2, enContra: 1 }, { aFavor: 2, enContra: 1 })).toBe(false);
    expect(difiere({ aFavor: 2, enContra: 1 }, { aFavor: 1, enContra: 1 })).toBe(true);
    expect(difiere({ aFavor: 2, enContra: 1 }, { aFavor: 2, enContra: 0 })).toBe(true);
  });
});

describe('resultadoEnTexto', () => {
  it('a favor delante, con guion', () => {
    expect(resultadoEnTexto({ aFavor: 2, enContra: 1 })).toBe('2 - 1');
  });
});

describe('esOrigen y origenDe', () => {
  it('los cinco orígenes del glosario, y ninguno más', () => {
    for (const valor of ['jugada', 'penalti', 'falta_directa', 'corner', 'rechace']) {
      expect(esOrigen(valor)).toBe(true);
    }
    expect(esOrigen('fuera_de_juego')).toBe(false);
    expect(esOrigen('')).toBe(false);
  });

  it('origenDe lee el guardado, o null si no lo tiene o no se reconoce', () => {
    expect(origenDe({ detalles: { origen: 'penalti' } })).toBe('penalti');
    expect(origenDe({ detalles: { origen: 'fuera_de_juego' } })).toBeNull();
    expect(origenDe({ detalles: {} })).toBeNull();
  });
});

describe('golesAprobados', () => {
  it('solo los goles aprobados, en orden de partido', () => {
    const eventos = [
      evento({ clientEventId: 'tarde', tipo: 'goal', periodo: 2, segundos: 300 }),
      evento({ clientEventId: 'pendiente', tipo: 'goal', estado: 'pending' }),
      evento({ clientEventId: 'no-es-gol', tipo: 'yellow_card' }),
      evento({ clientEventId: 'temprano', tipo: 'goal', periodo: 1, segundos: 200 }),
      evento({ clientEventId: 'sin-segundos', tipo: 'goal', periodo: 1, segundos: null }),
    ];

    expect(golesAprobados(eventos).map((gol) => gol.clientEventId)).toEqual([
      'temprano',
      'sin-segundos',
      'tarde',
    ]);
  });
});

describe('coberturas (T-209a)', () => {
  const COBERTURA: CoberturaDelCierre = {
    id: 'cob-1',
    autorId: 'usuario-1',
    alcance: 'full_team',
    jugador: null,
    desde: { periodo: 1, segundos: 0 },
    hasta: { periodo: 2, segundos: 2520 },
    diferido: false,
  };
  const nombre = (id: string) => (id === 'p7' ? '7 · Juanito' : 'Jugador fuera de la convocatoria');

  it('alcanceEnTexto dice qué siguió, con el jugador si era uno', () => {
    expect(alcanceEnTexto(COBERTURA, nombre)).toBe('Todo el equipo');
    expect(alcanceEnTexto({ ...COBERTURA, alcance: 'single_player', jugador: 'p7' }, nombre)).toBe(
      'Solo a 7 · Juanito',
    );
    expect(alcanceEnTexto({ ...COBERTURA, alcance: 'goals_cards' }, nombre)).toBe(
      'Solo goles y tarjetas',
    );
    expect(alcanceEnTexto({ ...COBERTURA, alcance: 'custom' }, nombre)).toBe(
      'Una selección de tipos',
    );
  });

  it('tramoEnTexto va en minutos de partido, contando las partes anteriores', () => {
    expect(tramoEnTexto(COBERTURA, 40)).toBe('Del minuto 0 al 82');
    expect(
      tramoEnTexto(
        {
          ...COBERTURA,
          desde: { periodo: 1, segundos: 754 },
          hasta: { periodo: 2, segundos: 0 },
        },
        40,
      ),
    ).toBe('Del minuto 12 al 40');
  });

  it('una abierta dice desde cuándo, y una en diferido lo dice', () => {
    expect(
      tramoEnTexto({ ...COBERTURA, desde: { periodo: 2, segundos: 300 }, hasta: null }, 40),
    ).toBe('Desde el minuto 45');
    expect(tramoEnTexto({ ...COBERTURA, diferido: true }, 40)).toBe(
      'Del minuto 0 al 82, en diferido',
    );
  });
});
