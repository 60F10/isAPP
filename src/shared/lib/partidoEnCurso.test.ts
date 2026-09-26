import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CADUCIDAD_MS,
  leerPartidoEnCurso,
  marcarPartidoEnCurso,
  quitarPartidoEnCurso,
  suscribirPartidoEnCurso,
} from './partidoEnCurso';

afterEach(() => {
  window.localStorage.clear();
});

describe('partido en curso', () => {
  it('se marca, se lee y se quita', () => {
    marcarPartidoEnCurso('par-1', 1_000);

    expect(leerPartidoEnCurso(2_000)).toBe('par-1');

    quitarPartidoEnCurso('par-1');

    expect(leerPartidoEnCurso(2_000)).toBeNull();
  });

  it('caduca sola: un partido abandonado no calla el aviso de versión para siempre', () => {
    marcarPartidoEnCurso('par-1', 1_000);

    expect(leerPartidoEnCurso(1_000 + CADUCIDAD_MS - 1)).toBe('par-1');
    expect(leerPartidoEnCurso(1_000 + CADUCIDAD_MS + 1)).toBeNull();
  });

  it('quitar la marca de otro partido no quita la de este', () => {
    marcarPartidoEnCurso('par-1', 1_000);
    quitarPartidoEnCurso('par-2');

    expect(leerPartidoEnCurso(1_000)).toBe('par-1');
  });

  it('una marca estropeada cuenta como ninguna', () => {
    window.localStorage.setItem('sasi.partido-en-curso', '{no es json');

    expect(leerPartidoEnCurso(1_000)).toBeNull();
  });

  it('avisa a quien escucha en esta pestaña', () => {
    const oyente = vi.fn();
    const dejar = suscribirPartidoEnCurso(oyente);

    marcarPartidoEnCurso('par-1', 1_000);
    quitarPartidoEnCurso('par-1');
    dejar();
    marcarPartidoEnCurso('par-1', 1_000);

    expect(oyente).toHaveBeenCalledTimes(2);
  });
});
