# Traspaso T-225 — La banda «Partido en directo» en el resto de pantallas

> **Esfuerzo:** medio · **Rama:** `feat/match-banda-partido-en-curso` · **Depende de:** T-223 fusionada · **Sin base de datos**
> Preparado el 05/10/2026 sobre `main` en `e735931`. Si un símbolo de los que se nombran aquí no existe, para y dilo.

## Qué falta

Punto 41 del DOC 13 y DOC 02 §3.1: con un partido en curso, quien sale del directo a mirar otra pantalla tiene que ver arriba «Partido en directo · 34:12 · Volver», y volver con un toque. Hoy la marca de `shared/lib/partidoEnCurso.ts` dice qué partido está en curso en este aparato, pero nadie la enseña.

## Qué hay que conseguir

1. En cualquier pantalla de `AppLayout`, con un partido en curso en este aparato, sale la banda con el reloj de la parte y un enlace al directo.
2. El reloj de la banda marca lo mismo que el del directo, también en pausa y tras recargar.
3. En el descanso, la banda dice «Descanso» en vez del reloj.
4. Al finalizar el partido, o al caducar la marca, la banda desaparece sola.

## Reglas de esta sesión

- Lee solo los archivos de la tabla. No abras los DOC enteros ni delegues en subagentes.
- Si algo no cuadra con este traspaso, para y dilo. No improvises ni amplíes el alcance.
- Haz el ciclo completo. Rama, un commit, push, PR con la plantilla, CI en verde y squash merge a `main`. **Nunca toques `release`.**
- **Nada del arranque importa `shared/lib/db.ts`, `@modules/sync` ni `@modules/match`.** La banda vive en `app/` y lee solo `localStorage`, por la marca. El reloj no sale de IndexedDB.
- **No toques el reductor** (`match/model/directo.ts`) ni el refresco de `LiveMatchPage.tsx`. En esa página solo cambia el efecto que pone y quita la marca.
- La banda va en el flujo normal de la maqueta, sin `position: fixed` ni `sticky`: ninguna banda tapa el elemento enfocado.
- Ningún color, tamaño ni duración escritos a mano: todo de `tokens.css`.
- El paquete inicial no puede pasar de 200 kB comprimidos. Mídelo recorriendo las importaciones estáticas, como dice `CLAUDE.md`.

## Decidido

| Punto                   | Decisión                                                                                                                                                                                                                                                                                        |
| :---------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dónde vive              | `src/app/components/PartidoEnCurso.tsx`, con su `.module.css`. La pinta `AppLayout`, encima del contenido y debajo del enlace «Saltar al contenido». El directo usa `FullScreenLayout` y por eso no la ve                                                                                       |
| De dónde sale el reloj  | De la marca. `Marca` gana un campo opcional, `reloj`: `{ inicio: number; pausadoMs: number; pausaDesde: number \| null }`, o `null` si no hay parte abierta. Son los tres campos de la parte abierta de `ParteLocal`                                                                            |
| Quién lo escribe        | La A12, en el efecto que ya llama a `marcarPartidoEnCurso`: le pasa el reloj de la parte abierta, o `null`                                                                                                                                                                                      |
| `marcarPartidoEnCurso`  | Tercer argumento opcional, `reloj`. Con la marca del mismo partido ya puesta, conserva `desde` —recargar no reinicia la caducidad— y escribe solo si el reloj ha cambiado. Avisa a los que escuchan solo si ha escrito                                                                          |
| Leer la marca           | Función nueva, `leerMarcaEnCurso(ahora)`: devuelve `{ partidoId, reloj }` o `null`, con la misma caducidad. Una marca de antes, sin `reloj`, vale y se lee como `reloj: null`. `leerPartidoEnCurso` no cambia                                                                                   |
| La instantánea          | `useSyncExternalStore` pide un valor estable. La banda se suscribe con `suscribirPartidoEnCurso` y usa de instantánea el **texto crudo** de la marca, con una función nueva `textoDePartidoEnCurso()`; lo interpreta después. Devolver un objeto nuevo en cada lectura repinta sin fin          |
| El cálculo              | Una sola cuenta para los dos relojes. `src/shared/lib/reloj.ts`, nuevo: `segundosDesde(reloj, ahora)` —la cuenta que hoy hace `segundosDeParte` con la parte abierta— y `formatoReloj`. `match/model/reloj.ts` los usa y sigue exportando `formatoReloj` y `segundosDeParte` con la misma firma |
| El repintado            | `useAhora` pasa a `src/shared/hooks/useAhora.ts` sin cambios, y `match` lo importa de ahí. La banda lo activa solo si hay reloj y no está en pausa                                                                                                                                              |
| El texto                | «Partido en directo · 34:12». En pausa, «Partido en directo · 34:12 · En pausa». Sin parte abierta, «Partido en directo · Descanso»                                                                                                                                                             |
| El enlace               | `<Link>` a `/partidos/<id>/directo`, con el texto «Volver» y `aria-label="Volver al partido en directo"`. Alto y ancho mínimos de `--tap-min`                                                                                                                                                   |
| Accesibilidad           | `<section aria-label="Partido en directo">`. El reloj **no** es región viva: anunciaría cada segundo. La banda no se anuncia al aparecer. Con alto contraste se tiene que seguir leyendo: usa los tokens semánticos, no los primitivos                                                          |
| Sin sesión              | `AppLayout` solo se pinta con sesión: no hace falta más guardia                                                                                                                                                                                                                                 |
| Otra cuenta en el móvil | La marca no dice de quién es. Si entra otra persona en ese aparato antes de cuatro horas, ve la banda, y el directo ya decide si la deja pasar. Se anota como deuda                                                                                                                             |

## Archivos

| Archivo                                                              | Cambio                                                             |
| :------------------------------------------------------------------- | :----------------------------------------------------------------- |
| `src/shared/lib/partidoEnCurso.ts` y su prueba, si la tiene          | El campo `reloj`, `leerMarcaEnCurso` y `textoDePartidoEnCurso`     |
| `src/shared/lib/reloj.ts` y `reloj.test.ts`, nuevos                  | `segundosDesde` y `formatoReloj`                                   |
| `src/modules/match/model/reloj.ts`                                   | Usa los de `shared` y los sigue exportando. Sus pruebas no cambian |
| `src/shared/hooks/useAhora.ts`                                       | Viene de `src/modules/match/hooks/useAhora.ts`, que desaparece     |
| `src/modules/match/routes/LiveMatchPage.tsx` y su `.test.tsx`        | La importación de `useAhora` y el efecto de la marca               |
| `src/app/components/PartidoEnCurso.tsx`, `.module.css` y `.test.tsx` | La banda                                                           |
| `src/app/layouts/AppLayout.tsx`                                      | Pinta la banda                                                     |

## Pruebas

Escríbelas primero y comprueba que fallan.

| Archivo                   | Caso                                                                                                                                       |
| :------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------- |
| `partidoEnCurso.test.ts`  | Marcar con reloj y volver a marcar el mismo partido con otro reloj: cambia el reloj y `desde` sigue igual                                  |
| `partidoEnCurso.test.ts`  | Volver a marcar con el mismo reloj no escribe ni avisa                                                                                     |
| `partidoEnCurso.test.ts`  | Una marca guardada sin `reloj` se lee con `reloj: null`. Una caducada, `null`                                                              |
| `reloj.test.ts`           | `segundosDesde` corriendo, en pausa y con un reloj de pared por detrás del arranque: nunca negativo                                        |
| `PartidoEnCurso.test.tsx` | Sin marca no pinta nada                                                                                                                    |
| `PartidoEnCurso.test.tsx` | Con marca y reloj: «Partido en directo · 34:12» y un enlace con nombre «Volver al partido en directo» que apunta al directo de ese partido |
| `PartidoEnCurso.test.tsx` | En pausa dice «En pausa» y el reloj no avanza. Sin reloj dice «Descanso»                                                                   |
| `PartidoEnCurso.test.tsx` | Al quitar la marca con `quitarPartidoEnCurso`, la banda desaparece sin recargar                                                            |
| `LiveMatchPage.test.tsx`  | Con la parte en juego, la marca lleva el reloj de esa parte; al terminarla, `reloj: null`; al finalizar, no hay marca                      |

## Pasos

1. Crea la rama desde `main` actualizado.
2. Lee los archivos de la tabla y `src/app/components/ActualizacionDisponible.tsx`, que ya lee la marca con `useSyncExternalStore`.
3. Escribe las pruebas y comprueba que fallan.
4. `shared`: la marca, `reloj.ts` y `useAhora`.
5. `match`: `model/reloj.ts`, la importación y el efecto de la A12.
6. `app`: la banda y `AppLayout`.
7. Lanza `npm run lint`, `npx prettier --check .`, `npm run test -- --run` y `npm run build`. Todo en verde y sin `INEFFECTIVE_DYNAMIC_IMPORT`. Apunta el inicial comprimido.
8. Edita la documentación, commitea, sube y abre la PR.
9. Con el CI en verde, fusiona con squash.

## Documentación: edita, no reescribas

| Documento                               | Edición                                                                                                                                                                                                     |
| :-------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/06_Arquitectura_Frontend.md` §5.4 | Párrafo nuevo, «**D06-40**»: la banda vive en `app/`, lee el reloj de la marca de `localStorage` y no de IndexedDB, y la cuenta del reloj es una sola, en `shared/lib/reloj.ts`. Sube la versión un decimal |
| `docs/08_TAREAS.md`                     | La fila de la T-225 pasa a ✅. Un párrafo de tres líneas. Sube la versión un decimal                                                                                                                        |
| `docs/13_HANDOFF.md`                    | **No lo reescribas.** Sección corta encima de la primera «## Sesión». En el punto 41, una línea: cerrado por la T-225                                                                                       |
| `CLAUDE.md`                             | En el párrafo de la T-207, tras la frase de `partidoEnCurso.ts`, una frase: desde la T-225 esa marca lleva también el reloj de la parte abierta, y `AppLayout` pinta con ella la banda «Partido en directo» |

Deuda que anotar: la marca no dice de quién es; y la banda solo sale en el aparato que tiene el directo abierto o lo tuvo, no en el de quien solo mira.

## Cierre

- Commit y título de la PR: `feat(match): add the live match band to the rest of the screens`
- En «Cómo lo pruebo» de la PR, para Raúl: empezar una parte en un partido de prueba, salir del directo, mirar que la banda marca lo mismo que marcaba el reloj y volver con «Volver».
- Al terminar, di en cuatro líneas: número de la PR, pruebas en verde, inicial comprimido y si quedó fusionada.

## Fuera de esta tarea

Enseñar la banda a quien no tiene el directo abierto en su aparato, el marcador en la banda, suspender el partido (T-226) y cualquier cambio en la base.
