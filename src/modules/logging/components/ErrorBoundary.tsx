// Error Boundary global (DOC 06 §10.1, capa 1; E12-02).
//
// Captura lo que revienta al pintar cualquier componente de debajo, lo manda a
// `error_logs` en silencio y enseña la C03 en vez de una pantalla en blanco.
//
// Tiene que ser una clase: React sigue sin ofrecer los Error Boundaries como
// hook. Es la única clase del proyecto y no conviene que haya más.
//
// Lo que NO ve un Error Boundary, para que nadie se lleve un susto: errores en
// manejadores de eventos, en código asíncrono y en temporizadores. Esos los
// recoge `instalarCapturaGlobal`. Y los que revientan dentro de una ruta los
// captura antes el `errorElement` del enrutador, que registra por su cuenta.

import { Component } from 'react';

import { registrarError } from '../api/registro';
import { PantallaError } from './PantallaError';

import type { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hayError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hayError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hayError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // La pila de componentes dice en qué pieza de la interfaz reventó, que la
    // traza de JavaScript no siempre deja claro. Son nombres de componentes,
    // nada de datos.
    void registrarError(error, 'boundary', info.componentStack ?? undefined);
  }

  render() {
    if (this.state.hayError) {
      return (
        <PantallaError>
          <p>La aplicación se ha encontrado con un fallo que no esperaba.</p>
          <p>Recarga para seguir. Si vuelve a pasar, avisa a quien lleve la aplicación.</p>
        </PantallaError>
      );
    }

    return this.props.children;
  }
}
