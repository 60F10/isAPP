// `GrupoDeOpciones` sin nada elegido (T-229): la lista de asistencia tiene
// jugadores sin marcar, y ahí ningún radio va marcado.

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { GrupoDeOpciones } from './GrupoDeOpciones';

const OPCIONES = [
  { valor: 'present', etiqueta: 'Presente' },
  { valor: 'absent', etiqueta: 'Ausente' },
  { valor: 'late', etiqueta: 'Retraso' },
] as const;

type Estado = (typeof OPCIONES)[number]['valor'];

describe('GrupoDeOpciones', () => {
  it('con valor nulo no hay ningún radio marcado, y elegir uno llama a alCambiar', async () => {
    const alCambiar = vi.fn<(valor: Estado) => void>();

    render(
      <GrupoDeOpciones<Estado>
        leyenda="Asistencia de Tito"
        opciones={OPCIONES}
        valor={null}
        alCambiar={alCambiar}
      />,
    );

    expect(screen.getByRole('group', { name: 'Asistencia de Tito' })).toBeInTheDocument();

    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).not.toBeChecked();
    }

    await userEvent.click(screen.getByRole('radio', { name: 'Ausente' }));

    expect(alCambiar).toHaveBeenCalledTimes(1);
    expect(alCambiar).toHaveBeenCalledWith('absent');
  });

  it('con valor, marca el suyo y solo el suyo', () => {
    render(
      <GrupoDeOpciones<Estado>
        leyenda="Asistencia de Tito"
        opciones={OPCIONES}
        valor="late"
        alCambiar={() => undefined}
      />,
    );

    expect(screen.getByRole('radio', { name: 'Retraso' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Presente' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Ausente' })).not.toBeChecked();
  });
});
