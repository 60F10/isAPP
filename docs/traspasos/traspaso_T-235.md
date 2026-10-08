# Traspaso T-235 — Revisión de la T-305 y la T-306 y sus arreglos

> **Modelo y esfuerzo:** Opus, medio · **Rama:** `fix/auth-arreglos-de-la-segunda-revision` · **Depende de:** nada · **Sin migración**
> Preparado el 08/10/2026 sobre `main` en `9cc4d44` (PR #98).

## Qué falta

La T-305 y la T-306 se hicieron la noche del 07/10 en sesiones programadas y están en `main` y en producción desde el 08/10 **sin revisar contra su traspaso**. Tocan el contexto de acceso, que decide qué equipo y qué permisos tiene cada persona.

## Qué hay que conseguir

1. Un veredicto por tarea: si hace lo que pedía su traspaso y si están las pruebas de su tabla.
2. Los fallos de arreglo claro, arreglados, con su prueba delante.
3. Lo que pida una decisión de Raúl, apuntado en el DOC 13 con número, sin tocar.

## Reglas de esta sesión

- Revisa **solo** estos dos commits: `6a8e217` (T-305) y `a7f4918` (T-306), contra `docs/traspasos/traspaso_T-305.md` y `traspaso_T-306.md`.
- Una pasada del subagente `revisor` por tarea, con el traspaso y `git show <commit>`. **Comprueba a mano cada hallazgo antes de darlo por bueno.**
- Haz el ciclo completo: rama, un commit, push, PR con la plantilla, CI en verde y squash merge a `main`. **Nunca toques `release`.**
- En la nube `gh pr create` falla: la PR se abre con `gh api repos/60F10/isAPP/pulls`.
- **Sin migración ni SQL.** Nada contra la base.
- **Dos reglas de `CLAUDE.md` que no se pueden romper al tocar esto:** `permisos` vale `null` mientras la consulta no conteste; y los permisos salen solo de `team_member_permissions` del equipo activo.
- No cambies lo que el traspaso decidió: eso va a la lista.

## Qué mirar, además de lo que encuentre el `revisor`

| Punto               | Qué tiene que cumplirse                                                                                                                                   |
| :------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Equipo activo       | El recordado solo manda si se tiene función en él, o si no se tiene en ninguno. Con varios con función, el recordado sigue mandando                       |
| Contexto fallado    | Un fallo al leer `team_followers` no tumba el contexto; los de `profiles` y `team_members` sí lanzan                                                      |
| «Guardar» de la A07 | Los cambios se calculan contra la foto de cuando se abrió «Editar». `PERMISOS_CAMBIADOS` y `GUARDADO_A_MEDIAS` se dicen y vuelven a sembrar el formulario |
| `mensajeDeLaBase`   | Una sola, y solo enseña tal cual `42501`, `P0002`, `23514` y `23505`                                                                                      |
| Foco                | No cae en `body` al dar de baja, revocar, aceptar, cancelar ni tras un fallo                                                                              |
| Sin red             | El DOC 13 dice que el `TypeError` de «sin red» pasó a un mensaje genérico. Mira si quien se queda sin cobertura entiende qué le pasa                      |
| Límites             | `app/` importa de `auth` por ruta directa. Sin `INEFFECTIVE_DYNAMIC_IMPORT`                                                                               |

## Qué se arregla aquí y qué no

Lo mismo que en la T-234: se arregla lo que no hace lo que su traspaso pedía, la prueba que falte y los fallos de foco, de texto o de datos dentro de `auth` y de las pantallas que tocaron esas dos tareas. Va a la lista del DOC 13, sin tocar, lo que pida la base, una ruta, una guardia, un permiso, otra arquitectura o una decisión con dos salidas razonables.

Cada arreglo lleva su prueba primero. **Como mucho diez arreglos.**

## Si no hay nada que arreglar

La rama pasa a ser `docs/docs-revision-del-contexto-de-acceso` y el commit, `docs(docs): record the review of the access context fixes`, solo con la documentación.

## Pasos

1. Crea la rama desde `main` actualizado.
2. Lee los dos traspasos y las dos secciones del DOC 13 de la noche del 07/10.
3. Lanza el `revisor`, una vez por tarea, y comprueba a mano cada hallazgo.
4. Para cada arreglo: la prueba, verla fallar, el arreglo.
5. Lanza `npm run lint`, `npx prettier --check .`, `npm run test -- --run` y `npm run build`. Apunta el inicial comprimido: `auth` entra en el arranque, y no puede subir más de medio kB.
6. Edita la documentación, commitea, sube y abre la PR.
7. Con el CI en verde, fusiona con squash.

## Documentación: edita, no reescribas

| Documento            | Edición                                                                                                                                                                  |
| :------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/08_TAREAS.md`  | La fila de la T-235 pasa a ✅. Un párrafo de cuatro líneas en el §6. Sube la versión un decimal                                                                          |
| `docs/13_HANDOFF.md` | **No lo reescribas.** Sección corta encima de la primera «## Sesión», con el veredicto de cada tarea y lo arreglado. Lo de Raúl, como puntos nuevos al final de la lista |

## Cierre

- Commit y título de la PR: `fix(auth): address findings from the second access review`
- Al terminar, di: número de la PR, veredicto de las dos tareas, cuántos arreglos, cuántos puntos nuevos para Raúl, pruebas en verde, inicial comprimido y si quedó fusionada.
- **Lo que arregles está en producción con el fallo.** Dilo en el informe: Raúl decide cuándo publica.

## Fuera de esta tarea

Elegir el equipo activo desde la aplicación, los avisos de solicitudes nuevas, la lista de bloqueados (DOC 13, punto 69) y cualquier cambio en la base.
