// Punto de entrada de la aplicación (DOC 06 §3.1).
//
// Andamiaje: monta el árbol de React y la galería del sistema de diseño. El
// enrutado, los proveedores y las pantallas de verdad llegan en la T-104, que
// es también quien borra `scaffolding/`.

// Las hojas globales van primero a propósito: el orden de importación es el
// orden del CSS en el paquete, y las variables tienen que estar declaradas
// antes de que las use el primer .module.css (DOC 07 §1).
import '../styles/tokens.css';
import '../styles/base.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Importado por su efecto: crea el cliente único de Supabase al arrancar
// (DOC 06 §7.1). Al entrar en el paquete, el peso que mide `vite build` es el
// que tendrá la aplicación de verdad y no uno optimista.
import '@shared/lib/supabase';

import { DesignGallery } from './scaffolding/DesignGallery';

const contenedor = document.getElementById('root');

if (!contenedor) {
  throw new Error('No se encontró el elemento #root en index.html.');
}

createRoot(contenedor).render(
  <StrictMode>
    <DesignGallery />
  </StrictMode>,
);
