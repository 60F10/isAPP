# Traspaso T-237 — Pruebas en navegador: el día de partido

> **Modelo y esfuerzo:** Opus, medio · **Rama:** `test/match-dia-de-partido-en-navegador` · **Depende de:** T-236 fusionada · **Sin migración**
> Preparado el 08/10/2026. Si `e2e/README.md` no existe, la T-236 no está: para y dilo.

## Qué falta

La T-236 deja el andamio y unas pruebas de entrada. El camino que decide si el proyecto funciona —convocar, apuntar un partido y cerrarlo— sigue sin recorrerse contra una base de verdad. El sábado 17 es la prueba de campo (T-302): lo que estas pruebas destapen antes, no se descubre en el campo.

## Qué hay que conseguir

Un partido entero, de principio a fin, recorrido en el navegador contra la base local, comprobando en la base lo que guardó cada pantalla.

## Reglas de esta sesión

- Lee `e2e/README.md` antes que nada y sigue lo que dice. Usa las ayudas de `e2e/ayudas/`; si falta una, añádela ahí.
- Para saber qué botones y qué textos hay, lee `docs/traspasos/` o el guion de la prueba de campo solo si lo necesitas: lo primero es la pantalla, en `src/modules/agenda`, `lineup`, `match` y `review`.
- **No arregles la aplicación.** Lo que una prueba destape va al informe y al DOC 13 como punto nuevo, y la prueba queda con `test.fixme` y el número del punto.
- **Nunca contra producción**, ni una URL ni una clave del proyecto real.
- Aquí no hay Docker: se desarrolla contra GitHub Actions. **Un solo commit**, enmendado y subido con `--force-with-lease`. Como mucho **doce subidas**; si a la duodécima no está en verde, deja la PR abierta, informa «T-237 NO HECHA» y termina.
- Cada prueba crea su propio partido y no depende de lo que dejó otra.
- El partido se apunta **en diferido**, con el reloj parado: un reloj corriendo vuelve las pruebas lentas y frágiles. Una sola prueba, corta, usa el reloj de verdad.
- Haz el ciclo completo. **Nunca toques `release`.** `gh pr create` falla: la PR se abre con `gh api repos/60F10/isAPP/pulls`.

## Las pruebas

| Archivo                     | Caso                                                                                                                                                                  |
| :-------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/partido.spec.ts`       | El entrenador da de alta un partido en diferido contra el rival de pruebas y lo ve en el calendario                                                                   |
| `e2e/partido.spec.ts`       | Guarda la convocatoria con once titulares y tres suplentes: en la base, el partido pasa a `called` y `match_squad` tiene catorce líneas                               |
| `e2e/partido.spec.ts`       | Con doce titulares, la pantalla no deja guardar                                                                                                                       |
| `e2e/partido.spec.ts`       | Apunta, en diferido: un gol con asistencia, un gol del rival, una amarilla y un cambio. En la base hay cuatro eventos `approved`, con su `created_by` y su `match_id` |
| `e2e/partido.spec.ts`       | Tras el cambio, quien salió ya no se ofrece para un gol posterior, y quien entró, sí                                                                                  |
| `e2e/partido.spec.ts`       | «Deshacer» el último evento lo quita de la pantalla y de la base                                                                                                      |
| `e2e/partido.spec.ts`       | Finaliza y cierra: el partido queda `closed`, `player_match_stints` tiene tramos para los que jugaron, y el calendario lo enseña entre los jugados con su resultado   |
| `e2e/partido.spec.ts`       | Reabre y vuelve a cerrar: sigue cuadrando                                                                                                                             |
| `e2e/anotador.spec.ts`      | El anotador apunta un gol en un partido convocado: en la base nace `pending`. El cierre del entrenador no deja cerrar hasta aprobarlo; lo aprueba y cierra            |
| `e2e/anotador.spec.ts`      | El anotador no ve «Editar» ni «Convocatoria» en el calendario, y `/partidos/nuevo` le lleva a la pantalla de sin permiso                                              |
| `e2e/reloj.spec.ts`         | Un partido con reloj: empezar la primera parte, apuntar un córner, terminar la parte. En la base, la parte tiene su arranque y su cierre, y el evento, sus segundos   |
| `e2e/reloj.spec.ts`         | Recargar la página a media parte: el directo vuelve en la misma fase, con el evento apuntado                                                                          |
| `e2e/accesibilidad.spec.ts` | Se suman la convocatoria, el directo y el cierre, a 360 y a 320 de ancho, con la regla de exclusión por identificador de la T-236                                     |

Si un caso no se puede escribir porque la pantalla no ofrece lo que pide, no lo fuerces: quítalo y di por qué en el informe.

## Documentación: edita, no reescribas

| Documento            | Edición                                                                                                                                           |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/08_TAREAS.md`  | La fila de la T-237 pasa a ✅. Un párrafo de cuatro líneas en el §6b. Sube la versión un decimal                                                  |
| `docs/13_HANDOFF.md` | **No lo reescribas.** Sección corta encima de la primera «## Sesión»: qué pasa, qué quedó en `test.fixme` y por qué, y los puntos nuevos al final |
| `e2e/README.md`      | Lo que hayas aprendido y le sirva a la siguiente: cómo crear un partido ya convocado desde una prueba, cuánto tarda                               |

## Cierre

- Commit y título de la PR: `test(match): cover match day end to end in the browser`
- Al terminar, di: número de la PR, cuántas pruebas pasan, cuáles quedaron en `test.fixme` y qué fallo destapa cada una, cuánto tarda el flujo y si quedó fusionada.
- **Lo que destapes importa para el sábado 17.** Ponlo lo primero del informe, de más grave a menos.

## Fuera de esta tarea

Arreglar lo que las pruebas destapen, dos aparatos anotando a la vez, el modo sin conexión, suspender un partido, las personas y los entrenamientos (T-238).
