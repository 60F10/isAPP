# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 26/09/2026 — T-207, esqueleto del directo: ✅ cerrada entera

Misma sesión en la nube que la T-205 y la T-206, sin acceso a Supabase. La T-206 se fusionó
(PR #46) y Raúl pidió seguir con la T-207. Antes de picar código, dos decisiones suyas:

| Pregunta                                                         | Decisión de Raúl                         |
| :--------------------------------------------------------------- | :--------------------------------------- |
| Punto 47: cómo entra la A12, que iba en el arranque y pide Dexie | **A12 perezosa**, como el resto (D06-29) |
| La T-207 entera o en dos entregas                                | **Entera** en esta sesión                |

Rama por convención `feat/match-directo-reloj`, subida a la rama de sesión, que se borró al
fusionar la PR #46: sube limpia desde `main`.

---

## HECHO

| Pieza                                  | Qué hace                                                                                                                                                                                                                                                                                                                                                               |
| :------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `match/model/directo.ts`               | El reductor puro (D06-04): inactivo, en juego, pausado, descanso y finalizado. Empezar parte (y el partido a `live` con la primera), pausar, reanudar, terminar y finalizar, cada una con sus filas. R-02 antes de empezar. `elegirEstado` (D06-31) y el marcador (DOC 04 §7.3)                                                                                        |
| `match/model/reloj.ts`                 | Segundos por anclaje con pausa (D06-15), `mm:ss` y el minuto de presentación con descuento: `35'`, `41'`, `40+2'`                                                                                                                                                                                                                                                      |
| `match/api/directo.ts`                 | Abre el directo: refresca la precarga si hay red y si no usa lo guardado; sin nada, `SIN_PRECARGA`. Guarda cada transición con sus filas (D06-30)                                                                                                                                                                                                                      |
| `sync` `encolarJunto`                  | Trabajos y otra escritura en una sola transacción de IndexedDB, con un milisegundo de diferencia entre trabajos para respetar el orden                                                                                                                                                                                                                                 |
| `match/api/precarga.ts`                | Trae el `id` de cada parte, y al refrescar conserva el estado del directo que hubiera en el aparato                                                                                                                                                                                                                                                                    |
| **A12** `match/routes/LiveMatchPage`   | Reloj de 44 px con cifras tabulares, parte y minuto, marcador con el local delante y «Incluye N goles sin aprobar», campo y banquillo por dorsal, controles de 72 px, confirmación en el mismo sitio para terminar parte y finalizar con el foco en la pregunta, aviso si faltan titulares con enlace a la convocatoria, salida con aviso de cola, aviso sin cobertura |
| `match/hooks/useBloqueoDePantalla`     | `wakeLock` mientras el partido está en curso, pedido otra vez al volver a la pestaña; dice si el navegador no puede                                                                                                                                                                                                                                                    |
| `shared/lib/partidoEnCurso.ts`         | La marca que calla el aviso de versión nueva (D06-32). Caduca a las cuatro horas                                                                                                                                                                                                                                                                                       |
| `app/router.tsx` y barril de `match`   | La A12 y la A11 con precarga, perezosas por el barril de `match` (D06-29)                                                                                                                                                                                                                                                                                              |
| DOC 06 v2.2, DOC 08 v2.6 y `CLAUDE.md` | D06-29 a D06-32 y el estado                                                                                                                                                                                                                                                                                                                                            |

**Sin comprobar en el navegador ni con Supabase**: aquí no se entra con Google, y la pantalla lee
de IndexedDB lo que precarga la sesión.

### Pruebas

**293 en verde**, 53 nuevas. Cada una se vio fallar: contra un esbozo vacío las del modelo, la
marca y la pantalla, y con un mutante a mano sobre la línea que vigilan las demás y las que el
esbozo no tumbaba. Entre ellas, que la pantalla no cambie de estado si guardar falla.

| Archivo                                       | Casos | Qué vigila                                                                                                                            |
| :-------------------------------------------- | ----: | :------------------------------------------------------------------------------------------------------------------------------------ |
| `match/model/reloj.test.ts`                   |     8 | Anclaje, pausa congelada, parte cerrada, nunca negativo, `mm:ss`, minuto en curso, segunda parte, descuento                           |
| `match/model/directo.test.ts`                 |    18 | Estado desde el servidor, cada transición con sus filas, R-02, tercera parte, finalizar, ilegales, en curso, marcador, `elegirEstado` |
| `match/api/directo.test.ts`                   |     7 | Con y sin cobertura, sin precarga, estado del aparato, guardar sin trabajos, con trabajos, sin instantánea                            |
| `match/routes/LiveMatchPage.test.tsx`         |     9 | Apertura, empezar, fallo al guardar, confirmar con foco, faltan titulares, finalizar, sin precarga, sin cobertura, salida             |
| `sync/api/almacen.test.ts`                    |     3 | Misma transacción, orden de la lista, sin sesión                                                                                      |
| `shared/lib/partidoEnCurso.test.ts`           |     5 | Marcar y quitar, caducidad, marca de otro partido, marca estropeada, aviso a los oyentes                                              |
| `app/components/ActualizacionDisponible.test` |     2 | Sale sin partido; se calla con partido y sale al terminar                                                                             |
| `match/api/precarga.test.ts`                  |    +1 | Conserva el estado del directo al refrescar                                                                                           |

---

## DECISIONES TOMADAS

Las de arquitectura están en el DOC 06: **D06-29** (A12 perezosa), **D06-30** (estado y cola en
una transacción), **D06-31** (qué estado manda al abrir) y **D06-32** (la marca de partido en
curso).

**Lo ilegal no lanza.** El reductor devuelve el mismo estado, ningún trabajo y el motivo en
palabras, que la pantalla enseña y anuncia.

**Terminar una parte y finalizar piden confirmación en el mismo sitio.** Sin ventana emergente,
con el foco en la pregunta y «Seguir jugando» a mano. Empezar, pausar y reanudar no la piden: se
deshacen con el botón de al lado.

**El minuto sigue la fórmula del DOC 04 §5.3**, `⌊segundos ÷ 60⌋ + 1`: en el 34:12 se enseña
`35'`. El ejemplo de la tabla del DOC 04 dice `34'`, y no cuadra con su propia fórmula.

**«Quién está en el campo» son los titulares.** Los cambios lo moverán desde la T-208.

**El foco va a cada confirmación y vuelve a los controles al cerrarla.** Lo señaló el
`revisor`: sin esto, al desmontarse el botón el foco caía a `body`. El aviso de salida con cola,
además, se anuncia. «Salir del directo» se queda en 48 px a propósito, y sus dos botones de
confirmación suben a 72.

**El reloj no es región viva.** Cambia cuatro veces por segundo. Se anuncian las transiciones.

---

## PENDIENTE DE LA TAREA

De la fila del DOC 08, los **tramos**: no se recalculan desde el directo (punto 58). El resto,
hecho.

---

## DEUDA TÉCNICA GENERADA

Los puntos 55 a 61 de abajo. **El 55 y el 59 son de la T-208**: los segundos con pausa y el modo
diferido.

---

## LO QUE SIGUE ABIERTO

Se cierran el 3, el 47 y el 52, y se decide el 51. Se suman siete, del 55 al 61. La numeración no
cambia.

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

3. **Cerrado en la T-207.** El aviso de versión nueva se calla con un partido en curso en el
   dispositivo, y sale solo al finalizarlo (D06-32).
4. El
   punto de enganche está comentado en `ActualizacionDisponible.tsx`:
   `if (!hayVersionNueva || partidoEnCurso) return null;`. Lo cierra la T-207.
5. **`set_updated_at()` arrastra el `EXECUTE` de `authenticated` que no necesita.** **Va en la
   migración del DOC 05 §14.4**, pieza 4b.
6. **`npm run db:types` deja el archivo de tipos a cero bytes si el CLI falla.** Se restaura con
   `git checkout -- src/types/database.types.ts`. **Antes de tocar ese script, haz copia.**
7. Marcar `event.approve` a quien lleve el registro, cuando exista la T-301.
8. **Los cubos de Storage `crests` y `docs`, sin crear.** Sin `crests` no hay escudo en la A03 ni en
   los equipos. El logo del C.D. Unión Tejina está en `docs/recursos/escudo-cd-union-tejina.png`,
   listo para subirlo. Pide una sesión de Cowork: crear el cubo, sus políticas y la subida desde la A03.
9. Los alias viven duplicados en `tsconfig.app.json` y en `vite.config.ts`, a mano.
10. `/admin/logs` sigue sin guardia de permiso: el DOC 05 §4 no define ninguno de administración.
    Lo resuelve la T-303.
11. Faltan tokens de anchura de maqueta en el DOC 07: el rail y la caja de `BareLayout` salen de
    `--tap-min`.
12. **Ocho rutas comparten la misma `PantallaPendiente`.** Cada una la sustituye su tarea.
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
16. **Netlify tiene los despliegues PARADOS desde el 20/09** (DOC 10 §2.2). Fusionar a `main` no
    publica nada hasta reactivarlos a mano: ni la T-106, ni la T-107, ni la T-201 están en el sitio
    publicado.
17. **`esErrorDeCliente` no reconoce un error de Supabase**, así que los 4xx se reintentan dos veces
    en vez de rendirse a la primera. Se arregla con el «ayudante común» del DOC 06 §10.1, que
    todavía no está completo ni tiene tarea asignada. **La T-203 muda a `shared/lib/guardado.ts`**
    lo que ya había: `SIN_FILAS`, `mensajeDeErrorAlGuardar` y `limpiarTexto`. Falta envolver cada
    `{ data, error }` y que `esErrorDeCliente` reconozca el error de Supabase.
18. **No hay forma de que entre nadie más.** Ni alta propia, ni invitación, ni hacerse seguidor: la
    tabla `invitations` existe y no la usa ninguna pantalla. Es la T-301, y **la idea de Raúl de
    elegir equipo como seguidor al entrar se apunta aquí**: hace falta decidirla en el DOC 03,
    porque pide tocar la RLS de `team_followers`.
19. **A01b no está en el inventario del DOC 02.** O entra como parada técnica, o se le da otro sitio.
20. **El contrato de `AuthState` mezcla idiomas**: `cargando`, `permisos` y `reintentarContexto`
    junto a `profile` y `activeTeamId`. Decidir y unificar con el DOC 06 §5.5.
21. **Un club puede enlazar objetos de otro club en sus propias filas** (los catorce avisos de la
    T-105b). Ninguna clave ajena exige que los dos lados sean del mismo club, y `team_of_match`
    devuelve el equipo de cualquier partido. Las pantallas de la T-201 a la T-204 no pueden mezclar clubes: el alta de jugador lo inscribe
    en su propio equipo, y la A10 solo ofrece los rivales y las competiciones del propio club. Lo que
    queda abierto es que **la base tampoco lo impida**, por si algún día escribe algo que no sea la
    pantalla. No está en la migración del §14.4; decidir si entra. Pide migración: sesión de Cowork.
22. **`noUncheckedIndexedAccess` apagado.** Saca siete errores, seis en `permissions.test.ts` y uno
    en `permissions.ts:120`. Salidas: encenderlo ya (media hora, recomendada: el coste crece con cada
    lista que pinte una pantalla), después del MVP, o nunca y revisar a mano.
23. **Los fallos sin sesión no llegan a `error_logs`.** La RLS solo deja insertar a
    `authenticated`. Abrirla a `anon` abre la puerta a llenar la tabla desde fuera. Decidir en el
    DOC 03 si hace falta verlos.
24. **El trozo de `App` no se precarga desde `index.html`** (D06-23): un viaje de red más en la
    primera visita. Un plugin de Vite de diez líneas que añada su `modulepreload` lo arregla.
25. **Las preferencias de pantalla viven en el dispositivo** (D06-25). Salidas: una columna
    `preferences jsonb` en `profiles` con `localStorage` como caché para arrancar sin red
    —recomendada—; o dejarlo así y corregir el DOC 07. Pide migración: sesión de Cowork.
26. **Cerrado en la T-206.** La C01 cuenta la cola antes de salir y, si hay algo, lo dice con el
    número por delante y pide confirmar. Lo pendiente no se pierde: se queda en el dispositivo y
    sale cuando vuelve a entrar esa cuenta (D06-27).
27. **El alta de un club nuevo no se puede hacer desde la aplicación.** `clubs_insert` deja crear el
    club, pero `clubs_select` y `teams_insert` piden ser miembro del club, y en uno nuevo no lo es
    nadie: el club nace invisible y sin forma de meterle un equipo. Salidas:

    | Salida                                                                                                                                                                                   | Consecuencia                                                                                                                                                                                               |
    | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | **A. Seguir sembrando a mano** con `seed.sql`                                                                                                                                            | Cero trabajo. Basta mientras haya un solo club, que es el caso del MVP. **Recomendada hasta la liga**                                                                                                      |
    | **B. Una función `crear_club()` `SECURITY DEFINER`** que, en una transacción, cree el club, su primer equipo, la temporada en curso y al que llama como entrenador con los doce permisos | No toca ninguna política: la lógica queda en un sitio y se prueba con el script de la T-105b. La A03 ganaría el alta. **Recomendada para cuando llegue un segundo club**. Pide migración: sesión de Cowork |
    | C. Aflojar políticas: que `created_by` baste para leer el club y crear el primer equipo                                                                                                  | Toca tres políticas y abre casos raros (¿y el segundo equipo?, ¿y los permisos del creador?). La cola pidió no tocar la RLS para esto                                                                      |

28. **`teams_insert` pide menos que el DOC 05.** Solo `is_club_member`, no `team.manage`. **Va en la
    migración del DOC 05 §14.4**, pieza 4a.
29. **Un equipo propio nuevo nace sin personas.** Nadie tiene `roster.manage` ni ningún otro
    permiso en él hasta que existan las invitaciones (T-301), así que su plantilla y sus partidos
    no los puede llevar nadie. La pantalla lo avisa al marcar «Del club». Para el Cadete A no
    importa: ya está sembrado.
30. **Un jugador del club no se puede inscribir en un segundo equipo.** El alta de la A05 siempre
    crea un jugador nuevo. Si el mismo chico juega en el Cadete A y en el Cadete B, quedan dos
    jugadores con el mismo apodo y sus estadísticas separadas. Salida: en la A05, un «Inscribir a
    alguien del club» que liste los jugadores del club sin inscripción en este equipo. Solo
    frontend, sin migración. Con un solo equipo gestionado no molesta.
31. **No hay lista de bajas ni reincorporación.** La baja rellena `left_on` y el jugador
    desaparece de la A05. Volver a darlo de alta crea otro jugador (punto 29). Salida: una lista
    plegada de «Bajas de esta temporada» con «Reincorporar», que vacía `left_on`.
32. **La ficha guarda en dos peticiones** (inscripción y apodo), y el alta en dos más un borrado
    compensatorio. Si falla la segunda, la primera ya está guardada; si falla también el borrado,
    queda un jugador sin inscribir en el club, invisible en toda plantilla. Salida: una función
    `SECURITY DEFINER` por operación, que es trabajo de migración.
33. **El permiso de la A05, la A06 y, desde la T-205, la A11 lo mira la guardia en el equipo
    activo, no en el de la dirección.** Quien abra la plantilla de otro equipo del club ve lo que la RLS le deje leer, y al
    guardar recibe «No tienes permiso» si no tiene `roster.manage` en ese equipo. No hay fuga, pero
    sí una pantalla que ofrece lo que no puede hacer. Salida: comprobar el permiso del equipo de la
    ruta con las membresías de `useAuth()`.
34. **La categoría de la competición va en el nombre.** **Decidido por Raúl el 26/09: columnas
    propias.** `competitions` ganará `category`, `level`, `scope` y `group_label` en la migración del
    DOC 05 §14.4, y la **T-203b** las pondrá en la A08. Hasta entonces, sigue escrita en el nombre.
35. **El nombre de la competición no es único en la base.** **Decidido por Raúl el 26/09: se
    arregla.** Índice único sobre `(club_id, season_id, lower(name))`, en la migración del DOC 05
    §14.4. Antes de crearlo, la consulta de duplicados que trae el propio §14.4.
36. **Los ocho tipos de evento fuera del MVP no se encienden desde la A08.** No tienen botón en el
    directo, y encenderlos prometería algo que no existe. Si alguien los enciende en la base, la A08
    los conserva al guardar. Cuando se construya su botón, se añaden a la lista de la ficha.
37. **No se borran competiciones.** La RLS lo permite, pero los partidos apuntan a su competición con
    `on delete restrict`, y una con partidos no se puede borrar. Una sin partidos mal creada se
    renombra. Si molesta, un «Borrar» que solo salga sin partidos.
38. **El campo de casa del club no vive en la base.** Raúl dio el del C.D. Unión Tejina: **Campo de
    Fútbol Izquierdo Rodríguez**, Av. Milán, 27-29, 38260 La Laguna, Santa Cruz de Tenerife. Va a
    `clubs.home_venue` y `clubs.home_venue_address` con la migración del DOC 05 §14.4, y la T-203b lo
    propondrá en la A10. Hasta entonces, la A10 propone el campo del último partido en casa: se
    escribe la primera vez y a partir de ahí sale solo.
39. **El calendario de la federación no se puede leer desde aquí.** El proxy de red de las sesiones
    en la nube bloquea `futboltenerife.com`. **Raúl pasó el código de la página del panel cadete, y de
    ahí salen los doce equipos del grupo y la jornada 1**, en
    `docs/recursos/cadete_primera_tenerife_g2_2026-27.md`: el Cadete A debuta el 4 de octubre a las
    12:00, fuera, contra el At. Tacoronte. **Esa página solo trae la jornada 1.** El calendario completo
    está en `https://futboltenerife.com/1cadete-primera-grupo-dos`: con su código se completa el
    archivo. Mientras, rivales y partidos se meten a mano. Leerla sola sería el _scraping_ de la fase
    6, fuera del MVP.
40. **La hora es la del móvil.** La fecha y la hora se escriben y se enseñan en la zona del
    dispositivo y se guardan en UTC. En Canarias es la hora canaria; un partido en la península se
    escribe con la hora canaria en la que empieza. Si algún día anotan dispositivos en zonas
    distintas, hace falta fijar la zona del club.
41. **Quien solo tiene `lineup.manage` no pasa el partido a «Convocado».** `matches_update` pide
    `schedule.manage`, `match.live.write` o `match.close`. La convocatoria se guarda igual y la A11
    lo dice. Isaac tiene los doce permisos y no lo nota; el día que convoque un delegado, sí.
    **Propuesta en el DOC 05 §14.5, pieza 5a**: una función `marcar_convocado()`. Pide migración:
    sesión de Cowork. Después, `marcarComoConvocado` pasa a llamar a la función.
42. **El máximo de convocados solo lo impide la pantalla.** El DOC 04 §4.3 dice que R-01 se
    comprueba también en la base, y no hay nada. **Propuesta en el DOC 05 §14.5, pieza 5b**: un
    disparador de sentencia. La A11 ya guarda de forma que ese disparador no la rechace a medias.
43. **El dorsal repetido entre convocados solo lo impide la pantalla.** Opcional, DOC 05 §14.5,
    pieza 5c.
44. **Nadie marca hoy a un jugador como «Sancionado».** La A11 bloquea por la disponibilidad de la
    inscripción (R-03, E7-05), y «Sancionado» lo pondrá el cómputo de sanciones, que no existe: la
    A16 es de después del MVP. Mientras, a un sancionado se le pone «No disponible» en la A06, y la
    A11 lo deja fuera igual. La tabla `sanctions` no se lee.
45. **Empezado el partido, la convocatoria no se corrige.** L-08 pide que corregirla obligue a
    «volver atrás de forma explícita». La A11 la enseña en solo lectura y ya está. Decidir en la
    T-207 o en la T-210 si hace falta ese paso atrás y quién lo da.
46. **Los titulares son exactamente `players_on_pitch`, también en un partido en diferido.** Si un
    día se juega con diez desde el principio, la A11 no deja guardar. Salida si pasa: bajar
    `players_on_pitch` de la competición para ese partido no vale, porque es de la competición;
    habría que permitir menos titulares con un aviso. Sin tocar hasta que ocurra.
47. **Quien se da de baja con convocatoria guardada sigue en ella.** La A11 lo enseña al final,
    «Ya no está en la plantilla: no se puede convocar», y al guardar lo pasa a no convocado. Su
    línea no se borra: los eventos apuntan a `match_squad` con `on delete restrict`.
48. **Cerrado en la T-207.** Raúl eligió la salida A: la A12 es perezosa (D06-29).
49. **Lo rechazado por el servidor no se puede descartar ni reintentar desde la interfaz.** La C04
    lo cuenta y enseña lo que dijo el servidor, plegado. Se queda en la cola sin purgarse, a
    propósito: nadie lo ha revisado. La T-210 (cierre y discordancias) es su sitio natural.
50. **Una sola conversión de tipo en la cola.** `sync/api/transporte.ts` entrega la fila con
    `as never`, porque la cola guarda JSON y no sabe qué es un gol. El tipo tiene que comprobarse
    al encolar: **la T-208 envuelve `encolar` en `match` con los tipos generados**
    (`TablesInsert<'match_events'>`), para que ningún evento salga sin comprobar.
51. **Nadie encola todavía.** La cola está probada con un almacén en memoria, con el transporte
    simulado y con IndexedDB de verdad en Chromium, pero el viaje entero hasta Supabase lo estrena
    la T-208 con el primer evento.
52. **Decidido en la T-207: la C04 se queda también en el directo.** «Sin conexión» es justo lo que
    hay que ver a pie de campo, y ya dice cuánto queda por enviar. No se añade el «⚠N» de la
    cabecera del DOC 02 §4 para no decir lo mismo dos veces. Si la botonera de la T-208 necesita
    ese alto, se revisa.
53. **Cerrado en la T-207.** Salir del directo con anotaciones sin enviar lo dice antes, con el
    número por delante, y deja quedarse.
54. **La precarga y los eventos locales no se purgan.** `purgarPartido` limpia lo enviado de la
    cola; `matchSnapshots` y `matchEvents` crecen con cada partido. Pocos kilobytes por partido;
    la T-210 los limpia al cerrar.
55. **La segunda precarga, al guardar la convocatoria, falla en silencio.** La pantalla ya ha
    navegado. La siguiente entrada en la convocatoria o en el directo lo vuelve a intentar, y el
    directo tendrá que decir si su precarga es vieja.
56. **La pausa es local** (DOC 06 §8.8). El servidor deriva los segundos de un
    evento de `started_at` y no la conoce. **La T-208 tiene que mandar `seconds` calculado en el
    aparato**, no solo `occurred_at`, al menos cuando la parte haya tenido pausa; si no, los
    eventos de después de una pausa llevarán el minuto corrido de más. Y otro aparato verá otro
    reloj.
57. **Dos aparatos pueden abrir la misma parte.** El segundo choca con el índice único de
    `(match_id, period_number)`, la cola lo trata como éxito y su reloj sigue anclado a su propio
    arranque. Al terminar la parte, su `update` por `id` no toca filas y queda como rechazado. **Es
    de la T-209** (varios anotadores): un solo dueño del reloj, o refrescar las partes del servidor
    al recibir la de otro.
58. **Sin estado `suspendido`.** El DOC 04 §8.1 lo tiene, con su minuto. El esqueleto solo lleva
    a `finished`. Entra con el cierre (T-210) o antes si un amistoso lo pide.
59. **Los tramos oficiales no se recalculan desde el directo.** `rebuild_match_stints` solo mira
    eventos aprobados y la cola no llama a funciones. Se lanza al cerrar (T-210). En el directo,
    «quién está en el campo» es estado de pantalla, como pide el DOC 04 §6.5.
60. **El partido en diferido no tiene todavía su modo.** El DOC 04 §5.4 lo quiere con el reloj
    parado y el minuto a mano en cada evento. Hoy la A12 lo trata como uno normal. Es de la T-208,
    que es la que pide el minuto.
61. **Falta la banda «Partido en directo · mm:ss · Volver»** en el resto de pantallas (DOC 02
    §3.1). La marca de `shared/lib/partidoEnCurso.ts` ya dice qué partido está en curso; falta la
    banda. Sin tarea asignada.
62. **Sin comprobar en el navegador**: ni el reloj a 7:1 al sol, ni el bloqueo de pantalla en un
    móvil de verdad. Los colores salen de los tokens del directo del DOC 07.

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
| Tras la T-206, en Linux   |          180,61 kB |            19,39 kB |
| **Esta sesión, en Linux** |      **180,97 kB** |        **19,03 kB** |

**+0,36 kB**: la marca de partido en curso y el aviso de versión, que viven en el arranque. El
esqueleto de la A12 que antes iba en él era diminuto. El directo vive ahora en `match-*.js`
(9,38 kB) y Dexie, dentro de `sync-*.js` (34,27 kB); ninguno de los dos baja al arrancar.

| Trozo del arranque         |    Comprimido |
| :------------------------- | ------------: |
| `index-*.js`               |      72,23 kB |
| `announceContext-*.js`     |      55,60 kB |
| `App-*.js`                 |      47,00 kB |
| `QueryClientProvider-*.js` |       0,26 kB |
| `workbox-window`           |       2,20 kB |
| Dos hojas de estilo        |       3,68 kB |
| **Total**                  | **180,97 kB** |

Se mide recorriendo las importaciones estáticas desde `dist/index.html` y desde `App-*.js`. En
crudo, `precache 36 entries (877.47 KiB)`.

---

## SIGUIENTE

**Para una sesión de Cowork: la migración del DOC 05 §14.4 y el §14.5**, sin cambios.

**Siguiente tarea de código: T-208**, la botonera: `Acción → Jugador → Detalle opcional →
Guardado`, háptica y confirmación de 2 s. Lleva tres encargos de aquí: tipar las filas que encola
(punto 49), mandar `seconds` calculado en el aparato (punto 55) y el modo diferido (punto 59). Los
cambios y las expulsiones mueven `enCampo` en el reductor.

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

`npm run test -- --run` tiene que decir `Test Files 34 passed (34)` y `Tests 293 passed (293)`. El
build, en verde y sin `INEFFECTIVE_DYNAMIC_IMPORT`.

**En el navegador, con `npm run dev`, tu cuenta y un partido convocado:**

1. Entra en su convocatoria: «Partido listo para usar sin conexión». Después, en su directo
   (`/partidos/<id>/directo`).
2. Sale a cero, «Sin empezar», con el marcador y los titulares en el campo. «Empezar la 1ª
   parte»: el reloj corre y el minuto sale al lado.
3. Recarga la página: el reloj sigue donde iba, no vuelve a cero.
4. «Pausar el reloj», espera, «Reanudar»: el reloj no ha contado la pausa.
5. «Terminar la 1ª parte» → «Seguir jugando»: no pasa nada. Otra vez → «Sí, terminar la parte»:
   «Descanso». En Supabase, `match_periods` tiene la parte con `ended_at` y `actual_seconds`, y el
   partido está en `live`.
6. Con DevTools en «Sin conexión», empieza la 2ª parte: la banda dice que hay anotaciones por
   enviar. Vuelve la red: se envían solas.
7. Termina la 2ª y «Finalizar el partido»: el partido queda en `finished`.
8. En un móvil: la pantalla no se apaga mientras el partido está en juego.

**`npm run db:types` NO se lanza a la ligera.** Esta sesión no tocó el esquema.

---

## AVISO DE SEGURIDAD

Sin cambios de configuración: ni variables de entorno, ni Netlify, ni migraciones. El directo
escribe en `matches` (estado) y `match_periods` (partes) a través de la cola, con la RLS de
siempre: `match.live.write`. Nada de nombres reales en IndexedDB ni en la marca de partido en
curso, que solo guarda el identificador del partido. Las migraciones del §14.4 y el §14.5 las
aplica una sesión de Cowork contra la base de producción. El aviso de Chrome autorrellenando el
panel de Google en Supabase sigue vigente para el día que haga falta abrirlo: **vacía «Client
IDs» y «Client Secret» antes de tocar nada.**
