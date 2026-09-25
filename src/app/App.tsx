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
// `ActualizacionDisponible.module.css`. El aviso de sesión a punto de caducar
// comparte ese mismo marco y por el mismo motivo.
//
// El Error Boundary (T-106) va por fuera de todo: si revienta un proveedor,
// también tiene que salir la C03. Por eso su pantalla no usa ningún contexto.

import { useEffect } from 'react';
import { RouterProvider } from 'react-router';

// Rutas directas y no el barril, por lo mismo que `AuthProvider` con `auth`:
// ver el comentario de `modules/logging/index.ts`.
import { instalarCapturaGlobal } from '@modules/logging/api/registro';
import { ErrorBoundary } from '@modules/logging/components/ErrorBoundary';

import { ActualizacionDisponible } from './components/ActualizacionDisponible';
import { AvisoSesion } from './components/AvisoSesion';
import { AnnounceProvider } from './providers/AnnounceProvider';
import { AuthProvider } from './providers/AuthProvider';
import { QueryProvider } from './providers/QueryProvider';
import { router } from './router';

import styles from './App.module.css';

export function App() {
  // Errores que ningún Error Boundary ve: manejadores de eventos, promesas
  // sin `catch` y temporizadores (DOC 06 §10.1, capa 3).
  useEffect(() => instalarCapturaGlobal(), []);

  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <AnnounceProvider>
            <div className={styles.marco}>
              <ActualizacionDisponible />
              <AvisoSesion />
              <div className={styles.ruta}>
                <RouterProvider router={router} />
              </div>
            </div>
          </AnnounceProvider>
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}
