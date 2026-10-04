# Traspaso T-222 — Arreglos de la revisión: cierre, «Mis aportaciones» y registro de errores

> **Esfuerzo:** medio · **Rama:** `fix/review-arreglos-de-la-revision` · **Depende de:** T-210b, T-211 y T-303 fusionadas · **Sin base de datos**
> Preparado el 04/10/2026 sobre `main` en `00669e9`. Si un símbolo de los que se nombran aquí no existe, para y dilo.

## Qué es

Arreglos que salieron de revisar la T-210b, la T-211 y la T-303 (DOC 13, puntos 73 y 76), y las pruebas que les faltan a sus tres `api/`.

## Reglas de esta sesión

- Lee solo los archivos de la tabla. No abras los DOC enteros ni delegues en subagentes.
- Si algo no cuadra con este traspaso, para y dilo. No improvises ni amplíes el alcance.
- Haz el ciclo completo. Rama, un commit, push, PR con la plantilla, CI en verde y squash merge a `main`. **Nunca toques `release`.**
- **Sin migración.** Lo que pida base se anota como deuda.
- Cada `update` y cada `delete` piden la fila de vuelta: cero filas es `SIN_FILAS`.
- De `players` solo se lee `nickname`. De las personas, solo `display_name`.
- `logging` solo importa de `shared`.

## El cierre (A13) y «Mis aportaciones» (A14)

| #   | Qué pasa hoy                                                                                                | Qué tiene que pasar                                                                                                                                                                                                          |
| :-- | :---------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Los `update` y el `delete` de `match_events` filtran solo por `id`                                          | Llevan además `.eq('match_id', partidoId)`. Vale para `resolverEvento`, `aprobarPendientes` y `cambiarMinuto` de `api/discordancias.ts`, y para `cambiarJugador`, `cambiarSegundo` y `borrarEvento` de `api/aportaciones.ts` |
| 2   | Aprobar en bloque anuncia cuántos aprobó sin decir que eran menos de los pedidos                            | `aprobarPendientes` devuelve `{ pedidos, aprobados }`. Si son menos: «Aprobados 2 de 5. Los demás habían cambiado: vuelve a mirar.»                                                                                          |
| 3   | `cambiarMinuto` con cero filas dice que no hay permiso, cuando también puede ser que el evento ya no exista | «Ese evento ya no se puede cambiar: lo han revisado o lo han borrado.», en los dos sitios que lo usan                                                                                                                        |
| 4   | El formulario del minuto dice «Guardando…» también cuando solo se está volviendo a pedir la lista           | «Guardando…» solo con la mutación en marcha. Los botones pueden seguir desactivados mientras se vuelve a pedir                                                                                                               |
| 5   | `flag_duplicate_candidates` se vuelve a llamar si los permisos se recargan                                  | Una vez por partido y por montaje, con un `useRef`                                                                                                                                                                           |
| 6   | Al aparecer un autor nuevo, «Lo apuntó:» desaparece de todos los eventos hasta que contesta la consulta     | `placeholderData: keepPreviousData` en la consulta de autores                                                                                                                                                                |
| 7   | En la A14, si una corrección falla y el formulario sigue abierto, el foco se queda en `body`                | Vuelve a la leyenda del formulario, con `tabIndex={-1}`                                                                                                                                                                      |

## El registro de errores (C02)

| #   | Qué pasa hoy                                                                                                            | Qué tiene que pasar                                                                                                                                                                                                         |
| :-- | :---------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8   | Pagina con `range`, por desplazamiento: si entra un error mientras, la página siguiente repite una fila o se salta otra | Por cursor. Orden `created_at` descendente e `id` descendente; la página siguiente pide lo anterior a la última fila vista: `created_at` menor, o igual con `id` menor. Las páginas ya cargadas no se vuelven a pedir solas |
| 9   | El resultado de filtrar —filas, ninguna o un fallo— sale sin anunciarse                                                 | Se anuncia con `useAnnounce`: «12 errores», «Ningún error cumple esos filtros.» o el fallo                                                                                                                                  |
| 10  | «Cargar 50 más» se desactiva o desaparece con el foco puesto                                                            | Tras cargar, el foco va a la primera fila nueva, con `tabIndex={-1}`. Mientras carga, `aria-disabled` en vez de `disabled`                                                                                                  |
| 11  | En «La ruta contiene», `*` hace de comodín                                                                              | `escaparComodines` quita los `*`                                                                                                                                                                                            |
| 12  | Por debajo de 600 px la tabla pasa a `display: block` y pierde su semántica; y `Detalle` usa `h4` bajo un `h2`          | `role="table"`, `role="row"`, `role="columnheader"` y `role="cell"` escritos a mano. `h3` en `Detalle`                                                                                                                      |

## Pruebas de las tres `api/`

Hoy las pantallas las prueban con dobles enteros: se podría reescribir una `api/` y todo seguiría en verde. Mira cómo dobla el cliente `src/modules/sync/api/transporte.test.ts` y haz lo mismo: un doble de `supabase` que apunte las llamadas encadenadas.

| Archivo nuevo                                  | Qué comprueba                                                                                                                                                                                                                                                           |
| :--------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/modules/review/api/discordancias.test.ts` | Cada `update` lleva `id`, `match_id` y, al aprobar, descartar y recuperar, el estado de partida. Se escriben solo `status`, `reviewed_by` y `reviewed_at`, o solo `period` y `seconds`. Cero filas da el error que toca. `fetchAutores` pide solo `id` y `display_name` |
| `src/modules/review/api/aportaciones.test.ts`  | La lista filtra por `created_by`, equipo y temporada. Cada corrección escribe una sola columna, con `id` y `match_id`. Borrar es un `delete` con `id` y `match_id`. Cero filas es `SIN_FILAS`. Ninguna consulta nombra `full_name`                                      |
| `src/modules/logging/api/errorLogs.test.ts`    | Los filtros van en la consulta; `escaparComodines` con `%`, `_`, `\` y `*`; el cursor de la segunda página; el orden                                                                                                                                                    |

## Archivos

| Archivo                                                                                                            | Cambio                                                                           |
| :----------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------- |
| `src/modules/review/api/discordancias.ts`, `api/aportaciones.ts` y sus pruebas nuevas                              | Arreglos 1, 2 y 3                                                                |
| `src/modules/review/hooks/useCierre.ts` y `hooks/useAportaciones.ts`                                               | Pasan `partidoId`; arreglo 6                                                     |
| `src/modules/review/components/PanelDeEventos.tsx` y `MinutoDelEvento.tsx`                                         | Arreglos 2, 4 y 5                                                                |
| `src/modules/review/routes/MisAportacionesPage.tsx`, `CierrePartidoPage.test.tsx` y `MisAportacionesPage.test.tsx` | Arreglo 7 y las pruebas de pantalla que cambian                                  |
| `src/modules/logging/api/errorLogs.ts`, `hooks/useErrores.ts` y su prueba nueva                                    | Arreglos 8 y 11                                                                  |
| `src/modules/logging/routes/RegistroDeErroresPage.tsx`, su `.module.css` y su `.test.tsx`                          | Arreglos 9, 10 y 12                                                              |
| `CLAUDE.md`                                                                                                        | En el párrafo de la T-210b, «el estado de partida» pasa a «el estado del evento» |

## Pruebas de pantalla

Escríbelas primero y comprueba que fallan.

| Archivo                          | Caso                                                                                    |
| :------------------------------- | :-------------------------------------------------------------------------------------- |
| `CierrePartidoPage.test.tsx`     | Aprobar cinco y que vuelvan dos: se anuncia «Aprobados 2 de 5…»                         |
| `CierrePartidoPage.test.tsx`     | Si `marcarRepetidos` falla, la lista sigue ahí y se puede aprobar                       |
| `CierrePartidoPage.test.tsx`     | Un partido cerrado no ofrece ninguna acción sobre sus eventos                           |
| `MisAportacionesPage.test.tsx`   | Tras un fallo que no es `SIN_FILAS`, el foco está en la leyenda del formulario          |
| `RegistroDeErroresPage.test.tsx` | «Cargar 50 más» pide con el cursor de la última fila y deja el foco en la primera nueva |
| `RegistroDeErroresPage.test.tsx` | Cambiar un filtro anuncia cuántos errores hay                                           |

## Pasos

1. Crea la rama desde `main` actualizado.
2. Lee los archivos de la tabla y `sync/api/transporte.test.ts`.
3. Escribe las pruebas y comprueba que fallan.
4. `review`: las dos `api/`, los hooks y las pantallas.
5. `logging`: la `api/`, el hook y la pantalla.
6. Lanza `npm run lint`, `npx prettier --check .`, `npm run test -- --run` y `npm run build`. Sin `INEFFECTIVE_DYNAMIC_IMPORT`. Apunta el inicial comprimido: no puede subir.
7. Edita la documentación, commitea, sube y abre la PR.
8. Con el CI en verde, fusiona con squash.

## Documentación: edita, no reescribas

| Documento            | Edición                                                                                                                                                                                                 |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/08_TAREAS.md`  | La fila de la T-222 pasa a ✅. Un párrafo de tres líneas. Sube la versión un decimal                                                                                                                    |
| `docs/13_HANDOFF.md` | **No lo reescribas.** Sección corta encima de la primera «## Sesión». En el punto 76, una línea: cerrado. En el 73, una línea: el filtro lleva ya el partido, y sigue faltando el disparador en la base |

Deuda que anotar: el `match_id` en el filtro no impide cambiar un evento de un partido que otro acaba de cerrar; eso solo lo cierra la base (DOC 13, punto 73).

## Cierre

- Commit y título de la PR: `fix(review): address review findings in closing, contributions and logs`
- Al terminar, di en cuatro líneas: número de la PR, pruebas en verde, inicial comprimido y si quedó fusionada.

## Fuera de esta tarea

El disparador que proteja los partidos cerrados, borrar o caducar errores, guardar «los dos valen» y cualquier cambio en la base.
