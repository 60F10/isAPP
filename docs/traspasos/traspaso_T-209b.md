# Traspaso T-209b — Lo que apuntan los demás, en el momento

> **Esfuerzo:** alto · **Rama:** `feat/match-tiempo-real` · **Depende de:** T-221 fusionada, porque las dos tocan `LiveMatchPage.tsx` · **Sin tocar la base**
> Preparado el 04/10/2026 y puesto al día esa tarde sobre `main` en `00669e9`. Si un símbolo de los que se nombran aquí no existe, para y dilo.

## Qué falla

Cada aparato solo ve lo que apuntan los demás cuando vuelve a entrar en el directo: `LiveMatchPage` carga una vez, con `staleTime: Infinity`. Dos anotadores apuntan el mismo gol sin saberlo y el marcador de un móvil no coincide con el del otro. Desde la T-211, además, lo apuntado se corrige y se borra desde «Mis aportaciones», y el directo de los demás no se entera.

Y hay un fallo que ya existe: si deshaces un evento ya enviado y recargas antes de que salga su borrado, el evento vuelve desde el servidor y ya no se puede deshacer.

## Qué hay que conseguir

1. Lo que apunta, corrige o borra otro aparato se ve en este sin tocar nada, en segundos.
2. Lo que este aparato tiene sin enviar se queda.
3. Un evento que parece repetido de otro aparato lo dice, y se puede deshacer en el sitio.
4. Sin red, todo sigue como hoy.

## Reglas de esta sesión

- Lee solo los archivos de las tablas. No abras documentos ni delegues en subagentes.
- Si algo no cuadra con este traspaso, para y dilo. No improvises ni amplíes el alcance.
- Haz el ciclo completo. Rama, un commit, push, PR con la plantilla, CI en verde y squash merge a `main`. **Nunca toques `release`.**
- **La base no se toca.** Ni SQL ni migraciones. La publicación de Realtime ya está escrita en `supabase/pendientes/realtime_del_directo.sql` y la aplica Raúl otro día.
- **Un refresco nunca se come un toque.** No uses `guardando.current` como cerrojo del refresco: `intentar` devuelve `ocupado` y el toque se pierde en silencio.
- **Las partes y la fase no se tocan aquí**: son la T-209c. El refresco usa `elegirEstado` tal como está.
- La cobertura de la T-209a no se toca: `guardarPaquete` ya la conserva.
- Los `model/` no importan barriles en tiempo de ejecución.
- El service worker no cachea la API (D06-09). No añadas `runtimeCaching`.

## Decidido: el aviso

| Punto                   | Decisión                                                                                                                                                                                                                                     |
| :---------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Para qué sirve Realtime | Solo de aviso: «algo ha cambiado en este partido». No se lee lo que trae el mensaje. Al llegar uno, se descarga el paquete entero, como al abrir                                                                                             |
| Hoy no avisa            | La publicación `supabase_realtime` está vacía hasta que se aplique su SQL. El canal se escribe igual: se suscribe y no recibe nada. **Todo tiene que funcionar sin él**                                                                      |
| Canal                   | `supabase.channel('directo:' + partidoId)`, con `postgres_changes`, `event: '*'`, `schema: 'public'`, una suscripción por tabla (`match_events` y `match_periods`) y `filter: 'match_id=eq.' + partidoId`. Se quita al desmontar la pantalla |
| Agrupar                 | Varios avisos seguidos son un solo refresco: se espera 1 s desde el último                                                                                                                                                                   |
| Red de seguridad        | Con la pantalla visible y con red, un refresco cada **20 s**. Cuando en esta sesión de la pantalla ya ha llegado al menos un aviso de verdad por el canal, pasa a cada **60 s**                                                              |
| Además                  | Un refresco al volver a la pantalla (`visibilitychange`) y al recuperar la red (`online`)                                                                                                                                                    |
| Cuándo no               | Con la pantalla oculta o sin red. Con un refresco en marcha, no se lanza otro: se apunta que hay uno pendiente                                                                                                                               |
| Si falla                | En silencio. El directo no depende de esto                                                                                                                                                                                                   |

## Decidido: qué hace un refresco

| Paso | Qué                                                                                                                                                                                    |
| :--- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Apunta la hora y el contador de guardados de la pantalla                                                                                                                               |
| 2    | Descarga el paquete y lo guarda con `guardarPaquete`                                                                                                                                   |
| 3    | Lee de la cola lo de este partido con `pendientesDelPartido(partidoId, hora del paso 1)`                                                                                               |
| 4    | Si hay un guardado en marcha o el contador ha cambiado desde el paso 1, vuelve al paso 3 pasado medio segundo, hasta cinco veces. Si no se despeja, lo deja para el siguiente refresco |
| 5    | En el mismo turno, sin ningún `await` entre medias: `setEstado((actual) => fusionar(actual, servidor, pendientes))`                                                                    |

El estado fusionado no se escribe en la instantánea: `guardarPaquete` ya ha guardado el paquete, y el siguiente `aplicarTransicion` guarda el estado. Por eso **`cargarDirecto` usa también `fusionar`**, con la misma lectura de la cola: sin eso, lo borrado vuelve al recargar.

El contador es un `useRef` que `intentar` incrementa antes de llamar a `reducir`.

## Decidido: la fusión

`fusionar(local, servidor, pendientes)` en `match/model/directo.ts`, pura:

| Evento                                      | Qué pasa                                                                                                          |
| :------------------------------------------ | :---------------------------------------------------------------------------------------------------------------- |
| Está en el servidor y en `pendientes.bajas` | No sale: este aparato lo ha deshecho y el borrado está de camino                                                  |
| Está en el servidor                         | Sale con la copia del servidor: su minuto, su jugador y su estado son los buenos. Sigue siendo `propio` si lo era |
| Solo en local y en `pendientes.altas`       | Se queda: no ha llegado todavía, o el servidor lo rechazó y está en la banda                                      |
| Solo en local y no está en `altas`          | Se quita: alguien lo borró en el servidor                                                                         |

Lo demás, de `elegirEstado(local, servidor)`. El campo se recalcula con `conEventos`.

`pendientesDelPartido(matchId, desde)`, nueva en `sync/api/almacen.ts` y exportada por el barril:

| Conjunto | Qué trabajos de `match_event` de ese partido                                                                  |
| :------- | :------------------------------------------------------------------------------------------------------------ |
| `altas`  | Los `insert` que no están en `sent`, o que lo están con `sentAt >= desde`. Su `clientEventId`                 |
| `bajas`  | Los `delete` que no están en `sent`, o que lo están con `sentAt >= desde`. Su `payload.clave.client_event_id` |

Es la única vez que `sync` mira dentro de una `clave`, y solo ese campo: dilo en un comentario.

## Decidido: lo que se ve

| Punto             | Decisión                                                                                                                                                                                       |
| :---------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| «Últimos eventos» | Los que no son de este aparato llevan «· De otro aparato». Siguen sin «Deshacer»                                                                                                               |
| Posible repetido  | Dos eventos que no estén rechazados, del mismo tipo, del mismo bando y de la misma parte, con los segundos a menos de la ventana, y que no sean los dos `propio`. Sin segundos, no se comparan |
| La ventana        | `app_settings`, fila `duplicate_window_seconds`, con valor `{ default, by_type }`. La lee cualquiera con sesión. Va en el paquete como `ventanas`, opcional; si falta, 30 s                    |
| Cómo se dice      | En «Últimos eventos», la línea lleva «· Posible repetido». Si el repetido es propio, «Deshacer» ya está ahí                                                                                    |
| Cuándo se anuncia | Una vez por pareja, por la región viva: «Posible repetido: `<descripción>`». No abre nada ni roba el foco                                                                                      |
| Lo que no hace    | No bloquea ni pregunta antes de guardar: apuntar no puede ir más lento. Decidir cuál vale es del cierre (A13)                                                                                  |

## Archivos

| Archivo                                                                        | Cambio                                                                                     |
| :----------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------- |
| `src/modules/sync/api/almacen.ts`, su `.test.ts` y `src/modules/sync/index.ts` | `pendientesDelPartido`                                                                     |
| `src/modules/match/model/directo.ts` y su `.test.ts`                           | `fusionar`                                                                                 |
| `src/modules/match/model/eventos.ts` y su `.test.ts`                           | `posiblesRepetidos(eventos, ventanas)`: devuelve los `clientEventId`                       |
| `src/modules/match/model/paquete.ts` y `api/precarga.ts` con su prueba         | `ventanas` en el paquete                                                                   |
| `src/modules/match/api/tiempoReal.ts` (nuevo)                                  | `escucharPartido(partidoId, alCambiar)`, que devuelve cómo dejar de escuchar               |
| `src/modules/match/api/directo.ts` y su `.test.ts`                             | `refrescarDirecto` y `cargarDirecto` con `fusionar`                                        |
| `src/modules/match/hooks/useRefresco.ts` y su prueba (nuevos)                  | El aviso, la agrupación y la red de seguridad. Recibe por argumento qué hacer al refrescar |
| `src/modules/match/components/UltimosEventos.tsx`                              | Las dos etiquetas                                                                          |
| `src/modules/match/routes/LiveMatchPage.tsx` y su `.test.tsx`                  | El contador, el hook y el anuncio                                                          |

## Pruebas

Escríbelas primero y comprueba que fallan.

| Archivo                    | Caso                                                                                                                                |
| :------------------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| `almacen.test.ts`          | `altas` trae lo pendiente, lo fallido y lo enviado después de `desde`; no lo enviado antes ni lo de otro partido                    |
| `almacen.test.ts`          | `bajas` saca el identificador de `payload.clave`                                                                                    |
| `directo.test.ts` (modelo) | Las cuatro filas de la tabla de la fusión, una por caso                                                                             |
| `directo.test.ts` (modelo) | Un cambio de otro aparato mueve `enCampo`; un evento propio corregido en el servidor sale con el minuto nuevo                       |
| `eventos.test.ts`          | Dos goles propios seguidos no son repetidos; uno propio y uno ajeno a 20 s, sí; a 40 s, no; un córner a 20 s, no                    |
| `eventos.test.ts`          | Un rechazado no cuenta. Distinto bando o distinta parte, tampoco                                                                    |
| `directo.test.ts` (api)    | Deshacer un evento enviado y volver a cargar con el borrado en la cola: no vuelve                                                   |
| `useRefresco`              | Tres avisos en medio segundo dan un refresco                                                                                        |
| `useRefresco`              | Sin avisos, refresca a los 20 s; tras el primer aviso, el siguiente de seguridad es a los 60 s; con la pantalla oculta, no refresca |
| `LiveMatchPage.test.tsx`   | Llega un refresco con un gol de otro aparato: el marcador sube y la línea dice «De otro aparato»                                    |
| `LiveMatchPage.test.tsx`   | Se apunta un evento mientras el refresco descarga: sigue en pantalla después                                                        |

## Pasos

1. Crea la rama desde `main` actualizado.
2. Lee en `LiveMatchPage.tsx` el componente `Panel` hasta `intentar` y `hacer`, y además `api/directo.ts`, `api/precarga.ts` y el final de `model/directo.ts`.
3. Escribe las pruebas y comprueba que fallan.
4. `pendientesDelPartido`, `fusionar` y `posiblesRepetidos`.
5. `cargarDirecto` con la fusión. Pasa las pruebas que ya había: no cambia nada sin cola.
6. El canal, el hook y la página.
7. Lanza `npm run lint`, `npx prettier --check .`, `npm run test -- --run` y `npm run build`. Sin `INEFFECTIVE_DYNAMIC_IMPORT`. Apunta el inicial comprimido.
8. Edita la documentación, commitea, sube y abre la PR.
9. Con el CI en verde, fusiona con squash.

## Documentación: edita, no reescribas

| Documento                               | Edición                                                                                                                                                                            |
| :-------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/05_Modelo_Datos_RLS.md` §14       | Apartado corto, «14.9 Realtime para el directo — SIN APLICAR»: qué tablas, por qué solo esas dos, que respeta la RLS de lectura y dónde está el SQL. Sube la versión un decimal    |
| `docs/06_Arquitectura_Frontend.md` §5.4 | Párrafo «**D06-38**»: Realtime es solo aviso, el dato sale de la descarga, la regla de qué se queda y qué se quita, y la red de seguridad de 20 y 60 s. Sube la versión un decimal |
| `docs/08_TAREAS.md`                     | La fila de la T-209b pasa a ✅. Un párrafo de cinco líneas. Sube la versión un decimal                                                                                             |
| `docs/13_HANDOFF.md`                    | **No lo reescribas.** Sección corta encima de la primera «## Sesión», con «sin probar con dos móviles». En el punto 77, una línea: el código está, falta aplicar el SQL            |
| `CLAUDE.md`                             | Un párrafo de tres líneas tras el de la T-209a, con la regla de que un refresco no se come un toque                                                                                |

Deuda que anotar: sin probar con dos móviles en un campo; cada refresco son cinco consultas, y con cuatro anotadores cada 20 s habrá que medirlo; «De otro aparato» no dice quién; y el aviso de repetido usa los segundos del aparato, que dependen del reloj de cada uno hasta la T-209c.

## Cierre

- Commit y título de la PR: `feat(match): show other scorers' events as they happen`
- En «Cómo lo pruebo» de la PR, para Raúl: dos sesiones en el mismo partido, un gol en una, verlo en la otra sin recargar en menos de medio minuto; el mismo gol en las dos, ver «Posible repetido».
- Al terminar, di en cuatro líneas: número de la PR, pruebas en verde, inicial comprimido y si quedó fusionada.

## Fuera de esta tarea

Aplicar la publicación de Realtime, partes compartidas y reloj común (T-209c), el nombre de quien apuntó, la cobertura de otros anotadores en pantalla, resolver repetidos en el directo y cualquier política de la base.
