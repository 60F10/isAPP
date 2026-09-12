import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Alias de importación del DOC 06 §4.3. Este mapa y el de `paths` en
// tsconfig.app.json son el mismo: si se toca uno, se toca el otro. TypeScript
// resuelve con el tsconfig y Vite con esto, y una desviación entre los dos
// compila pero no arranca.
const rutaDe = (ruta: string): string => fileURLToPath(new URL(ruta, import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@app': rutaDe('./src/app'),
      '@modules': rutaDe('./src/modules'),
      '@shared': rutaDe('./src/shared'),
      '@app-types': rutaDe('./src/types'),
    },
  },
});
