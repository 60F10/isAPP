// La barra de destinos (T-304): a dónde lleva cada uno y cuál marca.

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { BarraDeDestinos } from './BarraDeDestinos';

function montar(ruta: string) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <BarraDeDestinos />
    </MemoryRouter>,
  );
}

describe('BarraDeDestinos', () => {
  it('dentro de la plantilla, «Equipo» lleva aria-current y es el único', () => {
    montar('/equipos/x/plantilla');

    const actuales = screen
      .getAllByRole('link')
      .filter((enlace) => enlace.getAttribute('aria-current') === 'page');

    expect(actuales).toHaveLength(1);
    expect(actuales[0]).toHaveAccessibleName('Equipo');
    expect(actuales[0]?.className).toMatch(/activo/);
  });

  it('en Ajustes, «Más» es el destino marcado', () => {
    montar('/ajustes');

    expect(screen.getByRole('link', { name: 'Más' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Equipo' })).not.toHaveAttribute('aria-current');
  });

  it('«Equipo» enlaza a /equipo y «Más» a /mas', () => {
    montar('/');

    expect(screen.getByRole('link', { name: 'Equipo' })).toHaveAttribute('href', '/equipo');
    expect(screen.getByRole('link', { name: 'Más' })).toHaveAttribute('href', '/mas');
  });

  it('es la navegación principal', () => {
    montar('/');

    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument();
  });
});
