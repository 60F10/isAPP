// Aviso de versión nueva (D06-14): con un partido en curso en este
// dispositivo se calla, y sale solo cuando el partido termina (T-207).

import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AnnounceContext } from '@shared/hooks/announceContext';
import { marcarPartidoEnCurso, quitarPartidoEnCurso } from '@shared/lib/partidoEnCurso';

import { ActualizacionDisponible } from './ActualizacionDisponible';

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [true, () => undefined],
    updateServiceWorker: () => Promise.resolve(),
  }),
}));

function montar() {
  const anunciar = vi.fn();

  render(
    <AnnounceContext value={{ anunciar }}>
      <ActualizacionDisponible />
    </AnnounceContext>,
  );

  return { anunciar };
}

afterEach(() => {
  window.localStorage.clear();
});

describe('Aviso de versión nueva', () => {
  it('sin partido en curso, sale y se anuncia', () => {
    const { anunciar } = montar();

    expect(screen.getByText('Hay una versión nueva')).toBeInTheDocument();
    expect(anunciar).toHaveBeenCalledWith('Hay una versión nueva disponible');
  });

  it('con un partido en curso se calla, y sale al terminar', () => {
    marcarPartidoEnCurso('par-1', Date.now());
    const { anunciar } = montar();

    expect(screen.queryByText('Hay una versión nueva')).toBeNull();
    expect(anunciar).not.toHaveBeenCalled();

    act(() => {
      quitarPartidoEnCurso('par-1');
    });

    expect(screen.getByText('Hay una versión nueva')).toBeInTheDocument();
    expect(anunciar).toHaveBeenCalledWith('Hay una versión nueva disponible');
  });
});
