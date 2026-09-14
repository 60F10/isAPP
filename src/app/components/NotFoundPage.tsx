// Pantalla 404 — Dirección desconocida
//
// Vive en `app/` y no en un módulo: no es de nadie, es del enrutador.

import { Link } from 'react-router';

import { Pantalla } from '@shared/ui/Pantalla';

export function NotFoundPage() {
  return (
    <Pantalla id="404" titulo="Aquí no hay nada">
      <p>La dirección que has abierto no lleva a ninguna pantalla de la aplicación.</p>
      <p>
        <Link to="/">Volver al inicio</Link>
      </p>
    </Pantalla>
  );
}
