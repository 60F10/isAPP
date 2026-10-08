# Traspaso T-230 — Entrenamientos: repetir cada semana

> **Modelo y esfuerzo:** Sonnet, medio · **Rama:** `feat/training-repetir-cada-semana` · **Depende de:** T-229 fusionada · **Sin migración**
> Preparado el 08/10/2026. Si `src/modules/training/routes/ListaPage.tsx` no existe, la T-229 no está: para y dilo.

## Qué falta

El Cadete A entrena los mismos días a la misma hora toda la temporada, y con la T-228 cada entrenamiento se da de alta de uno en uno. Raúl pidió el 08/10 poder crear de golpe los de días fijos (E4-01).

## Qué hay que conseguir

1. En «Nuevo entrenamiento», quien quiera marca «Repetir cada semana», elige los días y hasta cuándo, y ve cuántos se van a crear antes de guardar.
2. Al guardar se crean todos a la vez, o ninguno.
3. Los que ya existen a esa misma hora no se repiten.

## Reglas de esta sesión

- Lee solo los archivos de las tablas. No abras más documentos.
- Si algo no cuadra con este traspaso, para y dilo. No improvises ni amplíes el alcance.
- Ahorra contexto: las búsquedas, al subagente `explorador`; lo repetitivo, al `implementador`. No pegues en el chat lo que ya está en los archivos.
- Haz el ciclo completo: rama, un commit, push, PR con la plantilla, CI en verde y squash merge a `main`. **Nunca toques `release`.**
- En la nube `gh pr create` falla, porque usa GraphQL: la PR se abre con `gh api repos/60F10/isAPP/pulls`.
- **Sin migración ni SQL.** La tanda no existe en la base: son filas sueltas de `training_sessions`, iguales que las demás.
- **La edición no cambia.** Repetir solo existe en el alta. Un entrenamiento de una tanda se edita y se borra como cualquier otro, de uno en uno.
- La hora es la del móvil, día a día: un entrenamiento de las 18:00 es a las 18:00 antes y después del cambio de hora. Cada fecha pasa por `aInstante` con su hora; no sumes milisegundos a un instante.
- Accesibilidad al construir: casillas con su etiqueta y 48 px de alto, y el resumen de lo que se va a crear en una región viva `polite`.

## Decidido: el modelo

En `src/modules/training/model/repeticion.ts`, puro y con sus pruebas.

| Pieza                                                       | Qué hace                                                                                                                                                                                                                                                          |
| :---------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DiaDeLaSemana`                                             | De 1, lunes, a 7, domingo                                                                                                                                                                                                                                         |
| `DIAS`                                                      | Los siete, en orden y con su nombre: «Lunes»… «Domingo»                                                                                                                                                                                                           |
| `diaDeLaFecha(fecha)`                                       | El día de la semana de una fecha `2026-10-13`. `null` si la fecha no existe                                                                                                                                                                                       |
| `fechasSemanales({ desde, hasta, dias })`                   | Las fechas, como texto `2026-10-13`, que caen en alguno de `dias` entre `desde` y `hasta`, las dos incluidas y en orden. Recorre el calendario día a día, sin pasar por instantes                                                                                 |
| `MAXIMO_DE_LA_TANDA`                                        | 150                                                                                                                                                                                                                                                               |
| `validarRepeticion({ desde, hasta, dias, finDeTemporada })` | Los errores: sin ningún día, «Elige al menos un día.»; `hasta` vacía o imposible, «Indica hasta qué día.»; `hasta` anterior a `desde`, «Tiene que ser posterior a la fecha de inicio.»; `hasta` después de `finDeTemporada`, «La temporada termina el» y su fecha |
| `planDeLaTanda({ fechas, hora, existentes })`               | Convierte cada fecha con `aInstante` y separa: `nuevos`, los instantes que se van a crear; `repetidos`, los que ya tienen un entrenamiento en ese mismo instante; e `imposibles`, las fechas en las que esa hora no existe                                        |
| Más de 150 nuevos                                           | Error: «Son demasiados de una vez: como mucho, 150.»                                                                                                                                                                                                              |
| Cero nuevos                                                 | Error: «No hay ninguno que crear en esas fechas.»                                                                                                                                                                                                                 |

`existentes` son los `scheduledAt` de la lista que ya carga `useEntrenamientos`. Dos instantes son el mismo si representan el mismo momento: compáralos como `Date`, no como texto.

## Decidido: los datos

| Función                                        | Qué hace                                                                                                                                                                                                    |
| :--------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `crearEntrenamientos(destino, lista)`          | En `api/entrenamientos.ts`. **Un solo `insert`** con todas las filas, que es una sola sentencia: entran todas o ninguna. Cada fila lleva `team_id`, `season_id` y `created_by`. Devuelve cuántas se crearon |
| `fetchFinDeTemporada(temporadaId)`             | En `api/entrenamientos.ts`. Lee `ends_on` de `seasons`. Devuelve la fecha o `null` si no llega fila                                                                                                         |
| `useCrearEntrenamientos` y `useFinDeTemporada` | En `hooks/useEntrenamientos.ts`. La mutación invalida `trainingKeys.all`                                                                                                                                    |
| Sin fin de temporada                           | Si la consulta falla o no trae fila, `finDeTemporada` es `null`: no se valida contra ella y manda solo el máximo de 150                                                                                     |

## Decidido: la pantalla

Todo en `NuevoEntrenamientoPage`, dentro de `routes/EntrenamientoPage.tsx`. `EditarEntrenamientoPage` no cambia.

| Punto                  | Decisión                                                                                                                           |
| :--------------------- | :--------------------------------------------------------------------------------------------------------------------------------- |
| La casilla             | «Repetir cada semana», bajo la hora. Sin marcar, el alta es la de la T-228, sin un solo cambio                                     |
| Al marcarla            | La etiqueta de «Fecha» pasa a «Desde», y aparecen dos campos: «Días», siete casillas en un `fieldset`, y «Hasta», de tipo fecha    |
| Qué trae relleno       | En «Días», marcado el día de la semana de «Desde». «Hasta», el fin de la temporada si se conoce; si no, vacío                      |
| Si cambia «Desde»      | Los días marcados no se tocan: los eligió la persona                                                                               |
| El resumen             | Una línea viva bajo «Hasta», que se recalcula con cada cambio: «Se van a crear 20 entrenamientos, del mar, 13 oct al jue, 17 dic.» |
| Repetidos e imposibles | En el mismo resumen, si los hay: «2 ya existen y no se repiten.» y «1 no se crea porque esa hora no existe ese día.»               |
| El botón               | «Guardar» pasa a «Crear 20 entrenamientos», con el número de `nuevos`                                                              |
| Al guardar bien        | Anuncia «20 entrenamientos creados.» y vuelve a `/entrenamientos`                                                                  |
| Si falla               | El mensaje de `mensajeDeErrorAlGuardar`, anunciado, con el foco en él. No se ha creado ninguno, y el formulario sigue como estaba  |
| Lugar y objetivo       | Los del formulario, iguales en todos                                                                                               |
| Errores                | Los de `validarRepeticion` y `planDeLaTanda`, bajo su campo. El de «Días», en el `fieldset`, con `aria-describedby`                |

## Archivos

| Archivo                                                                                           | Cambio                                        |
| :------------------------------------------------------------------------------------------------ | :-------------------------------------------- |
| `src/modules/training/model/repeticion.ts` y su `.test.ts` (nuevos)                               | El modelo                                     |
| `src/modules/training/api/entrenamientos.ts` y su `.test.ts`                                      | `crearEntrenamientos` y `fetchFinDeTemporada` |
| `src/modules/training/hooks/useEntrenamientos.ts`                                                 | Los dos hooks                                 |
| `src/modules/training/routes/EntrenamientoPage.tsx`, su `.module.css` y `Entrenamientos.test.tsx` | La casilla y lo que abre                      |

## Pruebas

Escríbelas primero y comprueba que fallan. Las de fechas corren en UTC, como el resto: lo que se prueba del cambio de hora es que cada fecha pasa por `aInstante`, con un doble suyo.

| Archivo                   | Caso                                                                                                                                                         |
| :------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `repeticion.test.ts`      | `diaDeLaFecha('2026-10-13')` es 2, martes; el domingo es 7; un 31 de febrero, `null`                                                                         |
| `repeticion.test.ts`      | `fechasSemanales` con martes y jueves, del 13 al 29 de octubre de 2026, da seis fechas en orden, y los dos extremos entran                                   |
| `repeticion.test.ts`      | Cruza el fin de mes y el fin de año sin saltarse ni repetir ninguna                                                                                          |
| `repeticion.test.ts`      | `validarRepeticion`: sin días, sin `hasta`, `hasta` anterior y `hasta` pasada la temporada dan su error; con `finDeTemporada` nulo, no se valida contra ella |
| `repeticion.test.ts`      | `planDeLaTanda`: el que ya existe sale en `repetidos` aunque su texto ISO esté escrito de otra forma; una fecha con `aInstante` nulo sale en `imposibles`    |
| `repeticion.test.ts`      | Con 151 nuevos, el error del máximo; con cero, el de ninguno                                                                                                 |
| `entrenamientos.test.ts`  | `crearEntrenamientos` hace **una** llamada a `insert`, con un arreglo, y cada fila lleva `team_id`, `season_id` y `created_by`                               |
| `Entrenamientos.test.tsx` | Sin marcar la casilla, el alta llama a `crearEntrenamiento`, como antes                                                                                      |
| `Entrenamientos.test.tsx` | Al marcarla sale marcado el día de «Desde», y el resumen dice cuántos se van a crear                                                                         |
| `Entrenamientos.test.tsx` | Con uno que ya existe, el resumen lo dice y `crearEntrenamientos` no lo recibe                                                                               |
| `Entrenamientos.test.tsx` | Sin ningún día, se lee el error y no se llama a la base                                                                                                      |
| `Entrenamientos.test.tsx` | Al guardar se anuncia cuántos se crearon y se vuelve a la lista                                                                                              |

## Pasos

1. Crea la rama desde `main` actualizado y comprueba que la T-229 está.
2. Lee `training/routes/EntrenamientoPage.tsx`, `training/model/entrenamiento.ts` y `shared/lib/instante.ts`.
3. Escribe las pruebas y comprueba que fallan.
4. El modelo, los datos y los hooks.
5. La casilla y lo que abre.
6. Lanza `npm run lint`, `npx prettier --check .`, `npm run test -- --run` y `npm run build`. Sin `INEFFECTIVE_DYNAMIC_IMPORT`. Apunta el inicial comprimido: no puede subir.
7. Mira el alta a 320 px con la casilla marcada, y a 320 px con el texto al 200 %: las siete casillas bajan de línea sin desplazamiento horizontal.
8. Edita la documentación, commitea, sube y abre la PR.
9. Con el CI en verde, fusiona con squash.

## Documentación: edita, no reescribas

| Documento            | Edición                                                                                                                                                             |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/08_TAREAS.md`  | La fila de la T-230 pasa a ✅. Un párrafo de cuatro líneas en el §5b. Sube la versión un decimal                                                                    |
| `docs/13_HANDOFF.md` | **No lo reescribas.** Sección corta encima de la primera «## Sesión»                                                                                                |
| `CLAUDE.md`          | Una frase en el párrafo de la T-228: repetir cada semana crea filas sueltas con un solo `insert`, y la tanda no existe en la base. En «Siguientes tareas», la T-231 |

Deuda que anotar: la tanda no existe en la base, así que mover o borrar todos los de una serie es de uno en uno, y arreglarlo pide una columna nueva y una migración; no hay festivos ni vacaciones, que se borran a mano; el lugar y el objetivo son los mismos en toda la tanda; y dos personas que creen la misma tanda a la vez la duplican, porque nada en la base impide dos entrenamientos a la misma hora.

## Cierre

- Commit y título de la PR: `feat(training): create weekly training sessions in one go`
- En «Cómo lo pruebo» de la PR: con la cuenta de Raúl, «Nuevo entrenamiento», marcar «Repetir cada semana», elegir martes y jueves hasta fin de mes y crear; ver los nuevos en «Próximos»; y repetir lo mismo para comprobar que dice que ya existen y no ofrece crear ninguno.
- Al terminar, di en cuatro líneas: número de la PR, pruebas en verde, inicial comprimido y si quedó fusionada.

## Fuera de esta tarea

Editar o borrar una tanda entera, los festivos, repetir cada dos semanas, los entrenamientos en el calendario y en Inicio (T-231), el historial de asistencia (T-232) y cualquier cambio en la base.
