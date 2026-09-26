# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 26/09/2026 — Migración del DOC 05 §14.4 a §14.6: ✅ aplicada

Sesión de Cowork programada, con el MCP de Supabase y sin Raúl delante. La cola de Cowork ya
estaba hecha hasta la T-205 (y las sesiones en la nube habían llegado a la T-208), así que tocaba
lo que esas sesiones dejaron para Cowork: la migración del DOC 05 §14.4, el §14.5 y el §14.6.
Rama `feat/db-migracion-cowork`. No es tarea del DOC 08: desbloquea la T-203b.

**Todo se aplicó a producción antes de fusionar**, porque no hay entorno de pruebas. Antes y
después: auditor, recuentos y el script de la T-105b. Detalle y cifras en el DOC 05 §14.7.

---

## HECHO

| Pieza                                                        | Qué hace                                                                                                                                                                   |
| :----------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260926150907_competiciones_categoria_y_campo_de_casa.sql` | §14.4 entero: categoría en cuatro columnas, nombre único por club y temporada, campo de casa del club, `teams_insert` con `team.manage` y `set_updated_at()` sin `EXECUTE` |
| Dato del club                                                | `home_venue` y `home_venue_address` del C.D. Unión Tejina, rellenos en producción y en `supabase/seed.sql`, solo si faltan                                                 |
| `20260926150926_guardas_convocatoria_y_estado_evento.sql`    | `marcar_convocado()` (5a), `check_squad_max` con dos disparadores de sentencia (5b) y `set_event_status` antes de cada inserción de evento (§14.6)                         |
| `src/types/database.types.ts`                                | Regenerado con el MCP. Byte a byte igual que la salida del generador                                                                                                       |
| `agenda/api/partidos.ts`                                     | `marcarComoConvocado` llama a `marcar_convocado` por `rpc`. Mismo contrato: `false` sale como `SIN_FILAS`, el 42501 llega al hook                                          |
| **A11**                                                      | El aviso de «no ha pasado a convocado» ya no culpa al permiso de programar: o el partido ya empezó, o falta permiso para convocar en su equipo                             |
| `rules/api/competiciones.ts`                                 | Su `Fila` deja fuera las cuatro columnas de la categoría hasta la T-203b                                                                                                   |
| `supabase/pruebas/aislamiento_clubes.sql`                    | Llama también a `marcar_convocado` sobre partidos ajenos                                                                                                                   |
| DOC 05 v1.9, DOC 08 v2.8 y `CLAUDE.md`                       | §14.7 con lo medido, las migraciones en la tabla del §14 y el estado al día                                                                                                |

### Pruebas

**357 en verde**, 3 nuevas en `agenda/api/partidos.test.ts`: la llamada a la función, `false`
convertido en `SIN_FILAS` y el error de la base pasado tal cual. Las tres se vieron fallar contra
el código anterior, y la de pantalla de la A11 con el texto nuevo, también.

**En la base**, en una transacción que acaba en error y lo deshace todo, con tres usuarios
sintéticos pasando por la RLS: doce comprobaciones, todas como se esperaba. Nombre repetido en
otras mayúsculas, sexto convocado por los tres caminos, cambio de uno por otro con la
convocatoria llena, `marcar_convocado` con y sin permiso y con el partido en juego, estado del
evento según el permiso y alta de equipo con y sin `team.manage`. La tabla, en el DOC 05 §14.7.

**T-105b después de migrar: SUPERADA, 168 comprobaciones, 0 fallos, los mismos 14 avisos.**

---

## DECISIONES TOMADAS

**Dos migraciones y no una.** La del §14.4 la decidió Raúl; las del §14.5 y §14.6 son propuestas
de las sesiones en la nube que él mandó aplicar en Cowork. Separadas, cada una se deshace sola si
hace falta, y el historial dice de dónde viene cada pieza.

**`marcar_convocado()` devuelve `boolean` en vez de lanzar si el partido ya empezó.** El borrador
del §14.5 lanzaba un error de texto; así el cliente conserva su contrato (`SIN_FILAS`) sin tener
que distinguir un error de otro por el mensaje. Sin permiso sí lanza, con 42501, que el hook ya
trata como «guardada, pero sin marcar».

**El `revoke` de `set_updated_at()` va también de `public` y `anon`**, no solo de
`authenticated` como decía el borrador: la regla del DOC 05 §14.1. La ACL ya no tenía PUBLIC,
pero así la migración no depende de ello.

**`check_squad_max` lanza con `check_violation` (23514)**, un código que se puede reconocer, en
vez del genérico P0001 del borrador.

**La 5c (dorsal repetido entre convocados) se queda fuera.** Era opcional, la A11 ya lo impide, y
una exclusión diferible cambia cuándo falla la escritura: con la A11 guardando en dos peticiones,
cada una en su transacción, hay que probarla contra la pantalla de verdad antes de meterla en
producción. Queda en el punto 31.

**El nuevo aviso 0029 del auditor, por `marcar_convocado`, se acepta.** Es `SECURITY DEFINER` y
la llama el cliente: necesita el `EXECUTE` de `authenticated`, igual que las once funciones que ya
lo marcaban y que el DOC 05 §14.3 da por buenas. No es un hallazgo inesperado sino el diseño del
§14.5, y por eso la sesión siguió en vez de pararse.

**Los tipos, sin `npm run db:types`.** El MCP generó el archivo y se aplicaron sus 19 líneas nuevas
con un guion que comprueba la huella del archivo antes (el del repositorio) y después (la salida
del generador). Solo escribe si las dos coinciden.

**La T-203b no se ha tocado.** Era otra tarea: las columnas están en la base y en los tipos, y la
A08 y la A10 las conectarán ahí.

---

## PENDIENTE DE LA TAREA

Nada. La 5c queda fuera a propósito (punto 31).

---

## DEUDA TÉCNICA GENERADA

Los puntos 51 y 52 de abajo, y el aviso 0029 de `marcar_convocado` en el punto 10.

---

## LO QUE SIGUE ABIERTO

Se retiran los cerrados: el 3, el 16, el 23, el 25, el 47, el 49, el 52, el 55 y el 59, que ya
venían cerrados, y el 4, el 27, el 33, el 34, el 37, el 40, el 41 y el 62, que cierra esta
sesión. **La lista se renumera entera**: los números de las sesiones anteriores ya no valen. Se
suman dos, el 51 y el 52.

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
4. Marcar `event.approve` a quien lleve el registro, cuando exista la T-301.
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
12. **El `ignore` de `netlify.toml` no cancela la compilación de una vista previa aunque la rama
    solo toque `docs/`**: `CACHED_COMMIT_REF` apunta al commit de la caché restaurada, no al padre
    inmediato. Salidas: comparar contra `$COMMIT_REF^` o contra la base de la rama, o mover la
    decisión al CI de GitHub. Sin tocar.
13. **Netlify tiene los despliegues PARADOS desde el 20/09** (DOC 10 §2.2). Fusionar a `main` no
    publica nada hasta reactivarlos a mano: nada desde la T-106 está en el sitio publicado. La
    base, en cambio, ya tiene la migración de esta sesión, y no rompe lo publicado: las columnas
    nuevas son nulables y lo que hay en el sitio no crea equipos, ni convoca, ni registra eventos.
14. **No hay forma de que entre nadie más.** Ni alta propia, ni invitación, ni hacerse seguidor: la
    tabla `invitations` existe y no la usa ninguna pantalla. Es la T-301, y **la idea de Raúl de
    elegir equipo como seguidor al entrar se apunta aquí**: hace falta decidirla en el DOC 03,
    porque pide tocar la RLS de `team_followers`.
15. **A01b no está en el inventario del DOC 02.** O entra como parada técnica, o se le da otro sitio.
16. **El contrato de `AuthState` mezcla idiomas**: `cargando`, `permisos` y `reintentarContexto`
    junto a `profile` y `activeTeamId`. Decidir y unificar con el DOC 06 §5.5.
17. **Un club puede enlazar objetos de otro club en sus propias filas** (los catorce avisos de la
    T-105b, que siguen igual tras esta migración). Ninguna clave ajena exige que los dos lados sean
    del mismo club, y `team_of_match` devuelve el equipo de cualquier partido. Las pantallas no
    pueden mezclar clubes; lo que queda abierto es que **la base tampoco lo impida**. Decidir si
    entra en una migración. Pide sesión de Cowork.
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
23. **Un jugador del club no se puede inscribir en un segundo equipo.** El alta de la A05 siempre
    crea un jugador nuevo. Si el mismo chico juega en el Cadete A y en el Cadete B, quedan dos
    jugadores con el mismo apodo y sus estadísticas separadas. Salida: en la A05, un «Inscribir a
    alguien del club» que liste los jugadores del club sin inscripción en este equipo. Solo
    frontend, sin migración. Con un solo equipo gestionado no molesta.
24. **No hay lista de bajas ni reincorporación.** La baja rellena `left_on` y el jugador
    desaparece de la A05. Volver a darlo de alta crea otro jugador (punto 23). Salida: una lista
    plegada de «Bajas de esta temporada» con «Reincorporar», que vacía `left_on`.
25. **La ficha guarda en dos peticiones** (inscripción y apodo), y el alta en dos más un borrado
    compensatorio. Si falla la segunda, la primera ya está guardada; si falla también el borrado,
    queda un jugador sin inscribir en el club, invisible en toda plantilla. Salida: una función
    `SECURITY DEFINER` por operación, que es trabajo de migración.
26. **El permiso de la A05, la A06 y la A11 lo mira la guardia en el equipo activo, no en el de la
    dirección.** Quien abra la plantilla de otro equipo del club ve lo que la RLS le deje leer, y al
    guardar recibe «No tienes permiso» si no tiene `roster.manage` en ese equipo. No hay fuga, pero
    sí una pantalla que ofrece lo que no puede hacer. Salida: comprobar el permiso del equipo de la
    ruta con las membresías de `useAuth()`.
27. **Los ocho tipos de evento fuera del MVP no se encienden desde la A08.** No tienen botón en el
    directo, y encenderlos prometería algo que no existe. Si alguien los enciende en la base, la A08
    los conserva al guardar. Cuando se construya su botón, se añaden a la lista de la ficha.
28. **No se borran competiciones.** La RLS lo permite, pero los partidos apuntan a su competición con
    `on delete restrict`, y una con partidos no se puede borrar. Una sin partidos mal creada se
    renombra. Si molesta, un «Borrar» que solo salga sin partidos.
29. **El calendario de la federación no se puede leer desde aquí.** El proxy de red de las sesiones
    en la nube bloquea `futboltenerife.com`. Los doce equipos del grupo y la jornada 1 están en
    `docs/recursos/cadete_primera_tenerife_g2_2026-27.md`: el Cadete A debuta el 4 de octubre a las
    12:00, fuera, contra el At. Tacoronte. **Esa página solo trae la jornada 1.** El calendario
    completo está en `https://futboltenerife.com/1cadete-primera-grupo-dos`: con su código se
    completa el archivo. Mientras, rivales y partidos se meten a mano. Leerla sola sería el
    _scraping_ de la fase 6, fuera del MVP.
30. **La hora es la del móvil.** La fecha y la hora se escriben y se enseñan en la zona del
    dispositivo y se guardan en UTC. En Canarias es la hora canaria; un partido en la península se
    escribe con la hora canaria en la que empieza. Si algún día anotan dispositivos en zonas
    distintas, hace falta fijar la zona del club.
31. **El dorsal repetido entre convocados solo lo impide la pantalla.** La pieza 5c del DOC 05
    §14.5 se quedó fuera de la migración del 26/09: es opcional, y una exclusión diferible hay que
    probarla contra la A11 en un navegador antes de meterla en producción. Si algún día se escribe
    en `match_squad` desde otro sitio que no sea la A11, se retoma.
32. **Nadie marca hoy a un jugador como «Sancionado».** La A11 bloquea por la disponibilidad de la
    inscripción (R-03, E7-05), y «Sancionado» lo pondrá el cómputo de sanciones, que no existe: la
    A16 es de después del MVP. Mientras, a un sancionado se le pone «No disponible» en la A06, y la
    A11 lo deja fuera igual. La tabla `sanctions` no se lee.
33. **Empezado el partido, la convocatoria no se corrige.** L-08 pide que corregirla obligue a
    «volver atrás de forma explícita». La A11 la enseña en solo lectura y ya está. Decidir en la
    T-210 si hace falta ese paso atrás y quién lo da.
34. **Los titulares son exactamente `players_on_pitch`, también en un partido en diferido.** Si un
    día se juega con diez desde el principio, la A11 no deja guardar. Salida si pasa: permitir
    menos titulares con un aviso. Sin tocar hasta que ocurra.
35. **Quien se da de baja con convocatoria guardada sigue en ella.** La A11 lo enseña al final,
    «Ya no está en la plantilla: no se puede convocar», y al guardar lo pasa a no convocado. Su
    línea no se borra: los eventos apuntan a `match_squad` con `on delete restrict`.
36. **Lo rechazado por el servidor no se puede descartar ni reintentar desde la interfaz.** La C04
    lo cuenta y enseña lo que dijo el servidor, plegado. Se queda en la cola sin purgarse, a
    propósito: nadie lo ha revisado. La T-210 (cierre y discordancias) es su sitio natural.
37. **Sin probar el viaje entero hasta Supabase en el navegador**: la A12 encola, la cola envía, y
    desde esta sesión la base fija el estado del evento y `marcar_convocado` pasa el partido a
    convocado. Probado en SQL, por la RLS, pero no desde la aplicación: desde las sesiones
    programadas no se entra con Google. Es lo primero que hay que mirar (comandos de abajo).
38. **Decidido en la T-207: la C04 se queda también en el directo.** «Sin conexión» es justo lo que
    hay que ver a pie de campo, y ya dice cuánto queda por enviar. No se añade el «⚠N» de la
    cabecera del DOC 02 §4 para no decir lo mismo dos veces.
39. **La precarga y los eventos locales no se purgan.** `purgarPartido` limpia lo enviado de la
    cola; `matchSnapshots` y `matchEvents` crecen con cada partido. Pocos kilobytes por partido;
    la T-210 los limpia al cerrar.
40. **La segunda precarga, al guardar la convocatoria, falla en silencio.** La pantalla ya ha
    navegado. La siguiente entrada en la convocatoria o en el directo lo vuelve a intentar, y el
    directo tendrá que decir si su precarga es vieja.
41. **Dos aparatos pueden abrir la misma parte.** El segundo choca con el índice único de
    `(match_id, period_number)`, la cola lo trata como éxito y su reloj sigue anclado a su propio
    arranque. Al terminar la parte, su `update` por `id` no toca filas y queda como rechazado. **Es
    de la T-209**, igual que la pausa que otro aparato no ve en su reloj.
42. **Sin estado `suspendido`.** El DOC 04 §8.1 lo tiene, con su minuto. El esqueleto solo lleva
    a `finished`. Entra con el cierre (T-210) o antes si un amistoso lo pide.
43. **Los tramos oficiales no se recalculan desde el directo.** `rebuild_match_stints` solo mira
    eventos aprobados y la cola no llama a funciones. Se lanza al cerrar (T-210). En el directo,
    «quién está en el campo» es estado de pantalla, como pide el DOC 04 §6.5.
44. **Falta la banda «Partido en directo · mm:ss · Volver»** en el resto de pantallas (DOC 02
    §3.1). La marca de `shared/lib/partidoEnCurso.ts` ya dice qué partido está en curso; falta la
    banda. Sin tarea asignada.
45. **Sin comprobar en el navegador**: ni el reloj a 7:1 al sol, ni el bloqueo de pantalla en un
    móvil de verdad. Los colores salen de los tokens del directo del DOC 07.
46. **El origen del gol no se pide en el directo** (DOC 04 §7.5): «se puede rellenar al cerrar»,
    y cada paso de más cuesta mirar el móvil. Lo pide el cierre (T-210).
47. **Corregir el minuto de un evento** (E8-09) es hoy deshacerlo y volver a apuntarlo. La
    edición de verdad, con `update` por la cola, va con el cierre y las discordancias (T-210).
48. **Deshacer un evento que otro ya aprobó** falla si quien deshace no tiene `event.approve`: la
    RLS solo deja borrar al autor mientras está pendiente. El borrado queda como rechazado en la
    C04, y el evento sigue en el servidor. Raro con un solo anotador; con varios, T-209.
49. **Del rival solo goles, córners y tarjetas** (DOC 04 §7.2). La falta del rival no se apunta:
    la que nos hacen es «falta recibida».
50. **Sin probar en el navegador ni en un móvil.** Ni la botonera al sol, ni la vibración, ni el
    tamaño de los botones con la mano.
51. **Si la base rechaza la convocatoria por el máximo, la A11 lo cuenta con el mensaje genérico
    de guardar.** Con la A11 no pasa: valida el máximo antes de mandar. Pasaría si alguien baja
    `squad_max` en la A08 mientras otro convoca. Salida si molesta: reconocer el 23514 en
    `mensajeDeErrorAlGuardar` y decir «La convocatoria pasa del máximo de la competición».
52. **El aparato y la base pueden no estar de acuerdo en el estado de un evento.** La A12 decide
    `approved` o `pending` con los permisos que cargó al entrar; la base, con los del momento en que
    llega el evento. Si a alguien le quitan o le dan `event.approve` con eventos en la cola, «Últimos
    eventos» enseña un estado hasta que vuelvan los del servidor. Cuenta la base, que es lo que
    importa para las estadísticas.

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

| Momento                                     | Inicial comprimido | Margen sobre 200 kB |
| :------------------------------------------ | -----------------: | ------------------: |
| Tras la T-208, en Linux                     |          180,97 kB |            19,03 kB |
| **Esta sesión, en Windows, cifras de Vite** |      **180,27 kB** |        **19,73 kB** |

**Sin cambios de código en el arranque.** Lo que cambia vive en trozos perezosos (`agenda-*.js` y
el de la convocatoria) y los tipos desaparecen al compilar. La cifra suma lo que carga
`index.html` —`index-*.js`, `App-*.js`, `announceContext-*.js`, `QueryClientProvider-*.js`,
`workbox-window` e `index-*.css`— con los tamaños que da Vite en Windows; la diferencia con la de
Linux es de medición, no de contenido. El CI da la cifra de referencia. En crudo, `precache 35
entries (905.89 KiB)`.

---

## SIGUIENTE

**Para Cowork no queda nada de base de datos sin decidir.** Lo que pide migración espera antes una
decisión de Raúl: el alta de club (punto 21), el enlace entre clubes (17), las preferencias en el
perfil (20), guardar la ficha en una sola llamada (25) y el cubo `crests` (5), que necesita antes
su definición en el DOC 05 §13.

**Siguiente tarea de código, a elegir:**

| Salida                     | Consecuencia                                                                                                                                                  |
| :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **T-203b** (media sesión)  | Ya libre. Categoría en la A08 y campo de casa propuesto en la A10. Conviene antes de dar de alta la liga del Cadete A, para que nazca con sus cuatro columnas |
| **T-209** (sesión y media) | Varios anotadores. Hereda los puntos 41 y 48. Es la ruta crítica del directo antes de la prueba de campo (T-302), que el DOC 08 pide antes del 18 de octubre  |

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

`npm run test -- --run` tiene que decir `Test Files 39 passed (39)` y `Tests 357 passed (357)`. El
build, en verde y sin `INEFFECTIVE_DYNAMIC_IMPORT`.

**En el navegador, con `npm run dev`, tu cuenta y un partido programado:**

1. En la convocatoria, guarda titulares y suplentes. El partido pasa a «Convocado» en el
   calendario: ahora lo hace `marcar_convocado`, y basta `lineup.manage`.
2. En la A04, da de alta un rival: tienes `team.manage` y tiene que dejarte.
3. En el directo, apunta un gol. En Supabase, `match_events.status` sale `approved`, porque
   tienes `event.approve`; lo pone la base, no la pantalla.
4. En la A08, intenta dar de alta dos competiciones con el mismo nombre en otras mayúsculas: la
   segunda la para la pantalla y, si no, la base.
5. En Supabase, `clubs` enseña el campo de casa del C.D. Unión Tejina.

**Para repetir la prueba de aislamiento:** pega `supabase/pruebas/aislamiento_clubes.sql` en el
SQL Editor. Tiene que acabar en «T-105b SUPERADA · 168 comprobaciones · 0 fallos · 14 avisos».

**`npm run db:types` NO se lanza a la ligera** (punto 3).

---

## AVISO DE SEGURIDAD

**Esta sesión cambió la base de producción**: dos migraciones y el dato del campo de casa. Sin
cambios de variables de entorno ni de Netlify. Antes y después, el auditor: el único aviso nuevo es
el 0029 de `marcar_convocado`, esperado. `check_squad_max`, `set_event_status` y
`set_updated_at` no los puede llamar nadie por la API. Las pruebas vivieron en transacciones
deshechas: `clubs`, `teams`, `team_members` y `auth.users` cuentan lo mismo que antes. Del jugador
siguen viajando solo identificador, apodo y dorsal.

El aviso de Chrome autorrellenando el panel de Google en Supabase sigue vigente: al abrir el panel
del proveedor de Google, Chrome rellena «Client IDs» y «Client Secret»; **vacía los dos campos
antes de tocar nada.**
