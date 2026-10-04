// El panel de eventos del cierre, lógica pura (T-210b).

import { describe, expect, it } from 'vitest';

import { accionesDe, agruparRepetidos, ordenar } from './discordancias';

import type { EventoRevisable } from './discordancias';

function evento(cambios: Partial<EventoRevisable> & { id: string }): EventoRevisable {
  return {
    clientEventId: `cliente-${cambios.id}`,
    tipo: 'goal',
    periodo: 1,
    segundos: 0,
    rival: false,
    jugador: null,
    segundo: null,
    detalles: {},
    estado: 'approved',
    propio: false,
    autorId: 'usuario-1',
    grupo: null,
    ...cambios,
  };
}

function ids(eventos: readonly EventoRevisable[]): string[] {
  return eventos.map((uno) => uno.id);
}

describe('ordenar', () => {
  // Al final de su parte, como los goles del cierre: la parte sí se sabe.
  it('ordena por parte y segundo, con los que no tienen segundos al final', () => {
    const eventos = [
      evento({ id: 'sin-segundos', periodo: 1, segundos: null }),
      evento({ id: 'segunda-sin-segundos', periodo: 2, segundos: null }),
      evento({ id: 'segunda-pronto', periodo: 2, segundos: 30 }),
      evento({ id: 'primera-tarde', periodo: 1, segundos: 900 }),
      evento({ id: 'primera-pronto', periodo: 1, segundos: 60 }),
    ];

    expect(ids(ordenar(eventos))).toEqual([
      'primera-pronto',
      'primera-tarde',
      'sin-segundos',
      'segunda-pronto',
      'segunda-sin-segundos',
    ]);
  });

  it('no toca la lista que recibe y respeta el orden de llegada en un empate', () => {
    const eventos = [
      evento({ id: 'b', segundos: 120 }),
      evento({ id: 'a', segundos: 120 }),
      evento({ id: 'antes', segundos: 10 }),
    ];

    expect(ids(ordenar(eventos))).toEqual(['antes', 'b', 'a']);
    expect(ids(eventos)).toEqual(['b', 'a', 'antes']);
  });
});

describe('agruparRepetidos', () => {
  it('agrupa por `duplicate_group_id` y deja sin grupo a los que van solos', () => {
    const bloques = agruparRepetidos([
      evento({ id: 'solo', segundos: 10 }),
      evento({ id: 'par-1', segundos: 600, grupo: 'g-1' }),
      evento({ id: 'en-medio', segundos: 610 }),
      evento({ id: 'par-2', segundos: 620, grupo: 'g-1', autorId: 'usuario-2' }),
      evento({ id: 'marca-suelta', segundos: 900, grupo: 'g-2' }),
    ]);

    expect(
      bloques.map((bloque) => ({ grupo: bloque.grupo, eventos: ids(bloque.eventos) })),
    ).toEqual([
      { grupo: null, eventos: ['solo'] },
      // Juntos, en el sitio del primero.
      { grupo: 'g-1', eventos: ['par-1', 'par-2'] },
      { grupo: null, eventos: ['en-medio'] },
      // Una marca que no comparte nadie no es un repetido.
      { grupo: null, eventos: ['marca-suelta'] },
    ]);
  });

  it('un descartado no hace grupo: descartado el que sobra, el otro va solo', () => {
    const bloques = agruparRepetidos([
      evento({ id: 'bueno', segundos: 600, grupo: 'g-1' }),
      evento({ id: 'sobra', segundos: 605, grupo: 'g-1', estado: 'rejected' }),
    ]);

    expect(
      bloques.map((bloque) => ({ grupo: bloque.grupo, eventos: ids(bloque.eventos) })),
    ).toEqual([
      { grupo: null, eventos: ['bueno'] },
      { grupo: null, eventos: ['sobra'] },
    ]);
  });
});

describe('accionesDe', () => {
  it('pendiente: aprobar, descartar y minuto', () => {
    expect(accionesDe(evento({ id: 'e', estado: 'pending' }), true)).toEqual([
      'aprobar',
      'descartar',
      'minuto',
    ]);
  });

  it('aprobado: descartar y minuto', () => {
    expect(accionesDe(evento({ id: 'e', estado: 'approved' }), true)).toEqual([
      'descartar',
      'minuto',
    ]);
  });

  it('descartado: solo recuperar', () => {
    expect(accionesDe(evento({ id: 'e', estado: 'rejected' }), true)).toEqual(['recuperar']);
  });

  it('sin permiso, ninguna', () => {
    expect(accionesDe(evento({ id: 'e', estado: 'pending' }), false)).toEqual([]);
    expect(accionesDe(evento({ id: 'e', estado: 'approved' }), false)).toEqual([]);
    expect(accionesDe(evento({ id: 'e', estado: 'rejected' }), false)).toEqual([]);
  });
});
