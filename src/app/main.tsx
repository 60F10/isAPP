// Punto de entrada de la aplicación (DOC 06 §3.1).

// Las hojas globales van primero a propósito: el orden de importación es el
// orden del CSS en el paquete, y las variables tienen que estar declaradas
// antes de que las use el primer .module.css (DOC 07 §1).
import '../styles/tokens.css';
import '../styles/base.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Ruta directa y no el barril `@modules/logging`: el barril arrastra el
// registro, y el registro arrastra el cliente de Supabase y `env.ts`, que es
// justo lo que puede reventar al arrancar. Esta vista no importa nada de eso.
import { PantallaError } from '@modules/logging/components/PantallaError';
import { ErrorDeEntorno } from '@shared/lib/errorDeEntorno';
import { aplicarPreferencias, leerPreferencias } from '@shared/lib/preferencias';

// Alto contraste y movimiento reducido (T-107), antes de pintar nada: quien
// abre con el móvil ya al sol no puede ver un destello de la paleta normal.
// Van en `localStorage`, así que se leen sin esperar a la red.
aplicarPreferencias(leerPreferencias());

// POR QUÉ `App` SE CARGA CON `import()` Y NO ARRIBA CON LOS DEMÁS (T-106).
//
// `env.ts` lanza al importarse si falta configuración (D06-21), y lo importa
// el cliente de Supabase, que importa `AuthProvider`, que importa `App`. Con
// una importación estática, ese error aborta la carga del módulo entero antes
// de ejecutar una sola línea de este archivo: pantalla en blanco y el mensaje
// solo en la consola. Con `import()`, el error llega aquí como una promesa
// rechazada y se puede pintar.
//
// Lo mismo cubre un trozo que no baja en la primera visita sin cobertura.
//
// Cuesta un viaje de red más en la primera carga, la de antes de que el
// service worker lo tenga todo en la precaché. A partir de ahí sale de caché.

const contenedor = document.getElementById('root');

if (!contenedor) {
  throw new Error('No se encontró el elemento #root en index.html.');
}

const raiz = createRoot(contenedor);

import('./App')
  .then(({ App }) => {
    raiz.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((error: unknown) => {
    // Sin sesión ni cliente no hay `error_logs` que valga: la consola es lo
    // único que queda.
    console.error(error);

    raiz.render(
      <StrictMode>
        {error instanceof ErrorDeEntorno ? (
          <PantallaError titulo="Falta configuración" detalle={error.message}>
            <p>La aplicación está mal configurada en este despliegue y no puede arrancar.</p>
            <p>Avisa a quien lleve la aplicación. Recargar no lo arregla.</p>
          </PantallaError>
        ) : (
          <PantallaError titulo="No se pudo arrancar">
            <p>La aplicación no ha terminado de cargar.</p>
            <p>Si estabas sin cobertura, busca señal y recarga.</p>
          </PantallaError>
        )}
      </StrictMode>,
    );
  });
