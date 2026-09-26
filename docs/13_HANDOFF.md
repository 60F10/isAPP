# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 26/09/2026 — T-201, club y equipos: ✅ cerrada, con el alta de club y el escudo fuera

Primera tarea de la fase 2. Sesión en la nube, sin acceso a Supabase. Raúl pasó el único logo que
encontró del C.D. Unión Tejina, que se guarda para cuando exista el cubo de escudos.

El entorno obliga a subir a una rama `claude/…`; la que toca por convención es
`feat/core-club-y-equipos`, y con ese nombre se hizo el commit para que pasara el hook de
`pre-commit`. La pull request lo dice.

---

## HECHO

**A03 y A04 sustituyen a sus `PantallaPendiente`**, las dos en el trozo perezoso de `core`.

| Pantalla          | Qué hace                                                                                                                                                                                                                                     |
| :---------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A03 · Club**    | Enseña y edita el club del equipo activo: nombre y nombre corto. La tarjeta «Escudo» dice que todavía no se puede subir                                                                                                                      |
| **A04 · Equipos** | Dos listas, «Equipos del club» y «Rivales». Cada equipo se edita en su sitio (nombre y categoría) y devuelve el foco al botón al cerrar. Los propios llevan enlace a su plantilla. Debajo, «Añadir equipo», con el rival marcado por defecto |

| Pieza                                      | Qué hace                                                                                                                 |
| :----------------------------------------- | :----------------------------------------------------------------------------------------------------------------------- |
| `modules/core/model/clubYEquipos.ts`       | Valida club y equipo, limpia espacios, detecta nombres repetidos, ordena la lista y traduce los «no» de la base a frases |
| `modules/core/api/clubYEquipos.ts`         | Leer club, editarlo, listar equipos, crear y editar equipo. Las actualizaciones piden la fila de vuelta                  |
| `modules/core/api/queryKeys.ts`            | `coreKeys`, mismo patrón que `authKeys`                                                                                  |
| `modules/core/hooks/useClubYEquipos.ts`    | Club activo, consultas y mutaciones. Al guardar invalida también el contexto de acceso, que lleva el nombre del equipo   |
| `modules/core/components/EstadoDeCarga`    | «Cargando…» y el error dentro de la pantalla con «Reintentar» (DOC 06 §10.1, capa 2)                                     |
| `docs/recursos/escudo-cd-union-tejina.png` | El logo que pasó Raúl, 100×111 px, a la espera del cubo `crests`                                                         |

**Sin comprobar en el navegador**, porque aquí no se puede entrar con Google. Las pruebas montan las
dos pantallas enteras con la red simulada; el viaje real está en «Comandos para verificar».

### Pruebas

**97 en verde**, 23 nuevas. Cada una se vio fallar antes de darla por buena: quince contra un
esbozo vacío y las demás con un mutante a mano sobre la línea que vigilan.

| Archivo                             | Casos | Qué vigila                                                                                                   |
| :---------------------------------- | ----: | :----------------------------------------------------------------------------------------------------------- |
| `core/model/clubYEquipos.test.ts`   |    16 | Obligatorios, largos, repetidos sin mayúsculas ni espacios, el propio al editar, orden con «ñ», mensajes     |
| `core/routes/ClubYEquipos.test.tsx` |     7 | Guardar el club limpio; «sin permiso» con palabras; reintentar; las dos listas; alta; repetido sin red; foco |

---

## DECISIONES TOMADAS

**No hay alta de club.** Es la pieza que la fila del DOC 08 pedía y que la RLS actual no permite
hacer bien. `clubs_insert` deja insertar, pero `clubs_select` pide ser miembro de algún equipo del
club, y `teams_insert`, también. En un club recién creado no hay equipos ni miembros: el club nacería
**invisible hasta para quien lo crea** y no se le podría crear ningún equipo. Construir el formulario
sería fabricar clubes huérfanos. No se toca la RLS, como pedía la cola. El ciclo y sus salidas, en el
punto 26.

**No hay escudo.** El cubo `crests` no existe (punto 7). El logo que pasó Raúl se guarda en
`docs/recursos/` para subirlo cuando exista. Con 100×111 px basta para enseñarlo a 48 px; si aparece
uno de más resolución, mejor.

**No hay borrado.** Ni `clubs` ni `teams` tienen política de borrado. Un rival mal escrito se corrige
editándolo.

**El tipo de equipo se elige al crear y no se cambia después.** Un equipo propio con plantilla,
personas y partidos que pasara a rival dejaría todo eso colgando de un equipo que, por definición,
no tiene jugadores.

**El rival va marcado por defecto en el alta.** Es lo que más se da de alta: uno por cada partido
nuevo. Al marcar «Del club», la pantalla avisa de que el equipo empieza sin personas (punto 28).

**Las actualizaciones piden la fila de vuelta.** Si la RLS no deja cambiar una fila, PostgREST no da
error: devuelve cero filas. `api/` lo convierte en `SIN_FILAS`, que la pantalla traduce a «No tienes
permiso para cambiar esto». Anotado en el DOC 06 §10.1 y en el `CLAUDE.md`, porque cada `update`
nuevo tiene que repetirlo.

**Los largos máximos son de interfaz**, porque el esquema no los pone: 80 caracteres el nombre del
club, 20 el corto, 60 el del equipo y 40 la categoría. Caben en una cabecera de móvil.

**El nombre repetido se comprueba antes de enviar**, sin distinguir mayúsculas ni espacios de más.
La base lo impide igual (`teams_name_unique`), y ese error también se traduce, pero así el aviso sale
junto al campo y sin gastar red.

**Color del equipo y temporadas, fuera.** `primary_color` es la E2-08, de la V1.1, y la fila de la
T-201 no pide temporadas.

**`core` importa `useAuth` y `authKeys` por el barril de `auth`.** Es lo que manda la regla 3 del
DOC 06 §4.1, y aquí no cuesta nada: `core` ya va en perezoso. El build no avisa de
`INEFFECTIVE_DYNAMIC_IMPORT`.

**Hallazgo: `teams_insert` pide menos de lo que dice el DOC 05.** La tabla del §12 pide
`team.manage`; la política solo pide ser miembro del club. La interfaz enseña el alta solo a quien
tiene `team.manage`, pero la API se la deja a cualquier miembro. Anotado en el DOC 05 §12 y en el
punto 27.

---

## PENDIENTE DE LA TAREA

El alta de club (punto 26) y el escudo (punto 7). Las dos piden una sesión de Cowork.

---

## DEUDA TÉCNICA GENERADA

| Deuda                                                                     | Cuándo se paga                                                    |
| :------------------------------------------------------------------------ | :---------------------------------------------------------------- |
| `Card` no le pone nombre accesible a su `<section>`, así que no es región | Si se quiere navegar por regiones. Un `aria-labelledby` en `Card` |
| `SIN_FILAS` vive en `core` y no en `shared/lib`                           | Con el ayudante común del punto 16                                |

---

## LO QUE SIGUE ABIERTO

**No se cierra ningún punto de la lista anterior**: la T-201 no era la tarea de ninguno. Se suman tres
al final, del 26 al 28. La numeración de antes no cambia.

Pendiente de decidir, que no lo decide el código:

1. **Los cinco destinos de la barra.** Hoy: Inicio `/`, Equipo `/equipos`, Agenda `/calendario`,
   Datos `/estadisticas`, Más `/ajustes`. **Lo decide Raúl.** Desde esta sesión, «Equipo» abre la
   A04 de verdad, que pide `team.manage`: un seguidor o un anotador sin ese permiso pulsa Equipo y
   cae en `/403`. Salidas:

   | Salida                                                                                  | Consecuencia                                                                                                                                                                    |
   | :-------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
   | **A. Dejarlo como está**                                                                | Cero trabajo. `/mis-aportaciones` solo se alcanza desde Inicio, `/admin/logs` no tiene entrada, «Más» abriendo Ajustes se lee raro, y Equipo manda a `/403` a quien no gestiona |
   | **B. Pantalla índice «Más»** en `/mas`: Mis aportaciones, Ajustes y Registro de errores | Una pantalla pequeña más y un toque más hasta Ajustes. La C02 tiene sitio. **Recomendada**                                                                                      |
   | C. Pantallas índice para Equipo, Datos y Más                                            | Tres pantallas. Arregla también el `/403` de Equipo. Se puede partir: B ahora y la de Equipo con la T-202, que es cuando la plantilla tiene contenido                           |

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
7. **Los cubos de Storage `crests` y `docs`, sin crear.** Sin `crests` no hay escudo en la A03 ni en
   los equipos. El logo del C.D. Unión Tejina está en `docs/recursos/escudo-cd-union-tejina.png`,
   listo para subirlo. Pide una sesión de Cowork: crear el cubo, sus políticas y la subida desde la A03.
8. Los alias viven duplicados en `tsconfig.app.json` y en `vite.config.ts`, a mano.
9. `/admin/logs` sigue sin guardia de permiso: el DOC 05 §4 no define ninguno de administración.
   Lo resuelve la T-303.
10. Faltan tokens de anchura de maqueta en el DOC 07: el rail y la caja de `BareLayout` salen de
    `--tap-min`.
11. **Dieciséis rutas comparten la misma `PantallaPendiente`.** Cada una la sustituye su tarea.
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
    publica nada hasta reactivarlos a mano: ni la T-106, ni la T-107, ni la T-201 están en el sitio
    publicado.
16. **`esErrorDeCliente` no reconoce un error de Supabase**, así que los 4xx se reintentan dos veces
    en vez de rendirse a la primera. Se arregla con el «ayudante común» del DOC 06 §10.1, que
    todavía no existe en `shared/lib/` ni tiene tarea asignada. La T-201 deja la primera pieza,
    `SIN_FILAS`, para mudarla allí.
17. **No hay forma de que entre nadie más.** Ni alta propia, ni invitación, ni hacerse seguidor: la
    tabla `invitations` existe y no la usa ninguna pantalla. Es la T-301, y **la idea de Raúl de
    elegir equipo como seguidor al entrar se apunta aquí**: hace falta decidirla en el DOC 03,
    porque pide tocar la RLS de `team_followers`.
18. **A01b no está en el inventario del DOC 02.** O entra como parada técnica, o se le da otro sitio.
19. **El contrato de `AuthState` mezcla idiomas**: `cargando`, `permisos` y `reintentarContexto`
    junto a `profile` y `activeTeamId`. Decidir y unificar con el DOC 06 §5.5.
20. **Un club puede enlazar objetos de otro club en sus propias filas** (los catorce avisos de la
    T-105b). Ninguna clave ajena exige que los dos lados sean del mismo club, y `team_of_match`
    devuelve el equipo de cualquier partido. La T-201 no lo toca: sus filas llevan siempre el club
    del equipo activo. **Decidir antes de la T-202**, que mete jugadores en plantillas. Pide
    migración: sesión de Cowork.
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
    —recomendada—; o dejarlo así y corregir el DOC 07. Pide migración: sesión de Cowork.
25. **Cerrar sesión no avisa de datos sin sincronizar.** Hoy no hay ninguno. La T-206 tiene que
    añadir el aviso y no dejar salir con la cola llena sin que la persona lo confirme.
26. **El alta de un club nuevo no se puede hacer desde la aplicación.** `clubs_insert` deja crear el
    club, pero `clubs_select` y `teams_insert` piden ser miembro del club, y en uno nuevo no lo es
    nadie: el club nace invisible y sin forma de meterle un equipo. Salidas:

    | Salida                                                                                                                                                                                   | Consecuencia                                                                                                                                                                                               |
    | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | **A. Seguir sembrando a mano** con `seed.sql`                                                                                                                                            | Cero trabajo. Basta mientras haya un solo club, que es el caso del MVP. **Recomendada hasta la liga**                                                                                                      |
    | **B. Una función `crear_club()` `SECURITY DEFINER`** que, en una transacción, cree el club, su primer equipo, la temporada en curso y al que llama como entrenador con los doce permisos | No toca ninguna política: la lógica queda en un sitio y se prueba con el script de la T-105b. La A03 ganaría el alta. **Recomendada para cuando llegue un segundo club**. Pide migración: sesión de Cowork |
    | C. Aflojar políticas: que `created_by` baste para leer el club y crear el primer equipo                                                                                                  | Toca tres políticas y abre casos raros (¿y el segundo equipo?, ¿y los permisos del creador?). La cola pidió no tocar la RLS para esto                                                                      |

27. **`teams_insert` pide menos que el DOC 05.** Solo `is_club_member`, no `team.manage`: por la API,
    cualquier miembro del club puede crear equipos. Una línea en la próxima migración de permisos:
    `with check (public.has_club_permission(club_id, 'team.manage'))`.
28. **Un equipo propio nuevo nace sin personas.** Nadie tiene `roster.manage` ni ningún otro
    permiso en él hasta que existan las invitaciones (T-301), así que su plantilla y sus partidos
    no los puede llevar nadie. La pantalla lo avisa al marcar «Del club». Para el Cadete A no
    importa: ya está sembrado.

Asumidas y sin fecha: el marco de la ventana vive en `App` como una pieza más entre el enrutador y
las maquetas; la siembra se lanza a mano; `useHasPermission` recibe `string` y no `AppPermission`;
`teams` del contexto devuelve membresías y no equipos pelados, a propósito; el club activo del
registro vive en una variable de módulo de `logging`; `sasi.equipo-activo` sobrevive al cierre de
sesión, a propósito; y los rivales se duplican por club, como ya decía el DOC 05 §5.4 (E17-03).

---

## EL PAQUETE, MEDIDO

| Momento                   | Inicial comprimido | Margen sobre 200 kB |
| :------------------------ | -----------------: | ------------------: |
| Tras la T-107, en Linux   |          179,92 kB |            20,08 kB |
| **Esta sesión, en Linux** |      **179,42 kB** |        **20,58 kB** |

**Baja medio kilobyte, y no por nada de lo que hace la T-201.** Las dos pantallas nuevas viven en el
trozo perezoso de `core` (5,22 kB de JavaScript y 0,98 kB de estilos), que no se descarga al
arrancar. Lo que cambia es el reparto: con `Field` y el resto de piezas compartidas repartidas de otra
forma, el empaquetador deja de crear el trozo `preload-helper` y mete lo necesario en `index`. Sale
algo más barato.

| Trozo del arranque         |    Comprimido |
| :------------------------- | ------------: |
| `index-*.js`               |      72,20 kB |
| `App-*.js`                 |     101,08 kB |
| `QueryClientProvider-*.js` |       0,26 kB |
| `workbox-window`           |       2,20 kB |
| Dos hojas de estilo        |       3,68 kB |
| **Total**                  | **179,42 kB** |

**Ojo al medir a partir de ahora**: los nombres de los trozos del arranque cambian de una tarea a
otra según cómo reparta el empaquetador. La lista buena sale de `dist/index.html` (lo que carga) y
de las importaciones de `App-*.js` (lo que carga `App`). En crudo, `precache 24 entries
(684.72 KiB)`.

---

## SIGUIENTE TAREA SUGERIDA

**T-202**: plantilla y ficha de jugador. Solo apodo y dorsal: ningún nombre real, ninguna foto,
ningún dato de salud. Antes, Raúl decide el punto 20 (referencias cruzadas entre clubes), porque la
T-202 es la primera que mete jugadores en plantillas, y conviene el 21 (`noUncheckedIndexedAccess`).

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

`npm run test -- --run` tiene que decir `Test Files 10 passed (10)` y `Tests 97 passed (97)`. El
build, en verde y sin `INEFFECTIVE_DYNAMIC_IMPORT`.

**En el navegador, con `npm run dev` y la cuenta de Isaac o la tuya:**

1. «Equipo» abre la A04: el Cadete A en «Equipos del club» y los rivales que haya.
2. Añade un rival, por ejemplo «UD Orotava». Sale en «Rivales» y el campo se vacía.
3. Añade otro con el mismo nombre en minúsculas: el aviso sale junto al campo y no se envía nada.
4. «Editar» en el rival, cambia el nombre y «Guardar». El foco vuelve al botón «Editar».
5. Abre `/club`: cambia el nombre corto y «Guardar cambios». Recarga: se ha quedado.
6. Con la segunda cuenta de Google de la T-105b, sin equipo, abre `/club`: cae en `/403`.

**`npm run db:types` NO se lanza a la ligera.** Esta sesión no tocó el esquema.

---

## AVISO DE SEGURIDAD

Sin cambios de configuración esta sesión: ni variables de entorno, ni Netlify, ni migraciones. El
aviso de Chrome autorrellenando el panel de Google en Supabase sigue vigente para el día que haga
falta abrirlo: **vacía «Client IDs» y «Client Secret» antes de tocar nada.**
