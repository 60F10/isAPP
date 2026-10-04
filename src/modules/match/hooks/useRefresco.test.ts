// El refresco del directo (T-209b, D06-38). Lo que se vigila: varios avisos
// seguidos son un solo refresco, la red de seguridad va a 20 s y pasa a 60 s
// en cuanto llega un aviso de verdad, con la pantalla oculta o sin red no se
// refresca, nunca hay dos refrescos a la vez, y uno que falla o que se queda
// colgado no para los siguientes.

import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AGRUPAR_MS,
  CADUCA_MS,
  SEGURIDAD_CON_AVISOS_MS,
  SEGURIDAD_MS,
  useRefresco,
} from './useRefresco';

import type { AlRefrescar } from './useRefresco';
import type { Mock } from 'vitest';

const canal = vi.hoisted(() => ({
  escucharPartido: vi.fn(),
  avisar: () => undefined as void,
  parar: vi.fn(),
}));

vi.mock('../api/tiempoReal', () => ({ escucharPartido: canal.escucharPartido }));

function ponerVisibilidad(estado: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => estado });
  document.dispatchEvent(new Event('visibilitychange'));
}

function ponerRed(enLinea: boolean): void {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => enLinea });
  window.dispatchEvent(new Event(enLinea ? 'online' : 'offline'));
}

beforeEach(() => {
  vi.useFakeTimers();
  canal.parar.mockReset();
  canal.escucharPartido.mockReset();
  canal.escucharPartido.mockImplementation((_partidoId: string, alCambiar: () => void) => {
    canal.avisar = alCambiar;

    return canal.parar;
  });
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(document, 'visibilityState');
  Reflect.deleteProperty(navigator, 'onLine');
});

function montar(alRefrescar: Mock<AlRefrescar> = vi.fn<AlRefrescar>(() => Promise.resolve())) {
  const montado = renderHook(() => {
    useRefresco('par-1', alRefrescar);
  });

  return { alRefrescar, ...montado };
}

describe('useRefresco', () => {
  it('escucha el partido al montarse y deja de escuchar al desmontarse', () => {
    const { unmount } = montar();

    expect(canal.escucharPartido).toHaveBeenCalledWith('par-1', expect.any(Function));
    expect(canal.parar).not.toHaveBeenCalled();

    unmount();

    expect(canal.parar).toHaveBeenCalledTimes(1);
  });

  it('tres avisos en medio segundo dan un refresco, un segundo después del último', async () => {
    const { alRefrescar } = montar();

    canal.avisar();
    await vi.advanceTimersByTimeAsync(250);
    canal.avisar();
    await vi.advanceTimersByTimeAsync(250);
    canal.avisar();
    await vi.advanceTimersByTimeAsync(AGRUPAR_MS - 1);

    expect(alRefrescar).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);

    expect(alRefrescar).toHaveBeenCalledTimes(1);
  });

  it('sin avisos, refresca a los 20 s, y otra vez a los 20 s', async () => {
    const { alRefrescar } = montar();

    await vi.advanceTimersByTimeAsync(SEGURIDAD_MS - 1);
    expect(alRefrescar).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(alRefrescar).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(SEGURIDAD_MS);
    expect(alRefrescar).toHaveBeenCalledTimes(2);
  });

  it('tras el primer aviso, el siguiente de seguridad es a los 60 s', async () => {
    const { alRefrescar } = montar();

    canal.avisar();
    await vi.advanceTimersByTimeAsync(AGRUPAR_MS);
    expect(alRefrescar).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(SEGURIDAD_CON_AVISOS_MS - 1);
    expect(alRefrescar).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(alRefrescar).toHaveBeenCalledTimes(2);
  });

  it('con la pantalla oculta no refresca, ni por seguridad ni por aviso; al volver, sí', async () => {
    const { alRefrescar } = montar();

    ponerVisibilidad('hidden');
    await vi.advanceTimersByTimeAsync(SEGURIDAD_MS * 3);
    canal.avisar();
    await vi.advanceTimersByTimeAsync(AGRUPAR_MS);

    expect(alRefrescar).not.toHaveBeenCalled();

    ponerVisibilidad('visible');
    await vi.advanceTimersByTimeAsync(0);

    expect(alRefrescar).toHaveBeenCalledTimes(1);
  });

  it('sin red no refresca; al recuperarla, sí', async () => {
    const { alRefrescar } = montar();

    ponerRed(false);
    await vi.advanceTimersByTimeAsync(SEGURIDAD_MS * 3);

    expect(alRefrescar).not.toHaveBeenCalled();

    ponerRed(true);
    await vi.advanceTimersByTimeAsync(0);

    expect(alRefrescar).toHaveBeenCalledTimes(1);

    // Y la red de seguridad sigue contando desde ese refresco.
    await vi.advanceTimersByTimeAsync(SEGURIDAD_MS);
    expect(alRefrescar).toHaveBeenCalledTimes(2);
  });

  it('con un refresco en marcha no lanza otro: apunta que hay uno pendiente y lo hace al acabar', async () => {
    let soltar = () => undefined as void;
    const alRefrescar = vi.fn<AlRefrescar>(
      () =>
        new Promise<void>((resolve) => {
          soltar = resolve;
        }),
    );
    montar(alRefrescar);

    canal.avisar();
    await vi.advanceTimersByTimeAsync(AGRUPAR_MS);
    expect(alRefrescar).toHaveBeenCalledTimes(1);

    // Llegan dos avisos más y se vuelve a la pantalla mientras descarga.
    canal.avisar();
    canal.avisar();
    await vi.advanceTimersByTimeAsync(AGRUPAR_MS);
    ponerVisibilidad('visible');
    await vi.advanceTimersByTimeAsync(0);
    expect(alRefrescar).toHaveBeenCalledTimes(1);

    soltar();
    await vi.advanceTimersByTimeAsync(0);
    expect(alRefrescar).toHaveBeenCalledTimes(2);

    // El pendiente era uno solo.
    soltar();
    await vi.advanceTimersByTimeAsync(0);
    expect(alRefrescar).toHaveBeenCalledTimes(2);
  });

  it('un refresco que falla se calla y no para los siguientes', async () => {
    const alRefrescar = vi.fn<AlRefrescar>(() => Promise.reject(new TypeError('Failed to fetch')));
    montar(alRefrescar);

    await vi.advanceTimersByTimeAsync(SEGURIDAD_MS);
    expect(alRefrescar).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(SEGURIDAD_MS);
    expect(alRefrescar).toHaveBeenCalledTimes(2);
  });

  it('un refresco que se queda colgado caduca: deja de valer y no para los siguientes', async () => {
    const vigentes: (() => boolean)[] = [];
    const alRefrescar = vi.fn<AlRefrescar>((vigente) => {
      vigentes.push(vigente);

      // Una petición que no contesta nunca, como pasa con mala cobertura.
      return new Promise<void>(() => undefined);
    });
    montar(alRefrescar);

    await vi.advanceTimersByTimeAsync(SEGURIDAD_MS);
    expect(alRefrescar).toHaveBeenCalledTimes(1);
    expect(vigentes[0]?.()).toBe(true);

    await vi.advanceTimersByTimeAsync(CADUCA_MS);
    expect(vigentes[0]?.()).toBe(false);

    await vi.advanceTimersByTimeAsync(SEGURIDAD_MS);
    expect(alRefrescar).toHaveBeenCalledTimes(2);
    expect(vigentes[1]?.()).toBe(true);
  });

  it('al desmontar no queda nada programado y el refresco en marcha deja de valer', async () => {
    let vigente = () => true;
    const alRefrescar = vi.fn<AlRefrescar>((sigue) => {
      vigente = sigue;

      return new Promise<void>(() => undefined);
    });
    const { unmount } = montar(alRefrescar);

    await vi.advanceTimersByTimeAsync(SEGURIDAD_MS);
    expect(vigente()).toBe(true);

    unmount();

    expect(vigente()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);

    canal.avisar();
    await vi.advanceTimersByTimeAsync(SEGURIDAD_MS * 3);
    expect(alRefrescar).toHaveBeenCalledTimes(1);
  });

  it('usa siempre la última función que se le ha pasado', async () => {
    const primera = vi.fn<AlRefrescar>(() => Promise.resolve());
    const segunda = vi.fn<AlRefrescar>(() => Promise.resolve());
    const { rerender } = renderHook(
      ({ alRefrescar }) => {
        useRefresco('par-1', alRefrescar);
      },
      { initialProps: { alRefrescar: primera } },
    );

    rerender({ alRefrescar: segunda });
    await vi.advanceTimersByTimeAsync(SEGURIDAD_MS);

    expect(primera).not.toHaveBeenCalled();
    expect(segunda).toHaveBeenCalledTimes(1);
    // Cambiar de función no vuelve a abrir el canal.
    expect(canal.escucharPartido).toHaveBeenCalledTimes(1);
  });
});
