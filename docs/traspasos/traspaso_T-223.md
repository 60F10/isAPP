# Traspaso T-223 — Flecos del directo entre aparatos

> **Esfuerzo:** medio · **Rama:** `fix/match-flecos-entre-aparatos` · **Depende de:** T-221 fusionada · **Sin base de datos**
> Preparado el 04/10/2026 sobre `main` en `e633df4`. Si un símbolo de los que se nombran aquí no existe, para y dilo.

## Qué es

Seis arreglos que salieron de revisar la T-209b y la T-209c (DOC 13, punto 79). Ninguno cambia el esquema ni el reductor del partido.

## Reglas de esta sesión

- Lee solo los archivos de la tabla. No abras los DOC enteros ni delegues en subagentes.
- Si algo no cuadra con este traspaso, para y dilo. No improvises ni amplíes el alcance.
- Haz el ciclo completo. Rama, un commit, push, PR con la plantilla, CI en verde y squash merge a `main`. **Nunca toques `release`.**
- **No toques `reducir`, `conciliarPartes`, `faseConciliada`, `elegirEstado` ni `fusionar`.** Solo se cambia quién los llama.
- **Un refresco nunca se come un toque.** El contador `guardados` y el cerrojo `guardando` se quedan como están: mira las tres pruebas de `LiveMatchPage.test.tsx` que lo cubren y comprueba que siguen en verde sin tocarlas.
- Del mensaje de Realtime no se lee nada: sigue siendo solo el aviso.
- `match` no importa de `logging`. Los `model/` no importan barriles en tiempo de ejecución.
- Objetivos de 48 px en el directo. Ningún color escrito a mano.

## Los arreglos

| #   | Qué pasa hoy                                                                                                                                                                                                    | Qué tiene que pasar                                                                                                                                                                                                                                                                                                    |
| :-- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `intentar` reduce sobre el `estado` del último pintado. Si el toque cae entre el `setEstado` de un refresco y su repintado, lo recién fundido se pierde hasta el refresco siguiente                             | `LiveMatchPage` guarda el último estado en un `useRef`, `ultimo`, y una función `poner(nuevo)` que escribe el `ref` y llama a `setEstado`. `intentar` reduce sobre `ultimo.current`. El refresco calcula `fusionar(ultimo.current, …)` y lo pasa a `poner`. No queda ningún `setEstado` suelto                         |
| 2   | Si otro aparato termina la parte, empieza la siguiente o finaliza el partido, la pantalla cambia sin decir nada                                                                                                 | Tras fundir, si la fase cambia, se anuncia con `anunciar`: «Otro aparato ha empezado la parte N.», «Otro aparato ha terminado la parte N.» u «Otro aparato ha finalizado el partido.». N es el número de la última parte. Un cambio que nace de `hacer` en este aparato no pasa por aquí y se anuncia como hasta ahora |
| 3   | Si el partido se finaliza desde otro aparato con el flujo o la ficha de un jugador abiertos, se desmontan y el foco cae en `body`                                                                               | Se cierran el flujo y la ficha, y el foco va a donde ya lo manda la página cuando finaliza este aparato. Escribe primero la prueba: si los efectos que ya hay lo resuelven, no añadas nada                                                                                                                             |
| 4   | Una descarga lenta que termina después de otra más nueva pisa en IndexedDB el paquete bueno                                                                                                                     | `guardarPaquete` no escribe si la instantánea guardada tiene un `pedidoEn` mayor que el que llega. Sin `pedidoEn` en alguno de los dos, escribe como hasta ahora                                                                                                                                                       |
| 5   | El canal de Realtime pide los tres tipos de cambio con el filtro del partido. Supabase no filtra los borrados («Delete events are not filterable»): un evento deshecho en otro móvil puede no avisar            | Por cada tabla, dos escuchas con filtro, `INSERT` y `UPDATE`. Y para `match_events`, una tercera de `DELETE` **sin filtro**: avisa con cualquier borrado de la tabla, de cualquier partido, y el refresco no trae nada si no era de este. Agrupar durante 1 s ya evita la ráfaga                                       |
| 6   | Los eventos del paquete se descargan sin orden. Tras revisar eventos en el cierre, PostgREST los devuelve en otro orden y «Últimos eventos» sale desordenado en un aparato que carga el partido por primera vez | La consulta de `match_events` de `descargarPaquete` lleva `.order('created_at').order('client_event_id')`                                                                                                                                                                                                              |

## Las pruebas que sobran y la que no prueba lo que dice

La T-209c se hizo dos veces y quedaron pruebas repetidas.

| Archivo                                   | Cambio                                                                                                                                                                                                        |
| :---------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/modules/match/model/directo.test.ts` | Borra «terminar la parte la busca por partido y número, no por su `id`, que puede ser de otro aparato (T-209c)»: repite la de «terminar la parte guarda su duración real» y la de la parte adoptada           |
| `src/modules/match/model/directo.test.ts` | «terminar la parte adoptada la cierra por partido y número…» usa un servidor sin partes y no adopta nada. Dale un servidor con la parte 1 de otro `id` y otro arranque, y comprueba la `clave` y los segundos |
| `src/modules/match/api/directo.test.ts`   | Borra «con el servidor más avanzado, adopta sus partes y conserva lo que este aparato tiene sin enviar»: repite las dos de `describe('cargarDirecto con las partes de otro aparato')`                         |
| `src/modules/sync/api/transporte.test.ts` | Un caso nuevo: un `update` de `match_period` con `clave: { match_id: 'par-1', period_number: '2' }` llega al cliente con esa misma clave. Solo la prueba: `transporte.ts` no cambia                           |

## Archivos

| Archivo                                                       | Cambio                                     |
| :------------------------------------------------------------ | :----------------------------------------- |
| `src/modules/match/routes/LiveMatchPage.tsx` y su `.test.tsx` | Arreglos 1, 2 y 3                          |
| `src/modules/match/api/precarga.ts` y `precarga.test.ts`      | Arreglos 4 y 6                             |
| `src/modules/match/api/tiempoReal.ts` y `tiempoReal.test.ts`  | Arreglo 5                                  |
| Los cuatro archivos de pruebas de la tabla anterior           | Las pruebas que sobran y la que se corrige |

## Pruebas

Escríbelas primero y comprueba que fallan.

| Archivo                  | Caso                                                                                                                                              |
| :----------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| `LiveMatchPage.test.tsx` | Un refresco funde un evento de otro aparato y, sin esperar al repintado, se apunta un gol: el estado guardado lleva los dos                       |
| `LiveMatchPage.test.tsx` | Un refresco trae la parte 1 cerrada por otro: se anuncia «Otro aparato ha terminado la parte 1.»                                                  |
| `LiveMatchPage.test.tsx` | Un refresco trae el partido finalizado con el flujo de un gol abierto: el flujo se cierra, se anuncia y el foco no está en `body`                 |
| `LiveMatchPage.test.tsx` | Terminar la parte desde este aparato no anuncia «Otro aparato…»                                                                                   |
| `precarga.test.ts`       | Con una instantánea de `pedidoEn` 200, `guardarPaquete(…, pedidoEn 100)` no escribe; con 300, sí                                                  |
| `precarga.test.ts`       | La consulta de eventos pide el orden por `created_at` y `client_event_id`                                                                         |
| `tiempoReal.test.ts`     | El canal lleva `INSERT` y `UPDATE` con filtro en las dos tablas, y `DELETE` de `match_events` sin filtro. Cualquiera de ellos llama a `alCambiar` |

## Pasos

1. Crea la rama desde `main` actualizado.
2. Lee los archivos de la tabla. De `LiveMatchPage.tsx`, sobre todo `intentar`, `hacer`, `refrescar` y los efectos que mueven el foco.
3. Escribe las pruebas y comprueba que fallan.
4. `precarga.ts` y `tiempoReal.ts`.
5. `LiveMatchPage.tsx`: primero el `ref` y `poner`, después el anuncio y el foco.
6. Las pruebas que sobran.
7. Lanza `npm run lint`, `npx prettier --check .`, `npm run test -- --run` y `npm run build`. Todo en verde y sin `INEFFECTIVE_DYNAMIC_IMPORT`.
8. Edita la documentación, commitea, sube y abre la PR.
9. Con el CI en verde, fusiona con squash.

## Documentación: edita, no reescribas

| Documento                               | Edición                                                                                                                                                                                        |
| :-------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/06_Arquitectura_Frontend.md` §5.4 | En el párrafo D06-38, dos frases: la página reduce y funde sobre el último estado, guardado en un `ref`; y los borrados se escuchan sin filtro, porque Supabase no los filtra. Sube la versión |
| `docs/08_TAREAS.md`                     | La fila de la T-223 pasa a ✅. Un párrafo de tres líneas. Sube la versión un decimal                                                                                                           |
| `docs/13_HANDOFF.md`                    | **No lo reescribas.** Sección corta encima de la primera «## Sesión». En el punto 79, una línea: cerrado por la T-223, salvo los dos estados raros                                             |

Deuda que anotar: el arreglo 5 está sin probar contra Realtime, que sigue sin publicar; con la publicación aplicada, cualquier borrado de `match_events` de cualquier club avisa a todos los directos abiertos, que con un club es nada.

## Cierre

- Commit y título de la PR: `fix(match): tidy up cross-device refresh in the live screen`
- En «Cómo lo pruebo» de la PR, para Raúl: dos sesiones en un partido de prueba; terminar la parte en una y mirar que la otra lo dice sola en menos de medio minuto.
- Al terminar, di en tres líneas: número de la PR, pruebas en verde y si quedó fusionada.

## Fuera de esta tarea

Los dos estados raros con la base incoherente (DOC 13, punto 79), sincronizar la pausa, suspender desde el directo, aplicar la publicación de Realtime y cualquier cambio en la base.
