// Composición de la aplicación (DOC 06 §3.1).
//
// De fuera adentro: caché de servidor, sesión, región viva y enrutador. El
// orden no es decorativo. `AuthProvider` consultará el perfil con react-query
// en la T-105, así que va por dentro del suyo; y la región viva envuelve al
// enrutador porque cualquier pantalla tiene que poder anunciar.

import { RouterProvider } from 'react-router';

import { AnnounceProvider } from './providers/AnnounceProvider';
import { AuthProvider } from './providers/AuthProvider';
import { QueryProvider } from './providers/QueryProvider';
import { router } from './router';

export function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <AnnounceProvider>
          <RouterProvider router={router} />
        </AnnounceProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
