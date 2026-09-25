// Pantalla C03 dentro del enrutador (T-106).
//
// react-router captura lo que revienta dentro de una ruta —un componente, un
// `lazy` que no baja— antes de que llegue al Error Boundary de la aplicación,
// así que este `errorElement` tiene que hacer lo mismo que él: registrar en
// `error_logs` y enseñar la C03. La vista es la misma, `PantallaError`.
//
// Lo que no se registra: las respuestas de ruta con código 4xx, como un 404,
// que son navegación y no fallos de código.

import { useEffect } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router';

// Rutas directas y no el barril: ver `modules/logging/index.ts`.
import { registrarError } from '@modules/logging/api/registro';
import { PantallaError } from '@modules/logging/components/PantallaError';

export function RouteErrorPage() {
  const error = useRouteError();
  const esDeNavegacion = isRouteErrorResponse(error) && error.status < 500;

  useEffect(() => {
    if (!esDeNavegacion) {
      void registrarError(error, 'ruta');
    }
  }, [error, esDeNavegacion]);

  if (isRouteErrorResponse(error)) {
    return (
      <PantallaError detalle={`${error.status} · ${error.statusText}`}>
        <p>No se pudo abrir esta pantalla.</p>
      </PantallaError>
    );
  }

  return (
    <PantallaError>
      <p>No se pudo cargar la pantalla. Si estabas sin cobertura, busca señal y recarga.</p>
      <p>Si no era eso, avisa a quien lleve la aplicación.</p>
    </PantallaError>
  );
}
