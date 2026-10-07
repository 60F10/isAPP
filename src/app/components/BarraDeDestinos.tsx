// La barra de destinos: inferior en móvil y rail lateral en escritorio (DOC 02
// §3.1). Sale de `AppLayout` en la T-304 para que la regla de qué destino se
// marca (`esDestinoActual`) tenga su propia prueba.
//
// Los cinco destinos viven en una sola lista del DOM. Lo que cambia entre el
// móvil y el escritorio es la maquetación, no el marcado: dos listas obligarían
// a mantener dos órdenes de tabulación y a repetir el estado activo.
//
// Los estilos se quedan en `AppLayout.module.css`: la maqueta del marco, la
// barra y el rail se reparten el mismo hueco y se leen mejor juntos.

import { Link, useLocation } from 'react-router';

import { Icon } from '@shared/ui/Icon';

import { DESTINOS, esDestinoActual } from '../layouts/destinos';

import styles from '../layouts/AppLayout.module.css';

export function BarraDeDestinos() {
  const { pathname } = useLocation();

  return (
    <nav className={styles.navegacion} aria-label="Principal">
      <ul className={styles.lista}>
        {DESTINOS.map((destino) => {
          const actual = esDestinoActual(destino, pathname);

          return (
            <li key={destino.to} className={styles.elemento}>
              <Link
                to={destino.to}
                // Además del color, el destino actual lo dice `aria-current` y
                // lo subraya `.activo` (criterio 1.4.1).
                aria-current={actual ? 'page' : undefined}
                className={[styles.enlace, actual ? styles.activo : ''].filter(Boolean).join(' ')}
              >
                <Icon name={destino.icono} />
                <span className={styles.etiqueta}>{destino.texto}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
