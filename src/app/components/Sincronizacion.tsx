// Arranque de la cola de salida y banda C04 (T-206, DOC 06 §8.5).
//
// `@modules/sync` arrastra Dexie, unos 31 kB comprimidos que no caben en el
// paquete inicial (DOC 06 §10.3). Por eso se carga con `import()` en cuanto
// hay sesión, y no con `lazy`: si el trozo no baja —primera visita sin red—,
// `lazy` lanzaría y el Error Boundary pintaría la C03 entera por una banda.
// Así, si no baja, la banda no sale, el fallo se registra y la aplicación
// sigue. Desde la segunda visita lo sirve la precaché del service worker.
//
// Sin sesión no hay nada que enviar: la cola solo manda lo de quien la abrió.

import { useEffect, useState } from 'react';

// Rutas directas y no los barriles, por lo mismo que en `AvisoSesion`.
import { useAuth } from '@modules/auth/hooks/authContext';
import { registrarError } from '@modules/logging/api/registro';

type ModuloSync = typeof import('@modules/sync');

export function Sincronizacion() {
  const { session } = useAuth();
  const userId = session === null ? null : session.user.id;
  const [modulo, setModulo] = useState<ModuloSync | null>(null);

  useEffect(() => {
    if (userId === null) {
      return;
    }

    let cancelado = false;
    let parar: (() => void) | null = null;

    import('@modules/sync')
      .then((cargado) => {
        if (cancelado) {
          return;
        }

        setModulo(cargado);
        parar = cargado.arrancarSincronizacion();
      })
      .catch((error: unknown) => {
        void registrarError(error, 'promesa');
      });

    return () => {
      cancelado = true;

      if (parar !== null) {
        parar();
      }
    };
  }, [userId]);

  if (userId === null || modulo === null) {
    return null;
  }

  const { BandaDeSincronizacion } = modulo;

  return <BandaDeSincronizacion userId={userId} />;
}
