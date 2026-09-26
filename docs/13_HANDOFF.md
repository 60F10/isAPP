# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 26/09/2026 — T-205, convocatoria y alineación inicial: ✅ cerrada

Sesión en la nube, sin acceso a Supabase y sin nadie respondiendo a mitad: las decisiones que la
tarea pedía están abajo, en «Decisiones tomadas», con su porqué. Ninguna toca el esquema. Lo que
necesita la base va al **DOC 05 §14.5**, para la misma sesión de Cowork que la migración del §14.4.

El entorno obliga a subir a una rama de sesión; la que toca por convención es
`feat/lineup-convocatoria`, y con ese nombre se hizo el commit para que pasara el hook de
`pre-commit`. La pull request lo dice.

---

## HECHO

**El módulo `lineup` nace con la A11**, en su propio trozo perezoso. Sustituye a la
`PantallaPendiente` de `/partidos/:id/convocatoria`, a la que ya enlazaba «Convocatoria» del
calendario.

| Qué hace la A11                  | Cómo                                                                                                                                                              |
| :------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Reparte la plantilla** (L-01)  | Cada jugador del equipo, con tres opciones: Titular, Suplente, No convocado. Radios nativos en línea, 48 px por opción, y bajan de línea a 320 px                 |
| **Dorsal y posición** (L-05, 06) | Al convocarlo salen, propuestos desde la inscripción, y se cambian solo para ese partido                                                                          |
| **No convocables** (L-04, R-03)  | «No disponible» o «Sancionado: no se puede convocar», sin opciones. Si estaba convocado, «se quita al guardar»                                                    |
| **La cuenta**                    | «Titulares: 5 de 11 · Suplentes: 3 · Convocados: 8 de 18 como mucho», arriba y abajo de la lista                                                                  |
| **Guardar** (L-03, R-01)         | Exige los titulares exactos, no pasar del máximo y dorsales del 1 al 99 sin repetir entre convocados. Pasa el partido a «Convocado» (L-07) y vuelve al calendario |
| **Partido empezado** (L-08)      | Titulares y suplentes en solo lectura, sin formulario                                                                                                             |
| **Faltas**                       | Sin plantilla, enlaza a darla de alta. Sin competición legible, lo dice. Sin cobertura, «Reintentar»                                                              |

| Pieza                                     | Qué hace                                                                                                                                                                                         |
| :---------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modules/lineup/model/convocatoria.ts`    | Juntar plantilla y convocatoria guardada, quién se puede convocar, la cuenta y la validación contra el reglamento                                                                                |
| `modules/lineup/api/convocatoria.ts`      | Leer `match_squad` con el apodo y guardarla en dos `upsert` repetibles, con `SIN_FILAS` si vuelven menos líneas de las mandadas                                                                  |
| `modules/lineup/hooks/useConvocatoria.ts` | Consulta y mutación. Si el partido no puede pasar a «Convocado» por permiso, la convocatoria queda guardada y lo devuelve en `marcado`                                                           |
| `agenda/api/partidos.ts`                  | `marcarComoConvocado`: de programado o convocado a convocado, con `SIN_FILAS`                                                                                                                    |
| Barriles                                  | `agenda` exporta `usePartido`, `agendaKeys`, `enfrentamiento`, `NOMBRES_DE_ESTADO` y `marcarComoConvocado`; `core`, `usePlantilla`, `POSICIONES` y `DISPONIBILIDADES`; `rules`, `useCompeticion` |
| `rules/hooks/useCompeticiones.ts`         | `useCompeticion` espera con el identificador vacío: la A11 no lo sabe hasta leer el partido                                                                                                      |
| `shared/ui/GrupoDeOpciones`               | Prop `enLinea`: opciones una al lado de otra y abajo si no caben                                                                                                                                 |
| **DOC 05 §14.5**                          | Tres piezas para Cowork: `marcar_convocado()`, el máximo de convocados en la base y, opcional, el dorsal repetido                                                                                |
| **DOC 08** y `CLAUDE.md`                  | T-205 en ✅ y el estado al día                                                                                                                                                                   |

**Sin comprobar en el navegador**, porque aquí no se puede entrar con Google. Las pruebas montan la
pantalla entera con la red simulada; el viaje real está en «Comandos para verificar».

### Pruebas

**194 en verde**, 29 nuevas. Cada una se vio fallar antes de darla por buena: quince del modelo
contra un esbozo vacío, las diez de pantalla contra una pantalla vacía, y la del modelo que el
esbozo no tumbaba, las de `api/` y cinco de pantalla, otra vez, con un mutante a mano sobre la
línea que vigilan.

| Archivo                               | Casos | Qué vigila                                                                                                                                                                    |
| :------------------------------------ | ----: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lineup/model/convocatoria.test.ts`   |    16 | Propuesta desde la inscripción, lo guardado manda, no convocables y retirados, bajas al final, la cuenta, titulares exactos, máximo, dorsal fuera de rango y repetido         |
| `lineup/api/convocatoria.test.ts`     |     3 | Primera escritura sin convocar y con `created_by`, segunda sin él, `SIN_FILAS` con líneas de menos y parada si falla la primera                                               |
| `lineup/routes/Convocatoria.test.tsx` |    10 | Plantilla y motivos, convocar y guardar, titulares de menos, máximo, dorsal repetido junto a su campo, lo guardado, sin permiso para marcar, sin red, empezado, sin plantilla |

---

## DECISIONES TOMADAS

**Guardar exige la convocatoria válida.** Titulares exactos (L-03) y máximo (R-01), aunque el
DOC 04 pone R-02 como «aviso bloqueante antes de iniciar». `called` significa «convocatoria
guardada y validada» (§8.1): guardar una a medias y marcar el partido como convocado sería mentir.
Sin borradores a medias; si Isaac los echa en falta, se añade un «Guardar sin validar» que no
cambie el estado.

**Las líneas nuevas nacen sin convocar.** Guardar son dos peticiones: la primera crea con
`created_by` las líneas que faltan, como «no convocado», sin pisar las que hay; la segunda escribe
todas sin tocar `created_by`. Quien convocó primero sigue constando, un reintento no choca con lo
que ya llegó, y la base nunca ve de más a medio guardar: es lo que deja escribir el disparador de
R-01 del §14.5 sin que rechace un cambio de uno por otro con la convocatoria llena.

**Todo inscrito tiene línea**, también los no convocados (L-01). La primera vez se escriben todas.
El no convocado se guarda sin dorsal ni posición, y la próxima vez se le vuelve a proponer lo de
su inscripción.

**Si no puede pasar a «Convocado», la convocatoria se guarda igual y la pantalla lo dice.** El
permiso que falta es de `matches`, no de `match_squad`, y perder la convocatoria por eso no ayuda
a nadie (punto 40).

**La disponibilidad manda, y se lee de la inscripción.** Nada de `sanctions`: su cómputo no
existe todavía (punto 43).

**El dorsal repetido se mira solo entre convocados.** Dos jugadores de la plantilla no pueden
compartirlo (`squad_shirt_unique`), pero un dorsal cambiado para un partido puede coincidir con el
de uno que no va. Eso no molesta en el acta.

**La cuenta no es una región viva.** Cambia con cada toque y repetirla cansa; el radio ya anuncia
lo que se ha elegido. Los errores al guardar sí se anuncian, por la región única del `AppLayout`.

**Sin alineación gráfica ni sistema táctico.** E7-03 y E7-04 son de la V1.1 en el backlog.

---

## PENDIENTE DE LA TAREA

Nada de lo que pide la fila del DOC 08. Lo que falta es de la base y está en el DOC 05 §14.5.

---

## DEUDA TÉCNICA GENERADA

Los puntos 40 a 46 de abajo.

---

## LO QUE SIGUE ABIERTO

**No se cierra ningún punto de la lista anterior.** Se actualizan el 11 (ocho pantallas
pendientes) y el 32, que alcanza también a la A11. Se suman siete al final, del 40 al 46. La
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
11. **Ocho rutas comparten la misma `PantallaPendiente`.** Cada una la sustituye su tarea.
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
32. **El permiso de la A05, la A06 y, desde la T-205, la A11 lo mira la guardia en el equipo
    activo, no en el de la dirección.** Quien abra la plantilla de otro equipo del club ve lo que la RLS le deje leer, y al
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
38. **El calendario de la federación no se puede leer desde aquí.** El proxy de red de las sesiones
    en la nube bloquea `futboltenerife.com`. **Raúl pasó el código de la página del panel cadete, y de
    ahí salen los doce equipos del grupo y la jornada 1**, en
    `docs/recursos/cadete_primera_tenerife_g2_2026-27.md`: el Cadete A debuta el 4 de octubre a las
    12:00, fuera, contra el At. Tacoronte. **Esa página solo trae la jornada 1.** El calendario completo
    está en `https://futboltenerife.com/1cadete-primera-grupo-dos`: con su código se completa el
    archivo. Mientras, rivales y partidos se meten a mano. Leerla sola sería el _scraping_ de la fase
    6, fuera del MVP.
39. **La hora es la del móvil.** La fecha y la hora se escriben y se enseñan en la zona del
    dispositivo y se guardan en UTC. En Canarias es la hora canaria; un partido en la península se
    escribe con la hora canaria en la que empieza. Si algún día anotan dispositivos en zonas
    distintas, hace falta fijar la zona del club.
40. **Quien solo tiene `lineup.manage` no pasa el partido a «Convocado».** `matches_update` pide
    `schedule.manage`, `match.live.write` o `match.close`. La convocatoria se guarda igual y la A11
    lo dice. Isaac tiene los doce permisos y no lo nota; el día que convoque un delegado, sí.
    **Propuesta en el DOC 05 §14.5, pieza 5a**: una función `marcar_convocado()`. Pide migración:
    sesión de Cowork. Después, `marcarComoConvocado` pasa a llamar a la función.
41. **El máximo de convocados solo lo impide la pantalla.** El DOC 04 §4.3 dice que R-01 se
    comprueba también en la base, y no hay nada. **Propuesta en el DOC 05 §14.5, pieza 5b**: un
    disparador de sentencia. La A11 ya guarda de forma que ese disparador no la rechace a medias.
42. **El dorsal repetido entre convocados solo lo impide la pantalla.** Opcional, DOC 05 §14.5,
    pieza 5c.
43. **Nadie marca hoy a un jugador como «Sancionado».** La A11 bloquea por la disponibilidad de la
    inscripción (R-03, E7-05), y «Sancionado» lo pondrá el cómputo de sanciones, que no existe: la
    A16 es de después del MVP. Mientras, a un sancionado se le pone «No disponible» en la A06, y la
    A11 lo deja fuera igual. La tabla `sanctions` no se lee.
44. **Empezado el partido, la convocatoria no se corrige.** L-08 pide que corregirla obligue a
    «volver atrás de forma explícita». La A11 la enseña en solo lectura y ya está. Decidir en la
    T-207 o en la T-210 si hace falta ese paso atrás y quién lo da.
45. **Los titulares son exactamente `players_on_pitch`, también en un partido en diferido.** Si un
    día se juega con diez desde el principio, la A11 no deja guardar. Salida si pasa: bajar
    `players_on_pitch` de la competición para ese partido no vale, porque es de la competición;
    habría que permitir menos titulares con un aviso. Sin tocar hasta que ocurra.
46. **Quien se da de baja con convocatoria guardada sigue en ella.** La A11 lo enseña al final,
    «Ya no está en la plantilla: no se puede convocar», y al guardar lo pasa a no convocado. Su
    línea no se borra: los eventos apuntan a `match_squad` con `on delete restrict`.

Asumidas y sin fecha: el marco de la ventana vive en `App` como una pieza más entre el enrutador y
las maquetas; la siembra se lanza a mano; `useHasPermission` recibe `string` y no `AppPermission`;
`teams` del contexto devuelve membresías y no equipos pelados, a propósito; el club activo del
registro vive en una variable de módulo de `logging`; `sasi.equipo-activo` sobrevive al cierre de
sesión, a propósito; los rivales se duplican por club, como ya decía el DOC 05 §5.4 (E17-03);
«Sancionado» no se elige en la A06, lo pone el cómputo de sanciones; el calendario no enseña
entrenamientos, que llegan con su pantalla después del MVP; y la A11 lee la plantilla de la
temporada activa, que es la de todos los partidos que ofrece el calendario.

---

## EL PAQUETE, MEDIDO

| Momento                   | Inicial comprimido | Margen sobre 200 kB |
| :------------------------ | -----------------: | ------------------: |
| Tras la T-204, en Linux   |          179,92 kB |            20,08 kB |
| **Esta sesión, en Linux** |      **179,97 kB** |        **20,03 kB** |

**+0,05 kB, en `App-*.js`**: la entrada perezosa nueva. La pantalla vive en el trozo de `lineup`
(4,03 kB de JavaScript y 0,69 kB de estilos), que no se descarga al arrancar.

| Trozo del arranque         |    Comprimido |
| :------------------------- | ------------: |
| `index-*.js`               |      72,21 kB |
| `App-*.js`                 |     101,62 kB |
| `QueryClientProvider-*.js` |       0,26 kB |
| `workbox-window`           |       2,20 kB |
| Dos hojas de estilo        |       3,68 kB |
| **Total**                  | **179,97 kB** |

La lista buena de trozos sale de `dist/index.html` y de las importaciones de `App-*.js`. En crudo,
`precache 32 entries (753.24 KiB)`.

---

## SIGUIENTE

**Para una sesión de Cowork: la migración del DOC 05 §14.4 y, en la misma o aparte, el §14.5.**
Después, `npm run db:types`, el script de la T-105b y el auditor. Con el §14.5 aplicado,
`marcarComoConvocado` pasa a llamar a `marcar_convocado()`.

**Siguiente tarea de código: T-206**, capa offline: Dexie, precarga del partido y cola de salida.
**El hito del 4 de octubre** (DOC 08) es para ella: si ese día no está cerrada, la capa offline se
recorta. La **T-203b** va detrás de la migración, cuando esté.

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

`npm run test -- --run` tiene que decir `Test Files 21 passed (21)` y `Tests 194 passed (194)`. El
build, en verde y sin `INEFFECTIVE_DYNAMIC_IMPORT`.

**En el navegador, con `npm run dev` y la cuenta de Isaac o la tuya:**

1. Hace falta un partido «Programado» en la Agenda y jugadores en la plantilla. Si no hay, dalos
   de alta en Equipos y Agenda.
2. En la Agenda, «Convocatoria» del partido. Sale toda la plantilla como «No convocado», con la
   cuenta arriba: «Titulares: 0 de 11».
3. Marca un titular: aparecen su dorsal y su posición, ya rellenos desde la ficha.
4. Marca diez titulares y pulsa «Guardar convocatoria»: no deja, «Tienen que ser 11 titulares y
   hay 10».
5. Marca el undécimo y un par de suplentes, y guarda: vuelves al calendario y el partido sale
   como «Convocado».
6. Abre otra vez la convocatoria: sale lo guardado.
7. En la A06, pon a un convocado «No disponible» y vuelve a la convocatoria: sale sin opciones y
   con «Estaba convocado: se quita al guardar».
8. Con el móvil o con la ventana a 320 px: las tres opciones bajan de línea y no hay scroll
   lateral.

**`npm run db:types` NO se lanza a la ligera.** Esta sesión no tocó el esquema.

---

## AVISO DE SEGURIDAD

Sin cambios de configuración esta sesión: ni variables de entorno, ni Netlify, ni migraciones. **Las
migraciones del §14.4 y el §14.5 las aplica una sesión de Cowork contra la base de producción**:
con la consulta de duplicados antes y el script de la T-105b después. El aviso de Chrome
autorrellenando el panel de Google en Supabase sigue vigente para el día que haga falta abrirlo:
**vacía «Client IDs» y «Client Secret» antes de tocar nada.**
