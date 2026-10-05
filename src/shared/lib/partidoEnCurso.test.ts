import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CADUCIDAD_MS,
  leerMarcaEnCurso,
  leerPartidoEnCurso,
  marcarPartidoEnCurso,
  quitarPartidoEnCurso,
  suscribirPartidoEnCurso,
  textoDePartidoEnCurso,
} from './partidoEnCurso';

import type { Reloj } from './reloj';

const RELOJ: Reloj = { inicio: 500, pausadoMs: 0, pausaDesde: null };

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

  // --- El reloj de la parte abierta (T-225) --------------------------------

  it('marcar sin reloj deja la marca con `reloj: null`', () => {
    marcarPartidoEnCurso('par-1', 1_000);

    expect(leerMarcaEnCurso(2_000)).toEqual({ partidoId: 'par-1', reloj: null });
  });

  it('volver a marcar el mismo partido con otro reloj cambia el reloj y conserva `desde`', () => {
    marcarPartidoEnCurso('par-1', 1_000, RELOJ);
    marcarPartidoEnCurso('par-1', 9_000, { ...RELOJ, pausaDesde: 8_000 });

    expect(leerMarcaEnCurso(9_000)).toEqual({
      partidoId: 'par-1',
      reloj: { inicio: 500, pausadoMs: 0, pausaDesde: 8_000 },
    });
    // La caducidad sigue contando desde la primera vez, no desde la segunda.
    expect(leerMarcaEnCurso(1_000 + CADUCIDAD_MS + 1)).toBeNull();
    expect(leerPartidoEnCurso(1_000 + CADUCIDAD_MS + 1)).toBeNull();
  });

  it('al terminar la parte, el reloj pasa a `null`', () => {
    marcarPartidoEnCurso('par-1', 1_000, RELOJ);
    marcarPartidoEnCurso('par-1', 2_000, null);

    expect(leerMarcaEnCurso(2_000)).toEqual({ partidoId: 'par-1', reloj: null });
  });

  it('volver a marcar con el mismo reloj no escribe ni avisa', () => {
    marcarPartidoEnCurso('par-1', 1_000, RELOJ);

    const oyente = vi.fn();
    const dejar = suscribirPartidoEnCurso(oyente);
    const escribir = vi.spyOn(Storage.prototype, 'setItem');

    marcarPartidoEnCurso('par-1', 9_000, { ...RELOJ });
    dejar();

    expect(escribir).not.toHaveBeenCalled();
    expect(oyente).not.toHaveBeenCalled();

    escribir.mockRestore();
  });

  it('marcar otro partido estrena marca: `desde` nuevo y el reloj que traiga', () => {
    marcarPartidoEnCurso('par-1', 1_000, RELOJ);
    marcarPartidoEnCurso('par-2', 1_000 + CADUCIDAD_MS, null);

    expect(leerMarcaEnCurso(1_000 + CADUCIDAD_MS + 1)).toEqual({ partidoId: 'par-2', reloj: null });
  });

  it('una marca guardada antes de la T-225, sin `reloj`, vale y se lee con `reloj: null`', () => {
    window.localStorage.setItem(
      'sasi.partido-en-curso',
      JSON.stringify({ partidoId: 'par-1', desde: 1_000 }),
    );

    expect(leerMarcaEnCurso(2_000)).toEqual({ partidoId: 'par-1', reloj: null });
    expect(leerMarcaEnCurso(1_000 + CADUCIDAD_MS + 1)).toBeNull();
  });

  it('un reloj estropeado no tumba la marca: se lee con `reloj: null`', () => {
    window.localStorage.setItem(
      'sasi.partido-en-curso',
      JSON.stringify({ partidoId: 'par-1', desde: 1_000, reloj: { inicio: 'ayer' } }),
    );

    expect(leerMarcaEnCurso(2_000)).toEqual({ partidoId: 'par-1', reloj: null });
    expect(leerPartidoEnCurso(2_000)).toBe('par-1');
  });

  it('el texto crudo es el mismo mientras la marca no cambie, y `null` sin marca', () => {
    expect(textoDePartidoEnCurso()).toBeNull();

    marcarPartidoEnCurso('par-1', 1_000, RELOJ);
    const texto = textoDePartidoEnCurso();

    expect(texto).not.toBeNull();
    expect(textoDePartidoEnCurso()).toBe(texto);

    marcarPartidoEnCurso('par-1', 2_000, null);

    expect(textoDePartidoEnCurso()).not.toBe(texto);
  });
});
