// La banda «Partido en directo» (DOC 02 §3.1, T-225): lee la marca de
// `localStorage`, enseña el reloj de la parte abierta y lleva al directo.

import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CADUCIDAD_MS,
  marcarPartidoEnCurso,
  quitarPartidoEnCurso,
} from '@shared/lib/partidoEnCurso';

import { PartidoEnCurso } from './PartidoEnCurso';

/** Las doce en punto de un día cualquiera: la hora de las pruebas. */
const AHORA = new Date('2026-10-17T12:00:00Z').getTime();
/** 34 minutos y 12 segundos jugados a las doce. */
const INICIO = AHORA - (34 * 60 + 12) * 1000;

function montar() {
  render(
    <MemoryRouter>
      <PartidoEnCurso />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(AHORA);
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

describe('Banda «Partido en directo»', () => {
  it('sin marca no pinta nada', () => {
    montar();

    expect(screen.queryByRole('region', { name: 'Partido en directo' })).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('con marca y reloj enseña el reloj de la parte y un enlace al directo de ese partido', () => {
    marcarPartidoEnCurso('par-1', AHORA, { inicio: INICIO, pausadoMs: 0, pausaDesde: null });
    montar();

    expect(screen.getByRole('region', { name: 'Partido en directo' })).toBeInTheDocument();
    expect(screen.getByText('Partido en directo · 34:12')).toBeInTheDocument();

    const enlace = screen.getByRole('link', { name: 'Volver al partido en directo' });

    expect(enlace).toHaveAttribute('href', '/partidos/par-1/directo');
    // El nombre accesible empieza por lo que se ve escrito (criterio 2.5.3).
    expect(enlace).toHaveTextContent('Volver');
  });

  it('corriendo, el reloj avanza solo', () => {
    marcarPartidoEnCurso('par-1', AHORA, { inicio: INICIO, pausadoMs: 0, pausaDesde: null });
    montar();

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(screen.getByText('Partido en directo · 34:15')).toBeInTheDocument();
  });

  it('el reloj no es región viva: anunciaría cada segundo', () => {
    marcarPartidoEnCurso('par-1', AHORA, { inicio: INICIO, pausadoMs: 0, pausaDesde: null });
    montar();

    const banda = screen.getByRole('region', { name: 'Partido en directo' });

    expect(banda).not.toHaveAttribute('aria-live');
    expect(banda.querySelector('[aria-live], [role="status"], [role="timer"]')).toBeNull();
  });

  it('en pausa lo dice, y el reloj no avanza', () => {
    marcarPartidoEnCurso('par-1', AHORA, {
      inicio: INICIO - 60_000,
      pausadoMs: 0,
      // Se paró hace un minuto, con 34:12 en el reloj.
      pausaDesde: AHORA - 60_000,
    });
    montar();

    expect(screen.getByText('Partido en directo · 34:12 · En pausa')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(screen.getByText('Partido en directo · 34:12 · En pausa')).toBeInTheDocument();
  });

  it('sin parte abierta dice «Descanso» en vez del reloj', () => {
    marcarPartidoEnCurso('par-1', AHORA, null);
    montar();

    expect(screen.getByText('Partido en directo · Descanso')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al partido en directo' })).toHaveAttribute(
      'href',
      '/partidos/par-1/directo',
    );
  });

  it('al quitar la marca, la banda desaparece sin recargar', () => {
    marcarPartidoEnCurso('par-1', AHORA, { inicio: INICIO, pausadoMs: 0, pausaDesde: null });
    montar();

    expect(screen.getByRole('region', { name: 'Partido en directo' })).toBeInTheDocument();

    act(() => {
      quitarPartidoEnCurso('par-1');
    });

    expect(screen.queryByRole('region', { name: 'Partido en directo' })).toBeNull();
  });

  it('al cambiar el reloj de la marca, la banda lo sigue sin recargar', () => {
    marcarPartidoEnCurso('par-1', AHORA, null);
    montar();

    act(() => {
      marcarPartidoEnCurso('par-1', AHORA, {
        inicio: AHORA - 5_000,
        pausadoMs: 0,
        pausaDesde: null,
      });
    });

    expect(screen.getByText('Partido en directo · 00:05')).toBeInTheDocument();
  });

  it('una marca caducada no pinta nada', () => {
    marcarPartidoEnCurso('par-1', AHORA - CADUCIDAD_MS - 1, null);
    montar();

    expect(screen.queryByRole('region', { name: 'Partido en directo' })).toBeNull();
  });

  it('al caducar la marca, la banda desaparece sola, también con el reloj parado', () => {
    marcarPartidoEnCurso('par-1', AHORA - CADUCIDAD_MS + 90_000, null);
    montar();

    expect(screen.getByRole('region', { name: 'Partido en directo' })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3 * 60_000);
    });

    expect(screen.queryByRole('region', { name: 'Partido en directo' })).toBeNull();
  });
});
