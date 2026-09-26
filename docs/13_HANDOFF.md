# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 26/09/2026, noche — T-203b y correcciones: ✅ cerrada

Sesión de Cowork programada, sin Raúl delante. Cola renovada el 26/09 por la tarde: la T-203b
(categoría de la competición en la A08 y campo de casa propuesto en la A10) más cuatro
correcciones, todo en una PR. Rama `feat/rules-categoria-y-campo`. **Sin tocar la base**: la
migración del DOC 05 §14.4 ya estaba aplicada (PR #52).

---

## HECHO

| Pieza                                    | Qué hace                                                                                                                                                                               |
| :--------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rules/model/competicion.ts`             | `Categoria`, `CAMPOS_DE_CATEGORIA`, `SIN_CATEGORIA`, `LARGO_CATEGORIA` (40), `DatosDeCompeticion` y `NOMBRE_REPETIDO`. La validación limpia cada campo y guarda lo vacío como nulo     |
| `rules/components/CamposDeCategoria.tsx` | Los cuatro campos —Categoría, Nivel, Ámbito y Grupo— en un `fieldset` con su leyenda, «Clasificación de la federación». Opcionales, con un ejemplo en la ayuda de cada uno             |
| **A08, alta y ficha**                    | Los cuatro campos en las dos. Si la base rechaza un nombre repetido (23505, índice `competitions_name_unique`), el aviso es el de la pantalla y sale junto al campo «Nombre»           |
| `rules/api/competiciones.ts` y su hook   | Leen y escriben `category`, `level`, `scope` y `group_label`. La `Fila` ya no las deja fuera                                                                                           |
| `core`                                   | `Club` trae `homeVenue` y `homeVenueAddress`; `useClub` sale por el barril para `agenda`                                                                                               |
| `agenda/model/partido.ts`                | `campoDeCasaPropuesto`: el campo de casa del club, limpio, y si no hay, el del último partido en casa                                                                                  |
| **A10**                                  | Espera al club antes de pintar el formulario y propone su campo de casa al abrir y al pasar de «Fuera» a «En casa» con el campo vacío                                                  |
| Referencias a «punto N» del DOC 13       | En `src/`, las que apuntaban a puntos ya cerrados o de otra numeración citan ahora la tarea, la PR o la decisión que los cerró. La única abierta, en `useConvocatoria.ts`, pasa al 24  |
| Primer partido                           | Se adelanta al **sábado 3 de octubre**, fuera, contra el At. Tacoronte, **hora por confirmar**: `docs/recursos/cadete_primera_tenerife_g2_2026-27.md`, punto 27 y DOC 08 §8            |
| Modelo de despliegue                     | Pre en `main`, pro en `release`, créditos de Netlify: DOC 10 v0.5 (§2.1 y §2.2), `CLAUDE.md` y comentarios de `netlify.toml`. **El comando `ignore` no cambia**                        |
| DOC 08 v2.9, DOC 05 v1.10 y `CLAUDE.md`  | T-203b en ✅, el riesgo del 3/10 sin replanificar, y el DOC 05 §14 avisa de que los puntos que cita son de su día                                                                      |
| DOC 13                                   | Se retiran los puntos 23 y 24, que cerró la PR #51 y la #52 volvió a dar por abiertos al pisar el traspaso: la A05 ya tiene «Inscribir a alguien del club» y «Bajas de esta temporada» |

### Pruebas

**378 en verde, 40 archivos**, 13 nuevas: cinco del modelo de la categoría, tres de
`campoDeCasaPropuesto`, cuatro de la A08 (alta con categoría, alta sin ella, 23505 de la base y la
ficha que la enseña y la vacía) y dos de la A10 (recambio del último partido y vuelta a «En casa»).
**Las cuatro de pantalla se vieron fallar** contra la A08 y la A10 de `main`; las del modelo no
compilan sin él.

`npm run lint`, `npx prettier --check .`, `tsc -b` y `npm run build` en verde en local, sin
`INEFFECTIVE_DYNAMIC_IMPORT`.

---

## DECISIONES TOMADAS

**El nombre no se compone con la categoría, ni se propone.** Lo dice el DOC 05 §14.4: una copa o un
torneo de verano no tiene grupo, y obligar a componerlo rompería esos casos. Los cuatro campos van
aparte y el nombre sigue siendo el que se ve en el calendario y en el partido.

**Los cuatro campos, opcionales y con un largo de interfaz de 40.** La base no los limita, y el más
largo de la federación, «Autonómico Canarias», cabe de sobra. Van en el alta además de en la ficha,
para que la liga del Cadete A nazca con ellos.

**El campo de casa del club manda; el del último partido en casa queda de recambio.** La aplicación
es multiclub y un club nuevo tendrá `home_venue` vacío: así la A10 sigue proponiendo algo. Al
partido va solo `home_venue`, no la dirección: `matches.venue` es una línea del calendario.

**La A10 espera a tener el club.** El formulario toma su valor inicial una sola vez; si el club
llegara después, el campo se quedaría sin proponer. Un fallo al leer el club se trata como los de
las otras tres consultas: aviso y «Reintentar».

**La A03 no edita el campo de casa.** La T-203b es de la A08 y la A10, y el dato del Unión Tejina ya
está en la base. Queda en el punto 51.

**Las referencias a «punto N» en el código ya no llevan número salvo la abierta.** El DOC 13 se
renumera en cada sesión, y las de `src/` venían de cuatro numeraciones distintas: casi todas
apuntaban ya a otro punto. Las cerradas citan ahora la tarea (T-206, T-208), la PR (#51) o la
decisión (D06-29, DOC 06 §10.1). Las migraciones aplicadas no se tocan: el DOC 05 §14 avisa de que
sus puntos son los del día en que se escribieron.

**El DOC 10 dice cómo tiene que estar el panel de Netlify, no que lo esté.** Desde aquí no se ve la
rama de producción ni el estado de los builds. Lo que sí se vio antes de fusionar: `gavetastats` y
`main--gavetastats` servían el mismo build viejo, anterior a la T-106 (`index-jOB7hSkO.js`).

**El 3 de octubre no se replanifica.** Queda como riesgo en el DOC 08 §8 con lo que hay hecho; qué
entra antes del primer partido lo decide Raúl.

---

## PENDIENTE DE LA TAREA

Nada. La comprobación de pre tras fusionar va en el informe de la sesión y en `_cola\REGISTRO.md`.

---

## DEUDA TÉCNICA GENERADA

Los puntos 51 y 52 de abajo.

---

## LO QUE SIGUE ABIERTO

Se retiran el 23 y el 24, que ya estaban cerrados. **La lista se renumera**: del 25 en adelante,
cada punto baja dos. Se suman el 51 y el 52.

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
    inmediato. **Con el modelo de créditos del 26/09 no cuesta nada**: las vistas previas y los
    despliegues de rama cuestan 0 (DOC 10 §2.1). Donde gasta es en pro, al publicar. Sin tocar.
13. **Producción, parada desde el 20/09 por falta de créditos; se reanuda con el siguiente ciclo
    de facturación.** Modelo de Raúl del 26/09 (DOC 10 §2.1): `main` es **pre**, despliegue de rama
    gratuito en `https://main--gavetastats.netlify.app`; `release` es **pro**, en
    `https://gavetastats.netlify.app`, y **publica solo Raúl** con `git push origin main:release`.
    Cada publicación cuesta 15 de los 300 créditos del mes. En pro no hay nada desde la T-106. La
    base ya tiene las migraciones del 26/09 y no rompe lo publicado: las columnas nuevas son
    nulables y lo que hay en el sitio no crea equipos, ni convoca, ni registra eventos. Si pre no
    enseña una fusión, el DOC 10 §2.2 dice dónde mirar.
14. **No hay forma de que entre nadie más.** Ni alta propia, ni invitación, ni hacerse seguidor: la
    tabla `invitations` existe y no la usa ninguna pantalla. Es la T-301, y **la idea de Raúl de
    elegir equipo como seguidor al entrar se apunta aquí**: hace falta decidirla en el DOC 03,
    porque pide tocar la RLS de `team_followers`.
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
    «volver atrás de forma explícita». La A11 la enseña en solo lectura y ya está. Decidir en la
    T-210 si hace falta ese paso atrás y quién lo da.
32. **Los titulares son exactamente `players_on_pitch`, también en un partido en diferido.** Si un
    día se juega con diez desde el principio, la A11 no deja guardar. Salida si pasa: permitir
    menos titulares con un aviso. Sin tocar hasta que ocurra.
33. **Quien se da de baja con convocatoria guardada sigue en ella.** La A11 lo enseña al final,
    «Ya no está en la plantilla: no se puede convocar», y al guardar lo pasa a no convocado. Su
    línea no se borra: los eventos apuntan a `match_squad` con `on delete restrict`.
34. **Lo rechazado por el servidor no se puede descartar ni reintentar desde la interfaz.** La C04
    lo cuenta y enseña lo que dijo el servidor, plegado. Se queda en la cola sin purgarse, a
    propósito: nadie lo ha revisado. La T-210 (cierre y discordancias) es su sitio natural.
35. **Sin probar el viaje entero hasta Supabase en el navegador**: la A12 encola, la cola envía, la
    base fija el estado del evento y `marcar_convocado` pasa el partido a convocado. Probado en SQL,
    por la RLS, pero no desde la aplicación: desde las sesiones programadas no se entra con Google.
    Es lo primero que hay que mirar (comandos de abajo).
36. **Decidido en la T-207: la C04 se queda también en el directo.** «Sin conexión» es justo lo que
    hay que ver a pie de campo, y ya dice cuánto queda por enviar. No se añade el «⚠N» de la
    cabecera del DOC 02 §4 para no decir lo mismo dos veces.
37. **La precarga y los eventos locales no se purgan.** `purgarPartido` limpia lo enviado de la
    cola; `matchSnapshots` y `matchEvents` crecen con cada partido. Pocos kilobytes por partido;
    la T-210 los limpia al cerrar.
38. **La segunda precarga, al guardar la convocatoria, falla en silencio.** La pantalla ya ha
    navegado. La siguiente entrada en la convocatoria o en el directo lo vuelve a intentar, y el
    directo tendrá que decir si su precarga es vieja.
39. **Dos aparatos pueden abrir la misma parte.** El segundo choca con el índice único de
    `(match_id, period_number)`, la cola lo trata como éxito y su reloj sigue anclado a su propio
    arranque. Al terminar la parte, su `update` por `id` no toca filas y queda como rechazado. **Es
    de la T-209**, igual que la pausa que otro aparato no ve en su reloj.
40. **Sin estado `suspendido`.** El DOC 04 §8.1 lo tiene, con su minuto. El esqueleto solo lleva
    a `finished`. Entra con el cierre (T-210) o antes si un amistoso lo pide.
41. **Los tramos oficiales no se recalculan desde el directo.** `rebuild_match_stints` solo mira
    eventos aprobados y la cola no llama a funciones. Se lanza al cerrar (T-210). En el directo,
    «quién está en el campo» es estado de pantalla, como pide el DOC 04 §6.5.
42. **Falta la banda «Partido en directo · mm:ss · Volver»** en el resto de pantallas (DOC 02
    §3.1). La marca de `shared/lib/partidoEnCurso.ts` ya dice qué partido está en curso; falta la
    banda. Sin tarea asignada.
43. **Sin comprobar en el navegador**: ni el reloj a 7:1 al sol, ni el bloqueo de pantalla en un
    móvil de verdad. Los colores salen de los tokens del directo del DOC 07.
44. **El origen del gol no se pide en el directo** (DOC 04 §7.5): «se puede rellenar al cerrar»,
    y cada paso de más cuesta mirar el móvil. Lo pide el cierre (T-210).
45. **Corregir el minuto de un evento** (E8-09) es hoy deshacerlo y volver a apuntarlo. La
    edición de verdad, con `update` por la cola, va con el cierre y las discordancias (T-210).
46. **Deshacer un evento que otro ya aprobó** falla si quien deshace no tiene `event.approve`: la
    RLS solo deja borrar al autor mientras está pendiente. El borrado queda como rechazado en la
    C04, y el evento sigue en el servidor. Raro con un solo anotador; con varios, T-209.
47. **Del rival solo goles, córners y tarjetas** (DOC 04 §7.2). La falta del rival no se apunta:
    la que nos hacen es «falta recibida».
48. **Sin probar en el navegador ni en un móvil.** Ni la botonera al sol, ni la vibración, ni el
    tamaño de los botones con la mano. Tampoco la A08 y la A10 de la T-203b.
49. **Si la base rechaza la convocatoria por el máximo, la A11 lo cuenta con el mensaje genérico
    de guardar.** Con la A11 no pasa: valida el máximo antes de mandar. Pasaría si alguien baja
    `squad_max` en la A08 mientras otro convoca. Salida si molesta: reconocer el 23514 en
    `mensajeDeErrorAlGuardar` y decir «La convocatoria pasa del máximo de la competición».
50. **El aparato y la base pueden no estar de acuerdo en el estado de un evento.** La A12 decide
    `approved` o `pending` con los permisos que cargó al entrar; la base, con los del momento en que
    llega el evento. Si a alguien le quitan o le dan `event.approve` con eventos en la cola, «Últimos
    eventos» enseña un estado hasta que vuelvan los del servidor. Cuenta la base, que es lo que
    importa para las estadísticas.
51. **El campo de casa no se edita desde la aplicación.** La A03 no enseña `home_venue` ni
    `home_venue_address`, y la dirección se lee y no se usa en ningún sitio. Para el C.D. Unión
    Tejina está relleno en la base; un club nuevo lo tendría vacío, y la A10 caería al recambio del
    último partido en casa. Salida: los dos campos en la A03, solo frontend, con la misma
    actualización que ya cambia el nombre del club.
52. **El inicio de sesión con Google en pre necesita que Raúl añada la URL de pre a Supabase**
    (DOC 10 §4.5): `https://main--gavetastats.netlify.app/**` en las URL de redirección permitidas.
    Sin eso, pre carga, pero no deja entrar. Las sesiones programadas no lo tocan.

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

| Momento                                     | Inicial comprimido | Margen sobre 200 kB |
| :------------------------------------------ | -----------------: | ------------------: |
| Tras la T-208, en Linux                     |          180,97 kB |            19,03 kB |
| Migración del 26/09, en Windows             |          180,27 kB |            19,73 kB |
| **Esta sesión, en Windows, cifras de Vite** |      **180,29 kB** |        **19,71 kB** |

**Sin cambios de código en el arranque**: los 0,02 kB de más son de los nombres con _hash_ que se
citan unos a otros. Lo nuevo vive en los trozos perezosos `rules-*.js` y `agenda-*.js`, de unos
5,5 kB cada uno. La cifra suma lo que carga `index.html` —`index-*.js`, `App-*.js`,
`announceContext-*.js`, `QueryClientProvider-*.js`, `workbox-window` e `index-*.css`— con los
tamaños que da Vite en Windows. El CI da la cifra de referencia. En crudo, `precache 35 entries
(911.86 KiB)`.

---

## SIGUIENTE

**Lo que tiene que decidir Raúl antes del sábado 3 de octubre:**

1. **Qué entra antes del primer partido** (DOC 08 §8). Hoy hay entrada de datos completa y directo
   con un anotador; no hay cierre (T-210) ni varios anotadores (T-209). Lo que no se siga en
   directo se puede meter en diferido (D5).
2. **La hora del partido**, para meterlo en la A10.
3. **Publicar en pro** cuando vuelvan los créditos: `git push origin main:release`. Hasta entonces,
   probar en pre, con la URL de pre dada de alta en Supabase (punto 52).

**Siguiente tarea de código: T-209** (sesión y media), varios anotadores. Hereda los puntos 39 y 46. Es la ruta crítica del directo antes de la prueba de campo (T-302), que el DOC 08 pide antes del
18 de octubre.

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

`npm run test -- --run` tiene que decir `Test Files 40 passed (40)` y `Tests 378 passed (378)`. El
build, en verde y sin `INEFFECTIVE_DYNAMIC_IMPORT`.

**En pre** (`https://main--gavetastats.netlify.app`, con la URL dada de alta en Supabase) **o con
`npm run dev`, tu cuenta y la temporada en curso:**

1. En Competiciones, crea «Cadete Primera Tenerife G2» con categoría «Cadete», nivel «Primera»,
   ámbito «Tenerife» y grupo «G2». En Supabase, `competitions` tiene las cuatro columnas rellenas.
2. En su ficha, vacía el grupo y guarda: la columna queda a `null`, no a texto vacío.
3. En Calendario → «Nuevo partido», «En casa» ya trae «Campo de Fútbol Izquierdo Rodríguez».
   Cambia a «Fuera», borra el campo y vuelve a «En casa»: lo propone otra vez.
4. Da de alta el partido del 3 de octubre en casa del At. Tacoronte, fuera, con la hora que se
   confirme.
5. Lo de la sesión anterior sigue sin mirar en el navegador (punto 35): convocatoria que pasa a
   «Convocado», rival con `team.manage` y un gol que la base deja `approved`.

**Para repetir la prueba de aislamiento:** pega `supabase/pruebas/aislamiento_clubes.sql` en el
SQL Editor. Tiene que acabar en «T-105b SUPERADA · 168 comprobaciones · 0 fallos · 14 avisos».

**`npm run db:types` NO se lanza a la ligera** (punto 3).

---

## AVISO DE SEGURIDAD

**Esta sesión no tocó la base de producción**, ni variables de entorno, ni Netlify, ni la rama
`release`. De Netlify solo se leyó el sitio con su MCP. Del jugador siguen viajando solo
identificador, apodo y dorsal: ninguna consulta nueva toca `players`.

El aviso de Chrome autorrellenando el panel de Google en Supabase sigue vigente: al abrir el panel
del proveedor de Google, Chrome rellena «Client IDs» y «Client Secret»; **vacía los dos campos
antes de tocar nada.** Vale también al añadir la URL de pre (punto 52).
