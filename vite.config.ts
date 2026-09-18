import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Alias de importación del DOC 06 §4.3. Este mapa y el de `paths` en
// tsconfig.app.json son el mismo: si se toca uno, se toca el otro. TypeScript
// resuelve con el tsconfig y Vite con esto, y una desviación entre los dos
// compila pero no arranca.
const rutaDe = (ruta: string): string => fileURLToPath(new URL(ruta, import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Decisión D06-14. La versión nueva NO se instala sola: se avisa y
      // decide quien está delante del móvil. Con 'autoUpdate', el service
      // worker se releva y recarga la pestaña en cuanto detecta un despliegue.
      // Eso, en la pantalla de partido en directo y en el minuto 63, es perder
      // la vista del campo y puede que un evento sin registrar por haber
      // publicado una corrección de otra pantalla. Es justo el fallo que este
      // proyecto no se puede permitir.
      registerType: 'prompt',

      // Sin `includeAssets`: todo lo de public/ se copia a dist/ y `globPatterns`
      // ya caza ahí los .svg y los .png. Declararlo además duplicaba cinco
      // entradas en el manifiesto de precaché —Workbox las deduplica, pero la
      // lista mentía sobre lo que hay— y obligaba a mantener a mano una lista
      // que el patrón resuelve sola.

      manifest: {
        name: 'GavetaStats',
        short_name: 'GavetaStats',
        description:
          'Gestión y estadísticas de fútbol base: partido en directo, plantilla y calendario.',
        lang: 'es',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#3f45b8',
        categories: ['sports'],

        // AQUÍ NO VA `orientation`, Y NO ES UN OLVIDO. El criterio 1.3.4
        // (DOC 02 §5.1) prohíbe bloquear la orientación: en la grada el móvil
        // se sujeta como se puede, y hay quien lo lleva fijo al reposabrazos
        // de una silla de ruedas. Quien venga detrás que no la añada.
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      workbox: {
        // El `woff2` es lo que mete Inter en la precaché. Sin él, la primera
        // carga sin red se pinta con la tipografía del sistema.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Cualquier ruta abre sin red: el enrutador ya viaja en el paquete.
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,

        // NO HAY `runtimeCaching`, Y ES DELIBERADO. Decisión D06-09: el
        // service worker no cachea jamás una respuesta de la API. Los datos
        // llegan con la sesión y la RLS del usuario detrás, y la caché del
        // navegador es de origen, no de sesión: guardarlos ahí significa
        // servirle a un usuario lo que se descargó con la sesión de otro en
        // el mismo dispositivo —el móvil del segundo entrenador, sin ir más
        // lejos—. Los datos que hagan falta sin red van a IndexedDB, con su
        // propio borrado al cerrar sesión, y eso es la T-206.
      },

      // Sin service worker en `npm run dev`: ensucia la depuración con una
      // capa de caché por el medio y no aporta nada hasta que haya algo que
      // probar. Para probarlo de verdad está `npm run build && npm run
      // preview`, que es lo que sirve el service worker real.
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@app': rutaDe('./src/app'),
      '@modules': rutaDe('./src/modules'),
      '@shared': rutaDe('./src/shared'),
      '@app-types': rutaDe('./src/types'),
    },
  },
});
