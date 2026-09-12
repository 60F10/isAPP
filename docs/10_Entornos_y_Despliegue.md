# DOC 10 — Entornos y despliegue

> **Versión:** 0.2 — 12/09/2026 · **Parcial a propósito** (0.1 el 11/09; el 12/09 se añade §5.1, copias de seguridad)
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

| Ajuste             | Valor                                                                                                       |
| :----------------- | :---------------------------------------------------------------------------------------------------------- |
| Site URL           | `https://gavetastats.netlify.app`                                                                           |
| URL de redirección | `https://gavetastats.netlify.app/**` · `http://localhost:5173/**` · `https://*--gavetastats.netlify.app/**` |

La tercera cubre los deploy previews por rama del DOC 15 §2: sin ella, probar el login desde el móvil en una rama devuelve un error de redirección.

---

## 5. Base de datos

Migraciones versionadas en `supabase/migrations`, con marca de tiempo en el nombre para que coincida con el historial remoto (DOC 05 §14). Nunca se toca el esquema desde el panel: lo que se cambia ahí no queda en Git y se pierde al recrear el entorno.

Tipos de TypeScript: `npm run db:types`, **en la misma tarea que aplica la migración y en el mismo commit que el `.sql`** (DOC 06 §7.3). El archivo generado va en `.prettierignore`: Prettier lo reformatearía entero y cada regeneración traería miles de líneas de diferencia falsa.

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
