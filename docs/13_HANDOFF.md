# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 26/09/2026 — T-204, calendario y alta de partido: ✅ cerrada. Y la migración para Cowork, escrita

Sesión en la nube, sin acceso a Supabase, con Raúl respondiendo. Antes de la tarea, Raúl decidió los
dos puntos abiertos de la T-203 y dio dos datos:

| Qué                                       | Decisión o dato                                                        | Dónde queda                                     |
| :---------------------------------------- | :--------------------------------------------------------------------- | :---------------------------------------------- |
| Categoría de la competición (punto 33)    | **Columnas propias**                                                   | Migración del DOC 05 §14.4 y T-203b del DOC 08  |
| Nombre de competición repetido (punto 34) | **Se arregla** con un índice único                                     | Migración del DOC 05 §14.4                      |
| Campo de casa del C.D. Unión Tejina       | Campo de Fútbol Izquierdo Rodríguez, Av. Milán, 27-29, 38260 La Laguna | Migración del DOC 05 §14.4, como dato; punto 37 |
| Calendario de la federación               | `https://futboltenerife.com/1panel-cadete/?ruta=cadete`                | Bloqueado desde aquí; punto 38                  |

**La migración no se ha aplicado**: esta sesión no tiene acceso a la base. Está escrita, con su
borrador de SQL y lo que hay que comprobar antes y después, en el **DOC 05 §14.4**, para una sesión de
Cowork. Suma de paso los puntos 4 y 27, dos líneas de permisos que ya esperaban una migración. El
código que la aprovecha es una tarea nueva, la **T-203b**, que no se puede empezar sin ella.

El entorno obliga a subir a una rama `claude/…`; la que toca por convención es
`feat/agenda-calendario`, y con ese nombre se hizo el commit para que pasara el hook de
`pre-commit`. La pull request lo dice.

---

## HECHO

**El módulo `agenda` nace con A09 y A10**, en su propio trozo perezoso. Sustituye a las tres
`PantallaPendiente` de `/calendario`, `/partidos/nuevo` y `/partidos/:id/editar`.

| Pantalla                         | Qué hace                                                                                                                                                                                                                                                                                                         |
| :------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A09 · Calendario**             | Los partidos del equipo activo en la temporada, en «Por jugar» y «Jugados». Cada uno: día y hora, «Cadete A – UD Orotava» con el local delante, competición y campo, y el estado en palabras. «Editar» con `schedule.manage` y «Convocatoria» con `lineup.manage`, solo antes de jugarse. «Nuevo partido» arriba |
| **A10 · Nuevo y editar partido** | Competición (ya elegida si solo hay una), rival de los de referencia del club, en casa o fuera, fecha, hora, campo propuesto desde el último partido en casa y la casilla «Ya se jugó: lo meto en diferido». Si faltan competición o rivales, lo dice y enlaza a dónde darlos de alta                            |
| **A10 · Borrar**                 | Solo si el partido sigue programado, en dos pasos en el mismo sitio                                                                                                                                                                                                                                              |

| Pieza                                 | Qué hace                                                                                                                                       |
| :------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| `modules/agenda/model/partido.ts`     | Fecha y hora locales a instante UTC y vuelta, validación, separar el calendario por estado, último campo de casa, «local – visitante», estados |
| `modules/agenda/api/partidos.ts`      | Calendario, partido, alta, edición y borrado, con `SIN_FILAS`. Trae el nombre del rival y de la competición en la misma consulta               |
| `modules/agenda/hooks/usePartidos.ts` | Equipo activo, consultas y mutaciones                                                                                                          |
| `@modules/core` y `@modules/rules`    | Exportan ya `useEquipos`, `useClubActivo`, `useCompeticiones` y `useClubYTemporada`, para que `agenda` no entre en sus carpetas                |
| `shared/ui/GrupoDeOpciones`           | Sube desde `rules`, con su hoja de estilos: lo usan ya dos módulos                                                                             |
| **DOC 05 §14.4**                      | La próxima migración, para Cowork: categoría en cuatro columnas, nombre único, campo de casa y dos permisos                                    |
| **DOC 08**                            | T-204 en ✅ y la T-203b nueva                                                                                                                  |

**Sin comprobar en el navegador**, porque aquí no se puede entrar con Google. Las pruebas montan las
tres pantallas enteras con la red simulada; el viaje real está en «Comandos para verificar».

### Pruebas

**165 en verde**, 23 nuevas. Cada una se vio fallar antes de darla por buena: once contra un esbozo
vacío y las demás con un mutante a mano sobre la línea que vigilan. Una de las mutaciones no falló, y
eso destapó un hueco en la prueba: la comprobación de la hora la cubría ya la del día para las 25:00,
pero no para los minutos. `10:60` se convertiría en `11:00` del mismo día sin quejarse. Hay caso nuevo
para eso.

| Archivo                         | Casos | Qué vigila                                                                                                                                                       |
| :------------------------------ | ----: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agenda/model/partido.test.ts`  |    14 | Ida y vuelta de la hora, fechas imposibles, minutos de más, columnas del alta, obligatorios, diferido en el pasado, orden, campo de casa                         |
| `agenda/routes/Agenda.test.tsx` |     9 | Las dos listas y los enlaces según permisos; alta con competición y campo propuestos; rival sin elegir; diferido futuro; sin rivales; edición; empezado; borrado |

---

## DECISIONES TOMADAS

**El calendario se parte por estado, no por fecha.** Por jugar: programado, convocado o en juego.
Jugados: el resto. Un partido de ayer que nadie ha empezado sigue pendiente; uno suspendido ya no se
va a jugar como estaba.

**La hora es la del móvil** (punto 39). `<input type="date">` y `<input type="time">` dan la hora
local, se guarda en UTC y se enseña en la hora de cada dispositivo. Para un club canario con
anotadores canarios, es lo que se espera.

**Un partido en diferido tiene que ser del pasado.** Es el que ya se jugó y se mete después (D5). Uno
normal puede tener cualquier fecha: el de ayer que se programó tarde también vale.

**Se edita antes de jugarse y se borra solo si sigue programado.** DOC 04 §8.1: fecha, rival y campo
se cambian en `scheduled`. Se deja también en `called`, porque el partido aún no ha empezado. Borrar
uno convocado se llevaría la convocatoria en cascada, así que solo se ofrece en `scheduled`.

**El campo de casa se propone del último partido en casa**, hasta que la migración lo guarde en
`clubs` (punto 37). Sin escribirlo en el código: la aplicación es multiclub.

**Rivales y competiciones salen de `core` y `rules` por sus barriles** (DOC 06 §4.2). `agenda` no
consulta sus tablas por su cuenta.

**Sin entrenamientos en el calendario.** La E4-01 es del MVP en el backlog, pero su pantalla y la de
asistencia son de después del MVP (DOC 08 §7).

**La categoría en cuatro columnas y no en una**, siguiendo a Raúl («columnas propias»): categoría,
nivel, ámbito y grupo, que es como nombra la federación. `name` se queda como nombre visible. Texto
libre y sin lista cerrada en la base. El detalle, en el DOC 05 §14.4.

---

## PENDIENTE DE LA TAREA

Nada de lo que pide la fila del DOC 08. Lo que Raúl decidió hoy necesita la migración del DOC 05
§14.4 y la T-203b.

---

## DEUDA TÉCNICA GENERADA

Los puntos 37 a 39 de abajo.

---

## LO QUE SIGUE ABIERTO

**No se cierra ningún punto de la lista anterior.** Los puntos 33 y 34 pasan de «decidir» a
«decidido, pendiente de migración», y el 4 y el 27 entran en esa misma migración. Se actualizan
también el 11 (nueve pantallas pendientes) y el 20. Se suman tres al final, del 37 al 39. La
numeración no cambia.

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
4. **`set_updated_at()` arrastra el `EXECUTE` de `authenticated` que no necesita.** **Va en la
   migración del DOC 05 §14.4**, pieza 4b.
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
11. **Nueve rutas comparten la misma `PantallaPendiente`.** Cada una la sustituye su tarea.
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
    todavía no está completo ni tiene tarea asignada. **La T-203 muda a `shared/lib/guardado.ts`**
    lo que ya había: `SIN_FILAS`, `mensajeDeErrorAlGuardar` y `limpiarTexto`. Falta envolver cada
    `{ data, error }` y que `esErrorDeCliente` reconozca el error de Supabase.
17. **No hay forma de que entre nadie más.** Ni alta propia, ni invitación, ni hacerse seguidor: la
    tabla `invitations` existe y no la usa ninguna pantalla. Es la T-301, y **la idea de Raúl de
    elegir equipo como seguidor al entrar se apunta aquí**: hace falta decidirla en el DOC 03,
    porque pide tocar la RLS de `team_followers`.
18. **A01b no está en el inventario del DOC 02.** O entra como parada técnica, o se le da otro sitio.
19. **El contrato de `AuthState` mezcla idiomas**: `cargando`, `permisos` y `reintentarContexto`
    junto a `profile` y `activeTeamId`. Decidir y unificar con el DOC 06 §5.5.
20. **Un club puede enlazar objetos de otro club en sus propias filas** (los catorce avisos de la
    T-105b). Ninguna clave ajena exige que los dos lados sean del mismo club, y `team_of_match`
    devuelve el equipo de cualquier partido. Las pantallas de la T-201 a la T-204 no pueden mezclar clubes: el alta de jugador lo inscribe
    en su propio equipo, y la A10 solo ofrece los rivales y las competiciones del propio club. Lo que
    queda abierto es que **la base tampoco lo impida**, por si algún día escribe algo que no sea la
    pantalla. No está en la migración del §14.4; decidir si entra. Pide migración: sesión de Cowork.
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

27. **`teams_insert` pide menos que el DOC 05.** Solo `is_club_member`, no `team.manage`. **Va en la
    migración del DOC 05 §14.4**, pieza 4a.
28. **Un equipo propio nuevo nace sin personas.** Nadie tiene `roster.manage` ni ningún otro
    permiso en él hasta que existan las invitaciones (T-301), así que su plantilla y sus partidos
    no los puede llevar nadie. La pantalla lo avisa al marcar «Del club». Para el Cadete A no
    importa: ya está sembrado.
29. **Un jugador del club no se puede inscribir en un segundo equipo.** El alta de la A05 siempre
    crea un jugador nuevo. Si el mismo chico juega en el Cadete A y en el Cadete B, quedan dos
    jugadores con el mismo apodo y sus estadísticas separadas. Salida: en la A05, un «Inscribir a
    alguien del club» que liste los jugadores del club sin inscripción en este equipo. Solo
    frontend, sin migración. Con un solo equipo gestionado no molesta.
30. **No hay lista de bajas ni reincorporación.** La baja rellena `left_on` y el jugador
    desaparece de la A05. Volver a darlo de alta crea otro jugador (punto 29). Salida: una lista
    plegada de «Bajas de esta temporada» con «Reincorporar», que vacía `left_on`.
31. **La ficha guarda en dos peticiones** (inscripción y apodo), y el alta en dos más un borrado
    compensatorio. Si falla la segunda, la primera ya está guardada; si falla también el borrado,
    queda un jugador sin inscribir en el club, invisible en toda plantilla. Salida: una función
    `SECURITY DEFINER` por operación, que es trabajo de migración.
32. **El permiso de la A05 y la A06 lo mira la guardia en el equipo activo, no en el de la
    dirección.** Quien abra la plantilla de otro equipo del club ve lo que la RLS le deje leer, y al
    guardar recibe «No tienes permiso» si no tiene `roster.manage` en ese equipo. No hay fuga, pero
    sí una pantalla que ofrece lo que no puede hacer. Salida: comprobar el permiso del equipo de la
    ruta con las membresías de `useAuth()`.
33. **La categoría de la competición va en el nombre.** **Decidido por Raúl el 26/09: columnas
    propias.** `competitions` ganará `category`, `level`, `scope` y `group_label` en la migración del
    DOC 05 §14.4, y la **T-203b** las pondrá en la A08. Hasta entonces, sigue escrita en el nombre.
34. **El nombre de la competición no es único en la base.** **Decidido por Raúl el 26/09: se
    arregla.** Índice único sobre `(club_id, season_id, lower(name))`, en la migración del DOC 05
    §14.4. Antes de crearlo, la consulta de duplicados que trae el propio §14.4.
35. **Los ocho tipos de evento fuera del MVP no se encienden desde la A08.** No tienen botón en el
    directo, y encenderlos prometería algo que no existe. Si alguien los enciende en la base, la A08
    los conserva al guardar. Cuando se construya su botón, se añaden a la lista de la ficha.
36. **No se borran competiciones.** La RLS lo permite, pero los partidos apuntan a su competición con
    `on delete restrict`, y una con partidos no se puede borrar. Una sin partidos mal creada se
    renombra. Si molesta, un «Borrar» que solo salga sin partidos.
37. **El campo de casa del club no vive en la base.** Raúl dio el del C.D. Unión Tejina: **Campo de
    Fútbol Izquierdo Rodríguez**, Av. Milán, 27-29, 38260 La Laguna, Santa Cruz de Tenerife. Va a
    `clubs.home_venue` y `clubs.home_venue_address` con la migración del DOC 05 §14.4, y la T-203b lo
    propondrá en la A10. Hasta entonces, la A10 propone el campo del último partido en casa: se
    escribe la primera vez y a partir de ahí sale solo.
38. **El calendario de la federación no se puede leer desde aquí.** Raúl pasó la página de la
    Federación Interinsular: `https://futboltenerife.com/1panel-cadete/?ruta=cadete`. El proxy de red
    de las sesiones en la nube la bloquea, así que los rivales y las jornadas de la Cadete Primera
    Tenerife G2 se meten a mano: primero los rivales en Equipos y después cada partido en el
    calendario. Leerla sola sería el _scraping_ de la fase 6, fuera del MVP.
39. **La hora es la del móvil.** La fecha y la hora se escriben y se enseñan en la zona del
    dispositivo y se guardan en UTC. En Canarias es la hora canaria; un partido en la península se
    escribe con la hora canaria en la que empieza. Si algún día anotan dispositivos en zonas
    distintas, hace falta fijar la zona del club.

Asumidas y sin fecha: el marco de la ventana vive en `App` como una pieza más entre el enrutador y
las maquetas; la siembra se lanza a mano; `useHasPermission` recibe `string` y no `AppPermission`;
`teams` del contexto devuelve membresías y no equipos pelados, a propósito; el club activo del
registro vive en una variable de módulo de `logging`; `sasi.equipo-activo` sobrevive al cierre de
sesión, a propósito; los rivales se duplican por club, como ya decía el DOC 05 §5.4 (E17-03);
«Sancionado» no se elige en la A06, lo pone el cómputo de sanciones; y el calendario no enseña
entrenamientos, que llegan con su pantalla después del MVP.

---

## EL PAQUETE, MEDIDO

| Momento                   | Inicial comprimido | Margen sobre 200 kB |
| :------------------------ | -----------------: | ------------------: |
| Tras la T-203, en Linux   |          179,85 kB |            20,15 kB |
| **Esta sesión, en Linux** |      **179,92 kB** |        **20,08 kB** |

**+0,07 kB, en `App-*.js`**: las tres entradas perezosas nuevas. Las pantallas viven en el trozo de
`agenda` (5,43 kB de JavaScript y 0,92 kB de estilos), que no se descarga al arrancar.

| Trozo del arranque         |    Comprimido |
| :------------------------- | ------------: |
| `index-*.js`               |      72,21 kB |
| `App-*.js`                 |     101,56 kB |
| `QueryClientProvider-*.js` |       0,27 kB |
| `workbox-window`           |       2,20 kB |
| Dos hojas de estilo        |       3,68 kB |
| **Total**                  | **179,92 kB** |

La lista buena de trozos sale de `dist/index.html` y de las importaciones de `App-*.js`. En crudo,
`precache 30 entries (739.88 KiB)`.

---

## SIGUIENTE

**Para una sesión de Cowork, antes que nada: la migración del DOC 05 §14.4.** Categoría en columnas,
nombre único, campo de casa con el dato de Unión Tejina y dos líneas de permisos. Con la consulta de
duplicados antes, y `npm run db:types`, el script de la T-105b y el auditor después.

**Siguiente tarea de código: T-205**, convocatoria y alineación inicial. No necesita la migración. La
**T-203b** va detrás de la migración, cuando esté.

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

`npm run test -- --run` tiene que decir `Test Files 18 passed (18)` y `Tests 165 passed (165)`. El
build, en verde y sin `INEFFECTIVE_DYNAMIC_IMPORT`.

**En el navegador, con `npm run dev` y la cuenta de Isaac o la tuya:**

1. Da de alta en Equipos un rival de la G2, si no hay ninguno, y la liga en Competiciones.
2. «Agenda» → «Nuevo partido». La competición ya viene elegida. Rival, en casa, una fecha y una hora,
   y escribe «Campo de Fútbol Izquierdo Rodríguez». Vuelves al calendario y sale en «Por jugar», con
   el Cadete A delante.
3. «Nuevo partido» otra vez, en casa: el campo ya viene escrito.
4. «Editar» el primero, cámbialo a «Fuera» y guarda: el rival pasa delante.
5. «Nuevo partido» con «Ya se jugó» marcado y una fecha futura: no deja.
6. «Editar» → «Borrar partido» → «Sí, borrar el partido»: desaparece.

**`npm run db:types` NO se lanza a la ligera.** Esta sesión no tocó el esquema.

---

## AVISO DE SEGURIDAD

Sin cambios de configuración esta sesión: ni variables de entorno, ni Netlify, ni migraciones. **La
migración del §14.4 la aplica una sesión de Cowork contra la base de producción**: con la consulta de
duplicados antes y el script de la T-105b después. El aviso de Chrome autorrellenando el panel de
Google en Supabase sigue vigente para el día que haga falta abrirlo: **vacía «Client IDs» y «Client
Secret» antes de tocar nada.**
