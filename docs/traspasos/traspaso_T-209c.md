# Traspaso T-209c — Las partes, compartidas entre aparatos

> **Esfuerzo:** medio · **Rama:** `fix/match-partes-compartidas` · **Depende de:** T-209b fusionada · **Sin migración**
> Preparado el 04/10/2026. Si `fusionar` no existe en `src/modules/match/model/directo.ts`, la T-209b no está: para y dilo.

## Qué falla

Punto 39 del DOC 13. Dos aparatos abren la misma parte, cada uno con su `id`. El segundo choca con el índice único de `(match_id, period_number)`, la cola lo da por bueno, y ese aparato se queda con un `id` que no existe en la base y con el reloj anclado a su propio toque. Al terminar la parte, su `update` por `id` no toca ninguna fila y sale como rechazado en la banda.

Además, cuando el servidor va más avanzado, `elegirEstado` devuelve su estado entero y los eventos que este aparato tiene sin enviar desaparecen de la pantalla hasta el siguiente refresco.

## Qué hay que conseguir

1. Si otro aparato abrió la parte, este adopta su `id` y su arranque: los dos relojes marcan lo mismo.
2. Si otro aparato cerró la parte o finalizó el partido, este lo ve sin recargar.
3. Terminar una parte funciona aunque el `id` local no sea el de la base.
4. Lo que este aparato tiene sin enviar no desaparece nunca de su pantalla.

## Reglas de esta sesión

- Lee solo los archivos de la tabla. No abras documentos ni delegues en subagentes.
- Si algo no cuadra con este traspaso, para y dilo. No improvises ni amplíes el alcance.
- Haz el ciclo completo. Rama, un commit, push, PR con la plantilla, CI en verde y squash merge a `main`. **Nunca toques `release`.**
- **Sin migración.**
- **La pausa sigue siendo local** (D06-30): el servidor no la conoce y no se sincroniza aquí.
- Todo el cambio es del modelo puro. La página no debería cambiar más que en un texto.
- La cobertura (T-209a) usa las partes para su instante: no cambies la forma de `ParteLocal`.

## Decidido

| Punto                                          | Decisión                                                                                                                                                                                              |
| :--------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dónde                                          | `elegirEstado`, en `match/model/directo.ts`. Lo usan `cargarDirecto` y el refresco de la T-209b por `fusionar`, así que vale para los dos                                                             |
| Misma parte, otro `id`                         | Para cada parte local cuyo número está en el servidor: se toman del servidor `id` e `inicio`. `pausadoMs` y `pausaDesde` se quedan los locales                                                        |
| Parte cerrada en el servidor, abierta en local | Se cierra con los `segundosReales` del servidor y se quita la pausa                                                                                                                                   |
| Parte cerrada en local, abierta en el servidor | Se queda cerrada: el cierre de este aparato está en la cola                                                                                                                                           |
| Parte que el servidor tiene y el local no      | Se añade                                                                                                                                                                                              |
| Parte que el local tiene y el servidor no      | Se queda: su alta está en la cola                                                                                                                                                                     |
| La fase                                        | Se deriva de las partes conciliadas con la misma regla de `desdePaquete`, salvo dos casos: `finalizado` en cualquiera de los dos gana, y `pausado` local se conserva si la última parte sigue abierta |
| Los eventos                                    | Siempre los locales. Unirlos con los del servidor y quitar los borrados es de `fusionar`, que ya lo hace después. `elegirEstado` deja de devolver `servidor` entero cuando hay estado local           |
| Terminar una parte                             | El trabajo de `terminar_parte` pasa de `clave: { id }` a `clave: { match_id, period_number }`, con el número como texto: `clave` es `Record<string, string>`                                          |
| Dos cierres de la misma parte                  | Gana el último que llega, con unos segundos de diferencia. Se acepta y se anota como deuda                                                                                                            |
| Empezar una parte que ya existe                | No cambia: la inserción choca, la cola la da por buena y el siguiente refresco adopta el `id` y el arranque del servidor                                                                              |
| En diferido                                    | Nada de esto aplica al reloj. La regla de las partes vale igual                                                                                                                                       |

## Archivos

| Archivo                                   | Cambio                                                                                                                                                                                                                    |
| :---------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/modules/match/model/directo.ts`      | `conciliarPartes(local, servidor)` y `elegirEstado` reescrita sobre ella; la `clave` de `terminar_parte`                                                                                                                  |
| `src/modules/match/model/directo.test.ts` | Los casos de abajo. Las pruebas de `elegirEstado` que ya hay tienen que seguir pasando, salvo las que esperan el estado del servidor entero: esas se reescriben para esperar partes y fase del servidor y eventos locales |
| `src/modules/match/api/directo.test.ts`   | Un caso de extremo a extremo                                                                                                                                                                                              |

## Pruebas

Escríbelas primero y comprueba que fallan.

| Archivo               | Caso                                                                                                                                         |
| :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------------- |
| `directo.test.ts`     | Local con la parte 1 de `id` B y arranque a las 12:00:05; servidor con la parte 1 de `id` A a las 12:00:00: queda `id` A y arranque 12:00:00 |
| `directo.test.ts`     | Lo mismo con el local en pausa: sigue `pausado`, con su `pausaDesde`                                                                         |
| `directo.test.ts`     | El servidor cerró la parte 1 con 2.430 s: el local pasa a `descanso` con esos segundos                                                       |
| `directo.test.ts`     | El servidor tiene la parte 2 abierta y el local está en `descanso`: pasa a `en_juego` con la parte 2 del servidor                            |
| `directo.test.ts`     | El servidor está finalizado: fase `finalizado` y los eventos locales siguen                                                                  |
| `directo.test.ts`     | El local cerró la parte y el servidor aún no: sigue cerrada                                                                                  |
| `directo.test.ts`     | Sin diferencias, devuelve el mismo objeto: no provoca un repintado                                                                           |
| `directo.test.ts`     | `terminar_parte` encola un `update` con `clave` de `match_id` y `period_number`                                                              |
| `api/directo.test.ts` | Con un evento local sin enviar y el servidor más avanzado, `cargarDirecto` lo conserva                                                       |

## Pasos

1. Crea la rama desde `main` actualizado.
2. Lee `model/directo.ts` entero y las pruebas de `elegirEstado`.
3. Escribe las pruebas y comprueba que fallan.
4. `conciliarPartes` y `elegirEstado`.
5. La `clave` de `terminar_parte`.
6. Lanza `npm run lint`, `npx prettier --check .`, `npm run test -- --run` y `npm run build`. Todo en verde.
7. Edita la documentación, commitea, sube y abre la PR.
8. Con el CI en verde, fusiona con squash.

## Documentación: edita, no reescribas

| Documento                               | Edición                                                                                                                                                                   |
| :-------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/06_Arquitectura_Frontend.md` §5.4 | Párrafo «**D06-39**»: las partes se concilian por número, el `id` y el arranque son del primero que llegó al servidor, y la pausa sigue local. Sube la versión un decimal |
| `docs/08_TAREAS.md`                     | La fila de la T-209c pasa a ✅. Un párrafo de cuatro líneas. Sube la versión un decimal                                                                                   |
| `docs/13_HANDOFF.md`                    | **No lo reescribas.** Sección corta encima de la primera «## Sesión». En el punto 39, una línea: cerrado, salvo la pausa                                                  |
| `CLAUDE.md`                             | En el párrafo de la T-207, una frase: las partes se concilian por número con el servidor                                                                                  |

Deuda que anotar: la pausa de un aparato no la ven los demás, y con reloj corrido apenas se usa; los relojes de dos móviles pueden diferir unos segundos y el ancla es la hora del que abrió la parte; y dos cierres casi a la vez dejan la duración del último.

## Cierre

- Commit y título de la PR: `fix(match): reconcile periods opened by another device`
- En «Cómo lo pruebo» de la PR, para Raúl: dos sesiones en un partido de prueba, empezar la parte en las dos con unos segundos de diferencia, esperar al refresco y comparar los relojes; terminar la parte desde la segunda.
- Al terminar, di en tres líneas: número de la PR, pruebas en verde y si quedó fusionada.

## Fuera de esta tarea

Sincronizar la pausa, suspender un partido desde el directo (DOC 13, punto 40), la banda «Partido en directo» del resto de pantallas (punto 41) y cualquier cambio en la base.
