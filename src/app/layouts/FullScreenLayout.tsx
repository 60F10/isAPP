// Maqueta a pantalla completa. Hoy solo la usa A12, el partido en directo.
//
// No pinta la barra ni el rail (DOC 02 §3.1). Salir del directo es una acción
// explícita de la propia pantalla: con el móvil en la mano, de pie y sin mirar,
// un roce en una barra de navegación saca del partido a mitad de jugada y lo
// que se pierde son eventos sin registrar.

import { Outlet } from 'react-router';

import styles from './FullScreenLayout.module.css';

export function FullScreenLayout() {
  return (
    <main id="contenido" className={styles.marco}>
      <Outlet />
    </main>
  );
}
