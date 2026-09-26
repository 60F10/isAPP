# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 26/09/2026 — T-206, capa offline: ✅ cerrada entera, antes del hito del 4 de octubre

Misma sesión en la nube que la T-205, sin acceso a Supabase. La T-205 se fusionó a mitad
(PR #45) y Raúl pidió seguir. Antes de picar código, dos decisiones suyas:

| Pregunta                                                                  | Decisión de Raúl                                                           |
| :------------------------------------------------------------------------ | :------------------------------------------------------------------------- |
| Precargar al entrar en la convocatoria sin que `lineup` importe de `sync` | **Desde el enrutador**: la ruta carga la A11 envuelta por `match` (D06-28) |
| Una entrega esta sesión y la precarga en otra, o la T-206 entera          | **La T-206 entera** en esta sesión                                         |

El entorno obliga a subir a la rama de sesión; la que toca por convención es
`feat/sync-cola-offline`, y con ese nombre se hizo el commit. La rama de sesión de la T-205 se
borró al fusionar su PR, así que esta sube limpia desde `main`. La pull request lo dice.

---

## HECHO

| Pieza                                           | Qué hace                                                                                                                                                                                                                                              |
| :---------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared/lib/db.ts`                              | Dexie con los cuatro almacenes del DOC 06 §8.2, sin tocar sus índices. El trabajo gana `userId` y `sentAt`                                                                                                                                            |
| `sync/model/cola.ts`                            | Retroceso de 1 a 60 s con hasta 1 s al azar, qué es éxito, reintento o definitivo, el primero listo de cada partido, la purga a 48 h y la cuenta para la C04                                                                                          |
| `sync/model/vaciador.ts`                        | Vuelta a vuelta: marca «enviándose», manda, guarda lo que pasó. El almacén y el transporte entran como argumento                                                                                                                                      |
| `sync/api/transporte.ts`                        | Un trabajo, una petición. `update` sin filas es `SIN_FILAS`; `delete` sin filas, éxito; nunca lanza                                                                                                                                                   |
| `sync/api/almacen.ts` y `encolar.ts`            | La cola sobre Dexie, `encolar()` (guarda y pide vaciado), `contarPendientes`, las purgas y el estado observable                                                                                                                                       |
| `sync/api/arranque.ts`                          | Cerrojo `sasi-outbox` entre pestañas y disparadores: arranque, `online`, vuelta a primer plano, cada 10 s con red, al encolar y «Sincronizar ahora». Lo rechazado va a `error_logs` con la tabla, la operación y lo que dijo el servidor, sin la fila |
| **C04** `sync/components/BandaDeSincronizacion` | Sin red, por enviar o rechazado, con el número en palabras, «Sincronizar ahora» y lo que dijo el servidor, plegado. Anuncia el cambio de conexión, no la cuenta                                                                                       |
| `app/components/Sincronizacion.tsx`             | Carga `sync` con `import()` en cuanto hay sesión, arranca el vaciado y pinta la banda (D06-26)                                                                                                                                                        |
| **C01** `app/routes/AjustesPage.tsx`            | Antes de cerrar sesión cuenta la cola y, si hay algo, pide confirmar (punto 25 cerrado)                                                                                                                                                               |
| `match/api/precarga.ts`                         | Partido, reglamento, convocatoria (solo apodo), partes y eventos en paralelo; los guarda en una transacción y pide almacén persistente (D06-10b). `leerInstantanea` para la T-207                                                                     |
| `match/components/EstadoDePrecarga`             | «Preparando…», «Partido listo para usar sin conexión» o el fallo con «Volver a intentarlo», antes de ir al campo                                                                                                                                      |
| `match/routes/ConvocatoriaConPrecarga`          | La A11 con la precarga encima y otra precarga al guardar. La ruta la carga por ruta directa (D06-28)                                                                                                                                                  |
| `lineup` A11                                    | Dos enganches, `aviso` y `alGuardar`. No sabe nada de la capa offline                                                                                                                                                                                 |
| `logging`                                       | Origen nuevo `sync` en `OrigenDeError`                                                                                                                                                                                                                |
| DOC 06 v2.1, DOC 08 v2.5 y `CLAUDE.md`          | D06-26 a D06-28, las tres reglas del transporte, el presupuesto y el estado                                                                                                                                                                           |

**Comprobado en Chromium de verdad**, con `vite preview`: el trozo de Dexie abre IndexedDB con
las cuatro tablas en la versión 1, guarda un trabajo y responden el índice de `status` y el
compuesto `[matchId+createdAt]`. **Sin comprobar con Supabase**: nadie encola todavía (punto 50),
y aquí no se entra con Google.

### Pruebas

**240 en verde**, 46 nuevas. Cada una se vio fallar antes de darla por buena: contra un esbozo
vacío las del modelo, el vaciador, la banda y el estado de la precarga, y con un mutante a mano
sobre la línea que vigilan las demás y las que el esbozo no tumbaba. Un mutante sobrevivió y
destapó un hueco: nada comprobaba que un partido sin reglamento legible no se precargara. Tiene
caso nuevo.

| Archivo                                      | Casos | Qué vigila                                                                                                                           |
| :------------------------------------------- | ----: | :----------------------------------------------------------------------------------------------------------------------------------- |
| `sync/model/cola.test.ts`                    |    15 | Retroceso, éxito y duplicado, reintento, definitivo, orden por partido, aplazado que frena, purga, cuenta por persona, trabajo nuevo |
| `sync/model/vaciador.test.ts`                |     6 | Orden, sin red, rechazo sin frenar al siguiente, «enviándose» antes de mandar, transporte que lanza, cuenta ajena                    |
| `sync/api/transporte.test.ts`                |     5 | Tabla de la entidad, error con código, `update` sin filas, `delete` sin filas, petición que lanza                                    |
| `sync/components/BandaDeSincronizacion.test` |     5 | Callada, sin red, por enviar, rechazados, anuncio solo del cambio de conexión                                                        |
| `match/api/precarga.test.ts`                 |     8 | Paquete completo con solo el apodo, sin partido, sin reglamento, error de una consulta, transacción, persistencia                    |
| `match/components/EstadoDePrecarga.test.tsx` |     3 | Preparando y lista, navegador que no promete guardar, fallo con anuncio y reintento                                                  |
| `app/routes/AjustesPage.test.tsx`            |    +3 | Aviso con cola y quedarse, salir confirmando, salir sin preguntar con la cola vacía                                                  |
| `lineup/routes/Convocatoria.test.tsx`        |    +1 | Los dos enganches                                                                                                                    |

---

## DECISIONES TOMADAS

Las tres grandes están en el DOC 06: **D06-26** (`sync` y Dexie fuera del arranque, cargados en
un efecto y no con `lazy`), **D06-27** (cada trabajo se envía solo con la sesión de quien lo
encoló) y **D06-28** (la precarga en `match`, disparada por la ruta y cargada por ruta directa).
Y las tres reglas del transporte del §8.5: duplicado de inserción es éxito en cualquier tabla,
`update` sin filas es definitivo y `delete` sin filas es éxito.

**Un trabajo aplazado frena a los de detrás de su partido; uno rechazado, no.** El rechazado ya
no se va a mandar, y esperar por él bloquearía el partido entero por un dato malo.

**«Enviándose» cuenta como pendiente.** Con un vaciador por cerrojo, uno que se encuentra así es
de una pestaña que murió a mitad; reenviarlo es seguro por la idempotencia.

**Lo rechazado no se purga solo** (punto 48), y lo que se registra en `error_logs` no lleva la
fila: solo tabla, operación y lo que dijo el servidor.

**Al pedir confirmación para salir, el foco va al aviso, y vuelve a «Cerrar sesión» al quedarse
dentro.** El botón y la confirmación se sustituyen, y sin esto el foco caía a `body` (2.4.3). Lo
señaló el `revisor`.

**La banda anuncia el cambio de conexión, no la cuenta.** Con cuatro anotadores, la región viva
sería un contador.

**Sin nuevas dependencias.** Dexie ya estaba. Para la prueba en Chromium se instaló
`playwright-core` fuera del proyecto, en el borrador de la sesión.

---

## PENDIENTE DE LA TAREA

Nada de la fila del DOC 08. Lo que falta es de quien encola, el directo: puntos 47 y 49 a 52.

---

## DEUDA TÉCNICA GENERADA

Los puntos 47 a 54 de abajo. **El 47 es una decisión que la T-207 tiene que tomar antes de
empezar.**

---

## LO QUE SIGUE ABIERTO

Se cierra el 25. Se suman ocho al final, del 47 al 54. La numeración no cambia.

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
47. **La A12 va en el paquete inicial y el directo necesitará Dexie.** La cabecera de
    `app/router.tsx` la mete en el arranque para que abra sin red aunque no se haya visitado. Dexie
    pesa 31 kB y el margen es de 19,39. **La T-207 decide**, antes de escribir una línea del
    directo:

    | Salida                                                                    | Consecuencia                                                                                                                                                                                                                              |
    | :------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | **A. La A12 pasa a perezosa**, como el resto                              | El service worker ya precachea **todos** los `.js`, perezosos incluidos (`globPatterns` de `vite.config.ts`): tras la primera visita con red, el trozo está aunque no se haya abierto nunca el directo. Libera kilobytes. **Recomendada** |
    | B. La A12 se queda en el arranque y carga su capa de datos con `import()` | Mismo resultado sin red, pero el arranque carga con el esqueleto del directo aunque no haya partido                                                                                                                                       |
    | C. Dexie entra en el arranque                                             | No cabe: pasaría de los 200 kB                                                                                                                                                                                                            |

48. **Lo rechazado por el servidor no se puede descartar ni reintentar desde la interfaz.** La C04
    lo cuenta y enseña lo que dijo el servidor, plegado. Se queda en la cola sin purgarse, a
    propósito: nadie lo ha revisado. La T-210 (cierre y discordancias) es su sitio natural.
49. **Una sola conversión de tipo en la cola.** `sync/api/transporte.ts` entrega la fila con
    `as never`, porque la cola guarda JSON y no sabe qué es un gol. El tipo tiene que comprobarse
    al encolar: **la T-208 envuelve `encolar` en `match` con los tipos generados**
    (`TablesInsert<'match_events'>`), para que ningún evento salga sin comprobar.
50. **Nadie encola todavía.** La cola está probada con un almacén en memoria, con el transporte
    simulado y con IndexedDB de verdad en Chromium, pero el viaje entero hasta Supabase lo estrena
    la T-208 con el primer evento.
51. **La C04 sale también en el directo.** El DOC 06 §8.6 pone en su cabecera un contador «⚠3».
    La T-207 decide si la banda se esconde en `FullScreenLayout` o se queda.
52. **El aviso al salir del directo con trabajos en cola** (D06-10b) es de la T-207. El de la
    pantalla de inicio lo cubre la C04, que sale en todas las pantallas nada más abrir.
53. **La precarga y los eventos locales no se purgan.** `purgarPartido` limpia lo enviado de la
    cola; `matchSnapshots` y `matchEvents` crecen con cada partido. Pocos kilobytes por partido;
    la T-210 los limpia al cerrar.
54. **La segunda precarga, al guardar la convocatoria, falla en silencio.** La pantalla ya ha
    navegado. La siguiente entrada en la convocatoria o en el directo lo vuelve a intentar, y el
    directo tendrá que decir si su precarga es vieja.

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
| Tras la T-205, en Linux   |          179,97 kB |            20,03 kB |
| **Esta sesión, en Linux** |      **180,61 kB** |        **19,39 kB** |

**+0,64 kB.** Rollup saca a un trozo común lo que el arranque comparte con los perezosos
—`supabase-js` entre otras cosas, en `announceContext-*.js`—, y eso cuesta algo de envoltorio;
lo demás es `Sincronizacion.tsx` y el aviso de la C01. **Dexie no está**: vive en `db-*.js`
(31,42 kB), y `sync` en `sync-*.js` (2,98 kB).

| Trozo del arranque         |    Comprimido |
| :------------------------- | ------------: |
| `index-*.js`               |      71,94 kB |
| `announceContext-*.js`     |      55,62 kB |
| `App-*.js`                 |      46,88 kB |
| `QueryClientProvider-*.js` |       0,29 kB |
| `workbox-window`           |       2,20 kB |
| Dos hojas de estilo        |       3,68 kB |
| **Total**                  | **180,61 kB** |

**Cómo se mide desde ahora**: recorriendo las importaciones estáticas desde `dist/index.html` y
desde `App-*.js`, no por nombre de archivo. El nombre del trozo común cambia según qué módulo
le toque dar nombre. En crudo, `precache 38 entries (862.14 KiB)`.

---

## SIGUIENTE

**Para una sesión de Cowork: la migración del DOC 05 §14.4 y el §14.5**, sin cambios.

**Siguiente tarea de código: T-207**, el esqueleto del directo. **Lo primero, el punto 47**: cómo
entra la A12 con Dexie. Después lee el partido con `leerInstantanea` de `match/api/precarga.ts`
y escribe las partes por la cola.

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

`npm run test -- --run` tiene que decir `Test Files 27 passed (27)` y `Tests 240 passed (240)`. El
build, en verde y sin `INEFFECTIVE_DYNAMIC_IMPORT`.

**En el navegador, con `npm run dev` y tu cuenta:**

1. Abre la convocatoria de un partido. Arriba sale «Preparando el partido…» y después «Partido
   listo para usar sin conexión».
2. En las herramientas del navegador, Aplicación → IndexedDB → `sasi`: `matchSnapshots` tiene el
   partido.
3. Red → «Sin conexión»: arriba sale la banda «Sin conexión». Vuelve a «Sin limitación»: se va y el
   lector de pantalla dice «Conexión recuperada».
4. Con la red cortada, recarga la convocatoria: dice que no ha podido preparar el partido y ofrece
   «Volver a intentarlo». Con red, reintenta y sale bien.
5. Ajustes → «Cerrar sesión» con la cola vacía: sale sin preguntar. (Con trabajos en cola se
   podrá probar cuando el directo encole, T-208.)

**`npm run db:types` NO se lanza a la ligera.** Esta sesión no tocó el esquema.

---

## AVISO DE SEGURIDAD

Sin cambios de configuración: ni variables de entorno, ni Netlify, ni migraciones. **Lo nuevo que
toca la seguridad**: IndexedDB guarda en el móvil el partido precargado (apodos, dorsales,
eventos) y la cola; nada de nombres reales. Cada trabajo se envía solo con la sesión de quien lo
encoló, y cerrar sesión no borra la cola. Las migraciones del §14.4 y el §14.5 las aplica una
sesión de Cowork contra la base de producción. El aviso de Chrome autorrellenando el panel de
Google en Supabase sigue vigente para el día que haga falta abrirlo: **vacía «Client IDs» y
«Client Secret» antes de tocar nada.**
