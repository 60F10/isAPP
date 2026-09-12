# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 12/09/2026 — Tarea: T-100b · migración de correcciones de la auditoría

Primera sesión con el repositorio, la terminal y Supabase conectados. Se leyeron las dos migraciones aplicadas antes de escribir una línea: los nombres de política, restricción y función salen de ahí. **La tarea queda terminada de punta a punta: escrita, validada, aplicada, commiteada, subida y fusionada.**

### HECHO

**Dos migraciones nuevas, escritas y aplicadas al proyecto GavetaStats.**

| Archivo                                     | Versión          | Qué lleva                                                   |
| :------------------------------------------ | :--------------- | :---------------------------------------------------------- |
| `20260912142001_permiso_event_approve.sql`  | `20260912142001` | Solo el `alter type ... add value 'event.approve'`          |
| `20260912142131_correcciones_auditoria.sql` | `20260912142131` | Los cinco cambios del §14.2 y las dos políticas del permiso |

Van separadas porque PostgreSQL admite añadir un valor de enumeración dentro de una transacción, pero **no deja usarlo en esa misma transacción**. El `before 'match.close'` mantiene el orden documentado en el DOC 05 §3.

**Validadas contra un PostgreSQL 16 de verdad antes de tocar el proyecto.** Se levantó una base local con las tablas `auth.users` y la función `auth.uid()` fingidas, se aplicaron las cuatro migraciones en orden y se pasaron once comprobaciones. Todas en verde:

| Comprobación                                                                              | Resultado |
| :---------------------------------------------------------------------------------------- | :-------- |
| Orden de `app_permission` con `event.approve` entre `match.live.write` y `match.close`    | Correcto  |
| `occurred_at` creada, `seconds` anulable, restricción `match_events_time_present` viva    | Correcto  |
| Relleno al llegar: evento a 20 min → 1200 s; evento 2 s antes del arranque → 0            | Correcto  |
| Relleno en diferido: al escribir `started_at` de la parte 2, el evento pasa de nulo a 600 | Correcto  |
| Sustitución duplicada: se ignora, devuelve su `id` y los tramos se construyen enteros     | Correcto  |
| Ventana por tipo: dos córners a 15 s no agrupan; dos goles a 15 s sí                      | Correcto  |
| Fiabilidad: cobertura total = 1,0000; 95 % corroborado = **0,9548** (antes daba 1,0000)   | Correcto  |
| Ninguna función nueva o rehecha ejecutable por `public` ni por `anon`                     | Correcto  |
| El seguidor de Cadete A ve a los jugadores de Cadete A, no a los de Cadete B              | Correcto  |
| Editar lo ajeno con `event.approve` sí; solo con `match.close` no                         | Correcto  |
| Un evento sin `occurred_at` ni `seconds` se rechaza                                       | Correcto  |

Un hallazgo lateral: la sustitución duplicada **también** la marca `flag_duplicate_candidates`, porque las dos caen dentro de la ventana de 30 s por defecto. El descarte del recálculo y el candidato a duplicado apuntan al mismo par, y eso está bien: la primera lo evita, la segunda lo enseña.

**Aplicadas al proyecto y comprobadas allí.** Las cuatro versiones están en el historial remoto y el esquema responde lo esperado: enumeración con `event.approve` en su sitio, `occurred_at` creada, `seconds` anulable, los dos disparadores y el índice parcial vivos, `rebuild_match_stints` devolviendo `jsonb`, las dos políticas de `match_events` citando el permiso nuevo, el mapa de ventanas en `app_settings` y **las veintiuna funciones del proyecto cerradas a `public` y a `anon`**.

**Tipos de TypeScript regenerados** en `src/types/database.types.ts` —esa es la ruta real, no `src/shared/types/`— con `occurred_at`, `seconds: number | null`, `rebuild_match_stints` devolviendo `Json` y `event.approve` en la enumeración.

**DOC 05 v1.2, DOC 08 v1.3 y este DOC 13**, con el §14.2 reescrito de «pendiente» a «qué corrigió» y cinco deudas nuevas en el §15.

### DECISIONES TOMADAS

**Las migraciones se renombraron para casar con el historial remoto.** Se aplicaron sin CLI de Supabase —no está instalado ni el proyecto está enlazado—, y la API registra su propia marca de tiempo. Salieron `20260912142001` y `20260912142131`, así que se renombraron los archivos a esas versiones antes de commitearlos. Es lo que exige el §14: si la versión registrada y el prefijo del archivo no coinciden, un `supabase db push` futuro intenta reaplicar lo que ya está dentro. La otra salida —editar `supabase_migrations.schema_migrations`— se descartó por tocar estado interno para ahorrar un renombrado.

**El reloj se rellena en los dos sentidos, no solo al llegar el evento.** El §14.2 pedía un disparador «al llegar», y ese resuelve la mitad: si el evento llega **antes** de que se sincronice `started_at`, no hay de dónde calcular los segundos y el evento se queda sin cronología para siempre. Es el caso del anotador sin cobertura durante el arranque, que es para quien existe toda la capa offline. Van dos: `match_events_set_seconds` al llegar el evento y `match_periods_backfill_seconds` al escribir el arranque de la parte.

**`rebuild_match_stints` cambia su retorno de `integer` a `jsonb`.** Devuelve `{"stints": n, "skipped": [ids]}`. El DOC 04 §6.3 pide que el descarte de la sustitución repetida «se registre» y no dice dónde. Las otras dos salidas se descartaron: escribir en `match_events.details` obliga a cada recálculo a disparar `validate_match_event`, `set_updated_at` y `audit_row` sobre el evento, y llena el partido de auditoría de cambios que nadie hizo; escribir en `audit_log` deja el descarte donde el panel de discordancias no mira y con una RLS que exige `members.manage`. Romper la firma salía gratis hoy y caro en noviembre.

**La lectura de `players` se afina, no se amplía, y el A-05 estaba mal enunciado.** El resumen decía «los seguidores no podían leer `players`». Con el esquema delante, `can_read_club` ya dejaba a cualquier seguidor de cualquier equipo del club leer la plantilla entera: el problema era el contrario, leía de más. La política nueva sigue al pie de la letra el §12.3, que es lo que manda.

**`greatest(0, ...)` al derivar los segundos.** El DOC 04 §5.1.1 asume que el reloj de pared de cada móvil se desvía uno o dos segundos. Sin el `greatest`, un evento anotado dos segundos antes del arranque produce un negativo que rompe `match_events_seconds`. Se colapsa al segundo cero.

**Restricción `match_events_time_present` nueva, no pedida en el §14.2.** Un evento sin `occurred_at` **y** sin `seconds` no se puede ordenar, ni recalcular, ni comparar. En diferido llega `seconds`; en directo, `occurred_at`. Al menos uno.

### AVISO DEL AUDITOR: ALGO QUE NO ES NUESTRO

El auditor de seguridad de Supabase marca **`public.rls_auto_enable()` como ejecutable por `anon` vía `/rest/v1/rpc`**, siendo `SECURITY DEFINER`. No está en ninguna migración del repositorio: la creó la plataforma, es propiedad de `postgres` y la usa un disparador de eventos que activa la RLS al crear una tabla.

El riesgo práctico es bajo: devuelve `event_trigger`, tipo que PostgREST no expone, y fuera del contexto de un disparador de eventos falla. Pero conviene decidirlo a conciencia y no dejarlo pasar:

- **Revocarla desde una migración** cierra el aviso, pero mete en el repositorio una función que la plataforma gestiona: si Supabase la recrea, el `revoke` se pierde, y en un proyecto nuevo donde no exista, la migración falla.
- **Dejarla y documentarla** es lo que se ha hecho hoy. Queda aquí escrito para que la próxima auditoría no lo redescubra como hallazgo nuevo.

El auditor marca además diecinueve funciones del proyecto como ejecutables por `authenticated`. Eso es deliberado y viene del endurecimiento del 11/09. Aun así hay margen: las siete funciones de disparador —`audit_row`, `validate_match_event`, `enforce_match_changes`, `set_match_club_id`, `handle_new_user`, `set_event_seconds` y `backfill_event_seconds`— **no necesitan el `grant` a `authenticated` para nada**, porque un disparador ejecuta su función con independencia de los permisos. Quitárselo es una línea por función y cierra siete avisos. No entra hoy por no desviar la T-100b.

Lo demás que marca el auditor ya estaba: `btree_gist` en `public`, veintisiete claves ajenas sin índice, trece tablas con dos políticas permisivas de `SELECT`, y la protección de contraseñas filtradas desactivada (irrelevante: solo se entra con Google).

### ESTADO DEL REPOSITORIO

**Todo lo de esta sesión está en `main`.** Dos fusiones, las dos con el CI entero en verde, y las ramas borradas.

| PR  | Rama                             | Contenido                                                                       |
| :-- | :------------------------------- | :------------------------------------------------------------------------------ |
| #14 | `feat/db-correcciones-auditoria` | `feat(db)` la enumeración · `feat(db)` las correcciones · `chore(db)` los tipos |
| #15 | `docs/docs-traspaso-t-100b`      | `docs(docs)` los DOC 05, 08 y 13                                                |

Al empezar, `main` iba un commit por detrás del remoto y la rama `docs/docs-estado-tras-fusiones` seguía viva en local pese a que la PR #13 ya estaba fusionada. Se actualizó `main` antes de ramificar.

### PENDIENTE DE LA TAREA

Nada de la T-100b: queda cerrada. Lo que sigue abierto es de fuera de la tarea:

1. **Decidir qué hacer con `rls_auto_enable`**, arriba.
2. **Quitar el `grant execute` a `authenticated` de las siete funciones de disparador**, que no lo necesitan. Siete líneas en la próxima migración de endurecimiento.
3. Lo que ya venía de la sesión anterior: la columna «Fase» del DOC 02 §2, la descarga de `InterVariable-latin.woff2`, marcar `event.approve` a quien lleve el registro cuando exista la T-301, y los cubos de Storage `crests` y `docs`.

### DEUDA TÉCNICA GENERADA

| Deuda                                                                                                          | Estado                                                                                    |
| :------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------- |
| Un evento con `seconds` nulo escapa a la detección de duplicados y el recálculo lo coloca al final de la parte | Se corrige solo al llegar el arranque. Si nunca llega, lo arrastra el partido entero      |
| El relleno en diferido dispara `validate_match_event` y `audit_row` por cada evento rellenado                  | Asumida: la traza es deseable y son pocos eventos                                         |
| `rebuild_match_stints` no comprueba que el jugador que **sale** esté en el campo                               | Abierta. El que entra sí se comprueba, que es el que rompía la restricción                |
| El descarte de sustituciones repetidas solo vive en el retorno de la función                                   | Abierta hasta la T-210                                                                    |
| Siete funciones de disparador con `grant execute` a `authenticated` que no necesitan                           | Abierta. Siete líneas en la próxima migración de endurecimiento                           |
| `coverage_update` y `matches_update` siguen citando `match.close`                                              | Correcto a propósito: el acta es del cierre. Anotado para que nadie lo cambie por inercia |

Las de sesiones anteriores siguen abiertas, menos la de `CLAUDE.md`, cerrada hoy: `btree_gist` en `public`, claves ajenas sin índice, trece tablas con dos políticas permisivas de `SELECT`, la `anon key` heredada, el borrado de club bloqueado por `match_squad`, el DOC 14 sin subagentes, el subconjunto de Inter sin afinar y el tema oscuro fuera del MVP.

### AUDITORÍA DE SINCRONÍA (añadido al cierre)

Se comparó documento a documento el repositorio contra el _Knowledge_ del proyecto. El desfase de fondo no estaba arriba: **estaba en el propio DOC 00**, que seguía describiendo un proyecto de hace dos días.

| Dónde                  | Qué estaba mal                                                                                                        |
| :--------------------- | :-------------------------------------------------------------------------------------------------------------------- |
| DOC 00 §3.1            | 07 «desbloqueado, siguiente» y 08 «bloqueado por 07», estando los dos escritos. 03, 04, 05, 06 y 10 con versión vieja |
| DOC 00 §7              | La Fase 0 daba por pendientes el 07 y el 08                                                                           |
| DOC 00 §4.4            | GitHub «decide público o privado antes del primer commit», decidido hace días                                         |
| DOC 00, las dos copias | La del _Knowledge_ y la de `/docs` decían v1.2 y **no eran el mismo archivo**: una celda distinta                     |
| `CLAUDE.md`            | Citaba `docs/05_Modelo_Datos.md`, que no existe, y daba el 05, el 08 y el 13 por no escritos                          |
| _Knowledge_            | Sin el **07**. Con el **03**, el **04**, el **06** y el **10** en versiones anteriores al 12/09                       |

Corregido todo: DOC 00 a v1.3, `CLAUDE.md` al día, y el _Knowledge_ resincronizado desde el repositorio.

**La regla que se saltó, y que ahora está escrita en el §3.2:** la copia buena es `/docs`. Editar solo la copia del _Knowledge_ produce exactamente lo que se encontró hoy, dos archivos con el mismo número de versión y distinto contenido.

El **15** no sube al _Knowledge_ a propósito: su resumen vive en `CLAUDE.md` y los hooks lo aplican solos.

### SIGUIENTE TAREA SUGERIDA

**T-101**: dependencias del DOC 06 §2.3, `shared/lib/env.ts` y `shared/lib/supabase.ts`, con `tsc -b` y CI en verde. Es la primera tarea que escribe código de aplicación, y los tipos que necesita ya están regenerados y commiteados.

Ojo con una cosa al escribirla: el DOC 13 anterior daba por buena la ruta `src/shared/types/database.types.ts`. La real es **`src/types/database.types.ts`**.

### COMANDOS PARA VERIFICAR

```powershell
cd D:\Documentos\Proyectos\ProyectoSASI\App
git switch main
git pull
git log --oneline -3
git ls-files supabase/migrations
```

Deben salir las cuatro migraciones y los dos merges, `b0ff7cb` y `9632e22`.

Los DOC 05, 08 y 13 están subidos al _Knowledge_ del proyecto en su versión fusionada.

### AVISO DE SEGURIDAD

Sigue vigente: al abrir el panel del proveedor de Google en Supabase, **Chrome autorrellena «Client IDs» y «Client Secret»** con credenciales guardadas. Vacía los dos campos antes de tocar nada; si se pulsa «Save» con eso dentro, tu contraseña acaba escrita en la configuración del proveedor.
