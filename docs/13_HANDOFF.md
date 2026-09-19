# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 19/09/2026 — El arnés de pruebas, montado y corriendo en el CI

Sesión de Cowork sobre el repositorio local, sin nadie delante. Ciclo completo: desarrollo,
commits, push, pull request y fusión con squash.

> **Esto no es una tarea del DOC 08.** Es el **punto 8** de «lo que sigue abierto» del traspaso
> anterior: `vitest` instalado desde la T-101 sin bloque `test` en `vite.config.ts` ni paso de
> CI. Deuda arrastrada, no tarea, y así queda anotada: el DOC 08 no se toca.

| PR      | Rama                         | Contenido                                                          | CI                                                         |
| :------ | :--------------------------- | :----------------------------------------------------------------- | :--------------------------------------------------------- |
| **#31** | `test/repo-arnes-de-pruebas` | Tres commits: configuración, la prueba de `env.ts` y el paso de CI | Verde · el paso «Pruebas» ejecutado · fusionada con squash |
| **#32** | `docs/docs-arnes-de-pruebas` | DOC 06 v1.5 (§2.2, §3.1 y §11) y este DOC 13                       | Verde · Netlify compiló igual, ver abajo                   |

---

## HECHO

**Cuatro piezas, ni una más.** Ninguna dependencia nueva: las siete que hacen falta entraron con
la T-101 y la regla D06-01 no tenía nada que justificar aquí.

| Pieza         | Archivo                      | Qué lleva                                                                                                   |
| :------------ | :--------------------------- | :---------------------------------------------------------------------------------------------------------- |
| Configuración | `vite.config.ts`             | Bloque `test`: `jsdom`, `setupFiles`, `include`, `restoreMocks`, `unstubEnvs` y cobertura `v8` sin umbrales |
| Preparación   | `src/test/setup.ts`          | Comparadores de `@testing-library/jest-dom` y `cleanup()` de Testing Library                                |
| Guion         | `package.json`               | `"test": "vitest"`                                                                                          |
| CI            | `.github/workflows/ci.yml`   | Paso «Pruebas» con `npm run test -- --run`, entre «Formato» y «Build»                                       |
| La prueba     | `src/shared/lib/env.test.ts` | Diecisiete casos sobre la validación de entorno                                                             |

**El paso nuevo se ejecutó en el CI de la #31 y salió en verde**, que era la comprobación que de
verdad importaba. El trabajo «Lint y build» tardó 31 s en total y el paso «Pruebas» 2 s, con
`src/shared/lib/env.test.ts (17 tests)` · `Test Files 1 passed (1)` · `Tests 17 passed (17)` en
el registro. Una suite vacía también habría salido en verde, así que se miró el número.

---

## NETLIFY: EL `IGNORE` NO CANCELA, Y ESO NO ES LO QUE SE ESPERABA

Había que confirmar que el comando `ignore` de `netlify.toml` puesto el 19/09 cancela la
compilación de una rama que solo toca `docs/` (DOC 10 §2.1). **La confirmación ha salido al
revés: no la cancela.** El registro de despliegue de la #32 lo cuenta entero:

- `Custom ignore command detected. Proceeding with the specified command: ...` — el comando se
  ejecuta, o sea que está bien escrito en `netlify.toml` y Netlify lo ve.
- Un segundo después: `Installing dependencies`, `$ npm run build`, `tsc -b && vite build`,
  `precache 17 entries (641.88 KiB)`. **Compilación completa. 21 segundos de minutos gastados**
  para una rama cuyo único cambio es `docs/06_Arquitectura_Frontend.md`.

**Por qué.** El comando es
`test -n "$CACHED_COMMIT_REF" && git diff --quiet "$CACHED_COMMIT_REF" "$COMMIT_REF" -- . ':(exclude)docs' …`.
`CACHED_COMMIT_REF` **no** es «el commit anterior de esta rama»: es el commit del despliegue cuya
caché se restaura. Aquí la caché era la del **12 de septiembre** —el registro lo dice:
`Starting to download cache of 44.4MB (Last modified: 2026-09-12 13:32:53 +0000 UTC)`—, así que
el `git diff` comparó contra un commit de hace una semana y arrastró todo lo fusionado desde
entonces: `src/`, `vite.config.ts`, `package.json`. Diferencias hay, luego compila.

En la vista previa de una rama nueva esto va a pasar **siempre**, porque la caché nunca es la del
padre inmediato. En `main` el comando puede funcionar, porque allí la caché suele ser la de la
compilación anterior de producción, pero eso **no está comprobado** y no conviene darlo por
bueno. Se deja anotado y sin tocar: arreglarlo era salirse del alcance de esta sesión.

**Y hay algo más gordo, que no lo provoca esta sesión.** El panel de Netlify abre con este aviso:
«60F10 is now running on operational credits. Your published sites are still live, but production
deploys and Agent Runners are paused.» **Los despliegues de producción están parados.** El sitio
publicado sigue en pie y las vistas previas de las pull requests siguen compilando, pero fusionar
a `main` ahora mismo no publica nada. Conviene mirarlo antes de meter la T-105.

---

## QUÉ PRUEBA LA PRUEBA

`env.ts` valida las tres variables de entorno al arrancar y lanza desde el cuerpo del módulo
(D06-21). Los diecisiete casos, por grupos:

| Grupo                   | Casos | Qué comprueban                                                                              |
| :---------------------- | ----: | :------------------------------------------------------------------------------------------ |
| Entorno correcto        |     3 | Devuelve las tres variables, admite `production`, recorta los espacios de alrededor         |
| Falta una variable      |     8 | Las tres faltando, las tres con solo espacios, el mensaje de ayuda y varios fallos a la vez |
| Una variable no vale    |     3 | URL sin `https`, algo que ni siquiera es una URL, entorno fuera de la lista                 |
| La clave anónima, fuera |     3 | Que **nunca** aparezca en el mensaje de error, falle lo que falle                           |

Los tres últimos son los que más valen a medio plazo. `env.ts` omite la clave a propósito, y es
lo primero que rompe una refactorización que busque «mensajes de error más útiles».

---

## LA PRUEBA DE QUE LAS PRUEBAS FALLAN CUANDO DEBEN

Una suite que nunca ha estado en rojo no demuestra nada, así que se rompió `env.ts` a propósito:
`esUrlHttps` pasó de `new URL(valor).protocol === 'https:'` a
`new URL(valor).protocol.endsWith(':')`, o sea aceptando cualquier protocolo.

| Momento               | Resultado                                                                                                                         |
| :-------------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| Antes de romper       | `17 passed (17)`                                                                                                                  |
| Con `env.ts` roto     | **`2 failed`, `15 passed`**: «rechaza una URL de Supabase que no es https» y «no mete la clave anónima cuando la URL no es https» |
| Después de deshacerlo | `17 passed (17)`, y `git diff -- src/shared/lib/env.ts` vacío                                                                     |

Los dos fallos son exactamente los casos que miran el `https`, y los otros quince siguieron en
verde: la prueba mide lo que dice medir y no se dispara por cualquier cosa. El caso «ni siquiera
es una URL» aguantó en verde, que es lo correcto —ahí quien rechaza es el constructor `URL`, no
la comprobación del protocolo—.

**`env.ts` volvió a su estado exacto antes del primer commit.** El diff contra `main` de ese
archivo está vacío y ninguno de los tres commits de la #31 lo toca.

---

## DECISIONES TOMADAS

**Se prueba `env.ts` y no el `model/` de `match`, y esto es D06-20b.** El DOC 06 §11 daba por
hecho que la primera prueba sería del `model/`. Ese módulo llega con la T-207 y no existe, así
que la salida honesta era montar el arnés con la mejor pieza disponible hoy. `env.ts` encaja con
la regla del §11, «si un fallo ahí pierde un dato»: lógica pura, sin React ni red, y su trabajo
es romper pronto y con un mensaje claro cuando un despliegue está mal configurado. Es justo el
tipo de fallo que no se ve hasta producción. **La tabla de alcance del §11 no cambia: el `model/`
se prueba siempre, y quien coja la T-207 lo prueba.**

**El identificador D06-20b es nuevo y se puede discutir.** Se eligió el sufijo `b` en vez de un
D06-22 porque es una matización de la D06-20, no una decisión aparte, y porque D06-22 habría roto
el orden por secciones de los identificadores. Si prefieres otra cosa, se renumera en un commit.

**`env.ts` NO se refactorizó, y era la tentación evidente.** Lanza desde el cuerpo del módulo por
la D06-21: el fallo tiene que ocurrir al arrancar. Sacar la validación a una función exportada
habría hecho la prueba trivial y habría matado la decisión. La prueba se adapta con
`vi.resetModules()`, `vi.stubEnv()` y un `await import()` por caso. Funciona a la primera y queda
de plantilla para cualquier otro módulo que valide al importarse.

**Las tres variables se fijan en todos los casos, también las que el caso no toca.** Si no, un
`.env.local` con valores reales en la máquina de quien ejecute cambia el resultado y la prueba
pasa en local por un motivo distinto al del CI. Es la clase de fallo que se descubre tarde y mal.

**El bloque `test` vive en `vite.config.ts`, no en un `vitest.config.ts` aparte.** Así los alias
de `resolve` son los mismos que usa la aplicación. Un archivo separado obligaría a mantener el
mapa de alias por tercera vez —ya son dos, con `tsconfig.app.json`— y ese duplicado ya está
anotado como deuda desde la T-101.

**`defineConfig` se importa de `vitest/config`, no de `vite`.** Es la que tipa la clave `test`.
Reexporta la de Vite, y el build lo confirma: mismas cifras que la T-102 al milímetro.

**Sin `globals: true`.** Cada prueba importa de `vitest` lo que usa, así que no hay que ampliar
los `types` de `tsconfig.app.json` y `tsc -b` comprueba las pruebas tal cual, que es gratis y
vale. El precio es que Testing Library no puede engancharse sola a un `afterEach` global; la
limpieza del DOM se registra a mano en `src/test/setup.ts`.

**La cobertura se configura sin umbrales.** El §11 dice que se mide, se mira y no se convierte en
objetivo. Un umbral solo consigue romper la construcción por una cifra que nadie ha acordado, y
el camino corto para arreglarlo son pruebas que tocan líneas sin comprobar nada.

**`src/test/` es una carpeta nueva de primer nivel dentro de `src/`.** No estaba en el árbol del
DOC 06 §3.1 y se añade en la #32. La alternativa era un `vitest.setup.ts` en la raíz, que se
queda fuera de `tsconfig.app.json` y por tanto sin comprobación de tipos.

---

## DEUDA TÉCNICA GENERADA

| Deuda                                                                                    | Estado                                                                 |
| :--------------------------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| **`env.ts` es la única pieza probada.** El `model/` de `match` sigue sin una sola prueba | Abierta. La paga la T-207, y no es opcional: el §11 lo pone el primero |
| **La limpieza de Testing Library está registrada pero sin ejercitar**                    | Abierta. La primera prueba de componente confirma que funciona         |
| **`vite.config.ts` importa de `vitest/config`**: quitar `vitest` rompería `vite build`   | Asumida. Es una devDependencia del proyecto, no va a irse              |
| El informe HTML de cobertura se genera con `--coverage` y nadie lo mira                  | Asumida, y a propósito: el §11 dice que no se persiga la cifra         |

Lo demás no genera deuda: no se tocó ni una línea de código de la aplicación.

---

## LO QUE SIGUE ABIERTO DE SESIONES ANTERIORES

Nada de esto se ha tocado hoy, y se pierde si no se arrastra. **Un punto de la lista anterior ya
no está:** el 8, `vitest` sin configurar ni paso de CI, lo cierra esta sesión. **Y dos nacen
hoy**, los 16 y 17, los dos de Netlify.

Pendiente de decidir, que no lo decide el código:

1. **Los cinco destinos de la barra apuntan a pantallas sueltas.** EQUIPO, DATOS y MÁS son grupos
   sin pantalla de aterrizaje en el DOC 02 §3, y «Más» abriendo Ajustes se lee raro. O pantallas
   índice de sección —dos pantallas nuevas al inventario— o se acepta el atajo. Se decide en la
   T-107.
2. **`clock` y `plus` haciendo de casa y calendario.** El inventario de 21 iconos del DOC 07 §8.2
   no tiene ninguno de los dos. Decidir si entran dos iconos nuevos.

Pendiente de hacer:

3. **El aviso de versión nueva sale también en mitad de un partido**, y eso contradice la decisión
   D06-14: mientras haya partido en curso, el aviso se guarda y no se muestra. El estado de
   partido no existe todavía —es la T-207— y no se inventó. El punto de enganche está comentado en
   `ActualizacionDisponible.tsx` y es una línea:
   `if (!hayVersionNueva || partidoEnCurso) return null;`. **Quien coja la T-207 tiene que
   cerrarla.** Viene de la T-102.
4. **`set_updated_at()` arrastra el `EXECUTE` de `authenticated` que no necesita.** Una línea en la
   próxima migración de permisos. Explicación en el DOC 05 §14.3.
5. **`npm run db:types` deja el archivo de tipos a cero bytes si el CLI falla.** El `>` del script
   crea el archivo antes de que el comando escriba nada. Se restaura con
   `git checkout -- src/types/database.types.ts`. La salida buena es escribir a un temporal y
   mover solo si el comando termina bien. **Antes de tocar ese script, haz copia.**
6. Marcar `event.approve` a quien lleve el registro, cuando exista la T-301.
7. Los cubos de Storage `crests` y `docs`, sin crear.
8. Los alias viven duplicados en `tsconfig.app.json` y en `vite.config.ts`, a mano.
9. El error de entorno se lanza sin interfaz: pantalla en blanco y mensaje en consola, hasta la
   T-106. **Ahora hay diecisiete pruebas que fijan el texto de ese mensaje**, así que la T-106 ya
   sabe exactamente qué tiene que pintar.
10. `/admin/logs` sigue sin guardia de permiso: el DOC 05 §4 no define ninguno de administración.
    Lo resuelve la T-303.
11. `permisos` vale `null`, así que toda ruta con `RequirePermission` se queda en «Cargando…». Lo
    desbloquea la T-105, y es lo que la convierte en la siguiente tarea.
12. Faltan tokens de anchura de maqueta en el DOC 07: el rail y la caja de `BareLayout` salen de
    `--tap-min`.
13. Veinte rutas comparten la misma `PantallaPendiente`. Cada una la sustituye su tarea.
14. Deudas de base de datos abiertas: `btree_gist` en `public`, veintisiete claves ajenas sin
    índice, trece tablas con dos políticas permisivas de `SELECT`, `rebuild_match_stints` sin
    comprobar que el jugador que sale esté en el campo, y el descarte de sustituciones repetidas
    viviendo solo en el retorno de la función.
15. Si Supabase recrea `rls_auto_enable()` con `DROP` + `CREATE`, el permiso de PUBLIC vuelve.
    Mirar el auditor tras cada actualización de la plataforma.
16. **El `ignore` de `netlify.toml` no cancela la compilación de una vista previa aunque la rama
    solo toque `docs/`.** Nace hoy, comprobado con la #32 y explicado arriba: `CACHED_COMMIT_REF`
    apunta al commit de la caché restaurada —del 12/09 en ese despliegue—, no al padre inmediato.
    Salidas: comparar contra `$COMMIT_REF^` o contra la base de la rama en vez de contra la
    caché, o mover la decisión al CI de GitHub, que sí sabe qué archivos cambia la PR. **No se
    tocó**: el alcance de esta sesión era el arnés de pruebas.
17. **Netlify está en créditos operativos y los despliegues de producción están parados.** Nace
    hoy. El sitio publicado sigue en pie y las vistas previas compilan, pero fusionar a `main` no
    publica. Mirarlo antes de la T-105.

Asumidas y sin fecha, que no son tareas pero conviene no olvidar: `vite build` avisa de que el
trozo inicial pasa de 500 kB en crudo —el aviso dice la verdad y es el único control automático
que hay—, y el marco de la ventana vive en `App` como una pieza más entre el enrutador y las
maquetas, que es lo que permite que ninguna banda tape el elemento enfocado.

---

## SIGUIENTE TAREA SUGERIDA

**T-105**, acceso con Google. Sigue siendo la única que desatasca las veinte rutas que hoy se
quedan en «Cargando…». Sin ella, la T-106 y la T-107 se prueban a ciegas y toda la Fase 2 sigue
parada.

**Y el aviso de método, otra vez, porque es lo que más se pierde entre traspasos: la T-105 no se
puede dejar corriendo sola.** Una sesión automática escribe el código, monta el proveedor y
comprueba que la redirección a Google sale bien, pero el clic en la pantalla de cuenta y la
aceptación de permisos los da una persona. **No la programes de madrugada:** llega hasta la
redirección y ahí se planta. Van tres sesiones eligiendo otra cosa por este motivo; la siguiente
tiene que ser con Raúl delante.

Cuatro avisos para quien la coja:

- **`AuthProvider` ya existe y solo hay que rellenarlo.** El contrato está puesto: `session`,
  `cargando` y `permisos`. Falta el perfil, los equipos, el equipo activo y el conjunto de
  permisos de verdad.
- **`permisos` tiene que pasar de `null` a un `Set` solo cuando la consulta se haya resuelto.** Si
  se rellena antes con un conjunto vacío, `RequirePermission` manda a `/403` a quien sí tiene
  permiso, y el fallo parece de permisos cuando es de carga.
- **`RequirePermission` ya está cableado en el enrutador** con el permiso de cada ruta. No hay que
  tocar `router.tsx`: en cuanto `permisos` traiga datos, las rutas se abren solas.
- **El equipo activo se recuerda en `localStorage`** (DOC 06 §5.5), y un usuario puede tener
  función en varios equipos (decisión H3).

Y una de regalo, que ahora sí se puede pedir: **la T-105 ya tiene arnés**, así que lo que salga
de ella con lógica pura —el mapeo de permisos a `Set`, sobre todo— se prueba en el sitio, sin
excusa de «es que no hay dónde».

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
npm run test -- --run
npm run build
```

`npm run test -- --run` tiene que decir `Test Files 1 passed (1)` y `Tests 17 passed (17)`. Si
dice `No test files found`, el `include` del bloque `test` de `vite.config.ts` dejó de casar.

El build tiene que terminar en verde y decir `572.51 kB` en crudo y `166.26 kB` comprimidos de
JavaScript, más `11.61 kB` y `3.12 kB` de CSS. Al final, `precache 17 entries (641.88 KiB)`. Si
sale bastante más, `NODE_ENV` volvió a colarse. **Y ojo con `set NODE_ENV=` en `cmd`:** deja la
variable a cadena vacía, empaqueta React en modo desarrollo y el mismo build da 794 kB y 230 kB
comprimidos. La forma buena es `Remove-Item Env:\NODE_ENV` en PowerShell.

Para ver la cobertura, cuando apetezca mirarla y solo para mirarla:

```powershell
npx vitest run --coverage
```

**`npm run db:types` NO se lanza a la ligera.** Sin `SUPABASE_ACCESS_TOKEN` en el entorno o sin
`supabase login`, el comando falla y el `>` del script deja `src/types/database.types.ts` en cero
bytes. Si pasa: `git checkout -- src/types/database.types.ts`.

---

## AVISO DE SEGURIDAD

Sigue vigente, y **la siguiente tarea es justo la que lo pisa**: al abrir el panel del proveedor
de Google en Supabase, **Chrome autorrellena «Client IDs» y «Client Secret»** con credenciales
guardadas. **Vacía los dos campos antes de tocar nada.** Si se pulsa «Save» con eso dentro, tu
contraseña acaba escrita en la configuración del proveedor.
