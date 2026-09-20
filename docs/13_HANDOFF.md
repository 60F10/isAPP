# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 20/09/2026 — Deuda arrastrada (punto 19 / hallazgo 3): el contexto de sesión y la región viva salen de `app/`

Sesión sin Raúl delante y sin un solo clic de Google: no era falta que hiciera —el andamiaje de
sesión no se toca, solo se muda de sitio—. **Los commits y la pull request quedan para Raúl** (regla
del CLAUDE.md), así que al cerrar esta sesión el trabajo está en el árbol y sin subir.

Rama `refactor/auth-contexto-al-modulo`. No es tarea del DOC 08: es la deuda que el traspaso
anterior dejó como punto 19, «los módulos no pueden llegar a `useAuth` ni a `useAnnounce`», y que a
partir de la T-201 dejaba de poderse esquivar, porque toda pantalla que lea datos necesita el equipo
activo.

Venía además una edición sin commitear de la sesión anterior en `docs/10_Entornos_y_Despliegue.md`
§2.2 (los builds de Netlify parados desde el 20/09): se ha dejado intacta y sube en la misma pull
request.

---

## HECHO

**El contexto de sesión se muda a `modules/auth` y la región viva a `shared/`; `app/providers/` se
queda solo con los dos componentes proveedores.**

| Pieza                                               | Antes                                     | Ahora                                                                                      |
| :-------------------------------------------------- | :---------------------------------------- | :----------------------------------------------------------------------------------------- |
| Contexto de sesión + `useAuth` + `useHasPermission` | `src/app/providers/authContext.ts`        | `src/modules/auth/hooks/authContext.ts`, exportado por el `index.ts` del módulo            |
| Contexto de la región viva + `useAnnounce`          | `src/app/providers/announceContext.ts`    | `src/shared/hooks/announceContext.ts`                                                      |
| `AuthProvider.tsx` / `AnnounceProvider.tsx`         | `src/app/providers/`                      | Sin mover: son la composición                                                              |
| `RequireAuth` / `RequirePermission`                 | Leían `@app/providers/authContext`        | Leen `@modules/auth/hooks/authContext`, por ruta directa y no por el barril                |
| Pantalla de vuelta (A01b)                           | Preguntaba a `api/sesionActual.ts` propio | Pregunta a `useAuth()` del propio módulo; `sesionActual.ts` se borra, sin usuarios         |
| Errores de A01 y A01b                               | `<p role="alert">`, región viva de más    | `useAnnounce()` de la región única (DOC 06 §6.3); el párrafo se queda como interfaz normal |

**La decisión que tocaba tomar** —dónde exactamente dentro de `modules/auth`, porque el §3.2 tiene
`hooks/` pero el objeto de contexto no es un hook— se resuelve en `hooks/`: no es lógica pura de
`model/` (usa `createContext`/`useContext`, y `model/` es «sin React ni red»), y es donde ya vivía
junto al hook antes de moverse, por el mismo motivo de refresco en caliente que separa contexto de
proveedor. `AuthContext`, `useAuth` y `useHasPermission` viajan juntos en
`modules/auth/hooks/authContext.ts`.

**La trampa medida no ha mordido.** `RequireAuth` y `RequirePermission` se cargan de forma estática
desde `router.tsx`, que también carga `@modules/auth` en perezoso para las tres pantallas del
módulo; importar el contexto por el barril desde las guardias habría avisado
`INEFFECTIVE_DYNAMIC_IMPORT` y tirado esas pantallas al paquete inicial. Las dos guardias importan
`@modules/auth/hooks/authContext` por ruta directa, mismo patrón que ya usaba `AuthProvider.tsx`
para `api/` y `model/`.

`npm run lint` sin avisos · `npx prettier --check .` limpio · `npm run test -- --run` con
**33 pruebas en verde**, sin tocar ninguna · `npm run build` en verde, sin `INEFFECTIVE_DYNAMIC_IMPORT`.

---

## LO QUE SE CIERRA

- **Hallazgo 3 del traspaso anterior**, cerrado: un módulo ya puede llegar a la sesión y a la región
  viva sin tocar `app/`.
- **Los dos `role="alert"` de A01 y A01b**, cerrados: pasan por `useAnnounce()`.
- **`api/sesionActual.ts`**, borrado: se quedó sin un solo usuario en cuanto A01b pudo preguntar al
  contexto.
- **Punto 19** de «lo que sigue abierto», cerrado.

---

## DEUDA TÉCNICA GENERADA

Ninguna nueva. Esta sesión mueve código, no añade comportamiento.

---

## LO QUE SIGUE ABIERTO DE SESIONES ANTERIORES

**El punto 19 de la lista anterior se cierra esta sesión.** El resto se renumera sin huecos y se le
suman tres, del 21 al 23, que venían sueltos en la tabla de deuda técnica de la sesión de la T-105 y
todavía no estaban en esta lista.

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
16. **Netlify tiene los despliegues PARADOS desde el 20/09** (DOC 10 §2.2, esta sesión). El sitio
    publicado sigue en pie, pero fusionar a `main` no publica nada hasta reactivarlos a mano.
17. **`strict` apagado en los `tsconfig`.** No aparece `strict`, ni `strictNullChecks`, ni
    `noUncheckedIndexedAccess`. Encenderlo es tarea propia: probablemente saque errores por todo el
    repositorio, empezando por el código que distingue `null` de un conjunto vacío.
18. **`esErrorDeCliente` no reconoce un error de Supabase**, así que los 4xx se reintentan dos veces
    en vez de rendirse a la primera. Se arregla con el «ayudante común» del DOC 06 §10.1, que
    todavía no existe en `shared/lib/`.
19. **No hay forma de que entre nadie más.** Ni alta propia, ni invitación, ni hacerse seguidor: la
    tabla `invitations` existe y no la usa ninguna pantalla. Hoy solo entra quien esté sembrado a
    mano. Es la T-301, y **la idea de Raúl de elegir equipo como seguidor al entrar se apunta
    aquí**: hace falta decidirla en el DOC 03, porque pide tocar la RLS de `team_followers` y
    enseñar una lista de equipos que hoy nadie puede leer.
20. **A01b no está en el inventario del DOC 02.** La pantalla de vuelta existe en el código y no en
    la documentación de pantallas. O entra al inventario como parada técnica, o se le da otro sitio.
21. **`errorContexto` no lo pinta nadie.** Si la consulta del contexto de acceso falla, las rutas
    guardadas se quedan en «Cargando…» para siempre. Lo cierra la T-106, que es quien trae las
    pantallas de error.
22. **No hay cerrar sesión en ninguna parte.** Quien entre con una cuenta sin equipo se queda ahí.
    Es la T-107. Mientras tanto se sale borrando el almacenamiento del sitio.
23. **El contrato de `AuthState` mezcla idiomas**: `cargando` y `permisos` junto a `profile` y
    `activeTeamId`. Los nombres nuevos son los que fija el DOC 06 §5.5; decidir y unificar.

Asumidas y sin fecha: `vite build` avisa de que el trozo inicial pasa de 500 kB en crudo; el marco
de la ventana vive en `App` como una pieza más entre el enrutador y las maquetas; la siembra se
lanza a mano y no hay guion de `npm` que la ejecute; `useHasPermission` recibe `string` y no
`AppPermission` (barato de tipar cuando toque); y `teams` del contexto devuelve membresías, no
equipos pelados, aunque el §5.5 lo llame `teams` —a propósito: quien elija equipo necesita también
el rol y los permisos de cada uno—.

---

## EL PAQUETE, MEDIDO

| Momento          | Inicial comprimido | Margen sobre 200 kB |
| :--------------- | -----------------: | ------------------: |
| T-105 como quedó |          175,19 kB |            24,81 kB |
| **Esta sesión**  |      **175,21 kB** |        **24,79 kB** |

**El paquete inicial sube un pelín, y es un cambio real, no de redondeo:** `vite build` es
determinista. El trozo principal pasa de 169,87 a **169,89 kB** comprimidos porque el contexto de
sesión ahora lo alcanzan a la vez la ruta estática de las guardias y `AuthProvider` **y** la ruta
perezosa de `AuthCallbackPage`, que antes no tocaba ese archivo para nada —tiraba de su propio
`sesionActual.ts`—. El trozo perezoso de `auth` adelgaza en cambio de 1,27 a **1,24 kB**, porque
`sesionActual.ts` ya no existe. Con el CSS (3,12 kB) y `workbox-window` (2,20 kB) sin tocar, el total
del arranque pasa de 175,19 a **175,21 kB**, unos treinta bytes de más sobre los 200 kB del
presupuesto. En crudo, 583,85 kB de JavaScript y `precache 17 entries (654.65 KiB)`.

---

## SIGUIENTE TAREA SUGERIDA

Sin cambios respecto al traspaso anterior: **la T-105b** primero —segundo club, otro usuario y
comprobar que no ve nada del primero, que ahora por fin tiene un primer club que no ver (DOC 05
§12.5)— y después la **T-106** (error boundary, `error_logs`, el punto 21 y el punto 9 de arriba).

---

## COMANDOS PARA VERIFICAR

```powershell
cd D:\Documentos\Proyectos\ProyectoSASI\App
Remove-Item Env:\NODE_ENV          # imprescindible, ver el hallazgo de la T-101
git switch refactor/auth-contexto-al-modulo

npm ci
npm run lint
npx prettier --check .
npm run test -- --run
npm run build
```

`npm run test -- --run` tiene que decir `Test Files 2 passed (2)` y `Tests 33 passed (33)`, sin que
esta sesión haya tocado ni una prueba.

El build tiene que terminar en verde y decir **`583.85 kB` en crudo y `169.89 kB` comprimidos** de
JavaScript, más `11.61 kB` y `3.12 kB` de CSS, y un trozo `auth-*.js` de `1.24 kB` comprimidos. Al
final, `precache 17 entries (654.65 KiB)`. Si sale bastante más, `NODE_ENV` volvió a colarse; y
**ojo con `set NODE_ENV=` en `cmd`**, que la deja a cadena vacía y empaqueta React en modo
desarrollo.

**Si sale `INEFFECTIVE_DYNAMIC_IMPORT`**, alguien ha vuelto a importar el barril `@modules/auth` de
forma estática desde `app/` —`AuthProvider.tsx` o las guardias—. Las tres pantallas de `auth` se
habrán caído al paquete inicial.

No hace falta pasar por el navegador para esta sesión: no se ha tocado ningún flujo, solo la ruta de
los archivos. **Sí conviene comprobar una vez** que el viaje del acceso sigue igual —entrar sin
sesión, pasar por Google, volver por «Entrando» y aterrizar con la sesión puesta, sin pasar por la
pantalla de cuenta—, porque `AuthCallbackPage` ya no lee su propia sesión: lee el contexto.

**`npm run db:types` NO se lanza a la ligera.** Sin `SUPABASE_ACCESS_TOKEN` o sin `supabase login`,
el `>` del script deja `src/types/database.types.ts` en cero bytes. Esta sesión **no tocó el
esquema**, así que los tipos siguen valiendo tal cual.

---

## AVISO DE SEGURIDAD

Sin cambios de configuración esta sesión: ni variables de entorno, ni Netlify, ni migraciones. El
aviso de Chrome autorrellenando el panel de Google en Supabase sigue vigente para el día que haga
falta abrirlo: **vacía «Client IDs» y «Client Secret» antes de tocar nada.**
