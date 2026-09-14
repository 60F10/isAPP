// Pantalla C05 — Sin permiso

import { Link } from 'react-router';

import { Pantalla } from '@shared/ui/Pantalla';

export function ForbiddenPage() {
  return (
    <Pantalla id="C05" titulo="Sin permiso">
      <p>
        Tu cuenta no tiene permiso para abrir esa pantalla. Si crees que es un error, habla con
        quien lleve el equipo: los permisos se dan desde «Personas y permisos».
      </p>
      <p>
        <Link to="/">Volver al inicio</Link>
      </p>
    </Pantalla>
  );
}
