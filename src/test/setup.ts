// Preparación común a todas las pruebas (DOC 06 §11, decisión D06-20).
// Lo carga `setupFiles` de vite.config.ts antes de cada archivo de prueba.

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Comparadores de accesibilidad y de DOM sobre el `expect` de Vitest:
// `toBeInTheDocument`, `toHaveAccessibleName`, `toHaveFocus`. La variante
// `/vitest` es la que extiende Vitest; la raíz del paquete extiende Jest y
// aquí no serviría de nada.
import '@testing-library/jest-dom/vitest';

// Sin `globals: true` no hay `afterEach` global al que Testing Library pueda
// engancharse sola, así que la limpieza del DOM se registra a mano. Va aquí y
// no en cada prueba de componente porque olvidarla no rompe de golpe: deja el
// árbol anterior montado y el fallo aparece tres pruebas después, en otra.
afterEach(() => {
  cleanup();
});
