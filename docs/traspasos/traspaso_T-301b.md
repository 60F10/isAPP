# Traspaso T-301b — Personas y permisos (A07), e invitaciones al entrar

> **Modelo y esfuerzo:** Opus, medio · **Rama:** `feat/auth-personas-permisos` · **Depende de:** T-301a aplicada y fusionada · **Sin migración**
> Preparado el 04/10/2026 y revisado el 07/10, con la T-301a aplicada (migración `20261007184030`, PR #86). Si `src/types/database.types.ts` no tiene la función `mis_invitaciones`, la T-301a no está en `main`: para y dilo.

## Qué falta

La ruta `/equipos/:id/personas` pinta una `PantallaPendiente`. Nadie puede ver quién está en el equipo, cambiar un permiso ni invitar a nadie, y quien es invitado no tiene dónde aceptarlo. Hoy solo entran los dos que están sembrados en la base.

## Qué hay que conseguir

1. Quien tiene `members.manage` ve a los miembros del equipo, cambia su rol y sus permisos, los da de baja e invita a un correo.
2. Quien entra con una cuenta invitada ve la invitación en Inicio y la acepta.

Las solicitudes, los seguidores y la lista de equipos son la T-301c.

## Reglas de esta sesión

- Lee solo los archivos de las tablas, el §15 del DOC 04 y el §14.8 del DOC 05. No abras más documentos.
- Si algo no cuadra con este traspaso, para y dilo. No improvises ni amplíes el alcance.
- Ahorra contexto: las búsquedas, al subagente `explorador`; lo repetitivo, al `implementador`. No pegues en el chat lo que ya está en los archivos.
- Raúl lanza esta sesión: haz el ciclo completo. Rama, un commit, push, PR con la plantilla, CI en verde y squash merge a `main`. Si el entorno no te deja fusionar, no busques otro camino: deja la PR con el CI en verde y dilo. **Nunca toques `release`.**
- En la nube `gh pr create` falla, porque usa GraphQL: la PR se abre con `gh api repos/60F10/isAPP/pulls`.
- **Sin migración ni SQL.** Todo lo que hace falta está en la base desde la T-301a. No uses las herramientas de Supabase para escribir (DOC 13, punto 81).
- La A07 vive en `modules/auth`, que solo importa de `shared` y `logging` (DOC 06 §4.2). El nombre del equipo sale de las membresías de `useAuth()`.
- **No se envía ningún correo.** La invitación se casa con el correo de la cuenta de Google de quien entra.
- Dos reglas de `auth` que no se rompen: `permisos` vale `null` hasta que la consulta contesta, y `app/` importa de `auth` por ruta directa, no por el barril.
- Cada `update` pide la fila de vuelta: cero filas es `SIN_FILAS`.
- De `players` no se lee nada aquí. Un `select('*')` sobre esa tabla falla desde la T-301a.

## Decidido: la A07

| Punto                    | Decisión                                                                                                                                                                                                      |
| :----------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ruta y guardia           | Las de hoy: `/equipos/:id/personas`, con `members.manage`. La pantalla comprueba además que el `:id` sea un equipo de las membresías del usuario; si no, «No se encuentra ese equipo»                         |
| Cómo se llega            | Enlace «Personas» en cada equipo propio de la A04, junto a «Plantilla», solo con `members.manage`                                                                                                             |
| Tarjeta «Miembros»       | Lista de `team_members` del equipo con su `display_name`, su rol en palabras y cuántos permisos tiene. Los de baja, al final y marcados                                                                       |
| Editar un miembro        | En su sitio: rol (los cuatro de `team_role`) y los doce permisos como casillas, cada una con la frase del DOC 04 §15.1. Botón «Poner los permisos de su rol», que marca los de la plantilla del §15.2         |
| Guardar un miembro       | El rol, con `update` de `team_members`. Los permisos, comparando con los que tenía: `insert` de los nuevos con `granted_by` y `delete` de los quitados                                                        |
| Dar de baja              | `is_active = false`, con confirmación en su sitio. «Reactivar» lo devuelve. No se borra a nadie                                                                                                               |
| Protección               | Nadie se quita a sí mismo `members.manage` ni se da de baja a sí mismo: esas dos casillas van desactivadas con el motivo escrito                                                                              |
| Tarjeta «Invitar»        | Correo, rol y permisos, que nacen con la plantilla del rol y se pueden cambiar. `insert` en `invitations` con `team_id`, `email`, `role` y `permissions`; el resto lo pone la base                            |
| Tras invitar             | «Invitación guardada. Dile que entre en la aplicación con esa cuenta de Google: la verá en Inicio.» y un botón «Compartir enlace» con `navigator.share` si existe, que comparte la dirección de la aplicación |
| Invitaciones pendientes  | Lista con correo, rol y cuándo caduca. «Revocar» pone `status = 'revoked'`                                                                                                                                    |
| Errores con texto propio | `23505` al invitar: «Ya hay una invitación pendiente para ese correo.» Correo vacío o sin arroba: se para en el campo, sin llamar                                                                             |

## Decidido: aceptar la invitación

| Punto       | Decisión                                                                                                                                                                                        |
| :---------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dónde       | Una tarjeta «Invitaciones» arriba de Inicio (A02). Componente `InvitacionesPendientes` de `auth`, que `core` importa por el barril de `auth` y `HomePage` pinta la primera                      |
| Cuándo sale | Si `supabase.rpc('mis_invitaciones')` devuelve alguna. Sin ninguna, no pinta nada, ni siquiera el título                                                                                        |
| Qué dice    | «`<quien invita>` te invita a `<equipo>`, de `<club>`, como `<rol>`.» y un botón «Aceptar»                                                                                                      |
| Al aceptar  | `supabase.rpc('aceptar_invitacion', { p_invitation_id })`, y después `reintentarContexto()` de `useAuth()` para que el equipo aparezca sin recargar. Se anuncia «Ya formas parte de `<equipo>`» |
| Si falla    | El mensaje de la base tal cual: ya viene en español                                                                                                                                             |
| La C05      | El párrafo de `ForbiddenPage` que habla de la invitación se queda: sigue siendo cierto                                                                                                          |

## Archivos

| Archivo                                                                                     | Cambio                                                                                                                                                                         |
| :------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/modules/auth/model/personas.ts` y su `.test.ts` (nuevos)                               | `PLANTILLAS_DE_ROL` del DOC 04 §15.2, `NOMBRES_DE_ROL`, `DESCRIPCION_DE_PERMISO` del §15.1, `validarInvitacion` y `cambiosDePermisos(antes, despues)`                          |
| `src/modules/auth/api/personas.ts` (nuevo)                                                  | Leer miembros con sus permisos y nombres, leer invitaciones, guardar rol, guardar permisos, dar de baja y reactivar, invitar, revocar, `misInvitaciones` y `aceptarInvitacion` |
| `src/modules/auth/hooks/usePersonas.ts` (nuevo)                                             | Consultas y mutaciones                                                                                                                                                         |
| `src/modules/auth/routes/PersonasPage.tsx`, su `.module.css` y `Personas.test.tsx` (nuevos) | La A07                                                                                                                                                                         |
| `src/modules/auth/components/InvitacionesPendientes.tsx` y su prueba (nuevos)               | La tarjeta de Inicio                                                                                                                                                           |
| `src/modules/auth/index.ts`                                                                 | Exporta `PersonasPage` e `InvitacionesPendientes`                                                                                                                              |
| `src/app/router.tsx`                                                                        | La ruta carga `PersonasPage` en perezoso, por el barril de `auth`                                                                                                              |
| `src/modules/core/routes/HomePage.tsx` y `EquiposPage.tsx`                                  | La tarjeta de invitaciones y el enlace «Personas»                                                                                                                              |

## Pruebas

Escríbelas primero y comprueba que fallan. Los dobles van en la frontera de `api/`.

| Archivo                  | Caso                                                                                                       |
| :----------------------- | :--------------------------------------------------------------------------------------------------------- |
| `personas.test.ts`       | Cada rol trae los permisos del DOC 04 §15.2; solo el de entrenador trae `event.approve` y `members.manage` |
| `personas.test.ts`       | `cambiosDePermisos` da lo que hay que añadir y lo que hay que quitar, y nada si no cambia                  |
| `personas.test.ts`       | `validarInvitacion` normaliza el correo y rechaza el vacío y el que no tiene arroba                        |
| `Personas.test.tsx`      | Lista a los miembros con nombre, rol y número de permisos                                                  |
| `Personas.test.tsx`      | Marcar un permiso y guardar llama a la API con ese permiso de alta y ninguno de baja                       |
| `Personas.test.tsx`      | La casilla de `members.manage` de uno mismo está desactivada                                               |
| `Personas.test.tsx`      | Invitar con rol «Delegado» manda los cuatro permisos de su plantilla; con el `23505`, sale el texto propio |
| `Personas.test.tsx`      | «Revocar» llama a la API con el `id` de la invitación                                                      |
| `InvitacionesPendientes` | Sin invitaciones no pinta nada; con una, «Aceptar» llama a la API y a `reintentarContexto`                 |

## Pasos

1. Crea la rama desde `main` actualizado y comprueba los tipos.
2. Lee el DOC 04 §15 y el DOC 05 §14.8.
3. Escribe las pruebas y comprueba que fallan.
4. Modelo, API y hooks.
5. La A07 y la tarjeta de Inicio.
6. Lanza `npm run lint`, `npx prettier --check .`, `npm run test -- --run` y `npm run build`. **Sin `INEFFECTIVE_DYNAMIC_IMPORT`**: si sale, `app/` está importando `auth` por el barril. Apunta el inicial comprimido: no puede subir por la A07, que es perezosa.
7. Edita la documentación, commitea, sube y abre la PR.
8. Con el CI en verde, fusiona con squash.

## Documentación: edita, no reescribas

| Documento                                       | Edición                                                                                                                                                                                     |
| :---------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/08_TAREAS.md`                             | La fila de la T-301b pasa a ✅. Un párrafo de cuatro líneas. Sube la versión un decimal                                                                                                     |
| `docs/13_HANDOFF.md`                            | **No lo reescribas.** Sección corta encima de la primera «## Sesión», con el tamaño del inicial. En el punto 4, una línea: ya se puede dar `members.manage` a Isaac desde la A07            |
| `docs/02_Pantallas_Navegacion_Accesibilidad.md` | En la fila de la A07, sin cambios de ruta. Una frase donde se describa: la invitación se acepta en Inicio                                                                                   |
| `CLAUDE.md`                                     | Un párrafo de dos líneas tras el de la T-105: la A07 vive en `auth`, y las invitaciones se aceptan por función, no escribiendo en tablas. En «Siguientes tareas», la siguiente es la T-301c |

Deuda que anotar: guardar rol y permisos son varias peticiones sin transacción; si falla una a medias, la lista se recarga y dice lo que hay.

## Cierre

- Commit y título de la PR: `feat(auth): add the people screen and invitation acceptance`
- En «Cómo lo pruebo» de la PR: Raúl invita a su segunda cuenta de Google, entra con ella, acepta en Inicio y ve el calendario.
- Al terminar, di en cuatro líneas: número de la PR, pruebas en verde, inicial comprimido y si quedó fusionada.

## Fuera de esta tarea

Solicitudes de acceso, seguidores, la lista de equipos que admiten solicitudes (T-301c), enviar correos y cualquier cambio en la base.
