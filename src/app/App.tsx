// Composición de la aplicación (DOC 06 §3.1).
//
// De fuera adentro: caché de servidor, sesión, región viva y enrutador. El
// orden no es decorativo. `AuthProvider` consultará el perfil con react-query
// en la T-105, así que va por dentro del suyo; y la región viva envuelve al
// enrutador porque cualquier pantalla tiene que poder anunciar.
//
// El aviso de versión nueva va dentro de la región viva —la necesita para
// anunciarse— y por encima del enrutador, para que salga en cualquier ruta.
// Comparte marco con la ruta en vez de superponerse: el porqué está en
// `ActualizacionDisponible.module.css`.

import { RouterProvider } from 'react-router';

import { ActualizacionDisponible } from './components/ActualizacionDisponible';
import { AnnounceProvider } from './providers/AnnounceProvider';
import { AuthProvider } from './providers/AuthProvider';
import { QueryProvider } from './providers/QueryProvider';
import { router } from './router';

import styles from './App.module.css';

export function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <AnnounceProvider>
          <div className={styles.marco}>
            <ActualizacionDisponible />
            <div className={styles.ruta}>
              <RouterProvider router={router} />
            </div>
          </div>
        </AnnounceProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
