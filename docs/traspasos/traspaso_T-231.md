# Traspaso T-231 — Los entrenamientos en el calendario y en Inicio

> **Modelo y esfuerzo:** Opus, medio · **Rama:** `feat/agenda-entrenamientos-en-el-calendario` · **Depende de:** T-230 fusionada · **Sin migración**
> Preparado el 08/10/2026 sobre `main` en `9cc4d44` (PR #98). Si `src/modules/training/hooks/useEntrenamientos.ts` no existe, para y dilo.

## Qué falta

Los entrenamientos viven en su pantalla, `/entrenamientos`, y a ella se llega por un enlace del calendario. La regla T-01 del DOC 04 pide más: que el entrenamiento **aparezca en el calendario**. Y a Inicio, que enseña el próximo partido, le falta el próximo entrenamiento.

## Qué hay que conseguir

1. El calendario enseña, junto a los partidos por jugar, los entrenamientos de los próximos catorce días, en orden de fecha.
2. Inicio enseña el próximo entrenamiento debajo del próximo partido, si hay alguno en los próximos siete días.
3. Quien tiene `training.manage` pasa lista desde los dos sitios con un toque.

## Decidido: `agenda` importa de `training` (D06-42)

El DOC 06 §4.2 no deja a `agenda` importar de `training`. Se abre: `training` solo depende de `shared`, `auth` y `core`, así que no hay ciclo. Es la misma relación que `agenda` ya tiene con `core` y con `rules`.

| Punto               | Decisión                                                                                                                                                                 |
| :------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Qué sale del barril | `training/index.ts` exporta además `useEntrenamientos`, `separarEntrenamientos` y el tipo `Entrenamiento`. Nada más                                                      |
| Por dónde           | `agenda` los importa de `@modules/training`, por el barril. Nunca por ruta directa                                                                                       |
| Al revés            | `training` sigue sin importar de `agenda`                                                                                                                                |
| El tamaño           | El trozo de `agenda` engorda con lo que arrastre el barril de `training`. Mídelo y apúntalo. **El paquete inicial no puede subir**: Inicio y el calendario son perezosos |
| El documento        | En el DOC 06 §4.2, la fila de `agenda` gana `training`, y debajo va la D06-42 con su porqué, en tres líneas                                                              |

## Reglas de esta sesión

- Lee solo los archivos de las tablas. No abras más documentos que el §4.2 del DOC 06.
- Si algo no cuadra con este traspaso, para y dilo. No improvises ni amplíes el alcance.
- Ahorra contexto: las búsquedas, al subagente `explorador`; lo repetitivo, al `implementador`.
- Haz el ciclo completo: rama, un commit, push, PR con la plantilla, CI en verde y squash merge a `main`. **Nunca toques `release`.**
- En la nube `gh pr create` falla: la PR se abre con `gh api repos/60F10/isAPP/pulls`.
- **Sin migración ni SQL.**
- **Los partidos no cambian.** Ni su orden, ni sus acciones, ni `ResumenDePartido`, ni `ProximoPartido`. Las pruebas de `Agenda.test.tsx` que ya existen pasan sin tocarlas, salvo por el doble nuevo de la frontera de `training`.
- **Un fallo de los entrenamientos no tumba el calendario.** Si su consulta falla, los partidos salen igual.
- `HomePage`, que es de `core`, no importa de `agenda` ni de `training`: todo entra por la prop `proximoEvento` (D06-34).
- Accesibilidad al construir: enlaces de 48 px de alto, legible a 320 px, y el tipo de cada fila en texto, no solo en color o en icono.

## Decidido: el calendario

| Punto                | Decisión                                                                                                                                                                               |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dónde salen          | En la tarjeta «Por jugar», mezclados con los partidos por fecha. La tarjeta «Jugados» sigue siendo solo de partidos                                                                    |
| Cuáles               | Los que van desde las 00:00 de hoy hasta dentro de catorce días, en la hora del móvil. Con una tanda semanal hay decenas: enseñarlos todos enterraría los partidos                     |
| La mezcla            | `mezclarAgenda(partidos, entrenamientos, ahora)`, pura, en `agenda/model/agenda.ts`. Devuelve una lista de `{ tipo: 'partido', partido }` y `{ tipo: 'entrenamiento', entrenamiento }` |
| Empate de hora       | El partido va delante                                                                                                                                                                  |
| Cómo se pinta        | `agenda/components/ResumenDeEntrenamiento.tsx`: «Entrenamiento», el día y la hora con el formato de `ResumenDePartido`, y debajo el lugar y el objetivo, si los tiene                  |
| «Pasar lista»        | Un enlace a `/entrenamientos/:id/lista` en cada entrenamiento, solo con `useHasPermission('training.manage') === true`. Su nombre accesible lleva el día                               |
| Debajo de la tarjeta | El enlace «Entrenamientos» que ya existe pasa a decir «Todos los entrenamientos»                                                                                                       |
| Quién los pide       | Cualquiera con función en el equipo. **Con una membresía de seguidor la consulta no se lanza**: no puede leerlos                                                                       |
| Si la consulta falla | Los partidos salen, y bajo la tarjeta una línea: «No se han podido cargar los entrenamientos.»                                                                                         |
| Mientras carga       | El calendario espera a los partidos, como hoy. Los entrenamientos aparecen cuando llegan, sin mover el foco                                                                            |
| Texto de lista vacía | No cambia: habla de partidos                                                                                                                                                           |

## Decidido: Inicio

| Punto        | Decisión                                                                                                                                                      |
| :----------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Qué se añade | `agenda/components/ProximoEntrenamiento.tsx`, debajo de `ProximoPartido`, dentro de lo que `InicioPage` pasa en `proximoEvento`                               |
| Cuándo sale  | Si hay algún entrenamiento desde las 00:00 de hoy hasta dentro de siete días. Enseña el primero. Si no hay ninguno, o si la consulta falla, **no pinta nada** |
| Qué enseña   | «Próximo entrenamiento», el día y la hora, el lugar si lo tiene, y los enlaces «Pasar lista», con `training.manage`, y «Todos los entrenamientos»             |
| El de hoy    | Dice «Hoy» en vez del día                                                                                                                                     |
| El partido   | `ProximoPartido` no se toca: el directo sigue a un toque desde Inicio (DOC 02 §3.3)                                                                           |

## Archivos

| Archivo                                                                                | Cambio                                   |
| :------------------------------------------------------------------------------------- | :--------------------------------------- |
| `src/modules/training/index.ts`                                                        | Las tres exportaciones nuevas            |
| `src/modules/agenda/model/agenda.ts` y su `.test.ts` (nuevos)                          | `mezclarAgenda` y `proximoEntrenamiento` |
| `src/modules/agenda/components/ResumenDeEntrenamiento.tsx` y su `.module.css` (nuevos) | La fila del calendario                   |
| `src/modules/agenda/components/ProximoEntrenamiento.tsx` y su `.module.css` (nuevos)   | La pieza de Inicio                       |
| `src/modules/agenda/routes/CalendarioPage.tsx`, `InicioPage.tsx` y `Agenda.test.tsx`   | La mezcla, la pieza y sus pruebas        |
| `docs/06_Arquitectura_Frontend.md`                                                     | El §4.2 y la D06-42                      |

## Pruebas

Escríbelas primero y comprueba que fallan. El doble nuevo va en la frontera de `training`: `@modules/training/api/entrenamientos`.

| Archivo           | Caso                                                                                                                                           |
| :---------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| `agenda.test.ts`  | `mezclarAgenda` ordena por fecha partidos y entrenamientos; a la misma hora, el partido delante                                                |
| `agenda.test.ts`  | Deja fuera el entrenamiento de ayer y el de dentro de quince días; entran el de hoy a las 09:00, con `ahora` a las 20:00, y el del día catorce |
| `agenda.test.ts`  | `proximoEntrenamiento` devuelve el primero dentro de siete días, y `null` si no hay ninguno                                                    |
| `Agenda.test.tsx` | El calendario enseña un entrenamiento entre dos partidos, con la palabra «Entrenamiento»                                                       |
| `Agenda.test.tsx` | «Pasar lista» sale con `training.manage` y no sale sin él                                                                                      |
| `Agenda.test.tsx` | Si `fetchEntrenamientos` falla, los partidos salen y se lee «No se han podido cargar los entrenamientos.»                                      |
| `Agenda.test.tsx` | Con una membresía de seguidor, `fetchEntrenamientos` no se llama                                                                               |
| `Agenda.test.tsx` | Inicio enseña «Próximo entrenamiento» con uno dentro de siete días, dice «Hoy» si es hoy, y no pinta nada sin ninguno                          |

## Pasos

1. Crea la rama desde `main` actualizado.
2. Lee `agenda/routes/CalendarioPage.tsx`, `InicioPage.tsx`, `agenda/components/ProximoPartido.tsx` y `ResumenDePartido.tsx`, y `training/hooks/useEntrenamientos.ts`.
3. Escribe las pruebas y comprueba que fallan.
4. El barril de `training`, el modelo y los dos componentes.
5. El calendario e Inicio.
6. Lanza `npm run lint`, `npx prettier --check .`, `npm run test -- --run` y `npm run build`. Sin `INEFFECTIVE_DYNAMIC_IMPORT`. Apunta el inicial comprimido y el trozo de `agenda`, antes y después.
7. Mira el calendario e Inicio a 320 px y a 1024 px, y a 320 px con el texto al 200 %.
8. Edita la documentación, commitea, sube y abre la PR.
9. Con el CI en verde, fusiona con squash.

## Documentación: edita, no reescribas

| Documento                          | Edición                                                                                                                                                          |
| :--------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/06_Arquitectura_Frontend.md` | El §4.2 y la D06-42. Sube la versión un decimal                                                                                                                  |
| `docs/08_TAREAS.md`                | La fila de la T-231 pasa a ✅, con su rama. Un párrafo de cuatro líneas en el §5b. Sube la versión un decimal                                                    |
| `docs/13_HANDOFF.md`               | **No lo reescribas.** Sección corta encima de la primera «## Sesión», con los dos tamaños                                                                        |
| `CLAUDE.md`                        | Una frase en el párrafo de la T-228: desde la T-231 `agenda` importa de `training` por su barril (D06-42), y el calendario enseña catorce días de entrenamientos |

Deuda que anotar: los entrenamientos pasados no salen en el calendario, solo en su pantalla; el calendario hace dos consultas donde antes hacía una; y quien entrena dos veces el mismo día ve dos filas seguidas sin agrupar.

## Cierre

- Commit y título de la PR: `feat(agenda): show upcoming training sessions alongside matches`
- En «Cómo lo pruebo» de la PR: con la cuenta de Raúl, crear un entrenamiento para mañana y verlo en el calendario entre los partidos y en Inicio; con una cuenta sin `training.manage`, verlo sin «Pasar lista».
- Al terminar, di en cuatro líneas: número de la PR, pruebas en verde, inicial comprimido y trozo de `agenda`, y si quedó fusionada.

## Fuera de esta tarea

Los entrenamientos pasados en el calendario, el historial de asistencia (T-232), la observación del entrenamiento (T-233), las notificaciones y cualquier cambio en la base.
