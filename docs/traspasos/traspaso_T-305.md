# Traspaso T-305 — Arreglos de la revisión: el contexto de acceso y las pantallas sin guardia

> **Modelo y esfuerzo:** Opus, medio · **Rama:** `fix/auth-arreglos-del-contexto` · **Depende de:** T-304 fusionada · **Sin migración**
> Preparado el 07/10/2026, de la revisión de la T-301c y la T-304 contra su traspaso. Si `src/modules/core/routes/MiEquipoPage.tsx` no existe, la T-304 no está: para y dilo.

## Qué falla

| #   | Dónde                                                      | Qué pasa                                                                                                                                                                                                                                                     |
| :-- | :--------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `auth/model/permissions.ts`, `elegirEquipoActivo`          | El equipo recordado gana aunque solo se siga. Quien sigue al equipo B y después entra como miembro en el A se queda con B de activo, sin un permiso y con las rutas guardadas en `/403`. Nadie cambia de equipo desde la aplicación, así que no tiene salida |
| 2   | `auth/api/session.ts`, `fetchContextoDeAcceso`             | Si falla la lectura de `team_followers`, cae el contexto entero. Un miembro que no sigue a nadie se queda sin equipos por una consulta que no necesita                                                                                                       |
| 3   | `core/routes/MiEquipoPage.tsx`                             | Si el contexto de acceso falla, `teams` vale `null` y la pantalla dice «Cargando…» para siempre. No lee `errorContexto`, y al no tener guardia, tampoco se lo pinta `RequirePermission`                                                                      |
| 4   | `app/routes/AjustesPage.tsx`, tarjeta «Equipos que sigues» | Lo mismo: «Cargando…» sin salida con el contexto fallado                                                                                                                                                                                                     |
| 5   | `core/routes/MiEquipoPage.module.css`                      | Por debajo de 600 px la etiqueta de cada celda va en un `::before`, y un lector de pantalla la dice dos veces: «Dorsal», «Dorsal: 10»                                                                                                                        |
| 6   | `core/routes/MiEquipoPage.tsx`                             | Sin dorsal o sin posición se pinta una raya que un lector lee «raya» o no lee                                                                                                                                                                                |

## Reglas de esta sesión

- Lee solo los archivos de las tablas. No abras documentos salvo los que hay que editar.
- Si algo no cuadra con este traspaso, para y dilo. No improvises ni amplíes el alcance.
- Ahorra contexto: las búsquedas, al subagente `explorador`; lo repetitivo, al `implementador`. No pegues en el chat lo que ya está en los archivos.
- Haz el ciclo completo: un commit, push, PR con la plantilla, CI en verde y squash merge a `main`. Si el entorno no te deja fusionar, no busques otro camino: deja la PR con el CI en verde y dilo. **Nunca toques `release`.**
- En la nube `gh pr create` falla, porque usa GraphQL: la PR se abre con `gh api repos/60F10/isAPP/pulls`.
- **Sin migración ni SQL.** No uses las herramientas de Supabase para escribir (DOC 13, punto 81).
- **`permisos` vale `null` hasta que la consulta contesta.** No toques esa regla ni `permisosDe`.
- `api/session.ts` y `model/permissions.ts` van en el arranque: ni componentes, ni barriles, ni importaciones nuevas de otros módulos.
- `core` no importa de `app/`. El aviso de fallo de «Mi equipo» se escribe en la propia pantalla.

## Decidido

| #   | Decisión                                                                                                                                                                                                                                                                                                                                    |
| :-- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | En `elegirEquipoActivo`, el recordado vale si es una membresía **con función**, o si es de seguidor y **no hay ninguna con función**. En cualquier otro caso, la primera de la lista, que ya trae delante las de función. Reescribe su comentario con la regla nueva                                                                        |
| 2   | En `fetchContextoDeAcceso`, un fallo de `team_followers` no lanza: se sigue con la lista de seguidos vacía. Los fallos de `profiles` y de `team_members` siguen lanzando. Un comentario dice por qué. No se registra en `error_logs`: `auth` no puede importar `logging` por ruta directa, y por el barril arrastra su pantalla al arranque |
| 3   | En «Mi equipo», con `teams === null` y `errorContexto !== null`: un párrafo «No se pudo cargar tu acceso.» y un botón «Reintentar» que llama a `reintentarContexto()`. El texto, el de `app/components/ErrorDeAcceso.tsx`. Sin error, «Cargando…» como hoy                                                                                  |
| 4   | En Ajustes, misma condición: la tarjeta dice «No se pudo cargar tu acceso.» con su «Reintentar», en vez de «Cargando…»                                                                                                                                                                                                                      |
| 5   | El `::before` se marca como decorativo con el texto alternativo vacío de CSS: `content: attr(data-etiqueta) ': ' / ''`. Si `stylelint` o el build lo rechazan, déjalo como está y apúntalo como deuda                                                                                                                                       |
| 6   | La raya lleva `aria-hidden` y, al lado, un texto solo para lector: «Sin dorsal» y «Sin posición». Usa la clase de texto oculto que ya tenga el proyecto; búscala antes de escribir otra                                                                                                                                                     |

## Archivos

| Archivo                                                                            | Cambio                                                                                        |
| :--------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------- |
| `src/modules/auth/model/permissions.ts` y `permissions.test.ts`                    | La regla 1                                                                                    |
| `src/modules/auth/api/session.ts` y `session.test.ts` (nuevo si no existe)         | La regla 2, con un doble del cliente de Supabase como el de `review/api/aportaciones.test.ts` |
| `src/modules/core/routes/MiEquipoPage.tsx`, su `.module.css` y `MiEquipo.test.tsx` | Las reglas 3, 5 y 6                                                                           |
| `src/app/routes/AjustesPage.tsx` y `AjustesPage.test.tsx`                          | La regla 4                                                                                    |

## Pruebas

Escríbelas primero y comprueba que fallan.

| Archivo                | Caso                                                                                                                 |
| :--------------------- | :------------------------------------------------------------------------------------------------------------------- |
| `permissions.test.ts`  | Recordado de seguidor y otra membresía con función: gana la de función                                               |
| `permissions.test.ts`  | Recordado de seguidor y ninguna con función: gana el recordado                                                       |
| `permissions.test.ts`  | Recordado con función entre varias con función: gana el recordado. Los casos que ya hay siguen en verde sin tocarlos |
| `session.test.ts`      | Falla `team_followers`: el contexto vuelve con las membresías de miembro y ninguna de seguidor                       |
| `session.test.ts`      | Falla `team_members`: lanza                                                                                          |
| `MiEquipo.test.tsx`    | Con `teams` nulo y `errorContexto`: sale el mensaje, y «Reintentar» llama a `reintentarContexto`                     |
| `MiEquipo.test.tsx`    | Sin dorsal: la celda tiene el texto «Sin dorsal»                                                                     |
| `AjustesPage.test.tsx` | Con `teams` nulo y `errorContexto`: la tarjeta no dice «Cargando…» y ofrece «Reintentar»                             |

## Pasos

1. Parte de la rama que diga quien te lanza y comprueba que este traspaso está en ella.
2. Escribe las pruebas y comprueba que fallan.
3. Las reglas 1 y 2.
4. Las reglas 3 a 6.
5. Lanza `npm run lint`, `npx prettier --check .`, `npm run test -- --run` y `npm run build`. Sin `INEFFECTIVE_DYNAMIC_IMPORT`. Apunta el inicial comprimido: `permissions.ts` y `session.ts` van en el arranque y no pueden subirlo más de 0,2 kB.
6. Edita la documentación, commitea, sube y abre la PR.
7. Con el CI en verde, fusiona con squash.

## Documentación: edita, no reescribas

| Documento            | Edición                                                                                                                             |
| :------------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| `docs/08_TAREAS.md`  | La fila de la T-305 pasa a ✅. Un párrafo de tres líneas. Sube la versión un decimal                                                |
| `docs/13_HANDOFF.md` | **No lo reescribas.** Sección corta encima de la primera «## Sesión», con el tamaño del inicial. En el punto 82, una línea: cerrado |
| `CLAUDE.md`          | En el párrafo de la T-105, una frase: el equipo recordado solo manda si tiene función o si no hay ninguno con función               |

Deuda que anotar: el fallo al leer los seguidos no llega al registro de errores; Inicio, «Más» y «Unirse a un equipo» no se han mirado con el contexto fallado; y sigue sin haber dónde elegir el equipo activo.

## Cierre

- Commit y título de la PR: `fix(auth): keep a followed team from hiding the one you work in`
- Al terminar, di en cuatro líneas: número de la PR, pruebas en verde, inicial comprimido y si quedó fusionada.

## Fuera de esta tarea

Un selector de equipo activo, tocar `RequirePermission` o `ErrorDeAcceso`, mover componentes entre módulos, la A07, las invitaciones y «Unirse a un equipo» (T-306), y cualquier cambio en la base.
