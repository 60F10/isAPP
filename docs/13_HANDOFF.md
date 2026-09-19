# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 19/09/2026 — Endurecimiento de permisos en la base de datos

Sesión de Cowork sobre el repositorio local, de madrugada y sin nadie delante. Ciclo completo:
desarrollo, commit, push, pull request y fusión con squash.

> **Esto no es una tarea del DOC 08.** Son los puntos 3 y 4 de «lo que sigue abierto» del
> traspaso anterior, arrastrados desde la T-100b. Deuda, no tarea, y así queda anotada: el DOC 08
> no se toca.

> **Y falta un traspaso por el camino.** Entre la sesión del 18/09 y esta entraron las PR #27
> —inventario de pantallas al día con el recorte del DOC 08 §7— y #28 —el `ignore` de Netlify
> para los commits de solo documentación—, y ninguna dejó constancia aquí. Lo que cerró la #27
> está retirado de la lista de abajo; lo de la #28 vive en el DOC 10 §2.1 y en `CLAUDE.md`.

| PR      | Rama                                | Contenido                                                                      | CI                                                    |
| :------ | :---------------------------------- | :----------------------------------------------------------------------------- | :---------------------------------------------------- |
| **#29** | `feat/db-endurecimiento-permisos`   | Un commit: la migración `20260919040657_endurecimiento_permisos_funciones.sql` | Verde · 1 neutro y 5 correctos · fusionada con squash |
| **#30** | `docs/docs-endurecimiento-permisos` | DOC 05 v1.3 (§14 y §14.3 nuevo) y este DOC 13                                  | —                                                     |

---

## HECHO

**Ocho funciones del esquema `public` dejan de ser llamables desde la API.** Nada más. Ni una
definición de función, ni una política, ni una columna: la migración son nueve `revoke` y el
resto son comentarios.

| Qué                     | Antes                                                                              | Después                         |
| :---------------------- | :--------------------------------------------------------------------------------- | :------------------------------ |
| `rls_auto_enable()`     | `=X/postgres` (o sea PUBLIC) · `postgres=X` · `authenticated=X` · `service_role=X` | `postgres=X` · `service_role=X` |
| Las siete de disparador | `postgres=X` · `authenticated=X` · `service_role=X`                                | `postgres=X` · `service_role=X` |

Las siete de disparador son `audit_row`, `backfill_event_seconds`, `enforce_match_changes`,
`handle_new_user`, `set_event_seconds`, `set_match_club_id` y `validate_match_event`.

La migración se aplicó **a producción** con `apply_migration` antes de fusionar, porque no hay
entorno de pruebas. El archivo del repositorio es idéntico a lo aplicado, y su prefijo coincide
con la versión del historial remoto: `20260919040657`.

---

## LA PRUEBA, ANTES Y DESPUÉS

Todo medido contra la base de producción, que es la única que hay.

**1 · Privilegios.** `has_function_privilege` sobre las ocho funciones:

| Rol             | Antes                                                         | Después               |
| :-------------- | :------------------------------------------------------------ | :-------------------- |
| `anon`          | cierto en `rls_auto_enable`, falso en las siete de disparador | **falso en las ocho** |
| `authenticated` | cierto en las ocho                                            | **falso en las ocho** |
| `service_role`  | cierto en las ocho                                            | cierto en las ocho    |

**2 · El auditor de Supabase** (`get_advisors`, tipo `security`):

| Aviso                                      | Antes | Después                                |
| :----------------------------------------- | ----: | :------------------------------------- |
| `0028` · lo puede ejecutar `anon`          |     1 | **desaparece**                         |
| `0029` · lo puede ejecutar `authenticated` |    19 | **11**, y ninguno es de las ocho       |
| `extension_in_public` (`btree_gist`)       |     1 | 1 · ya estaba, es el punto 12 de abajo |
| `auth_leaked_password_protection`          |     1 | 1 · ya estaba, ajeno a esta migración  |

**Ningún aviso nuevo.** Los once que quedan del `0029` son las funciones auxiliares y de RPC
—`can_read_club`, `can_read_team`, `has_club_permission`, `has_team_permission`,
`is_club_member`, `is_platform_admin`, `is_team_follower`, `is_team_member`, `team_of_match`,
`rebuild_match_stints` y `flag_duplicate_candidates`—, que sí necesitan el `EXECUTE` porque las
llaman las políticas RLS y el cliente.

**3 · Nada se rompió.** Veintiocho disparadores de veintiocho con `tgenabled = 'O'`. El
disparador de eventos `ensure_rls`, con `evtenabled = 'O'`. Las ocho huellas `md5(prosrc)`,
idénticas antes y después: ninguna definición se tocó.

**4 · Dos pruebas funcionales, porque razonar no basta.**

- **Antes de aplicar**, en una prueba aparte: una tabla con un disparador `BEFORE INSERT` cuya
  función no tenía `EXECUTE` ni para PUBLIC ni para `authenticated`. Se insertó con `set local
role authenticated` y el disparador saltó igual —el valor entró como 2 en vez de como 1—.
  Ahí queda demostrado que PostgreSQL comprueba `EXECUTE` al **crear** el disparador, no al
  dispararlo.
- **Después de aplicar**: una tabla nueva en `public` nació con `relrowsecurity = true`. El
  disparador de eventos sigue haciendo su trabajo sin el `EXECUTE` que se le quitó. Los objetos
  de las dos pruebas se borraron en el acto.

**5 · Los tipos generados no se mueven.** `src/types/database.types.ts` del repositorio y los
recién generados desde Supabase coinciden byte a byte, mismo SHA-256, 61 580 bytes y 1964
líneas. Es lo que se espera de una migración de solo permisos; si hubieran cambiado, habría
que haber parado.

**6 · Local en verde.** `npm run lint` (0 avisos y 0 errores sobre 151 reglas en 38 archivos),
`npx prettier --check .` y `npm run build`. El build repite las cifras de la T-102: 572,51 kB
en crudo y 166,26 kB comprimidos de JavaScript, 11,61 kB y 3,12 kB de CSS, y
`precache 17 entries (641.88 KiB)`.

---

## DECISIONES TOMADAS

**El punto 3 no obligaba a meter una función de Supabase en el repositorio.** El traspaso
anterior daba por hecho que revocar `rls_auto_enable()` significaba redefinirla, y por eso
llevaba una semana parado. `REVOKE` trabaja sobre la firma y no sobre el cuerpo: se revoca sin
copiar nada de la plataforma. La pega no existía.

**Se revoca de `public`, no solo de `anon`, y esto es lo que de verdad decide el punto 3.** El
permiso de `anon` no era una concesión suya: era la de PUBLIC, ese `=X/postgres` sin nombre
delante que aparecía en la ACL. Un `revoke ... from anon` a secas habría dejado el aviso donde
estaba y la sesión habría cerrado creyendo que arreglaba algo. Es la regla que ya dejó el
endurecimiento del 11/09 (DOC 05 §14.1), y van tres veces que la misma trampa aparece.

**Se revoca también el `EXECUTE` de `authenticated` sobre `rls_auto_enable()`.** El punto 3
hablaba solo de `anon`, pero el auditor la marcaba dos veces y el criterio era que el aviso
desapareciera. A una función de disparador de eventos no la llama nadie por RPC.

**`service_role` conserva el suyo en las ocho.** Es la llave del servidor, no sale al
frontend y el auditor no la marca. Quitárselo no arregla nada y puede romper mantenimiento
futuro.

**`set_updated_at()` se queda fuera, y es discutible.** Es la octava función de disparador y
arrastra el mismo `EXECUTE` de `authenticated` que sobra. Quedó fuera por dos razones: el
auditor no la marca —es `SECURITY INVOKER`, así que llamarla a mano no salta la RLS— y el
alcance escrito eran siete funciones, no ocho. Cuesta una línea y el riesgo es cero, ya está
demostrado; se deja para que lo decida una persona en vez de ampliar el alcance de madrugada.

**Una sola migración para los dos puntos.** Son el mismo tipo de cambio y comparten el
razonamiento. Partirla en dos archivos habría duplicado el comentario sin ganar nada.

**Se aplicó a producción antes de fusionar.** No hay entorno de pruebas, así que el archivo del
repositorio documenta lo aplicado y no una intención. Con la comprobación de antes y después
hecha en la misma sesión, el orden inverso —fusionar y luego aplicar— dejaría una ventana en la
que el repositorio miente.

---

## DEUDA TÉCNICA GENERADA

Esta migración no genera deuda nueva de esquema. Lo que sí deja es esto:

| Deuda                                                                                     | Estado                                                             |
| :---------------------------------------------------------------------------------------- | :----------------------------------------------------------------- |
| **`npm run db:types` destruye el archivo de tipos cuando el CLI falla**                   | **Abierta.** Ver abajo, que muerde                                 |
| `set_updated_at()` con el `EXECUTE` de `authenticated` que sobra                          | Abierta. Una línea en la próxima migración que toque permisos      |
| Si Supabase recrea `rls_auto_enable()` con `DROP` + `CREATE`, el permiso de PUBLIC vuelve | Asumida. Mirar el auditor tras cada actualización de la plataforma |

**La del `db:types`, con detalle, porque pasó de verdad hoy.** El script es
`supabase gen types typescript --project-id ... > src/types/database.types.ts`. El `>` crea el
archivo vacío **antes** de que el comando escriba nada, así que si el comando falla —hoy falló
por no haber `SUPABASE_ACCESS_TOKEN` en el entorno ni sesión de `supabase login`— el archivo se
queda en cero bytes y el fallo parece un borrado misterioso. Se restauró con
`git checkout -- src/types/database.types.ts`, y la comprobación de tipos de esta sesión se hizo
por el MCP de Supabase. **Antes de tocar ese script, haz copia.** La salida buena es escribir a
un temporal y mover solo si el comando termina bien.

---

## LO QUE SIGUE ABIERTO DE SESIONES ANTERIORES

Nada de esto se ha tocado hoy, y se pierde si no se arrastra. **Tres puntos de la lista
anterior ya no están:** los puntos 3 y 4 los cierra esta sesión —`rls_auto_enable()` y el
`EXECUTE` de las siete funciones de disparador—, y el 5 lo cerró la PR #27, que puso al día la
columna «Fase» del DOC 02 §2.

Pendiente de decidir, que no lo decide el código:

1. **Los cinco destinos de la barra apuntan a pantallas sueltas.** EQUIPO, DATOS y MÁS son
   grupos sin pantalla de aterrizaje en el DOC 02 §3, y «Más» abriendo Ajustes se lee raro. O
   pantallas índice de sección —dos pantallas nuevas al inventario— o se acepta el atajo. Se
   decide en la T-107.
2. **`clock` y `plus` haciendo de casa y calendario.** El inventario de 21 iconos del DOC 07
   §8.2 no tiene ninguno de los dos. Decidir si entran dos iconos nuevos.

Pendiente de hacer:

3. **El aviso de versión nueva sale también en mitad de un partido**, y eso contradice la
   decisión D06-14: mientras haya partido en curso, el aviso se guarda y no se muestra. El
   estado de partido no existe todavía —es la T-207— y no se inventó. El punto de enganche está
   comentado en `ActualizacionDisponible.tsx` y es una línea:
   `if (!hayVersionNueva || partidoEnCurso) return null;`. **Quien coja la T-207 tiene que
   cerrarla.** Viene de la T-102.
4. **`set_updated_at()` arrastra el `EXECUTE` de `authenticated` que no necesita.** Una línea en
   la próxima migración de permisos. Nace hoy, con la explicación en el DOC 05 §14.3.
5. **`npm run db:types` deja el archivo de tipos a cero bytes si el CLI falla.** Nace hoy.
6. Marcar `event.approve` a quien lleve el registro, cuando exista la T-301.
7. Los cubos de Storage `crests` y `docs`, sin crear.
8. `vitest` instalado sin bloque `test` en `vite.config.ts` ni paso de CI. Entra con la primera
   prueba, que por el DOC 06 §11 será del `model/` de `match`.
9. Los alias viven duplicados en `tsconfig.app.json` y en `vite.config.ts`, a mano.
10. El error de entorno se lanza sin interfaz: pantalla en blanco y mensaje en consola, hasta
    la T-106.
11. `/admin/logs` sigue sin guardia de permiso: el DOC 05 §4 no define ninguno de
    administración. Lo resuelve la T-303.
12. `permisos` vale `null`, así que toda ruta con `RequirePermission` se queda en «Cargando…».
    Lo desbloquea la T-105, y es lo que la convierte en la siguiente tarea.
13. Faltan tokens de anchura de maqueta en el DOC 07: el rail y la caja de `BareLayout` salen
    de `--tap-min`.
14. Veinte rutas comparten la misma `PantallaPendiente`. Cada una la sustituye su tarea.
15. Deudas de base de datos abiertas: `btree_gist` en `public`, veintisiete claves ajenas sin
    índice, trece tablas con dos políticas permisivas de `SELECT`, `rebuild_match_stints` sin
    comprobar que el jugador que sale esté en el campo, y el descarte de sustituciones
    repetidas viviendo solo en el retorno de la función.

Asumidas y sin fecha, que no son tareas pero conviene no olvidar: `vite build` avisa de que el
trozo inicial pasa de 500 kB en crudo —el aviso dice la verdad y es el único control automático
que hay—, y el marco de la ventana vive en `App` como una pieza más entre el enrutador y las
maquetas, que es lo que permite que ninguna banda tape el elemento enfocado.

---

## SIGUIENTE TAREA SUGERIDA

**T-105**, acceso con Google. Sigue siendo la única que desatasca las veinte rutas que hoy se
quedan en «Cargando…». Sin ella, la T-106 y la T-107 se prueban a ciegas y toda la Fase 2 sigue
parada.

**Y el aviso de método, otra vez, porque es lo que más se pierde entre traspasos: la T-105 no
se puede dejar corriendo sola.** Una sesión automática escribe el código, monta el proveedor y
comprueba que la redirección a Google sale bien, pero el clic en la pantalla de cuenta y la
aceptación de permisos los da una persona. **No la programes de madrugada:** llega hasta la
redirección y ahí se planta. Ya van dos sesiones eligiendo otra cosa por este motivo; la
siguiente tiene que ser con Raúl delante.

Cuatro avisos para quien la coja:

- **`AuthProvider` ya existe y solo hay que rellenarlo.** El contrato está puesto: `session`,
  `cargando` y `permisos`. Falta el perfil, los equipos, el equipo activo y el conjunto de
  permisos de verdad.
- **`permisos` tiene que pasar de `null` a un `Set` solo cuando la consulta se haya resuelto.**
  Si se rellena antes con un conjunto vacío, `RequirePermission` manda a `/403` a quien sí
  tiene permiso, y el fallo parece de permisos cuando es de carga.
- **`RequirePermission` ya está cableado en el enrutador** con el permiso de cada ruta. No hay
  que tocar `router.tsx`: en cuanto `permisos` traiga datos, las rutas se abren solas.
- **El equipo activo se recuerda en `localStorage`** (DOC 06 §5.5), y un usuario puede tener
  función en varios equipos (decisión H3).

---

## COMANDOS PARA VERIFICAR

```powershell
cd D:\Documentos\Proyectos\ProyectoSASI\App
Remove-Item Env:\NODE_ENV          # imprescindible, ver el hallazgo de la T-101
git switch main
git pull
git log --oneline -3

npm ci
npm run lint
npx prettier --check .
npm run build
```

El build tiene que terminar en verde y decir `572.51 kB` en crudo y `166.26 kB` comprimidos de
JavaScript, más `11.61 kB` y `3.12 kB` de CSS. Al final, `precache 17 entries (641.88 KiB)`. Si
sale bastante más, `NODE_ENV` volvió a colarse. **Y ojo con `set NODE_ENV=` en `cmd`:** deja la
variable a cadena vacía, empaqueta React en modo desarrollo y el mismo build da 794 kB y 230 kB
comprimidos. La forma buena es `Remove-Item Env:\NODE_ENV` en PowerShell.

**`npm run db:types` NO se lanza a la ligera.** Sin `SUPABASE_ACCESS_TOKEN` en el entorno o sin
`supabase login`, el comando falla y el `>` del script deja `src/types/database.types.ts` en
cero bytes. Si pasa: `git checkout -- src/types/database.types.ts`.

Para volver a comprobar los permisos de esta sesión, en el editor SQL de Supabase:

```sql
select p.proname,
       coalesce(array_to_string(p.proacl, ' | '), '<<NULL>>') as acl,
       has_function_privilege('anon', p.oid, 'execute')          as anon_puede,
       has_function_privilege('authenticated', p.oid, 'execute') as auth_puede
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('rls_auto_enable','audit_row','backfill_event_seconds',
                    'enforce_match_changes','handle_new_user','set_event_seconds',
                    'set_match_club_id','validate_match_event')
order by p.proname;
```

Las ocho tienen que salir con `postgres=X/postgres | service_role=X/postgres` y las dos
columnas de la derecha en falso. Y los disparadores, todos vivos:

```sql
select count(*) filter (where tgenabled = 'O') as activos, count(*) as total
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
join pg_namespace n on n.oid = p.pronamespace
where not t.tgisinternal and n.nspname = 'public';
```

Veintiocho de veintiocho. El auditor, con `get_advisors` de tipo `security`: sin el aviso
`0028` y con once hallazgos del `0029`, ninguno de las ocho funciones de arriba.

---

## AVISO DE SEGURIDAD

Sigue vigente, y **la siguiente tarea es justo la que lo pisa**: al abrir el panel del proveedor
de Google en Supabase, **Chrome autorrellena «Client IDs» y «Client Secret»** con credenciales
guardadas. **Vacía los dos campos antes de tocar nada.** Si se pulsa «Save» con eso dentro, tu
contraseña acaba escrita en la configuración del proveedor.
