// Punto de entrada de la aplicación (DOC 06 §3.1).
//
// Andamiaje de la T-101: monta el árbol de React y nada más. El enrutado llega
// en la T-104 y los componentes base en la T-103, así que aquí no hay ni
// proveedores ni rutas todavía.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { env } from '@shared/lib/env';

// Importado por su efecto: crea el cliente único de Supabase al arrancar
// (DOC 06 §7.1). Al entrar en el paquete, el peso que mide `vite build` es el
// que tendrá la aplicación de verdad y no uno optimista.
import '@shared/lib/supabase';

const contenedor = document.getElementById('root');

if (!contenedor) {
  throw new Error('No se encontró el elemento #root en index.html.');
}

createRoot(contenedor).render(
  <StrictMode>
    <main>
      <h1>GavetaStats</h1>
      <p>Andamiaje de la Fase 1. Entorno: {env.APP_ENV}.</p>
    </main>
  </StrictMode>,
);
