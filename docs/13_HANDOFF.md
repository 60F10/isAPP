# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 11/09/2026 (noche) — Tarea: aplicar el esquema y montar la conexión con Supabase

Sesión de Cowork con la carpeta conectada, el conector de Supabase, el de Netlify y Chrome. **Sin acceso a terminal ni a Git en el equipo**, así que el commit lo lanza Raúl a mano: ver «Pendiente de la tarea».

### HECHO

**Base de datos.**

- **La migración inicial, aplicada** al proyecto GavetaStats (registrada como `20260911213846`). Entró entero y a la primera: 23 tablas, las 23 con RLS, 50 políticas, 5 vistas con `security_invoker`, 19 enumeraciones, 25 disparadores y el disparador sobre `auth.users`.
- **Segunda migración de endurecimiento (nueva, registrada como `20260911214032`)**, escrita y aplicada a partir de lo que destapó el auditor de Supabase. Cuatro bloques, cada uno documentado en el propio archivo:
  1. `search_path` fijo en `set_updated_at`, la única función que lo tenía variable.
  2. **El agujero de verdad.** La migración inicial hacía `revoke all on all functions ... from anon` y no bastaba: PostgreSQL concede `EXECUTE` a `PUBLIC` al crear una función y `anon` lo hereda, así que revocar solo de `anon` no quita lo heredado. Cualquiera con la `anon key` —que va en el frontend por diseño— podía llamar a `rebuild_match_stints` y a `flag_duplicate_candidates` por `/rest/v1/rpc` **sin iniciar sesión**, y son `SECURITY DEFINER`: escriben saltándose la RLS. Ahora se revoca de `public` y de `anon`, y se concede solo a `authenticated`.
  3. Las doce políticas que llamaban a `auth.uid()` por fila pasan a `(select auth.uid())`, que el planificador resuelve una vez por consulta. Importa sobre todo en `match_events`.
  4. `audit_row()` rellena `club_id`. Lo dejaba nulo, y la política `audit_log_select` lo exige para que quien tiene `members.manage` lea la auditoría de su club: E9-02 se quedaba a medias.
  5. Índices sobre las trece claves ajenas que sostienen un borrado en cascada o una consulta del día de partido. Las otras veintisiete que marcó el auditor son columnas `created_by` que nadie consulta; ver deuda.

**Prueba de humo.** Se montó un club completo —temporada, dos equipos, dos jugadores, plantilla, competición, partido, dos partes, convocatoria, cambio, gol propio y gol rival—, se recalcularon los tramos y se leyeron las cinco vistas. Todo correcto y comprobado contra el DOC 04:

- Alta de perfil automática desde los metadatos de Google al crear la cuenta.
- `club_id` de `matches` derivado del equipo por el disparador.
- Tramos: Chispa 0→1800 (`substitution`), Tanque 1800→2760 y 0→2820. Minutos: 30 y 63.
- Marcador calculado 1-1, coincidente con el del acta.
- `v_player_match_stats`, `v_player_season_stats` y `v_team_season_stats` cuadran.
- Auditoría: siete filas, todas con `club_id`.

Siete invariantes probados **en negativo**, y los siete bloquean: jugador no convocado (I-04), tipo de evento desactivado (R-09), parte inexistente (R-08), tramos solapados (I-03), `client_event_id` repetido (I-08), nombre real sin consentimiento (I-10) y segunda temporada en curso en el mismo club.

Los datos de prueba se borraron. La base queda vacía salvo la fila `duplicate_window_seconds` de `app_settings`.

**Tipos.**

- **`src/types/database.types.ts` (nuevo, 1.959 líneas)**, generado desde el esquema aplicado.
- **`.prettierignore`**: se añade ese archivo. Prettier lo reformatearía entero —3.538 líneas de diferencia comprobadas— y cada regeneración traería un diff falso de ese tamaño, además de romper `format:check` en CI. `oxlint` sí pasa limpio sobre él.
- **`package.json`**: script `db:types`. Necesita `npm i -D supabase`, que todavía no está instalado (DOC 06 §2.3).

**Configuración.**

- **Supabase → Auth → URL Configuration.** Site URL a `https://gavetastats.netlify.app` (estaba en el `http://localhost:3000` por defecto). Tres URL de redirección: la de producción, `http://localhost:5173/**` para desarrollo y `https://*--gavetastats.netlify.app/**` para los deploy previews por rama que menciona el DOC 15 §2.
- **Netlify → gavetastats → Environment variables.** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_APP_ENV=production`, todas en todos los ámbitos y contextos, ninguna marcada como secreta. **El conector de Netlify respondió «Environment variable upserted» tres veces sin guardar nada**; se detectó al verificar en el panel y se metieron a mano. No te fíes de ese conector sin comprobar.

### ESTADO DEL REPOSITORIO

**Nada de esto está commiteado.** Lo que espera en el árbol de trabajo:

| Archivo                                                           | Estado     |
| :---------------------------------------------------------------- | :--------- |
| `supabase/migrations/20260911213846_initial_schema.sql`           | Renombrado |
| `supabase/migrations/20260911214032_hardening_rls_y_permisos.sql` | Nuevo      |
| `src/types/database.types.ts`                                     | Nuevo      |
| `package.json`                                                    | Modificado |
| `.prettierignore`                                                 | Modificado |
| `docs/05_Modelo_Datos_RLS.md`                                     | Modificado |
| `docs/00_Indice_Documental_y_Herramientas.md`                     | Modificado |
| `docs/13_HANDOFF.md`                                              | Modificado |

El renombrado lo hace `git mv` en los comandos del final; los dos documentos salen ya corregidos de esta sesión.

El resto del repositorio, sin cambios respecto a la sesión anterior: `src/` sigue siendo la plantilla de Vite, ninguna de las dependencias del DOC 06 §2.3 está instalada, y no existen `src/shared/lib/supabase.ts` ni `env.ts`.

**No se crearon esos dos archivos a propósito.** Sin `@supabase/supabase-js` instalado, `tsc -b` falla, y con él el `pre-push` y el workflow de CI. Entran en la primera tarea de código, junto a las dependencias.

### PENDIENTE DE LA TAREA

1. **Commit y merge.** Sin terminal en esta sesión. El equipo solo concede terminales en modo «clic», sin teclado, así que Git queda fuera de alcance. Comandos en el apartado final.

2. **`.env.local`.** No se pudo escribir: el puente con el equipo bloquea la escritura sobre archivos `.env` por política, y es una protección razonable. Hazlo tú:

   ```powershell
   cd D:\Documentos\Proyectos\ProyectoSASI\App
   Copy-Item .env.example .env.local
   ```

   Y rellena:

   ```
   VITE_SUPABASE_URL=https://rsbahpngpkvafnhejjfj.supabase.co
   VITE_SUPABASE_ANON_KEY=<la anon public del panel: Project Settings → API Keys>
   ```

3. ~~Login con Google~~ — **terminado y probado de punta a punta.** Cliente de OAuth creado en un proyecto propio de Google Cloud (`gavetastats`), proveedor activado en Supabase y login real completado: `auth.users` y `profiles` creados, `display_name` y `avatar_url` rellenos por el disparador `handle_new_user`. Raúl queda con `is_platform_admin = true`. Toda la configuración, sin el secreto, en el **DOC 10 §4**.

4. **Cubos de Storage (`crests`, `docs`) sin crear.** DOC 05 §13. No bloquean nada hasta que haya escudos que subir.

### AVISO DE SEGURIDAD

Al abrir el panel del proveedor de Google en Supabase, **Chrome autorrellenó el formulario con credenciales guardadas**: el campo «Client IDs» con `GavetaStats` y el «Client Secret» con una contraseña. El gestor de contraseñas trata ese panel como un formulario de acceso. Se canceló sin guardar. Si se pulsa «Save» ahí, tu contraseña acaba escrita en la configuración del proveedor. Revisa esos dos campos cada vez que abras el panel.

### DEUDA TÉCNICA

Nueva, de esta sesión:

| Deuda                                                                                                                                                                  | Estado                                                                              |
| :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------- |
| `btree_gist` instalado en el esquema `public` en vez de en `extensions`                                                                                                | Abierta. Moverlo obliga a tirar y rehacer la restricción de exclusión de los tramos |
| Veintisiete claves ajenas siguen sin índice, casi todas columnas `created_by`                                                                                          | Abierta. Ninguna se consulta hoy                                                    |
| Trece tablas con dos políticas permisivas para `SELECT`, porque las políticas `for all` también cubren la lectura                                                      | Abierta. Se paga separando `insert`/`update`/`delete`                               |
| Se usa la `anon key` heredada (JWT) y no la clave publicable `sb_publishable_…`, que es la que Supabase recomienda para proyectos nuevos por su rotación independiente | Abierta. Se eligió la heredada por coincidir con el DOC 05 y el `.env.example`      |
| Borrar un club falla mientras haya filas en `match_squad`: la cascada `clubs → players` choca con el `on delete restrict` de `match_squad.player_id`                   | Abierta. Protege el histórico, pero conviene saberlo                                |

La del repositorio sigue igual que en la sesión anterior, más las dos correcciones de documentación que aquella dejó abiertas: **`CLAUDE.md` cita `docs/05_Modelo_Datos.md`, que no es el nombre real**, y **el DOC 14 no menciona los subagentes**.

### DECISIONES TOMADAS

**Las migraciones se nombran con marca de tiempo, no con número correlativo.** Se aplicaron por el conector, que las registró como `20260911213846` y `20260911214032`, mientras que los archivos se llamaban `0001_` y `0002_`. El CLI de Supabase deriva la versión del prefijo del nombre, así que un `supabase db push` las habría dado por aplicar y habría intentado repetirlas.

Se renombran los archivos a las versiones reales. Es la convención del propio CLI —`supabase migration new` pone la marca de tiempo sola—, deja `db push` funcionando de serie y evita tener que acordarse de `supabase migration repair` en cada entorno nuevo. Se descartó dejar los nombres y reparar el historial: respeta el documento, pero mete un paso manual que algún día se olvidará.

Consecuencia: **el DOC 05 §14 y el DOC 00 quedaban desfasados y se han corregido en esta misma sesión.** El §14 pasa a explicar la convención, a listar las dos migraciones con su versión y a recoger, en un §14.1 nuevo, qué corrigió el endurecimiento y la regla que deja: revocar de una función se hace siempre de `public` además de `anon`.

**Sobre el ámbito del commit.** La rama toca `db` y `docs`, y el DOC 15 §2 pide una rama por módulo. Aquí es una sola tarea: los documentos corregidos son los que nombran los archivos que se acaban de renombrar, no un trabajo de documentación aparte. Van en la misma rama, en su propio commit, y el título del pull request manda con ámbito `db`.

### SIGUIENTE TAREA SUGERIDA

Con el esquema aplicado y los tipos generados, la Fase 1 está desbloqueada. En orden:

1. **Cerrar esta tarea**: commit, merge y `.env.local`.
2. **Login con Google**, rama `feat/auth-login-google`. Es lo que falta para que la aplicación pueda tener sesión, y todo lo demás cuelga de ahí.
3. **PWA y metadatos**, rama `feat/platform-pwa-y-metadatos`, que sigue siendo la primera tarea de código del DOC 06 y no depende de nada de esto.

El **DOC 07** (sistema de diseño) sigue bloqueado por el bloque F del DOC 03: confirmar «GavetaStats» como nombre. A estas alturas el proyecto de Supabase, el sitio de Netlify, las variables de entorno y la Site URL se llaman todos así; cambiarlo ahora ya cuesta.

### COMANDOS PARA CERRAR LA TAREA

```powershell
cd D:\Documentos\Proyectos\ProyectoSASI\App

git switch main
git pull
git switch -c feat/db-aplicar-esquema-inicial

# 1 · Renombrar las migraciones a su versión real
git mv supabase/migrations/0001_initial_schema.sql `
       supabase/migrations/20260911213846_initial_schema.sql
git mv supabase/migrations/0002_hardening_rls_y_permisos.sql `
       supabase/migrations/20260911214032_hardening_rls_y_permisos.sql

# 2 · El esquema y los tipos
git add supabase/migrations src/types/database.types.ts package.json .prettierignore
git commit -m "feat(db): apply initial schema and harden rls on supabase"

# 3 · Los documentos que describen lo anterior
git add docs/05_Modelo_Datos_RLS.md docs/00_Indice_Documental_y_Herramientas.md docs/13_HANDOFF.md
git commit -m "docs(db): align migration naming and record hardening in doc 05"

npm run format:check    # debe pasar: database.types.ts va ignorado
git push -u origin feat/db-aplicar-esquema-inicial
```

Pull request en GitHub con el mismo título que el commit, CI en verde, squash merge, y la rama se borra sola (DOC 15 §4).

### DOC 10 NUEVO

Se abre **`docs/10_Entornos_y_Despliegue.md` v0.1, parcial a propósito**. Registra el inventario de servicios, dónde vive cada variable de entorno, dónde vive cada secreto y dónde no, toda la configuración de la autenticación y una lista de comprobación de entorno. Lo que falta —deploy previews, checklist de publicación, vuelta atrás— está listado en su §7. El DOC 00 pasa el 10 a 🚧.

Ahí queda también anotado que el dominio feo de la pantalla de Google solo se arregla con el add-on de Custom Domains, unos 10 $/mes más el plan Pro: fuera del presupuesto de 0 €, y por tanto asumido.

### PASOS DEL LOGIN CON GOOGLE (hechos, se dejan como referencia)

En **Google Cloud Console**, con tu cuenta:

1. Crea un proyecto, o reutiliza uno.
2. **APIs y servicios → Pantalla de consentimiento de OAuth.** Tipo **Externo**. Nombre de la aplicación, correo de asistencia y correo de contacto. Ámbitos: los tres básicos (`userinfo.email`, `userinfo.profile`, `openid`) y ninguno más — la aplicación no necesita nada del usuario salvo nombre, correo y avatar.
3. Mientras esté en modo de prueba, añade tu correo y el de Isaac como usuarios de prueba. Publicarla puede esperar.
4. **Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web.**
   - Orígenes autorizados de JavaScript: `https://gavetastats.netlify.app` y `http://localhost:5173`
   - URI de redirección autorizado, exactamente este:
     ```
     https://rsbahpngpkvafnhejjfj.supabase.co/auth/v1/callback
     ```
5. Copia el **Client ID** y el **Client Secret**.

En **Supabase → Authentication → Sign In / Providers → Google**:

6. **Vacía primero los dos campos**: Chrome los autorrellena con tus credenciales (ver el aviso de seguridad).
7. Pega el Client ID en «Client IDs» y el secreto en «Client Secret».
8. Activa «Enable Sign in with Google» y guarda.

La Site URL y las URL de redirección ya están puestas, así que no hay nada más que tocar en Supabase.
