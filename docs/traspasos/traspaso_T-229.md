# Traspaso T-229 — Entrenamientos: pasar lista

> **Modelo y esfuerzo:** Opus, medio · **Rama:** `feat/training-pasar-lista` · **Depende de:** T-228 fusionada · **Sin migración**
> Preparado el 08/10/2026. Si `src/modules/training/api/entrenamientos.ts` no existe, la T-228 no está: para y dilo.

## Qué falta

La T-228 deja crear entrenamientos, y su enlace «Pasar lista» lleva a una pantalla pendiente. Falta lo que Isaac pidió: marcar quién vino, quién faltó y quién llegó tarde, y apuntar una observación por jugador y otra del entrenamiento (DOC 04 §13, T-02 y T-03).

## Qué hay que conseguir

1. Quien tiene `training.manage` abre la lista de un entrenamiento y marca a cada jugador de la plantilla: presente, ausente o retraso.
2. Elige en la propia pantalla de qué parte una lista nueva: todos presentes o todos sin marcar. El móvil recuerda lo elegido.
3. Escribe una observación por jugador y una del entrenamiento.
4. Guarda con un botón. Si se bloquea la pantalla, se recarga o falla el guardado, lo marcado sigue ahí.

## Reglas de esta sesión

- Lee solo los archivos de las tablas y el §13 del DOC 04. No abras más documentos.
- Si algo no cuadra con este traspaso, para y dilo. No improvises ni amplíes el alcance.
- Ahorra contexto: las búsquedas, al subagente `explorador`; lo repetitivo, al `implementador`. No pegues en el chat lo que ya está en los archivos.
- Haz el ciclo completo: rama, un commit, push, PR con la plantilla, CI en verde y squash merge a `main`. **Nunca toques `release`.**
- En la nube `gh pr create` falla, porque usa GraphQL: la PR se abre con `gh api repos/60F10/isAPP/pulls`.
- **Sin migración ni SQL.** No toques la base ni lances `npm run db:types`.
- `training` importa solo de `shared`, `auth` y `core`, y de `core` solo por su barril. Los `model/` no importan barriles en tiempo de ejecución.
- **De los jugadores, solo apodo y dorsal.** De `players` se pide `nickname` y nada más: un `select('*')` falla desde la T-301a.
- **Las observaciones nunca recogen salud** (T-05). La pantalla lo dice, con estas palabras: «No apuntes lesiones ni datos de salud.»
- El estado de cada jugador se lee en texto, no solo en color (1.4.1). Objetivos táctiles de 48 px: la lista se pasa de pie, en el campo.
- Va en línea, no por la cola de `sync`. No importes `db.ts` ni `@modules/sync`.

## La base, comprobada el 08/10

| Punto                 | Cómo está                                                                                                                                              |
| :-------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `training_attendance` | `id`, `session_id`, `player_id`, `status` (`present`, `absent`, `late`), `notes`, `created_by`, `created_at`, `updated_at`. Única por sesión y jugador |
| Por defecto           | `status` nace en `present` si no se manda. **Mándalo siempre**                                                                                         |
| Escribir              | `training_attendance_write` pide `training.manage` en el equipo de la sesión                                                                           |
| Leer                  | Hoy, cualquier miembro. Con la T-227 aplicada, solo `training.manage`. La pantalla se comporta igual                                                   |
| Observación global    | `training_sessions.notes`, que la T-228 lee y no escribe                                                                                               |

## Decidido: los estados

| Estado en pantalla | En la base       | Texto        |
| :----------------- | :--------------- | :----------- |
| Presente           | `present`        | «Presente»   |
| Ausente            | `absent`         | «Ausente»    |
| Retraso            | `late`           | «Retraso»    |
| Sin marcar         | **Ninguna fila** | «Sin marcar» |

Un jugador sin marcar no tiene fila: no cuenta ni como presente ni como ausente. Guardar con jugadores sin marcar **se permite**, y la pantalla dice cuántos quedan.

## Decidido: de qué parte la lista

Raúl lo pidió el 08/10: que lo elija el entrenador en la aplicación.

| Punto               | Decisión                                                                                                                                                                              |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| El control          | Un `GrupoDeOpciones` arriba de la lista, con la leyenda «Una lista nueva empieza con» y dos opciones: «Todos presentes» y «Todos sin marcar»                                          |
| Dónde se guarda     | En el móvil, en `localStorage`, con la clave `sasi.lista-de-partida` y los valores `presentes` y `sin_marcar`. Si no hay nada guardado o no se entiende, `presentes`                  |
| Por qué en el móvil | `profiles` no tiene dónde guardarlo, y esta tarea va sin migración. Es el mismo criterio que la D06-25                                                                                |
| A quién afecta      | Solo a los jugadores sin fila guardada y sin tocar en esta visita. Cambiar el control los vuelve a calcular; lo guardado y lo tocado no se mueven                                     |
| Lectura y escritura | Dos funciones que nunca lanzan, en `model/partida.ts`: `interpretarPartida(crudo)` y la clave. Leer y escribir `localStorage` va envuelto en `try`, como `shared/lib/preferencias.ts` |

## Decidido: el modelo

En `src/modules/training/model/lista.ts`, puro y con sus pruebas.

| Pieza                                                              | Qué hace                                                                                                                                                                                  |
| :----------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EstadoDeAsistencia`                                               | `'present' \| 'absent' \| 'late'`                                                                                                                                                         |
| `Asistencia`                                                       | `playerId`, `nickname`, `status` y `notes`: una fila guardada                                                                                                                             |
| `Cambios`                                                          | Lo tocado en esta visita: `estados` y `observaciones`, los dos por `playerId`, y `global`, que es `string \| undefined`                                                                   |
| `estadoDe(playerId, guardadas, cambios, partida)`                  | Lo tocado gana; si no, lo guardado; si no, `present` con `presentes` y `null` con `sin_marcar`                                                                                            |
| `componerLista(plantilla, guardadas, cambios, partida)`            | Una línea por jugador de la plantilla, en su orden, con dorsal, apodo, estado y observación. Detrás, quien tiene fila guardada y ya no está en la plantilla, con `fueraDePlantilla: true` |
| `recuento(lineas)`                                                 | `presentes`, `ausentes`, `retrasos` y `sinMarcar`                                                                                                                                         |
| `filasAGuardar(lineas)`                                            | Una fila por jugador con estado: `player_id`, `status` y `notes`. La observación vacía va como `null`, con `limpiarTexto`. Los sin marcar no salen                                        |
| `hayCambios(cambios)`                                              | Si hay algo tocado                                                                                                                                                                        |
| `LARGO_OBSERVACION` y `LARGO_GLOBAL`                               | 280 y 500                                                                                                                                                                                 |
| `interpretarBorrador(crudo, userId)` y `claveDeBorrador(sesionId)` | El borrador de `localStorage`. Nunca lanza: lo que no se entiende, o es de otra cuenta, devuelve `null`                                                                                   |

Una observación escrita a un jugador sin marcar **no se guarda sola**: sin estado no hay fila. La pantalla lo avisa bajo el campo: «Márcalo para guardar la observación.»

## Decidido: los datos

En `src/modules/training/api/asistencia.ts`.

| Función                                      | Qué hace                                                                                                                                                                                                                                                                                   |
| :------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fetchAsistencia(sesionId)`                  | `player_id, status, notes, players(nickname)` de la sesión                                                                                                                                                                                                                                 |
| `guardarAsistencia(sesionId, userId, filas)` | **Dos `upsert` repetibles**, como `lineup/api/convocatoria.ts`. El primero crea las filas que faltan con `created_by` y `ignoreDuplicates: true`. El segundo escribe `status` y `notes` de todas, sin `created_by`, con `onConflict: 'session_id,player_id'`, y pide `player_id` de vuelta |
| Si vuelven menos filas                       | `SIN_FILAS`: la base no dejó escribir alguna                                                                                                                                                                                                                                               |
| Con cero filas                               | No llama a la base                                                                                                                                                                                                                                                                         |
| `guardarObservacionGlobal(sesionId, texto)`  | `update` de `notes` en `training_sessions`, con la fila de vuelta y `SIN_FILAS`. Va en `api/entrenamientos.ts`                                                                                                                                                                             |
| `hooks/useAsistencia.ts`                     | `useAsistencia(sesionId)` y `useGuardarLista(sesionId)`: guarda la asistencia y, si cambió, la observación global, en ese orden. Invalida `trainingKeys.all`                                                                                                                               |
| Clave nueva                                  | `trainingKeys.asistencia(sesionId)`                                                                                                                                                                                                                                                        |

La plantilla sale de `usePlantillaDeLectura(equipoId, temporadaId)` de `core`, que ya existe y no sale por el barril: **añádela a `core/index.ts`**, con el tipo `LecturaDePlantilla`. Trae apodo, dorsal y posición, ya ordenada, y solo a quien sigue en la plantilla.

## Decidido: «Lista de asistencia» (A15)

| Punto                   | Decisión                                                                                                                                                                                               |
| :---------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dónde vive              | `routes/ListaPage.tsx`, exportada por el barril como `ListaPage`. Sustituye a la `PantallaPendiente` de `/entrenamientos/:id/lista`, perezosa                                                          |
| Título                  | `<Pantalla id="A15" titulo="Lista de asistencia">`. Debajo, el día, la hora y el lugar del entrenamiento, y un enlace «Volver a entrenamientos»                                                        |
| Sin entrenamiento       | Si `fetchEntrenamiento` devuelve `null`: «Ese entrenamiento no existe o no puedes verlo.» y el enlace de volver                                                                                        |
| Aviso de salud          | Una línea bajo la cabecera: «Las observaciones son para lo deportivo. No apuntes lesiones ni datos de salud.»                                                                                          |
| El recuento             | Una línea que se actualiza al marcar: «18 presentes · 2 ausentes · 1 retraso · 0 sin marcar». **No es una región viva**: anunciar cada toque estorba                                                   |
| Cada jugador            | Dorsal y apodo de cabecera, y un `GrupoDeOpciones` en línea con «Presente», «Ausente» y «Retraso». Su leyenda es «Asistencia de» y el apodo, y puede ir oculta a la vista si el apodo ya se lee encima |
| Sin marcar              | Ningún radio marcado. `GrupoDeOpciones` pide hoy un `valor`: amplíalo a `valor: T \| null`, sin cambiar nada para quien ya lo usa                                                                      |
| Observación del jugador | Un botón «Añadir observación» por jugador, que abre un `Field` de texto de 280 caracteres. Si ya tiene una, el campo sale abierto                                                                      |
| Fuera de la plantilla   | Al final, bajo «Ya no están en la plantilla». Su estado y su observación se leen y no se cambian                                                                                                       |
| Observación global      | Al final, un área de texto «Observación del entrenamiento», de 500 caracteres                                                                                                                          |
| «Guardar lista»         | Un botón al final. Mientras guarda dice «Guardando…» y no responde a otro toque. Con jugadores sin marcar, una línea encima: «Quedan 3 sin marcar. Puedes guardar y terminar después.»                 |
| Al guardar bien         | Anuncia «Lista guardada: 18 presentes, 2 ausentes y 1 retraso.», enseña «Guardada a las 18:42» junto al botón y **se queda en la pantalla**                                                            |
| Si falla                | «No se ha podido guardar. Lo marcado sigue aquí: vuelve a intentarlo.», o el mensaje de `mensajeDeErrorAlGuardar` si la base dijo algo. Anunciado y con el foco en el mensaje                          |
| Estados de carga        | «Cargando…» hasta tener el entrenamiento, la plantilla y la asistencia. Si falla alguna, el mensaje y «Reintentar». Sin jugadores: «La plantilla no tiene jugadores.» y un enlace a `/equipo`          |

## Decidido: que no se pierda nada

| Punto                | Decisión                                                                                                                    |
| :------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| El borrador          | Cada cambio escribe `Cambios` en `localStorage`, con la clave `sasi.lista.<id de la sesión>` y el `userId` de quien lo toca |
| Al abrir             | Si hay borrador de esa cuenta, se recupera y sale una línea: «Tienes cambios sin guardar de antes.»                         |
| Al guardar bien      | Se borra el borrador y `Cambios` vuelve a vacío: lo guardado manda                                                          |
| Al salir sin guardar | No se pregunta nada. El borrador se queda y vuelve al entrar                                                                |
| «Descartar cambios»  | Un botón secundario junto a «Guardar lista», solo con cambios. Borra el borrador y vuelve a lo guardado, sin preguntar      |

## Archivos

| Archivo                                                                                   | Cambio                                                 |
| :---------------------------------------------------------------------------------------- | :----------------------------------------------------- |
| `src/modules/training/model/lista.ts`, `model/partida.ts` y sus `.test.ts` (nuevos)       | El modelo                                              |
| `src/modules/training/api/asistencia.ts` y su `.test.ts` (nuevos)                         | Leer y guardar la asistencia                           |
| `src/modules/training/api/entrenamientos.ts`, su `.test.ts` y `api/queryKeys.ts`          | `guardarObservacionGlobal` y la clave nueva            |
| `src/modules/training/hooks/useAsistencia.ts` (nuevo)                                     | Los hooks                                              |
| `src/modules/training/routes/ListaPage.tsx`, su `.module.css` y `Lista.test.tsx` (nuevos) | La pantalla                                            |
| `src/modules/training/index.ts`                                                           | Exporta `ListaPage`                                    |
| `src/modules/core/index.ts`                                                               | Exporta `usePlantillaDeLectura` y `LecturaDePlantilla` |
| `src/shared/ui/GrupoDeOpciones.tsx` y una prueba suya                                     | `valor: T \| null`                                     |
| `src/app/router.tsx`                                                                      | La ruta, perezosa                                      |

## Pruebas

Escríbelas primero y comprueba que fallan. Los dobles van en la frontera de `api/`, también en la de `core` (`@modules/core/api/plantilla`), y en `AuthContext`.

| Archivo              | Caso                                                                                                                              |
| :------------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| `partida.test.ts`    | `interpretarPartida`: `null`, basura y un valor desconocido dan `presentes`; `sin_marcar` se respeta                              |
| `lista.test.ts`      | `estadoDe`: lo tocado gana a lo guardado; lo guardado, a la partida; sin nada, `present` o `null` según la partida                |
| `lista.test.ts`      | `componerLista`: respeta el orden de la plantilla y pone al final, marcado, a quien tiene fila y ya no está                       |
| `lista.test.ts`      | `recuento` cuenta los cuatro                                                                                                      |
| `lista.test.ts`      | `filasAGuardar` deja fuera a los sin marcar y manda `null` en la observación vacía                                                |
| `lista.test.ts`      | `interpretarBorrador`: basura y el borrador de otra cuenta dan `null`                                                             |
| `asistencia.test.ts` | `guardarAsistencia` hace los dos `upsert`: el primero con `created_by` e `ignoreDuplicates`, el segundo sin `created_by`          |
| `asistencia.test.ts` | Con menos filas de vuelta que las enviadas, `SIN_FILAS`. Con cero filas que guardar, ninguna llamada                              |
| `asistencia.test.ts` | `fetchAsistencia` pide `players(nickname)` y no nombra `full_name`                                                                |
| `Lista.test.tsx`     | Con partida `presentes`, una lista nueva sale con todos en «Presente» y el recuento lo dice                                       |
| `Lista.test.tsx`     | Al cambiar a «Todos sin marcar», los no tocados pierden la marca y el que se tocó la conserva. Lo elegido queda en `localStorage` |
| `Lista.test.tsx`     | Marcar un ausente y guardar llama a `guardarAsistencia` con sus filas y anuncia el recuento                                       |
| `Lista.test.tsx`     | Con jugadores sin marcar, se lee cuántos quedan y guardar no los manda                                                            |
| `Lista.test.tsx`     | La observación global solo se guarda si cambió                                                                                    |
| `Lista.test.tsx`     | Si guardar falla, se lee el mensaje, lo marcado sigue y el borrador sigue en `localStorage`                                       |
| `Lista.test.tsx`     | Al volver a montar la pantalla con un borrador, lo recupera y lo dice. Tras guardar bien, el borrador ya no está                  |
| `Lista.test.tsx`     | Se lee el aviso de salud                                                                                                          |
| `GrupoDeOpciones`    | Con `valor={null}` no hay ningún radio marcado, y elegir uno llama a `alCambiar`                                                  |

## Pasos

1. Crea la rama desde `main` actualizado y comprueba que la T-228 está.
2. Lee el §13 del DOC 04, `lineup/api/convocatoria.ts`, `shared/ui/GrupoDeOpciones.tsx` y `shared/lib/preferencias.ts`: son el patrón.
3. Escribe las pruebas y comprueba que fallan.
4. El modelo, los datos y los hooks.
5. `GrupoDeOpciones` con `valor` nulo y el barril de `core`.
6. La pantalla y la ruta.
7. Lanza `npm run lint`, `npx prettier --check .`, `npm run test -- --run` y `npm run build`. Sin `INEFFECTIVE_DYNAMIC_IMPORT`. Apunta el inicial comprimido: no puede subir.
8. Mira la pantalla a 320 px con veinte jugadores, a 1024 px, y a 320 px con el texto al 200 %: sin desplazamiento horizontal y con las tres opciones de cada jugador a 48 px de alto.
9. Edita la documentación, commitea, sube y abre la PR.
10. Con el CI en verde, fusiona con squash.

## Documentación: edita, no reescribas

| Documento            | Edición                                                                                                                                                                                                    |
| :------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/08_TAREAS.md`  | La fila de la T-229 pasa a ✅. Un párrafo de cuatro líneas en el §5b. Sube la versión un decimal                                                                                                           |
| `docs/13_HANDOFF.md` | **No lo reescribas.** Sección corta encima de la primera «## Sesión», con el tamaño del inicial                                                                                                            |
| `CLAUDE.md`          | Un párrafo «Desde la **T-229**…»: la A15, que sin marcar es sin fila, los dos `upsert`, la partida y el borrador en el móvil, y que de `players` solo se pide `nickname`. En «Siguientes tareas», la T-230 |

Deuda que anotar: guardar son hasta tres peticiones sin transacción, y si falla la última la asistencia ya está guardada y la observación global no; sin red no se guarda, y lo marcado espera en el borrador del móvil; si dos entrenadores pasan la misma lista a la vez, gana el último que guarda, jugador a jugador; un jugador marcado no puede volver a «sin marcar»; la partida de la lista se guarda por móvil y no por persona; el borrador de un entrenamiento borrado se queda en el móvil; y nadie más que quien pasa lista ve la asistencia, tampoco el jugador ni su familia.

## Cierre

- Commit y título de la PR: `feat(training): add the attendance list with per-player notes`
- En «Cómo lo pruebo» de la PR: con la cuenta de Raúl, «Entrenamiento de hoy», marcar dos ausentes y un retraso, escribir una observación y guardar; recargar y ver que sigue; cambiar a «Todos sin marcar» en un entrenamiento nuevo; y marcar algo, recargar sin guardar y ver «Tienes cambios sin guardar de antes.»
- Al terminar, di en cuatro líneas: número de la PR, pruebas en verde, inicial comprimido y si quedó fusionada.

## Fuera de esta tarea

Repetir cada semana (T-230), los entrenamientos en el calendario y en Inicio (T-231), el historial de asistencia por jugador (T-232), el modo sin conexión por la cola, las ausencias justificadas, que es un cuarto estado que la base no tiene, y cualquier cambio en la base.
