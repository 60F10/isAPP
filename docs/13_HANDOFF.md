# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 12/09/2026 — Tarea: T-101 · dependencias, `env.ts` y `supabase.ts`

Primera tarea que escribe código de aplicación. Sesión autónoma, con Raúl fuera.

> **Aviso que manda sobre todo lo demás: la tarea está hecha y verificada, pero NO fusionada.**
> Las dos pull requests están abiertas, con el CI entero en verde y sin conflictos. La sesión
> no tenía permiso para fusionar sin revisión humana, así que los dos «Squash and merge» los
> tiene que dar Raúl. Hasta entonces, `main` sigue en `6f2ad7d` y el _Knowledge_ del proyecto
> sigue en la versión anterior a propósito: la copia buena es `/docs`, y subir arriba lo que
> aún no está fusionado abajo produce exactamente el desfase que el DOC 00 §3.2 prohíbe.

### HECHO

**Dependencias del DOC 06 §2.3, las trece y ni una más** (regla D06-01). Cuatro de producción
—`react-router`, `@tanstack/react-query`, `@supabase/supabase-js`, `dexie`— y nueve de
desarrollo —`vite-plugin-pwa`, `vitest`, `@vitest/coverage-v8`, `jsdom`, `fake-indexeddb`,
las tres de Testing Library y el CLI `supabase`, que es el que ejecuta `npm run db:types`—.

**Fuera la plantilla de Vite.** Se borraron `src/App.tsx`, `src/App.css`, `src/index.css`,
`src/main.tsx`, `src/assets/react.svg` y `src/assets/vite.svg`. Se quedan el logo, el hero,
los veintiún iconos de `src/shared/ui/icons/`, `src/styles/tokens.css` y
`src/types/database.types.ts`.

**Archivos nuevos y tocados:**

| Archivo                      | Qué lleva                                                                   |
| :--------------------------- | :-------------------------------------------------------------------------- |
| `src/app/main.tsx`           | Punto de entrada del §3.1. Monta React, valida el entorno y crea el cliente |
| `src/shared/lib/env.ts`      | Lectura y validación de las tres variables `VITE_` al arrancar (D06-21)     |
| `src/shared/lib/supabase.ts` | Cliente único tipado con `Database`, tal cual el §7.1                       |
| `tsconfig.app.json`          | `paths` con los cuatro alias del §4.3                                       |
| `vite.config.ts`             | El mismo mapa en `resolve.alias`, resuelto desde `import.meta.url`          |
| `index.html`                 | Apunta a `/src/app/main.tsx` y declara `lang="es"`                          |

**Verificado en local, los tres en verde:** `npm run lint` (0 avisos, 0 errores),
`npx prettier --check .` y `npm run build` (`tsc -b` incluido). Y en remoto: los dos trabajos
del CI de la PR #18, más el deploy preview de Netlify.

**Peso del paquete, medido y contrastado con el presupuesto del DOC 06 §10.3.** Lo que entra
hoy pesa **436,08 kB en crudo y 124,10 kB comprimidos**. Por debajo de los 200 kB, sí, pero
la cifra que importa es otra: con las cuatro dependencias de producción dentro del grafo
—que es lo que pasa en cuanto la T-104 monte el enrutador— la medición sube a **190,27 kB
comprimidos**, el 95 % del presupuesto, con un `main.tsx` que no pinta nada. Las tres salidas
posibles, con sus consecuencias, quedan escritas en el DOC 06 §10.3.

**Documentación al día:** DOC 00 v1.4, DOC 06 v1.2, DOC 08 v1.4 (T-101 en ✅), este DOC 13
y `CLAUDE.md`, que seguía diciendo que no existía `package.json`.

### DECISIONES TOMADAS

**Alias de importación, no ruta relativa.** Es lo que fija el DOC 06 §4.3 y no había motivo
para desviarse: el propio `import` enseña el límite entre módulos. `@modules/match` se lee
como un contrato; `../../../match/model/clock` canta que alguien se saltó la valla.

**El §4.3 estaba mal escrito y se ha corregido con la herramienta delante.** Dos cosas, las
dos descubiertas al compilar, no al leer:

- **`baseUrl` fuera.** TypeScript 6 lo da por obsoleto y aborta con **TS5101**. Quitarlo
  obliga a que las rutas de `paths` sean relativas a la carpeta del `tsconfig` (**TS5090**),
  de ahí el `./src/...` de cada entrada.
- **`@types/*` pasa a `@app-types/*`.** TypeScript rechaza con **TS6137** toda importación
  que empiece por `@types/`, porque reserva ese prefijo para los paquetes de declaraciones.
  No es una manía del linter: no compila. El nombre nuevo se ha aplicado en el código, en el
  DOC 06 §4.3 y §7.1, y en `CLAUDE.md`.

**`env.ts` lee con acceso estático, no dinámico.** Un `import.meta.env[nombre]` habría
quedado más corto, pero Vite solo sustituye el acceso estático `import.meta.env.VITE_X` por
su valor literal al compilar. El dinámico funciona en `npm run dev` y llega vacío a
producción, que es justo el fallo que la decisión D06-21 quiere evitar.

**Los fallos de entorno se acumulan y se lanzan juntos.** Arrancar, corregir una variable,
volver a arrancar y descubrir que falta otra es una pérdida de tiempo evitable. El valor de
la `anon key` no se imprime nunca, aunque sea público.

**`VITE_APP_ENV` con lista cerrada: `development` o `production`.** Son los dos valores que
define el DOC 10 §3. Un tercero rompe al arrancar, a propósito. Si algún día hace falta uno
para los deploy previews, se añade a `env.ts`, a `.env.example` y a Netlify en el mismo
commit, que es la regla del DOC 06 §12.

**`main.tsx` importa el cliente de Supabase por su efecto.** Sin esa línea, Vite lo sacaría
del paquete por no usarse y la medición del peso saldría optimista y falsa. Además es lo que
hace que la validación del entorno corra de verdad al arrancar.

**`index.html` pasa a `lang="es"`.** La interfaz va en español y el idioma de la página es el
criterio 3.1.1 de WCAG, que el principio P5 manda aplicar al construir. El título, el
manifiesto y los iconos **no** se han tocado: son de la T-102.

**Ni `npm run test` ni configuración de Vitest.** `vitest` está instalado porque la lista del
§2.3 se instala de una vez, pero el bloque `test` de `vite.config.ts` y el paso de CI del
DOC 06 §11 quedan fuera del alcance de esta tarea. Un `npm run test` sin un solo archivo de
prueba falla, así que ni siquiera se ha añadido el script: se añade con la primera prueba.

### HALLAZGO DEL ENTORNO: `NODE_ENV=production` en la máquina

La máquina de desarrollo tiene **`NODE_ENV=production`** puesta en el entorno del sistema.
Con esa variable delante, `npm ci` y `npm install` **se saltan las devDependencies**: la
primera instalación de esta sesión dejó el proyecto sin Vite, sin TypeScript, sin oxlint y
sin Prettier, y npm no dijo ni una palabra. Y al revés, poner `NODE_ENV=development` para
sortearlo hace que `vite build` empaquete React en modo desarrollo: la primera medición del
paquete dio 185 kB comprimidos cuando la real eran 124.

Ninguna de las dos cosas falla de forma ruidosa, y las dos mienten. Queda escrito en
`CLAUDE.md` y en el DOC 06 §10.3. Antes de instalar o de medir, en la terminal de la sesión:

```powershell
Remove-Item Env:\NODE_ENV
```

Lo suyo sería quitarla del entorno del sistema, pero eso es tocar la configuración de la
máquina de Raúl y no entraba en esta tarea.

### ESTADO DEL REPOSITORIO

**La PR #18 ya está fusionada en `main`, en `6321b98`**, con su rama remota borrada. Se cerró
desde la conversación de la que salió esta tarea, después de que la sesión automática dejara
de responder con el CI de la #19 encolado. La #19 es esta misma, rebasada sobre ese `main`:

| PR  | Rama                             | Contenido                                                                                                        | CI                             |
| :-- | :------------------------------- | :--------------------------------------------------------------------------------------------------------------- | :----------------------------- |
| #18 | `feat/platform-cliente-supabase` | `build(deps)` · `build(platform)` los alias · `feat(platform)` env y cliente · `refactor(platform)` la plantilla | Verde · fusionada en `6321b98` |
| #19 | `docs/docs-traspaso-t-101`       | `docs(docs)` los DOC 00, 06, 08, 13 y `CLAUDE.md`                                                                | Rebasada sobre `6321b98`       |

**Las dos se fusionan con squash**, que es la única estrategia habilitada. Después se borran
las ramas remota y local de cada una.

**El CI se quedó encolado 35 minutos** en el run del `docs/docs-traspaso-t-101` de las 21:13,
con los dos trabajos en `queued` y sin runner que los cogiera. No era un fallo del código: el
run anterior de esa misma rama había pasado en verde. Un push nuevo sobre la rama lo cancela
por el `concurrency` del workflow y lanza otro, que es la salida cuando vuelva a pasar.

**Las once ramas locales viejas siguen ahí, y no por descuido.** El repositorio fusiona con
**squash**, así que los commits de una rama nunca llegan a ser antepasados de `main` y
`git branch -d` las da todas por «not fully merged». Que están fusionadas se comprueba por
otro lado: sus ramas remotas ya no existen, porque GitHub las borra al fusionar. La única
forma de limpiarlas es forzar el borrado, y eso no lo hace una sesión autónoma:

```powershell
git branch -D chore/repo-cerrar-proteccion-main chore/repo-subagentes `
  docs/docs-arquitectura-frontend docs/docs-estado-tras-fusiones docs/docs-readme `
  docs/docs-reglas-negocio-y-modelo-datos docs/docs-traspaso-sesion `
  docs/docs-traspaso-t-100b feat/db-aplicar-esquema-inicial `
  feat/db-correcciones-auditoria feat/db-esquema-inicial
```

Conviene saberlo porque va a pasar con todas: **con squash merge, `git branch -d` no sirve
nunca.** La comprobación buena antes de forzar es `git ls-remote --heads origin <rama>`: si
no devuelve nada, la rama se fusionó y se puede borrar.

### PENDIENTE DE LA TAREA

1. **Fusionar la PR #19** con squash y borrar su rama. La #18 ya está dentro. Es lo único que
   separa la T-101 de estar cerrada del todo.
2. **Resincronizar el _Knowledge_** del proyecto desde `/docs` con los DOC 00, 06, 08 y 13 ya
   fusionados. El DOC 15 no sube, a propósito.
3. Comprobar en el navegador lo que la sesión no pudo comprobar: `npm run dev`, que la página
   carga sin errores de consola, y que renombrar `VITE_SUPABASE_URL` en `.env.local` produce
   el error con el nombre de la variable. Son las condiciones 1 y 2 del DOC 00 §6.
4. **Borrar las once ramas locales viejas** con el `git branch -D` de arriba, y las dos de
   esta tarea cuando se fusionen.

### DEUDA TÉCNICA GENERADA

| Deuda                                                                                                          | Estado                                                                                                         |
| :------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| El presupuesto de 200 kB del DOC 06 §10.3 se queda en 10 kB de margen en cuanto entren las cuatro dependencias | Abierta. Se decide en la **T-104**, con las tres salidas escritas en el §10.3                                  |
| `vitest` y `@vitest/coverage-v8` instalados, sin bloque `test` en `vite.config.ts` ni paso de CI               | Abierta. Entra con la primera prueba, que por el DOC 06 §11 será del `model/` de `match`                       |
| `vite-plugin-pwa` instalado y sin configurar                                                                   | Abierta hasta la T-102, que es la tarea que lo configura                                                       |
| `src/styles/tokens.css` sigue sin engancharse a nada: nadie lo importa                                         | Abierta hasta la T-103, que monta el sistema de diseño                                                         |
| Los alias viven duplicados en `tsconfig.app.json` y en `vite.config.ts`, sincronizados a mano                  | Asumida. Es la forma que tiene Vite; una desviación entre los dos compila pero no arranca                      |
| `index.html` mantiene `<title>scaffold</title>` y el favicon de la plantilla                                   | A propósito: los metadatos son de la T-102                                                                     |
| El error de entorno se lanza sin interfaz: pantalla en blanco y mensaje en consola                             | Asumida hasta la T-106, que trae el Error Boundary. En despliegue el fallo es de configuración, no del usuario |

### LO QUE SIGUE ABIERTO DE SESIONES ANTERIORES

Nada de esto se ha tocado hoy, y se pierde si no se arrastra:

1. **Decidir qué hacer con `public.rls_auto_enable()`**, la función de la plataforma que el
   auditor de Supabase marca como ejecutable por `anon`. Riesgo práctico bajo; la salida
   —revocarla desde una migración— mete en el repositorio una función que gestiona Supabase.
2. **Quitar el `grant execute` a `authenticated` de las siete funciones de disparador**, que
   no lo necesitan. Siete líneas en la próxima migración de endurecimiento.
3. La columna «Fase» del DOC 02 §2 sigue desfasada en A15, A16 y el Bloque B.
4. La descarga de `InterVariable-latin.woff2` y el subconjunto sin afinar.
5. Marcar `event.approve` a quien lleve el registro, cuando exista la T-301.
6. Los cubos de Storage `crests` y `docs`, sin crear.
7. Deudas de base de datos abiertas: `btree_gist` en `public`, veintisiete claves ajenas sin
   índice, trece tablas con dos políticas permisivas de `SELECT`, `rebuild_match_stints` sin
   comprobar que el jugador que sale esté en el campo, y el descarte de sustituciones
   repetidas viviendo solo en el retorno de la función.

### SIGUIENTE TAREA SUGERIDA

**T-102**: PWA y metadatos —`vite-plugin-pwa` con `registerType: 'prompt'` (D06-14),
manifiesto, iconos, precaché de la fuente y Lighthouse ≥ 90 en PWA—. El paquete ya está
instalado, así que la tarea empieza por la configuración.

Dos avisos para quien la coja:

- **El título, el idioma y el favicon de `index.html` son suyos.** Hoy solo se cambió el
  `lang` y la referencia al punto de entrada; el resto sigue siendo de la plantilla.
- **El nombre visible sale de una sola constante** (decisión F1 del DOC 03). El manifiesto es
  el primer sitio donde aparece «GavetaStats»: conviene que no se escriba a mano en dos
  sitios desde el primer día.

La **T-103** también está desbloqueada y no depende de la T-102. Si la T-102 se atasca con
Lighthouse, se puede adelantar la T-103 sin romper nada.

### COMANDOS PARA VERIFICAR

```powershell
cd D:\Documentos\Proyectos\ProyectoSASI\App
Remove-Item Env:\NODE_ENV          # imprescindible, ver el hallazgo de arriba
git switch main
git pull
git log --oneline -3

npm ci
npm run lint
npx prettier --check .
npm run build
```

El build tiene que terminar en verde y decir `436.08 kB` en crudo y `124.10 kB` comprimidos.
Si sale bastante más, `NODE_ENV` volvió a colarse.

Después, la comprobación que no se pudo hacer sin navegador:

```powershell
npm run dev
```

1. Abrir `http://localhost:5173`: se ve «GavetaStats» y la línea con el entorno leído de
   `.env.local`. La consola, limpia.
2. Renombrar `VITE_SUPABASE_URL` a cualquier otra cosa en `.env.local`, reiniciar el
   servidor y recargar: la consola tiene que lanzar «Configuración de entorno incompleta o
   incorrecta» nombrando la variable que falta. Devolver el nombre bueno después.

### AVISO DE SEGURIDAD

Sigue vigente: al abrir el panel del proveedor de Google en Supabase, **Chrome autorrellena
«Client IDs» y «Client Secret»** con credenciales guardadas. Vacía los dos campos antes de
tocar nada; si se pulsa «Save» con eso dentro, tu contraseña acaba escrita en la
configuración del proveedor.
