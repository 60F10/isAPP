// Esqueleto de navegación (DOC 02 §3.1).
//
// Los cinco destinos viven en una sola lista del DOM. Lo que cambia entre el
// móvil y el escritorio es la maquetación, no el marcado: dos listas obligarían
// a mantener dos órdenes de tabulación y a repetir el estado activo.

import { NavLink, Outlet } from 'react-router';

import { Icon } from '@shared/ui/Icon';

import styles from './AppLayout.module.css';

import type { IconName } from '@shared/ui/icons/registry';

interface Destino {
  to: string;
  texto: string;
  icono: IconName;
  /** Solo la raíz. Sin `end`, «Inicio» quedaría activo en todas las rutas. */
  end?: boolean;
}

const DESTINOS: readonly Destino[] = [
  { to: '/', texto: 'Inicio', icono: 'clock', end: true },
  { to: '/equipos', texto: 'Equipo', icono: 'team' },
  { to: '/calendario', texto: 'Agenda', icono: 'plus' },
  { to: '/estadisticas', texto: 'Datos', icono: 'reliability' },
  { to: '/ajustes', texto: 'Más', icono: 'settings' },
];

export function AppLayout() {
  return (
    <div className={styles.marco}>
      {/* Primer elemento enfocable de la página (criterio 2.4.1). */}
      <a className={styles.saltar} href="#contenido">
        Saltar al contenido
      </a>

      <nav className={styles.navegacion} aria-label="Principal">
        <ul className={styles.lista}>
          {DESTINOS.map((destino) => (
            <li key={destino.to} className={styles.elemento}>
              <NavLink
                to={destino.to}
                end={destino.end}
                // `NavLink` pone `aria-current="page"` por su cuenta en el
                // destino activo. Aquí solo se añade la señal visual.
                className={({ isActive }) =>
                  [styles.enlace, isActive ? styles.activo : ''].filter(Boolean).join(' ')
                }
              >
                <Icon name={destino.icono} />
                <span className={styles.etiqueta}>{destino.texto}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* `tabIndex={-1}` para que el salto al contenido mueva el foco de
          verdad: sin él, buena parte de los navegadores solo desplazan la
          página y el lector de pantalla se queda donde estaba. */}
      <main id="contenido" className={styles.contenido} tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
