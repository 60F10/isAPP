# Traspaso T-304 — «Equipo» abre tu equipo y «Más» es un índice

> **Modelo y esfuerzo:** Sonnet, medio · **Rama:** `feat/platform-destinos-de-la-barra` · **Depende de:** T-301c fusionada · **Sin migración**
> Preparado el 07/10/2026 sobre `main` con la PR #86. Si `src/modules/auth/routes/UnirsePage.tsx` no existe, la T-301c no está: para y dilo.

## Qué falta

La barra tiene cinco destinos y dos llevan a un sitio que no encaja. «Equipo» abre la lista de equipos del club, que pide `team.manage`: un anotador o un seguidor que la pulse cae en `/403`. «Más» abre Ajustes, y «Mis aportaciones» solo se alcanza desde Inicio. Es el punto 1 del DOC 13, que Raúl decidió el 07/10.

## Qué hay que conseguir

1. «Equipo» abre **tu equipo**, el activo: su nombre, su categoría y la plantilla en solo lectura. La ve cualquiera que pertenezca al equipo o lo siga. Quien tiene permisos encuentra ahí la gestión.
2. «Más» abre un índice con «Mis aportaciones», «Ajustes» y «Registro de errores».
3. La barra marca el destino bueno también en las pantallas de dentro: la plantilla sigue marcando «Equipo» y Ajustes sigue marcando «Más».

## Reglas de esta sesión

- Lee solo los archivos de las tablas y el §3 del DOC 02. No abras más documentos.
- Si algo no cuadra con este traspaso, para y dilo. No improvises ni amplíes el alcance.
- Ahorra contexto: las búsquedas, al subagente `explorador`; lo repetitivo, al `implementador`. No pegues en el chat lo que ya está en los archivos.
- Raúl lanza esta sesión: haz el ciclo completo. Rama, un commit, push, PR con la plantilla, CI en verde y squash merge a `main`. Si el entorno no te deja fusionar, no busques otro camino: deja la PR con el CI en verde y dilo. **Nunca toques `release`.**
- En la nube `gh pr create` falla, porque usa GraphQL: la PR se abre con `gh api repos/60F10/isAPP/pulls`.
- **Sin migración ni SQL.** La base ya deja leer lo que hace falta: `squad_memberships` se lee con `can_read_team`, y `players`, siendo del club o siguiendo al equipo. Comprobado el 07/10.
- **No cambies ninguna guardia ni ninguna ruta que ya exista.** `/equipos`, `/club`, `/equipos/:id/plantilla` y `/ajustes` se quedan donde están y con su permiso.
- De los jugadores, solo apodo, dorsal y posición. **La consulta nueva no pide `availability`**: lo que no se enseña no se descarga.
- `app/` importa de `auth` por ruta directa, no por el barril. `useHasPermission` devuelve `undefined` mientras carga: un enlace solo sale con `true`.
- Accesibilidad al construir: enlaces de 48 px de alto en las dos pantallas, legible a 320 px sin desplazamiento horizontal, y el destino actual con `aria-current="page"` además del color.

## Decidido: «Mi equipo»

| Punto               | Decisión                                                                                                                                                                                                                                                    |
| :------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ruta y guardia      | `/equipo`, dentro de `AppLayout`, solo con sesión y **sin guardia de permiso**. Perezosa, por el barril de `core`                                                                                                                                           |
| Dónde vive          | `src/modules/core/routes/MiEquipoPage.tsx`                                                                                                                                                                                                                  |
| De dónde sale       | El equipo, de `useAuth()`: la membresía cuyo equipo es `activeTeamId`. El `h1` es su `team.name` y debajo va `team.category`, si la tiene. Ninguna consulta para esto                                                                                       |
| Sin equipo activo   | «Todavía no tienes equipo.» y un enlace «Unirse a un equipo» a `/unirse`                                                                                                                                                                                    |
| Tarjeta «Plantilla» | Una tabla de verdad, con `caption`, y `th` con `scope` para «Dorsal», «Apodo» y «Posición». Ordenada como la A05. La posición, en palabras, con `POSICIONES`. Sin dorsal o sin posición, una raya                                                           |
| Estados             | Cargando, el de siempre. Sin temporada en curso (`activeSeasonId` nulo): «No hay temporada en curso.» Vacía: «Todavía no hay jugadores en la plantilla.» Si falla: el mensaje y «Reintentar»                                                                |
| Tarjeta «Gestión»   | Solo sale si hay algún enlace que enseñar. «Editar la plantilla» a `/equipos/:id/plantilla` con `roster.manage`; «Personas y permisos» a `/equipos/:id/personas` con `members.manage`; «Club» a `/club` y «Equipos del club» a `/equipos` con `team.manage` |
| El seguidor         | Si la membresía es de seguidor (`seguidor: true`, de la T-301c), una línea bajo la categoría: «Sigues a este equipo: puedes verlo, no cambiarlo.»                                                                                                           |

## Decidido: «Más»

| Punto          | Decisión                                                                                                                                                                                                    |
| :------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ruta y guardia | `/mas`, dentro de `AppLayout`, solo con sesión y sin guardia de permiso. Perezosa por ruta directa, como Ajustes                                                                                            |
| Dónde vive     | `src/app/routes/MasPage.tsx`                                                                                                                                                                                |
| Qué enseña     | Una lista de enlaces: «Mis aportaciones» a `/mis-aportaciones`, solo con `match.live.write`; «Ajustes» a `/ajustes`, siempre; y «Registro de errores» a `/admin/logs`, solo con `profile.is_platform_admin` |
| Ajustes        | No se toca. Su enlace al registro de errores se queda                                                                                                                                                       |

## Decidido: la barra

| Punto             | Decisión                                                                                                                                                                                                              |
| :---------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Los destinos      | «Equipo» pasa a `/equipo` y «Más» a `/mas`. Los otros tres, igual. Ni textos ni iconos cambian                                                                                                                        |
| Dónde viven       | `DESTINOS` sale de `AppLayout.tsx` a `src/app/layouts/destinos.ts`, con un campo nuevo, `tambien`: los prefijos de ruta que también marcan ese destino                                                                |
| Qué marca a quién | «Equipo»: `/equipo`, `/equipos`, `/club` y `/jugadores`. «Más»: `/mas`, `/ajustes`, `/mis-aportaciones` y `/admin`. Los demás, su propia ruta                                                                         |
| La regla          | `esDestinoActual(destino, ruta)`, pura, en `destinos.ts`: la ruta es el prefijo exacto o sigue con `/`. Con `end`, solo la ruta exacta. `/equipos` no marca por parecerse a `/equipo`: marca porque está en `tambien` |
| Cómo se pinta     | El `<nav>` sale de `AppLayout.tsx` a `src/app/components/BarraDeDestinos.tsx`. Usa `Link` y `useLocation()`, y pone `aria-current="page"` y la clase `activo` con `esDestinoActual`. `AppLayout` solo la monta        |
| Enlaces sueltos   | En `HomePage.tsx`, «Ver el equipo» pasa a `/equipo`. En `PlantillaPage.tsx`, el enlace de volver pasa a `/equipo`; ajusta su texto si nombra «Equipos». El de `PartidoPage.tsx` a `/equipos` se queda                 |

## Archivos

| Archivo                                                                                     | Cambio                                                                                                                     |
| :------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------- |
| `src/app/layouts/destinos.ts` y su `.test.ts` (nuevos)                                      | `DESTINOS` y `esDestinoActual`                                                                                             |
| `src/app/components/BarraDeDestinos.tsx` y su prueba (nuevos)                               | El `<nav>` de la barra. Los estilos se quedan en `AppLayout.module.css` o se van con él: lo que menos toque                |
| `src/app/layouts/AppLayout.tsx`                                                             | Monta `BarraDeDestinos`                                                                                                    |
| `src/modules/core/api/plantilla.ts` y `hooks/usePlantilla.ts`                               | `fetchPlantillaDeLectura` y `usePlantillaDeLectura`: `player_id`, `shirt_number`, `default_position` y `players(nickname)` |
| `src/modules/core/model/plantilla.ts` y su `.test.ts`                                       | El tipo de la fila de lectura. Si `ordenarPlantilla` no lo admite, saca la comparación a una función común                 |
| `src/modules/core/routes/MiEquipoPage.tsx`, su `.module.css` y `MiEquipo.test.tsx` (nuevos) | La pantalla                                                                                                                |
| `src/modules/core/index.ts`                                                                 | Exporta `MiEquipoPage`                                                                                                     |
| `src/app/routes/MasPage.tsx`, su `.module.css` y su prueba (nuevos)                         | La pantalla                                                                                                                |
| `src/app/router.tsx`                                                                        | Las dos rutas, junto a Inicio y Ajustes, fuera de toda guardia de permiso                                                  |
| `src/modules/core/routes/HomePage.tsx` y `PlantillaPage.tsx`                                | Los dos enlaces                                                                                                            |

## Pruebas

Escríbelas primero y comprueba que fallan. Los dobles van en la frontera de `api/` y en `useAuth()`.

| Archivo             | Caso                                                                                                                      |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------ |
| `destinos.test.ts`  | `/` marca solo «Inicio»; `/calendario` no marca «Inicio»                                                                  |
| `destinos.test.ts`  | `/equipo`, `/equipos`, `/equipos/x/plantilla`, `/club` y `/jugadores/x/editar` marcan «Equipo»; `/equipaje`, no           |
| `destinos.test.ts`  | `/mas`, `/ajustes`, `/mis-aportaciones` y `/admin/logs` marcan «Más»; `/mascota`, no                                      |
| `BarraDeDestinos`   | En `/equipos/x/plantilla`, «Equipo» lleva `aria-current="page"` y es el único                                             |
| `BarraDeDestinos`   | «Equipo» enlaza a `/equipo` y «Más» a `/mas`                                                                              |
| `MiEquipo.test.tsx` | Enseña el nombre del equipo activo y la tabla con dorsal, apodo y posición en palabras                                    |
| `MiEquipo.test.tsx` | Sin ningún permiso no sale «Gestión»; con `roster.manage` sale «Editar la plantilla» y no «Personas y permisos»           |
| `MiEquipo.test.tsx` | Sin equipo activo: el texto y el enlace a `/unirse`                                                                       |
| `MiEquipo.test.tsx` | La consulta de lectura no nombra `availability`                                                                           |
| `MasPage`           | «Ajustes» sale siempre; «Mis aportaciones», solo con `match.live.write`; «Registro de errores», solo siendo administrador |

## Pasos

1. Crea la rama desde `main` actualizado.
2. Lee el §3 del DOC 02.
3. Escribe las pruebas y comprueba que fallan.
4. `destinos.ts`, `BarraDeDestinos` y `AppLayout`.
5. «Mi equipo», con su consulta de lectura.
6. «Más» y los dos enlaces sueltos.
7. Lanza `npm run lint`, `npx prettier --check .`, `npm run test -- --run` y `npm run build`. Sin `INEFFECTIVE_DYNAMIC_IMPORT`. Apunta el inicial comprimido: la barra va en el arranque y no puede subir más de medio kB.
8. Mira las dos pantallas y la barra a 320 px y a 1024 px, y a 320 px con el texto al 200 %.
9. Edita la documentación, commitea, sube y abre la PR.
10. Con el CI en verde, fusiona con squash.

## Documentación: edita, no reescribas

| Documento                                       | Edición                                                                                                                                                                                               |
| :---------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/02_Pantallas_Navegacion_Accesibilidad.md` | Dos filas nuevas en el inventario: «Mi equipo», `/equipo`, todos, MVP; y «Más», `/mas`, todos, MVP. En el §3 y el §3.1, a dónde lleva cada destino. Sube la versión un decimal                        |
| `docs/08_TAREAS.md`                             | La fila de la T-304 pasa a ✅. Un párrafo de cuatro líneas. Sube la versión un decimal                                                                                                                |
| `docs/13_HANDOFF.md`                            | **No lo reescribas.** Sección corta encima de la primera «## Sesión», con el tamaño del inicial. En el punto 1, una línea: cerrado                                                                    |
| `CLAUDE.md`                                     | En «Navegación», una frase: «Equipo» abre el equipo activo en `/equipo` y «Más» un índice en `/mas`, y qué destino se marca lo dice `app/layouts/destinos.ts`. En «Siguientes tareas», queda la T-302 |

Deuda que anotar: «Datos» sigue pidiendo `stats.view` y manda a `/403` a un seguidor; con varios equipos no hay dónde elegir el activo; `/club` y `/equipos` marcan «Equipo» aunque no se llegue a ellos desde la barra; y la disponibilidad de cada jugador se puede seguir leyendo por la API con solo seguir al equipo, aunque esta pantalla no la pida.

## Cierre

- Commit y título de la PR: `feat(platform): give the team and more tabs screens anyone can open`
- En «Cómo lo pruebo» de la PR: con la cuenta de Raúl, «Equipo» enseña el Cadete A con su plantilla y la tarjeta «Gestión»; con una cuenta que solo anota, la misma pantalla sin «Gestión» y ningún `/403` al recorrer la barra, salvo «Datos» sin `stats.view`.
- Al terminar, di en cuatro líneas: número de la PR, pruebas en verde, inicial comprimido y si quedó fusionada.

## Fuera de esta tarea

Elegir el equipo activo, la pestaña «Datos», los iconos de la barra (DOC 13, punto 2), el escudo, cambiar guardias o rutas que ya existen, tocar Ajustes y cualquier cambio en la base.
