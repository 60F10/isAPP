# Traspaso T-226 — Suspender el partido desde el directo

> **Esfuerzo:** medio-alto · **Rama:** `feat/match-suspender-partido` · **Depende de:** T-225 fusionada · **Sin migración**
> Preparado el 05/10/2026 sobre `main` en `e735931`. Si un símbolo de los que se nombran aquí no existe, para y dilo.

## Qué falta

Punto 40 del DOC 13 y DOC 04 §8.1. La A12 solo sabe llevar un partido a `finished`, y `finalizar` exige haber jugado todas las partes. Un partido que se suspende en el minuto 23 no tiene salida: se queda en `live` para siempre y no se puede cerrar, porque el cierre solo admite `finished` o `suspended`.

La base ya está preparada: `matches` tiene `suspended_period` y `suspended_seconds`, exige los dos con el estado `suspended` (restricción `matches_suspension`), y pasar a `suspended` pide `match.live.write` o `match.close`. El cierre (A13) ya cierra y reabre partidos suspendidos y dice dónde se suspendieron.

## Qué hay que conseguir

1. Con el partido en juego, en pausa o en el descanso, se puede suspender desde la A12, con una confirmación que dice el minuto.
2. Suspender cierra la parte abierta con sus segundos y deja el partido en `suspended` con la parte y el segundo.
3. La pantalla dice «Partido suspendido en el 23:10 de la 1.ª parte» y enlaza al cierre. Ya no se apunta nada.
4. Los demás aparatos lo ven sin recargar, con su anuncio.

## Reglas de esta sesión

- Lee solo los archivos de la tabla. No abras los DOC enteros ni delegues en subagentes.
- Si algo no cuadra con este traspaso, para y dilo. No improvises ni amplíes el alcance.
- Haz el ciclo completo. Rama, un commit, push, PR con la plantilla, CI en verde y squash merge a `main`. **Nunca toques `release`.**
- **Sin migración y sin tocar la base.**
- **Las transiciones que ya existen no cambian**: `empezar_parte`, `pausar`, `reanudar`, `terminar_parte` y `finalizar` se quedan como están, y sus pruebas pasan sin tocarlas.
- **Un refresco nunca se come un toque**: el contador `guardados`, el cerrojo `guardando`, `ultimo` y `poner` se quedan como están.
- Cada transición se guarda con sus filas en una sola transacción (D06-30): suspender va por `hacer`, como las demás.
- Los `model/` no importan barriles en tiempo de ejecución. `match` no importa de `logging`.
- Objetivos de 48 px en el directo. Ningún color escrito a mano.

## Decidido

| Punto                             | Decisión                                                                                                                                                                                                                                                                                                                                                                                      |
| :-------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La acción                         | `{ tipo: 'suspender'; ahora: number }`, nueva en `Accion`                                                                                                                                                                                                                                                                                                                                     |
| Cuándo es legal                   | Con la fase `en_juego`, `pausado` o `descanso`, y sin diferido. Si no: «El partido no ha empezado.», «El partido ya ha terminado.» o «En diferido, el partido se termina desde el cierre.»                                                                                                                                                                                                    |
| Con una parte abierta             | Se cierra igual que en `terminar_parte`: los mismos segundos, descontada la pausa, y el mismo trabajo, por `match_id` y `period_number`. Saca esa parte del `case 'terminar_parte'` a una función común y úsala en los dos sitios, sin cambiar lo que hace                                                                                                                                    |
| Dónde se suspende                 | `parte`: el número de la última parte. `segundos`: sus segundos reales, recién cerrada o ya cerrada si es el descanso                                                                                                                                                                                                                                                                         |
| Los trabajos, en este orden       | Primero el cierre de la parte, si estaba abierta. Después un `update` de `match` con `valores: { status: 'suspended', suspended_period, suspended_seconds }` y `clave: { id }`. La cola los envía en orden                                                                                                                                                                                    |
| El estado                         | La fase pasa a `finalizado`, que es como `desdePaquete` lee ya un partido suspendido. `EstadoDirecto` gana `suspension: { parte: number; segundos: number } \| null`                                                                                                                                                                                                                          |
| `desdePaquete`                    | `suspension` sale del paquete si el estado es `suspended` y trae los dos valores; si no, `null`                                                                                                                                                                                                                                                                                               |
| El paquete                        | `COLUMNAS_PARTIDO` pide `suspended_period` y `suspended_seconds`. `PartidoPrecargado` gana `suspendedPeriod` y `suspendedSeconds`, opcionales: un paquete guardado de antes no los trae y valen `null`                                                                                                                                                                                        |
| Un estado guardado de antes       | No trae `suspension`. Se lee como `null` al cargar, sin descartar el estado: `esCompleto` no lo exige                                                                                                                                                                                                                                                                                         |
| `elegirEstado`                    | Un solo cambio: `suspension` es la del aparato si la tiene, y si no la del servidor. Entra en la comparación de «no cambia nada» y en los dos objetos que devuelve. `conciliarPartes`, `faseConciliada` y `fusionar` no se tocan                                                                                                                                                              |
| El anuncio entre aparatos (T-223) | Si al fundir la fase pasa a `finalizado` y hay `suspension`: «Otro aparato ha suspendido el partido.», en vez de «…ha finalizado el partido.»                                                                                                                                                                                                                                                 |
| El botón                          | «Suspender el partido», variante `ghost`, de 48 px, **al final de la pantalla, debajo de «Últimos eventos»**: lejos del pulgar. Solo se pinta con el partido en curso y sin diferido                                                                                                                                                                                                          |
| La confirmación                   | En el sitio del botón, con el componente `Confirmar`. Pregunta: «¿Suspender el partido en el 23:10 de la 1.ª parte? No se puede reanudar: después solo queda cerrarlo.» En el descanso: «¿Suspender el partido en el descanso, tras la 1.ª parte? No se puede reanudar: después solo queda cerrarlo.» Botón: «Sí, suspender el partido». El foco va a la pregunta, y con «No» vuelve al botón |
| Al suspender                      | Se anuncia «Partido suspendido» y se cierra la cobertura, como al finalizar (`terminarCobertura`)                                                                                                                                                                                                                                                                                             |
| La nota final                     | Con `suspension`: «Partido suspendido en el 23:10 de la 1.ª parte. Queda marcado como incompleto.», con el mismo enlace al cierre. Sin ella, la de ahora. El foco, como ya hace la T-223 al finalizar                                                                                                                                                                                         |
| En diferido                       | Fuera. El botón no sale. Se anota como deuda                                                                                                                                                                                                                                                                                                                                                  |
| Deshacer una suspensión           | Fuera. La confirmación lo avisa. Reabrir desde el cierre lo deja en `suspended`, como ya hace                                                                                                                                                                                                                                                                                                 |

## Archivos

| Archivo                                                                         | Cambio                                                                                       |
| :------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------- |
| `src/modules/match/model/directo.ts` y `directo.test.ts`                        | La acción, `suspension` en el estado, `desdePaquete` y el cambio de `elegirEstado`           |
| `src/modules/match/model/paquete.ts`                                            | Los dos campos opcionales de `PartidoPrecargado`                                             |
| `src/modules/match/api/precarga.ts` y `precarga.test.ts`                        | Las dos columnas                                                                             |
| `src/modules/match/api/directo.ts` y `directo.test.ts`                          | Leer como `null` la `suspension` que falte en un estado guardado                             |
| `src/modules/match/routes/LiveMatchPage.tsx`, su `.module.css` y su `.test.tsx` | El botón, la confirmación, la nota y el anuncio                                              |
| `src/modules/review/` y `src/modules/sync/`                                     | Solo si el tipo nuevo rompe algo. El transporte manda `valores` tal cual: no debería cambiar |

## Pruebas

Escríbelas primero y comprueba que fallan.

| Archivo                  | Caso                                                                                                                                                                                     |
| :----------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model/directo.test.ts`  | Suspender en juego a los 23:10 de la parte 1: fase `finalizado`, la parte cerrada con 1.390 s, `suspension` `{ parte: 1, segundos: 1390 }` y dos trabajos, parte y partido, en ese orden |
| `model/directo.test.ts`  | El trabajo del partido lleva `status`, `suspended_period` y `suspended_seconds`, y nada más                                                                                              |
| `model/directo.test.ts`  | Suspender en pausa descuenta la pausa, igual que terminar la parte                                                                                                                       |
| `model/directo.test.ts`  | Suspender en el descanso: un solo trabajo, el del partido, con los segundos reales de la parte 1                                                                                         |
| `model/directo.test.ts`  | Sin empezar, ya finalizado y en diferido: ilegal, sin trabajos y con su mensaje                                                                                                          |
| `model/directo.test.ts`  | `desdePaquete` con el partido `suspended` y sus dos valores: `suspension` rellena. Con un paquete de antes, sin los campos: `null`                                                       |
| `model/directo.test.ts`  | `elegirEstado` con el aparato en juego y el servidor suspendido: fase `finalizado` y la `suspension` del servidor. Sin diferencias, sigue devolviendo el mismo objeto                    |
| `api/directo.test.ts`    | Un estado guardado sin `suspension` se carga y no se descarta                                                                                                                            |
| `precarga.test.ts`       | La consulta del partido pide las dos columnas                                                                                                                                            |
| `LiveMatchPage.test.tsx` | En juego, «Suspender el partido» pregunta con el minuto; «No» no encola nada y devuelve el foco al botón                                                                                 |
| `LiveMatchPage.test.tsx` | Al confirmar: se anuncia «Partido suspendido», la nota dice dónde, el flujo de registro ya no está y la cobertura se cierra                                                              |
| `LiveMatchPage.test.tsx` | En diferido y con el partido sin empezar, el botón no está                                                                                                                               |
| `LiveMatchPage.test.tsx` | Un refresco trae el partido suspendido por otro: se anuncia «Otro aparato ha suspendido el partido.»                                                                                     |

## Pasos

1. Crea la rama desde `main` actualizado.
2. Lee `model/directo.ts` entero, `model/paquete.ts`, `api/precarga.ts`, `api/directo.ts` y, de `LiveMatchPage.tsx`, `controles`, `finalizar`, `terminarCobertura`, `Confirmar` y el anuncio del refresco.
3. Escribe las pruebas y comprueba que fallan.
4. El modelo: la acción, el estado, `desdePaquete` y `elegirEstado`.
5. El paquete y la precarga.
6. La pantalla.
7. Lanza `npm run lint`, `npx prettier --check .`, `npm run test -- --run` y `npm run build`. Todo en verde y sin `INEFFECTIVE_DYNAMIC_IMPORT`.
8. Edita la documentación, commitea, sube y abre la PR.
9. Con el CI en verde, fusiona con squash.

## Documentación: edita, no reescribas

| Documento                               | Edición                                                                                                                                                                                                                                                 |
| :-------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/06_Arquitectura_Frontend.md` §5.4 | Párrafo nuevo, «**D06-41**»: suspender es una transición del reductor que cierra la parte abierta y deja el partido en `suspended` con parte y segundo; la fase local es `finalizado` y lo que lo distingue es `suspension`. Sube la versión un decimal |
| `docs/08_TAREAS.md`                     | La fila de la T-226 pasa a ✅. Un párrafo de tres líneas. Sube la versión un decimal                                                                                                                                                                    |
| `docs/13_HANDOFF.md`                    | **No lo reescribas.** Sección corta encima de la primera «## Sesión». En el punto 40, una línea: cerrado por la T-226, salvo el diferido                                                                                                                |
| `CLAUDE.md`                             | En el párrafo de la T-207, una frase: desde la T-226 el reductor tiene `suspender`, y un partido suspendido es fase `finalizado` con `suspension`                                                                                                       |

Deuda que anotar: en diferido no se puede suspender desde la aplicación; una suspensión no se deshace, ni desde el directo ni reabriendo desde el cierre; y está sin probar contra la base de verdad y en un móvil.

## Cierre

- Commit y título de la PR: `feat(match): suspend a match from the live screen`
- En «Cómo lo pruebo» de la PR, para Raúl: en un partido **de prueba**, empezar la primera parte, bajar al final, suspender y mirar que el cierre dice dónde se suspendió. No lo pruebes en un partido de verdad: no se deshace.
- Al terminar, di en tres líneas: número de la PR, pruebas en verde y si quedó fusionada.

## Fuera de esta tarea

Suspender en diferido, reanudar un partido suspendido, sincronizar la pausa y cualquier cambio en la base.
