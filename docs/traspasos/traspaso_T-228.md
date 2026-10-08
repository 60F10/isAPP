# Traspaso T-228 — Entrenamientos: las sesiones

> **Modelo y esfuerzo:** Opus, medio · **Rama:** `feat/training-sesiones` · **Depende de:** nada · **Sin migración**
> Preparado el 08/10/2026 sobre `main` en `a7f4918` (PR #93). Si `src/modules/training/` ya existe, otra sesión la tiene o la tuvo: para y dilo.

## Qué falta

Isaac quiere llevar los entrenamientos en la aplicación y hoy no hay nada: el módulo `training` no existe y sus dos rutas pintan `PantallaPendiente`. La base sí está: `training_sessions` y `training_attendance`, vacías, desde el esquema inicial. Raúl decidió el 08/10 meterlo ya, antes del resto de lo que quedó fuera del MVP (DOC 08 §7).

Esta es la primera de tres entregas: aquí, las sesiones. Pasar lista es la T-229 y repetir cada semana, la T-230.

## Qué hay que conseguir

1. Quien tiene `training.manage` abre «Entrenamientos» y ve los del equipo activo en la temporada en curso, en dos listas: próximos y pasados.
2. Da de alta un entrenamiento con fecha, hora, lugar y objetivo, lo edita y lo borra.
3. Con un toque en «Entrenamiento de hoy» lo crea para ahora mismo y sale hacia su lista de asistencia.
4. Llega a «Entrenamientos» desde el calendario, y la barra marca «Agenda».

## Reglas de esta sesión

- Lee solo los archivos de las tablas y el §13 del DOC 04. No abras más documentos.
- Si algo no cuadra con este traspaso, para y dilo. No improvises ni amplíes el alcance.
- Ahorra contexto: las búsquedas, al subagente `explorador`; lo repetitivo, al `implementador`. No pegues en el chat lo que ya está en los archivos.
- Haz el ciclo completo: rama, un commit, push, PR con la plantilla, CI en verde y squash merge a `main`. **Nunca toques `release`.**
- En la nube `gh pr create` falla, porque usa GraphQL: la PR se abre con `gh api repos/60F10/isAPP/pulls`.
- **Sin migración ni SQL.** No toques la base ni lances `npm run db:types`: las dos tablas ya están en `src/types/database.types.ts`.
- `training` importa solo de `shared`, `auth` y `core`, y de los otros módulos solo por su barril (DOC 06 §4.2). **No importa de `agenda`.**
- Los `model/` no importan barriles en tiempo de ejecución: solo tipos.
- Cada `update` y cada `delete` pide la fila de vuelta y lanza `SIN_FILAS` si no vuelve ninguna, como `agenda/api/partidos.ts`.
- **Ningún dato personal de menores.** Esta entrega no toca jugadores.
- Accesibilidad al construir: enlaces y botones de 48 px de alto, legible a 320 px sin desplazamiento horizontal, mensajes de estado con `useAnnounce` y el foco en el mensaje tras un fallo.

## La base, comprobada el 08/10

| Punto               | Cómo está                                                                                                                                                   |
| :------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `training_sessions` | `id`, `team_id`, `season_id`, `scheduled_at` (`timestamptz`), `location`, `focus`, `notes`, `created_by`, `created_at`, `updated_at`. Vacía                 |
| Escribir            | La política `training_sessions_write` pide `training.manage` en el equipo, para insertar, cambiar y borrar                                                  |
| Leer                | Hoy, cualquier miembro del equipo. Cuando Raúl aplique la T-227 (DOC 05 §14.10), solo `training.manage`. **La pantalla se comporta igual en los dos casos** |
| Borrar              | Se lleva en cascada las filas de `training_attendance` de esa sesión                                                                                        |
| Quién tiene permiso | Raúl e Isaac. `schedule.manage` no interviene, aunque el DOC 04 lo dijera hasta hoy                                                                         |

## Decidido: rutas y guardia

| Ruta                         | Pantalla                                 | Componente                                           |
| :--------------------------- | :--------------------------------------- | :--------------------------------------------------- |
| `/entrenamientos`            | A15a «Entrenamientos»                    | `EntrenamientosPage`                                 |
| `/entrenamientos/nuevo`      | A15b «Nuevo entrenamiento»               | `NuevoEntrenamientoPage`                             |
| `/entrenamientos/:id/editar` | A15b «Editar entrenamiento»              | `EditarEntrenamientoPage`                            |
| `/entrenamientos/:id/lista`  | A15 «Lista de asistencia», **sin hacer** | Sigue en `PantallaPendiente`, con `tarea="la T-229"` |

Las cuatro cuelgan del bloque `training.manage` de `router.tsx`, que ya existe. Las tres nuevas van perezosas, por el barril de `@modules/training`. **Quita `entrenamientos` del bloque `stats.view`**, donde hoy pinta la B04 pendiente: el historial de asistencia tendrá su ruta en otra tarea.

## Decidido: el modelo

Todo en `src/modules/training/model/entrenamiento.ts`, puro y con sus pruebas.

| Pieza                                        | Qué hace                                                                                                                                                                |
| :------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Entrenamiento`                              | `id`, `teamId`, `seasonId`, `scheduledAt`, `location`, `focus` y `notes`. Los tres últimos, `string \| null`                                                            |
| `LARGO_LUGAR` y `LARGO_OBJETIVO`             | 120 y 200. Son largos de interfaz: el esquema no los limita                                                                                                             |
| `validarEntrenamiento(formulario)`           | Recibe `fecha`, `hora`, `lugar` y `objetivo` como texto. Devuelve los errores por campo y, sin errores, los datos listos para la base. Misma forma que `validarPartido` |
| Qué valida                                   | Fecha y hora obligatorias y reales, con `aInstante`. Lugar y objetivo, opcionales y dentro de su largo; vacíos se guardan como `null`, con `limpiarTexto`               |
| Fechas pasadas                               | **Se admiten.** Un entrenamiento ya hecho se mete después                                                                                                               |
| `separarEntrenamientos(lista, ahora)`        | `proximos`: desde las 00:00 de hoy en la hora del móvil, del más cercano al más lejano. `pasados`: del más reciente al más antiguo. El de hoy es próximo todo el día    |
| `entrenamientoDeHoy(lista, ahora)`           | El primero cuyo día, en la hora del móvil, es hoy. `null` si no hay ninguno                                                                                             |
| `propuestaDeAlta(lista, campoDeCasa, ahora)` | Lo que trae relleno el alta: la fecha de hoy; la hora y el lugar del entrenamiento más reciente; sin ninguno, hora vacía y el campo de casa del club, o vacío           |
| `instanteDeAhora(ahora)`                     | El instante ISO de `ahora` con los segundos a cero. Lo usa «Entrenamiento de hoy»                                                                                       |

## Decidido: fecha y hora, compartidas

`aInstante` y `partesDeInstante` viven hoy en `agenda/model/partido.ts`, y `training` no puede importar de `agenda`. Suben a `src/shared/lib/instante.ts`, con sus expresiones regulares y su función `dos`.

| Punto     | Decisión                                                                                                                                              |
| :-------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| El código | Se mueve tal cual, con sus comentarios. No cambia una línea de lo que hace                                                                            |
| `agenda`  | `partido.ts` las importa de `@shared/lib/instante` y las vuelve a exportar. **Ningún otro archivo de `agenda` cambia**                                |
| Pruebas   | Las de esas dos funciones pasan de `partido.test.ts` a `src/shared/lib/instante.test.ts`. Las demás de `partido.test.ts` siguen en verde sin tocarlas |

## Decidido: datos y hooks

| Archivo                      | Qué lleva                                                                                                                                                                                      |
| :--------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/queryKeys.ts`           | `trainingKeys`: `all`, `lista(equipoId, temporadaId)` y `sesion(id)`                                                                                                                           |
| `api/entrenamientos.ts`      | `fetchEntrenamientos(equipoId, temporadaId)`, `fetchEntrenamiento(id)`, `crearEntrenamiento(destino, datos)`, `actualizarEntrenamiento(id, datos)` y `borrarEntrenamiento(id)`                 |
| Columnas que pide            | `id, team_id, season_id, scheduled_at, location, focus, notes`, y ninguna más                                                                                                                  |
| `crearEntrenamiento`         | `destino` es `{ equipoId, temporadaId, userId }` y rellena `team_id`, `season_id` y `created_by`. `datos` es `{ scheduled_at, location, focus }`. Devuelve el entrenamiento creado             |
| `notes`                      | Se lee y **no se escribe aquí**: es la observación global, de la T-229                                                                                                                         |
| `hooks/useEntrenamientos.ts` | `useEquipoDeTrabajo()`, `useEntrenamientos`, `useEntrenamiento`, `useCrearEntrenamiento`, `useActualizarEntrenamiento` y `useBorrarEntrenamiento`. Las mutaciones invalidan `trainingKeys.all` |
| `useEquipoDeTrabajo()`       | `equipoId`, `clubId` y `temporadaId` del equipo activo, de `useAuth()`. Es el `useEquipoActivo` de `agenda/hooks/usePartidos.ts`, que desde aquí no se puede importar                          |
| El campo de casa             | `useClub(clubId)` de `@modules/core`, y su `homeVenue`                                                                                                                                         |

## Decidido: «Entrenamientos» (A15a)

| Punto                  | Decisión                                                                                                                                                                       |
| :--------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Título                 | `<Pantalla id="A15a" titulo="Entrenamientos">`                                                                                                                                 |
| «Entrenamiento de hoy» | Si `entrenamientoDeHoy` devuelve uno, un enlace «Pasar lista de hoy» a su `/entrenamientos/:id/lista`. Si no, un botón «Entrenamiento de hoy»                                  |
| Qué hace el botón      | Crea uno con `instanteDeAhora`, el lugar de `propuestaDeAlta` y sin objetivo, y navega a `/entrenamientos/:id/lista`. Mientras crea dice «Creando…» y no responde a otro toque |
| Si el botón falla      | El mensaje de `mensajeDeErrorAlGuardar`, anunciado, con el foco en él. No navega                                                                                               |
| «Nuevo entrenamiento»  | Enlace a `/entrenamientos/nuevo`, junto al anterior                                                                                                                            |
| Tarjeta «Próximos»     | Vacía: «No hay entrenamientos programados.»                                                                                                                                    |
| Tarjeta «Pasados»      | Los diez más recientes y, si hay más, un botón «Ver los N anteriores» que enseña el resto. Vacía: «Todavía no hay ninguno esta temporada.»                                     |
| Cada fila              | Día y hora en una línea, con los dos formatos de `ResumenDePartido.tsx`: «jue, 8 oct · 18:00». Debajo, el lugar y el objetivo, si los tiene. Enlaces «Pasar lista» y «Editar»  |
| Nombre de los enlaces  | Cada «Pasar lista» y cada «Editar» lleva el día en su nombre accesible: «Pasar lista: jue, 8 oct · 18:00»                                                                      |
| Estados                | Los de `CalendarioPage`: sin equipo, sin temporada, «Cargando…» y el fallo con «Reintentar»                                                                                    |

## Decidido: alta y edición (A15b)

| Punto            | Decisión                                                                                                                                                                                        |
| :--------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dónde vive       | `routes/EntrenamientoPage.tsx`, con `NuevoEntrenamientoPage` y `EditarEntrenamientoPage` y un formulario común, como `PartidoPage.tsx`                                                          |
| Campos           | «Fecha» (`type="date"`), «Hora» (`type="time"`), «Lugar» y «Objetivo de la sesión». Los dos últimos, opcionales                                                                                 |
| El alta          | Trae relleno lo de `propuestaDeAlta`. Al guardar anuncia «Entrenamiento guardado.» y vuelve a `/entrenamientos`                                                                                 |
| La edición       | Trae lo guardado, con `partesDeInstante`. Al guardar, lo mismo. Si `fetchEntrenamiento` devuelve `null`: «Ese entrenamiento no existe o no puedes verlo.» y un enlace a `/entrenamientos`       |
| Errores de campo | Bajo cada campo, con `Field`. Al fallar la validación, el foco va al primer campo con error                                                                                                     |
| Si falla guardar | El mensaje de `mensajeDeErrorAlGuardar`, anunciado, y el formulario sigue abierto con lo escrito                                                                                                |
| Borrar           | Solo en la edición. «Borrar entrenamiento» pregunta en su sitio: «¿Borrar este entrenamiento? Se borra también su lista de asistencia. No se puede deshacer.», con «Sí, borrar» y «No, dejarlo» |
| Foco al borrar   | Al abrir la pregunta, a la pregunta; con «No, dejarlo», de vuelta a «Borrar entrenamiento». Es el `Borrar` de `PartidoPage.tsx`                                                                 |
| Volver           | Un enlace «Volver a entrenamientos» arriba, en las dos                                                                                                                                          |

## Decidido: cómo se llega

| Punto            | Decisión                                                                                                                                                                                                                        |
| :--------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Calendario       | En `CalendarioPage.tsx`, un enlace «Entrenamientos» a `/entrenamientos` junto a «Nuevo partido», solo con `useHasPermission('training.manage') === true`. Actualiza el comentario de cabecera, que dice que no salen            |
| La barra         | En `app/layouts/destinos.ts`, «Agenda» gana `tambien: ['/entrenamientos']`                                                                                                                                                      |
| Textos de la A07 | En `auth/model/personas.ts`: `schedule.manage` pasa a «Crear y editar partidos» y `training.manage` a «Crear entrenamientos, pasar lista y escribir observaciones». Es lo que dice la base, y el DOC 04 §15.1 ya está corregido |

## Archivos

| Archivo                                                                                                                               | Cambio                                                  |
| :------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------ |
| `src/shared/lib/instante.ts` y su `.test.ts` (nuevos)                                                                                 | `aInstante` y `partesDeInstante`, movidas               |
| `src/modules/agenda/model/partido.ts` y su `.test.ts`                                                                                 | Importa y vuelve a exportar las dos; sus pruebas se van |
| `src/modules/training/index.ts` (nuevo)                                                                                               | Exporta las tres pantallas                              |
| `src/modules/training/model/entrenamiento.ts` y su `.test.ts` (nuevos)                                                                | El modelo                                               |
| `src/modules/training/api/queryKeys.ts`, `api/entrenamientos.ts` y `api/entrenamientos.test.ts` (nuevos)                              | Los datos                                               |
| `src/modules/training/hooks/useEntrenamientos.ts` (nuevo)                                                                             | Los hooks                                               |
| `src/modules/training/routes/EntrenamientosPage.tsx`, `EntrenamientoPage.tsx`, sus `.module.css` y `Entrenamientos.test.tsx` (nuevos) | Las pantallas                                           |
| `src/app/router.tsx`                                                                                                                  | Las tres rutas, y fuera la B04 pendiente                |
| `src/app/layouts/destinos.ts` y su `.test.ts`                                                                                         | `/entrenamientos` marca «Agenda»                        |
| `src/modules/agenda/routes/CalendarioPage.tsx`, su `.module.css` si hace falta y `Agenda.test.tsx`                                    | El enlace                                               |
| `src/modules/auth/model/personas.ts` y las pruebas que citen los dos textos                                                           | Las dos frases                                          |

## Pruebas

Escríbelas primero y comprueba que fallan. Los dobles van en la frontera de `api/` y en `AuthContext`, como en `Agenda.test.tsx`. La prueba de `api/` usa el doble del cliente de `agenda/api/partidos.test.ts`.

| Archivo                   | Caso                                                                                                                                        |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------ |
| `instante.test.ts`        | Las pruebas de `aInstante` y `partesDeInstante`, movidas sin cambiar                                                                        |
| `entrenamiento.test.ts`   | `validarEntrenamiento`: sin fecha, sin hora, un 31 de febrero, las 25:00, un lugar de 121 caracteres; y uno bueno, con lugar vacío a `null` |
| `entrenamiento.test.ts`   | Una fecha de ayer pasa                                                                                                                      |
| `entrenamiento.test.ts`   | `separarEntrenamientos`: el de hoy a las 09:00, con `ahora` a las 20:00, sale en próximos; el de ayer, en pasados; los dos órdenes          |
| `entrenamiento.test.ts`   | `entrenamientoDeHoy`: con dos hoy, el primero; sin ninguno, `null`                                                                          |
| `entrenamiento.test.ts`   | `propuestaDeAlta`: hora y lugar del más reciente; sin ninguno, el campo de casa; sin campo de casa, vacío                                   |
| `entrenamientos.test.ts`  | `crearEntrenamiento` manda `team_id`, `season_id` y `created_by`, y no manda `notes`                                                        |
| `entrenamientos.test.ts`  | `actualizarEntrenamiento` y `borrarEntrenamiento` lanzan `SIN_FILAS` con cero filas de vuelta                                               |
| `Entrenamientos.test.tsx` | La lista enseña próximos y pasados, cada fila con «Pasar lista» y «Editar»                                                                  |
| `Entrenamientos.test.tsx` | Sin ninguno hoy, «Entrenamiento de hoy» crea uno y navega a su lista. Con uno hoy, sale «Pasar lista de hoy» y no el botón                  |
| `Entrenamientos.test.tsx` | Si crear falla, se lee el mensaje y no se navega                                                                                            |
| `Entrenamientos.test.tsx` | Con doce pasados se ven diez, y «Ver los 2 anteriores» enseña el resto                                                                      |
| `Entrenamientos.test.tsx` | El alta sin hora enseña el error bajo el campo y no llama a `crearEntrenamiento`                                                            |
| `Entrenamientos.test.tsx` | La edición trae lo guardado, guarda y vuelve a la lista                                                                                     |
| `Entrenamientos.test.tsx` | Borrar pregunta antes; «No, dejarlo» no borra; «Sí, borrar» borra y vuelve a la lista                                                       |
| `destinos.test.ts`        | `/entrenamientos` y `/entrenamientos/x/lista` marcan «Agenda»                                                                               |
| `Agenda.test.tsx`         | El enlace «Entrenamientos» sale con `training.manage` y no sale sin él                                                                      |

## Pasos

1. Crea la rama desde `main` actualizado.
2. Lee el §13 del DOC 04, `agenda/api/partidos.ts`, `agenda/hooks/usePartidos.ts`, `agenda/routes/CalendarioPage.tsx` y `PartidoPage.tsx`: son el patrón.
3. Mueve `aInstante` y `partesDeInstante` a `shared/lib/instante.ts` y comprueba que las pruebas de `agenda` siguen en verde.
4. Escribe las pruebas nuevas y comprueba que fallan.
5. El modelo, los datos y los hooks.
6. Las dos pantallas y las rutas.
7. El enlace del calendario, el destino de la barra y los dos textos de la A07.
8. Lanza `npm run lint`, `npx prettier --check .`, `npm run test -- --run` y `npm run build`. Sin `INEFFECTIVE_DYNAMIC_IMPORT`. Apunta el inicial comprimido: lo único que entra en el arranque es una cadena en `destinos.ts`.
9. Mira las dos pantallas a 320 px y a 1024 px, y a 320 px con el texto al 200 %.
10. Edita la documentación, commitea, sube y abre la PR.
11. Con el CI en verde, fusiona con squash.

## Documentación: edita, no reescribas

| Documento            | Edición                                                                                                                                                                                                                                                 |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/08_TAREAS.md`  | La fila de la T-228 pasa a ✅. Un párrafo de cuatro líneas en el §5b. Sube la versión un decimal                                                                                                                                                        |
| `docs/13_HANDOFF.md` | **No lo reescribas.** Sección corta encima de la primera «## Sesión», con el tamaño del inicial                                                                                                                                                         |
| `CLAUDE.md`          | Un párrafo «Desde la **T-228**…» tras el de la T-211: el módulo `training`, sus tres rutas con `training.manage`, que no importa de `agenda` y que `aInstante` y `partesDeInstante` viven en `shared/lib/instante.ts`. En «Siguientes tareas», la T-229 |

Deuda que anotar: sin red no se crea ni se edita nada, porque va en línea y no por la cola; `useEquipoDeTrabajo` repite el `useEquipoActivo` de `agenda`; el formato del día está escrito dos veces, aquí y en `ResumenDePartido`; un entrenamiento no tiene duración ni hora de fin, porque la tabla no las tiene; y hasta la T-229, «Pasar lista» lleva a una pantalla pendiente.

## Cierre

- Commit y título de la PR: `feat(training): add training sessions with a quick start for today`
- En «Cómo lo pruebo» de la PR: con la cuenta de Raúl, «Agenda» → «Entrenamientos» → «Nuevo entrenamiento», guardarlo y verlo en «Próximos»; editarlo y borrarlo; y «Entrenamiento de hoy», que crea uno y abre la lista pendiente. Con una cuenta sin `training.manage`, el calendario no enseña el enlace.
- Al terminar, di en cuatro líneas: número de la PR, pruebas en verde, inicial comprimido y si quedó fusionada.

## Fuera de esta tarea

Pasar lista y la observación global (T-229), repetir cada semana (T-230), los entrenamientos dentro del calendario y de Inicio (T-231), el historial de asistencia (T-232), el modo sin conexión, las notificaciones y cualquier cambio en la base.
