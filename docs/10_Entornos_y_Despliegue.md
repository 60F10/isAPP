# DOC 10 — Entornos y despliegue

> **Versión:** 0.8 — 27/09/2026 (§2.2: pre tampoco compiló con la #55, con el panel bien) · 0.7 — 27/09/2026 (§2.1, §2.2 y §4.5: los paneles de Netlify y de Supabase, comprobados por Raúl el 26/09; se retira la hipótesis de la rama de producción) · 0.6 — 26/09/2026 (§2.2: pre no compiló con la primera fusión; §2.1: el patrón del §4.5 ya cubre pre) · 0.5 — 26/09/2026 (§2.1 y §2.2: pre en `main`, pro en `release` y los créditos de Netlify, decisión de Raúl) · 0.4 — 20/09/2026 (§4.5 y §5: la vuelta del acceso y los datos de arranque, con la T-105) · 0.3 — 19/09/2026 (§2.1, los minutos de compilación de Netlify) · 0.2 — 12/09/2026 · **Parcial a propósito** (0.1 el 11/09; el 12/09 se añade §5.1, copias de seguridad)
> **Depende de:** DOC 05 (modelo de datos), DOC 06 (arquitectura frontend), DOC 15 (convenciones de Git)
>
> Esta versión registra **la configuración real de los servicios externos** tal como quedó al montar Supabase. El resto del documento —deploy previews, checklist de publicación, procedimiento de vuelta atrás— está por escribir; ver §7.

---

## 1. Para qué sirve este documento

Dice dónde vive cada servicio, qué valor tiene configurado y quién lo guarda. Sin esto, la configuración solo existe en la cabeza de quien la puso y en paneles web que nadie vuelve a mirar hasta que algo falla.

**Ningún secreto entra aquí.** Este documento dice _dónde_ está cada secreto, nunca _cuál_ es.

---

## 2. Inventario de servicios

| Servicio         | Qué es                         | Plan     | Identificador                                                       |
| :--------------- | :----------------------------- | :------- | :------------------------------------------------------------------ |
| **Supabase**     | Base de datos, autenticación   | Gratuito | Proyecto `GavetaStats` · `rsbahpngpkvafnhejjfj` · West EU (Irlanda) |
| **Netlify**      | Alojamiento y despliegue       | Gratuito | Sitio `gavetastats` · `gavetastats.netlify.app`                     |
| **Google Cloud** | Cliente de OAuth para el login | Gratuito | Proyecto `gavetastats`                                              |
| **GitHub**       | Repositorio                    | Gratuito | `60F10/isAPP`, privado                                              |

Todo dentro del presupuesto de 0 € del proyecto. La región de Supabase es Irlanda: lo más cercano a Canarias dentro de la UE, que es lo que pide el DOC 11.

### 2.1 Pre y pro, y el recurso que se agota: los créditos de Netlify

**Modelo decidido por Raúl el 26/09/2026.** El plan gratuito de Netlify funciona por **créditos: 300 al mes**, y el equipo es `60F10`. **Lo que gasta es publicar en producción, no subir ramas ni fusionar.** Es el único recurso del proyecto que se puede agotar sin que nadie lo note hasta que deja de desplegar.

| Entorno                | Rama      | URL                                                 | Quién lo publica                                     | Coste       |
| :--------------------- | :-------- | :-------------------------------------------------- | :--------------------------------------------------- | :---------- |
| **Pre**                | `main`    | `https://main--gavetastats.netlify.app`             | Cada fusión a `main`, sola: es un despliegue de rama | 0 créditos  |
| **Pro**                | `release` | `https://gavetastats.netlify.app`                   | **Solo Raúl**, con `git push origin main:release`    | 15 créditos |
| Vista previa de una PR | la de PR  | `https://deploy-preview-N--gavetastats.netlify.app` | Cada subida a una rama con pull request abierta      | 0 créditos  |

**Publicar es un avance rápido.** `release` no recibe commits propios: siempre va por detrás de `main` o igual, y `git push origin main:release` la adelanta hasta `main`. Si Git lo rechaza por no ser avance rápido, alguien ha escrito en `release`, y hay que mirarlo antes de forzar nada. **La rama `release` es permanente**: ni se borra, ni se le abre pull request, ni la tocan las sesiones de Claude.

**Con 300 créditos salen, como mucho, veinte publicaciones al mes.** Pre es gratis: lo que se quiera probar en el móvil antes de publicar se prueba en `main--gavetastats`, que tiene HTTPS y deja probar la PWA de verdad (service worker, instalación, sin conexión). El inicio de sesión con Google en pre lo cubren las URL de redirección del §4.5, comprobadas por Raúl en el panel de Supabase el 26/09.

**Así está el panel de Netlify, comprobado por Raúl el 26/09 con capturas:** rama de producción `release`, despliegues de rama para `main` y vistas previas de cualquier pull request contra esas ramas. Es lo que el modelo necesita.

**Sin comando `ignore` desde el 27/09/2026.** El que había en `netlify.toml` cancelaba todas las compilaciones de `main`, también las que traían código (la #55 de la T-210a), con «Canceled build due to no content change». En el despliegue de rama, `CACHED_COMMIT_REF` no apunta al commit anterior y el `git diff` salía sin diferencias; en las vistas previas pasaba lo contrario y no cancelaba nunca. Pre y las vistas previas cuestan 0, así que no ahorraba nada. **No se vuelve a poner.** En pro, el filtro es quien publica: si desde la última publicación solo hay documentación, no se lanza `git push origin main:release`.

### 2.2 Producción, parada desde el 20/09/2026 por falta de créditos

**Los despliegues a producción están parados desde el 20/09** porque la cuenta se quedó sin créditos. **Se reanudan con el siguiente ciclo de facturación**, y a partir de ahí publica Raúl con `git push origin main:release`. El 26/09 por la tarde, `https://gavetastats.netlify.app` y `https://main--gavetastats.netlify.app` servían el mismo build viejo, anterior a la T-106: `index.html` apunta a `assets/index-jOB7hSkO.js` y no hay trozo `App-*.js`.

**Pre no debería depender de eso**, porque los despliegues de rama cuestan 0. Si una fusión a `main` no aparece en `https://main--gavetastats.netlify.app`, mira por este orden:

1. El registro del despliegue en Netlify. «Canceled build due to no content change» quiere decir que alguien ha vuelto a poner un comando `ignore` (§2.1).
2. _Project configuration → Developer settings → Continuous deployment → Build settings_: **Build status** tiene que estar en **Active builds**. Con **Stopped builds**, Netlify no compila nada, ni producción, ni vistas previas, ni despliegues de rama. Estuvo así desde el 20/09 para no gastar en compilaciones que no publicaban; con el modelo de créditos ya no hace falta.
3. La rama de producción y los despliegues de rama del panel: producción tiene que ser `release`, y `main` tiene que tener despliegue de rama.

**Lo que pasó con la primera fusión del modelo, la #53, el 26/09 por la noche.** Los builds están activos: Netlify compiló la vista previa de la PR, y `deploy-preview-53--gavetastats.netlify.app` servía el build nuevo. Pero **no compiló `main`**: el commit de la fusión no tiene ningún estado de Netlify y `main--gavetastats` seguía con el build viejo. La PR #54 lo achacó a la rama de producción del panel, y **era una hipótesis equivocada**: Raúl revisó el panel el 26/09 con capturas y está como dice el §2.1. La primera fusión con código después de la revisión del panel, la #55 de la T-210a, **tampoco compiló `main`**: el commit de la fusión no tiene ningún estado de Netlify, mientras que la vista previa de la misma PR sí se compiló. **La causa era el `ignore`** (§2.1), y lo confirmó el registro del despliegue el 27/09. Ese día se relanzó `main` a mano con «Retry without cache», compiló, y se quitó el comando.

**Reactivar los builds no lanza ninguna compilación por sí solo**: hace falta un push después.

**Lo que no se tocó, y por qué.** Las vistas previas de las pull requests se quedan: el DOC 14 §5 las señala como lo que «te deja probar en el móvil sin tocar producción», y ahora además no cuestan nada.

---

## 3. Variables de entorno

Solo las que empiezan por `VITE_` llegan al navegador, y **todo lo que llega al navegador es público** (DOC 06 §12).

| Variable                 | Dónde vive                                            | Valor                                      |
| :----------------------- | :---------------------------------------------------- | :----------------------------------------- |
| `VITE_SUPABASE_URL`      | `.env.local` (local) · Netlify (despliegue)           | `https://rsbahpngpkvafnhejjfj.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `.env.local` (local) · Netlify (despliegue)           | La `anon public` del panel de Supabase     |
| `VITE_APP_ENV`           | `.env.local` → `development` · Netlify → `production` | —                                          |

En Netlify las tres están en **todos los ámbitos y contextos**, ninguna marcada como secreta: no lo son.

Variable nueva: se añade a `.env.example`, a `shared/lib/env.ts` y al panel de Netlify **en el mismo commit** (DOC 06 §12).

### 3.1 Qué no es una variable de entorno del frontend

| Secreto                     | Dónde vive de verdad                                | Por qué no está en el frontend                                                         |
| :-------------------------- | :-------------------------------------------------- | :------------------------------------------------------------------------------------- |
| `service_role` de Supabase  | Solo en el servidor. Hoy no se usa en ningún sitio  | Se salta toda la RLS                                                                   |
| **Client secret de Google** | Solo en el panel del proveedor de Supabase, cifrado | El intercambio con Google lo hace el servidor de Supabase; la aplicación nunca lo toca |

El client secret **no va al `.env.local`, ni a Netlify, ni al repositorio, ni a la documentación**. Si se pierde, se genera otro en Google Cloud y se pega de nuevo en Supabase. No hay motivo para tener una copia en ningún otro sitio.

---

## 4. Autenticación

### 4.1 Cliente de OAuth en Google Cloud

Proyecto `gavetastats` · tipo **Aplicación web**.

| Campo                  | Valor                                                                      |
| :--------------------- | :------------------------------------------------------------------------- |
| Client ID              | `850867968630-8kr46m4j0g3dhqgcs8sbn14l5r5lsipn.apps.googleusercontent.com` |
| Client secret          | En Supabase. Ver §3.1                                                      |
| URI de redirección     | `https://rsbahpngpkvafnhejjfj.supabase.co/auth/v1/callback`                |
| Orígenes de JavaScript | `https://gavetastats.netlify.app` · `http://localhost:5173`                |

El client ID es público: viaja en la URL de autorización que ve cualquiera que pulse «Entrar con Google».

**Un origen es esquema y dominio, sin ruta.** El callback lleva `/auth/v1/callback`, así que solo vale como URI de redirección. Google rechaza el formulario si se mezclan.

### 4.2 Permisos solicitados

Tres, y ninguno sensible:

- `openid`
- `.../auth/userinfo.email`
- `.../auth/userinfo.profile`

Son los que alimentan `display_name` y `avatar_url` de `profiles` a través del disparador `handle_new_user` (DOC 05 §5.1). La aplicación no pide nada más de la cuenta de Google, y no debería empezar a hacerlo sin pasar por el DOC 11.

### 4.3 Estado de publicación

**Prueba**, con usuarios externos. Mientras siga así, solo entran los correos de la lista de usuarios de prueba, con un tope de 100. Los cuatro actuales cubren al equipo de desarrollo y a Isaac.

Publicar la aplicación exige completar la información de marca y, según los permisos, pasar verificación de Google. Con tres permisos no sensibles la verificación no se exige, pero **el paso a producción hay que darlo antes de que la use alguien de fuera de esa lista**. Queda anotado en §7.

### 4.4 El dominio que ve el usuario

La pantalla de Google muestra el dominio al que va a devolver al usuario, y hoy es `rsbahpngpkvafnhejjfj.supabase.co`. Queda feo, y no tiene arreglo gratis: se cambia con el add-on **Custom Domains** de Supabase, unos 10 $/mes, que además exige un plan de pago (Pro, 25 $/mes). Los _vanity subdomains_ piden plan de pago igualmente.

Con el presupuesto de 0 € del proyecto, se asume. Atenúa el golpe que el selector de cuenta sea la pantalla fea: la de consentimiento, que es la siguiente y la que la gente lee, muestra «GavetaStats».

Si algún día el proyecto pasa a plan de pago, activar el add-on cambia el `redirect_uri` del cliente de OAuth, así que hay que tocar Google Cloud y el §4.1 de este documento a la vez.

---

### 4.5 URL de autenticación en Supabase

| Ajuste             | Valor                                                                                                                                                    |
| :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Site URL           | `https://gavetastats.netlify.app`                                                                                                                        |
| URL de redirección | `https://gavetastats.netlify.app/**` · `http://localhost:5173/**` · `https://*--gavetastats.netlify.app/**` · `https://main--gavetastats.netlify.app/**` |

La tercera cubre los deploy previews por rama del DOC 15 §2: sin ella, probar el login desde el móvil en una rama devuelve un error de redirección. La cuarta nombra pre de forma explícita, aunque la tercera ya lo cubre. **Comprobadas por Raúl en el panel el 26/09, con la Site URL de arriba.**

**La aplicación vuelve a `/auth/callback`** (T-105). Los cuatro patrones acaban en `/**`, así que esa ruta ya está cubierta y **no hubo que tocar nada aquí**. Si algún día cambia la ruta de vuelta, el valor vive en `RUTA_VUELTA`, en `src/modules/auth/api/session.ts`, y tiene que seguir casando con esta lista.

**La llamada pide `prompt=select_account`**, así que Google enseña siempre el selector de cuenta. Es deliberado: sin él, quien tiene dos cuentas entra siempre con la última y no hay forma de cambiarla desde la aplicación mientras no exista el cierre de sesión (T-107).

---

## 5. Base de datos

Migraciones versionadas en `supabase/migrations`, con marca de tiempo en el nombre para que coincida con el historial remoto (DOC 05 §14). Nunca se toca el esquema desde el panel: lo que se cambia ahí no queda en Git y se pierde al recrear el entorno.

Tipos de TypeScript: `npm run db:types`, **en la misma tarea que aplica la migración y en el mismo commit que el `.sql`** (DOC 06 §7.3). El archivo generado va en `.prettierignore`: Prettier lo reformatearía entero y cada regeneración traería miles de líneas de diferencia falsa.

**Datos de arranque: `supabase/seed.sql`.** Nace con la T-105, y **no es una migración**: son datos, así que vive fuera de `supabase/migrations` y no lo aplica el CLI con `db push`. Se lanza a mano desde el editor SQL del panel o con `psql`, con permisos de servicio, y es idempotente. Siembra el club, la temporada en curso, el equipo gestionado y los doce permisos de la primera persona.

Existe porque el esquema solo no deja arrancar: `clubs_insert` permite crear un club a cualquiera autenticado, pero crear el equipo dentro exige `team.manage`, y ese permiso vive en `team_member_permissions`, que cuelga de un `team_members` que todavía no existe. Ese ciclo lo rompe la siembra mientras no haya pantalla de alta (T-201) ni invitaciones (T-301). **Es también la pieza que hace comprobable la restauración del §5.1**: una copia restaurada sobre un proyecto nuevo se siembra con este archivo y se entra.

### 5.1 Copias de seguridad

**El plan gratuito de Supabase no hace ninguna.** No incluye copias descargables ni recuperación a un punto en el tiempo, y la propia documentación recomienda a los proyectos gratuitos exportar sus datos con regularidad y guardarlos fuera. A partir de octubre esta base guarda la temporada entera de un equipo: convocatorias, eventos, minutos y sanciones. Un borrado en cascada mal lanzado o un proyecto eliminado por descuido se lo llevan todo sin vuelta atrás.

| Pieza                  | Decisión                                                               |
| :--------------------- | :--------------------------------------------------------------------- |
| Herramienta            | `supabase db dump` del CLI                                             |
| Ritmo                  | Semanal a mano mientras no haya partidos; automatizado cuando los haya |
| Dónde                  | Fuera del repositorio, más una copia en el Drive ya contratado         |
| Automatización         | Acción programada de GitHub cuando el volcado semanal se quede corto   |
| Prueba de restauración | **Una, sobre un proyecto nuevo, antes del 25 de octubre**              |

Una copia que nunca se ha restaurado no es una copia. La prueba de restauración no es opcional y tiene fecha.

Los cubos de Storage no entran en ningún volcado de base de datos: cuando existan escudos que guardar, se copian aparte.

---

## 6. Comprobación del entorno

Antes de dar por bueno un entorno nuevo:

1. `npm run db:types` no produce diferencias → el esquema aplicado coincide con los tipos del repositorio.
2. El auditor de seguridad de Supabase, sin hallazgos nuevos.
3. `https://<proyecto>.supabase.co/auth/v1/authorize?provider=google` lleva a la pantalla de Google, y no a un error → client ID y proveedor bien configurados.
4. Completar ese login crea fila en `auth.users` **y** en `profiles` → el disparador `handle_new_user` funciona.
5. Consultar cualquier tabla con la `anon key` y sin sesión devuelve vacío → la RLS está puesta.

El paso 3 comprueba el client ID; el **4 es el que comprueba el client secret**, porque el intercambio del código por el token es el primer momento en que se usa.

---

## 7. Qué falta en este documento

| Pendiente                                                                  | Cuándo                                                  |
| :------------------------------------------------------------------------- | :------------------------------------------------------ |
| Deploy previews: cómo se prueban, qué comparten y qué no con producción    | Cuando haya algo que desplegar                          |
| Checklist de publicación                                                   | Antes del primer despliegue con datos reales            |
| Procedimiento de vuelta atrás: despliegue y migración                      | Idem                                                    |
| Paso del cliente de OAuth de «Prueba» a producción                         | Antes de que lo use alguien fuera de la lista de prueba |
| Cubos de Storage `crests` y `docs` (DOC 05 §13), sin crear                 | Cuando haya escudos que subir                           |
| Entorno de preproducción separado, si llega a hacer falta                  | Hoy no lo hay: se despliega contra el proyecto único    |
| Dominio propio para la autenticación (§4.4), ~35 $/mes entre add-on y plan | Solo si el proyecto deja de ser de presupuesto cero     |
