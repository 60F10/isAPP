# Cómo trabaja una sesión programada

> Lo lee toda sesión programada del proyecto antes de empezar. El mensaje que la lanza le da cuatro datos: **TAREA**, **RAMA**, **TÍTULO** y **ANTERIOR**. Lo demás está aquí y en el traspaso de la tarea.
> Sale de las tandas del 04/10, del 05/10 y del 08/10. Si cambias una regla, di en el DOC 13 por qué.

Nadie está mirando: no preguntes, decide y deja constancia. Tu tarea es la TAREA y solo esa.

## Preparación

1. El repositorio `60F10/isAPP` ya está clonado en `/home/claude/isapp`, con permiso de escritura. Compruébalo con `git -C /home/claude/isapp rev-parse HEAD` y `git -C /home/claude/isapp ls-remote origin HEAD`. Si alguna de las dos falla, informa «TAREA NO HECHA: no hay acceso al repositorio» y termina. No intentes añadirlo por otro camino.
2. `cd /home/claude/isapp && git switch main && git pull`. Después, `unset NODE_ENV` y `npm ci`.
3. Lee `CLAUDE.md`. Dos reglas suyas no valen para ti: «los commits los hace el usuario» y «pide un plan y espera visto bueno». Tú haces el ciclo completo sin esperar a nadie.

## Guardas, antes de tocar nada y en este orden

| Guarda | Qué miras                                                                                                                                                                                      | Si no se cumple                                                                                                                                   |
| :----- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| **a**  | En `docs/08_TAREAS.md`, la fila de la TAREA no está en ✅                                                                                                                                      | Informa «TAREA YA ESTABA HECHA» y termina                                                                                                         |
| **b**  | No existe la RAMA en `origin`, ni la rama alternativa que nombre el traspaso, ni una pull request, abierta o cerrada, con el TÍTULO (`gh api "repos/60F10/isAPP/pulls?state=all&per_page=30"`) | Otra sesión la tiene o la tuvo: informa «TAREA NO HECHA: ya hay rama o PR» y termina. No la rehagas                                               |
| **c**  | Si hay ANTERIOR, su fila está en ✅ en `main`                                                                                                                                                  | Espera dentro de la sesión: `sleep 300` y `git pull`, hasta 60 minutos. Si sigue sin estar, informa «TAREA NO HECHA: falta la ANTERIOR» y termina |
| **d**  | No hay pull requests abiertas                                                                                                                                                                  | Espera igual, hasta 60 minutos. Si sigue abierta, mira la regla de abajo                                                                          |
| **e**  | Con `main` al día, `npm run lint` y `npm run test -- --run` pasan                                                                                                                              | Informa «TAREA NO HECHA: main está roto», con el error, y termina                                                                                 |

**La guarda d, con una PR que no se cierra.** Si es de una tarea programada, tiene «Lint y build» en verde, no tiene conflictos y su traspaso no dice que se deje abierta, fusiónala con squash y sigue. Si es de una tarea de pruebas en navegador que se quedó sin poner en verde, **no la fusiones ni la cierres: sigue con tu tarea** y dilo en el informe. Con cualquier otra, informa «TAREA NO HECHA: hay una PR abierta, la #N» y termina.

## La tarea

Lee `docs/traspasos/traspaso_TAREA.md` y hazlo tal cual: sus reglas, sus archivos, sus pruebas primero, sus pasos y su documentación. Si algo no cuadra con el código, para e informa «TAREA NO HECHA: qué no cuadra». No improvises ni amplíes el alcance.

**Lo que diga el traspaso manda sobre este archivo.** Las tareas de pruebas en navegador, por ejemplo, suben la rama varias veces.

## El ciclo

- Rama RAMA desde `main`. Un solo commit, con el asunto TÍTULO y el cuerpo en español. Sube la rama una sola vez, salvo que el traspaso diga otra cosa.
- `gh pr create` falla en este repositorio. Abre la PR por la API: `gh api repos/60F10/isAPP/pulls --method POST --input <json>`, con el TÍTULO y el cuerpo de `.github/pull_request_template.md` relleno.
- El CI se mira con `gh api repos/60F10/isAPP/commits/<sha>/check-runs`. En verde, fusiona con squash: `gh api repos/60F10/isAPP/pulls/<n>/merge --method PUT -f merge_method=squash`.
- Si `main` ha avanzado y la PR tiene conflictos, **no los resuelvas en GitHub**: `git fetch`, `git rebase origin/main`, resuelve en local quedándote con **una** versión de cada párrafo y de cada prueba, vuelve a pasar lint, formato, pruebas y build, y `git push --force-with-lease`. En los documentos, tu sección va encima de la primera «## Sesión» y la versión sube un decimal sobre la que haya.
- **`--force-with-lease` a secas falla en este clon** con «stale info», porque solo sigue a `main`. Di el commit que esperas encontrar: `git push --force-with-lease=RAMA:<sha que había en origin> origin RAMA`. El `sha` sale de `git ls-remote origin RAMA`, mirado antes de enmendar.
- Si no puedes fusionar, dilo en el informe con el número de la PR y termina.

## Límites

- **Nunca toques la rama `release`**: ni push, ni pull request, ni borrado.
- **Nada contra la base de datos de producción**: ni SQL, ni migraciones, ni `npm run db:types`. Lo que cambia la base lo aplica Raúl.
- Ningún secreto en el código. Ningún dato personal de menores: solo apodo y dorsal.
- **No programes nada**: ni tareas ni recordatorios. Si hay que esperar, espera con `sleep` dentro de la sesión.
- No cambies el modelo ni el texto de ninguna tarea programada.

## Al terminar

- Si tienes la herramienta `Projects`, sube con `project_write` y `local_path`: `docs/13_HANDOFF.md` a `claude/13_HANDOFF.md`, `docs/08_TAREAS.md` a `claude/08_TAREAS.md` y, si lo has tocado, `docs/06_Arquitectura_Frontend.md` a `claude/06_Arquitectura_Frontend.md`.
- Informe. Primera línea: «TAREA HECHA» o «TAREA NO HECHA: motivo». Después, lo que pide el apartado «Cierre» del traspaso.
