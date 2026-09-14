// Maqueta sin navegación: entrar (A01) y sin permiso (C05).
//
// Sin barra ni rail a propósito. En A01 todavía no hay sesión y no hay a dónde
// navegar; en C05 la navegación llevaría justo a donde no se puede entrar.

import { Outlet } from 'react-router';

import styles from './BareLayout.module.css';

export function BareLayout() {
  return (
    <main id="contenido" className={styles.marco}>
      <div className={styles.caja}>
        <Outlet />
      </div>
    </main>
  );
}
