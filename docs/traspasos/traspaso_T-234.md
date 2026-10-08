# Traspaso T-234 — Revisión de los entrenamientos y sus arreglos

> **Modelo y esfuerzo:** Opus, medio · **Rama:** `fix/training-arreglos-de-la-revision` · **Depende de:** T-230 fusionada · **Sin migración**
> Preparado el 08/10/2026 sobre `main` en `9cc4d44` (PR #98).

## Qué falta

La T-228, la T-229 y la T-230 se hicieron la noche del 08/10 en sesiones programadas, sin nadie delante, y están en `main` sin revisar. Isaac va a usar los entrenamientos en cuanto se publiquen. Esta tarea las revisa contra su traspaso y arregla lo que tenga arreglo claro.

## Qué hay que conseguir

1. Un veredicto por tarea: si hace lo que pedía su traspaso y si están las pruebas de su tabla.
2. Los fallos de arreglo claro, arreglados, con su prueba delante.
3. Lo que pida una decisión de Raúl, apuntado en el DOC 13 con número, sin tocar.

## Reglas de esta sesión

- Revisa **solo** estos tres commits: `c4e2012` (T-228), `4ce89e8` (T-229) y `9cc4d44` (T-230), cada uno contra `docs/traspasos/traspaso_T-228.md`, `traspaso_T-229.md` y `traspaso_T-230.md`.
- Una pasada del subagente `revisor` por tarea, con el traspaso y `git show <commit>`. **Comprueba a mano cada hallazgo antes de darlo por bueno**: abre el archivo y la línea. Un hallazgo sin comprobar no entra en el informe.
- Haz el ciclo completo: rama, un commit, push, PR con la plantilla, CI en verde y squash merge a `main`. **Nunca toques `release`.**
- En la nube `gh pr create` falla: la PR se abre con `gh api repos/60F10/isAPP/pulls`.
- **Sin migración ni SQL.** Nada contra la base.
- No cambies lo que el traspaso decidió, aunque lo harías de otra forma: eso es una decisión de Raúl y va a la lista.

## Qué mirar, además de lo que encuentre el `revisor`

| Punto                | Qué tiene que cumplirse                                                                                                                       |
| :------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| `notes` de la sesión | Ninguna consulta de `training` lee ni escribe `training_sessions.notes`. La fila la ve todo el club                                           |
| Jugadores            | De `players` solo se pide `nickname`. Ninguna consulta nombra `full_name` ni usa `select('*')`                                                |
| Salud                | La lista enseña el aviso de que las observaciones no recogen lesiones ni datos de salud (DOC 04 §13, T-05)                                    |
| Sin marcar           | Un jugador sin marcar no genera fila. `status` se manda siempre, nunca se deja al valor por defecto de la base                                |
| Guardado             | Cada `update` y cada `delete` pide la fila de vuelta y lanza `SIN_FILAS`. Los dos `upsert` de la asistencia: el primero con `created_by`      |
| Quién hace qué       | Sin `training.manage` no sale ningún botón que escriba. `/entrenamientos` va sin guardia; las otras tres rutas, con `training.manage`         |
| Borrador             | Leer y escribir `localStorage` va dentro de `try`. El borrador de otra cuenta no se recupera                                                  |
| Fechas               | Cada fecha de la tanda semanal pasa por `aInstante` con su hora. Nada suma milisegundos a un instante                                         |
| Límites              | `training` no importa de `agenda`. Los `model/` no importan barriles en tiempo de ejecución                                                   |
| Accesibilidad        | Foco tras cada fallo y tras borrar, estado en texto y no solo en color, objetivos de 48 px en la lista, nada de regiones vivas por cada toque |
| Arranque             | Nada de `training` entra en el paquete inicial. Sin `INEFFECTIVE_DYNAMIC_IMPORT`                                                              |

## Qué se arregla aquí y qué no

| Se arregla en esta tarea                                                              | Va a la lista del DOC 13, sin tocar                                             |
| :------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------ |
| El código no hace lo que su traspaso pedía                                            | El traspaso pedía algo que resulta ser mala idea                                |
| Falta una prueba de la tabla del traspaso                                             | Cualquier cosa que pida tocar la base, una ruta, una guardia o un permiso       |
| Un fallo de accesibilidad, de foco o de texto dentro de las pantallas de `training`   | Cualquier cambio de arquitectura o en otro módulo que no sea una línea mecánica |
| Un dato que se pierde, un `SIN_FILAS` que falta, un `try` que falta en `localStorage` | Lo que tenga dos salidas razonables                                             |

Cada arreglo lleva su prueba primero, y la prueba falla antes del arreglo. **Como mucho diez arreglos.** Si hay más, arregla los diez más graves y apunta el resto.

## Si no hay nada que arreglar

No inventes arreglos. La rama pasa a ser `docs/docs-revision-de-entrenamientos` y el commit, `docs(docs): record the review of the training screens`, solo con la documentación.

## Pasos

1. Crea la rama desde `main` actualizado.
2. Lee los tres traspasos y las tres secciones del DOC 13 de la noche del 08/10.
3. Lanza el `revisor`, una vez por tarea.
4. Comprueba a mano cada hallazgo y repártelos en las dos columnas.
5. Para cada arreglo: la prueba, verla fallar, el arreglo.
6. Lanza `npm run lint`, `npx prettier --check .`, `npm run test -- --run` y `npm run build`. Sin `INEFFECTIVE_DYNAMIC_IMPORT`. Apunta el inicial comprimido.
7. Edita la documentación, commitea, sube y abre la PR.
8. Con el CI en verde, fusiona con squash.

## Documentación: edita, no reescribas

| Documento            | Edición                                                                                                                                                                                                            |
| :------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/08_TAREAS.md`  | La fila de la T-234 pasa a ✅. Un párrafo de cuatro líneas en el §5b. Sube la versión un decimal                                                                                                                   |
| `docs/13_HANDOFF.md` | **No lo reescribas.** Sección corta encima de la primera «## Sesión»: una tabla con el veredicto de cada tarea y lo arreglado. Lo que queda para Raúl, como puntos nuevos al final de la lista, del 84 en adelante |
| `CLAUDE.md`          | Solo si un arreglo cambia una regla que ya está escrita ahí                                                                                                                                                        |

## Cierre

- Commit y título de la PR: `fix(training): address review findings in the training screens`
- En «Cómo lo pruebo» de la PR: una línea por arreglo, con lo que se ve distinto.
- Al terminar, di: número de la PR, veredicto de las tres tareas en una línea cada una, cuántos arreglos, cuántos puntos nuevos para Raúl, pruebas en verde y si quedó fusionada.

## Fuera de esta tarea

Revisar la T-305 y la T-306 (T-235), los entrenamientos en el calendario (T-231), la observación del entrenamiento (T-233), aplicar la T-227 y cualquier cambio en la base.
