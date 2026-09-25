# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 25/09/2026 — Deuda arrastrada (punto 17): `strict` en los `tsconfig`

Sesión en la nube, sin Raúl delante y sin acceso a Supabase. No es tarea del DOC 08: es el punto 17
del traspaso anterior, «`strict` apagado en los `tsconfig`». Por eso el DOC 08 no cambia.

El entorno obliga a trabajar en la rama `claude/build-repo-typescript-strict-nv74p1`; la que tocaba
por convención es `build/repo-typescript-strict`. La pull request lo dice.

---

## HECHO

**El punto de partida era falso, y es lo primero que hay que saber.** TypeScript 6 trae `strict`
encendido por defecto. Comprobado con un archivo suelto y un `tsconfig` vacío: `tsc` 6.0.3 rechaza un
parámetro sin tipo (TS7006) y un `null` en un `string` (TS2322). El proyecto compila en estricto
desde la T-101 aunque ningún `tsconfig` lo dijera, y por eso encenderlo sacó **cero errores**. El
bucle de arreglos que iba a llevar un subagente no ha hecho falta.

| Archivo              | Cambio                                                                                         |
| :------------------- | :--------------------------------------------------------------------------------------------- |
| `tsconfig.app.json`  | `"strict": true` explícito, con un comentario que explica por qué se escribe si ya es el valor |
| `tsconfig.node.json` | `"strict": true` explícito                                                                     |
| `.oxlintrc.json`     | Tres reglas en error: `no-explicit-any`, `no-non-null-assertion` y `ban-ts-comment`            |
| DOC 06 §11           | Decisión **D06-22** y versión 1.7                                                              |

**Por qué escribir lo que ya es el valor por defecto.** Si alguien baja a TypeScript 5 —por una
dependencia que no admita el 6, por ejemplo—, `strict` se apagaría en silencio y el código dejaría de
distinguir `null` de un conjunto vacío sin que nada avisara. Escrito, no depende de la versión.

**Por qué las reglas de `oxlint`.** `strict` no impide ni `any` escrito a mano, ni el `!` de
aserción, ni los comentarios `@ts-`. Son justo los tres atajos prohibidos, y una prohibición que
vigila una persona se salta el día que hay prisa. Las tres reglas se vieron fallar sobre un archivo
de prueba con los cuatro casos (`any`, `!`, `@ts-ignore` y `@ts-expect-error` con descripción) antes
de darlas por buenas, y el repositorio no tiene hoy ninguno de ellos. `ban-ts-comment` deja pasar
por defecto un `@ts-expect-error` con descripción: se configura para prohibirlo también.

**El paquete no cambia ni un byte.** Se compiló antes y después y se comparó la suma SHA-256 de cada
archivo de `dist/`: idénticos, `sw.js` incluido.

---

## PENDIENTE DE LA TAREA

**`noUncheckedIndexedAccess`, medido y sin encender, como pedía la tarea.** Saca **siete errores**:

| Archivo                                      | Errores | Qué es                                                                                    |
| :------------------------------------------- | ------: | :---------------------------------------------------------------------------------------- |
| `src/modules/auth/model/permissions.ts:120`  |       1 | `membresias[0].team.id`, ya protegido por el `length === 0` de tres líneas antes          |
| `src/modules/auth/model/permissions.test.ts` |       6 | `const [membresia] = …` en tres pruebas: la desestructuración da `Membresia \| undefined` |

`tsconfig.node.json` no saca ninguno.

Salidas:

| Salida                                  | Consecuencia                                                                                                                                                                                                                                                                                         |
| :-------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Encenderlo ya, antes de la T-201** | Siete arreglos en dos archivos, media hora. El de producción se reescribe con `const [primera] = membresias; return primera?.team.id ?? null;` y el `if` de arriba sobra. Cada pantalla nueva nace con la comprobación puesta. **Recomendada**: el coste crece con cada lista que pinte una pantalla |
| B. Encenderlo después del MVP           | Cero coste hoy. Cada tabla, convocatoria y lista de eventos que se escriba hasta octubre suma errores, y el `model/` de `match` —tramos, minutos, duplicados— es justo donde un índice fuera de rango pierde un dato                                                                                 |
| C. No encenderlo                        | Los accesos por índice se revisan a mano en cada pull request. Es la clase de error que el directo no perdona                                                                                                                                                                                        |

No se ha encendido porque la tarea pedía medir, no decidir.

---

## DECISIONES TOMADAS

- **D06-22** en el DOC 06 §11: `strict` explícito en los dos `tsconfig` y tres reglas de `oxlint` en
  error. Ninguna toca el DOC 04 ni el DOC 05.
- **El DOC 08 no se toca**: el punto 17 es deuda, no una fila de tareas.

---

## DEUDA TÉCNICA GENERADA

Ninguna. La sesión cierra deuda y no abre ninguna. La de `noUncheckedIndexedAccess` ya existía; ahora
tiene número y salidas.

---

## LO QUE SIGUE ABIERTO

**El punto 17 del traspaso anterior se cierra esta sesión.** Los de detrás suben un puesto y se suman
dos al final. Para quien lleve la cola con los números viejos:

| Antes | Ahora | Qué                                                 |
| ----: | ----: | :-------------------------------------------------- |
|     9 |     9 | Error de entorno sin interfaz (T-106)               |
|    18 |    17 | `esErrorDeCliente` y el ayudante común              |
|    21 |    20 | `errorContexto` sin pintar (T-106)                  |
|    22 |    21 | Cerrar sesión (T-107)                               |
|     — |    23 | Referencias cruzadas entre clubes, que venía suelta |
|     — |    24 | `noUncheckedIndexedAccess`                          |

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
12. **Diecinueve rutas comparten la misma `PantallaPendiente`.** Cada una la sustituye su tarea.
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
16. **Netlify tiene los despliegues PARADOS desde el 20/09** (DOC 10 §2.2). El sitio publicado sigue
    en pie, pero fusionar a `main` no publica nada hasta reactivarlos a mano.
17. **`esErrorDeCliente` no reconoce un error de Supabase**, así que los 4xx se reintentan dos veces
    en vez de rendirse a la primera. Se arregla con el «ayudante común» del DOC 06 §10.1, que
    todavía no existe en `shared/lib/`.
18. **No hay forma de que entre nadie más.** Ni alta propia, ni invitación, ni hacerse seguidor: la
    tabla `invitations` existe y no la usa ninguna pantalla. Hoy solo entra quien esté sembrado a
    mano. Es la T-301, y **la idea de Raúl de elegir equipo como seguidor al entrar se apunta
    aquí**: hace falta decidirla en el DOC 03, porque pide tocar la RLS de `team_followers` y
    enseñar una lista de equipos que hoy nadie puede leer.
19. **A01b no está en el inventario del DOC 02.** La pantalla de vuelta existe en el código y no en
    la documentación de pantallas. O entra al inventario como parada técnica, o se le da otro sitio.
20. **`errorContexto` no lo pinta nadie.** Si la consulta del contexto de acceso falla, las rutas
    guardadas se quedan en «Cargando…» para siempre. Lo cierra la T-106, que es quien trae las
    pantallas de error.
21. **No hay cerrar sesión en ninguna parte.** Quien entre con una cuenta sin equipo se queda ahí.
    Es la T-107. Mientras tanto se sale borrando el almacenamiento del sitio.
22. **El contrato de `AuthState` mezcla idiomas**: `cargando` y `permisos` junto a `profile` y
    `activeTeamId`. Los nombres nuevos son los que fija el DOC 06 §5.5; decidir y unificar.
23. **Un club puede enlazar objetos de otro club en sus propias filas** (los catorce avisos de la
    T-105b): un jugador ajeno en su plantilla o su convocatoria, una sanción o asistencia ajena, un
    rival ajeno, la temporada o la competición de otro club. Las políticas solo miran el permiso
    sobre lo propio y ninguna clave ajena exige que los dos lados sean del mismo club. `team_of_match`
    devuelve además el equipo de cualquier partido. Con un solo club no hace daño; **decidir antes de
    la T-201 cuándo se paga**, porque la T-201 a la T-205 son las primeras pantallas que escriben
    esas filas. Pide migración: sesión de Cowork.
24. **`noUncheckedIndexedAccess` apagado.** Siete errores hoy; salidas arriba, en «Pendiente de la
    tarea». Recomendado encenderlo antes de la T-201.

Asumidas y sin fecha: `vite build` avisa de que el trozo inicial pasa de 500 kB en crudo; el marco
de la ventana vive en `App` como una pieza más entre el enrutador y las maquetas; la siembra se
lanza a mano y no hay guion de `npm` que la ejecute; `useHasPermission` recibe `string` y no
`AppPermission` (barato de tipar cuando toque); y `teams` del contexto devuelve membresías, no
equipos pelados, aunque el §5.5 lo llame `teams` —a propósito: quien elija equipo necesita también
el rol y los permisos de cada uno—.

---

## EL PAQUETE, MEDIDO

| Momento                            | Inicial comprimido | Margen sobre 200 kB |
| :--------------------------------- | -----------------: | ------------------: |
| Refactor del 20/09, en Windows     |          175,21 kB |            24,79 kB |
| `main` antes de esta sesión, Linux |          174,97 kB |            25,03 kB |
| **Esta sesión, Linux**             |      **174,97 kB** |        **25,03 kB** |

Esta sesión no mueve el paquete: `dist/` sale idéntico byte a byte. **La diferencia de 0,24 kB con
la cifra anterior es del entorno, no del código.** El mismo commit de la fusión del refactor
(`bd1c6fd`) da aquí 169,65 kB de JavaScript comprimido, y en la máquina de Raúl dio 169,89. Suma:
169,65 del trozo principal, 3,12 de CSS y 2,20 de `workbox-window`. En crudo, 583,60 kB de JavaScript
y `precache 17 entries (654.41 KiB)`. Si en Windows vuelve a salir 175,21, está bien: compara siempre
contra una medida de la misma máquina.

---

## SIGUIENTE TAREA SUGERIDA

**T-106**: error boundary, `error_logs` y aviso de sesión a punto de expirar. Cierra los puntos 9
y 20 de arriba —el 9 y el 21 con la numeración vieja—.

Antes de la T-201, dos decisiones de Raúl: el punto 23 (referencias cruzadas entre clubes) y el 24
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

`npm run lint` sin avisos ni errores. `npm run test -- --run` tiene que decir `Test Files 2 passed (2)`
y `Tests 33 passed (33)`. El build, en verde y sin `INEFFECTIVE_DYNAMIC_IMPORT`.

Para ver las reglas nuevas en acción, crea `src/prueba.ts` con `const a: any = 1;` y lanza
`npm run lint`: tiene que fallar con `typescript(no-explicit-any)`. Bórralo después.

Para volver a medir `noUncheckedIndexedAccess` sin encenderlo:

```powershell
npx tsc -p tsconfig.app.json --noEmit --noUncheckedIndexedAccess
```

Tiene que sacar siete errores, los de la tabla de arriba.

**`npm run db:types` NO se lanza a la ligera.** Esta sesión no tocó el esquema.

---

## AVISO DE SEGURIDAD

Sin cambios de configuración esta sesión: ni variables de entorno, ni Netlify, ni migraciones. El
aviso de Chrome autorrellenando el panel de Google en Supabase sigue vigente para el día que haga
falta abrirlo: **vacía «Client IDs» y «Client Secret» antes de tocar nada.**
