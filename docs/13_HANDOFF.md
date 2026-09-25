# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 25/09/2026 — T-107, Ajustes: ✅ cerrada. La fase 1 está completa

Sesión en la nube, sin Raúl delante y sin acceso a Supabase. Cierra el punto 19 de la lista anterior
—no había forma de cerrar sesión— y revisa el `prompt: 'select_account'` de la T-105. El punto 1
(destinos de la barra) se queda para Raúl, con las salidas escritas.

El entorno obliga a subir a una rama `claude/…`; la que toca por convención es
`feat/platform-ajustes`, y con ese nombre se hizo el commit para que pasara el hook de `pre-commit`.
La pull request lo dice.

---

## HECHO

**La pantalla C01, Ajustes, sustituye a su `PantallaPendiente`.** Dos tarjetas: «Pantalla», con alto
contraste y movimiento reducido, y «Cuenta», con el nombre con el que se ha entrado y «Cerrar
sesión».

| Pieza                            | Qué hace                                                                                                                          |
| :------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| `app/routes/AjustesPage.tsx`     | La C01. Perezosa desde el enrutador, en su propio trozo. Casillas nativas con su ayuda enlazada por `aria-describedby`            |
| `shared/lib/preferencias.ts`     | Lee, interpreta, guarda y aplica las dos preferencias. Nunca lanza: un `localStorage` bloqueado no puede impedir que arranque     |
| `app/main.tsx`                   | Aplica las preferencias antes de cargar `App`, para que no haya destello de la paleta normal al abrir con el móvil ya al sol      |
| `styles/tokens.css` y `base.css` | `data-motion="reduced"` pone a cero las mismas duraciones que `prefers-reduced-motion`. `data-contrast="high"` ya existía (T-103) |
| `auth/api/session.ts`            | `cerrarSesion()`, con `scope: 'local'`. Y el comentario de `select_account`, revisado                                             |

**Comprobado en Chromium** con el build servido: con las preferencias guardadas, la aplicación
arranca ya con `data-contrast="high"` y `data-motion="reduced"`, la tinta sale negra, las duraciones
a cero y no hay desplazamiento horizontal a 320 px. **Sin comprobar**: la C01 con sesión y el cierre
de sesión de verdad, porque aquí no se puede entrar con Google. Los pasos, en «Comandos para
verificar».

### Pruebas

**74 en verde**, 12 nuevas. Cada una se vio fallar antes de darla por buena: seis contra un esbozo
vacío y las demás con un mutante a mano sobre la línea que vigilan.

| Archivo                           | Casos | Qué vigila                                                                                       |
| :-------------------------------- | ----: | :----------------------------------------------------------------------------------------------- |
| `shared/lib/preferencias.test.ts` |     7 | Valores por defecto, texto roto, campos que faltan, ida y vuelta, almacén que lanza, atributos   |
| `app/routes/AjustesPage.test.tsx` |     5 | Las dos casillas cambian `<html>` y se guardan; la cuenta; salir lleva al acceso; el fallo avisa |

---

## DECISIONES TOMADAS

**D06-25 · Las preferencias se guardan en el dispositivo, no en el perfil.** El DOC 07 §4 pide el
perfil, pero `profiles` no tiene columna y esta sesión no puede migrar. Viven en `localStorage` bajo
`sasi.preferencias`. Ventaja real: se aplican al arrancar sin esperar a la red. Coste: no viajan del
móvil al portátil. Salidas en el punto 24.

**El movimiento reducido de Ajustes se suma al del sistema, no lo sustituye.** Con
`prefers-reduced-motion` puesto, apagar la casilla no devuelve las animaciones: la preferencia del
sistema la eligió la persona por una razón, y una aplicación no tiene por qué pasar por encima. La
ayuda de la casilla lo dice.

**Casillas nativas y no un interruptor dibujado.** La casilla ya trae nombre, estado, teclado y
cambio al soltar (2.5.2). Toda la fila mide 48 px y responde al toque.

**`cerrarSesion` con `scope: 'local'`.** Supabase cierra por defecto la sesión en **todos** los
dispositivos del usuario: salir en el móvil cerraría también el portátil de Isaac. Sin red, Supabase
no revoca el testigo en el servidor pero borra la sesión local igual; se da por cerrada si la sesión
ya no está en el dispositivo. Después se vacía la caché de react-query, para que quien entre luego
en el mismo móvil no vea lo que se descargó con la sesión anterior. `sasi.equipo-activo` se queda:
solo es un identificador y se valida siempre contra las membresías de quien entre.

**`prompt: 'select_account'` se queda.** «Cerrar sesión» cierra esta aplicación, no Google. Sin el
selector, volver a entrar reutilizaría en silencio la cuenta de Google abierta en el navegador y
cambiar de cuenta seguiría siendo imposible, que es justo lo que el cierre de sesión tiene que
permitir.

**Sin confirmación al cerrar sesión.** Hoy no hay nada en el dispositivo que se pierda al salir: la
cola de salida llega con la T-206. Queda anotado para esa tarea (punto 25).

**D06-22 estaba repetida.** La sesión del `strict` publicó su decisión como D06-22, número que ya
usaba el §5.5 para `permisos`. Se renumera a **D06-24** en el DOC 06 y en el `CLAUDE.md`.

---

## PENDIENTE DE LA TAREA

**El punto 1, los destinos de la barra.** Lo decide Raúl. «Más» sigue abriendo la C01, como desde la
T-104, y el DOC 02 §3.1 remite aquí. Salidas en el punto 1.

---

## DEUDA TÉCNICA GENERADA

| Deuda                                                          | Cuándo se paga                                                                                     |
| :------------------------------------------------------------- | :------------------------------------------------------------------------------------------------- |
| Las preferencias no viajan entre dispositivos                  | Con una columna en `profiles`, en una sesión de Cowork (punto 24)                                  |
| Cerrar sesión no avisa de datos sin sincronizar                | En la T-206, cuando exista la cola de salida: sin ese aviso, salir tiraría eventos sin enviar (25) |
| Un marco en blanco de la paleta normal antes del primer módulo | Solo el fondo, antes de que haya contenido. Un `<script>` en línea en `index.html` lo quitaría     |

---

## LO QUE SIGUE ABIERTO

**Se cierra el punto 19 de la lista anterior** (cerrar sesión). Los de detrás suben uno y se suman
dos al final. Para quien lleve la cola con los números viejos:

| Antes | Ahora | Qué                                         |
| ----: | ----: | :------------------------------------------ |
|     1 |     1 | Destinos de la barra, con salidas           |
|    20 |    19 | `AuthState` mezcla idiomas                  |
|    21 |    20 | Referencias cruzadas entre clubes           |
|    22 |    21 | `noUncheckedIndexedAccess`                  |
|    23 |    22 | Fallos sin sesión fuera de `error_logs`     |
|    24 |    23 | El trozo de `App` sin precarga              |
|     — |    24 | Preferencias en el dispositivo              |
|     — |    25 | Cerrar sesión sin aviso de datos pendientes |

Pendiente de decidir, que no lo decide el código:

1. **Los cinco destinos de la barra.** Hoy: Inicio `/`, Equipo `/equipos`, Agenda `/calendario`,
   Datos `/estadisticas`, Más `/ajustes`. **Lo decide Raúl.** Salidas:

   | Salida                                                                                  | Consecuencia                                                                                                                                                                                                                               |
   | :-------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | **A. Dejarlo como está**                                                                | Cero trabajo. Pero `/mis-aportaciones` solo se alcanza desde Inicio, `/admin/logs` (T-303) no tiene entrada, y «Más» abriendo Ajustes se lee raro                                                                                          |
   | **B. Pantalla índice «Más»** en `/mas`: Mis aportaciones, Ajustes y Registro de errores | Una pantalla más, pequeña y sin datos, y un toque más hasta Ajustes (sigue dentro de los tres). La barra se corresponde con el árbol del DOC 02 §3 y la C02 tiene sitio. **Recomendada**                                                   |
   | C. Pantallas índice para Equipo, Datos y Más                                            | Tres pantallas. Arregla también que **Equipo abra `/equipos`, que pide `team.manage`**: un seguidor o un anotador sin ese permiso pulsa Equipo y cae en `/403`. Sale caro antes de la liga; se puede partir: B ahora y Equipo con la T-201 |

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
7. Los cubos de Storage `crests` y `docs`, sin crear. **La T-201 lo nota**: el escudo del club queda
   fuera hasta que exista `crests`.
8. Los alias viven duplicados en `tsconfig.app.json` y en `vite.config.ts`, a mano.
9. `/admin/logs` sigue sin guardia de permiso: el DOC 05 §4 no define ninguno de administración.
   Lo resuelve la T-303.
10. Faltan tokens de anchura de maqueta en el DOC 07: el rail y la caja de `BareLayout` salen de
    `--tap-min`.
11. **Dieciocho rutas comparten la misma `PantallaPendiente`.** Cada una la sustituye su tarea.
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
15. **Netlify tiene los despliegues PARADOS desde el 20/09** (DOC 10 §2.2). Fusionar a `main` no
    publica nada hasta reactivarlos a mano: ni la T-106 ni la T-107 están en el sitio publicado.
16. **`esErrorDeCliente` no reconoce un error de Supabase**, así que los 4xx se reintentan dos veces
    en vez de rendirse a la primera. Se arregla con el «ayudante común» del DOC 06 §10.1, que
    todavía no existe en `shared/lib/` ni tiene tarea asignada. **La T-201 es la primera que
    escribe datos**: buen momento para hacerlo.
17. **No hay forma de que entre nadie más.** Ni alta propia, ni invitación, ni hacerse seguidor: la
    tabla `invitations` existe y no la usa ninguna pantalla. Es la T-301, y **la idea de Raúl de
    elegir equipo como seguidor al entrar se apunta aquí**: hace falta decidirla en el DOC 03,
    porque pide tocar la RLS de `team_followers`.
18. **A01b no está en el inventario del DOC 02.** O entra como parada técnica, o se le da otro sitio.
19. **El contrato de `AuthState` mezcla idiomas**: `cargando`, `permisos` y `reintentarContexto`
    junto a `profile` y `activeTeamId`. Decidir y unificar con el DOC 06 §5.5.
20. **Un club puede enlazar objetos de otro club en sus propias filas** (los catorce avisos de la
    T-105b). Ninguna clave ajena exige que los dos lados sean del mismo club, y `team_of_match`
    devuelve el equipo de cualquier partido. **Decidir antes de la T-201 cuándo se paga**: la T-201
    a la T-205 son las primeras pantallas que escriben esas filas. Pide migración: sesión de Cowork.
21. **`noUncheckedIndexedAccess` apagado.** Saca siete errores, seis en `permissions.test.ts` y uno
    en `permissions.ts:120`. Salidas: encenderlo ya (media hora, recomendada: el coste crece con cada
    lista que pinte una pantalla), después del MVP, o nunca y revisar a mano.
22. **Los fallos sin sesión no llegan a `error_logs`.** La RLS solo deja insertar a
    `authenticated`. Abrirla a `anon` abre la puerta a llenar la tabla desde fuera. Decidir en el
    DOC 03 si hace falta verlos.
23. **El trozo de `App` no se precarga desde `index.html`** (D06-23): un viaje de red más en la
    primera visita. Un plugin de Vite de diez líneas que añada su `modulepreload` lo arregla.
24. **Las preferencias de pantalla viven en el dispositivo** (D06-25). Salidas: una columna
    `preferences jsonb` en `profiles` con `localStorage` como caché para arrancar sin red
    —recomendada: cumple el DOC 07 y no pierde el arranque rápido—; o dejarlo así y corregir el
    DOC 07. Pide migración: sesión de Cowork.
25. **Cerrar sesión no avisa de datos sin sincronizar.** Hoy no hay ninguno. La T-206 tiene que
    añadir el aviso y no dejar salir con la cola llena sin que la persona lo confirme.

Asumidas y sin fecha: el marco de la ventana vive en `App` como una pieza más entre el enrutador y
las maquetas; la siembra se lanza a mano; `useHasPermission` recibe `string` y no `AppPermission`;
`teams` del contexto devuelve membresías y no equipos pelados, a propósito; el club activo del
registro vive en una variable de módulo de `logging`; y `sasi.equipo-activo` sobrevive al cierre de
sesión, a propósito.

---

## EL PAQUETE, MEDIDO

| Momento                   | Inicial comprimido | Margen sobre 200 kB |
| :------------------------ | -----------------: | ------------------: |
| Tras la T-106, en Linux   |          179,50 kB |            20,50 kB |
| **Esta sesión, en Linux** |      **179,92 kB** |        **20,08 kB** |

**+0,42 kB**, que son las preferencias en el arranque, las reglas de `data-motion` y la guardia
tocada. La C01 no pesa en el arranque: sale en su propio trozo perezoso (`AjustesPage-*.js`,
1,16 kB, más 0,33 kB de estilos), y `Card`, que ahora comparten Inicio y Ajustes, también se separa
(0,26 kB más 0,22 kB).

| Trozo del arranque    |    Comprimido |
| :-------------------- | ------------: |
| `index-*.js`          |      68,72 kB |
| `preload-helper-*.js` |       4,07 kB |
| `App-*.js`            |     101,13 kB |
| `workbox-window`      |       2,20 kB |
| Tres hojas de estilo  |       3,80 kB |
| **Total**             | **179,92 kB** |

En crudo, 597,39 kB de JavaScript en el arranque y `precache 25 entries (667.25 KiB)`. En Windows
saldrá unos 0,24 kB más: compara siempre con una medida de la misma máquina.

---

## SIGUIENTE TAREA SUGERIDA

**T-201**: club y equipo. **La fase 1 está completa y la T-105b está en ✅**, así que se puede
empezar. Antes, dos decisiones de Raúl que la afectan de lleno: el punto 20 (referencias cruzadas
entre clubes) y el 21 (`noUncheckedIndexedAccess`). Y el punto 1, que decide adónde lleva «Equipo».

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

`npm run test -- --run` tiene que decir `Test Files 8 passed (8)` y `Tests 74 passed (74)`. El
build, en verde, sin `INEFFECTIVE_DYNAMIC_IMPORT` y con un trozo `AjustesPage-*.js` aparte.

**En el navegador, con `npm run dev` y sesión, lo que esta sesión no pudo probar:**

1. Pulsa «Más»: sale Ajustes con tu nombre de Google.
2. Marca «Alto contraste»: todo pasa a negro sobre blanco al momento. Recarga: sigue así, sin
   destello. Desmárcalo.
3. Marca «Reducir el movimiento» y pulsa un botón: el cambio de color es instantáneo.
4. «Cerrar sesión»: vuelves a la pantalla de acceso. Entra otra vez: Google te pregunta con qué
   cuenta, y si tenías otra pestaña o el portátil con sesión, **siguen dentro**.
5. Con la red cortada en las herramientas del navegador, entra y «Cerrar sesión»: también sale.

**`npm run db:types` NO se lanza a la ligera.** Esta sesión no tocó el esquema.

---

## AVISO DE SEGURIDAD

Sin cambios de configuración esta sesión: ni variables de entorno, ni Netlify, ni migraciones. El
aviso de Chrome autorrellenando el panel de Google en Supabase sigue vigente para el día que haga
falta abrirlo: **vacía «Client IDs» y «Client Secret» antes de tocar nada.**
