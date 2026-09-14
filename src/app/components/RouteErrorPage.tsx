// Pantalla C03 — Error de aplicación (versión provisional del enrutador)
//
// Esto NO es el Error Boundary de la aplicación: ese llega en la T-106, con
// registro en `error_logs` y opción de recargar. Lo único que hace aquí es
// evitar la pantalla en blanco que deja react-router cuando revienta un trozo
// perezoso o un `loader`: una pantalla en blanco no dice qué ha pasado y, sobre
// todo, no deja salir.
//
// Pasa por `Pantalla` como el resto: es la que sale cuando un trozo perezoso no
// baja por falta de cobertura, o sea el escenario más probable del proyecto, y
// justo ahí hace falta que el foco caiga en el encabezado y que el título del
// documento diga qué ha pasado.

import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

import { Pantalla } from '@shared/ui/Pantalla';

import styles from './RouteErrorPage.module.css';

export function RouteErrorPage() {
  const error = useRouteError();

  const detalle = isRouteErrorResponse(error)
    ? `${error.status} · ${error.statusText}`
    : 'No se pudo cargar la pantalla. Si estabas sin cobertura, vuelve a intentarlo.';

  return (
    <main id="contenido" className={styles.marco}>
      <Pantalla id="C03" titulo="Algo ha fallado">
        <p>{detalle}</p>
        <p>
          <Link to="/">Volver al inicio</Link>
        </p>
      </Pantalla>
    </main>
  );
}
