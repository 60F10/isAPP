// Esqueleto de navegación (DOC 02 §3.1).
//
// La barra de destinos (`BarraDeDestinos`) va antes que el contenido en el DOM
// y la maqueta la sitúa. Los destinos y qué ruta marca a cuál, en `destinos.ts`.

import { Outlet } from 'react-router';

import { BarraDeDestinos } from '../components/BarraDeDestinos';
import { PartidoEnCurso } from '../components/PartidoEnCurso';

import styles from './AppLayout.module.css';

export function AppLayout() {
  return (
    <div className={styles.marco}>
      {/* Primer elemento enfocable de la página (criterio 2.4.1). */}
      <a className={styles.saltar} href="#contenido">
        Saltar al contenido
      </a>

      <BarraDeDestinos />

      {/* La banda «Partido en directo» (T-225) y el contenido comparten
          columna: la banda se queda con la fila que necesite y el contenido
          desplaza por dentro con el resto. Sin partido en curso no pinta nada
          y la columna es solo el contenido, como antes. */}
      <div className={styles.columna}>
        <PartidoEnCurso />

        {/* `tabIndex={-1}` para que el salto al contenido mueva el foco de
            verdad: sin él, buena parte de los navegadores solo desplazan la
            página y el lector de pantalla se queda donde estaba. */}
        <main id="contenido" className={styles.contenido} tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
