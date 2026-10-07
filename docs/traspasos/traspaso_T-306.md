# Traspaso T-306 — Arreglos de la revisión: la A07, las invitaciones y «Unirse a un equipo»

> **Modelo y esfuerzo:** Sonnet, medio · **Rama:** `fix/auth-arreglos-de-personas` · **Depende de:** T-305 fusionada · **Sin migración**
> Preparado el 07/10/2026, de la revisión de la T-301b y la T-301c contra su traspaso. Si la fila de la T-305 no está en ✅ en `docs/08_TAREAS.md`, la T-305 no está fusionada: para y dilo.

## Qué falla

| #   | Dónde                                                                | Qué pasa                                                                                                                                                                                                                                           |
| :-- | :------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `auth/routes/PersonasPage.tsx`, «Guardar» de un miembro              | Los cambios se calculan contra los permisos que trae la lista **ahora**, no contra los que había al abrir «Editar». Si la lista se recarga entre medias, guardar deshace lo que cambió otra persona o falla con «No tienes permiso…», que es falso |
| 2   | `auth/hooks/usePersonas.ts`, `useGuardarMiembro`                     | Si el rol se guarda y los permisos fallan, o las altas entran y las bajas no, el mensaje es el genérico. Nadie dice que una parte quedó guardada                                                                                                   |
| 3   | `auth/components/InvitacionesPendientes.tsx`                         | Si aceptar falla porque la invitación ya no vale, la lista se vacía, la tarjeta desaparece y el mensaje se va con ella                                                                                                                             |
| 4   | `PersonasPage.tsx`, dar de baja                                      | Al abrir la confirmación, al decir «No, dejarlo» y al confirmar, el foco cae en `body`                                                                                                                                                             |
| 5   | `PersonasPage.tsx`, «Revocar», e `InvitacionesPendientes`, «Aceptar» | La fila o la tarjeta desaparece y el foco cae en `body`                                                                                                                                                                                            |
| 6   | `PersonasPage.tsx`, los cuatro formularios                           | Tras un fallo, el botón que tenía el foco estaba desactivado y el foco se pierde                                                                                                                                                                   |
| 7   | `PersonasPage.tsx`, «Invitar»                                        | Con el correo mal escrito se anuncia el error y el foco no va al campo. Y «Invitación guardada…» con «Compartir enlace» se queda a la vista mientras se escribe el correo siguiente                                                                |
| 8   | `InvitacionesPendientes.tsx` y `auth/model/solicitudes.ts`           | `mensajeAlAceptar` y `mensajeDeLaBase` hacen lo mismo por duplicado, y enseñan tal cual cualquier error, también uno en inglés que no venga de las funciones                                                                                       |
| 9   | `auth/api/personas.ts`, `guardarRol` y `cambiarActivo`               | Filtran solo por `id`: sin el equipo y, al dar de baja, sin el estado de partida                                                                                                                                                                   |
| 10  | `auth/routes/UnirsePage.tsx`, «Cancelar» de una solicitud            | El botón desaparece y el foco cae en `body`                                                                                                                                                                                                        |
| 11  | `UnirsePage.tsx`, `recienPedidos`                                    | Una solicitud ya resuelta sigue diciendo «Solicitud pendiente» hasta recargar                                                                                                                                                                      |
| 12  | `UnirsePage.tsx`, «Seguir»                                           | Se anuncia «Ya sigues a…» y la fila sigue diciendo «Seguir» hasta que vuelve el contexto; si esa recarga falla, se queda así                                                                                                                       |

## Reglas de esta sesión

- Lee solo los archivos de las tablas. No abras documentos salvo los que hay que editar.
- Si algo no cuadra con este traspaso, para y dilo. No improvises ni amplíes el alcance.
- Ahorra contexto: las búsquedas, al subagente `explorador`; lo repetitivo, al `implementador`. No pegues en el chat lo que ya está en los archivos.
- Haz el ciclo completo: un commit, push, PR con la plantilla, CI en verde y squash merge a `main`. Si el entorno no te deja fusionar, no busques otro camino: deja la PR con el CI en verde y dilo. **Nunca toques `release`.**
- En la nube `gh pr create` falla, porque usa GraphQL: la PR se abre con `gh api repos/60F10/isAPP/pulls`.
- **Sin migración ni SQL.** No uses las herramientas de Supabase para escribir (DOC 13, punto 81).
- No cambies textos ni comportamiento que no estén en la tabla «Decidido».
- El foco se mueve con `ref` y `focus()` a un elemento que **sigue en la pantalla**. Un destino sin foco propio lleva `tabIndex={-1}`.

## Decidido

| #   | Decisión                                                                                                                                                                                                                                                                                                                                                      |
| :-- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Al abrir «Editar» se guarda la foto de los permisos de ese momento. «Guardar» calcula `cambiosDePermisos(foto, marcados)`. Si la base contesta `23505` o cero filas al guardar permisos: «Otra persona ha cambiado estos permisos. La lista ya enseña lo que hay: revísala y vuelve a guardar.», y el formulario se vuelve a sembrar con lo que trae la lista |
| 2   | `useGuardarMiembro` distingue el fallo a medias: si algo anterior ya se guardó, lanza un error propio, `GUARDADO_A_MEDIAS`, definido en `model/personas.ts`. La pantalla dice: «Se ha guardado una parte. La lista ya enseña lo que hay: revísala y vuelve a guardar.»                                                                                        |
| 3   | Con un fallo al aceptar, la tarjeta «Invitaciones» sigue pintada aunque la lista quede vacía, con el mensaje a la vista y un botón «Cerrar» que lo quita. El foco va al mensaje                                                                                                                                                                               |
| 4   | Dar de baja: al abrir, el foco va a la pregunta; con «No, dejarlo», vuelve a «Dar de baja»; al confirmar, al nombre de esa persona en la lista                                                                                                                                                                                                                |
| 5   | Tras «Revocar», el foco va al título de la tarjeta «Invitaciones pendientes». Tras «Aceptar» con éxito, al `h1` de la pantalla, buscándolo en el documento, como hace la banda de sincronización                                                                                                                                                              |
| 6   | Tras un fallo en cualquiera de los cuatro formularios de la A07, el foco va al mensaje de error de ese formulario                                                                                                                                                                                                                                             |
| 7   | Con el correo mal escrito, el foco va al campo. «Invitación guardada…» y «Compartir enlace» se quitan al primer cambio del campo del correo                                                                                                                                                                                                                   |
| 8   | Una sola función, `mensajeDeLaBase`, en `model/solicitudes.ts`, que usan las dos. Enseña el mensaje tal cual solo con los códigos que lanzan las funciones de la T-301a: `42501`, `P0002`, `23514` y `23505`. Con cualquier otro: «No se ha podido completar. Vuelve a intentarlo.»                                                                           |
| 9   | `guardarRol(teamId, teamMemberId, role)` y `cambiarActivo(teamId, teamMemberId, activo)` llevan `team_id` en el filtro, y `cambiarActivo` además `is_active` con el valor contrario. Cero filas sigue siendo `SIN_FILAS`                                                                                                                                      |
| 10  | Tras «Cancelar», el foco va al título de la tarjeta «Mis solicitudes»                                                                                                                                                                                                                                                                                         |
| 11  | Un equipo sale de `recienPedidos` en cuanto `misSolicitudes` trae su solicitud                                                                                                                                                                                                                                                                                |
| 12  | «Seguir» apunta el equipo en un conjunto local, `recienSeguidos`, en cuanto la función contesta: la fila dice «Siguiendo» sin esperar al contexto. «Dejar de seguir» lo quita                                                                                                                                                                                 |

## Archivos

| Archivo                                                              | Cambio                                                                                                            |
| :------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------- |
| `src/modules/auth/model/personas.ts` y `personas.test.ts`            | `GUARDADO_A_MEDIAS`                                                                                               |
| `src/modules/auth/model/solicitudes.ts` y `solicitudes.test.ts`      | La regla 8                                                                                                        |
| `src/modules/auth/api/personas.ts` y `api/personas.test.ts` (nuevo)  | La regla 9, y pruebas de la API con un doble del cliente de Supabase como el de `review/api/aportaciones.test.ts` |
| `src/modules/auth/hooks/usePersonas.ts`                              | Las reglas 2 y 9                                                                                                  |
| `src/modules/auth/routes/PersonasPage.tsx` y `Personas.test.tsx`     | Las reglas 1, 2, 4, 5, 6 y 7                                                                                      |
| `src/modules/auth/components/InvitacionesPendientes.tsx` y su prueba | Las reglas 3, 5 y 8                                                                                               |
| `src/modules/auth/routes/UnirsePage.tsx` y `Unirse.test.tsx`         | Las reglas 10, 11 y 12                                                                                            |

## Pruebas

Escríbelas primero y comprueba que fallan.

| Archivo                  | Caso                                                                                                                      |
| :----------------------- | :------------------------------------------------------------------------------------------------------------------------ |
| `Personas.test.tsx`      | Con «Editar» abierto, la lista cambia los permisos de esa persona: «Guardar» manda los cambios contra la foto de apertura |
| `Personas.test.tsx`      | Con `GUARDADO_A_MEDIAS`, sale el texto de la regla 2 y el foco está en el mensaje                                         |
| `Personas.test.tsx`      | «Dar de baja» lleva el foco a la pregunta; «No, dejarlo» lo devuelve al botón                                             |
| `Personas.test.tsx`      | Tras «Revocar», el foco está en el título de «Invitaciones pendientes»                                                    |
| `Personas.test.tsx`      | Correo sin arroba: el foco está en el campo. Tras invitar, escribir en el campo quita «Invitación guardada…»              |
| `InvitacionesPendientes` | Aceptar falla y la lista vuelve vacía: la tarjeta sigue, con el mensaje y «Cerrar»                                        |
| `api/personas.test.ts`   | `guardarPermisos` borra acotado al `team_member_id`, da las altas antes que las bajas, y cero filas es `SIN_FILAS`        |
| `api/personas.test.ts`   | `guardarRol` y `cambiarActivo` llevan `team_id` en el filtro, y `cambiarActivo`, el estado de partida                     |
| `solicitudes.test.ts`    | Un `P0002` enseña el mensaje de la base; un `57014`, el genérico                                                          |
| `Unirse.test.tsx`        | Tras «Cancelar», el foco está en el título de «Mis solicitudes»                                                           |
| `Unirse.test.tsx`        | Tras «Seguir», la fila dice «Siguiendo» aunque el contexto no haya vuelto                                                 |

## Pasos

1. Crea la rama desde `main` actualizado.
2. Escribe las pruebas y comprueba que fallan.
3. Modelo, API y hooks: reglas 2, 8 y 9.
4. La A07: reglas 1, 4, 5, 6 y 7.
5. Las invitaciones y «Unirse a un equipo»: reglas 3, 10, 11 y 12.
6. Lanza `npm run lint`, `npx prettier --check .`, `npm run test -- --run` y `npm run build`. Sin `INEFFECTIVE_DYNAMIC_IMPORT`. El inicial no puede subir: nada de esto va en el arranque.
7. Edita la documentación, commitea, sube y abre la PR.
8. Con el CI en verde, fusiona con squash.

## Documentación: edita, no reescribas

| Documento            | Edición                                                                                                  |
| :------------------- | :------------------------------------------------------------------------------------------------------- |
| `docs/08_TAREAS.md`  | La fila de la T-306 pasa a ✅. Un párrafo de tres líneas. Sube la versión un decimal                     |
| `docs/13_HANDOFF.md` | **No lo reescribas.** Sección corta encima de la primera «## Sesión». En el punto 83, una línea: cerrado |

Deuda que anotar: guardar rol y permisos siguen siendo varias peticiones sin transacción; los `hooks` esperan a que se recargue todo `auth` antes de dar por terminado un guardado; la guardia de la A07 mira `members.manage` en el equipo activo y no en el de la dirección (punto 24); y la nota de la A04 sobre los equipos que nacen sin personas ya no es exacta.

## Cierre

- Commit y título de la PR: `fix(auth): address review findings in the people screens`
- Al terminar, di en cuatro líneas: número de la PR, pruebas en verde, si subió el inicial y si quedó fusionada.

## Fuera de esta tarea

El contexto de acceso, «Mi equipo» y Ajustes (T-305), una función en la base que guarde rol y permisos de una vez, cambiar la guardia de la ruta, la nota de la A04 y cualquier cambio en la base.
