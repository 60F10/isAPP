// El Error Boundary pinta la C03 y manda el fallo al registro (T-106).
//
// El registro se sustituye en la frontera de `api/` (DOC 06 §11): aquí se
// prueba que se le llama bien, no que Supabase inserte.

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from './ErrorBoundary';

const registrarError = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('../api/registro', () => ({ registrarError }));

function Revienta(): never {
  throw new Error('Fallo de prueba');
}

describe('ErrorBoundary', () => {
  it('sin error pinta a sus hijos y no registra nada', () => {
    render(
      <ErrorBoundary>
        <p>Todo bien</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Todo bien')).toBeInTheDocument();
    expect(registrarError).not.toHaveBeenCalled();
  });

  it('con error pinta la C03 con sus dos salidas y lo registra como boundary', () => {
    // React escribe en la consola cada error que captura un boundary. Aquí es
    // lo esperado y solo ensucia la salida.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <Revienta />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Algo ha fallado' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recargar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir al inicio' })).toBeInTheDocument();
    expect(registrarError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Fallo de prueba' }),
      'boundary',
      expect.any(String),
    );
  });
});
