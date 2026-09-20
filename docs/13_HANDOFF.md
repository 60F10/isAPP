# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 20/09/2026 — T-105, acceso con Google: entrar, sesión, equipo activo y permisos

Sesión de Cowork sobre el repositorio local, **con Raúl delante**, que era la condición que
llevaba tres traspasos bloqueando esta tarea. El clic en la pantalla de cuenta de Google y la
aceptación de permisos los dio él.

Rama `feat/auth-login-google`. **Los commits y la pull request quedan para Raúl** (regla del
CLAUDE.md), así que al cerrar esta sesión el trabajo está en el árbol y sin subir.

---

## HECHO

**El viaje completo del acceso funciona, comprobado de punta a punta en incógnito.** Entrando
directo a `/equipos` sin sesión: redirección a `/login`, pantalla de Google, vuelta por
`/auth/callback` y aterrizaje en `/equipos` con la pantalla A04 pintada. Barra de direcciones
limpia, sin `?code=`.

| Pieza                  | Archivo                                        | Qué lleva                                                                              |
| :--------------------- | :--------------------------------------------- | :------------------------------------------------------------------------------------- |
| Lógica pura            | `src/modules/auth/model/permissions.ts`        | Filas → membresías, elección del equipo activo, permisos, equipo recordado             |
| Pruebas                | `src/modules/auth/model/permissions.test.ts`   | **16 casos**                                                                           |
| Acceso a datos         | `src/modules/auth/api/session.ts`              | Contexto de acceso, entrada con Google y destino de vuelta                             |
| Sesión desde el módulo | `src/modules/auth/api/sesionActual.ts`         | `getSession()` para la pantalla de vuelta, que no puede preguntar a `app/`             |
| Claves de consulta     | `src/modules/auth/api/queryKeys.ts`            | Fábrica del §5.3, con el identificador de usuario dentro de la clave                   |
| Pantalla de vuelta     | `src/modules/auth/routes/AuthCallbackPage.tsx` | A01b, nueva                                                                            |
| Contrato               | `src/app/providers/authContext.ts`             | `profile`, `teams`, `activeTeamId`, `activeSeasonId`, `setActiveTeam`, `errorContexto` |
| Proveedor              | `src/app/providers/AuthProvider.tsx`           | Relleno: consulta, equipo activo y permisos de verdad                                  |
| Pantallas              | `LoginPage.tsx` · `ForbiddenPage.tsx`          | Botón de Google real; C05 explica también el «todavía no tienes equipo»                |
| Enrutador              | `src/app/router.tsx`                           | **Un solo añadido**: la ruta `/auth/callback`. Las veinte guardias, intactas           |
| Siembra                | `supabase/seed.sql`                            | Club, temporada, equipo y los doce permisos. Idempotente                               |

`npm run lint` sin avisos · `npx prettier --check .` limpio · `npm run test -- --run` con
**33 pruebas en verde** (17 de `env` y 16 nuevas) · `npm run build` en verde.

---

## LA BASE ESTABA VACÍA, Y ESO CAMBIABA LA TAREA

El traspaso anterior prometía que «en cuanto `permisos` traiga datos, las veinte rutas se abren
solas». Se abren **si hay filas**, y no había ninguna: cero clubes, cero temporadas, cero equipos,
cero `team_members`, cero permisos. Lo único que existía era el usuario de Raúl en `auth.users`,
creado el 11/09 al probar el `authorize` del DOC 10 §6.

Y hay un segundo detalle que lo empeoraba: **`has_team_permission` no mira al administrador de
plataforma.** Se leyó la función, no se supuso:

```sql
select exists (select 1 from team_members tm join team_member_permissions tmp …)
```

`is_platform_admin()` solo aparece en `can_read_team` y compañía, o sea en la **lectura**. Ser
administrador no concede un solo permiso de escritura. Sin siembra, la T-105 habría terminado con
el acceso funcionando y las veinte rutas mandando a `/403`, también a Raúl, y con toda la pinta de
ser un fallo de permisos.

**De ahí sale `supabase/seed.sql`**, decidido con Raúl delante. No es una migración y no entra en
`supabase/migrations`: son datos. Vive en el repositorio para que la siembra quede en Git y se
pueda repetir sobre un proyecto nuevo, que es lo que necesita la prueba de restauración del
DOC 10 §5.1.

Siembra: **Club Deportivo Unión Tejina** (`U. Tejina`), temporada **2026/27** en curso, equipo
**Cadete A** —el de Isaac— y Raúl como `coach` con los **doce** permisos, leídos de
`enum_range(null::app_permission)` en vez de escritos a mano.

**Comprobado a través de la RLS y no desde `postgres`**, que es la única comprobación que vale:
con `set local role authenticated` y el `sub` de Raúl en las claves del testigo, la consulta
devuelve el Cadete A, doce permisos, la temporada 2026/27 y `has_team_permission('match.live.write')`
en `true`.

**El ciclo que la siembra rompe, y que sigue ahí.** `clubs_insert` deja crear un club a cualquiera
—solo pide `created_by = auth.uid()`—, pero crear el equipo dentro exige `team.manage`, y sin
`team_member` no lo tiene nadie. Quien entre hoy con una cuenta nueva no puede crearse nada ni
hacerse seguidor de un equipo: `team_followers` exige `members.manage` para escribir, así que nadie
se da de alta a sí mismo. Es el modelo de invitación de la decisión H4, y está bien que sea así,
pero **no hay todavía ninguna pantalla que invite**. Ver el punto 18 de lo que sigue abierto.

---

## DECISIONES TOMADAS

**Los permisos son espejo exacto de `has_team_permission`, y el administrador no suma.** Salen de
`team_member_permissions` del equipo activo y de ningún otro sitio. Dárselos a un administrador de
plataforma en el cliente habría enseñado botones que la RLS rechaza, que de las dos maneras de
equivocarse es la peor: el usuario pulsa, falla, y el fallo aparece dos capas por debajo.

**`cargando` sigue hablando solo de la sesión.** Del contexto de acceso habla `permisos`, con
`null` mientras no conteste. La alternativa —bloquear la aplicación entera hasta que contesten los
permisos— dejaría el inicio, que no pide ninguno, esperando por nada.

**La vuelta de Google tiene ruta propia, `/auth/callback`.** Se eligió frente a volver directamente
a la ruta destino porque da un sitio donde enseñar un fallo de OAuth en vez de dejar al usuario en
una pantalla que no carga. Cuesta una ruta nueva en el enrutador y una pantalla que el DOC 02 no
tiene: ver el punto 19.

**El destino de vuelta viaja en `sessionStorage`, no dentro de `redirectTo`.** Supabase le pega su
propia cadena de consulta a esa dirección al devolver el código, y componerla dos veces es pedir un
fallo raro el día que un destino lleve parámetros. La pestaña es la misma durante todo el viaje.

**`prompt: 'select_account'` en la llamada a Google.** Fuerza el selector de cuenta. Cuesta un
toque más en cada entrada y evita el caso de quien tiene dos cuentas y entra siempre con la que no
quería sin manera de cambiarla desde la aplicación. Se revisa cuando exista el cierre de sesión
(T-107).

**El destino se valida antes de usarlo.** Solo rutas que empiezan por `/` y no por `//`. Sin esa
comprobación, el `desde` que guarda `RequireAuth` sería un redirector abierto: bastaría un enlace
preparado para dejar al usuario, después de entrar de verdad, en una página de fuera con pinta de
ser esta.

**El código de error de la dirección se filtra; `error_description` no se pinta jamás.** Ese texto
lo compone quien arma la dirección. React lo escaparía, así que no hay inyección, pero sí habría
una pantalla de esta aplicación diciendo lo que le dicte un enlace ajeno. Se enseña el código y
solo si casa con `^[a-z_]{1,40}$`.

**Las rutas de la C05 se matizan sin consultar nada.** El texto cubre los dos motivos —sin permiso
y sin equipo todavía— porque esa pantalla **no puede** preguntar al contexto de sesión, y montarle
una consulta propia para elegir el párrafo sería pagar un viaje al servidor por una frase.

**`AuthProvider` importa `@modules/auth` por rutas directas y no por el barril.** Medido: con el
barril, el empaquetador avisa `INEFFECTIVE_DYNAMIC_IMPORT` y se lleva las tres pantallas de `auth`
al paquete inicial, porque el enrutador carga ese mismo archivo en perezoso. La regla 3 del §4.1
rige entre módulos; `app/` es la composición, no un módulo. Son 0,94 kB comprimidos y un aviso de
compilación menos.

---

## TRES HALLAZGOS QUE NO SON DE ESTA TAREA Y QUE CONVIENE MIRAR

**1. `strict` no está en ningún `tsconfig`, así que `strictNullChecks` está apagado.** Comprobado
con `npx tsc --showConfig -p tsconfig.app.json`: no aparece ni `strict`, ni `strictNullChecks`, ni
`noUncheckedIndexedAccess`. La plantilla `react-ts` de Vite lo trae puesto, así que lo más probable
es que se cayera al arreglar los alias en la T-101. **Duele justo aquí**: toda la tarea gira
alrededor de distinguir `null` de un conjunto vacío, y el compilador no está vigilando ni una de
esas comprobaciones. El código de la T-105 está escrito como si estuviera encendido. Encenderlo
ahora probablemente saque errores por todo el repositorio, así que es tarea aparte y no se tocó.

**2. `esErrorDeCliente` de `QueryProvider` no se dispara nunca con un error de Supabase.** Mira
`error.status`, y `PostgrestError` trae `message`, `details`, `hint` y `code`, pero no `status`: el
estado HTTP viaja en la respuesta, no en el error. Consecuencia: un 401 o un 403 de PostgREST se
reintenta dos veces en vez de rendirse a la primera, que es lo que la decisión pretendía. Viene de
la T-104. El arreglo natural es el «ayudante común» que el DOC 06 §10.1 da por hecho y que todavía
no existe en `shared/lib/`.

**3. Un módulo no puede llegar a la sesión ni a la región viva, y eso ya duele.** El DOC 06 §4.1
regla 1 dice que nadie importa de `app/`, y ahí viven `useAuth`, `useHasPermission` y
`useAnnounce`. Esta tarea lo ha esquivado dos veces: la pantalla de vuelta pregunta por su propia
`api/` en vez de por el contexto, y los mensajes de error de A01 y A01b usan `role="alert"` en vez
de la región viva única del §6.3. **Funciona, pero son dos regiones vivas de más y una consulta
duplicada.** Y a partir de la T-201 el problema es otro: toda pantalla que lea datos necesita el
equipo activo, o sea `useAuth`, o sea importar de `app/`.

La salida limpia es mover el contexto y sus hooks a `modules/auth` y dejar en `app/providers/` solo
el componente proveedor: `app/` puede importar del módulo, y el grafo del §4.2 ya deja que
**todos** los módulos importen de `auth`. Toca `authContext.ts`, `AuthProvider.tsx`, `RequireAuth`,
`RequirePermission` y `App.tsx`, y es mecánico. **No se hizo aquí**: el alcance era la T-105 y era
reescribir lo que la T-104 acababa de dejar en pie.

---

## DEUDA TÉCNICA GENERADA

| Deuda                                                                                                                              | Estado                                                                                           |
| :--------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------- |
| **`errorContexto` no lo pinta nadie.** Si la consulta de contexto falla, las rutas guardadas se quedan en «Cargando…» para siempre | Abierta. Lo cierra la T-106, que es quien trae las pantallas de error                            |
| **Dos `role="alert"` nuevos** en A01 y A01b, en vez de la región viva única del DOC 06 §6.3                                        | Abierta. La cierra el movimiento del hallazgo 3                                                  |
| **No hay cerrar sesión en ninguna parte.** Quien entre con una cuenta sin equipo se queda ahí                                      | Abierta. Es la T-107. Mientras tanto se sale borrando el almacenamiento del sitio                |
| **La siembra se lanza a mano** y no hay guion de `npm` que la ejecute                                                              | Asumida. Se lanza dos veces al año y el archivo dice cómo                                        |
| **`useHasPermission` recibe `string` y no `AppPermission`**                                                                        | Asumida, y barata de pagar: tiparlo haría que `tsc` cazara una errata de permiso en `router.tsx` |
| **El contrato de `AuthState` mezcla idiomas**: `cargando` y `permisos` junto a `profile` y `activeTeamId`                          | Abierta. Los nombres nuevos son los que fija el DOC 06 §5.5; decidir y unificar                  |
| `teams` del contexto devuelve membresías, no equipos pelados, aunque el §5.5 lo llame `teams`                                      | Asumida a propósito: quien elija equipo necesita también el rol y los permisos de cada uno       |

---

## LO QUE SIGUE ABIERTO DE SESIONES ANTERIORES

**Un punto de la lista anterior ya no está: el 11**, `permisos` en `null` dejando las veinte rutas
en «Cargando…». Lo cierra esta sesión. **Nacen cinco**, del 17 al 21.

Pendiente de decidir, que no lo decide el código:

1. **Los cinco destinos de la barra apuntan a pantallas sueltas.** EQUIPO, DATOS y MÁS son grupos
   sin pantalla de aterrizaje en el DOC 02 §3, y «Más» abriendo Ajustes se lee raro. Se decide en
   la T-107.
2. **`clock` y `plus` haciendo de casa y calendario.** El inventario de 21 iconos del DOC 07 §8.2
   no tiene ninguno de los dos. Decidir si entran dos iconos nuevos.

Pendiente de hacer:

3. **El aviso de versión nueva sale también en mitad de un partido**, contra la decisión D06-14. El
   punto de enganche está comentado en `ActualizacionDisponible.tsx`:
   `if (!hayVersionNueva || partidoEnCurso) return null;`. Lo cierra la T-207.
4. **`set_updated_at()` arrastra el `EXECUTE` de `authenticated` que no necesita.** Una línea en la
   próxima migración de permisos. DOC 05 §14.3.
5. **`npm run db:types` deja el archivo de tipos a cero bytes si el CLI falla.** Se restaura con
   `git checkout -- src/types/database.types.ts`. **Antes de tocar ese script, haz copia.**
6. Marcar `event.approve` a quien lleve el registro, cuando exista la T-301.
7. Los cubos de Storage `crests` y `docs`, sin crear.
8. Los alias viven duplicados en `tsconfig.app.json` y en `vite.config.ts`, a mano.
9. El error de entorno se lanza sin interfaz: pantalla en blanco y mensaje en consola, hasta la
   T-106. Hay diecisiete pruebas que fijan el texto de ese mensaje.
10. `/admin/logs` sigue sin guardia de permiso: el DOC 05 §4 no define ninguno de administración.
    Lo resuelve la T-303.
11. Faltan tokens de anchura de maqueta en el DOC 07: el rail y la caja de `BareLayout` salen de
    `--tap-min`.
12. **Diecinueve rutas comparten la misma `PantallaPendiente`** —eran veinte y A04 sigue siéndolo,
    pero ahora se llega a todas de verdad, que es lo que cambia—. Cada una la sustituye su tarea.
13. Deudas de base de datos abiertas: `btree_gist` en `public`, veintisiete claves ajenas sin
    índice, trece tablas con dos políticas permisivas de `SELECT`, `rebuild_match_stints` sin
    comprobar que el jugador que sale esté en el campo, y el descarte de sustituciones repetidas
    viviendo solo en el retorno de la función.
14. Si Supabase recrea `rls_auto_enable()` con `DROP` + `CREATE`, el permiso de PUBLIC vuelve.
    Mirar el auditor tras cada actualización de la plataforma.
15. **El `ignore` de `netlify.toml` no cancela la compilación de una vista previa aunque la rama
    solo toque `docs/`**: `CACHED_COMMIT_REF` apunta al commit de la caché restaurada, no al padre
    inmediato. Salidas: comparar contra `$COMMIT_REF^` o contra la base de la rama, o mover la
    decisión al CI de GitHub. Sin tocar.
16. **Netlify está en créditos operativos y los despliegues de producción están parados.** El sitio
    publicado sigue en pie y las vistas previas compilan, pero fusionar a `main` no publica.
    **Sigue sin comprobar en el panel**; esta sesión no llegó a subir la rama.
17. **`strict` apagado en los `tsconfig`.** Explicado arriba. Encenderlo es tarea propia.
18. **`esErrorDeCliente` no reconoce un error de Supabase**, así que los 4xx se reintentan.
    Explicado arriba. Se arregla con el ayudante común del DOC 06 §10.1.
19. **Los módulos no pueden llegar a `useAuth` ni a `useAnnounce`.** Explicado arriba. Bloquea el
    diseño de toda pantalla que lea datos, o sea la T-201 en adelante.
20. **No hay forma de que entre nadie más.** Ni alta propia, ni invitación, ni hacerse seguidor: la
    tabla `invitations` existe y no la usa ninguna pantalla. Hoy solo entra quien esté sembrado a
    mano. Es la T-301, y **la idea de Raúl de elegir equipo como seguidor al entrar se apunta
    aquí**: hace falta decidirla en el DOC 03, porque pide tocar la RLS de `team_followers` y
    enseñar una lista de equipos que hoy nadie puede leer.
21. **A01b no está en el inventario del DOC 02.** La pantalla de vuelta existe en el código y no en
    la documentación de pantallas. O entra al inventario como parada técnica, o se le da otro sitio.

Asumidas y sin fecha: `vite build` avisa de que el trozo inicial pasa de 500 kB en crudo, y el
marco de la ventana vive en `App` como una pieza más entre el enrutador y las maquetas.

---

## EL PAQUETE, MEDIDO

| Momento                              | Inicial comprimido | Margen sobre 200 kB |
| :----------------------------------- | -----------------: | ------------------: |
| Al cerrar la T-102                   |          171,58 kB |            28,42 kB |
| T-105 importando el barril de `auth` |          176,13 kB |            23,87 kB |
| **T-105 como queda**                 |      **175,19 kB** |        **24,81 kB** |

Desglose del bueno: 169,87 kB de JavaScript, 3,12 kB de CSS y 2,20 kB del trozo de
`workbox-window`. En crudo, 583,82 kB de JavaScript. Al final, `precache 17 entries (654.69 KiB)`.
**La T-105 cuesta 3,61 kB comprimidos.** El trozo perezoso de `auth` pesa 1,27 kB y se queda fuera
del arranque.

---

## SIGUIENTE TAREA SUGERIDA

**T-106**, error boundary, escritura en `error_logs` y aviso de sesión a punto de expirar. Es la
que cierra dos deudas que esta sesión deja escritas: el `errorContexto` que nadie pinta y el error
de entorno sin interfaz (punto 9), y las dos son de la misma pieza.

La otra candidata es la **T-107** (ajustes, alto contraste y **cerrar sesión**), que hoy vale más
de lo que parece: sin ella, probar el acceso con otra cuenta obliga a abrir una ventana de
incógnito o a borrar el almacenamiento del sitio a mano.

Y antes de cualquiera de las dos, **la T-105b**: segundo club, otro usuario y comprobar que no ve
nada del primero. Ahora por fin hay un primer club que no ver, así que la prueba de aislamiento ya
se puede hacer de verdad. El DOC 05 §12.5 la pone como obligatoria antes de la Fase 2.

---

## COMANDOS PARA VERIFICAR

```powershell
cd D:\Documentos\Proyectos\ProyectoSASI\App
Remove-Item Env:\NODE_ENV          # imprescindible, ver el hallazgo de la T-101
git switch feat/auth-login-google

npm ci
npm run lint
npx prettier --check .
npm run test -- --run
npm run build
```

`npm run test -- --run` tiene que decir `Test Files 2 passed (2)` y `Tests 33 passed (33)`.

El build tiene que terminar en verde y decir **`583.82 kB` en crudo y `169.87 kB` comprimidos** de
JavaScript, más `11.61 kB` y `3.12 kB` de CSS, y un trozo `auth-*.js` de `2.61 kB` y `1.27 kB`
comprimidos. Al final, `precache 17 entries (654.69 KiB)`. Si sale bastante más, `NODE_ENV` volvió
a colarse; y **ojo con `set NODE_ENV=` en `cmd`**, que la deja a cadena vacía, empaqueta React en
modo desarrollo y el mismo build da 794 kB. La forma buena es `Remove-Item Env:\NODE_ENV`.

**Si vuelve a salir `INEFFECTIVE_DYNAMIC_IMPORT`**, alguien ha cambiado un `import` de
`AuthProvider.tsx` por el barril `@modules/auth`. Las tres pantallas de `auth` se habrán caído al
paquete inicial.

Y el viaje del acceso, que no lo prueba ningún comando:

```powershell
npm run dev
```

Ventana de incógnito a `http://localhost:5173/equipos`. Tiene que mandar a «Entrar», pasar por
Google, volver por «Entrando» y dejar la pantalla A04 con la barra de direcciones limpia.
**Eso pide a una persona delante**: el clic en la cuenta de Google no lo da una sesión automática.

**`npm run db:types` NO se lanza a la ligera.** Sin `SUPABASE_ACCESS_TOKEN` o sin `supabase login`,
el `>` del script deja `src/types/database.types.ts` en cero bytes. Si pasa:
`git checkout -- src/types/database.types.ts`. Esta sesión **no tocó el esquema**, así que los tipos
siguen valiendo tal cual.

---

## AVISO DE SEGURIDAD

**Ya no hace falta abrir el panel del proveedor de Google en Supabase.** Estaba configurado y
funcionando desde el 11/09 —hay un usuario creado por ese camino—, así que la T-105 se hizo entera
sin tocarlo. El aviso sigue vigente para el día que haya que entrar ahí: **Chrome autorrellena
«Client IDs» y «Client Secret»** con credenciales guardadas, y pulsar «Save» con eso dentro escribe
tu contraseña en la configuración del proveedor. **Vacía los dos campos antes de tocar nada.**

Lo que sí se tocó de configuración: nada. Ni una variable de entorno nueva, ni un cambio en
Netlify, ni una migración. La única escritura fuera del repositorio es la siembra de datos, y está
en `supabase/seed.sql`.
