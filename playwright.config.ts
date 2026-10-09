// Pruebas en navegador (T-236, DOC 06 §11, D06-43). Cómo se escribe una: e2e/README.md.
//
// Corren en GitHub Actions (`.github/workflows/e2e.yml`), contra un Supabase
// LOCAL que nace y muere en cada ejecución. Nunca contra producción.
//
// La aplicación que se prueba es la compilada: el flujo lanza `npm run build`
// con la URL y la clave anónima de la base local, y aquí `vite preview` la
// sirve. Vitest no ve estas pruebas: su `include` es `src/**`.

import { defineConfig } from '@playwright/test';

import { URL_DE_LA_APLICACION } from './e2e/ayudas/entorno';

const { port: PUERTO } = new URL(URL_DE_LA_APLICACION);

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.resultados',
  globalSetup: './e2e/preparacion.ts',

  // Todas las pruebas comparten una base: de una en una, para que el partido
  // que crea una no salga en el Inicio de otra.
  fullyParallel: false,
  workers: 1,
  // Sin reintentos: una prueba que pasa a la segunda esconde un fallo.
  retries: 0,
  forbidOnly: process.env.CI !== undefined,
  timeout: 30_000,
  expect: { timeout: 10_000 },

  reporter: [['list'], ['html', { outputFolder: './e2e/.informe', open: 'never' }]],

  use: {
    baseURL: URL_DE_LA_APLICACION,
    // Si no, el service worker sirve la aplicación desde su caché y esconde
    // lo que se prueba.
    serviceWorkers: 'block',
    // La API local va por HTTPS con el certificado autofirmado de la CLI.
    ignoreHTTPSErrors: true,
    locale: 'es-ES',
    timezoneId: 'Atlantic/Canary',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  // Un solo proyecto: Chromium, a tamaño de móvil. Las comprobaciones de
  // accesibilidad se repiten a 320 de ancho dentro de su prueba.
  projects: [
    {
      name: 'movil',
      use: {
        browserName: 'chromium',
        viewport: { width: 360, height: 740 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],

  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${PUERTO} --strictPort`,
    url: URL_DE_LA_APLICACION,
    reuseExistingServer: process.env.CI === undefined,
    timeout: 60_000,
  },
});
