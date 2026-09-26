# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 26/09/2026 — T-208, botonera del directo: ✅ cerrada entera

Misma sesión en la nube que las T-205 a T-207, sin acceso a Supabase. La T-207 se fusionó
(PR #47) y Raúl pidió la T-208 y, después, lo que se pueda adelantar fuera de la cola principal.
Rama por convención `feat/match-directo-botonera`, subida a la rama de sesión.

**Arreglo de este documento.** Al cerrar el punto 3 en la T-207 se coló un trozo suelto que
Prettier convirtió en otro punto, y desde el 4 la lista iba desplazada uno. Está corregido: cada
número vuelve a ser el punto que citan el DOC 08 y los mensajes de commit.

---

## HECHO

| Pieza                                   | Qué hace                                                                                                                                                                                                                                                   |
| :-------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `match/model/eventos.ts`                | Los eventos del aparato y lo que se deriva: quién está en el campo, expulsados, sustituidos, amonestados, cambios hechos, posiciones y marcador. Une los locales con los del servidor                                                                      |
| `match/model/registro.ts`               | Registrar y deshacer. Valida contra el reglamento (R-04 a R-07 y R-09), convierte la amarilla de un amonestado en segunda amarilla y construye la fila con `TablesInsert<'match_events'>`. Segundos del aparato; en diferido, a mano, y la parte que falte |
| `match/model/flujo.ts`                  | Los ocho botones con su definición (DOC 04 §7.6) y sus pasos. Solo ofrece candidatos válidos. La ficha de jugador es el mismo flujo con el jugador puesto                                                                                                  |
| `match/model/describir.ts` y `reloj.ts` | «Gol · 7 · Juanito · 35'» y el minuto escrito a mano («35», «40+2») a segundos                                                                                                                                                                             |
| `match/model/directo.ts`                | El estado gana titulares, convocados, eventos, cambios, tipos activos y diferido; las acciones `registrar` y `deshacer`. Sin reloj en diferido                                                                                                             |
| `match/api/directo.ts`                  | Suma los eventos del servidor al estado del aparato y descarta un estado guardado con la forma de la T-207                                                                                                                                                 |
| **A12**                                 | Botonera, flujo paso a paso con el foco en cada pregunta, ficha de jugador desde el campo, confirmación de 2 s con vibración, «Últimos eventos» con estado en palabras y «Deshacer»                                                                        |
| **DOC 05 §14.6**                        | Hallazgo para Cowork: que la base fije el estado del evento según `event.approve`                                                                                                                                                                          |
| DOC 06 v2.3, DOC 08 v2.7 y `CLAUDE.md`  | D06-33 y el estado                                                                                                                                                                                                                                         |

**Sin probar en el navegador ni con Supabase.**

### Pruebas

**348 en verde**, 55 nuevas. Cada una se vio fallar: contra un esbozo vacío las de `eventos`,
`flujo` y `describir`, y con un mutante por regla las de `registro` (trece) y las de pantalla
(ocho). Dos fallos de verdad salieron por el camino: el nombre accesible de los botones de evento
juntaba nombre y definición sin espacio («GolBalón…»), y ahora el nombre es la acción y la
definición va como descripción; y el modelo que describe eventos importaba el barril de `rules`,
que arrastraba el cliente de Supabase a una función pura.

| Archivo                           | Casos | Qué vigila                                                                                                                                                                            |
| :-------------------------------- | ----: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `match/model/eventos.test.ts`     |     8 | Filas del servidor, unión, campo con cambios y expulsiones, pendientes y rechazados, listas derivadas, posiciones, marcador                                                           |
| `match/model/registro.test.ts`    |    18 | Fila tipada, pendiente o aprobado, rival, gol y asistencia, segunda amarilla, tarjeta a suplente, no convocado, R-04, R-05, R-07, descanso, posición, nota, fases, diferido, deshacer |
| `match/model/flujo.test.ts`       |     9 | Botonera activa, pasos de gol, cambio y tarjeta, diferido, ficha, borrador de cada botón, minuto, candidatos                                                                          |
| `match/model/describir.test.ts`   |     5 | Tipo, jugador y minuto; asistencia; cambio; rival y córner; sin segundos                                                                                                              |
| `match/model/reloj.test.ts`       |    +3 | El minuto escrito a mano, con descuento y fuera de parte                                                                                                                              |
| `match/api/directo.test.ts`       |    +2 | Estado viejo descartado, eventos del servidor sumados                                                                                                                                 |
| `match/routes/LiveMatchPage.test` |   +11 | Gol con confirmación y vibración, aprobado, ficha con foco, cambio, cambios agotados, atrás y cancelar, fallo al guardar, deshacer, sin botonera sin empezar, diferido                |

---

## DECISIONES TOMADAS

La de arquitectura, en el DOC 06: **D06-33**.

**El origen del gol no se pide en el directo** (punto 63). **La asistencia sí**, con «Sin
asistencia» a mano: es un toque y el DOC 04 la pone en el flujo.

**Una amarilla a un amonestado es segunda amarilla**, sin botón aparte: un toque menos, y el
aparato ya sabe quién tiene amarilla. Sin la segunda amarilla encendida en la competición, se
apunta como roja.

**Las tarjetas se pueden sacar a suplentes** (DOC 04 §6.4); goles, faltas y cambios de posición,
solo a quien está en el campo.

**En el descanso**, un cambio va al segundo 0 de la parte siguiente (DOC 04 §5.2); lo demás, al
final de la que acaba de terminar.

**La confirmación de 2 s no se anuncia dos veces**: el `Toast` lleva su región viva, así que el
registro no pasa por la región única del marco.

**Lo que arregló la revisión.** El botón «Cambio» se desactiva con los cambios agotados y dice
por qué (R-04 pide que se deshabilite, y antes se hacía el flujo entero para rechazarlo al
final); si guardar falla, el flujo se queda en su último paso con lo respondido; el error del
flujo va en una región viva que existe siempre; y la ficha de jugador lleva el foco a su título.

**Deshacer solo lo apuntado en este aparato.** Lo de otros se corrige en el cierre (T-210).

---

## PENDIENTE DE LA TAREA

Nada de la fila del DOC 08.

---

## DEUDA TÉCNICA GENERADA

Los puntos 62 a 67 de abajo.

---

## LO QUE SIGUE ABIERTO

Se cierran el 49, el 55 y el 59, y se pone al día el 50. Se suman seis, del 62 al 67.

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
16. **Cerrado fuera de la cola** (`fix/platform-reintentos-4xx`). `esErrorDefinitivo`, en `shared/lib/guardado.ts`, reconoce el error de Supabase por su `status` HTTP o por su código de PostgreSQL. TanStack Query deja de reintentar lo que no se arregla repitiendo: un 4xx, `SIN_FILAS` o un código de PostgreSQL que no sea de conexión ni de sesión. Sí reintenta el 401, el 408 y el 429, los errores de red y los de clase 08, 53, 57, 58 y XX.
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
23. **Cerrado fuera de la cola** (`build/platform-precarga-app`). El plugin `precargarApp()` de `vite.config.ts` añade a `index.html` un `modulepreload` para el trozo de `App` y sus importaciones estáticas. Comprobado en Chromium: cada trozo se pide una sola vez.
24. **Las preferencias de pantalla viven en el dispositivo** (D06-25). Salidas: una columna
    `preferences jsonb` en `profiles` con `localStorage` como caché para arrancar sin red
    —recomendada—; o dejarlo así y corregir el DOC 07. Pide migración: sesión de Cowork.
25. **Cerrado en la T-206.** La C01 cuenta la cola antes de salir y, si hay algo, lo dice con el
    número por delante y pide confirmar. Lo pendiente no se pierde: se queda en el dispositivo y
    sale cuando vuelve a entrar esa cuenta (D06-27).
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
29. **Cerrado fuera de la cola** (`feat/core-inscripciones-del-club`). La A05 tiene «Inscribir a alguien del club»: lista los jugadores del club sin inscripción en este equipo y temporada, con su apodo y nada más, y los inscribe sin crear un jugador nuevo.
30. **Cerrado fuera de la cola** (`feat/core-inscripciones-del-club`). La A05 tiene «Bajas de esta temporada», plegada, con «Reincorporar», que vacía `left_on`. Si otro jugador ha cogido el dorsal, la reincorporación entra sin dorsal y lo dice.
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
47. **Cerrado en la T-207.** Raúl eligió la salida A: la A12 es perezosa (D06-29).
48. **Lo rechazado por el servidor no se puede descartar ni reintentar desde la interfaz.** La C04
    lo cuenta y enseña lo que dijo el servidor, plegado. Se queda en la cola sin purgarse, a
    propósito: nadie lo ha revisado. La T-210 (cierre y discordancias) es su sitio natural.
49. **Cerrado en la T-208.** Cada evento y cada parte en diferido salen comprobados contra
    `TablesInsert` al construirse, en `match/model/registro.ts`. La conversión de `transporte.ts`
    sigue, pero ya no entrega nada sin comprobar.
50. **La cola ya tiene quien encola: la A12.** Sigue sin probarse el viaje entero hasta
    Supabase, porque desde aquí no se entra con Google. Es lo primero que hay que mirar en el
    navegador (comandos de abajo).
51. **Decidido en la T-207: la C04 se queda también en el directo.** «Sin conexión» es justo lo que
    hay que ver a pie de campo, y ya dice cuánto queda por enviar. No se añade el «⚠N» de la
    cabecera del DOC 02 §4 para no decir lo mismo dos veces. Si la botonera de la T-208 necesita
    ese alto, se revisa.
52. **Cerrado en la T-207.** Salir del directo con anotaciones sin enviar lo dice antes, con el
    número por delante, y deja quedarse.
53. **La precarga y los eventos locales no se purgan.** `purgarPartido` limpia lo enviado de la
    cola; `matchSnapshots` y `matchEvents` crecen con cada partido. Pocos kilobytes por partido;
    la T-210 los limpia al cerrar.
54. **La segunda precarga, al guardar la convocatoria, falla en silencio.** La pantalla ya ha
    navegado. La siguiente entrada en la convocatoria o en el directo lo vuelve a intentar, y el
    directo tendrá que decir si su precarga es vieja.
55. **Cerrado en la T-208.** El aparato manda `seconds` calculado con la pausa descontada, y
    `occurred_at` al lado. Queda que otro aparato no ve la pausa en su reloj: es de la T-209.
56. **Dos aparatos pueden abrir la misma parte.** El segundo choca con el índice único de
    `(match_id, period_number)`, la cola lo trata como éxito y su reloj sigue anclado a su propio
    arranque. Al terminar la parte, su `update` por `id` no toca filas y queda como rechazado. **Es
    de la T-209** (varios anotadores): un solo dueño del reloj, o refrescar las partes del servidor
    al recibir la de otro.
57. **Sin estado `suspendido`.** El DOC 04 §8.1 lo tiene, con su minuto. El esqueleto solo lleva
    a `finished`. Entra con el cierre (T-210) o antes si un amistoso lo pide.
58. **Los tramos oficiales no se recalculan desde el directo.** `rebuild_match_stints` solo mira
    eventos aprobados y la cola no llama a funciones. Se lanza al cerrar (T-210). En el directo,
    «quién está en el campo» es estado de pantalla, como pide el DOC 04 §6.5.
59. **Cerrado en la T-208.** En diferido no hay reloj: cada evento pide parte y minuto («35»,
    «40+2»), y la parte que falta se crea con su duración prevista. Terminar el partido en
    diferido es del cierre (T-210).
60. **Falta la banda «Partido en directo · mm:ss · Volver»** en el resto de pantallas (DOC 02
    §3.1). La marca de `shared/lib/partidoEnCurso.ts` ya dice qué partido está en curso; falta la
    banda. Sin tarea asignada.
61. **Sin comprobar en el navegador**: ni el reloj a 7:1 al sol, ni el bloqueo de pantalla en un
    móvil de verdad. Los colores salen de los tokens del directo del DOC 07.
62. **La base no fija el estado del evento según el permiso** (DOC 05 §14.6). La A12 manda
    `approved` solo con `event.approve`, pero la RLS de inserción no lo comprueba. Pide
    migración: sesión de Cowork.
63. **El origen del gol no se pide en el directo** (DOC 04 §7.5): «se puede rellenar al cerrar»,
    y cada paso de más cuesta mirar el móvil. Lo pide el cierre (T-210).
64. **Corregir el minuto de un evento** (E8-09) es hoy deshacerlo y volver a apuntarlo. La
    edición de verdad, con `update` por la cola, va con el cierre y las discordancias (T-210).
65. **Deshacer un evento que otro ya aprobó** falla si quien deshace no tiene `event.approve`: la
    RLS solo deja borrar al autor mientras está pendiente. El borrado queda como rechazado en la
    C04, y el evento sigue en el servidor. Raro con un solo anotador; con varios, T-209.
66. **Del rival solo goles, córners y tarjetas** (DOC 04 §7.2). La falta del rival no se apunta:
    la que nos hacen es «falta recibida».
67. **Sin probar en el navegador ni en un móvil.** Ni la botonera al sol, ni la vibración, ni el
    tamaño de los botones con la mano.

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
| Tras la T-207, en Linux   |          180,97 kB |            19,03 kB |
| **Esta sesión, en Linux** |      **180,97 kB** |        **19,03 kB** |

**Sin cambios en el arranque.** La botonera vive en el trozo del directo, que pasa de 9,38 a
**16,13 kB** (`match-*.js`) y no baja al arrancar. Dexie sigue en `sync-*.js` (34,26 kB). En
crudo, `precache 36 entries (905.04 KiB)`.

---

## SIGUIENTE

**Para una sesión de Cowork: la migración del DOC 05 §14.4, el §14.5 y el §14.6.**

**Siguiente tarea de código: T-209**, varios anotadores: cobertura declarada, tiempo real y marca
de duplicado. Hereda los puntos 56 (dos aparatos abriendo la misma parte), 65 (deshacer lo que
otro aprobó) y la pausa que otro aparato no ve (55).

**Fuera de la cola principal**, lo que Raúl pidió adelantar después de esta: banda «Partido en
directo» (punto 61), reintentos que se rinden ante un 4xx (16), `noUncheckedIndexedAccess` (21),
precarga del trozo de `App` (23), inscribir a un jugador del club en otro equipo y reincorporar
bajas (29 y 30), y la T-303 y la pantalla «Más» (9 y 1), que piden decisión.

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

`npm run test -- --run` tiene que decir `Test Files 38 passed (38)` y `Tests 348 passed (348)`. El
build, en verde y sin `INEFFECTIVE_DYNAMIC_IMPORT`.

**En el navegador, con `npm run dev`, tu cuenta y un partido convocado:**

1. Convocatoria («Partido listo para usar sin conexión») y después el directo. «Empezar la 1ª
   parte».
2. «Gol» → «Nuestro» → el goleador → «Sin asistencia». Sale «Gol · … · 1'» dos segundos, el
   marcador sube y el gol aparece en «Últimos eventos». En Supabase, `match_events` tiene la fila
   con `seconds`, `occurred_at` y `status` según tus permisos.
3. Toca a un jugador del campo → «Tarjeta» → «Amarilla». Otra vez al mismo: sale «Segunda
   amarilla» y desaparece del campo.
4. «Cambio»: solo salen los suplentes que pueden entrar. Hazlo y mira cómo se mueven campo y
   banquillo.
5. «Deshacer» en el último: desaparece de la lista y de Supabase.
6. Con DevTools sin conexión, apunta un córner: la C04 dice que queda por enviar. Vuelve la red:
   se envía solo.
7. Un partido marcado «Ya se jugó» en la A10: en su directo no hay reloj, y cada evento pide parte
   y minuto.
8. En un móvil: la vibración al guardar (Android) y los botones con una mano.

**`npm run db:types` NO se lanza a la ligera.** Esta sesión no tocó el esquema.

---

## AVISO DE SEGURIDAD

Sin cambios de configuración: ni variables de entorno, ni Netlify, ni migraciones. **Hallazgo
nuevo**: la base no impide que un cliente sin `event.approve` inserte eventos aprobados (DOC 05
§14.6). La aplicación no lo hace, pero la barrera tiene que estar en la base: va a la sesión de
Cowork. Del jugador solo viajan identificador, apodo y dorsal; los motivos de cambio son táctica,
cansancio y otros. El aviso de Chrome autorrellenando el panel de Google en Supabase sigue
vigente: **vacía «Client IDs» y «Client Secret» antes de tocar nada.**
