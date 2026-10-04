# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 04/10/2026 — primer partido y revisión de las T-212 a T-218: ✅ cerrada

Sesión de Cowork con Raúl al otro lado, desde el móvil. El sábado 3 se jugó el primer partido de
liga, At. Tacoronte 0 – 9 Unión Tejina, y esa noche se metió en diferido: fue la primera vez que
alguien usó el directo y el cierre de verdad. De ahí salieron siete tareas pequeñas, de la T-212 a
la T-218, que Raúl lanzó una a una en sesiones aparte, cada una con un traspaso guiado (punto 67).
Esta sesión las revisa, junta sus siete cierres en este documento y deja escritos los traspasos del
lote siguiente. Rama `docs/docs-revision-entregas-04-10`. **Sin código de aplicación.**

---

## HECHO

| Tarea     | PR  | Qué hace                                                                                                                                                                             |
| :-------- | :-- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **T-212** | #58 | El calendario enlaza el directo en el partido convocado o en juego, con `match.live.write`: «Directo», o «Apuntar» en diferido. Antes solo se entraba escribiendo la dirección       |
| **T-213** | #59 | Inicio enseña el próximo partido con las acciones de su fila del calendario. `ResumenDePartido` lo comparten las dos pantallas, e Inicio la sirve `agenda` con `InicioPage` (D06-34) |
| **T-214** | #60 | `REGLAMENTO_CADETE` da 7 cambios, que eran 5, y los documentos lo dicen. Los cinco hallazgos del primer partido, puntos 54 a 58                                                      |
| **T-215** | #61 | Al apuntar, «Guardando…» y botones desactivados en vez de un error falso; el motivo de verdad, en el flujo. `intentar` dentro de `Panel`, y `hacer` como envoltorio                  |
| **T-216** | #62 | La cola solo la vacía la pestaña visible, y roba el cerrojo al segundo intento con él ocupado (D06-35). `encolarJunto` acota la transacción a sus tablas y registra «Encolado lento» |
| **T-217** | #63 | El directo toma siempre del servidor la convocatoria y el reglamento, y en diferido mira el campo en el minuto del evento (D06-36)                                                   |
| **T-218** | #64 | Cada paso del flujo enseña lo ya respondido, y el minuto dice el rango de su parte: «De 41 a 80». La parte se recuerda de un evento al siguiente                                     |

### Revisión

`main` en `633da70`. **480 pruebas en verde, 45 archivos**, con lint, Prettier y build limpios y sin
`INEFFECTIVE_DYNAMIC_IMPORT`, comprobado en Linux. Se leyeron enteros `sync/api/arranque.ts` y
`sync/model/turno.ts`, `elegirEstado`, `hastaElInstante` y `contextoDe`. No se encontró nada que
corregir. **Ninguna de las siete se ha probado en un móvil**, y lo dicen sus siete cierres: es lo
que queda para la T-302.

### Lo que enseñó el primer partido

| Qué pasó                                                                               | Dónde quedó                              |
| :------------------------------------------------------------------------------------- | :--------------------------------------- |
| El viaje entero funciona en producción: convocar, apuntar en diferido, enviar y cerrar | Punto 35, cerrado                        |
| Ninguna pantalla enlazaba el directo                                                   | T-212 y T-213                            |
| Una pestaña vieja y oculta se quedaba con el envío: un evento por minuto               | T-216; sin reproducir en móvil, punto 62 |
| Repetir el toque daba un error falso mientras guardaba                                 | T-215                                    |
| El móvil se quedaba con el reglamento y la convocatoria del primer día                 | T-217                                    |
| En diferido se ofrecían los jugadores del final del partido                            | T-217; lo que queda, punto 61            |
| Fueron 6 y 7 cambios, con el límite en 5                                               | T-214 y la base                          |
| Amarilla al entrenador, ventanas de cambio, posiciones y el acta                       | Puntos 54, 55, 57 y 58                   |

---

## DECISIONES TOMADAS

**D06-34, D06-35 y D06-36**, en el DOC 06: Inicio la sirve `agenda`; solo vacía la cola la pestaña
visible; y la convocatoria y el reglamento del directo salen siempre del paquete.

**Siete cambios en el cadete** (DOC 03, A5). Lo corrigió Raúl el 04/10. Las ventanas de cambio no
se modelan (punto 55).

**Cómo entra alguien nuevo** (DOC 03, I1): invitación a un correo y solicitud desde dentro, las dos
aprobadas por quien lleva el equipo. Lo propuso Raúl el 04/10 y queda escrito con un ajuste suyo
por confirmar: que seguir a un equipo también se apruebe (punto 14).

**La lista de abajo deja de renumerarse.** Los puntos cerrados se quedan en su hueco.

**El DOC 13 admite cierres cortos.** Una tarea guiada añade su sección arriba y no reescribe el
documento; la sesión de revisión los junta, como esta.

---

## LA BASE, TOCADA A MANO EL 04/10

Todo sobre el partido `62493b88-…`, por SQL y sin sesión de usuario, a petición de Raúl:

| Cambio                                                | Por qué                             |
| :---------------------------------------------------- | :---------------------------------- |
| `substitutions_max` de la competición, de 5 a 7       | El partido tuvo 6 cambios           |
| Los dorsales 17 y 18, de no convocados a suplentes    | Están en el acta y los dos entraron |
| Los minutos de seis goles, a los del acta             | Iban uno o dos por encima           |
| Cinco cambios insertados a nombre de Raúl, sin motivo | Solo había llegado uno de los seis  |

Salió mal una cosa, y está en los puntos 64 y 65: el móvil de Raúl tenía dos de esos cambios en la
cola. El partido lo cerró Raúl desde la aplicación a las 10:11, 0 – 9.

---

## DEUDA TÉCNICA GENERADA

Los puntos 59 a 67 de abajo.

---

## LO QUE SIGUE ABIERTO

**La lista no se renumera** desde el 04/10: el código y los traspasos citan los puntos por su
número, y cambiarlo en cada sesión los dejaba apuntando a otro sitio. Los cerrados se quedan en su
hueco, tachados en una línea. En esta sesión se cierran el 35 y el 56, se reescriben el 4, el 13, el
14, el 34, el 46, el 51 y el 53, y se suman del 59 al 67.

Pendiente de decidir, que no lo decide el código:

1. **Los cinco destinos de la barra.** Hoy: Inicio `/`, Equipo `/equipos`, Agenda `/calendario`,
   Datos `/estadisticas`, Más `/ajustes`. **Lo decide Raúl.** «Equipo» abre la A04, que pide
   `team.manage`: un seguidor o un anotador sin ese permiso pulsa Equipo y cae en `/403`. Salidas:

   | Salida                                                                                  | Consecuencia                                                                                                                                                                    |
   | :-------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
   | **A. Dejarlo como está**                                                                | Cero trabajo. `/mis-aportaciones` solo se alcanza desde Inicio, `/admin/logs` no tiene entrada, «Más» abriendo Ajustes se lee raro, y Equipo manda a `/403` a quien no gestiona |
   | **B. Pantalla índice «Más»** en `/mas`: Mis aportaciones, Ajustes y Registro de errores | Una pantalla pequeña más y un toque más hasta Ajustes. La C02 tiene sitio. **Recomendada**                                                                                      |
   | C. Pantallas índice para Equipo, Datos y Más                                            | Tres pantallas. Arregla también el `/403` de Equipo                                                                                                                             |

2. **`clock` y `plus` haciendo de casa y calendario.** El inventario de 21 iconos del DOC 07 §8.2
   no tiene ninguno de los dos. Decidir si entran dos iconos nuevos.

Pendiente de hacer:

3. **`npm run db:types` deja el archivo de tipos a cero bytes si el CLI falla.** Se restaura con
   `git checkout -- src/types/database.types.ts`. **Antes de tocar ese script, haz copia.** Las
   sesiones de Cowork generan los tipos con el MCP de Supabase.
4. **Solo Raúl tiene `members.manage`.** Isaac, que es quien lleva el equipo, tiene los otros once
   permisos y no ese: no podría invitar ni aceptar a nadie. Dárselo desde la A07 en cuanto exista
   (T-301b). Y marcar `event.approve` a quien lleve el registro cada partido.
5. **Los cubos de Storage `crests` y `docs`, sin crear.** Sin `crests` no hay escudo en la A03 ni en
   los equipos. El logo del C.D. Unión Tejina está en `docs/recursos/escudo-cd-union-tejina.png`,
   listo para subirlo. Pide una sesión de Cowork con el cubo y sus políticas definidos antes en el
   DOC 05 §13, y la subida desde la A03.
6. Los alias viven duplicados en `tsconfig.app.json` y en `vite.config.ts`, a mano.
7. `/admin/logs` sigue sin guardia de permiso: el DOC 05 §4 no define ninguno de administración.
   Lo resuelve la T-303.
8. Faltan tokens de anchura de maqueta en el DOC 07: el rail y la caja de `BareLayout` salen de
   `--tap-min`.
9. **Varias rutas comparten la misma `PantallaPendiente`.** Cada una la sustituye su tarea.
10. Deudas de base de datos abiertas: `btree_gist` en `public`, veintisiete claves ajenas sin
    índice, trece tablas con dos políticas permisivas de `SELECT`, `rebuild_match_stints` sin
    comprobar que el jugador que sale esté en el campo, y el descarte de sustituciones repetidas
    viviendo solo en el retorno de la función. **El auditor marca doce avisos 0029 desde el 26/09**:
    `marcar_convocado` se suma a los once de siempre, a propósito (DOC 05 §14.7).
11. Si Supabase recrea `rls_auto_enable()` con `DROP` + `CREATE`, el permiso de PUBLIC vuelve.
    Mirar el auditor tras cada actualización de la plataforma.
12. **Cerrado el 27/09: se quita el `ignore` de `netlify.toml`.** Era la causa del punto 13 (DOC 10
    §2.1). No se vuelve a poner.
13. **Pro va por detrás de pre.** Pro sigue en `release@f6f38d0`, del 27/09: no tiene nada de la
    T-212 en adelante, ni la puerta al directo ni los arreglos de la cola. Lo publica Raúl con
    `git push origin main:release`, 15 créditos. Pre, `main--gavetastats`, compila sola cada fusión
    a `main` desde que se quitó el `ignore` (punto 12); **el 04/10 no se pudo comprobar desde la
    sesión qué build sirve**.
14. **Cómo entra alguien nuevo, decidido el 04/10 (DOC 03, I1).** Dos puertas, y las dos pasan por
    quien tiene `members.manage`: la invitación a un correo, que esa cuenta ve y acepta al entrar
    con Google, y la solicitud, de quien entra sin equipo, elige uno de los que admiten solicitudes
    y pide seguirlo o pide permisos. Es la T-301, partida en tres: la migración (T-301a, DOC 05
    §14.8, **sin aplicar**), la A07 (T-301b) y la entrada (T-301c). **Pendiente del visto bueno de
    Raúl**: que seguir a un equipo también se apruebe, que es como está escrita la migración.
15. **A01b no está en el inventario del DOC 02.** O entra como parada técnica, o se le da otro sitio.
16. **El contrato de `AuthState` mezcla idiomas**: `cargando`, `permisos` y `reintentarContexto`
    junto a `profile` y `activeTeamId`. Decidir y unificar con el DOC 06 §5.5.
17. **Un club puede enlazar objetos de otro club en sus propias filas** (los catorce avisos de la
    T-105b). Ninguna clave ajena exige que los dos lados sean del mismo club, y `team_of_match`
    devuelve el equipo de cualquier partido. Las pantallas no pueden mezclar clubes; lo que queda
    abierto es que **la base tampoco lo impida**. Decidir si entra en una migración. Pide sesión
    de Cowork.
18. **`noUncheckedIndexedAccess` apagado.** Saca siete errores, seis en `permissions.test.ts` y uno
    en `permissions.ts:120`. Salidas: encenderlo ya (media hora, recomendada: el coste crece con cada
    lista que pinte una pantalla), después del MVP, o nunca y revisar a mano.
19. **Los fallos sin sesión no llegan a `error_logs`.** La RLS solo deja insertar a
    `authenticated`. Abrirla a `anon` abre la puerta a llenar la tabla desde fuera. Decidir en el
    DOC 03 si hace falta verlos.
20. **Las preferencias de pantalla viven en el dispositivo** (D06-25). Salidas: una columna
    `preferences jsonb` en `profiles` con `localStorage` como caché para arrancar sin red
    —recomendada—; o dejarlo así y corregir el DOC 07. Pide migración: sesión de Cowork.
21. **El alta de un club nuevo no se puede hacer desde la aplicación.** `clubs_insert` deja crear el
    club, pero `clubs_select` y `teams_insert` piden ser miembro del club —y desde el 26/09,
    `team.manage` para el equipo—, y en uno nuevo no lo es nadie: el club nace invisible y sin forma
    de meterle un equipo. Salidas:

    | Salida                                                                                                                                                                                   | Consecuencia                                                                                                                                                                                               |
    | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | **A. Seguir sembrando a mano** con `seed.sql`                                                                                                                                            | Cero trabajo. Basta mientras haya un solo club, que es el caso del MVP. **Recomendada hasta la liga**                                                                                                      |
    | **B. Una función `crear_club()` `SECURITY DEFINER`** que, en una transacción, cree el club, su primer equipo, la temporada en curso y al que llama como entrenador con los doce permisos | No toca ninguna política: la lógica queda en un sitio y se prueba con el script de la T-105b. La A03 ganaría el alta. **Recomendada para cuando llegue un segundo club**. Pide migración: sesión de Cowork |
    | C. Aflojar políticas: que `created_by` baste para leer el club y crear el primer equipo                                                                                                  | Toca tres políticas y abre casos raros (¿y el segundo equipo?, ¿y los permisos del creador?). La cola pidió no tocar la RLS para esto                                                                      |

22. **Un equipo propio nuevo nace sin personas.** Nadie tiene `roster.manage` ni ningún otro
    permiso en él hasta que existan las invitaciones (T-301), así que su plantilla y sus partidos
    no los puede llevar nadie. La pantalla lo avisa al marcar «Del club». Para el Cadete A no
    importa: ya está sembrado.
23. **La ficha guarda en dos peticiones** (inscripción y apodo), y el alta en dos más un borrado
    compensatorio. Si falla la segunda, la primera ya está guardada; si falla también el borrado,
    queda un jugador sin inscribir en el club, invisible en toda plantilla. Salida: una función
    `SECURITY DEFINER` por operación, que es trabajo de migración.
24. **El permiso de la A05, la A06 y la A11 lo mira la guardia en el equipo activo, no en el de la
    dirección.** Quien abra la plantilla de otro equipo del club ve lo que la RLS le deje leer, y al
    guardar recibe «No tienes permiso» si no tiene `roster.manage` en ese equipo. No hay fuga, pero
    sí una pantalla que ofrece lo que no puede hacer. Salida: comprobar el permiso del equipo de la
    ruta con las membresías de `useAuth()`.
25. **Los ocho tipos de evento fuera del MVP no se encienden desde la A08.** No tienen botón en el
    directo, y encenderlos prometería algo que no existe. Si alguien los enciende en la base, la A08
    los conserva al guardar. Cuando se construya su botón, se añaden a la lista de la ficha.
26. **No se borran competiciones.** La RLS lo permite, pero los partidos apuntan a su competición con
    `on delete restrict`, y una con partidos no se puede borrar. Una sin partidos mal creada se
    renombra. Si molesta, un «Borrar» que solo salga sin partidos.
27. **El calendario de la federación no se puede leer desde aquí.** El proxy de red de las sesiones
    en la nube bloquea `futboltenerife.com`. Los doce equipos del grupo y la jornada 1 están en
    `docs/recursos/cadete_primera_tenerife_g2_2026-27.md`. **El Cadete A debuta el sábado 3 de
    octubre, fuera, contra el At. Tacoronte; la hora está por confirmar** (la federación lo daba el
    domingo 4 a las 12:00, y Raúl lo adelantó el 26/09). Esa página solo trae la jornada 1; el
    calendario completo está en `https://futboltenerife.com/1cadete-primera-grupo-dos`: con su
    código se completa el archivo. Mientras, rivales y partidos se meten a mano. Leerla sola sería
    el _scraping_ de la fase 6, fuera del MVP.
28. **La hora es la del móvil.** La fecha y la hora se escriben y se enseñan en la zona del
    dispositivo y se guardan en UTC. En Canarias es la hora canaria; un partido en la península se
    escribe con la hora canaria en la que empieza. Si algún día anotan dispositivos en zonas
    distintas, hace falta fijar la zona del club.
29. **El dorsal repetido entre convocados solo lo impide la pantalla.** La pieza 5c del DOC 05
    §14.5 se quedó fuera de la migración del 26/09: es opcional, y una exclusión diferible hay que
    probarla contra la A11 en un navegador antes de meterla en producción. Si algún día se escribe
    en `match_squad` desde otro sitio que no sea la A11, se retoma.
30. **Nadie marca hoy a un jugador como «Sancionado».** La A11 bloquea por la disponibilidad de la
    inscripción (R-03, E7-05), y «Sancionado» lo pondrá el cómputo de sanciones, que no existe: la
    A16 es de después del MVP. Mientras, a un sancionado se le pone «No disponible» en la A06, y la
    A11 lo deja fuera igual. La tabla `sanctions` no se lee.
31. **Empezado el partido, la convocatoria no se corrige.** L-08 pide que corregirla obligue a
    «volver atrás de forma explícita». La A11 la enseña en solo lectura y ya está. La T-210a no lo
    resuelve: quién corrige la convocatoria de un partido empezado, y cómo, es una decisión de
    producto. **Lo decide Raúl.** Mientras, en el cierre cuenta lo que dicen los eventos.
32. **Los titulares son exactamente `players_on_pitch`, también en un partido en diferido.** Si un
    día se juega con diez desde el principio, la A11 no deja guardar. Salida si pasa: permitir
    menos titulares con un aviso. Sin tocar hasta que ocurra.
33. **Quien se da de baja con convocatoria guardada sigue en ella.** La A11 lo enseña al final,
    «Ya no está en la plantilla: no se puede convocar», y al guardar lo pasa a no convocado. Su
    línea no se borra: los eventos apuntan a `match_squad` con `on delete restrict`.
34. **Lo rechazado por el servidor no se puede descartar ni reintentar desde la interfaz.** La C04
    lo cuenta y enseña lo que dijo el servidor, plegado, y se queda para siempre. **Ya pasó**: el
    móvil de Raúl tiene desde el 04/10 un cambio del primer partido que el servidor rechazó por el
    límite, y la banda roja no se va. Es la T-219: la banda lista lo rechazado y deja descartarlo.
35. ~~Sin probar el viaje entero hasta Supabase en el navegador.~~ **Cerrado el 04/10**: el primer
    partido de liga se convocó, se apuntó en diferido, se envió por la cola y se cerró desde
    producción, con sus tramos. Lo que sigue sin probar es el reloj en vivo (punto 42).
36. **Decidido en la T-207: la C04 se queda también en el directo.** «Sin conexión» es justo lo que
    hay que ver a pie de campo, y ya dice cuánto queda por enviar. No se añade el «⚠N» de la
    cabecera del DOC 02 §4 para no decir lo mismo dos veces.
37. **La precarga y los eventos locales solo se purgan en el móvil que cierra.** Desde la T-210a,
    cerrar limpia en ese aparato la precarga, los eventos locales y lo enviado de la cola. En los
    demás, lo enviado se purga a las 48 horas, pero `matchSnapshots` y `matchEvents` se quedan.
    Pocos kilobytes por partido. Salida si molesta: purgar al arrancar los partidos que el
    servidor ya da por cerrados.
38. **La segunda precarga, al guardar la convocatoria, falla en silencio.** La pantalla ya ha
    navegado. La siguiente entrada en la convocatoria o en el directo lo vuelve a intentar, y el
    directo tendrá que decir si su precarga es vieja.
39. **Dos aparatos pueden abrir la misma parte.** El segundo choca con el índice único de
    `(match_id, period_number)`, la cola lo trata como éxito y su reloj sigue anclado a su propio
    arranque. Al terminar la parte, su `update` por `id` no toca filas y queda como rechazado. **Es
    de la T-209**, igual que la pausa que otro aparato no ve en su reloj.
40. **El directo no suspende.** El DOC 04 §8.1 tiene el estado `suspended` con su minuto, y desde la
    T-210a la A13 cierra y reabre partidos suspendidos y dice dónde se suspendieron. Pero la A12
    solo lleva a `finished`: suspender es una acción de su reductor, con su transición en la cola
    y `suspended_period` y `suspended_seconds` (la base exige los dos). Sin tarea asignada; entra
    antes si un amistoso lo pide.
41. **Falta la banda «Partido en directo · mm:ss · Volver»** en el resto de pantallas (DOC 02
    §3.1). La marca de `shared/lib/partidoEnCurso.ts` ya dice qué partido está en curso; falta la
    banda. Sin tarea asignada.
42. **Sin comprobar en el navegador**: ni el reloj a 7:1 al sol, ni el bloqueo de pantalla en un
    móvil de verdad. Los colores salen de los tokens del directo del DOC 07.
43. **Corregir el minuto de un evento** (E8-09) es hoy deshacerlo y volver a apuntarlo. La
    edición de verdad, con `update` por la cola, va con las discordancias (T-210b).
44. **Deshacer un evento que otro ya aprobó** falla si quien deshace no tiene `event.approve`: la
    RLS solo deja borrar al autor mientras está pendiente. El borrado queda como rechazado en la
    C04, y el evento sigue en el servidor. Raro con un solo anotador; con varios, T-209.
45. **Del rival solo goles, córners y tarjetas** (DOC 04 §7.2). La falta del rival no se apunta:
    la que nos hacen es «falta recibida».
46. **Sin probar al sol ni con reloj.** Lo usado de verdad el 04/10 fue el diferido, de noche y en
    un Android: la botonera, el flujo y el cierre. Siguen sin mirar la vibración, el tamaño de los
    botones con la mano y de pie, iPhone, y la A08 y la A10 de la T-203b. Es la T-302.
47. **Si la base rechaza la convocatoria por el máximo, la A11 lo cuenta con el mensaje genérico
    de guardar.** Con la A11 no pasa: valida el máximo antes de mandar. Pasaría si alguien baja
    `squad_max` en la A08 mientras otro convoca. Salida si molesta: reconocer el 23514 en
    `mensajeDeErrorAlGuardar` y decir «La convocatoria pasa del máximo de la competición».
48. **El aparato y la base pueden no estar de acuerdo en el estado de un evento.** La A12 decide
    `approved` o `pending` con los permisos que cargó al entrar; la base, con los del momento en que
    llega el evento. Si a alguien le quitan o le dan `event.approve` con eventos en la cola, «Últimos
    eventos» enseña un estado hasta que vuelvan los del servidor. Cuenta la base, que es lo que
    importa para las estadísticas.
49. **El campo de casa no se edita desde la aplicación.** La A03 no enseña `home_venue` ni
    `home_venue_address`, y la dirección se lee y no se usa en ningún sitio. Para el C.D. Unión
    Tejina está relleno en la base; un club nuevo lo tendría vacío, y la A10 caería al recambio del
    último partido en casa. Salida: los dos campos en la A03, solo frontend, con la misma
    actualización que ya cambia el nombre del club.
50. **Cerrar son cinco peticiones sin transacción** (T-210a). El orden hace inofensivo un fallo a
    medias: los tramos se recalculan cuantas veces se quiera, las partes creadas son las que el
    partido necesitaba y el partido sigue sin cerrar hasta el último paso. Lo que no cubre: si otro
    aprueba o crea un evento entre el recálculo y el paso a `closed`, los tramos se quedan sin él.
    Salida: una función `cerrar_partido()` `SECURITY DEFINER` que lo haga todo de una vez. Pide
    migración: sesión de Cowork, con la función definida antes en el DOC 05.
51. **Sin la T-210b, un partido con eventos pendientes no se puede cerrar** (C-01). Los pendientes
    solo nacen de quien anota sin `event.approve`. Hoy los dos que anotan lo tienen, así que todo
    nace aprobado. En cuanto entre alguien más por la T-301, la T-210b tiene que estar.
52. **En diferido, cerrar crea las partes que falten, y eso pide `match.live.write`.** Quien solo
    tenga `match.close` ve el motivo y no puede cerrar. Con los permisos sembrados del Cadete A no
    pasa. Salida si molesta: la función del punto 50, que no dependería de la RLS de
    `match_periods`.
53. **C-03 a medias.** El cierre da por terminadas las coberturas abiertas en el final del
    partido, pero no las lista: hasta la T-209a no existe ninguna. La lista entra con ella.

54. **La tarjeta a un técnico no cabe en el modelo.** Una `yellow_card` propia exige un jugador
    convocado (DOC 04 §7.1, I-04). El 03/10 hubo amarilla al entrenador en el 32' y se apunta como
    `note`. Entra con disciplina (A16), fuera del MVP, y pide decidir si el cuerpo técnico existe
    como entidad sancionable.

55. **Las ventanas de cambio y la prórroga no se modelan.** El reglamento da siete cambios en tres
    ventanas más el descanso. La aplicación cuenta los cambios (R-04) y no las ventanas: las vigila
    el árbitro, y un bloqueo mal configurado impediría apuntar lo que pasó. La prórroga queda sin
    decidir hasta que haya copa.

56. ~~Una competición ya creada conserva su límite.~~ **Cerrado el 04/10**: «Cadete Primera Tenerife
    G2» tiene 7 cambios, puestos en la base. Sigue valiendo la regla: `REGLAMENTO_CADETE` solo rige
    al dar de alta, y el de una competición que ya existe se cambia en la A08.

57. **Posiciones detalladas, a la espera de la lista de Isaac.** Laterales, mediapunta y demás: hoy
    solo hay portero, defensa, medio y delantero (DOC 05 §15). Irían como detalle bajo esas cuatro
    líneas, después de la T-210.

58. **El acta de la federación sirve para contrastar y no entra en el repositorio.** Trae nombre y
    apellidos de menores de los dos equipos. Se usa por dorsal al cerrar el partido (C-02); no se
    guarda en `docs/` ni en la aplicación.

59. **La A11 no enlaza al directo** (T-212). Al guardar la convocatoria se vuelve al calendario, y
    de ahí se entra. Con el partido empezado, la convocatoria en solo lectura tampoco lo enlaza. Va
    en la T-220.

60. **Flecos del flujo de registro** (T-215 y T-218), todos sin ver en un móvil: los botones
    desactivados mientras guarda no tienen estilo propio en `Registro.module.css`; si el guardado
    falla, el foco puede irse a `body`; el aviso de los 4 s no tiene prueba; las pastillas de lo
    respondido no se han visto a 320 px con cuatro seguidas; el selector dice «2ª parte» y el
    resumen y el error «2.ª parte»; y en la ficha de jugador en diferido el resumen sale vacío en
    el paso del minuto. Va en la T-220, menos lo de ver en un móvil, que es de la T-302.

61. **En diferido, apuntar un evento anterior no revisa los posteriores** (T-217). Un cambio
    apuntado en el 20 no invalida un gol del 30 de quien salió, y una amarilla anterior a otra ya
    apuntada deja las dos como amarillas, sin segunda. Y la ficha de jugador en diferido sigue
    usando el campo del final del partido. Sin tarea: lo incoherente lo tendrá que decir el cierre.

62. **La cola, sin reproducir en un móvil** (T-216). El diagnóstico sale de los registros del
    servidor; la comprobación de verdad es anotar con dos pestañas abiertas. Dos ventanas visibles a
    la vez se pueden quitar el cerrojo la una a la otra: repite algún envío y no pierde nada.
    `useEstadoDeCola` no tiene prueba.

63. **`.nota` y `.error` están repetidas** en `ProximoPartido.module.css` y
    `CalendarioPage.module.css` (T-213). Dos reglas; va en la T-220 si no estorba.

64. **Corregir un partido en la base tiene un orden, y el 04/10 no se siguió.** Se metieron por SQL
    los cinco cambios que faltaban del primer partido dando por vacía la cola del móvil de Raúl. No
    lo estaba: tenía dos cambios sin enviar, que salieron por la mañana. Uno entró repetido y al
    otro lo rechazó el límite. **Antes de escribir en la base lo que se pudo apuntar en un móvil,
    ese móvil abre la aplicación con cobertura y se comprueba que su banda no dice nada.** Y desde
    la base no queda autor en `audit_log`: `actor_id` va vacío.

65. **El primer partido tiene un cambio repetido**: el 14 por el 4, en el 46, dos veces. Los
    minutos están bien, porque `rebuild_match_stints` ignora el repetido, pero el partido cuenta
    siete cambios y fueron seis. Borrarlo es una fila; **espera el visto bueno de Raúl**, y después
    hay que recalcular los tramos.

66. **El primer partido no tiene cobertura declarada**, porque la declaración llega con la T-209a.
    Su fiabilidad saldrá «Sin cobertura declarada» hasta que se le ponga la del diferido, que el
    DOC 04 §10.6 da por entera desde el minuto 0.

67. **Los traspasos guiados viven en el proyecto de Claude, no en el repositorio**:
    `claude/traspaso_T-xxx.md`. Cada sesión que ejecuta uno añade su cierre aquí arriba, corto, y
    la siguiente sesión de revisión los junta. Si el método se queda, pide su sitio en el DOC 00
    §5.

Asumidas y sin fecha: el marco de la ventana vive en `App` como una pieza más entre el enrutador y
las maquetas; la siembra se lanza a mano; `useHasPermission` recibe `string` y no `AppPermission`;
`teams` del contexto devuelve membresías y no equipos pelados, a propósito; el club activo del
registro vive en una variable de módulo de `logging`; `sasi.equipo-activo` sobrevive al cierre de
sesión, a propósito; los rivales se duplican por club, como ya decía el DOC 05 §5.4 (E17-03);
«Sancionado» no se elige en la A06, lo pone el cómputo de sanciones; el calendario no enseña
entrenamientos, que llegan con su pantalla después del MVP; la A11 lee la plantilla de la
temporada activa, que es la de todos los partidos que ofrece el calendario; y la lista de la A08
no enseña la categoría, porque el nombre ya la dice.

---

## EL PAQUETE, MEDIDO

| Momento                            | Inicial comprimido | Margen sobre 200 kB |
| :--------------------------------- | -----------------: | ------------------: |
| Tras la T-208, en Linux            |          180,97 kB |            19,03 kB |
| T-203b, en Windows                 |          180,29 kB |            19,71 kB |
| T-210a, en Windows, cifras de Vite |          180,33 kB |            19,67 kB |
| **04/10, tras la T-218, en Linux** |      **180,11 kB** |        **19,89 kB** |

**Nada de lo del 04/10 entra en el arranque.** Inicio carga ahora el trozo de `agenda`, de 5,98 kB
comprimidos, además del de `core`; el del directo, `match-*.js`, sube a 17,26 kB, y el de la cola,
`sync-*.js`, que lleva Dexie, mide 34,61 kB. Misma suma de siempre: `index-*.js`, `App-*.js`,
`announceContext-*.js`, `QueryClientProvider-*.js`, `workbox-window` e `index-*.css`. El CI da la
cifra de referencia. En crudo, `precache 37 entries (940.82 KiB)`.

---

## SIGUIENTE

**Lo que tiene que hacer o decidir Raúl:**

1. **Publicar en pro**: `git push origin main:release`. Sin eso, el móvil sigue con lo del 27/09
   (punto 13).
2. **Decir si seguir a un equipo se aprueba** (punto 14). La T-301a no se lanza sin eso.
3. **Dar el visto bueno a borrar el cambio repetido** del primer partido (punto 65).
4. **Cerrar las pestañas viejas de la aplicación** en el móvil hasta que la T-216 esté publicada.

**Las tareas, en orden**, cada una con su traspaso en el proyecto de Claude:

| Orden | Tarea      | Qué                                                             | Esfuerzo |
| :---- | :--------- | :-------------------------------------------------------------- | :------- |
| 1     | **T-219**  | La banda lista lo rechazado y deja descartarlo                  | Bajo     |
| 2     | **T-220**  | Flecos del flujo y enlace al directo desde la convocatoria      | Bajo     |
| 3     | **T-210b** | Panel de discordancias: aprobar, descartar, duplicados y minuto | Medio    |
| 4     | **T-301a** | Migración de personas: invitaciones y solicitudes               | Alto     |
| 5     | **T-301b** | A07, personas y permisos                                        | Medio    |
| 6     | **T-301c** | Entrar sin equipo: aceptar invitación o pedir acceso            | Medio    |
| 7     | **T-209a** | Cobertura declarada                                             | Medio    |
| 8     | **T-209b** | Ver lo que apuntan los demás: tiempo real y sondeo              | Alto     |
| 9     | **T-209c** | Partes compartidas entre aparatos                               | Medio    |
| 10    | **T-302**  | Prueba de campo, el sábado 17 de octubre en casa                | —        |

La T-211 y la T-303 son las que se recortan si aprieta. Todas tocan el DOC 08 y este documento:
de una en una.

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

`npm run test -- --run` tiene que decir `Test Files 45 passed (45)` y `Tests 480 passed (480)`. El
build, en verde y sin `INEFFECTIVE_DYNAMIC_IMPORT`.

**En pre** (`https://main--gavetastats.netlify.app`) **o en pro, una vez publicado, con tu cuenta:**

1. Inicio enseña el partido del 17 de octubre. Con la convocatoria guardada, sale «Directo».
2. Con la aplicación en dos pestañas, apunta tres eventos seguidos en una: en Supabase llegan en
   segundos, no uno por minuto (punto 62).
3. En un partido en diferido, Gol → 2.ª parte, 55 → Nuestro → un jugador: en «¿Asistencia?» se leen
   los tres datos encima, y la ayuda del minuto dice «De 41 a 80».
4. Al pulsar la última opción de un flujo se lee «Guardando…» y los botones no responden hasta
   que termina.
5. Cambia el límite de cambios de la competición en la A08 y vuelve al directo: lo trae.

**Para repetir la prueba de aislamiento:** pega `supabase/pruebas/aislamiento_clubes.sql` en el
SQL Editor. Tiene que acabar en «T-105b SUPERADA · 168 comprobaciones · 0 fallos · 14 avisos».

**`npm run db:types` NO se lanza a la ligera** (punto 3).

---

## AVISO DE SEGURIDAD

**Esta sesión sí escribió en la base de producción**, a petición de Raúl y solo sobre el primer
partido: está todo en «La base, tocada a mano el 04/10». Además intentó dos cosas que la
herramienta paró a la espera de confirmación y **no se ejecutaron**: borrar el cambio repetido y
ensayar la migración de personas dentro de una transacción que se deshace. Ni variables de entorno,
ni Netlify, ni la rama `release`.

El acta del partido se leyó en la conversación para contrastar por dorsal. Trae nombres de
menores: no está en el repositorio, ni en el proyecto, ni en este documento (punto 58).

El aviso de Chrome autorrellenando el panel de Google en Supabase sigue vigente: al abrir el panel
del proveedor de Google, Chrome rellena «Client IDs» y «Client Secret»; **vacía los dos campos
antes de tocar nada.** Vale también al mirar las URL de redirección.
