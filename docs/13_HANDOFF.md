# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 14/09/2026 — Tarea: T-104 · enrutado y división del paquete

Sesión de Cowork sobre el repositorio local, con Raúl siguiendo el avance desde el móvil.

> **La tarea está hecha, verificada y fusionada, esta vez entera.** A diferencia de la T-101 y
> la T-103, la pull request se fusionó en la misma sesión: había una conversación abierta y el
> permiso estaba dado de antemano. El «Squash and merge» sigue necesitando eso; una sesión
> programada a secas se planta en la PR con el CI en verde.

| PR      | Rama                       | Contenido                                                                                                             | CI                             |
| :------ | :------------------------- | :-------------------------------------------------------------------------------------------------------------------- | :----------------------------- |
| **#23** | `feat/platform-enrutado`   | Diez commits: envoltorio de pantalla, proveedores, guardias, layouts, tres módulos, enrutador y borrado del andamiaje | Verde · fusionada en `42471d7` |
| **#24** | `docs/docs-traspaso-t-104` | DOC 08 v1.6 y este DOC 13                                                                                             | —                              |

---

## HECHO

**El andamiaje ya no está y `main.tsx` monta la aplicación de verdad.** Era la deuda que la
T-103 dejó abierta con fecha.

| Archivo                                    | Qué lleva                                                                        |
| :----------------------------------------- | :------------------------------------------------------------------------------- |
| `src/app/router.tsx`                       | Las rutas del DOC 02 §2, con permiso por grupo y carga perezosa por ruta         |
| `src/app/App.tsx`                          | Compone `QueryProvider` → `AuthProvider` → `AnnounceProvider` → `RouterProvider` |
| `src/app/providers/QueryProvider.tsx`      | La caché del DOC 06 §5.2, con los 4xx sin reintento                              |
| `src/app/providers/AuthProvider.tsx`       | **Solo la sesión.** Perfil, equipo activo y permisos son la T-105                |
| `src/app/providers/authContext.ts`         | `useAuth` y `useHasPermission`, aparte por `react/only-export-components`        |
| `src/app/providers/AnnounceProvider.tsx`   | La **única** región `aria-live` de la aplicación, pintada siempre                |
| `src/app/providers/announceContext.ts`     | `useAnnounce`                                                                    |
| `src/app/guards/RequireAuth.tsx`           | Sin sesión, a `/login`, recordando de dónde venía                                |
| `src/app/guards/RequirePermission.tsx`     | Recibe el permiso concreto del DOC 05 §4, no un rol                              |
| `src/app/layouts/AppLayout.tsx`            | Cinco destinos: barra inferior en móvil, rail lateral desde 768 px               |
| `src/app/layouts/BareLayout.tsx`           | Sin navegación. Para `/login` y `/403`                                           |
| `src/app/layouts/FullScreenLayout.tsx`     | Para A12: pantalla entera, sin barra ni rail                                     |
| `src/shared/ui/Pantalla.tsx`               | Encabezado, foco al `h1` y título del documento en cada cambio de ruta           |
| `src/app/components/PantallaPendiente.tsx` | La pieza única de las veinte rutas cuya pantalla todavía no toca                 |
| `src/app/components/LoadingState.tsx`      | Estado visual de carga. **Sin región viva propia**                               |
| `src/app/components/RouteErrorPage.tsx`    | Respaldo del enrutador (C03 provisional). El error boundary es la T-106          |
| `src/app/components/NotFoundPage.tsx`      | La ruta comodín                                                                  |
| `src/modules/auth/`                        | A01 y C05, con su `index.ts` de contrato                                         |
| `src/modules/core/`                        | **A02, Inicio**: próximo evento, accesos rápidos y avisos pendientes             |
| `src/modules/match/`                       | A12, marcador de posición. Existe para que la medición del peso sea la de verdad |
| `src/app/scaffolding/`                     | **Borrado.** La galería de comprobación de la T-103                              |

Cada componente con su `.module.css` al lado y sin un solo valor escrito a mano: todo sale de
`tokens.css`.

**Verificado en local, los tres en verde:** `npm run lint` (0 avisos y 0 errores sobre 151
reglas en 37 archivos), `npx prettier --check .` y `npm run build` con `tsc -b` dentro. Y en
remoto, los cinco trabajos del CI de la #23, más el _deploy preview_ de Netlify.

**Verificado en el navegador**, con la aplicación levantada de verdad:

- Sin sesión, `/` redirige a `/login`. `/403` y la ruta comodín pintan lo suyo.
- Con sesión, A02 sale dentro del esqueleto, con los tres bloques y sus estados vacíos escritos.
- `aria-current="page"` solo en el destino activo, y el activo se distingue además por peso de
  texto, no solo por color.
- Objetivos táctiles de 54×52 px a 320 px de ancho, y 175×48 con 8 px de separación en el rail.
- «Saltar al contenido» es el primer elemento enfocable y se ve al recibir foco.
- Al navegar, el foco cae en el `h1` y el título del documento cambia.
- Una sola región viva en el DOM, presente y vacía antes del primer mensaje.
- Sin desplazamiento horizontal a 320 px, ni con el texto al doble.
- Consola limpia salvo los dos avisos conocidos de la fuente que falta.

**Probado con el fallo de verdad, no de palabra:** se renombró el trozo perezoso `auth-*.js` en
`dist` para que la descarga devolviera 404. Sale `RouteErrorPage` con el foco en el `h1` y el
título correcto, en vez de la pantalla en blanco de react-router.

---

## EL PRESUPUESTO DE 200 kB, RESUELTO

Es la decisión que esta tarea tenía que tomar (DOC 06 §10.3). Medido con `vite build` y sin
`NODE_ENV` en la terminal.

| Archivo                      |     Crudo |    Comprimido | Cuándo se descarga     |
| :--------------------------- | --------: | ------------: | :--------------------- |
| `index-*.js`                 | 569,57 kB | **165,08 kB** | inicial                |
| `index-*.css`                |   9,15 kB |   **2,75 kB** | inicial                |
| `core-*.js` más `core-*.css` |   2,36 kB |       1,06 kB | perezoso (A02)         |
| `auth-*.js`                  |   0,79 kB |       0,47 kB | perezoso (A01 y C05)   |
| `index.html`                 |   0,45 kB |       0,29 kB | aparte del presupuesto |

**Paquete inicial: 167,83 kB comprimidos. Quedan 32,2 kB de margen.**

**No hace falta ninguna de las tres salidas del §10.3**: ni sacar `@supabase/supabase-js` del
arranque, ni aflojar la excepción de A12, ni subir la cifra. La decisión se toma con el dato, no
con la proyección, que es justo lo que decía el documento.

**Por qué la proyección daba 195 kB y la realidad da 167,83.** La medición de la T-101 metió las
cuatro dependencias de producción en el grafo a la fuerza, con un `main.tsx` que no pintaba
nada. **A Dexie no lo importa nadie todavía** —entra con la T-206— y son unos 25 kB
comprimidos. El resto de la diferencia lo ponen el enrutador y la caché, que en uso real entran
sin la superficie completa que el `import` a pelo arrastraba.

**Lo que se va a comer ese margen, y conviene tenerlo escrito:** A12 de verdad (T-207 y T-208),
el runtime de la PWA (T-102) y Dexie (T-206). Los 32 kB no sobran, y el aviso del §10.3 sigue en
pie para la primera tarea que lo cruce.

`vite build` avisa ahora de que el trozo inicial pasa de 500 kB en crudo. **No se ha tocado
`chunkSizeWarningLimit`**: el aviso dice la verdad, A12 va estática a propósito y silenciarlo
sería tapar el único aviso automático que hay sobre el presupuesto.

---

## DECISIONES TOMADAS

**La división por ruta usa `lazy` de la ruta, no `React.lazy`.** La decisión D06-06 está escrita
con `React.lazy`, que es la forma del modo de componentes. En modo datos, que es el que fija la
D06-05, el equivalente es la propiedad `lazy` de la ruta: mismo efecto, un trozo por ruta, y sin
tener que envolver cada pantalla en un `Suspense`. Se respeta la excepción tal cual: **A12 se
importa arriba, estática, y entra en el paquete inicial**, porque tiene que abrirse con el móvil
sin cobertura y sin haber pasado antes por ella. Si prefieres que el documento diga `React.lazy`
literal, es cambiar el enrutador, pero el resultado empaquetado es el mismo.

**Las rutas con `PantallaPendiente` no van perezosas.** Son veinte rutas apuntando al mismo
componente compartido: partirlo no ahorra un solo byte y mete veinte peticiones donde había una.

**La barra inferior no lleva `position: fixed`.** Se implementó fija primero y se midió: a
320 px de ancho con el texto al 200 %, las etiquetas parten en varias líneas y la barra pasa de
85 px a 234 px de alto. Cualquier reserva de espacio calculada de antemano se queda corta y tapa
el elemento enfocado, que es justo el criterio 2.4.11 y el fallo que el DOC 02 §5.1 señalaba
como el más probable de este diseño. Se intentó medirla en caliente con `ResizeObserver` y no
hubo forma de verificarlo desde el panel de automatización. La salida es estructural: el marco
ocupa la altura de la ventana, la barra es un elemento más del flex y el contenido desplaza por
dentro. Se comporta igual —la barra nunca se va con el desplazamiento— pero no se superpone a
nada, así que no hay altura que adivinar. Medido: cero solapamiento al 100 % y al 200 %. En
escritorio, el rail es otra columna del mismo flex, por el mismo motivo.

**`permisos` vale `null` a propósito, y no un conjunto vacío.** `null` significa «todavía no se
sabe», que es distinto de «no tiene ninguno». Con un conjunto vacío, `RequirePermission`
mandaría a `/403` a todo el mundo y parecería un fallo de permisos cuando lo que pasa es que la
T-105 aún no ha llegado.

**`/admin/logs` va sin guardia de permiso.** El DOC 05 §4 define doce permisos y **ninguno de
administración**. No se inventa uno aquí. Queda anotado como deuda y lo resuelve la T-303, que
es quien construye esa pantalla.

**`Pantalla` vive en `shared/ui`, no en `app/`.** La primera versión lo puso en
`app/components/` y los cuatro archivos de `routes/` lo importaban desde ahí, que es
exactamente lo que prohíbe la regla 1 del DOC 06 §4.1: nadie importa de `app/`. Lo cazó la
revisión del diff, no el linter, que es la deuda que el propio §4.3 reconoce.

**`LoadingState` no lleva región viva propia.** La primera versión le puso una, que entraba y
salía del DOM en las dos guardias y en el `HydrateFallback`. El DOC 06 §6.3 exige una sola
región para toda la aplicación, la de `AnnounceProvider`. Tampoco llama a `useAnnounce()` por su
cuenta: anunciar cada carga es ruido, y eso lo decide cada pantalla cuando llegue su tarea.

**Los contextos viven en archivos aparte de sus proveedores.** `react/only-export-components`
avisa cuando un archivo exporta a la vez un componente y un hook. De ahí `authContext.ts` y
`announceContext.ts`.

**El nombre de la aplicación está en una sola constante.** `NOMBRE_APP` en `Pantalla.tsx`, con
el valor `GavetaStats` del DOC 03 §F1. Cuando se decida el nombre público, es una línea.

---

## LO QUE HAY QUE DECIDIR, Y NO DECIDE EL CÓDIGO

**Los cinco destinos de la barra son grupos sin pantalla de aterrizaje.** El árbol del DOC 02 §3
pone EQUIPO, DATOS y MÁS como agrupaciones, no como pantallas. Hoy cada destino apunta a la
primera pantalla de su rama —Equipo a `/equipos`, Agenda a `/calendario`, Datos a
`/estadisticas`, Más a `/ajustes`— porque es reversible y no añade pantallas al inventario. Las
dos salidas:

| Salida                                        | Qué gana                                                                  | Qué cuesta                                                                     |
| :-------------------------------------------- | :------------------------------------------------------------------------ | :----------------------------------------------------------------------------- |
| Se queda como está                            | Cero pantallas nuevas y un toque menos para llegar a lo de todos los días | «Más» abriendo Ajustes se lee raro, y las hermanas del grupo quedan escondidas |
| Pantallas índice de sección para EQUIPO y MÁS | La navegación se corresponde con el árbol documentado                     | Dos pantallas nuevas al inventario del DOC 02 y un toque más en cada rama      |

No la decide esta tarea. La T-107 trae Ajustes y es el momento natural de resolverlo.

**Los iconos de Inicio y Agenda son prestados.** El inventario de 21 iconos del DOC 07 §8.2 no
tiene ni casa ni calendario, así que se usan `clock` y `plus`. Funcionan y no rompen ningún
criterio —el texto acompaña siempre y el color nunca va solo—, pero conviene decidir a propósito
si entran dos iconos nuevos al inventario en vez de dejarlo fijado por omisión.

**Faltan tokens de anchura de maqueta.** El rail sale de `calc(var(--tap-min) * 4)` y la caja de
`BareLayout` de `calc(var(--tap-min) * 9)`. No se inventaron valores, pero apoyarse en el token
táctil para medir anchuras es un rodeo. Se paga cuando la capa visual toque el DOC 07.

---

## PENDIENTE DE LA TAREA

**Nada de la T-104.** La #23 se fusionó con _squash_, la rama local está borrada y la #24 lleva
la documentación.

**Ojo con las ramas locales:** con fusión por _squash_, `git branch -d` nunca las da por
fusionadas. La comprobación buena es `git ls-remote --heads origin <rama>`; si no devuelve nada,
se fusionó y se puede borrar con `-D`.

**Lo que quedó fuera del alcance, a propósito:** la T-102 (PWA, manifiesto, iconos y la fuente)
y el acceso con Google de la T-105.

---

## DEUDA TÉCNICA GENERADA

| Deuda                                                                                     | Estado                                                                                                        |
| :---------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------ |
| El `.woff2` de Inter sigue sin existir                                                    | **Abierta desde la T-101, la cierra la T-102.** Dos avisos por carga y uno en `vite build`                    |
| `permisos` vale `null`, así que toda ruta con `RequirePermission` se queda en «Cargando…» | **Abierta hasta la T-105.** Ver abajo, porque condiciona cómo se prueba hoy la aplicación                     |
| Veinte rutas comparten la misma `PantallaPendiente`                                       | Abierta. Cada una la sustituye su tarea                                                                       |
| `/admin/logs` sin guardia de permiso                                                      | Abierta hasta la T-303, que es quien define y usa ese permiso                                                 |
| `RouteErrorPage` es el respaldo del enrutador, no un error boundary                       | Abierta hasta la T-106                                                                                        |
| `vite build` avisa de que el trozo inicial pasa de 500 kB en crudo                        | Asumida. El aviso dice la verdad y silenciarlo tapa el único control automático del presupuesto               |
| Los cinco destinos apuntan cada uno a una pantalla suelta                                 | Abierta. Se decide en la T-107, con las dos salidas de arriba                                                 |
| Sin tokens de anchura de maqueta                                                          | Abierta. Cuando la capa visual toque el DOC 07                                                                |
| `clock` y `plus` haciendo de casa y calendario                                            | Abierta. Decidir si entran dos iconos nuevos al DOC 07 §8.2                                                   |
| Los límites entre módulos los vigila una persona, no el linter                            | Ya reconocida en el DOC 06 §13, y esta tarea la confirmó: el fallo de `Pantalla` lo cazó la revisión del diff |

**La deuda de los permisos, con detalle, porque cambia cómo se prueba la aplicación hoy.** Con
`permisos` a `null`, las rutas navegables son solo `/`, `/calendario`, `/ajustes`,
`/admin/logs`, `/login`, `/403` y la comodín. Todas las demás se quedan en el estado de carga.
Es el comportamiento correcto —sin sesión no hay permisos que consultar— y lo desbloquea la
T-105 entera, pero quien coja la T-106 o la T-107 conviene que lo sepa antes de pensar que algo
está roto.

---

## LO QUE SIGUE ABIERTO DE SESIONES ANTERIORES

Nada de esto se ha tocado hoy, y se pierde si no se arrastra:

1. **Decidir qué hacer con `public.rls_auto_enable()`**, la función de la plataforma que el
   auditor de Supabase marca como ejecutable por `anon`. Riesgo práctico bajo; la salida
   —revocarla desde una migración— mete en el repositorio una función que gestiona Supabase.
2. **Quitar el `grant execute` a `authenticated` de las siete funciones de disparador**, que no
   lo necesitan. Siete líneas en la próxima migración de endurecimiento.
3. La columna «Fase» del DOC 02 §2 sigue desfasada en A15, A16 y el Bloque B.
4. El subconjunto de Inter sin afinar (la descarga en sí es de la T-102).
5. Marcar `event.approve` a quien lleve el registro, cuando exista la T-301.
6. Los cubos de Storage `crests` y `docs`, sin crear.
7. `vitest` instalado sin bloque `test` en `vite.config.ts` ni paso de CI. Entra con la primera
   prueba, que por el DOC 06 §11 será del `model/` de `match`.
8. `index.html` mantiene `<title>scaffold</title>` y el favicon de la plantilla. Es de la T-102,
   y ahora se nota un instante antes de que `Pantalla` ponga el título bueno.
9. Los alias viven duplicados en `tsconfig.app.json` y en `vite.config.ts`, a mano.
10. El error de entorno se lanza sin interfaz: pantalla en blanco y mensaje en consola, hasta
    la T-106.
11. Deudas de base de datos abiertas: `btree_gist` en `public`, veintisiete claves ajenas sin
    índice, trece tablas con dos políticas permisivas de `SELECT`, `rebuild_match_stints` sin
    comprobar que el jugador que sale esté en el campo, y el descarte de sustituciones
    repetidas viviendo solo en el retorno de la función.

---

## SIGUIENTE TAREA SUGERIDA

**T-105**, acceso con Google, o **T-102**, PWA y metadatos. Las dos están desbloqueadas y
ninguna depende de la otra.

Si se puede elegir, **la T-105 primero**. Tres motivos:

- Es la que desatasca las veinte rutas que hoy se quedan en «Cargando…». Hasta que exista, cada
  tarea de pantalla se prueba a ciegas o con la sesión simulada a mano.
- La T-105b, la prueba de aislamiento entre clubes, cuelga de ella, y es media sesión que sale
  barata con la base vacía y cara en noviembre.
- De ella salen la T-201 y todo el bloque de meter datos, que es la mitad del plan.

Tres avisos para quien coja la T-105:

- **`AuthProvider` ya existe y solo hay que rellenarlo.** El contrato está puesto: `session`,
  `cargando` y `permisos`. Lo que falta es el perfil, los equipos, el equipo activo y el
  conjunto de permisos de verdad. `permisos` tiene que pasar de `null` a un `Set` **solo cuando
  se haya resuelto la consulta**, o `RequirePermission` mandará a `/403` a quien sí tiene
  permiso.
- **El equipo activo se recuerda en `localStorage`** (DOC 06 §5.5), y un usuario puede tener
  función en varios equipos (decisión H3).
- **`RequirePermission` ya está cableado en el enrutador** con el permiso de cada ruta. No hay
  que tocar `router.tsx`: en cuanto `permisos` traiga datos, las rutas se abren solas.

Y para la T-102: el archivo de la fuente apaga tres avisos de golpe, `public/icons.svg` ya no
está —los iconos de la PWA salen de `src/assets/logo.svg`— y el `<title>scaffold</title>` de
`index.html` sigue ahí.

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

El build tiene que terminar en verde y decir `569.57 kB` en crudo y `165.08 kB` comprimidos de
JavaScript, más `9.15 kB` y `2.75 kB` de CSS, con dos trozos perezosos pequeños. Si sale bastante
más, `NODE_ENV` volvió a colarse.

Después, la aplicación:

```powershell
npm run dev
```

1. Abrir `http://localhost:5173`: sin sesión, redirige a `/login`.
2. Probar `/403` y una ruta inventada: cada una pinta lo suyo, con el foco en el `h1`.
3. Recorrer con el tabulador desde el principio: «Saltar al contenido» es el primer enfocable y
   se ve al recibir foco; el anillo de foco se ve en todos los controles.
4. Estrechar a 320 px y poner el texto al 200 %: sin desplazamiento horizontal, y la barra no
   tapa nunca el elemento enfocado.
5. La consola, limpia salvo los dos avisos de la fuente que falta. Cualquier otra cosa es nueva
   y hay que mirarla.

Para ver el esqueleto por dentro hace falta sesión, y la sesión es la T-105. Hasta entonces, o
se simula a mano en `localStorage` o se prueba solo lo de arriba.

---

## AVISO DE SEGURIDAD

Sigue vigente: al abrir el panel del proveedor de Google en Supabase, **Chrome autorrellena
«Client IDs» y «Client Secret»** con credenciales guardadas. Vacía los dos campos antes de tocar
nada; si se pulsa «Save» con eso dentro, tu contraseña acaba escrita en la configuración del
proveedor. **Esto afecta de lleno a la T-105**, que es justo la tarea que abre ese panel.
