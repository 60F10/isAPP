# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 13/09/2026 — Tarea: T-103 · sistema de diseño

Sesión autónoma, de noche, con Raúl durmiendo.

> **La tarea está hecha, verificada y fusionada.** La sesión automática la dejó lista pero sin
> fusionar: **no tiene permiso para fusionar sin revisión humana**, y es la segunda vez que
> pasa, después de la T-101. Las dos pull requests se cerraron a la mañana siguiente desde la
> conversación que lanzó la tarea, con el _Knowledge_ resincronizado después.
>
> **Con una sesión autónoma hay que contar con esto:** llega hasta la pull request con el CI
> en verde y ahí se planta. El «Squash and merge» lo da una persona, o una conversación
> abierta con alguien delante.

| PR      | Rama                           | Contenido                                                                                    | CI                             |
| :------ | :----------------------------- | :------------------------------------------------------------------------------------------- | :----------------------------- |
| **#21** | `feat/platform-sistema-diseno` | Seis commits: el sprite de la plantilla, `jsx-a11y`, tokens, iconos, componentes y andamiaje | Verde · fusionada en `0edd66e` |
| **#22** | `docs/docs-traspaso-t-103`     | DOC 07 v1.1, DOC 08 v1.5, este DOC 13 y `CLAUDE.md`                                          | Verde · fusionada tras la #21  |

Las dos nacieron de `957bb1d` y no tocan los mismos archivos. Se fusionaron en ese orden, con
squash; la #22 se rebasó sobre el `main` nuevo para corregir este documento, que se había
escrito dando las dos por abiertas.

### HECHO

**`tokens.css` ya no está suelto.** Lo importa `src/app/main.tsx`, y con él una hoja global
nueva. Era la deuda que la T-101 dejó abierta.

| Archivo                                 | Qué lleva                                                                   |
| :-------------------------------------- | :-------------------------------------------------------------------------- |
| `src/styles/base.css`                   | Hoja global: caja, tipografía, foco visible de serie, movimiento reducido   |
| `src/styles/tokens.css`                 | Tokens nuevos de icono, pulsado, deshabilitado y duración de confirmación   |
| `src/shared/ui/icons/registry.ts`       | Los 21 SVG importados con `?raw`, y el tipo `IconName`                      |
| `src/shared/ui/Icon.tsx`                | El único componente de icono. Tres tamaños, siempre `aria-hidden`           |
| `src/shared/ui/Button.tsx`              | `primary`, `secondary`, `ghost`. 48×48 mínimo, `type="button"` por defecto  |
| `src/shared/ui/Field.tsx`               | Etiqueta atada, ayuda, error con icono, `aria-invalid` y `aria-describedby` |
| `src/shared/ui/Card.tsx`                | Borde siempre presente: en alto contraste la sombra desaparece              |
| `src/shared/ui/StatusChip.tsx`          | Los tres estados del DOC 07 §2.2, con icono y palabra                       |
| `src/shared/ui/Toast.tsx`               | Región viva pintada siempre, mensaje de 2 s leído del token                 |
| `src/app/scaffolding/DesignGallery.tsx` | **ANDAMIAJE.** Galería de comprobación. La T-104 la borra                   |
| `src/app/main.tsx`                      | Importa las dos hojas, las primeras de todo, y monta la galería             |
| `.oxlintrc.json`                        | Plugin `jsx-a11y` activado (decisión D06-19, que estaba sin aplicar)        |
| `public/icons.svg`                      | **Borrado.** Sprite de la plantilla original, sin una sola referencia       |
| `src/shared/ui/icons/LEEME.md`          | Corregido: ya no dice que los iconos entren por SVGR                        |

**Verificado en local, los tres en verde:** `npm run lint` (0 avisos, 0 errores sobre 151
reglas), `npx prettier --check .` y `npm run build` con `tsc -b` dentro. Y en remoto, los dos
trabajos del CI de la #21.

**Verificado en el navegador**, con `npm run dev` levantado y la página abierta de verdad:

- Sin desplazamiento horizontal a 320 px de ancho, ni con el tamaño base del texto al doble.
- Los catorce botones miden 48 px de alto; el que va solo con icono, 48 × 48.
- Los cuatro campos, 48 px de alto y 16 px de texto, con la etiqueta atada por `htmlFor`.
- Los treinta iconos de la página salen con `currentColor`, `viewBox="0 0 24 24"` y
  `aria-hidden="true"`.
- Una sola región `aria-live="polite"`, presente y vacía antes del primer mensaje. La
  confirmación entra al pulsar y se va sola entre 1,6 s y 2,3 s.
- Anillo de foco de 3 px sólido en `--indigo-600` con 2 px de separación, contraste 7.62.
- En alto contraste: texto y bordes a negro, sombra a `none`, fondos suaves a blanco, foco a
  4 px y color de equipo a negro. Todo lo que promete el DOC 07 §4.

### DECISIONES TOMADAS

**Los SVG entran con `?raw`, no con SVGR.** El LEEME de los iconos daba SVGR por hecho y SVGR
no está instalado ni figura en la lista cerrada del DOC 06 §2.3. La regla D06-01 obliga a
justificar cada paquete nuevo por el problema que resuelve, y este no resuelve ninguno: lo que
aporta `vite-plugin-svgr` es un envoltorio que aquí cuesta seis líneas de CSS. Con `?raw` el
`.svg` sigue siendo la única fuente de verdad —viewBox, trazo, `currentColor` y `aria-hidden`
viven dentro del archivo— y sustituir un icono es cambiar un archivo, que es justo lo que
promete el contrato del §8.1.

Se descartaron dos salidas más: el **sprite con `<use>` externo**, que mete una petición de red
en la pantalla que tiene que abrir sin cobertura y un archivo generado que hay que mantener a
la par de los veintiún originales; y **escribir los iconos a mano en TSX**, que deja dos
fuentes de verdad para el mismo dibujo. El razonamiento entero y su coste están en el DOC 07
§8.4, que es nuevo.

**`public/icons.svg` fuera.** Cinco kilobytes de la plantilla de la que nació el repositorio,
con seis símbolos ajenos al proyecto —bluesky, discord, github, x, social y documentation— y
ninguno del inventario del DOC 07 §8.2. `git grep icons.svg` fuera del propio archivo no
devolvía una sola línea. El favicon de la plantilla sigue donde estaba: los metadatos de
`index.html` son de la T-102.

**Cinco componentes base, no siete.** `EventButton` y `ReliabilityMeter` se quedan fuera y se
van a la T-208 y al bloque de cobertura. No es recorte por tiempo: el `EventButton` tiene que
llevar dentro la definición del DOC 04 §7.6 y el estado presionado del flujo encadenado, y el
`ReliabilityMeter` necesita el cálculo de fiabilidad. Escribirlos hoy, a ciegas, es garantizar
que hay que reescribirlos cuando llegue su pantalla.

**La galería del andamiaje se queda commiteada.** Sin ella, `main.tsx` no importaría ni un
componente del sistema de diseño y `tokens.css` seguiría, en la práctica, sin engancharse a
nada. Está marcada como andamiaje en el encabezado del archivo, en la propia pantalla y aquí.
**La T-104 borra `src/app/scaffolding/` entera** y `main.tsx` pasa a montar `App`.

**`jsx-a11y` activado en `oxlint`.** La decisión D06-19 estaba escrita en el DOC 06 §10.2 y sin
llevar al archivo. Llega ahora, con los primeros componentes de interfaz del proyecto, porque
activarlo después habría sido revisar código ya escrito en vez de vigilarlo mientras se
escribe. La cobertura del plugin es parcial: sigue siendo un filtro, no una garantía.

**Sin barril en `shared/ui`.** Se importa `@shared/ui/Button`, no `@shared/ui`. Un barril mete
los seis componentes en el grafo por pedir uno, y el presupuesto no está para eso.

**Dos reglas de accesibilidad cerradas en el tipo, no en la revisión.** Un `Button` sin texto
visible no compila sin `aria-label`, y un `Field` no se puede montar sin `label`.

**Tokens nuevos, y por qué cada uno.** La regla del DOC 07 §10 prohíbe escribir un valor en el
componente, así que todo estado que necesitaba color o tiempo necesitaba token: `--icon-sm`,
`--icon-md` y `--icon-lg` (en `rem`, para que acompañen al zoom del texto al 200 %);
`--duration-toast`, **fuera del bloque de movimiento reducido a propósito**, porque es tiempo
de lectura y no meneo; `--color-accent-active` y `--color-surface-pressed`, sin los cuales en
el móvil no hay forma de saber si el dedo cayó dentro del botón; y los tres de deshabilitado,
con la tinta en 6.59 sobre su propio fondo aunque el criterio 1.4.3 exima a los controles
inactivos.

### PESO DEL PAQUETE

Medido con `vite build` y sin `NODE_ENV` en la terminal.

| Qué se mide                   | Crudo     | Comprimido    |
| :---------------------------- | :-------- | :------------ |
| T-101, solo JavaScript        | 436,08 kB | 124,10 kB     |
| **Sin andamiaje: JavaScript** | 435,99 kB | **123,99 kB** |
| **Sin andamiaje: CSS**        | 4,93 kB   | **1,72 kB**   |
| Con el andamiaje: JavaScript  | 450,45 kB | 127,83 kB     |
| Con el andamiaje: CSS         | 11,69 kB  | 3,08 kB       |

Las dos filas en negrita son el dato bueno: **125,71 kB comprimidos** es el punto de partida
real de la T-104, con los tokens y la hoja global dentro y los componentes fuera del grafo por
no usarlos todavía ninguna pantalla. El sistema de diseño entero, iconos incluidos, cuesta
**unos 5 kB comprimidos** cuando se usa de verdad.

**Lo que eso significa para el presupuesto del DOC 06 §10.3.** La proyección de la T-101 dejaba
las cuatro dependencias de producción en 190,27 kB comprimidos en cuanto la T-104 monte el
enrutador. Con el sistema de diseño encima, la T-104 arranca en torno a **195 kB**, el 97 % de
los 200 kB. La decisión del §10.3 sigue siendo suya y ahora tiene menos margen que ayer.

### PENDIENTE DE LA TAREA

**Nada de la T-103.** Las dos fusiones, el borrado de las ramas locales y la resincronización
del _Knowledge_ con el DOC 07, el DOC 08 y este DOC 13 se remataron a la mañana siguiente. El
DOC 15 no sube, a propósito.

**Ojo con las ramas locales:** con fusión por _squash_, `git branch -d` nunca las da por
fusionadas. La comprobación buena es `git ls-remote --heads origin <rama>`; si no devuelve
nada, se fusionó y se puede borrar con `-D`.

**Lo que quedó fuera del alcance, a propósito:** la T-102 (PWA, manifiesto, iconos y la fuente)
y el enrutado de la T-104, tal como fijaba el encargo de la sesión.

### DEUDA TÉCNICA GENERADA

| Deuda                                                               | Estado                                                                                                                                                |
| :------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **El `.woff2` de Inter no existe y se nota**                        | **Abierta, la cierra la T-102.** Ver abajo                                                                                                            |
| La galería del andamiaje vive commiteada en `src/app/scaffolding/`  | Abierta hasta la T-104, que la borra                                                                                                                  |
| `Icon` usa `dangerouslySetInnerHTML`                                | Asumida. El contenido son archivos del repositorio, no entrada de usuario. Si algún día un icono llegara de fuera, hay que replantearlo (DOC 07 §8.4) |
| `Field` solo cubre `input`                                          | Abierta. `textarea` y `select` cuando una pantalla los pida                                                                                           |
| `Toast` lee `--duration-toast` del documento con `getComputedStyle` | Asumida. Es el rodeo que mantiene el tiempo en `tokens.css` y no en dos sitios. Lleva un valor de respaldo de 2000 ms por si no se pudiera leer       |
| El componente que conmuta el alto contraste vive en el andamiaje    | Abierta hasta la T-107, que trae Ajustes. La preferencia tiene que aplicarse antes del primer pintado, y eso el andamiaje no lo hace                  |
| El presupuesto de 200 kB se queda en unos 5 kB de margen            | Abierta. Se decide en la **T-104**, con las tres salidas del DOC 06 §10.3                                                                             |

**La deuda de la fuente, con detalle, porque es la única visible.** `tokens.css` declara Inter
autoalojada desde la T-101 y apunta a `public/fonts/InterVariable-latin.woff2`, que todavía no
está. Consecuencias medidas, no supuestas:

- La familia de reserva funciona. La página se pinta con `system-ui` y no se rompe nada.
- `vite build` avisa de que la URL no resuelve en tiempo de construcción.
- El navegador deja **dos avisos por carga**: el servidor devuelve `index.html` para esa ruta
  —lo hace el servidor de desarrollo y lo hará la redirección de SPA de Netlify— y el navegador
  no puede decodificar HTML como fuente. En el _deploy preview_ de la #21 pasa lo mismo.

O sea que la condición 2 del DOC 00 §6, «no lanza errores ni avisos en la consola», se cumple
salvo por esos dos avisos, que no los pone el sistema de diseño. **Se apagan los tres en cuanto
la T-102 deje el archivo en `public/fonts/`.** Se dejó así a propósito: comentar el `@font-face`
habría dejado la consola limpia a cambio de esconder un aviso que se anuncia solo, y de fiarlo
todo a que alguien se acuerde de descomentarlo.

### LO QUE SIGUE ABIERTO DE SESIONES ANTERIORES

Nada de esto se ha tocado hoy, y se pierde si no se arrastra:

1. **Decidir qué hacer con `public.rls_auto_enable()`**, la función de la plataforma que el
   auditor de Supabase marca como ejecutable por `anon`. Riesgo práctico bajo; la salida
   —revocarla desde una migración— mete en el repositorio una función que gestiona Supabase.
2. **Quitar el `grant execute` a `authenticated` de las siete funciones de disparador**, que no
   lo necesitan. Siete líneas en la próxima migración de endurecimiento.
3. La columna «Fase» del DOC 02 §2 sigue desfasada en A15, A16 y el Bloque B.
4. El subconjunto de Inter sin afinar (la descarga en sí ya es de la T-102, arriba).
5. Marcar `event.approve` a quien lleve el registro, cuando exista la T-301.
6. Los cubos de Storage `crests` y `docs`, sin crear.
7. `vitest` instalado sin bloque `test` en `vite.config.ts` ni paso de CI. Entra con la primera
   prueba, que por el DOC 06 §11 será del `model/` de `match`.
8. `index.html` mantiene `<title>scaffold</title>` y el favicon de la plantilla. Es de la T-102.
9. Los alias viven duplicados en `tsconfig.app.json` y en `vite.config.ts`, a mano.
10. El error de entorno se lanza sin interfaz: pantalla en blanco y mensaje en consola, hasta
    la T-106.
11. Deudas de base de datos abiertas: `btree_gist` en `public`, veintisiete claves ajenas sin
    índice, trece tablas con dos políticas permisivas de `SELECT`, `rebuild_match_stints` sin
    comprobar que el jugador que sale esté en el campo, y el descarte de sustituciones
    repetidas viviendo solo en el retorno de la función.

### SIGUIENTE TAREA SUGERIDA

**T-104**, enrutado y división del paquete, o **T-102**, PWA y metadatos. Ninguna depende de la
otra y las dos están desbloqueadas.

Si se puede elegir, **la T-104 primero**. Es la que tiene que decidir qué hacer con el
presupuesto de 200 kB, y ese número solo empeora según entran pantallas: cuanto antes se tome
la decisión, más barata sale. Además es la que borra el andamiaje de la T-103, y cuanto menos
tiempo viva la galería, menos posibilidades hay de que alguien empiece a construir encima.

Tres avisos para quien coja la T-104:

- **Borra `src/app/scaffolding/` entera** y deja `main.tsx` montando `App`.
- El interruptor de alto contraste del andamiaje se va con ella. Quien lo necesite de verdad es
  la T-107, y ahí tiene que aplicarse **antes del primer pintado**, no en un `useState`.
- Los componentes se importan uno a uno, `@shared/ui/Button`. No montes un barril.

Y para la T-102: el archivo de la fuente apaga tres avisos de golpe, y `public/icons.svg` ya no
está, así que los iconos de la PWA salen de `src/assets/logo.svg`.

### COMANDOS PARA VERIFICAR

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

El build tiene que terminar en verde. Con el andamiaje dentro dice `450.45 kB` en crudo y
`127.83 kB` comprimidos de JavaScript, más `11.69 kB` y `3.08 kB` de CSS. Si sale bastante más,
`NODE_ENV` volvió a colarse.

Después, la galería:

```powershell
npm run dev
```

1. Abrir `http://localhost:5173`: salen los veintiún iconos con su nombre y los cinco
   componentes en todos sus estados.
2. Pulsar «Probar el alto contraste»: los fondos suaves se van a blanco, la sombra de las
   tarjetas pasa a borde negro y el anillo de foco engorda.
3. Pulsar cualquiera de las tres confirmaciones: el mensaje aparece abajo y se va solo a los
   dos segundos.
4. Recorrer la pantalla con el tabulador de principio a fin: anillo de foco visible en todos
   los controles, y los tres botones deshabilitados fuera del recorrido.
5. La consola, limpia salvo los dos avisos de la fuente que faltan. Cualquier otra cosa es
   nueva y hay que mirarla.

### AVISO DE SEGURIDAD

Sigue vigente: al abrir el panel del proveedor de Google en Supabase, **Chrome autorrellena
«Client IDs» y «Client Secret»** con credenciales guardadas. Vacía los dos campos antes de
tocar nada; si se pulsa «Save» con eso dentro, tu contraseña acaba escrita en la configuración
del proveedor.
