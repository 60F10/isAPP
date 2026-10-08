# Traspaso T-238 — Pruebas en navegador: personas y entrenamientos

> **Modelo y esfuerzo:** Opus, medio · **Rama:** `test/training-personas-y-entrenamientos-en-navegador` · **Depende de:** T-237 fusionada · **Sin migración**
> Preparado el 08/10/2026. Si `e2e/partido.spec.ts` no existe, la T-237 no está: para y dilo.

## Qué falta

Quedan sin recorrer contra una base de verdad las dos cosas que más dependen de los permisos: cómo entra alguien nuevo al equipo (T-301b y T-301c) y los entrenamientos (T-228 a T-230), que se hicieron la noche del 08/10 sin nadie delante.

## Qué hay que conseguir

Las invitaciones, seguir a un equipo, pedir permisos y los entrenamientos, recorridos en el navegador contra la base local, comprobando en la base lo que guardó cada pantalla y **lo que cada persona puede leer**.

## Reglas de esta sesión

- Lee `e2e/README.md` antes que nada y sigue lo que dice. Usa las ayudas de `e2e/ayudas/`.
- Hace falta una cuarta persona, sin equipo: `nuevo@e2e.test`. Añádela a la preparación.
- **No arregles la aplicación.** Lo que una prueba destape va al informe y al DOC 13 como punto nuevo, y la prueba queda con `test.fixme` y el número del punto.
- **Nunca contra producción.**
- Aquí no hay Docker: se desarrolla contra GitHub Actions. **Un solo commit**, enmendado y subido con `--force-with-lease`. Como mucho **doce subidas**; si a la duodécima no está en verde, deja la PR abierta, informa «T-238 NO HECHA» y termina.
- **La base de pruebas tiene las políticas de `supabase/migrations/`, no las de `supabase/pendientes/`.** Mira si `entrenamientos_quien_ve_que.sql` sigue en `pendientes/` o ya pasó a `migrations/`, y escribe las pruebas de lectura según lo que haya: hasta que Raúl aplique la T-227, cualquier miembro del equipo lee la asistencia por la API.
- Haz el ciclo completo. **Nunca toques `release`.** `gh pr create` falla: la PR se abre con `gh api repos/60F10/isAPP/pulls`.

## Las pruebas

| Archivo                      | Caso                                                                                                                                                                             |
| :--------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/personas.spec.ts`       | El entrenador invita a `nuevo@e2e.test` como delegado con dos permisos. Esa persona entra, ve la invitación en Inicio, la acepta y ve el calendario del equipo                   |
| `e2e/personas.spec.ts`       | En la base, tras aceptar: una fila en `team_members` y exactamente esos dos permisos                                                                                             |
| `e2e/personas.spec.ts`       | El entrenador le marca un permiso más desde «Personas», y la persona, al recargar, puede hacer lo que antes no                                                                   |
| `e2e/personas.spec.ts`       | El entrenador no puede quitarse `members.manage` ni darse de baja a sí mismo                                                                                                     |
| `e2e/personas.spec.ts`       | Una persona sin equipo sigue al equipo de pruebas desde «Unirse a un equipo» y ve el calendario sin esperar a nadie                                                              |
| `e2e/personas.spec.ts`       | Pide permisos con un mensaje; el entrenador ve la solicitud en «Personas», la acepta con un rol, y la persona pasa a miembro                                                     |
| `e2e/entrenamientos.spec.ts` | El entrenador crea un entrenamiento, lo ve en «Próximos», lo edita y lo borra                                                                                                    |
| `e2e/entrenamientos.spec.ts` | «Entrenamiento de hoy» crea uno y abre su lista. Marca dos ausentes y un retraso, escribe una observación y guarda: en la base hay catorce filas con su estado y su `created_by` |
| `e2e/entrenamientos.spec.ts` | Con «Todos sin marcar», marca a tres y guarda: en la base hay tres filas, no catorce                                                                                             |
| `e2e/entrenamientos.spec.ts` | Marca, recarga sin guardar y lee que hay cambios sin guardar de antes                                                                                                            |
| `e2e/entrenamientos.spec.ts` | Repite cada semana, dos días, tres semanas: se crean seis. Repetirlo dice que ya existen y no crea ninguno                                                                       |
| `e2e/entrenamientos.spec.ts` | El anotador ve el horario sin ningún botón que escriba, y `/entrenamientos/nuevo` le lleva a la pantalla de sin permiso                                                          |
| `e2e/entrenamientos.spec.ts` | Con `supabase-js` desde Node: el anotador no puede insertar ni cambiar una fila de `training_attendance`, y el seguidor no lee ningún entrenamiento                              |
| `e2e/entrenamientos.spec.ts` | La lectura de la asistencia por el anotador: denegada si la T-227 ya está en `migrations/`; si no, la prueba deja escrito que hoy la lee, con un comentario que cita la T-227    |
| `e2e/accesibilidad.spec.ts`  | Se suman «Personas», «Unirse a un equipo», «Entrenamientos», el alta y la lista de asistencia, a 360 y a 320 de ancho                                                            |

Si los entrenamientos ya salen en el calendario (T-231), añade una prueba: un entrenamiento de mañana se ve en el calendario y en Inicio.

## Documentación: edita, no reescribas

| Documento            | Edición                                                                                                                                           |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/08_TAREAS.md`  | La fila de la T-238 pasa a ✅. Un párrafo de cuatro líneas en el §6b. Sube la versión un decimal                                                  |
| `docs/13_HANDOFF.md` | **No lo reescribas.** Sección corta encima de la primera «## Sesión»: qué pasa, qué quedó en `test.fixme` y por qué, y los puntos nuevos al final |
| `e2e/README.md`      | Lo que le sirva a quien escriba la siguiente                                                                                                      |

## Cierre

- Commit y título de la PR: `test(training): cover people and training sessions in the browser`
- Al terminar, di: número de la PR, cuántas pruebas pasan, cuáles quedaron en `test.fixme` y qué fallo destapa cada una, y si quedó fusionada.

## Fuera de esta tarea

Arreglar lo que las pruebas destapen, el registro de errores, «Mis aportaciones», el club y las competiciones, y aplicar la T-227.
