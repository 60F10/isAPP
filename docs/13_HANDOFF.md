# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 18/09/2026 — Tarea: T-102 · PWA y metadatos

Sesión de Cowork sobre el repositorio local, de noche. Ciclo completo sin intervención:
desarrollo, commits, push, pull request y fusión.

> **Se eligió la T-102 por delante de la T-105 a propósito.** El traspaso anterior recomendaba
> la T-105, pero el viaje completo del acceso con Google necesita un clic humano en la pantalla
> de cuenta, y esta sesión iba a correr sola. La T-102 se verifica entera sin credenciales.
> La T-105 sigue siendo la siguiente, y ahora con más razón.

| PR      | Rama                            | Contenido                                                                           | CI                             |
| :------ | :------------------------------ | :---------------------------------------------------------------------------------- | :----------------------------- |
| **#25** | `feat/platform-pwa-y-metadatos` | Cinco commits: fuente, iconos, plugin de la PWA, metadatos y aviso de versión nueva | Verde · fusionada en `bd2640d` |
| **#26** | `docs/docs-traspaso-t-102`      | DOC 06 v1.3, DOC 08 v1.7, este DOC 13 y `CLAUDE.md`                                 | —                              |

---

## HECHO

**La aplicación se instala.** Y se fue el último resto de la plantilla de Vite.

| Archivo                                          | Qué lleva                                                                             |
| :----------------------------------------------- | :------------------------------------------------------------------------------------ |
| `public/fonts/InterVariable-latin.woff2`         | Inter, eje `wght` 100–900, subconjunto latino, 48 kB. Sin cursiva: no se usa          |
| `public/pwa-192.png` · `public/pwa-512.png`      | Iconos del manifiesto: barras blancas sobre el índigo del acento                      |
| `public/pwa-maskable-512.png`                    | El dibujo al 52 % del lienzo, para sobrevivir al recorte del 80 % de Android          |
| `public/apple-touch-icon.png`                    | 180×180 para iOS                                                                      |
| `public/favicon.svg`                             | **Sustituido.** Era el de la plantilla original                                       |
| `vite.config.ts`                                 | `VitePWA` con `registerType: 'prompt'`, manifiesto y `workbox` sin `runtimeCaching`   |
| `tsconfig.app.json`                              | `vite-plugin-pwa/react` en `types`, para el módulo virtual                            |
| `index.html`                                     | Título, descripción, color de tema, icono de iOS y las dos metas de pantalla completa |
| `src/app/components/ActualizacionDisponible.tsx` | La banda que ofrece actualizar cuando hay versión nueva                               |
| `src/app/App.module.css`                         | **Nuevo.** El marco de la ventana, que sube un piso. Ver abajo                        |
| `src/app/layouts/*.module.css`                   | Las tres maquetas pasan de reclamar `100dvh` a llenar el hueco del marco              |

**Verificado en local, los tres en verde:** `npm run lint` (0 avisos y 0 errores sobre 151
reglas en 38 archivos), `npx prettier --check .` y `npm run build`. Y en remoto, los cinco
trabajos del CI de la #25 más el _deploy preview_ de Netlify.

**Verificado en el navegador**, con `npm run preview` y la página abierta de verdad:

- Service worker registrado, activo, ámbito `/`, y **controlando la página** tras recargar.
- Precaché con 14 URL: la fuente y los cinco iconos entre ellas.
- `document.fonts.check('16px Inter')` da cierto y la familia calculada del `body` empieza por
  `Inter`. O sea que la fuente no solo se descarga: se usa.
- Manifiesto servido como `application/manifest+json`, sin errores de parseo.
- **Una sola región `aria-live` en el DOM.** La banda no trae la suya.
- Sin desplazamiento horizontal, ni a 320 px ni con el texto al 200 %.
- **Consola limpia del todo.** Se fueron los dos avisos de la fuente que arrastrábamos desde la
  T-101. Lo único que queda es un mensaje de una extensión del navegador, ajeno a la aplicación.

**El marco, medido y no supuesto.** Con una banda simulada de 96 px: el marco se queda en los
726 px de la ventana, la ruta baja a 630 y empieza justo donde acaba la banda. El documento no
desplaza en ningún eje.

---

## PESO DEL PAQUETE

Medido con `vite build` y sin `NODE_ENV` en la terminal.

| Qué                      |     Crudo |    Comprimido |
| :----------------------- | --------: | ------------: |
| `index-*.js`             | 572,51 kB | **166,26 kB** |
| `index-*.css`            |  11,61 kB |   **3,12 kB** |
| `workbox-window`         |   5,65 kB |   **2,20 kB** |
| **Paquete inicial**      |           | **171,58 kB** |
| `core-*` (perezoso, A02) |   2,36 kB |       1,06 kB |
| `auth-*` (perezoso)      |   0,79 kB |       0,47 kB |

La T-104 cerró en 167,83 kB, así que **la PWA cuesta 3,75 kB** y quedan **28,4 kB** de los
200 kB del DOC 06 §10.3. Lo que falta por entrar ahí: A12 de verdad (T-207 y T-208) y Dexie
(T-206).

**La precaché es otra cifra y conviene no confundirlas: 641,88 KiB sin comprimir, en 17
entradas.** Es lo que se descarga al instalar, y la instalación puede pasar en el campo. El
paquete inicial mide lo que cuesta abrir; la precaché, lo que cuesta instalar.

---

## DECISIONES TOMADAS

**El marco de la ventana sube un piso, y toca código cerrado en la T-104.** Para que la banda de
actualización no tape el elemento enfocado (criterio 2.4.11) sin recurrir a `position: fixed`,
el marco de `100dvh` vive ahora en `App` y las tres maquetas pasan a llenar el hueco que les
deja. Sin eso, cada maqueta seguiría reclamando la ventana entera y la barra de navegación se
saldría por debajo del borde cada vez que apareciera el aviso. Es la misma lógica que llevó a
quitar el `position: fixed` de la barra en la T-104: no calcular alturas que luego cambian.
Se revierte tocando cuatro archivos.

**La banda no lleva región viva propia.** El DOC 06 §6.3 exige una sola en toda la aplicación,
la de `AnnounceProvider`. Esto es interfaz persistente, no un mensaje de estado: se anuncia una
vez por `anunciar()` y ya.

**No se pinta el «lista para trabajar sin conexión».** `vite-plugin-pwa` lo ofrece y es la
tentación fácil. Esa promesa la hace de verdad la precarga del partido de la T-206; decirla hoy,
con la aplicación sin datos locales, sería mentirle a quien está a pie de campo.

**Sin `includeAssets`.** Todo lo de `public/` se copia a `dist/` y `globPatterns` ya caza ahí
los `.svg` y los `.png`. Declararlo además duplicaba cinco entradas en el manifiesto de
precaché: Workbox las deduplica, pero la lista mentía sobre lo que hay.

**`mobile-web-app-capable` junto a la de Apple.** Chrome da `apple-mobile-web-app-capable` por
obsoleta y avisa por consola si va sola. Van las dos: iOS lee la suya.

**Los iconos llegaron con metadatos de procedencia incrustados, y se quitaron.** Se generaron
fuera de la máquina y el traslado les metió un trozo `caBX` con un manifiesto C2PA: 5 758 bytes
en cada PNG, o sea 7,5 kB para un icono de 192 px, más 7,8 kB en el favicon. Quitados los
trozos no esenciales, la precaché bajó de 672 a 641,88 KiB. **Aviso para la próxima vez que un
binario entre al repositorio desde fuera de la máquina: comprueba el tamaño antes de
commitearlo.**

---

## DEUDA TÉCNICA GENERADA

| Deuda                                                                              | Estado                                                                                   |
| :--------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------- |
| **El aviso de versión nueva sale también en mitad de un partido**                  | **Abierta hasta la T-207.** Ver abajo, porque contradice una regla de producto           |
| El criterio «Lighthouse ≥ 90 en PWA» del DOC 08 ya no se puede medir               | **Cerrada aquí**: el DOC 08 v1.7 lo reescribe por lo que aquella categoría medía         |
| `vite build` avisa de que el trozo inicial pasa de 500 kB en crudo                 | Asumida desde la T-104. El aviso dice la verdad y es el único control automático que hay |
| El marco de la ventana en `App` es una pieza más entre el enrutador y las maquetas | Asumida. Es lo que permite que cualquier banda futura no tape el foco                    |

**La deuda del aviso, con detalle, porque choca con una regla de producto.** La decisión D06-14
dice que mientras haya un partido en curso el aviso se guarda y no se muestra. El estado de
partido no existe todavía —es la T-207— y no se inventó. Hoy, si se despliega una corrección
con el directo abierto, la banda aparece y le quita alto a la pantalla que, según las reglas de
producto, no cede ante nada. El punto de enganche está comentado en
`ActualizacionDisponible.tsx` y es una línea: `if (!hayVersionNueva || partidoEnCurso) return
null;`. **Quien coja la T-207 tiene que cerrarla.**

---

## LO QUE SIGUE ABIERTO DE SESIONES ANTERIORES

Nada de esto se ha tocado hoy, y se pierde si no se arrastra. **Dos puntos de la lista anterior
se han cerrado con esta tarea** y ya no están: el subconjunto de Inter y el `<title>scaffold</title>`
de `index.html` con el favicon de la plantilla.

Pendiente de decidir, que no lo decide el código:

1. **Los cinco destinos de la barra apuntan a pantallas sueltas.** EQUIPO, DATOS y MÁS son
   grupos sin pantalla de aterrizaje en el DOC 02 §3, y «Más» abriendo Ajustes se lee raro. O
   pantallas índice de sección —dos pantallas nuevas al inventario— o se acepta el atajo. Se
   decide en la T-107.
2. **`clock` y `plus` haciendo de casa y calendario.** El inventario de 21 iconos del DOC 07
   §8.2 no tiene ninguno de los dos. Decidir si entran dos iconos nuevos.

Pendiente de hacer:

3. **Decidir qué hacer con `public.rls_auto_enable()`**, la función de la plataforma que el
   auditor de Supabase marca como ejecutable por `anon`. Riesgo práctico bajo; la salida
   —revocarla desde una migración— mete en el repositorio una función que gestiona Supabase.
4. **Quitar el `grant execute` a `authenticated` de las siete funciones de disparador**, que no
   lo necesitan. Siete líneas en la próxima migración de endurecimiento.
5. La columna «Fase» del DOC 02 §2 sigue desfasada en A15, A16 y el Bloque B.
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

---

## SIGUIENTE TAREA SUGERIDA

**T-105**, acceso con Google. Ya no hay alternativa cómoda: la T-102 y la T-104 están cerradas,
y de las tres tareas desbloqueadas de la Fase 1 —T-105, T-106 y T-107—, la T-105 es la única que
desatasca las veinte rutas que hoy se quedan en «Cargando…». Sin ella, la T-106 y la T-107 se
prueban a ciegas y toda la Fase 2 sigue parada.

**Y una advertencia de método, que es lo que más importa de este traspaso:** el viaje completo
del acceso con Google **necesita una persona delante**. Una sesión automática puede escribir el
código, montar el proveedor y comprobar que la redirección a Google sale bien, pero el clic en
la pantalla de cuenta y la aceptación de permisos no los da una máquina. **No programes la
T-105 para que corra sola de madrugada:** llegará hasta la redirección y ahí se planta.

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

El build tiene que terminar en verde, **sin el aviso de la fuente que faltaba**, y decir
`572.51 kB` en crudo y `166.26 kB` comprimidos de JavaScript, más `11.61 kB` y `3.12 kB` de CSS.
Al final, `precache 17 entries (641.88 KiB)`. Si sale bastante más, `NODE_ENV` volvió a colarse.

**Ojo con cómo se lanzan estos comandos si vas por una terminal automatizada:** `set NODE_ENV=`
en `cmd` deja la variable a cadena vacía, y eso empaqueta React en modo desarrollo igual que
`development`. Con esa medición el mismo build da 794 kB y 230 kB comprimidos, y parece que el
presupuesto ha reventado. La forma buena es `Remove-Item Env:\NODE_ENV` en PowerShell.

Después, la PWA de verdad (el service worker no corre en `npm run dev`, va apagado a propósito):

```powershell
npm run preview
```

1. Abrir `http://localhost:4173`: la consola tiene que quedar limpia.
2. `await navigator.serviceWorker.getRegistration()` da un registro activo con ámbito `/`.
   Recargar, y `navigator.serviceWorker.controller` deja de ser nulo.
3. `document.fonts.check('16px Inter')` da `true`.
4. Pestaña Application: manifiesto sin errores, los tres iconos resueltos, `display: standalone`.
5. Estrechar a 320 px y poner el texto al 200 %: sin desplazamiento horizontal.

Para ver el esqueleto de navegación por dentro sigue haciendo falta sesión, y la sesión es la
T-105.

**El panel de navegador de la aplicación de Claude no registra service workers** —da «An unknown
error occurred when fetching the script»—. Es limitación de ese panel, no de la aplicación: en
Chrome de verdad funciona. Si vas a comprobar la PWA, hazlo en Chrome.

---

## AVISO DE SEGURIDAD

Sigue vigente, y **la siguiente tarea es justo la que lo pisa**: al abrir el panel del proveedor
de Google en Supabase, **Chrome autorrellena «Client IDs» y «Client Secret»** con credenciales
guardadas. Vacía los dos campos antes de tocar nada; si se pulsa «Save» con eso dentro, tu
contraseña acaba escrita en la configuración del proveedor.
