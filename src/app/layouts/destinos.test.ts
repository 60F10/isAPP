// Qué destino de la barra se marca en cada ruta (T-304).

import { describe, expect, it } from 'vitest';

import { DESTINOS, esDestinoActual } from './destinos';

/** Los textos de los destinos que se marcan en la ruta, en el orden de la barra. */
function marcados(ruta: string): string[] {
  return DESTINOS.filter((destino) => esDestinoActual(destino, ruta)).map(
    (destino) => destino.texto,
  );
}

describe('esDestinoActual', () => {
  it('«/» marca solo Inicio, y «/calendario» no lo marca', () => {
    expect(marcados('/')).toEqual(['Inicio']);
    expect(marcados('/calendario')).toEqual(['Agenda']);
  });

  it('el equipo y todo lo que cuelga de él marcan «Equipo»', () => {
    for (const ruta of [
      '/equipo',
      '/equipos',
      '/equipos/x/plantilla',
      '/club',
      '/jugadores/x/editar',
    ]) {
      expect(marcados(ruta)).toEqual(['Equipo']);
    }
  });

  it('un prefijo que solo se parece no marca: «/equipaje» no es «Equipo»', () => {
    expect(marcados('/equipaje')).toEqual([]);
  });

  it('«Más» y lo que cuelga de él marcan «Más»', () => {
    for (const ruta of ['/mas', '/ajustes', '/mis-aportaciones', '/admin/logs']) {
      expect(marcados(ruta)).toEqual(['Más']);
    }
  });

  it('los entrenamientos cuelgan de «Agenda» (T-228)', () => {
    for (const ruta of ['/entrenamientos', '/entrenamientos/x/lista', '/entrenamientos/nuevo']) {
      expect(marcados(ruta)).toEqual(['Agenda']);
    }
  });

  it('«/mascota» no marca «Más»', () => {
    expect(marcados('/mascota')).toEqual([]);
  });

  it('con una barra final sigue marcando el mismo destino', () => {
    expect(marcados('/equipo/')).toEqual(['Equipo']);
  });

  it('con `end`, solo marca la ruta exacta', () => {
    const exacto = { to: '/solo', texto: 'Solo', icono: 'clock', end: true } as const;

    expect(esDestinoActual(exacto, '/solo')).toBe(true);
    expect(esDestinoActual(exacto, '/solo/dentro')).toBe(false);
  });
});

describe('DESTINOS', () => {
  it('«Equipo» abre /equipo y «Más» abre /mas; los otros tres, igual que antes', () => {
    expect(DESTINOS.map((destino) => [destino.texto, destino.to])).toEqual([
      ['Inicio', '/'],
      ['Equipo', '/equipo'],
      ['Agenda', '/calendario'],
      ['Datos', '/estadisticas'],
      ['Más', '/mas'],
    ]);
  });
});
