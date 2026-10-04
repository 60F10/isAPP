# Traspaso T-224 — Flecos del cierre, «Mis aportaciones» y el registro de errores

> **Esfuerzo:** bajo · **Rama:** `fix/review-flecos-de-la-revision` · **Depende de:** T-222 fusionada · **Sin base de datos**
> Preparado el 04/10/2026 sobre `main` en `e633df4`. Si un símbolo de los que se nombran aquí no existe, para y dilo.

## Qué es

Siete arreglos pequeños que salieron de revisar la T-222 (DOC 13, punto 80), y tres huecos en sus pruebas.

## Reglas de esta sesión

- Lee solo los archivos de la tabla. No abras los DOC enteros ni delegues en subagentes.
- Si algo no cuadra con este traspaso, para y dilo. No improvises ni amplíes el alcance.
- Haz el ciclo completo. Rama, un commit, push, PR con la plantilla, CI en verde y squash merge a `main`. **Nunca toques `release`.**
- **Sin migración.** Lo que pida base se anota como deuda.
- Cada `update` y cada `delete` piden la fila de vuelta: cero filas es `SIN_FILAS`.
- De `players` solo se lee `nickname`. De las personas, solo `display_name`.
- `logging` solo importa de `shared`.

## Los arreglos

| #   | Qué pasa hoy                                                                                                                                                                                         | Qué tiene que pasar                                                                                                                                                                                                                                                         |
| :-- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `useErrores` vuelve a pedir la primera página al volver el foco a la ventana (`refetchOnWindowFocus: cursor === null`). Con la segunda cargada y un error nuevo, la lista repite o se salta una fila | Ninguna página se vuelve a pedir sola: fuera esa línea, y `refetchOnReconnect: false`. La pantalla gana un botón «Actualizar», secundario, junto a los filtros: vacía los cursores, invalida las consultas de errores y anuncia el resultado igual que al cambiar un filtro |
| 2   | Si falla «Cargar 50 más», el botón desaparece con el foco puesto, el fallo no se anuncia y solo se sale cambiando un filtro                                                                          | El botón se queda, con el texto «Reintentar», y el fallo se anuncia: «No se pudieron cargar más errores. Vuelve a intentarlo.». Pulsarlo vuelve a pedir esa página (`refetch` de la última), sin añadir otro cursor                                                         |
| 3   | Una ruta que sea solo `*` pasa el `trim()`, se queda en `%%` y deja fuera las filas sin ruta                                                                                                         | En `fetchErrores`, el vacío se comprueba después de `escaparComodines`: sin texto, no se filtra por ruta                                                                                                                                                                    |
| 4   | `guardarOrigen` actualiza `match_events` solo por `client_event_id`                                                                                                                                  | Recibe también `partidoId` y añade `.eq('match_id', partidoId)`. `useCierre` se lo pasa                                                                                                                                                                                     |
| 5   | En la A14, «Borrando…» sale también mientras solo se vuelve a pedir la lista                                                                                                                         | «Borrando…» solo con la mutación de borrar en marcha, como ya hace el formulario del minuto. Los botones pueden seguir desactivados mientras se vuelve a pedir                                                                                                              |
| 6   | Con `aria-disabled="true"`, los botones `secondary` y `ghost` siguen cambiando de fondo al pasar el ratón y al pulsar                                                                                | En `Button.module.css`, cada `:hover:not(:disabled)` y `:active:not(:disabled)` lleva además `:not([aria-disabled='true'])`. Vale para todas las variantes                                                                                                                  |
| 7   | `CLAUDE.md` dice que el filtro de los `update` de eventos lleva «su `id` y el estado del evento»                                                                                                     | Añade «y el `match_id`» en el párrafo de la T-210b                                                                                                                                                                                                                          |

## Los huecos de las pruebas

| Archivo                                                               | Qué falta                                                                                                                                       |
| :-------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| `review/api/discordancias.test.ts`, `review/api/aportaciones.test.ts` | Que cada `update` y cada `delete` pidan la fila de vuelta: el doble apunta la llamada a `.select(…)` y la prueba la exige                       |
| `logging/api/errorLogs.test.ts`                                       | Que «solo hoy» mande en el `gte` el principio del día, no solo la columna. Fija la hora con `vi.useFakeTimers` y `vi.setSystemTime`             |
| `logging/hooks/useErrores.test.tsx`, nuevo                            | Con la primera página cargada, un `focus` de la ventana no la vuelve a pedir. Monta el hook con un `QueryClientProvider` y dobla `fetchErrores` |

## Archivos

| Archivo                                                                                   | Cambio                         |
| :---------------------------------------------------------------------------------------- | :----------------------------- |
| `src/modules/logging/hooks/useErrores.ts` y su prueba nueva                               | Arreglo 1                      |
| `src/modules/logging/routes/RegistroDeErroresPage.tsx`, su `.module.css` y su `.test.tsx` | Arreglos 1 y 2                 |
| `src/modules/logging/api/errorLogs.ts` y `errorLogs.test.ts`                              | Arreglo 3 y el hueco del `gte` |
| `src/modules/review/api/cierre.ts` y `src/modules/review/hooks/useCierre.ts`              | Arreglo 4                      |
| `src/modules/review/routes/MisAportacionesPage.tsx` y su `.test.tsx`                      | Arreglo 5                      |
| `src/shared/ui/Button.module.css`                                                         | Arreglo 6                      |
| `src/modules/review/api/discordancias.test.ts` y `aportaciones.test.ts`                   | El hueco de la fila de vuelta  |
| `CLAUDE.md`                                                                               | Arreglo 7                      |

## Pruebas de pantalla

Escríbelas primero y comprueba que fallan.

| Archivo                          | Caso                                                                                                                           |
| :------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| `RegistroDeErroresPage.test.tsx` | «Actualizar» vuelve a pedir la primera página sin cursor, quita las siguientes y anuncia cuántos errores hay                   |
| `RegistroDeErroresPage.test.tsx` | Si falla la segunda página, se anuncia, el botón dice «Reintentar» y conserva el foco; al pulsarlo se pide con el mismo cursor |
| `errorLogs.test.ts`              | Con la ruta `*`, la consulta no lleva `ilike`                                                                                  |
| `MisAportacionesPage.test.tsx`   | Con la lista volviéndose a pedir y sin borrado en marcha, el botón dice «Sí, borrar»                                           |
| `CierrePartidoPage.test.tsx`     | Guardar el origen de un gol manda el `match_id` del partido. Si la `api/` de cierre tiene prueba propia, mejor ahí             |

## Pasos

1. Crea la rama desde `main` actualizado.
2. Lee los archivos de la tabla.
3. Escribe las pruebas y comprueba que fallan.
4. `logging`: el hook, la `api/` y la pantalla.
5. `review`: `cierre.ts`, `useCierre.ts` y la A14.
6. `Button.module.css` y `CLAUDE.md`.
7. Lanza `npm run lint`, `npx prettier --check .`, `npm run test -- --run` y `npm run build`. Sin `INEFFECTIVE_DYNAMIC_IMPORT`. Apunta el inicial comprimido: no puede subir.
8. Edita la documentación, commitea, sube y abre la PR.
9. Con el CI en verde, fusiona con squash.

## Documentación: edita, no reescribas

| Documento            | Edición                                                                                                               |
| :------------------- | :-------------------------------------------------------------------------------------------------------------------- |
| `docs/08_TAREAS.md`  | La fila de la T-224 pasa a ✅. Un párrafo de tres líneas. Sube la versión un decimal                                  |
| `docs/13_HANDOFF.md` | **No lo reescribas.** Sección corta encima de la primera «## Sesión». En el punto 80, una línea: cerrado por la T-224 |

Deuda que anotar: el registro de errores ya no se pone al día solo, hay que pulsar «Actualizar»; y el `match_id` en el filtro sigue sin impedir tocar un evento de un partido que otro acaba de cerrar (DOC 13, punto 73).

## Cierre

- Commit y título de la PR: `fix(review): tidy up closing, contributions and the error log`
- Al terminar, di en cuatro líneas: número de la PR, pruebas en verde, inicial comprimido y si quedó fusionada.

## Fuera de esta tarea

El disparador que proteja los partidos cerrados, borrar o caducar errores y cualquier cambio en la base.
