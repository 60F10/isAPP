// Árbol de rutas del DOC 02 §3, en el modo datos de react-router.
//
// DIVISIÓN DEL PAQUETE. Cada pantalla de módulo entra con `lazy`, que descarga
// su trozo cuando la ruta se activa y no antes.
//
// LA A12 TAMBIÉN, DESDE LA T-207 (D06-29; decisión de Raúl del
// 26/09). Iba en el paquete inicial para abrir sin red sin haber pasado antes
// por el directo, pero el service worker precachea todos los `.js`, perezosos
// incluidos (`globPatterns` de `vite.config.ts`): tras la primera visita con
// red, el trozo está en el móvil. Y el directo necesita Dexie, que no cabe en
// el arranque (D06-26).
//
// Las rutas que pintan `PantallaPendiente` tampoco van perezosas: es un
// componente compartido y diminuto, y partirlo no ahorra un byte.
//
// Las guardias se agrupan: las rutas que comparten permiso cuelgan de una sola
// `RequirePermission`, en vez de repetirla hoja a hoja.

import { createBrowserRouter } from 'react-router';

import { LoadingState } from '@app/components/LoadingState';
import { NotFoundPage } from '@app/components/NotFoundPage';
import { PantallaPendiente } from '@app/components/PantallaPendiente';
import { RouteErrorPage } from '@app/components/RouteErrorPage';
import { RequireAuth } from '@app/guards/RequireAuth';
import { RequirePermission } from '@app/guards/RequirePermission';
import { AppLayout } from '@app/layouts/AppLayout';
import { BareLayout } from '@app/layouts/BareLayout';
import { FullScreenLayout } from '@app/layouts/FullScreenLayout';

/** Texto de las pantallas que se construyen después del MVP. */
const TRAS_MVP = 'una tarea posterior al MVP';

export const router = createBrowserRouter([
  {
    // C03 del enrutador. Lo que revienta dentro de una ruta lo captura esto
    // antes que el Error Boundary de `App`, así que también registra en
    // `error_logs` (T-106).
    errorElement: <RouteErrorPage />,
    // Qué se pinta mientras se descarga el trozo perezoso de la primera
    // pantalla. Sin esto react-router avisa por consola y no pinta nada: la
    // pantalla se queda en blanco justo el rato que peor va la conexión.
    HydrateFallback: LoadingState,
    children: [
      // ---------------------------------------------------------------------
      // Sin sesión: acceso, sin permiso y dirección desconocida.
      // ---------------------------------------------------------------------
      {
        element: <BareLayout />,
        children: [
          {
            path: '/login',
            lazy: async () => ({ Component: (await import('@modules/auth')).LoginPage }),
          },
          {
            // Vuelta del acceso con Google (T-105). Es una parada técnica, no
            // una pantalla del inventario del DOC 02: canjea el código, mira
            // si hay sesión y se aparta. La dirección tiene que coincidir con
            // `RUTA_VUELTA` de `@modules/auth` y con la lista de direcciones
            // de redirección de Supabase (DOC 10 §4.5).
            path: '/auth/callback',
            lazy: async () => ({ Component: (await import('@modules/auth')).AuthCallbackPage }),
          },
          {
            path: '/403',
            lazy: async () => ({ Component: (await import('@modules/auth')).ForbiddenPage }),
          },
          { path: '*', Component: NotFoundPage },
        ],
      },

      // ---------------------------------------------------------------------
      // Con sesión.
      // ---------------------------------------------------------------------
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              // Inicio. Sin permiso: lo ve todo el que entra. La A02 de `core`
              // con el próximo partido dentro (T-213, D06-34): sale de
              // `agenda`, que es quien conoce el calendario, no de `core`.
              {
                index: true,
                lazy: async () => ({ Component: (await import('@modules/agenda')).InicioPage }),
              },

              // --- team.manage ---------------------------------------------
              {
                element: <RequirePermission permission="team.manage" />,
                children: [
                  {
                    path: 'club',
                    lazy: async () => ({ Component: (await import('@modules/core')).ClubPage }),
                  },
                  {
                    path: 'equipos',
                    lazy: async () => ({ Component: (await import('@modules/core')).EquiposPage }),
                  },
                ],
              },

              // --- roster.manage -------------------------------------------
              {
                element: <RequirePermission permission="roster.manage" />,
                children: [
                  {
                    path: 'equipos/:id/plantilla',
                    lazy: async () => ({
                      Component: (await import('@modules/core')).PlantillaPage,
                    }),
                  },
                  {
                    path: 'jugadores/:id/editar',
                    lazy: async () => ({
                      Component: (await import('@modules/core')).FichaJugadorPage,
                    }),
                  },
                ],
              },

              // --- members.manage ------------------------------------------
              {
                element: <RequirePermission permission="members.manage" />,
                children: [
                  {
                    path: 'equipos/:id/personas',
                    element: (
                      <PantallaPendiente id="A07" titulo="Personas y permisos" tarea="T-301" />
                    ),
                  },
                ],
              },

              // --- competition.manage --------------------------------------
              {
                element: <RequirePermission permission="competition.manage" />,
                children: [
                  {
                    path: 'competiciones',
                    lazy: async () => ({
                      Component: (await import('@modules/rules')).CompeticionesPage,
                    }),
                  },
                  {
                    path: 'competiciones/:id',
                    lazy: async () => ({
                      Component: (await import('@modules/rules')).CompeticionPage,
                    }),
                  },
                ],
              },

              // --- Calendario. Sin permiso: lo consulta cualquiera. ---------
              {
                path: 'calendario',
                lazy: async () => ({ Component: (await import('@modules/agenda')).CalendarioPage }),
              },

              // --- schedule.manage -----------------------------------------
              {
                element: <RequirePermission permission="schedule.manage" />,
                children: [
                  {
                    path: 'partidos/nuevo',
                    lazy: async () => ({
                      Component: (await import('@modules/agenda')).NuevoPartidoPage,
                    }),
                  },
                  {
                    path: 'partidos/:id/editar',
                    lazy: async () => ({
                      Component: (await import('@modules/agenda')).EditarPartidoPage,
                    }),
                  },
                ],
              },

              // --- lineup.manage -------------------------------------------
              {
                element: <RequirePermission permission="lineup.manage" />,
                children: [
                  {
                    path: 'partidos/:id/convocatoria',
                    // La A11 de `lineup` con la precarga del partido encima
                    // (T-206, D06-28). Sale de `match`, no de `lineup`.
                    lazy: async () => ({
                      Component: (await import('@modules/match')).ConvocatoriaConPrecarga,
                    }),
                  },
                ],
              },

              // --- match.close ---------------------------------------------
              {
                element: <RequirePermission permission="match.close" />,
                children: [
                  {
                    path: 'partidos/:id/cierre',
                    lazy: async () => ({
                      Component: (await import('@modules/review')).CierrePartidoPage,
                    }),
                  },
                ],
              },

              // --- match.live.write ----------------------------------------
              {
                element: <RequirePermission permission="match.live.write" />,
                children: [
                  {
                    path: 'mis-aportaciones',
                    lazy: async () => ({
                      Component: (await import('@modules/review')).MisAportacionesPage,
                    }),
                  },
                ],
              },

              // --- training.manage -----------------------------------------
              {
                element: <RequirePermission permission="training.manage" />,
                children: [
                  {
                    path: 'entrenamientos/:id/lista',
                    element: (
                      <PantallaPendiente id="A15" titulo="Lista de asistencia" tarea={TRAS_MVP} />
                    ),
                  },
                ],
              },

              // --- discipline.manage ---------------------------------------
              {
                element: <RequirePermission permission="discipline.manage" />,
                children: [
                  {
                    path: 'disciplina',
                    element: <PantallaPendiente id="A16" titulo="Disciplina" tarea={TRAS_MVP} />,
                  },
                ],
              },

              // --- stats.view. Todo el bloque B, que va después del MVP. ----
              {
                element: <RequirePermission permission="stats.view" />,
                children: [
                  {
                    path: 'partidos/:id/informe',
                    element: (
                      <PantallaPendiente id="B03" titulo="Informe del partido" tarea={TRAS_MVP} />
                    ),
                  },
                  {
                    path: 'entrenamientos',
                    element: (
                      <PantallaPendiente id="B04" titulo="Entrenamientos" tarea={TRAS_MVP} />
                    ),
                  },
                  {
                    path: 'estadisticas',
                    element: <PantallaPendiente id="B01" titulo="Estadísticas" tarea={TRAS_MVP} />,
                  },
                  {
                    path: 'estadisticas/jugador/:id',
                    element: (
                      <PantallaPendiente
                        id="B02"
                        titulo="Estadísticas del jugador"
                        tarea={TRAS_MVP}
                      />
                    ),
                  },
                ],
              },

              // --- Ajustes. Sin permiso: son los del propio usuario. --------
              // Perezosa por ruta directa: `platform` no tiene barril (DOC 06
              // §3.3) y nada más la importa, así que sale en su propio trozo.
              {
                path: 'ajustes',
                lazy: async () => ({
                  Component: (await import('@app/routes/AjustesPage')).AjustesPage,
                }),
              },

              // --- Registro de errores -------------------------------------
              // SIN guardia de permiso A PROPÓSITO: el DOC 05 §4 no define
              // ningún permiso de administración y aquí no se inventa uno. La
              // RLS es quien decide qué filas devuelve. Cuando la T-303 fije
              // el permiso, esta ruta pasa a su grupo.
              {
                path: 'admin/logs',
                element: <PantallaPendiente id="C02" titulo="Registro de errores" tarea="T-303" />,
              },
            ],
          },

          // -------------------------------------------------------------
          // A12, a pantalla completa y fuera del marco de navegación.
          // -------------------------------------------------------------
          {
            element: <FullScreenLayout />,
            children: [
              {
                element: <RequirePermission permission="match.live.write" />,
                children: [
                  {
                    path: 'partidos/:id/directo',
                    lazy: async () => ({
                      Component: (await import('@modules/match')).LiveMatchPage,
                    }),
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);
