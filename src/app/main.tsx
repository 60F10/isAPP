// Punto de entrada de la aplicación (DOC 06 §3.1).

// Las hojas globales van primero a propósito: el orden de importación es el
// orden del CSS en el paquete, y las variables tienen que estar declaradas
// antes de que las use el primer .module.css (DOC 07 §1).
import '../styles/tokens.css';
import '../styles/base.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Ya no hace falta importar `@shared/lib/supabase` por su efecto. Lo hacía el
// andamiaje para que el peso medido fuese el de verdad; ahora `AuthProvider`
// lo importa porque necesita leer la sesión, así que el cliente único se crea
// al arrancar igual que antes y el paquete inicial lo lleva de todos modos.
import { App } from './App';

const contenedor = document.getElementById('root');

if (!contenedor) {
  throw new Error('No se encontró el elemento #root en index.html.');
}

createRoot(contenedor).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
