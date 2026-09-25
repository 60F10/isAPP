# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 25/09/2026 — T-106, captura de errores y aviso de sesión: ✅ cerrada

Sesión en la nube, sin Raúl delante y sin acceso a Supabase. Cierra los puntos 9 y 20 de la lista
anterior —el error de entorno sin interfaz y el `errorContexto` sin pintar, que eran el 9 y el 21
antes de la sesión del `strict`—.

El entorno obliga a subir a una rama `claude/…`; la que toca por convención es
`feat/logging-captura-errores`, y con ese nombre se hizo el commit para que pasara el hook de
`pre-commit`. La pull request lo dice.

---

## HECHO

**El módulo `logging` nace**, con las dos pantallas que el DOC 06 §3.4 le asigna a medias: la C03
entera y el registro que leerá la C02 de la T-303.

| Pieza                                       | Qué hace                                                                                                                              |
| :------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------ |
| `modules/logging/model/errorLog.ts`         | Lógica pura: normaliza lo que se lance, limpia testigos y correos, recorta, arma la fila y frena los bucles                           |
| `modules/logging/api/errorLogs.ts`          | La inserción en `error_logs`, sin `.select()` detrás                                                                                  |
| `modules/logging/api/registro.ts`           | `registrarError`, la única puerta. Más `instalarCapturaGlobal` y `fijarClubDeRegistro`                                                |
| `modules/logging/components/PantallaError`  | La C03, vista pura: sin red, sin contexto, sin enrutador. «Recargar» e «Ir al inicio», y el detalle técnico plegado                   |
| `modules/logging/components/ErrorBoundary`  | El Error Boundary global, por fuera de todos los proveedores                                                                          |
| `app/main.tsx`                              | Carga `App` con `import()` y pinta la C03 si el arranque falla: error de entorno o trozo que no baja (**D06-23**)                     |
| `app/components/RouteErrorPage.tsx`         | La C03 dentro del enrutador. Registra con origen `ruta`, salvo las respuestas 4xx, que son navegación                                 |
| `app/components/ErrorDeAcceso.tsx`          | «No se pudo cargar tu acceso» con «Reintentar», desde `RequirePermission`. **Cierra el punto 20**                                     |
| `app/components/AvisoSesion.tsx`            | Banda de sesión a punto de caducar (criterio 2.2.1), con el cálculo en `modules/auth/model/caducidad.ts`                              |
| `shared/lib/errorDeEntorno.ts`              | Clase `ErrorDeEntorno`, que ahora lanza `env.ts`. Archivo sin efectos, para reconocer el error sin importar `env.ts`. **Cierra el 9** |
| `AuthState`                                 | Suma `reintentarContexto`. `errorContexto` ya tiene quien lo pinte                                                                    |
| `auth/api/session.ts`                       | Suma `renovarSesion`, que llama a `refreshSession()`                                                                                  |
| `vite.config.ts` y `src/types/globals.d.ts` | `__APP_VERSION__`: los siete primeros caracteres de `COMMIT_REF` de Netlify, o `local`                                                |

**Comprobado en el navegador** con el build servido por `vite preview` y sin `.env.local`, o sea con
el entorno roto de verdad: sale «Falta configuración» en vez de la pantalla en blanco, con el foco en
el `h1`, el título del documento puesto, sin desplazamiento horizontal a 320 px y el resumen del
detalle a 48 px de alto. El detalle plegado lista las tres variables que faltan y ninguna clave.

**Sin comprobar en el navegador**, porque aquí no se puede entrar con Google: el Error Boundary con
sesión, la fila real en `error_logs`, `ErrorDeAcceso` y la banda de sesión. Las pruebas cubren su
lógica; el viaje de verdad queda en «Comandos para verificar».

### Pruebas

**62 en verde**, 28 nuevas y una más en `env.test.ts`. Cada una se vio fallar antes de darla por
buena: 17 contra un esbozo vacío, dos contra el primer código de verdad —`matchMedia` no existe en
jsdom y el fallo se tragaba la fila entera, que es un fallo real y está arreglado— y las demás con
un mutante a mano sobre la línea que vigilan.

| Archivo                                     | Casos | Qué vigila                                                                                   |
| :------------------------------------------ | ----: | :------------------------------------------------------------------------------------------- |
| `logging/model/errorLog.test.ts`            |    16 | Que no salga un JWT, un `code`, un `Bearer` ni un correo; ruta sin consulta; recortes; freno |
| `logging/api/registro.test.ts`              |     4 | Sin sesión no inserta, con sesión sí, nunca lanza, no repite                                 |
| `logging/components/ErrorBoundary.test.tsx` |     2 | Pinta la C03 con sus dos botones y registra como `boundary`                                  |
| `auth/model/caducidad.test.ts`              |     6 | Las tres fases, sus bordes y que el margen deja al menos 20 s para reaccionar                |
| `shared/lib/env.test.ts`                    |    +1 | Que lance un `ErrorDeEntorno`, que es lo que el arranque sabe pintar                         |

---

## DECISIONES TOMADAS

**D06-23 · `App` se carga con `import()`.** `env.ts` lanza al importarse (D06-21), y con una
importación estática ese error aborta el módulo antes de que `main.tsx` ejecute una línea. Con
`import()` llega como promesa rechazada y se pinta. Cuesta **1,87 kB comprimidos**, medidos contra
la misma aplicación con `App` estático, y un viaje de red más en la primera visita, porque Vite no
precarga el trozo de `App` desde `index.html`. A partir de la segunda lo sirve la precaché. Se
descartaron un `<script>` en línea en `index.html`, que pinta fuera de React y del sistema de
diseño, y que `env.ts` deje de lanzar, que rompe la D06-21. Escrita en el DOC 06 §10.1.

**El aviso de sesión salta a 60 segundos, no antes.** Supabase renueva solo cuando le quedan unos
noventa. Con un margen mayor, la banda saldría una vez por hora y se iría sola a los pocos segundos
sin que nadie hiciera nada. Con sesenta solo aparece cuando la renovación automática ya falló, que es
falta de cobertura, y deja más de veinte segundos para pulsar (criterio 2.2.1). El reloj se mira cada
15 s y al desbloquear el móvil. Caducar no cierra la sesión ni borra nada.

**Qué se guarda en `error_logs`.** Mensaje con el origen delante (`[boundary]`, `[ruta]`,
`[global]`, `[promesa]`, `[contexto]`), traza, pila de componentes cuando la hay, solo el camino de
la ruta, club del equipo activo, commit desplegado y dispositivo: agente, idioma, tamaño de ventana,
si hay red y si se abrió como PWA. `limpiarTexto` tapa JWT, `Bearer`, los parámetros `code`,
`*_token`, `apikey` y `password` y cualquier correo antes de que la fila salga del móvil. **El
origen va en el mensaje y no en una columna** porque no hay columna y esta sesión no toca el esquema.

**El freno: diez filas por carga y el mismo mensaje una vez por minuto.** Un componente que revienta
en cada render se comería los datos del móvil a pie de campo.

**El club lo apunta `AuthProvider` en `logging`, y no al revés.** El DOC 06 §4.2 no deja que
`logging` importe de `auth`. `fijarClubDeRegistro` guarda el club en una variable del módulo.

**La RLS de `error_logs` deja hacer lo que hace falta, con una limitación.** `error_logs_insert`
es para `authenticated` con `user_id` propio o nulo. Basta para todo lo que pasa con sesión. **Lo
que falla sin sesión** —el acceso, la vuelta de Google, el error de entorno— **no se registra**, y
se queda en la consola. No se toca: abrir la inserción a `anon` abre la puerta a llenar la tabla
desde fuera. Queda como punto 22.

**El punto 17 (el ayudante común de `api/`) no entra.** El DOC 06 §10.1 lo pide pero no lo asigna a
ninguna tarea, y el registro no lo necesita: `normalizarError` trata igual un `Error` que un error de
Supabase.

**`app/` importa de `@modules/logging` por ruta directa**, igual que de `auth`. Hoy no haría daño
usar el barril, pero el día que la C02 (T-303) entre en perezoso por él, lo tiraría al paquete
inicial con `INEFFECTIVE_DYNAMIC_IMPORT`. Está escrito en el `index.ts` del módulo.

---

## PENDIENTE DE LA TAREA

Nada de lo que la fila del DOC 08 pide. Queda sin probar en el navegador lo que exige sesión: ver
«Comandos para verificar».

---

## DEUDA TÉCNICA GENERADA

| Deuda                                                                                          | Cuándo se paga                                                                             |
| :--------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------- |
| Los fallos sin sesión no llegan a `error_logs`                                                 | Si hace falta verlos. Pide decidir en el DOC 03 cómo abrir la inserción sin abrir la tabla |
| El trozo de `App` no se precarga: un viaje de red más en la primera visita                     | Un plugin de Vite de diez líneas que añada su `modulepreload` a `index.html`               |
| El origen del error viaja dentro del mensaje, no en su columna                                 | En la próxima migración que toque `error_logs`, si la C02 necesita filtrar por él          |
| «Reintentar» en `ErrorDeAcceso` no se desactiva mientras pregunta: solo anuncia «Reintentando» | Cuando `AuthState` exponga si el contexto está cargando                                    |

---

## LO QUE SIGUE ABIERTO

**Se cierran los puntos 9 y 20 de la lista anterior.** Los de detrás suben y se suman dos al final.
Para quien lleve la cola con los números viejos:

| Antes | Ahora | Qué                                     |
| ----: | ----: | :-------------------------------------- |
|     1 |     1 | Destinos de la barra (T-107)            |
|    17 |    16 | `esErrorDeCliente` y el ayudante común  |
|    21 |    19 | Cerrar sesión (T-107)                   |
|    23 |    21 | Referencias cruzadas entre clubes       |
|    24 |    22 | `noUncheckedIndexedAccess`              |
|     — |    23 | Fallos sin sesión fuera de `error_logs` |
|     — |    24 | El trozo de `App` sin precarga          |

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
9. `/admin/logs` sigue sin guardia de permiso: el DOC 05 §4 no define ninguno de administración.
   Lo resuelve la T-303.
10. Faltan tokens de anchura de maqueta en el DOC 07: el rail y la caja de `BareLayout` salen de
    `--tap-min`.
11. **Diecinueve rutas comparten la misma `PantallaPendiente`.** Cada una la sustituye su tarea.
12. Deudas de base de datos abiertas: `btree_gist` en `public`, veintisiete claves ajenas sin
    índice, trece tablas con dos políticas permisivas de `SELECT`, `rebuild_match_stints` sin
    comprobar que el jugador que sale esté en el campo, y el descarte de sustituciones repetidas
    viviendo solo en el retorno de la función.
13. Si Supabase recrea `rls_auto_enable()` con `DROP` + `CREATE`, el permiso de PUBLIC vuelve.
    Mirar el auditor tras cada actualización de la plataforma.
14. **El `ignore` de `netlify.toml` no cancela la compilación de una vista previa aunque la rama
    solo toque `docs/`**: `CACHED_COMMIT_REF` apunta al commit de la caché restaurada, no al padre
    inmediato. Salidas: comparar contra `$COMMIT_REF^` o contra la base de la rama, o mover la
    decisión al CI de GitHub. Sin tocar.
15. **Netlify tiene los despliegues PARADOS desde el 20/09** (DOC 10 §2.2). El sitio publicado sigue
    en pie, pero fusionar a `main` no publica nada hasta reactivarlos a mano. **Ojo:** mientras
    tanto nadie verá la T-106 en el sitio publicado.
16. **`esErrorDeCliente` no reconoce un error de Supabase**, así que los 4xx se reintentan dos veces
    en vez de rendirse a la primera. Se arregla con el «ayudante común» del DOC 06 §10.1, que
    todavía no existe en `shared/lib/` ni tiene tarea asignada.
17. **No hay forma de que entre nadie más.** Ni alta propia, ni invitación, ni hacerse seguidor: la
    tabla `invitations` existe y no la usa ninguna pantalla. Es la T-301, y **la idea de Raúl de
    elegir equipo como seguidor al entrar se apunta aquí**: hace falta decidirla en el DOC 03,
    porque pide tocar la RLS de `team_followers`.
18. **A01b no está en el inventario del DOC 02.** O entra como parada técnica, o se le da otro sitio.
19. **No hay cerrar sesión en ninguna parte.** Quien entre con una cuenta sin equipo se queda ahí.
    Es la T-107. Mientras tanto se sale borrando el almacenamiento del sitio.
20. **El contrato de `AuthState` mezcla idiomas**: `cargando`, `permisos` y ahora
    `reintentarContexto` junto a `profile` y `activeTeamId`. Decidir y unificar con el DOC 06 §5.5.
21. **Un club puede enlazar objetos de otro club en sus propias filas** (los catorce avisos de la
    T-105b). Ninguna clave ajena exige que los dos lados sean del mismo club, y `team_of_match`
    devuelve el equipo de cualquier partido. **Decidir antes de la T-201 cuándo se paga**: la T-201
    a la T-205 son las primeras pantallas que escriben esas filas. Pide migración: sesión de Cowork.
22. **`noUncheckedIndexedAccess` apagado.** Saca siete errores, seis en `permissions.test.ts` y uno
    en `permissions.ts:120`. Salidas: encenderlo ya (media hora, recomendada: el coste crece con cada
    lista que pinte una pantalla), después del MVP, o nunca y revisar a mano.
23. **Los fallos sin sesión no llegan a `error_logs`.** Ver «Decisiones».
24. **El trozo de `App` no se precarga.** Ver «Deuda técnica generada».

Asumidas y sin fecha: el marco de la ventana vive en `App` como una pieza más entre el enrutador y
las maquetas; la siembra se lanza a mano; `useHasPermission` recibe `string` y no `AppPermission`;
`teams` del contexto devuelve membresías y no equipos pelados, a propósito; y el club activo del
registro vive en una variable de módulo de `logging`.

---

## EL PAQUETE, MEDIDO

| Momento                        | Inicial comprimido | Margen sobre 200 kB |
| :----------------------------- | -----------------: | ------------------: |
| Antes de esta sesión, en Linux |          174,97 kB |            25,03 kB |
| **Esta sesión, en Linux**      |      **179,50 kB** |        **20,50 kB** |

**+4,53 kB, y se sabe de dónde sale cada uno.** Compilando la misma aplicación con `App` estático
salen 177,63 kB: el código nuevo pesa **2,66 kB** y la división del arranque (D06-23), **1,87 kB**.

Desde esta sesión el paquete inicial son varios trozos y se suman todos:

| Trozo                 |    Comprimido |
| :-------------------- | ------------: |
| `index-*.js`          |      68,44 kB |
| `preload-helper-*.js` |       4,07 kB |
| `App-*.js`            |     101,02 kB |
| `workbox-window`      |       2,20 kB |
| Tres hojas de estilo  |       3,77 kB |
| **Total**             | **179,50 kB** |

En crudo, 596,25 kB de JavaScript y `precache 21 entries (662.69 KiB)`. Efecto de rebote: ningún
trozo pasa ya de 500 kB, así que `vite build` deja de avisar de eso. **La cifra de Windows saldrá
unos 0,24 kB más alta** (ver la sesión del `strict`): compara siempre con una medida de la misma
máquina.

---

## SIGUIENTE TAREA SUGERIDA

**T-107**: ajustes, con alto contraste, movimiento reducido y cierre de sesión. Cierra el punto 19,
revisa el `prompt: 'select_account'` de la T-105 y deja el punto 1 escrito para que lo decida Raúl.

Antes de la T-201, dos decisiones de Raúl: el punto 21 (referencias cruzadas entre clubes) y el 22
(`noUncheckedIndexedAccess`).

---

## COMANDOS PARA VERIFICAR

```powershell
cd D:\Documentos\Proyectos\ProyectoSASI\App
Remove-Item Env:\NODE_ENV          # imprescindible, ver el hallazgo de la T-101
git switch main
git pull

npm ci
npm run lint
npx prettier --check .
npm run test -- --run
npm run build
```

`npm run test -- --run` tiene que decir `Test Files 6 passed (6)` y `Tests 62 passed (62)`. El
build, en verde, sin `INEFFECTIVE_DYNAMIC_IMPORT` y con un trozo `App-*.js` aparte.

**En el navegador, con `npm run dev`, lo que esta sesión no pudo probar:**

1. **Error de entorno.** Renombra `.env.local` y recarga: tiene que salir «Falta configuración»,
   con el detalle plegado. Devuélvele el nombre.
2. **Error Boundary y registro.** Con sesión, en la consola del navegador:
   `setTimeout(() => { throw new Error('prueba T-106') })`. En Supabase, `error_logs` tiene que
   tener una fila con `[global] prueba T-106`, tu `user_id`, el club y `app_version` en `local`.
   Bórrala después.
3. **Error de acceso.** Con sesión, en las herramientas del navegador, pestaña Red, «Sin conexión»,
   y abre `/club` recargando: tras los reintentos sale «No se pudo cargar tu acceso». Vuelve a
   poner la red y pulsa «Reintentar».
4. **Aviso de sesión.** Se fuerza en la consola, con la red cortada para que la renovación falle.
   Si cuesta, basta con las pruebas de `caducidad.test.ts`.

**`npm run db:types` NO se lanza a la ligera.** Esta sesión no tocó el esquema.

---

## AVISO DE SEGURIDAD

Sin cambios de configuración esta sesión: ni variables de entorno, ni Netlify, ni migraciones.
`COMMIT_REF` lo pone Netlify en cada compilación y no hay que darlo de alta. El aviso de Chrome
autorrellenando el panel de Google en Supabase sigue vigente para el día que haga falta abrirlo:
**vacía «Client IDs» y «Client Secret» antes de tocar nada.**
