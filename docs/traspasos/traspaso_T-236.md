# Traspaso T-236 — Pruebas en navegador contra una base de verdad: el andamio

> **Modelo y esfuerzo:** Opus, alto · **Rama:** `test/platform-pruebas-en-navegador` · **Depende de:** nada · **Sin migración**
> Preparado el 08/10/2026 sobre `main` en `9cc4d44` (PR #98). Si existe la carpeta `e2e/`, otra sesión la tiene o la tuvo: para y dilo.

## Qué falta

Las más de mil pruebas del proyecto sustituyen la base por dobles en la frontera de `api/`. Ninguna comprueba la aplicación contra PostgreSQL, sus políticas y sus disparadores, ni en un navegador de verdad. Todos los cierres del DOC 13 terminan igual: «sin probar contra la base de verdad». Raúl decidió el 08/10 cerrar ese hueco con pruebas en navegador contra una base real.

Esta tarea monta el andamio y deja las primeras pruebas. Los flujos largos son la T-237 y la T-238.

## Qué hay que conseguir

1. En cada pull request y en cada fusión a `main`, GitHub Actions levanta un Supabase local, le aplica las migraciones del repositorio desde cero, compila la aplicación contra él y la recorre con un navegador.
2. Tres personas de prueba —quien lleva el equipo, quien solo anota y quien solo sigue— entran sin pasar por Google.
3. Las primeras pruebas dicen si cada una ve lo que le toca, y si las pantallas principales pasan la comprobación automática de accesibilidad.
4. Queda escrito cómo se añade una prueba nueva.

## Reglas de esta sesión

- **Nunca contra producción.** Ni la URL ni ninguna clave del proyecto real de Supabase aparecen en esta tarea: ni en el código, ni en el flujo de trabajo, ni en los secretos de GitHub. No añadas ningún secreto al repositorio de GitHub.
- **No uses el conector de Supabase** más que para leer documentación. Nada de SQL contra el proyecto real.
- **No toques las migraciones aplicadas.** `supabase/migrations/` es lo aplicado en producción. Si alguna no se repite desde cero en el Supabase local, **eso es un hallazgo, no algo que parchear**: para, e informa «T-236 NO HECHA: la migración X no se repite» con el error literal.
- **No arregles la aplicación.** Si una prueba destapa un fallo, se queda en el informe y en el DOC 13 como punto nuevo, y la prueba se marca con `test.fixme` y el número del punto. El conjunto queda en verde y el fallo, apuntado.
- **Aquí no hay Docker**: el Supabase local no arranca en esta sesión. Las pruebas se desarrollan contra GitHub Actions: sube, mira el resultado con `gh api repos/60F10/isAPP/actions/runs` y los registros del trabajo, corrige y vuelve a subir.
- **Esta tarea sí sube la rama varias veces**: es la excepción a «una sola vez». Como mucho **doce subidas**. Si a la duodécima el flujo no está en verde, no fusiones: deja la PR abierta, informa «T-236 NO HECHA» con el último error y termina.
- **Un solo commit, siempre.** Cada subida enmienda el commit (`git commit --amend`) y va con `git push --force-with-lease`: el CI valida el mensaje de todos los commits de la PR.
- El flujo nuevo va en su archivo, `.github/workflows/e2e.yml`. **`ci.yml` no se toca.**
- Para fusionar tienen que estar en verde los dos: «Lint y build» y el flujo nuevo.
- Los jugadores de prueba son inventados: «Jugador 1», «Jugador 2». Ningún nombre real, de nadie.
- Haz el ciclo completo: rama, PR con la plantilla y squash merge a `main`. **Nunca toques `release`.** `gh pr create` falla: la PR se abre con `gh api repos/60F10/isAPP/pulls`.

## Decidido: las piezas

| Pieza                  | Decisión                                                                                                                                                                                                          |
| :--------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Navegador              | `@playwright/test` y `@axe-core/playwright`, como dependencias de desarrollo. Solo Chromium                                                                                                                       |
| Dónde viven            | Carpeta `e2e/` en la raíz, con su `tsconfig.json`. `playwright.config.ts` en la raíz. Vitest no las ve: su `include` es `src/**`                                                                                  |
| Guion                  | `npm run e2e` lanza `playwright test`                                                                                                                                                                             |
| La base                | Supabase local, con la CLI oficial, **solo dentro de GitHub Actions**: acción `supabase/setup-cli` y `supabase start`. La CLI no entra en `package.json`: engordaría el `npm ci` de Netlify                       |
| `supabase/config.toml` | Nuevo y mínimo: el identificador del proyecto local y la siembra automática apagada (`[db.seed] enabled = false`). `supabase/seed.sql` es la siembra de producción y pide una cuenta de Google que aquí no existe |
| Servicios              | Arranca solo lo que la aplicación usa: base, API, autenticación y Realtime. Excluye el resto con `-x`, para que tarde menos                                                                                       |
| Las claves locales     | La URL, la clave anónima y la de servicio del Supabase local salen de `supabase status -o env`, en el propio flujo. Son las de una base que nace y muere en cada ejecución                                        |
| La aplicación          | `npm run build` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` del Supabase local, y `vite preview`, que arranca Playwright con su `webServer`                                                                |
| Service worker         | Bloqueado en las pruebas (`serviceWorkers: 'block'`): si no, sirve la aplicación desde su caché y esconde lo que se prueba                                                                                        |
| Pantalla               | Un proyecto de Playwright, de móvil: 360 × 740. Las comprobaciones de accesibilidad se repiten a 320 de ancho                                                                                                     |
| Si falla               | El flujo sube el informe de Playwright como artefacto                                                                                                                                                             |

## Decidido: las personas de prueba

| Punto                   | Decisión                                                                                                                                                                                             |
| :---------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quiénes                 | `entrenador@e2e.test`, con los doce permisos; `anotador@e2e.test`, con `match.live.write` y `stats.view`; y `seguidor@e2e.test`, que solo sigue al equipo                                            |
| Cómo nacen              | En la preparación global de Playwright, con `auth.admin.createUser` y la clave de servicio **local**, con el correo ya confirmado. El disparador `handle_new_user` les crea el perfil                |
| Contraseñas             | Aleatorias, generadas en cada ejecución. No se escriben en ningún archivo del repositorio                                                                                                            |
| Cómo entran             | La preparación inicia sesión con `signInWithPassword` desde Node, con un almacén en memoria que captura la clave y el valor que escribe `supabase-js`, y lo guarda como `storageState` de Playwright |
| Por qué así             | La aplicación solo ofrece Google, y Google no se automatiza. **La pantalla de acceso no cambia**: ningún camino nuevo de entrada llega al código de la aplicación                                    |
| Lo que queda sin probar | El botón «Entrar con Google» y la vuelta por `/auth/callback`. Se anota como límite                                                                                                                  |

## Decidido: los datos de prueba

En `e2e/siembra.sql`, que la preparación aplica con `psql` contra la base local, después de crear a las personas.

| Dato        | Qué                                                                                                                        |
| :---------- | :------------------------------------------------------------------------------------------------------------------------- |
| Club        | «Club de pruebas», con su campo de casa                                                                                    |
| Temporada   | Una, en curso, que contenga la fecha de hoy                                                                                |
| Equipos     | «Equipo de pruebas», gestionado y en la lista de equipos (`accepts_requests`), y «Rival de pruebas», de referencia         |
| Plantilla   | Catorce jugadores, «Jugador 1» a «Jugador 14», con dorsal y posición. Uno de ellos, portero                                |
| Competición | «Liga de pruebas», con el reglamento del cadete: copia los valores de `REGLAMENTO_CADETE`, de `rules/model/competicion.ts` |
| Miembros    | El entrenador y el anotador, con sus permisos. El seguidor, en `team_followers`                                            |
| Partidos    | Ninguno: cada prueba crea el suyo                                                                                          |

Toma de `supabase/seed.sql` el orden y la forma de romper el ciclo de permisos: es el mismo problema.

## Decidido: las primeras pruebas

| Archivo                     | Caso                                                                                                                                                                    |
| :-------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/entrada.spec.ts`       | El entrenador abre Inicio y lee el nombre de su equipo. Recorre los cinco destinos de la barra y ninguno acaba en `/403`, salvo los que el DOC 13 ya da por pendientes  |
| `e2e/entrada.spec.ts`       | El anotador abre «Equipo» y no ve la tarjeta «Gestión». Si escribe `/equipos`, acaba en la pantalla de sin permiso                                                      |
| `e2e/entrada.spec.ts`       | El seguidor ve el calendario, y lee que sigue al equipo en «Equipo»                                                                                                     |
| `e2e/entrada.spec.ts`       | Sin sesión, cualquier ruta lleva al acceso                                                                                                                              |
| `e2e/base.spec.ts`          | Con la sesión del anotador y `supabase-js` desde Node, un `select('*')` sobre `players` falla, y pedir `nickname` devuelve los catorce                                  |
| `e2e/base.spec.ts`          | Con la sesión del seguidor, una inserción en `match_events` no entra                                                                                                    |
| `e2e/accesibilidad.spec.ts` | Inicio, Calendario, «Equipo», «Más» y Ajustes, con el entrenador, a 360 y a 320 de ancho: ninguna infracción grave ni crítica de `axe`, y sin desplazamiento horizontal |

**Si `axe` encuentra infracciones en una pantalla que ya existe**, no la arregles aquí. Apunta cada regla en el DOC 13 como punto nuevo y exclúyela **por su identificador y solo en esa pantalla**, con el número del punto al lado. Nunca apagues `axe` entero ni una pantalla entera.

## Decidido: cómo se escribe una prueba nueva

`e2e/README.md`, corto: qué levanta el flujo, quiénes son las tres personas y cómo se elige una, dónde están los datos, cómo se crea un partido desde una prueba, cómo se lee la base desde Node para comprobar lo que guardó la pantalla, y la regla del `test.fixme` con número de punto. La T-237 y la T-238 se escriben leyendo solo ese archivo.

Deja en `e2e/ayudas/` lo que vayan a repetir: elegir persona, cliente de `supabase-js` con la sesión de cada una, cliente de servicio local y la comprobación de `axe`.

## Archivos

| Archivo                                                                  | Cambio                                   |
| :----------------------------------------------------------------------- | :--------------------------------------- |
| `.github/workflows/e2e.yml` (nuevo)                                      | El flujo                                 |
| `supabase/config.toml` (nuevo)                                           | La configuración local                   |
| `playwright.config.ts`, `e2e/tsconfig.json` y `e2e/README.md` (nuevos)   | El andamio                               |
| `e2e/preparacion.ts`, `e2e/siembra.sql` y `e2e/ayudas/*` (nuevos)        | Personas, datos y ayudas                 |
| `e2e/entrada.spec.ts`, `base.spec.ts` y `accesibilidad.spec.ts` (nuevos) | Las primeras pruebas                     |
| `package.json` y `package-lock.json`                                     | Las dos dependencias y el guion `e2e`    |
| `.gitignore` y `.prettierignore`, si hace falta                          | Los informes y los estados de Playwright |

## Pasos

1. Crea la rama desde `main` actualizado.
2. Lee `supabase/seed.sql`, `src/shared/lib/supabase.ts`, `src/shared/lib/env.ts`, `.github/workflows/ci.yml` y `rules/model/competicion.ts`.
3. Escribe el flujo solo hasta `supabase start` y súbelo: lo primero es saber si las nueve migraciones se repiten. Si no, para ahí.
4. La preparación: personas y datos. Sube y comprueba.
5. La compilación contra la base local y la primera prueba de entrada. Sube y comprueba.
6. El resto de las pruebas de la tabla.
7. Lanza `npm run lint`, `npx prettier --check .`, `npm run test -- --run` y `npm run build`: nada de lo que ya había puede cambiar. El paquete inicial no cambia.
8. Escribe `e2e/README.md` y edita la documentación.
9. Abre la PR y, con los dos flujos en verde, fusiona con squash.

## Documentación: edita, no reescribas

| Documento                          | Edición                                                                                                                                                                                        |
| :--------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/06_Arquitectura_Frontend.md` | En el apartado de pruebas, un subapartado: las pruebas en navegador, contra qué base corren y qué no cubren. Sube la versión un decimal                                                        |
| `docs/10_Entornos_y_Despliegue.md` | Un tercer entorno, de pruebas: nace y muere en cada ejecución de GitHub Actions y no comparte nada con producción                                                                              |
| `docs/08_TAREAS.md`                | La fila de la T-236 pasa a ✅. Un párrafo de cuatro líneas en el §6b. Sube la versión un decimal                                                                                               |
| `docs/13_HANDOFF.md`               | **No lo reescribas.** Sección corta encima de la primera «## Sesión»: cuánto tarda el flujo, cuántas pruebas, qué destaparon y los puntos nuevos                                               |
| `CLAUDE.md`                        | Un párrafo «Desde la **T-236**…»: qué es `e2e/`, que corre solo en GitHub Actions contra un Supabase local, que nunca toca producción y la regla del `test.fixme`. Y `npm run e2e` en la tabla |

Deuda que anotar: las pruebas en navegador no se pueden lanzar en una sesión en la nube, porque no hay Docker, así que cada cambio se comprueba subiendo; el acceso con Google queda sin probar; la base de pruebas tiene las migraciones del repositorio y no lo que espera en `supabase/pendientes/`; y solo se prueba Chromium, no Safari.

## Cierre

- Commit y título de la PR: `test(platform): run browser tests against a local database in ci`
- En «Cómo lo pruebo» de la PR: abrir la pestaña «Actions», ver el flujo nuevo en verde en esta PR y descargar su informe.
- Al terminar, di: número de la PR, cuántas subidas hicieron falta, cuánto tarda el flujo, cuántas pruebas pasan, cuántas quedaron en `test.fixme` y por qué, si las migraciones se repiten desde cero, y si quedó fusionada.

## Fuera de esta tarea

El día de partido de principio a fin (T-237), las personas y los entrenamientos (T-238), arreglar lo que las pruebas destapen, Safari y Firefox, las pruebas visuales por captura, y cualquier cosa contra el proyecto real de Supabase.
