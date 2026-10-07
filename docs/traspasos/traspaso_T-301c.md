# Traspaso T-301c — Entrar sin equipo: seguir, pedir permisos, y el seguidor que solo mira

> **Modelo y esfuerzo:** Opus, medio · **Rama:** `feat/auth-entrada-sin-equipo` · **Depende de:** T-301b fusionada · **Sin migración**
> Preparado el 04/10/2026, con la decisión I1 ya cerrada, y revisado el 07/10, con la T-301a aplicada (migración `20261007184030`, PR #86). Si `src/modules/auth/routes/PersonasPage.tsx` no existe, la T-301b no está: para y dilo. Si los tipos no tienen la función `seguir_equipo`, la T-301a no está en `main`: para y dilo.

## Qué falta

Quien entra con Google y no tiene equipo ni invitación ve una aplicación vacía. La base ya deja seguir a un equipo y pedirle permisos desde la T-301a, pero ninguna pantalla lo ofrece, quien lleva el equipo no ve las solicitudes, y un seguidor no ve nada porque la aplicación solo conoce a los miembros.

## Qué hay que conseguir

1. Quien no tiene equipo ve los equipos de la lista, **sigue el que quiera sin esperar a nadie**, y puede pedir permisos para anotar.
2. Quien lleva el equipo ve en la A07 las solicitudes de permisos y las acepta o las rechaza, pone o quita al equipo de la lista y ve a sus seguidores.
3. Un seguidor entra y ve el calendario y el próximo partido, sin poder tocar nada.

## Reglas de esta sesión

- Lee solo los archivos de las tablas, el §15.3 del DOC 04 y el §14.8 del DOC 05. No abras más documentos.
- Si algo no cuadra con este traspaso, para y dilo. No improvises ni amplíes el alcance.
- Ahorra contexto: las búsquedas, al subagente `explorador`; lo repetitivo, al `implementador`. No pegues en el chat lo que ya está en los archivos.
- Raúl lanza esta sesión: haz el ciclo completo. Rama, un commit, push, PR con la plantilla, CI en verde y squash merge a `main`. Si el entorno no te deja fusionar, no busques otro camino: deja la PR con el CI en verde y dilo. **Nunca toques `release`.**
- En la nube `gh pr create` falla, porque usa GraphQL: la PR se abre con `gh api repos/60F10/isAPP/pulls`.
- **Sin migración ni SQL.** Todo se escribe por las funciones de la T-301a. No uses las herramientas de Supabase para escribir (DOC 13, punto 81).
- **Seguir es inmediato; tener permisos, no.** Ninguna pantalla promete que pedir permisos dé acceso: deja una solicitud pendiente.
- De los jugadores no sale nada en estas pantallas. De las personas, solo `display_name`.
- `permisos` vale `null` hasta que la consulta contesta: no lo rellenes antes.
- El contexto de acceso va en el arranque. Lo que le añadas tiene que ser poco: nada de componentes ni de pantallas dentro de `api/session.ts` ni de `model/permissions.ts`.

## Decidido: seguir y pedir permisos

| Punto             | Decisión                                                                                                                                                                                                                                                                                                    |
| :---------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pantalla nueva    | «Unirse a un equipo», en `/unirse`, dentro de `AppLayout` y solo con sesión, sin guardia de permiso. Módulo `auth`                                                                                                                                                                                          |
| Cómo se llega     | Tarjeta «¿Buscas tu equipo?» en Inicio, solo cuando el usuario no tiene ningún equipo: componente de `auth` que `HomePage` pinta debajo de las invitaciones. Un enlace en la C05. Y un enlace «Seguir a otro equipo» en Ajustes                                                                             |
| Qué lista         | `supabase.rpc('equipos_que_admiten_solicitudes')`: club, equipo y categoría. Vacía: «Ningún equipo está en la lista ahora mismo. Pide a quien lleve el tuyo que te invite a este correo.»                                                                                                                   |
| Por cada equipo   | «Seguir», y debajo, más discreto, «Quiero anotar: pedir permisos». Si ya lo sigue: «Siguiendo» en texto y «Dejar de seguir»                                                                                                                                                                                 |
| Al seguir         | `supabase.rpc('seguir_equipo', { p_team_id })`, después `reintentarContexto()` y se anuncia «Ya sigues a `<equipo>`». Sin confirmación: se deshace con un toque                                                                                                                                             |
| Al pedir permisos | Abre en su sitio un campo opcional, hasta 280 caracteres, «Di quién eres, para que te reconozcan», y «Enviar». `supabase.rpc('solicitar_acceso', { p_team_id, p_message })`. Se anuncia «Solicitud enviada. Te tiene que aceptar quien lleva el equipo.» La aplicación no avisa sola: no hay notificaciones |
| Mis solicitudes   | En la misma pantalla, arriba: las propias de `access_requests`, con equipo y su estado en palabras. «Cancelar» en las pendientes, con `cancelar_solicitud`                                                                                                                                                  |
| Errores           | El mensaje de la base tal cual: ya viene en español                                                                                                                                                                                                                                                         |

## Decidido: en la A07

| Punto                             | Decisión                                                                                                                                                                                                                                                                                                                                                                                        |
| :-------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tarjeta «Solicitudes de permisos» | `supabase.rpc('solicitudes_del_equipo', { p_team_id })`: nombre, su mensaje y cuándo. Sale la primera de la pantalla si hay alguna                                                                                                                                                                                                                                                              |
| Aceptar                           | Abre en su sitio el mismo selector de rol y permisos de «Invitar», y al confirmar llama a `resolver_solicitud` con `p_aprobar: true`, el rol y los permisos                                                                                                                                                                                                                                     |
| Rechazar                          | Con confirmación en su sitio. `p_aprobar: false`. Quien es rechazado sigue pudiendo seguir al equipo                                                                                                                                                                                                                                                                                            |
| Tarjeta «Seguidores»              | `supabase.rpc('seguidores_del_equipo', { p_team_id })`: nombre y desde cuándo. «Quitar» borra la fila de `team_followers`, con confirmación que dice: «Podrá volver a seguir mientras el equipo esté en la lista.»                                                                                                                                                                              |
| «Este equipo está en la lista»    | Una casilla que escribe `teams.accepts_requests`. Solo con `team.manage`, que es lo que pide la política de `teams`. Debajo: «Con esto encendido, cualquier persona con cuenta ve el nombre del equipo y del club, lo puede seguir sin esperar a nadie y puede pedir permisos. Quien sigue ve el calendario, los resultados, los dorsales y los apodos. Para anotar hace falta que lo aceptes.» |

## Decidido: el seguidor

| Punto                | Decisión                                                                                                                                                                              |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dónde se carga       | `fetchContextoDeAcceso`, en `auth/api/session.ts`, lee además las filas propias de `team_followers` con su equipo                                                                     |
| Cómo se representa   | Una `Membership` más, con `seguidor: true`, sin `teamMemberId` de miembro y con el conjunto de permisos vacío. Si alguien es miembro y seguidor del mismo equipo, manda la de miembro |
| Qué ve               | Lo que ya enseñan Inicio y el calendario sin permisos: el próximo partido y las dos listas, sin acciones. Las rutas con guardia le llevan a la C05, como a cualquiera sin permiso     |
| Dejar de seguir      | En Ajustes (C01), una línea por equipo seguido con «Dejar de seguir», que llama a `dejar_de_seguir` y recarga el contexto                                                             |
| Lo que no ve todavía | Estadísticas: sus pantallas son de después de la liga. Dilo en la tarjeta de Inicio del seguidor: «Sigues a `<equipo>`. Las estadísticas llegarán más adelante.»                      |

## Archivos

| Archivo                                                                                                                                                                  | Cambio                                                                                         |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------- |
| `src/modules/auth/model/permissions.ts` y su `.test.ts`                                                                                                                  | `seguidor` en `Membership` y en `construirMembresias`, con la regla de que manda la de miembro |
| `src/modules/auth/api/session.ts`                                                                                                                                        | La lectura de `team_followers`                                                                 |
| `src/modules/auth/api/solicitudes.ts` y `hooks/useSolicitudes.ts` (nuevos)                                                                                               | Las llamadas a las funciones                                                                   |
| `src/modules/auth/model/solicitudes.ts` y su `.test.ts` (nuevos)                                                                                                         | Nombres de estado y la validación del mensaje                                                  |
| `src/modules/auth/routes/UnirsePage.tsx`, su `.module.css` y su prueba (nuevos)                                                                                          | La pantalla                                                                                    |
| `src/modules/auth/routes/PersonasPage.tsx` y `Personas.test.tsx`                                                                                                         | Las tres tarjetas nuevas                                                                       |
| `src/modules/auth/components/SinEquipo.tsx` (nuevo)                                                                                                                      | La tarjeta de Inicio                                                                           |
| `src/modules/auth/index.ts`, `src/app/router.tsx`, `src/modules/core/routes/HomePage.tsx`, `src/app/routes/AjustesPage.tsx`, `src/modules/auth/routes/ForbiddenPage.tsx` | Enganches                                                                                      |

## Pruebas

Escríbelas primero y comprueba que fallan.

| Archivo               | Caso                                                                                                       |
| :-------------------- | :--------------------------------------------------------------------------------------------------------- |
| `permissions.test.ts` | Un seguidor sale como membresía sin permisos; miembro y seguidor del mismo equipo, una sola, la de miembro |
| `solicitudes.test.ts` | El mensaje se recorta, vacío es `null` y si pasa de 280 no se envía                                        |
| `UnirsePage`          | Lista los equipos; «Seguir» llama a `seguir_equipo` y a `reintentarContexto`, sin pedir nada más           |
| `UnirsePage`          | Un equipo que ya se sigue dice «Siguiendo» y ofrece «Dejar de seguir»                                      |
| `UnirsePage`          | «Quiero anotar» envía el mensaje a `solicitar_acceso`; con el error de la base, lo enseña                  |
| `UnirsePage`          | Una solicitud pendiente propia sale arriba y «Cancelar» llama a la API                                     |
| `UnirsePage`          | Sin equipos: el texto que manda a pedir una invitación                                                     |
| `Personas.test.tsx`   | Con una solicitud, «Aceptar» pide rol y permisos antes de llamar; «Rechazar» llama con `p_aprobar: false`  |
| `Personas.test.tsx`   | «Quitar» a un seguidor avisa de que podrá volver a seguir                                                  |
| `Personas.test.tsx`   | La casilla de la lista no sale sin `team.manage`                                                           |

## Pasos

1. Crea la rama desde `main` actualizado y comprueba los tipos.
2. Lee el DOC 04 §15.3 y el DOC 05 §14.8.
3. Escribe las pruebas y comprueba que fallan.
4. El seguidor en el contexto de acceso.
5. «Unirse a un equipo» y la tarjeta de Inicio.
6. Las tres tarjetas de la A07 y las líneas de Ajustes.
7. Lanza `npm run lint`, `npx prettier --check .`, `npm run test -- --run` y `npm run build`. Sin `INEFFECTIVE_DYNAMIC_IMPORT`. Apunta el inicial comprimido: el contexto de acceso va en el arranque y **no puede pasar de 200 kB**.
8. Edita la documentación, commitea, sube y abre la PR.
9. Con el CI en verde, fusiona con squash.

## Documentación: edita, no reescribas

| Documento                                       | Edición                                                                                                                                                         |
| :---------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/02_Pantallas_Navegacion_Accesibilidad.md` | Fila nueva en el inventario: «Unirse a un equipo», `/unirse`, todos, MVP. Con eso se cierra el punto 15 del DOC 13                                              |
| `docs/08_TAREAS.md`                             | La fila de la T-301c pasa a ✅. Un párrafo de cuatro líneas. Sube la versión un decimal                                                                         |
| `docs/13_HANDOFF.md`                            | **No lo reescribas.** Sección corta encima de la primera «## Sesión», con el tamaño del inicial. En los puntos 14 y 15, una línea: cerrados                     |
| `CLAUDE.md`                                     | En el párrafo de la T-105, una frase: el contexto de acceso trae también a los seguidores, como membresías sin permisos. En «Siguientes tareas», queda la T-302 |

Deuda que anotar: no hay avisos, así que quien lleva el equipo solo ve una solicitud si abre la A07; el seguidor no tiene estadísticas que mirar hasta que exista el bloque B; y quitar a un seguidor no le impide volver (DOC 13, punto 69).

## Cierre

- Commit y título de la PR: `feat(auth): let people follow a team and request permissions`
- En «Cómo lo pruebo» de la PR: poner el Cadete A en la lista desde la A07; con la tercera cuenta, la que no tiene equipo, seguirlo y ver el calendario; pedir permisos con ella y aceptarla desde la A07 con la de Raúl.
- Al terminar, di en cuatro líneas: número de la PR, pruebas en verde, inicial comprimido y si quedó fusionada.

## Fuera de esta tarea

Notificaciones, correos, estadísticas para el seguidor, bloquear a un seguidor, alta de clubes nuevos (DOC 13, punto 21) y cualquier cambio en la base.
