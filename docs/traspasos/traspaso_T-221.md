# Traspaso T-221 — Arreglos de la revisión: la banda y la cobertura

> **Esfuerzo:** medio · **Rama:** `fix/match-arreglos-de-la-revision` · **Depende de:** T-209a y T-219 fusionadas · **Sin base de datos**
> Preparado el 04/10/2026 sobre `main` en `00669e9` y repasado sobre `e633df4`: los símbolos siguen ahí. `LiveMatchPage.tsx` ha crecido con la T-209b (el refresco y el contador `guardados`): no los toques. Si un símbolo de los que se nombran aquí no existe, para y dilo.

## Qué es

Diez arreglos que salieron de revisar la T-219 y la T-209a (DOC 13, puntos 74 y 75). Ninguno cambia el esquema ni el reductor del partido.

## Reglas de esta sesión

- Lee solo los archivos de la tabla. No abras los DOC enteros ni delegues en subagentes.
- Si algo no cuadra con este traspaso, para y dilo. No improvises ni amplíes el alcance.
- Haz el ciclo completo. Rama, un commit, push, PR con la plantilla, CI en verde y squash merge a `main`. **Nunca toques `release`.**
- **No toques el reductor** (`match/model/directo.ts`) ni `EstadoDirecto`.
- La cola no sabe qué es un gol: no leas el `payload` de un trabajo. Sí conoce su `entity`.
- `match` no importa de `logging` (DOC 06 §4.2): no añadas `registrarError` en `match`.
- **Nada de esto puede comerse un toque del directo**: no uses `guardando.current` para la cobertura.
- Objetivos de 48 px en el directo y en la banda. Ningún color escrito a mano.

## La banda (`sync`)

| #   | Qué pasa hoy                                                                                                                           | Qué tiene que pasar                                                                                                                                                                                                                                                                                             |
| :-- | :------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Al pulsar «Descartar», el botón se desmonta y el foco cae en `body`. Lo mismo al decir «No» y al descartar                             | Al abrir la confirmación, el foco va a su pregunta, con `tabIndex={-1}`. Con «No», vuelve al «Descartar» de ese elemento. Tras descartar, al «Descartar» del elemento siguiente; si no hay, al del anterior; si no queda ninguno y la banda sigue, a su titular; si la banda desaparece, al `h1` de la pantalla |
| 2   | Todos los botones se llaman «Descartar», y «Sí, descartar» y «No» no dicen de qué                                                      | «Descartar» lleva `aria-label` con el nombre y la hora del elemento. La confirmación es un `role="group"` con ese mismo nombre                                                                                                                                                                                  |
| 3   | Si Dexie falla al descartar, la promesa se queda sin recoger y la confirmación no se cierra. Si ya no estaba, se cierra sin decir nada | Con fallo: se anuncia «No se ha podido descartar. Vuelve a intentarlo.» y la confirmación sigue abierta. Si devuelve `false`: «Eso ya no estaba en la lista.» y se cierra                                                                                                                                       |
| 4   | `descartarRechazado` lee, comprueba y borra en tres pasos sueltos                                                                      | Una sola operación: `db.outbox.where('id').equals(id).and((t) => t.status === 'failed' && t.userId === userId).delete()`, y devuelve si borró alguno                                                                                                                                                            |
| 5   | El anuncio dice siempre «Anotación descartada»                                                                                         | `Descartado: <nombre de la entidad>`                                                                                                                                                                                                                                                                            |

## La cobertura (`match`)

| #   | Qué pasa hoy                                                                                                                                                     | Qué tiene que pasar                                                                                                                                                                                                                                                                                        |
| :-- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6   | La cobertura guardada no dice de quién es. Si otra cuenta entra en ese móvil con una abierta, no declara la suya y al salir encola un cierre que la base rechaza | `CoberturaLocal` gana `userId`. `leerCobertura(partidoId, userId)` solo devuelve la de esa persona. Una guardada sin `userId` se da por propia. Dentro de `aplicar`, una abierta de otra persona cuenta como ninguna: se pisa en el aparato y **no se encola su cierre**; la termina el cierre del partido |
| 7   | Si la instantánea ya tenía otra abierta, `cambiarCobertura` no guarda nada y la pantalla anuncia el cambio igualmente                                            | `declararCobertura`, `cerrarCobertura` y `cambiarCobertura` devuelven `{ cobertura, aplicado }`. Sin aplicar, la pantalla pone la que hay y anuncia «No se ha cambiado: este dispositivo ya tenía otra abierta.»                                                                                           |
| 8   | `irse` espera a que se guarde el cierre de la cobertura antes de navegar, sin límite. Si IndexedDB se cuelga, «Salir» no sale                                    | Espera como mucho 1,5 s y navega igual. El cierre sigue su curso; si no llega, la termina el cierre del partido                                                                                                                                                                                            |
| 9   | Abrir el directo sin red deja el alta de la cobertura en la cola, y al salir dice «Hay 1 anotación sin enviar» sin haber apuntado nada                           | `contarPendientes(userId, { sin: ['coverage'] })`: un segundo argumento opcional con las entidades que no cuentan. El directo lo usa al salir. La banda no cambia                                                                                                                                          |
| 10  | `coberturaMirada` se marca antes de saber si hay `userId`: si llegara `null` la primera vez, no se declara nunca                                                 | La marca se pone solo cuando hay `userId`                                                                                                                                                                                                                                                                  |

## Archivos

| Archivo                                                                                    | Cambio                                                                                                                            |
| :----------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| `src/modules/sync/api/almacen.ts` y `almacen.test.ts`                                      | Arreglos 4 y 9. La prueba de `descartarRechazado`, sobre Dexie de verdad con `fake-indexeddb`, como `match/api/cobertura.test.ts` |
| `src/modules/sync/index.ts`                                                                | Solo si cambia el tipo de lo que ya exporta                                                                                       |
| `src/modules/sync/components/BandaDeSincronizacion.tsx`, su `.module.css` y su `.test.tsx` | Arreglos 1, 2, 3 y 5                                                                                                              |
| `src/modules/match/model/cobertura.ts` y su `.test.ts`                                     | `userId` en `CoberturaLocal` y en lo que devuelve `declarar`                                                                      |
| `src/modules/match/api/cobertura.ts` y su `.test.ts`                                       | Arreglos 6 y 7                                                                                                                    |
| `src/modules/match/routes/LiveMatchPage.tsx` y su `.test.tsx`                              | Arreglos 6 a 10                                                                                                                   |
| `src/modules/review/`                                                                      | Solo si el tipo nuevo de `CoberturaLocal` rompe algo: la tarjeta «Coberturas» lee de la base, no de aquí                          |

## Pruebas

Escríbelas primero y comprueba que fallan.

| Archivo                          | Caso                                                                                                                                                         |
| :------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `almacen.test.ts`                | `descartarRechazado` borra un `failed` propio y devuelve `true`; con `pending`, `sending`, `sent`, de otra cuenta o sin existir, no borra y devuelve `false` |
| `almacen.test.ts`                | `contarPendientes` con `sin: ['coverage']` no cuenta los trabajos de cobertura; sin el argumento, los cuenta                                                 |
| `BandaDeSincronizacion.test.tsx` | Tras «Descartar», el foco está en la pregunta; tras «No», en el «Descartar» de ese elemento; tras descartar el primero de dos, en el «Descartar» del otro    |
| `BandaDeSincronizacion.test.tsx` | Si `descartarRechazado` lanza, se anuncia el fallo y la confirmación sigue abierta                                                                           |
| `BandaDeSincronizacion.test.tsx` | Cada «Descartar» tiene un nombre accesible distinto                                                                                                          |
| `api/cobertura.test.ts`          | Con una abierta de otra persona, declarar abre la propia, la guarda y encola **solo** el alta                                                                |
| `api/cobertura.test.ts`          | Dos `declararCobertura` a la vez, con `Promise.all`: una fila en la cola y una aplicada                                                                      |
| `api/cobertura.test.ts`          | `cambiarCobertura` con la instantánea desfasada devuelve `aplicado: false` y no encola nada                                                                  |
| `LiveMatchPage.test.tsx`         | Con el cierre de la cobertura colgado, «Salir del directo» navega antes de 2 s                                                                               |
| `LiveMatchPage.test.tsx`         | Con solo un trabajo de cobertura pendiente, salir no pregunta                                                                                                |
| `LiveMatchPage.test.tsx`         | Con `aplicado: false`, se anuncia que no se ha cambiado                                                                                                      |

## Pasos

1. Crea la rama desde `main` actualizado.
2. Lee los archivos de la tabla.
3. Escribe las pruebas y comprueba que fallan.
4. La banda y `almacen.ts`.
5. La cobertura: modelo, API y página.
6. Lanza `npm run lint`, `npx prettier --check .`, `npm run test -- --run` y `npm run build`. Todo en verde y sin `INEFFECTIVE_DYNAMIC_IMPORT`.
7. Edita la documentación, commitea, sube y abre la PR.
8. Con el CI en verde, fusiona con squash.

## Documentación: edita, no reescribas

| Documento                               | Edición                                                                                                                                                 |
| :-------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/06_Arquitectura_Frontend.md` §5.4 | En el párrafo D06-37, una frase: la cobertura local lleva de quién es, y la de otra persona no se cierra desde este aparato. Sube la versión un decimal |
| `docs/08_TAREAS.md`                     | La fila de la T-221 pasa a ✅. Un párrafo de tres líneas. Sube la versión un decimal                                                                    |
| `docs/13_HANDOFF.md`                    | **No lo reescribas.** Sección corta encima de la primera «## Sesión». En los puntos 74 y 75, una línea cada uno: cerrados por la T-221, y lo que quede  |

Deuda que anotar: los fallos de la cobertura en el aparato no llegan al registro de errores, porque `match` no puede importar de `logging`; y si el cierre de la cobertura no llega a guardarse al salir, la cobertura queda abierta hasta el cierre del partido.

## Cierre

- Commit y título de la PR: `fix(match): address review findings in coverage and the sync banner`
- Al terminar, di en tres líneas: número de la PR, pruebas en verde y si quedó fusionada.

## Fuera de esta tarea

Tiempo real entre aparatos (T-209b), limpiar de la precarga el evento descartado, las coberturas de duración cero y cualquier cambio en la base.
