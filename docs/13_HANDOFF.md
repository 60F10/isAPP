# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 08/10/2026, noche — T-228: entrenamientos, las sesiones: ✅ cerrada

Sesión programada, en la nube y sin Raúl delante, rama `feat/training-sesiones`. Un solo commit.
Sin migración ni SQL: la T-227 sigue sin aplicar y no hace falta.

- **Nace el módulo `training`**, con `model/`, `api/`, `hooks/` y `routes/`. Importa de `shared`,
  `auth` y `core`, y **no de `agenda`**. Su barril exporta las tres pantallas, perezosas.
- **A15a, `/entrenamientos`.** El horario del equipo y la temporada activos, en «Próximos» (desde
  las 00:00 de hoy, el más cercano primero) y «Pasados» (los diez más recientes y «Ver los N
  anteriores»). **Va sin guardia de permiso**, junto a `/calendario`: lo abre cualquiera con
  función en el equipo. Con `training.manage` salen «Entrenamiento de hoy», «Nuevo
  entrenamiento» y, en cada fila, «Pasar lista» y «Editar», con el día en su nombre accesible.
- **«Entrenamiento de hoy»** crea uno para ahora mismo, con los segundos a cero, el lugar del más
  reciente o el campo de casa del club y sin objetivo, y navega a su lista. Si hoy ya hay uno, en
  su sitio sale «Pasar lista de hoy». Si falla, el mensaje se anuncia y recibe el foco.
- **A15b, alta y edición.** `/entrenamientos/nuevo` y `/entrenamientos/:id/editar`, las dos tras
  `training.manage`. El alta trae la fecha de hoy y la hora y el lugar del más reciente. Las
  fechas pasadas se admiten. Al fallar la validación el foco va al primer campo con error.
  Borrar pregunta en su sitio y dice que se lleva la lista de asistencia.
- **`/entrenamientos/:id/lista` sigue en `PantallaPendiente`**, ahora con «la T-229». La B04
  pendiente sale de `stats.view`: el historial tendrá su ruta en la T-232.
- **`training_sessions.notes` no se toca.** No está en `COLUMNAS`, ni en el tipo, ni en ninguna
  consulta, y una prueba lo vigila: la fila la ve todo el club.
- **`aInstante` y `partesDeInstante` viven en `shared/lib/instante.ts`**, movidas tal cual con
  sus pruebas. `agenda/model/partido.ts` las importa y las vuelve a exportar.
- **Cómo se llega.** El calendario enseña «Entrenamientos» a quien tiene función en el equipo, y
  no a quien solo lo sigue. «Agenda» se marca también en `/entrenamientos`. En la A07,
  `schedule.manage` dice «Crear y editar partidos» y `training.manage`, «Crear entrenamientos,
  pasar lista y escribir observaciones».
- **Las tres mutaciones invalidan `trainingKeys.all` sin esperar**, como pide `CLAUDE.md`: tras
  borrar, la relectura devuelve «no existe» y quita el botón que tiene que navegar. **Ninguna
  prueba lo distingue:** la del borrado contesta `null` después de borrar, y pasa igual con la
  invalidación esperada. Es prevención, no un fallo visto.
- Lint, formato, **979 pruebas en 75 archivos** y build, sin `INEFFECTIVE_DYNAMIC_IMPORT`.
  **Paquete inicial: 176,33 kB comprimidos** con mi recorrido de las importaciones (176,20 en
  `main`): **+0,13 kB**, por la cadena de `destinos.ts` y las tres rutas perezosas de
  `router.tsx`. Sobre los 180,97 kB de `CLAUDE.md`, 181,10. El trozo `training-*.js` pesa 4,33 kB.
- **Mirado con un arnés temporal**, sin base: a 320 px y a 1024 px no hay desplazamiento
  horizontal y ningún enlace, botón o campo baja de 48 px. **A 320 px con el texto al 200 % sí
  lo hay**, y no es de estas pantallas: el `h1` de `Pantalla` y el título de `Card`, comunes a
  todas, no parten «Entrenamientos» ni «entrenamiento». Los botones y enlaces propios sí se
  parten (`overflow-wrap: anywhere`). Sin tarea.
- **Dos cosas que el traspaso no decía y se resolvieron así:** el `Borrar` de `PartidoPage.tsx`
  no mueve el foco, así que el de aquí sigue el de la A07 (a la pregunta, y de vuelta al botón);
  y con un entrenamiento que no existe, el enlace a la lista es el «Volver a entrenamientos» de
  arriba, sin repetirlo debajo del mensaje.
- **Deuda.** Un seguidor que escriba la dirección a mano ve la lista vacía, sin que nada le diga
  que no puede leerla. Sin red no se crea ni se edita nada: va en línea y no por la cola.
  `useEquipoDeTrabajo` repite el `useEquipoActivo` de `agenda`, y el formato del día está escrito
  dos veces, aquí y en `ResumenDePartido`. Un entrenamiento no tiene duración ni hora de fin,
  porque la tabla no las tiene. El alta no enseña el formulario si no carga el horario o el club,
  aunque solo los usa para proponer la hora y el lugar. Y hasta la T-229, «Pasar lista» lleva a
  una pantalla pendiente.
- **Sin probar contra la base de verdad ni en un móvil.** Mientras Raúl no pegue la T-227, el
  horario lo lee el equipo y no el resto del club.

---

## Sesión 08/10/2026 — pase a pro y plan de los entrenamientos: ✅ cerrada

Sesión con Raúl en el móvil, rama `docs/docs-plan-de-entrenamientos`. **Sin código de aplicación y
sin cambios en la base.**

- **Pro está publicado.** `release` apunta a `a7f4918`, el mismo commit que `main`, con el CI en
  verde. Lo empujó la sesión porque Raúl lo pidió expresamente; para todas las demás sigue valiendo
  que solo publica él. Netlify lo dio por listo a las 19:56, hora canaria: 15 créditos. Entran 37
  commits, todo lo del 04/10 al 07/10. El punto 13 queda cerrado.
- **Los entrenamientos se adelantan** (DOC 08 §5b). Isaac los quiere cuanto antes y Raúl decide
  hacerlos ya. La base estaba: `training_sessions` y `training_attendance`, vacías, con
  `training.manage`, que hoy tienen Raúl e Isaac.
- **Cuatro decisiones de Raúl:** las sesiones se crean sueltas, con «Entrenamiento de hoy» y
  también repitiendo días fijos; de qué parte la lista lo elige el entrenador en la pantalla;
  **el horario lo ve todo el club, y la asistencia y las observaciones, solo los entrenadores,
  los directivos y el administrador** (DOC 04 §13, T-06 a T-09); y las tareas van programadas en
  la nube.
- **Quién ve qué se corrigió a media tarde.** La primera versión cerraba la sesión entera a
  `training.manage`; Raúl dijo que el horario es de todos. La PR #94 llevaba la primera y esta
  sesión la corrige en otra PR, antes de que arrancara ninguna tarea: se retrasaron las tres.
- **Siete tareas, de la T-227 a la T-233.** Con traspaso en `docs/traspasos/`, la T-228
  (sesiones), la T-229 (pasar lista) y la T-230 (repetir cada semana), programadas para esta
  noche, de una en una: 21:25, 22:55 y 00:25, hora canaria. La T-231 (calendario e Inicio), la
  T-232 (historial) y la T-233 (observación del entrenamiento) se escriben tras revisar estas.
- **La observación del entrenamiento se queda fuera esta noche.** Vivía en
  `training_sessions.notes`, en la misma fila que el horario. Va a una tabla propia, con
  migración: es la T-233. La T-229 guarda la asistencia y la observación de cada jugador.
- **La T-227 es de Raúl.** El SQL está en `supabase/pendientes/entrenamientos_quien_ve_que.sql`:
  abre el horario al club, cierra la asistencia a `training.manage` y al administrador, y deja
  `notes` sin uso. La sesión intentó aplicar la primera versión con la herramienta de Supabase
  y la llamada volvió pidiendo una aprobación que no llegó (punto 81). **No está aplicado**, y
  no frena a las otras tareas.
- **Los directivos no existen en la aplicación.** Ni como rol ni como permiso. Verán la
  asistencia cuando Raúl los invite con `training.manage`; leer sin escribir pide un permiso
  nuevo, sin tarea (DOC 05 §14.10).
- **El primer partido está sin cerrar.** Raúl lo reabrió el 08/10 y descartó el cambio repetido
  desde la A13: quedan seis aprobados y uno descartado, y el partido está en `finished`. Falta
  volver a cerrarlo. El punto 65 queda resuelto en cuanto lo cierre.
- **Dos cosas vistas en pro con el móvil de Raúl:** la banda de sincronización dice «1 anotación
  sin guardar» encima de un rechazo que ya no se va a reintentar, y confunde; y tras desinstalar
  la aplicación, Chrome no volvió a ofrecer instalarla por su cuenta. Sin tarea las dos.
- **Un desajuste que se corrige de paso:** el DOC 04 §15.1 decía que `schedule.manage` crea
  entrenamientos. En la base lo hace `training.manage`, y así queda escrito. La frase de la A07 la
  cambia la T-228.
- **Lo que sigue siendo de Raúl:** pegar la T-227; **invitar a Jhonatan**, el segundo entrenador,
  desde «Personas», con `training.manage`; darle `members.manage` a Isaac (punto 4); la línea de
  Realtime (punto 77); el cambio repetido (punto 65); y las pruebas en el móvil de lo del 07/10.
- **Ojo al publicar a partir de ahora:** `main:release` se lleva todo lo que haya en `main`,
  también los entrenamientos a medio hacer. Cada entrega queda completa, y lo que escribe va detrás
  de `training.manage`.
- **Sin revisar todavía:** la T-305 y la T-306 contra su traspaso. Están en `main` y en pro.

---

## Sesión 07/10/2026, noche — T-306: arreglos de la A07, las invitaciones y «Unirse a un equipo»: ✅ cerrada

Sesión programada, en la nube y sin Raúl delante, rama `fix/auth-arreglos-de-personas`, con la
T-305 ya en `main`. Un solo commit. Sin migración ni SQL.

- **A07, «Guardar» contra la foto.** Al abrir «Editar» se guarda `foto` con los permisos de ese
  momento y los cambios salen de `cambiosDePermisos(foto, marcados)`. Si la base contesta `23505`
  o cero filas al guardar permisos, `useGuardarMiembro` lanza `PERMISOS_CAMBIADOS`; si algo
  anterior ya estaba guardado (el rol, o las altas antes de unas bajas que fallan), lanza
  `GUARDADO_A_MEDIAS`. Los dos textos y las marcas viven en `model/personas.ts`, y el formulario
  se vuelve a sembrar con lo que trae la lista.
- **Foco.** Dar de baja: a la pregunta, de vuelta a «Dar de baja» con «No, dejarlo», y al nombre
  de la persona al confirmar. «Revocar»: al título de «Invitaciones pendientes». «Aceptar» una
  invitación: al `h1`. «Cancelar» una solicitud: al título de «Mis solicitudes». Tras un fallo
  en las tarjetas de la A07, al mensaje (`useFocoAlFallar`). Correo mal escrito: al campo.
- **Invitaciones de Inicio.** Con un fallo la tarjeta se queda aunque la lista vuelva vacía, con
  el mensaje y «Cerrar». «Invitación guardada…» se quita al escribir otro correo.
- **`mensajeDeLaBase`** es una sola, en `model/solicitudes.ts`, y enseña el mensaje tal cual solo
  con `42501`, `P0002`, `23514` y `23505`. Con cualquier otro, «No se ha podido completar. Vuelve
  a intentarlo.» Ajustes la usa también y cambia con ella. **Un cambio que el traspaso arrastra:**
  el `TypeError` de «sin red» ya no dice «No hay conexión», sino ese genérico.
- **API.** `guardarRol(teamId, …)` y `cambiarActivo(teamId, …)` llevan `team_id`, y
  `cambiarActivo` el estado de partida. `api/personas.test.ts` es nuevo, con el doble del cliente.
- **«Unirse a un equipo».** «Seguir» apunta el equipo en `recienSeguidos` y la fila dice
  «Siguiendo» al momento. `recienPedidos` guarda las solicitudes que ya había, y el equipo sale en
  cuanto la lista trae una nueva: una ya resuelta no sigue diciendo «pendiente».
- Lint, formato, **936 pruebas en 71 archivos** y build, sin `INEFFECTIVE_DYNAMIC_IMPORT`. La
  prueba de la foto falla si se vuelve a calcular contra la lista. **Paquete inicial sin cambio**
  (176,59 kB con mi recorrido de las importaciones, igual que `main`).
- **Deuda.** Rol y permisos siguen siendo varias peticiones sin transacción; los hooks esperan a
  que se recargue todo `auth` antes de dar por terminado un guardado; la guardia de la A07 mira
  `members.manage` en el equipo activo y no en el de la dirección (punto 24); el reseñado del
  formulario tras un conflicto depende de que la lista llegue antes que el callback; y la nota
  de la A04 sobre los equipos que nacen sin personas ya no es exacta.
- **Sin probar contra la base de verdad ni en un móvil.**

---

## Sesión 07/10/2026, noche — T-305: arreglos del contexto de acceso: ✅ cerrada

Sesión programada, en la nube y sin Raúl delante, rama `fix/auth-arreglos-del-contexto`. Nació de
`docs/docs-revision-del-07-10`, y a media sesión esa rama entró en `main` por la PR #91: la de la
tarea se rehízo encima y lleva un solo commit. Sin migración ni SQL.

- **El equipo recordado solo manda si se tiene función en él, o si no se tiene en ninguno**
  (`elegirEquipoActivo`). Quien sigue al B y después entra como miembro en el A pasa al A, y el A
  queda recordado. Con varios equipos con función, el recordado sigue mandando.
- **Un fallo al leer `team_followers` ya no tumba el contexto** (`fetchContextoDeAcceso`): se
  sigue sin seguidos. Los de `profiles` y `team_members` siguen lanzando.
- **«Mi equipo» y la tarjeta «Equipos que sigues» de Ajustes** dicen «No se pudo cargar tu
  acceso.» con su «Reintentar» cuando `teams` es nulo y hay `errorContexto`. Sin error, «Cargando…»
  como antes. Las dos anuncian «Reintentando», como `ErrorDeAcceso`.
- **El foco, que el traspaso no nombraba.** Cuando el reintento sale bien, el botón desaparece: en
  «Mi equipo» la `Pantalla` del fallo lleva `key` y el foco pasa al título, y en Ajustes pasa al
  título de la tarjeta al pulsar, como en «Dejar de seguir».
- **La tabla de «Mi equipo»:** la etiqueta del `::before` lleva texto alternativo vacío
  (`content: attr(data-etiqueta) ': ' / ''`), y la raya va con `aria-hidden` y «Sin dorsal» o
  «Sin posición» al lado. Comprobado en Chromium a 320 px con un HTML suelto: el árbol de
  accesibilidad da «Sin dorsal», «Pipo», «Delantero», sin etiquetas.
- **Una línea de más en ese CSS, que el traspaso no pedía:** delante va el `content` de antes,
  sin barra. Un Safari anterior a 17.4 o un Firefox anterior a 128 descartan la declaración con
  barra, y sin el recambio la tarjeta saldría sin etiquetas. El build conserva las dos.
- Lint, formato, **914 pruebas en 70 archivos** (eran 900 en 69) y build, sin
  `INEFFECTIVE_DYNAMIC_IMPORT`. Las seis pruebas que tenían que fallar fallaban antes del cambio.
- **Paquete inicial: 179,12 kB comprimidos, +0,03 sobre `main`** (179,09), con el mismo recorrido
  de la T-304. Margen sobre 200 kB: 20,88.
- **Deuda.** El fallo al leer los seguidos no llega a `error_logs`, y quien solo sigue a un equipo
  lee «Todavía no tienes equipo» hasta que el contexto se vuelva a pedir, que son quince minutos
  de caché. Inicio, «Más» y «Unirse a un equipo» no se han mirado con el contexto fallado. Sigue
  sin haber dónde elegir el equipo activo, y el día que lo haya, quien tenga función en un equipo
  no podrá poner de activo uno que solo sigue: habrá que revisar la regla. La clase de texto
  solo para lector está copiada de `PlantillaPage.module.css`; no hay una común en `shared`. En
  un navegador que no entiende la barra de `content`, el lector sigue oyendo la etiqueta dos
  veces. El registro de errores (C02) tiene el mismo `::before` sin arreglar.
- **Sin probar contra la base de verdad ni en un móvil.** Ningún aparato tiene hoy el caso del
  punto 82: con un solo equipo en la lista no se puede dar.

---

## Sesión 07/10/2026, noche — revisión de la T-301b, la T-301c y la T-304, y tanda siguiente: ✅ cerrada

Misma sesión de la T-301a, con Raúl. **Sin código de aplicación y sin base.**

- **Las tres están en `main`** (PR #88, #89 y #90), con el CI en verde: 900 pruebas en 69 archivos.
  Las lanzó Raúl desde su traspaso y las fusionó él: el entorno no dejó fusionar a ninguna.
- **Revisadas contra su traspaso**, una pasada del `revisor` por tarea y los dos hallazgos del
  arranque comprobados a mano. Hacen lo que pedían y están todas las pruebas de sus tablas.
- **Un fallo serio, que hoy no se puede dar** (punto 82) y varios medianos (punto 83). Salen dos
  tareas, la **T-305** y la **T-306**, con traspaso en `docs/traspasos/`. Sin base y de una en una.
- **Comprobado contra la base, leyendo sus políticas:** quien sigue a un equipo lee el club, la
  temporada, las competiciones, los partidos, las convocatorias y la plantilla. El calendario y
  «Mi equipo» del seguidor no dependen de nada que la base le niegue.
- **Programadas en la nube**, para que no dependan del ordenador de Raúl: la T-305 y, detrás, la
  T-306. La T-305 parte de la rama `docs/docs-revision-del-07-10`, que trae estos documentos, y
  su PR se los lleva a `main`.
- **La capa visual no se adelanta.** `claude/traspaso_capa_visual.md`, en el proyecto de Claude,
  la deja para la fase 5, después de la prueba de campo. Su T-500, que es solo documentación,
  tampoco se lanza todavía: dejaría el DOC 07 describiendo tokens que el código no tiene.
- **Lo que sigue siendo de Raúl:** publicar en pro antes del jueves 15, la línea de Realtime
  (punto 77), el cambio repetido (punto 65), darle `members.manage` a Isaac desde la A07 (punto 4)
  y las pruebas en el móvil de las PR #88 a #90.

---

## Sesión 07/10/2026, noche — T-304: los destinos de la barra: ✅ cerrada

Sesión lanzada por Raúl desde el traspaso, en la nube, rama `feat/platform-destinos-de-la-barra`.
Sin migración ni SQL.

- **«Equipo» abre `/equipo`** (A02b, `modules/core`, perezosa por el barril, sin guardia): nombre y
  categoría del equipo activo, que salen de `useAuth()`, y su plantilla en una tabla con dorsal,
  apodo y posición. La consulta nueva (`fetchPlantillaDeLectura`) no pide `availability`. La
  tarjeta «Gestión» solo sale con algún permiso, y el seguidor lee que puede verlo pero no
  cambiarlo. Por debajo de 600 px cada fila se compone como una tarjeta, como en el registro de
  errores, porque tres columnas no caben a 320 px con el texto al 200 %.
- **«Más» abre `/mas`** (C06, `app/routes/MasPage.tsx`, perezosa por ruta directa, sin guardia).
- **La barra** vive en `app/components/BarraDeDestinos.tsx` y `DESTINOS` en
  `app/layouts/destinos.ts`, con `esDestinoActual`. «Ver el equipo» de Inicio y el enlace de volver
  de la A05 apuntan a `/equipo`; el de `PartidoPage` a `/equipos` se queda.
- Lint, formato, **900 pruebas en 69 archivos** (eran 870 en 65) y build, sin
  `INEFFECTIVE_DYNAMIC_IMPORT`. Mirado en Chromium a 320 px, 1024 px y 320 px con el texto al
  200 %: sin desplazamiento horizontal y enlaces de 48 px o más.
- **Paquete inicial: +0,98 kB sobre `main`, por encima del medio kB del traspaso.** Con el mismo
  recorrido, 178,11 → 179,09 kB comprimidos. La barra sola suma 0,13; el resto es que Rolldown saca
  un trozo común nuevo (`Pantalla-*.js`, con React y `Pantalla`) en cuanto existe la ruta perezosa
  `/mas`. Con `MasPage` en el arranque serían +0,28, pero se aparta de «perezosa, como Ajustes»
  (D06-29). **Raúl eligió mantenerla perezosa.**
- **Deuda.** «Datos» sigue pidiendo `stats.view` y manda a `/403` a un seguidor; con varios equipos
  no hay dónde elegir el activo; `/club` y `/equipos` marcan «Equipo» aunque no se llegue a ellos
  desde la barra; y la disponibilidad de cada jugador se puede seguir leyendo por la API con solo
  seguir al equipo, aunque esta pantalla no la pida.
- **Sin probar contra la base de verdad ni en un móvil.** La prueba es la de la PR: con la cuenta de
  Raúl, «Equipo» enseña el Cadete A con su plantilla y «Gestión»; con una cuenta que solo anota, la
  misma pantalla sin «Gestión» y ningún `/403` al recorrer la barra, salvo «Datos» sin `stats.view`.
- **Lo siguiente** es la T-302, la prueba de campo del sábado 17.

---

## Sesión 07/10/2026, noche — T-301c: entrar sin equipo, seguir y pedir permisos: ✅ cerrada

Sesión lanzada por Raúl desde el traspaso, en la nube, rama `feat/auth-entrada-sin-equipo`. Sin
migración ni SQL: todo va por las funciones de la T-301a.

- **«Unirse a un equipo» existe** (A01b, `/unirse`, `modules/auth`, perezosa por el barril, sin
  guardia de permiso). Lista los equipos de `equipos_que_admiten_solicitudes`; «Seguir» es
  inmediato y recarga el contexto, y «Quiero anotar: pedir permisos» deja una solicitud con un
  mensaje opcional de hasta 280 caracteres. Arriba, las solicitudes propias, con «Cancelar» en las
  pendientes. Se llega desde la tarjeta «¿Buscas tu equipo?» de Inicio, desde la C05 y desde
  Ajustes.
- **La A07 resuelve.** «Solicitudes de permisos» solo sale si hay alguna, y entonces es la
  primera: aceptar pide rol y permisos y va por `resolver_solicitud`. «Seguidores» los lista y los
  quita, y «Lista de equipos» es la casilla que escribe `teams.accepts_requests`, solo con
  `team.manage`.
- **El seguidor es una membresía sin permisos.** `fetchContextoDeAcceso` lee también
  `team_followers`, y `construirMembresias` lo devuelve con `seguidor: true`, sin fila de miembro y
  sin rol; los equipos con función van delante, para que seguir a otro no le cambie el equipo
  activo a nadie. Ve Inicio y el calendario, y las rutas con guardia le mandan a la C05. Deja de
  seguir desde Ajustes. La A07 no cuenta la membresía de quien solo sigue.
- Lint, formato, **870 pruebas en 65 archivos** (eran 842 en 63) y build, sin
  `INEFFECTIVE_DYNAMIC_IMPORT`.
- **Paquete inicial: 179,04 kB comprimidos**, con el recorrido de siempre; `main` daba 179,38. El
  contexto de acceso le añade 0,2 kB a `App-*.js`, y Rollup junta ahora en un solo trozo lo que
  antes eran `QueryClientProvider-*.js` y `useQuery-*.js`. **`auth-*.js` sube de 7,30 a 9,50 kB.**
- **Deuda.** No hay avisos: quien lleva el equipo solo ve una solicitud si abre la A07. El seguidor
  no tiene estadísticas que mirar hasta que exista el bloque B, y los accesos rápidos de Inicio le
  llevan a la C05. Quitar a un seguidor no le impide volver (punto 69), y sacar al equipo de la
  lista no quita a quien ya lo sigue. Nadie cambia de equipo activo desde la aplicación: quien
  tiene función en un equipo y sigue otro no llega a ver el seguido. `mensajeDeLaBase` repite la
  función privada de `InvitacionesPendientes`. Tocados fuera de la tabla del traspaso:
  `api/queryKeys.ts`, `AjustesPage.module.css` y `AjustesPage.test.tsx`.
- **Sin probar contra la base de verdad ni en un móvil.** La prueba es la de la PR: poner el
  Cadete A en la lista desde la A07, seguirlo con la tercera cuenta y ver el calendario, y pedir
  permisos con ella y aceptarla con la de Raúl.
- **Lo siguiente** es la T-304, que tiene que estar fusionada el jueves 15, y después la T-302.

---

## Sesión 07/10/2026, noche — T-301b: personas y permisos (A07), e invitaciones en Inicio: ✅ cerrada

Sesión lanzada por Raúl desde el traspaso, en la nube, rama `feat/auth-personas-permisos`. Sin
migración ni SQL: todo lo que usa estaba en la base desde la T-301a.

- **La A07 existe** (`modules/auth`, perezosa por el barril): miembros con su rol y cuántos
  permisos tienen, edición en su sitio con las doce casillas y «Poner los permisos de su rol», baja
  con confirmación y «Reactivar», invitar a un correo y «Revocar». Nadie se quita `members.manage`
  ni se da de baja a sí mismo: lo impide la pantalla, que la base no lo hace.
- **La invitación se acepta en Inicio.** `InvitacionesPendientes` no pinta nada si
  `mis_invitaciones` no devuelve ninguna; acepta con `aceptar_invitacion` y llama a
  `reintentarContexto()`, así que el equipo aparece sin recargar. No se envía ningún correo.
- **«Personas» en la A04**, junto a «Plantilla», solo en el equipo donde se tiene `members.manage`
  y con ese permiso también en el equipo activo, que es el que mira la guardia de la ruta.
- Lint, formato, **842 pruebas en 63 archivos** (eran 816 en 60) y build, sin
  `INEFFECTIVE_DYNAMIC_IMPORT`.
- **Paquete inicial: 179,38 kB comprimidos**, recorriendo las importaciones estáticas desde
  `index.html` y `App-*.js`; con el mismo recorrido `main` daba 179,51. No sube: la A07 es
  perezosa. **Lo que sube es `auth-*.js`, de 1,31 a 7,29 kB comprimidos**, y ese trozo lo cargan el
  login y todas las pantallas de módulo, porque importan `useAuth` del barril. Partirlo pide que
  la A07 no salga por el barril, que es justo lo contrario de lo decidido en el traspaso.
- **Deuda.** Guardar rol y permisos son hasta tres peticiones sin transacción: si falla una a
  medias, la lista se recarga y dice lo que hay. La guardia mira `members.manage` en el equipo
  activo y no en el `:id`: con varios equipos y permisos distintos, la base es la que dice que no.
  Un equipo propio recién creado sigue naciendo sin personas y nadie puede invitar a él: la nota de
  la A04 («Hasta que existan las invitaciones…») ya no es exacta. `api/queryKeys.ts` y
  `InvitacionesPendientes.module.css` no estaban en la tabla de archivos del traspaso.
- **Sin probar contra la base de verdad ni en un móvil.** La prueba es la de la PR: Raúl invita a
  su segunda cuenta de Google, entra con ella, acepta en Inicio y ve el calendario.
- **Lo siguiente** es la T-301c. Y el punto 4: darle `members.manage` a Isaac desde la A07.

---

## Sesión 07/10/2026 — T-301a: migración de personas: ✅ cerrada

Sesión con Raúl delante del ordenador, rama `feat/db-personas-y-solicitudes`. **Toca la base de
producción**: la migración del DOC 05 §14.8, aplicada sin cambiar el SQL. Sin código de aplicación.

- **El ensayo pasó contra Supabase**: `ENSAYO_CORRECTO: 18 pruebas, nada aplicado`, y no dejó ni
  columna, ni tabla, ni usuario de prueba.
- **Aplicada** como `20261007184030_personas_y_solicitudes`, ya en `supabase/migrations/`. Las
  comprobaciones del traspaso salen todas: 13 equipos fuera de la lista, 0 solicitudes, las doce
  funciones sin permiso para `anon`, una sola política en `access_requests` y `authenticated` sin
  lectura de `full_name` ni de su consentimiento (tabla en el DOC 05 §14.8).
- **Cómo se aplicó, que no es como decía el traspaso (punto 81).** La herramienta de Supabase
  canceló el ensayo sin enseñar la confirmación, también con Raúl en el ordenador. El ensayo y la
  migración los pegó él en el SQL Editor; la migración, en un solo bloque `do` que además la
  apunta en el historial de migraciones.
- **Informe de seguridad:** los avisos 0029 pasan de 12 a 22, las diez funciones que
  `authenticated` llama. Siguen el de `btree_gist` y el de contraseñas filtradas. Ninguno nuevo de
  otro tipo.
- **Tipos** regenerados con la herramienta de Supabase y comparados con los de antes: solo añaden
  lo nuevo. Lint, formato, **816 pruebas en 60 archivos** y build, en verde.
- **Prueba de humo en pre:** hecha por Raúl el 07/10. La plantilla, la convocatoria y el cierre del
  primer partido se ven bien.
- **Deuda.** `supabase/pruebas/aislamiento_clubes.sql` no cubre `access_requests`. Nada impide que
  el último con `members.manage` se lo quite, y hoy solo lo tiene Raúl (punto 4). No hay lista de
  bloqueados (punto 69). La escritura de `full_name` por la API sigue abierta a quien tiene
  `roster.manage`. `anon` conserva el permiso de `SELECT` sobre `access_requests` que dan los
  permisos por defecto: sin política para él, no lee ninguna fila. Y el código guardado de las
  doce funciones lleva saltos CRLF, por pegarse desde Windows: no cambia lo que hacen.
- **`supabase/pendientes/` no desaparece**: sigue `realtime_del_directo.sql` (punto 77).
- **Lo siguiente** es la T-301b y, tras ella, la T-301c: ninguna necesita ya a Raúl. Sus
  traspasos están en `docs/traspasos/`, revisados el 07/10 y pensados para Opus a esfuerzo medio. En
  «Siguiente», el punto 2 se queda en la línea de Realtime y el cambio repetido (punto 65).
- **Tras ellas va la T-304**, los destinos de la barra (punto 1, decidido el 07/10), pensada
  para Sonnet a esfuerzo medio. El orden: T-301b, T-301c, T-304 y, el sábado 17, la T-302.

---

## Sesión 05/10/2026, noche — T-226: suspender el partido desde el directo: ✅ cerrada

Sesión programada, rama `feat/match-suspender-partido`. **Sin base de datos.** Hecho tal cual el
traspaso, con las pruebas escritas antes y comprobadas en rojo. Lint, formato, **816 pruebas en
60 archivos** (eran 792) y build, sin `INEFFECTIVE_DYNAMIC_IMPORT`. El paquete inicial no se ha
vuelto a medir: todo lo tocado está en el trozo perezoso del directo.

- **Qué hay.** Con el partido en juego, en pausa o en el descanso, al final de la A12 sale
  «Suspender el partido». Pregunta en su sitio, diciendo el minuto —«¿Suspender el partido en el
  23:10 de la 1.ª parte? No se puede reanudar: después solo queda cerrarlo.»—, y al confirmar
  cierra la parte abierta, deja el partido en `suspended` con su parte y su segundo, anuncia
  «Partido suspendido» y cierra la cobertura. La nota del final dice «Partido suspendido en el
  23:10 de la 1.ª parte. Queda marcado como incompleto.», con el enlace al cierre. Ya no se
  apunta nada. Los demás aparatos lo ven en el siguiente refresco, con «Otro aparato ha
  suspendido el partido.».
- **Cómo (D06-41).** `suspender` es una acción más del reductor y va por `hacer`. La parte se
  cierra con `cerrarParte`, sacada de `terminar_parte` sin cambiar lo que hace; después va el
  `update` de `match` con `status`, `suspended_period` y `suspended_seconds`. La fase local es
  `finalizado` y lo que distingue al suspendido es `suspension` en el estado. El paquete pide
  las dos columnas, y un paquete o un estado guardados de antes se leen con `null`. De
  `elegirEstado` solo cambia eso: la suspensión del aparato, y si no la del servidor. `guardados`,
  `guardando`, `ultimo` y `poner` están como estaban, y las pruebas de las demás transiciones
  pasan sin tocarlas.
- **Decisiones sin nadie delante.** (1) El «No» de la confirmación es el «Seguir jugando» de
  `Confirmar`, que no se ha tocado. (2) El botón va al final del todo, debajo de las listas del
  campo y el banquillo, separado por una línea. (3) Con el partido ya terminado manda ese
  mensaje, aunque sea en diferido. (4) En el descanso con todas las partes jugadas también se
  ofrece, junto a «Finalizar el partido», y pregunta «en el descanso, tras la 2.ª parte». (5)
  Pruebas de más sobre las del traspaso: en pausa, en el descanso, si falla el guardado y un
  partido que ya llega suspendido.
- **Flecos.** Bajo el reloj, un partido suspendido sigue diciendo «Partido terminado»: el
  traspaso solo pedía la nota. Y si el guardado falla, el aviso sale arriba, bajo el marcador,
  lejos del botón: se anuncia, pero quien mira el final de la pantalla no lo ve sin subir.
- **Deuda.** En diferido no se puede suspender desde la aplicación. Una suspensión no se
  deshace, ni desde el directo ni reabriendo desde el cierre, que lo devuelve a `suspended`. Y
  está **sin probar contra la base de verdad y en un móvil**: que la base acepte pasar de `live`
  a `suspended` con `match.live.write` sale del traspaso, no de haberlo visto. Se suma al
  punto 42.
- **Para probarlo, Raúl:** en un partido **de prueba**, empezar la primera parte, bajar al
  final, suspender y mirar que el cierre dice dónde se suspendió. En uno de verdad no: no se
  deshace.
- **Lo siguiente** es la T-301a, con Raúl delante. En la tabla de «Siguiente», la T-225 y la
  T-226 ya están hechas.

---

## Sesión 05/10/2026, noche — T-225: la banda «Partido en directo» en el resto de pantallas: ✅ cerrada

Sesión programada, rama `feat/match-banda-partido-en-curso`. **Sin base de datos.** Hecho tal
cual el traspaso, con las pruebas escritas antes y comprobadas en rojo. Lint, formato, **792
pruebas en 60 archivos** (eran 768 en 58) y build, sin `INEFFECTIVE_DYNAMIC_IMPORT`. Inicial
comprimido: **176,15 kB**, recorriendo las importaciones estáticas desde `index.html` y
`App-*.js`; con el mismo recorrido `main` daba 175,53: **+0,62 kB**, que es la banda.

- **Qué hay.** Con un partido en curso en el aparato, cualquier pantalla de `AppLayout` enseña
  arriba «Partido en directo · 34:12» y el enlace «Volver» al directo. En pausa añade «· En
  pausa» y el reloj no corre; sin parte abierta dice «Descanso». Al finalizar o al caducar la
  marca, se va sola.
- **De dónde sale el reloj (D06-40).** De la marca de `localStorage`, que ahora lleva `reloj`:
  el ancla de la parte abierta o `null`. La escribe la A12 en el efecto de siempre, y solo si ha
  cambiado. La cuenta es una sola, `segundosDesde` en `shared/lib/reloj.ts`; `match/model/reloj.ts`
  la usa y exporta lo mismo que antes. `useAhora` está en `shared/hooks/`. Ni el reductor ni el
  refresco de la A12 se han tocado.
- **Decisiones sin nadie delante.** (1) En `AppLayout` la banda y el `main` van dentro de una
  columna nueva, `.columna`, que es quien lleva ahora el `order`: era la forma de ponerla encima
  del contenido también con el rail de escritorio sin `fixed` ni `sticky`. En el DOM queda tras
  la navegación: con el tabulador, «Volver» llega después de los cinco destinos, y «Saltar al
  contenido» se la salta. (2) Con el reloj parado nada repinta la banda, así que vuelve a mirar
  la caducidad una vez por minuto. (3) Sin tercer argumento, `marcarPartidoEnCurso` marca sin
  reloj, y un reloj estropeado en la marca se lee como `null` en vez de perder la marca entera.
- **Visto en Chromium, no en un móvil.** A 320, 360 y 1024 px, y a 320 px con el texto al 200 %:
  sin desplazamiento horizontal, «Volver» de 48 px de alto y nada tapado. A 320 px y 200 % la
  banda y la barra se llevan casi toda la ventana, y ahí desplaza la columna entera. El alto
  contraste va por tokens semánticos y no se ha mirado en pantalla. Se suma al punto 42.
- **Flecos.** «Descanso» sale también con todas las partes jugadas y el partido sin finalizar.
  Y la caducidad sigue contando desde la primera vez que se marcó (así desde la T-207): un
  partido que se retome más de cuatro horas después de empezar se queda sin banda y deja de
  callar el aviso de versión nueva.
- **Deuda.** La marca no dice de quién es: si entra otra persona en ese aparato antes de cuatro
  horas, ve la banda, y es el directo quien decide si la deja pasar. Y la banda solo sale en el
  aparato que tiene el directo abierto o lo tuvo, no en el de quien solo mira.

---

## Sesión 05/10/2026, noche — tanda siguiente: la T-225 y la T-226: ✅ cerrada

Sesión con Raúl. **Sin base de datos y sin código**: dos traspasos y su programación.

- **`main` está en verde** tras la T-221, la T-223 y la T-224: lint, formato, **768 pruebas en 58
  archivos** y build. Las tres se han dado por buenas con su informe; no se han revisado contra
  su traspaso, como sí se hizo con las anteriores.
- **Salen dos tareas**, las dos piezas del directo que estaban escritas en los documentos y sin
  tarea: la **T-225**, la banda «Partido en directo · mm:ss · Volver» (punto 41), y la **T-226**,
  suspender desde la A12 (punto 40). Traspasos en `docs/traspasos/`. Programadas para esta noche,
  de una en una.
- **Lo que queda sin Raúl se acaba aquí.** De la lista de abajo, lo demás pide la base (T-301a,
  Realtime, puntos 65 y 73), una decisión suya (puntos 1 y 18), un móvil (puntos 42, 46, 60 y 62)
  o dos partidos metidos (bloque B). El cuello de botella ya no son las sesiones.
- **Las tareas se programan desde una conversación con el repositorio añadido**
  (`claude/diag_sesion_programada.md`, en el proyecto de Claude): la sesión programada hereda el
  clon y no puede añadírselo.

---

## Sesión 05/10/2026 — T-224: flecos del cierre, «Mis aportaciones» y el registro de errores: ✅ cerrada

Sesión programada, rama `fix/review-flecos-de-la-revision`. **Sin base de datos.** Los siete
arreglos del traspaso, con las pruebas escritas antes y comprobadas en rojo. Lint, formato,
**768 pruebas en 58 archivos** (eran 754) y build, sin `INEFFECTIVE_DYNAMIC_IMPORT`. Inicial
comprimido: **175,11 kB**, medido recorriendo las importaciones estáticas; no sube, porque nada
de lo tocado es del paquete inicial.

- **Registro de errores.** Ninguna página se vuelve a pedir sola (`refetchOnWindowFocus` y
  `refetchOnReconnect` a `false`); el botón «Actualizar» vacía los cursores, invalida las
  consultas de errores y anuncia el resultado. Si falla «Cargar 50 más», el botón se queda con
  «Reintentar», el fallo se anuncia y pulsarlo repite esa misma página. Una ruta que sea solo `*`
  ya no filtra.
- **Cierre y A14.** `guardarOrigen` lleva el `match_id`; «Borrando…» solo sale con el borrado en
  marcha; los botones con `aria-disabled` no cambian de fondo al pasar el ratón. `CLAUDE.md` dice
  ya «`id`, `match_id` y estado» en el párrafo de la T-210b.
- **Pruebas nuevas.** La fila de vuelta de cada `update` y `delete` de `discordancias` y
  `aportaciones`, el `gte` de «solo hoy» con la hora fija, el hook `useErrores` (su prueba
  nueva), «Actualizar», «Reintentar», «Sí, borrar» durante el refresco y el `match_id` del origen.
- **Una decisión sin nadie delante.** «Actualizar» desmonta las páginas siguientes con
  `flushSync` antes de invalidar: si no, también se volverían a pedir y no se usarían. Y el
  anuncio de «Actualizar» se hace una sola vez, al terminar, aunque la lista no haya cambiado.
- **Deuda.** El registro de errores ya no se pone al día solo: hay que pulsar «Actualizar». Y el
  `match_id` en el filtro sigue sin impedir tocar un evento de un partido que otro acaba de
  cerrar (punto 73): eso es del disparador que protege los partidos cerrados, fuera de esta tarea.

---

## Sesión 05/10/2026 — T-223: flecos del directo entre aparatos: ✅ cerrada

Sesión programada, rama `fix/match-flecos-entre-aparatos`. **Sin base de datos.** Los siete
arreglos del traspaso, con las pruebas escritas antes. Lint, formato, **754 pruebas en 57
archivos** (eran 743: trece nuevas y dos repetidas que salen) y build, sin
`INEFFECTIVE_DYNAMIC_IMPORT`. No se han tocado `reducir`, `conciliarPartes`, `faseConciliada`,
`elegirEstado` ni `fusionar`, y las tres pruebas de «un refresco nunca se come un toque» siguen
en verde sin cambios.

- **La pantalla (`LiveMatchPage`).** El último estado vive en un `ref`, `ultimo`, y solo se
  cambia con `poner`; `intentar` reduce sobre él y el refresco funde sobre él (D06-38, DOC 06
  §5.4). Si al fundir cambia la fase, se anuncia: «Otro aparato ha empezado la parte N.», «…ha
  terminado la parte N.» u «…ha finalizado el partido.». Al finalizar desde otro aparato se
  cierran el flujo y la ficha.
- **La descarga (`precarga`).** `guardarPaquete` no escribe si lo guardado se pidió después que
  lo que llega; los eventos se piden por `created_at` y `client_event_id`.
- **El canal (`tiempoReal`).** `INSERT` y `UPDATE` de las dos tablas con el filtro del partido, y
  `DELETE` de `match_events` sin filtro.
- **«Descartado»** en «Últimos eventos», y las pruebas de la tabla del traspaso: dos repetidas
  fuera, la de la parte adoptada corregida —ahora adopta de verdad y cierra con 2.405 s, los que
  van desde el arranque del servidor— y el caso nuevo del transporte.
- **Dos cosas que no cuadraban con el traspaso, decididas sin nadie delante**, por si no gustan:
  1. **El foco al finalizar.** El traspaso mandaba el foco «a donde ya lo manda la página cuando
     finaliza este aparato», y la página no lo mandaba a ningún sitio: también caía en `body`.
     Ahora, en los dos casos, si el foco se ha quedado en `body` va a la nota «El partido ha
     terminado…»; si está en algo que no se va —«Salir del directo»—, no se le quita. Cambia,
     por tanto, lo que pasa al finalizar en este aparato, que el traspaso no pedía.
  2. **`UltimosEventos` no tiene prueba propia.** La palabra se comprueba en
     `LiveMatchPage.test.tsx`, que es donde se prueba esa lista.
- **Deuda.** La escucha de borrados está sin probar contra Realtime, que sigue sin publicar
  (punto 77). Con la publicación aplicada, cualquier borrado de `match_events` de cualquier club
  avisa a todos los directos abiertos; con un club es nada. Y si otro aparato finaliza, la
  cobertura de este se queda abierta hasta el cierre del partido (C-03), como ya pasaba.
- **`CLAUDE.md` no se ha tocado**: el traspaso no lo pedía. La siguiente es la T-224.

---

## Sesión 05/10/2026 — T-221: arreglos de la revisión en la banda y la cobertura: ✅ cerrada

Sesión programada, rama `fix/match-arreglos-de-la-revision`. **Sin base de datos.** Los diez
arreglos del traspaso, con las pruebas escritas antes. Lint, formato, **743 pruebas en 57
archivos** (eran 712) y build, sin `INEFFECTIVE_DYNAMIC_IMPORT`.

- **La banda (`sync`).** El foco ya no cae en `body`: a la pregunta al abrir la confirmación, al
  «Descartar» de ese elemento con «No», y tras descartar al del siguiente, al del anterior, al
  titular de la banda o, si la banda se va, al `h1`. Cada «Descartar» se llama «Descartar:
  <entidad> · <fecha y hora>», y la confirmación es un grupo con ese nombre.
  `descartarRechazado` es un solo `delete()` de Dexie. Si Dexie falla se dice y la confirmación
  sigue abierta; si ya no estaba, también se dice. El anuncio es «Descartado: <entidad>».
- **La cobertura (`match`).** `CoberturaLocal` lleva `userId`; `leerCobertura(partidoId, userId)`
  solo devuelve la propia y la de otra cuenta se pisa sin encolar su cierre (D06-37, DOC 06
  §5.4). Declarar, cerrar y cambiar devuelven `{ cobertura, aplicado }`. «Salir» espera al cierre
  1,5 s como mucho. `contarPendientes(userId, { sin: ['coverage'] })` deja la cobertura fuera de
  la pregunta al salir del directo; la banda y Ajustes siguen contándola.
- **Tres cosas decididas sin nadie delante**, por si no gustan:
  1. La confirmación es un `<fieldset aria-label>` y no un `<div role="group">`: es el mismo
     papel, y `oxlint` avisa del `role` escrito a mano (`prefer-tag-over-role`).
  2. El nombre de «Descartar» lleva la hora **con segundos**; el texto visible sigue en minutos.
     Sin ellos, dos anotaciones rechazadas en el mismo minuto se llamarían igual.
  3. El fallo al descartar y el «No se ha cambiado» de la cobertura, además de anunciarse, **se
     ven**: la región viva está oculta, y quien mira la pantalla no se enteraba.
- **`CLAUDE.md` no se ha tocado**: el traspaso no lo pedía. Su párrafo «Siguientes tareas» sigue
  nombrando la T-221; la siguiente es la T-223.

---

## Sesión 04/10/2026, noche — revisión de la T-209b, la T-209c y la T-222, y `main` otra vez en verde: ✅ cerrada

Sesión con Raúl. **Sin base de datos.** Dos PR: la #78, que arregla `main`, y esta, de documentación.

- **`main` estuvo roto de la #76 a la #78.** La T-209c se disparó dos veces y salieron dos PR con
  la misma rama (#75 y #76). La segunda se fusionó resolviendo conflictos a mano y dejó en
  `match/model/directo.test.ts` una prueba sin cerrar: ni lint, ni tipos, ni pruebas, ni CI. La
  #78 la quita, y quita los párrafos y comentarios que quedaron dobles. **El código de `main` es
  el de la #75.** Hoy: lint, formato, **712 pruebas en 57 archivos** y build.
- **La T-222 perdió en su fusión** la versión 4.9 y su párrafo del DOC 08. Repuestos aquí. Su
  código llegó entero: es idéntico al de la rama.
- **La T-221 no está hecha.** Su sesión programada falló a los cuatro minutos de arrancar y no
  dejó rama ni PR. El traspaso sigue valiendo: los símbolos que nombra están en `main`.
- **Revisadas contra su traspaso** la T-209b (#74), la T-209c (#75) y la T-222 (#77): hacen lo que
  pedían, sin nada que rompa datos. Lo que sale está en los puntos 79 y 80 de abajo y en dos
  tareas nuevas, la **T-223** y la **T-224**, con traspaso en `docs/traspasos/`.
- **Tres lecciones para las sesiones programadas**, ya escritas en el traspaso de la conversación
  que programa (`claude/traspaso_programar_noche_0410.md`, en el proyecto de Claude):
  1. Antes de empezar, la sesión mira si ya existe la rama o una PR de su tarea. Si existe, se va.
  2. No programa nada, ni recordatorios: si tiene que esperar, espera dentro de la sesión.
  3. Una PR con conflictos no se resuelve en el editor de GitHub: se rehace la rama sobre `main`.

---

## Sesión 04/10/2026, noche — T-222: arreglos del cierre, «Mis aportaciones» y el registro de errores: ✅ cerrada

Sesión programada, rama `fix/review-arreglos-de-la-revision`. **Sin base de datos y sin migración.**

- `review`: `resolverEvento`, `aprobarPendientes`, `cambiarMinuto`, `cambiarJugador`, `cambiarSegundo` y `borrarEvento` filtran también por `match_id`. `aprobarPendientes` devuelve `{ pedidos, aprobados }` y la tarjeta avisa si son menos. Cero filas al cambiar el minuto dice «Ese evento ya no se puede cambiar…» en la A13 y la A14 (`EVENTO_YA_NO_SE_PUEDE_CAMBIAR`, en `model/discordancias.ts`). «Guardando…» solo con la mutación en marcha, `flag_duplicate_candidates` una vez por partido y montaje, los autores con `keepPreviousData` y, en la A14, el foco vuelve a la leyenda del formulario tras un fallo (`MinutoDelEvento` gana una leyenda).
- `logging`: `fetchErrores(filtros, cursor)` pagina por cursor (`created_at` e `id` descendentes) y `useErrores` no vuelve a pedir solas las páginas con cursor. La pantalla anuncia el resultado de filtrar, deja el foco en la primera fila nueva, usa `aria-disabled` en «Cargar 50 más» (`Button.module.css` lo estiliza como `disabled`), tiene los roles de tabla escritos a mano y `h3` en `Detalle`. `escaparComodines` quita los `*`.
- Pruebas nuevas de las tres `api/`: `discordancias.test.ts`, `aportaciones.test.ts` y `errorLogs.test.ts`, con un doble de `supabase` que apunta las llamadas encadenadas.

Punto 76 de abajo: **cerrado.** Punto 73: el filtro lleva ya el partido, y sigue faltando el disparador en la base.

---

## Sesión 04/10/2026, noche — T-209c: las partes, compartidas entre aparatos: ✅ cerrada

Sesión programada, rama `fix/match-partes-compartidas`. **Sin base de datos y sin migración.**
Todo el cambio es de `match/model/directo.ts`: la pantalla no se ha tocado.

- **Hecho:** `elegirEstado` parte siempre del estado del aparato y concilia sus partes por
  número con las del servidor (`conciliarPartes`, D06-39), al abrir y en cada refresco. El `id`
  y el arranque son del primero que llegó a la base; la pausa sigue local. Lo que otro cierra o
  finaliza se ve sin recargar, y `terminar_parte` va por `{ match_id, period_number }`.
- **Dos cosas que el traspaso no decía**, y que se han decidido aquí:
  1. **Cerrada en los dos sitios, se quedan los segundos de este aparato.** Es lo que ya pasaba;
     si otro cerró después con otra duración, la buena es la de la base y aquí no se ve.
  2. **La pausa se conserva solo si sigue abierta la parte que se pausó.** Si el servidor ya va
     por la siguiente, queda en juego: con «pausado» y una parte sin pausa, no se podía reanudar.
- **El traspaso daba por roto algo que ya no lo estaba:** que lo sin enviar desapareciera con el
  servidor más avanzado. `fusionar` (T-209b) ya lo conservaba; la prueba de extremo a extremo
  de ese caso nació en verde. Ahora tampoco depende de `fusionar`: `elegirEstado` no devuelve
  el estado del servidor si hay uno local.
- **Pruebas:** las de `api/directo.test.ts` que guardaban un «pausado» sin ninguna parte, que
  el reductor no puede dar, usan ahora una parte abierta y en pausa.
- **Verificado:** lint, formato, **676 pruebas en 54 archivos** y build, sin
  `INEFFECTIVE_DYNAMIC_IMPORT`. `match-*.js`, 20,45 kB comprimidos (antes 20,29); el arranque no
  importa nada nuevo.
- **Sin probar con dos móviles en un campo**, ni contra la base de verdad.
- **Deuda:** la pausa de un aparato no la ven los demás, y con reloj corrido apenas se usa; los
  relojes de dos móviles pueden diferir unos segundos, y el ancla es la hora del que abrió la
  parte; dos cierres casi a la vez dejan en la base la duración del último que llega; y el
  estado conciliado no se escribe en la instantánea hasta el siguiente guardado, como el fundido
  de la T-209b; y un
  cierre encolado con una versión anterior de la aplicación sigue yendo por `id`.

---

## Sesión 04/10/2026, noche — T-209b: lo que apuntan los demás, en el momento: ✅ cerrada

Sesión programada, rama `feat/match-tiempo-real`. **Sin base de datos y sin migración.** La T-221
no estaba hecha ni tenía PR abierta: esta no depende de su código, pero las dos tocan
`LiveMatchPage.tsx` y a la T-221 le tocará rebasar.

- **Hecho:** el directo vuelve a descargar el partido solo y lo funde con lo del aparato
  (D06-38). Lo de otros dice «De otro aparato»; lo que parece apuntado dos veces, «Posible
  repetido», y se anuncia una vez por pareja, sin bloquear ni preguntar. Lo deshecho aquí ya no
  vuelve al recargar con el borrado en la cola.
- **Cuándo refresca:** 1 s después del último aviso de Realtime, cada 20 s por seguridad —60 s
  desde que llega un aviso de verdad—, y al volver a la pantalla o a tener red. Con la pantalla
  oculta o sin red, no. **Hoy solo trabaja la red de seguridad** (punto 77).
- **Dónde vive:** `sync/api/almacen.ts` (`pendientesDelPartido`), `match/model/directo.ts`
  (`fusionar`), `match/model/eventos.ts` (`parejasRepetidas`, `posiblesRepetidos`,
  `leerVentanas`), `match/api/tiempoReal.ts`, `match/api/directo.ts` (`refrescarDirecto`) y
  `match/hooks/useRefresco.ts`. El paquete trae `ventanas`, y la instantánea, `pedidoEn`.
- **Un refresco no se come un toque:** no coge el cerrojo de guardar. Lee la cola sin guardado en
  marcha, la da por buena solo si el contador de guardados no se ha movido, y cambia el estado en
  ese turno; si no, medio segundo y otra vez, hasta cinco. Probado con mutaciones: quitar
  cualquiera de las tres guardas tumba una prueba.
- **Cuatro cosas que el traspaso no decía**, y que se han decidido aquí:
  1. El contador se apunta justo antes de cada lectura de la cola, no una vez en el paso 1: con
     el del paso 1, un toque durante la descarga dejaba el refresco sin hacer hasta el siguiente.
  2. **Sin cobertura, `cargarDirecto` no quita nada de lo del aparato**: el paquete es el de la
     última vez y la cola puede haber purgado lo enviado. Lo deshecho sí se respeta.
  3. Un refresco que no contesta en 15 s caduca, para que una petición colgada no pare los
     demás.
  4. El borde de la ventana de repetidos cuenta (`<=`), como en `flag_duplicate_candidates`.
- **Verificado:** lint, formato, **661 pruebas en 54 archivos** y build, sin
  `INEFFECTIVE_DYNAMIC_IMPORT`. **Paquete inicial: 175,42 kB comprimidos, igual que en `main`**;
  `match-*.js`, 20,29 kB, y `sync-*.js`, 35,16 kB.
- **Sin probar con dos móviles en un campo**, ni contra la base de verdad, ni con Realtime
  publicado.
- **Deuda:** cada refresco son cinco consultas, y con cuatro anotadores cada 20 s habrá que
  medirlo; además escribe el paquete en IndexedDB, y un toque que coincida espera a esa
  transacción, que son milisegundos pero está sin medir en un móvil lento; «De otro aparato» no
  dice quién, y lo dice también de lo propio cuando el aparato ya no guarda su estado (otro móvil
  de la misma persona, o un partido olvidado y vuelto a abrir); el aviso de repetido usa los
  segundos de cada aparato, que dependen de su reloj hasta la T-209c; si un toque cae en los
  milisegundos entre que el refresco cambia el estado y la pantalla se repinta, lo fundido se
  pisa y vuelve con el siguiente refresco, sin perder el toque; y un gol ajeno sin aprobar mueve
  la botonera una línea al aparecer «Incluye 1 gol sin aprobar».

---

## Sesión 04/10/2026, tarde — revisión de las T-219 a T-303 y tanda siguiente: ✅ cerrada

Sesión de Cowork con Raúl al otro lado. Rama `docs/docs-revision-de-la-tarde`. **Sin código de
aplicación.**

- **Las seis están en `main`** (PR #67 a #72): T-219, T-220, T-210b, T-209a, T-211 y T-303. Lint,
  formato, **597 pruebas en 52 archivos** y build en verde, sin `INEFFECTIVE_DYNAMIC_IMPORT`. El
  registro de errores sale en su trozo perezoso, 2,2 kB comprimidos, y `sync` no lo arrastra.
- **Revisadas contra su traspaso**, con cuatro pasadas del `revisor` y una lectura a mano de lo
  delicado. **Nada que rompa datos en el uso normal.** Lo que sí hay son fallos medianos, que van
  a dos tareas nuevas, la T-221 y la T-222, y dos deudas que piden base (puntos 73 a 78).
- **La base cuadra con lo que la T-209a da por bueno**: `coverage_declarations` admite la fila que
  se encola y un cierre en el mismo instante que el alta.
- **La T-209b se parte**: el código va hoy, sin tocar la base; la publicación de Realtime es una
  línea que espera a Raúl, en `supabase/pendientes/realtime_del_directo.sql` (punto 77).
- **Programadas para hoy**, en la nube: T-221, T-209b, T-209c y T-222.
- **Ninguna de las seis se ha probado en un móvil ni contra la base de verdad.**

---

## Sesión 04/10/2026, noche — T-303: registro de errores para administración (C02): ✅ cerrada

Sesión programada, rama `feat/logging-panel-admin`. **Sin base de datos y sin migración.**

- **Hecho:** `/admin/logs` deja de ser pantalla pendiente: `logging/routes/RegistroDeErroresPage.tsx`,
  perezosa por el barril de `logging`. Enlace «Registro de errores» al final de Ajustes, solo con
  `is_platform_admin`. Sin ser administrador, «Tu cuenta no puede ver el registro de errores.» y
  ninguna consulta de errores.
- **Dónde vive:** `model/consulta.ts` (origen, resumen, filtros), `api/errorLogs.ts`
  (`fetchErrores`, `contarErroresDesde`, `fetchNombres`, `fetchEsAdministrador`) y
  `hooks/useErrores.ts`. `logging` solo importa de `shared`: el perfil se pide con su propia
  consulta y no por `AuthProvider`.
- **Decisión pequeña:** sin `useInfiniteQuery`; cada página es su consulta con `staleTime`.
- **Paquete inicial:** 175,42 kB comprimidos frente a 173,85 en `main` (mismo recorrido, desde
  `index.html` y `App-*.js`): **+1,57 kB**, por el reparto de trozos de Rollup (`useQuery` sale de
  `App` a su trozo), no por código de la C02, que es perezosa. Sin `INEFFECTIVE_DYNAMIC_IMPORT`.
- **Deuda:** los errores no se borran ni caducan; no hay aviso de error nuevo; un fallo de guardado
  que el directo enseña como mensaje no llega al registro. Sin probar en móvil ni contra la base.

---

## Sesión 04/10/2026, noche — T-211: «Mis aportaciones» (A14): ✅ cerrada

Sesión programada, rama `feat/review-mis-aportaciones`. **Sin base de datos y sin migración.**

- **Hecho:** `/mis-aportaciones` ya no es una pantalla pendiente. Lista lo que ha apuntado quien
  tiene la sesión en los partidos del equipo y la temporada activos, por partido, el más reciente
  primero, con el estado de cada evento. En un partido sin cerrar: «Minuto», «Jugador»,
  «Asistencia» en los goles propios —con «Sin asistencia», la primera—, «Entra» en los cambios y
  «Borrar», con confirmación. Del rival, solo «Minuto» y «Borrar». Los cerrados salen plegados y
  solo para leer. Lo ya revisado, sin `event.approve`, dice que lo corrige quien cierra.
- **Dónde vive:** `review/model/aportaciones.ts`, puro; `review/api/aportaciones.ts`, en línea y
  con `SIN_FILAS`; `review/hooks/useAportaciones.ts`, una sola mutación para las cuatro
  correcciones, que invalida sin esperar la lista y el cierre de ese partido; y
  `review/routes/MisAportacionesPage.tsx`. El formulario del minuto sale del panel a
  `review/components/MinutoDelEvento.tsx` y lo usan los dos; `nombrador` pasa a `model/cierre.ts`.
- **Decisiones pequeñas, que el traspaso no decía:** «Jugador» solo sale si el evento ya lleva
  jugador, para no ponerle uno a un córner a favor; el que ya está puesto sale en la lista,
  marcado «(ahora)» y sin poder elegirse; el borrado es una sola fila con `delete`, y al terminar
  una línea dice qué se borró y recibe el foco; un rechazo de `validate_match_event` (P0001) se
  enseña tal cual y deja el formulario abierto, y con `SIN_FILAS` se cierra. La lista sale de tres
  consultas seguidas —partidos, eventos propios y convocatorias—, sin embeber `matches` en
  `match_events`, que tiene dos relaciones con el mismo nombre.
- **Pruebas:** 578 en verde, lint, formato y build limpios, sin `INEFFECTIVE_DYNAMIC_IMPORT`.
  `review-*.js` pasa de 30,43 a 41,06 kB (de 9,65 a 12,29 comprimidos); el arranque no cambia.
- **Deuda:** cambiar el jugador de un cambio o de una expulsión con el partido en juego no se
  refleja en el directo, ni en el de los demás ni en el del propio aparato, hasta su siguiente
  refresco (T-209b); no se puede cambiar el tipo de un evento, hay que borrarlo y apuntarlo otra
  vez; en un partido cerrado no se corrige nada sin reabrirlo; y cambiar quien entra no vuelve a
  pasar las reglas de reentrada ni de expulsado, que la base solo comprueba al insertar.
- **Sin probar en un móvil ni contra la base de verdad.** Las políticas `match_events_update` y
  `match_events_delete` se dan por buenas según el traspaso. Para Raúl, sobre el primer partido:
  reabrirlo o usar uno sin cerrar, entrar en «Mis aportaciones» y cambiar una asistencia.

---

## Sesión 04/10/2026, noche — T-209a: cobertura declarada: ✅ cerrada

Sesión programada, rama `feat/match-cobertura-declarada`. **Sin base de datos y sin migración.**

- **Hecho:** abrir la A12 declara qué sigue quien anota, con `full_team`, si el aparato no tiene
  una abierta y el partido no ha terminado. Una línea bajo el marcador, «Sigues: todo el equipo»,
  y «Cambiar», que abre en su sitio «Todo el equipo», «Un jugador» —entre los convocados— y «Solo
  goles y tarjetas»; cambiar cierra la que hay y abre otra desde ese instante. Se cierra al salir
  con el botón y al finalizar. La A13 gana la tarjeta «Coberturas», de solo lectura, cerrada o no.
- **Dónde vive (D06-37):** `match/model/cobertura.ts`, puro; `match/api/cobertura.ts`, que encola
  y escribe `Instantanea.cobertura` en una transacción; `match/components/Cobertura.tsx`. El
  reductor y `EstadoDirecto` no se han tocado. `guardarPaquete` conserva la cobertura.
- **Decisiones pequeñas, que el traspaso no decía:** con todas las partes jugadas, o el partido
  finalizado, el instante es el final de la última parte y no una parte de más, que es también
  donde las termina el cierre; **en diferido salir no la cierra**, porque sin reloj no hay
  instante y el DOC 04 §10.6 la da por entera, y la termina el cierre; con anotaciones sin enviar
  la cobertura no se cierra hasta «Salir igualmente»; si la instantánea ya tiene una abierta que
  no es la que la pantalla creía, no se guarda ni se encola nada; y si declarar o cerrar falla en
  el aparato, se anota y se sale igual. En la A13 el tramo va en minutos transcurridos, «Del
  minuto 0 al 82»: el descuento de la primera parte cuenta de más y la segunda empieza en el 40.
- **Pruebas:** 554 en verde, lint, formato y build limpios, sin `INEFFECTIVE_DYNAMIC_IMPORT`. La
  de `api/cobertura` va sobre Dexie de verdad, con `fake-indexeddb`: comprueba que es todo o nada.
  `match-*.js` pasa de 55,65 a 61,49 kB (de 17,40 a 18,89 comprimidos) y `review-*.js` de 28,09 a
  30,43 (de 9,03 a 9,65); el arranque no cambia.
- **Deuda:** la misma persona en dos aparatos abre dos coberturas, y la fórmula del DOC 04 §10.3
  las contaría como corroboración. El índice de fiabilidad sigue sin pintarse en ninguna
  pantalla: es del bloque B. Y salir del directo por el botón de atrás del navegador no cierra la
  cobertura: sigue abierta, y al volver no se declara otra.
- **Sin probar en un móvil ni contra la base de verdad.** Las políticas de `coverage_declarations`
  se dan por buenas según el traspaso: la primera alta real dirá si la cola la deja pasar.

---

## Sesión 04/10/2026, tarde — T-210b: el cierre revisa los eventos: ✅ cerrada

Sesión programada, rama `feat/review-discordancias`. **Sin base de datos y sin migración.**

- **Hecho:** la tarjeta «Eventos» de la A13 (`review/components/PanelDeEventos.tsx`) sustituye a
  «Eventos pendientes» en el partido sin cerrar. Lista todos los eventos, también los descartados,
  en orden de parte y segundo, con su estado y quién lo apuntó (`display_name`, o «Otra persona»).
  Con `event.approve`: «Aprobar», «Descartar», «Recuperar», «Cambiar minuto» en su sitio y «Aprobar
  los N pendientes». Al abrir llama una vez a `flag_duplicate_candidates` y marca los posibles
  repetidos, juntos. `model/discordancias.ts` es lo puro y `api/discordancias.ts` lo que escribe:
  `status`, `reviewed_by` y `reviewed_at`, o `period` y `seconds`, y nada más.
- **Decisiones pequeñas:** aprobar en bloque aprueba los pendientes **que se ven**, por su `id`, y
  no uno que llegue después; «Recuperar» lleva también el estado de partida en el filtro; un
  descartado no hace grupo de repetidos, como en la función de la base; el evento sin segundos va
  al final de su parte; los botones esperan desactivados mientras la lista se vuelve a pedir; y
  con un solo pendiente el botón dice «Aprobar el pendiente».
- **Pruebas:** 512 en verde, lint, formato y build limpios, sin `INEFFECTIVE_DYNAMIC_IMPORT`.
  `review-*.js` pasa de 19,93 a 28,09 kB (de 6,71 a 9,03 comprimidos); el arranque no cambia.
- **Deuda:** «los dos valen» no se guarda, así que un par marcado como posible repetido vuelve a
  salir marcado cada vez que se abre el cierre. Y cambiar el minuto va en línea, no por la cola:
  sin cobertura no funciona.
- **Sin probar en un móvil ni contra la base de verdad.** Las políticas y la función se dan por
  buenas según el traspaso. La primera prueba real es la del punto 65: reabrir el primer partido,
  descartar el cambio repetido del 46 y volver a cerrar. Está en la PR, para Raúl.

---

## Sesión 04/10/2026, tarde — T-220: flecos del flujo y enlace al directo desde la convocatoria: ✅ cerrada

Sesión programada, rama `fix/match-flecos-del-flujo`. **Sin base de datos.**

- **Hecho:** los seis arreglos del traspaso. `Registro.module.css` da a `.opcion`, `.jugador` y `.saltar`
  un estado desactivado con borde discontinuo y `--color-text-secondary`; `FlujoDeRegistro` devuelve el
  foco a la pregunta cuando `ocupado` pasa a `false`, dice «1.ª parte» y pinta «Sin asistencia» y
  «Sin motivo» encima de la lista (también sin candidatos). La A11 enlaza el directo con
  `tieneDirecto` (ahora exportada por `agenda`) y `match.live.write`.
- **Decisión pequeña:** no hay token de borde fuerte; `.saltar` usa `--color-text` en el borde.
- **Pruebas:** 495 en verde, lint, formato y build limpios. Sin probar en un móvil.

---

## Sesión 04/10/2026, tarde — T-219: la banda lista lo rechazado y deja descartarlo: ✅ cerrada

Sesión programada, rama `feat/sync-descartar-rechazados`. **Sin base de datos.**

- **Hecho:** `EstadoDeCola` gana `rechazados` (`id`, `entity`, `op`, `createdAt`, `lastError`); la C04 los
  lista dentro de «Qué dijo el servidor», nombrados por su tabla, con la hora y el error, y cada
  uno se descarta con confirmación en su sitio. `descartarRechazado(id, userId)` en `api/almacen.ts`
  solo borra un `failed` de esa persona y no sale por el barril.
- **Pruebas:** `cola`, `almacen` y la banda; 487 en verde, lint, formato y build limpios.
- **Deuda:** descartar borra el trabajo de la cola, pero el evento rechazado sigue en la precarga
  del partido de ese aparato hasta que el partido se cierra. La cola no conoce a `match`, y
  limpiarlo pide que `match` se entere.
- **Sin probar en un móvil.**

---

## Sesión 04/10/2026, mediodía — I1 cerrada y traspasos del lote siguiente: ✅ cerrada

Misma sesión de Cowork, con las respuestas de Raúl. Rama `docs/docs-seguir-sin-aprobacion`. **Sin
código de aplicación.**

- **I1 cerrada: seguir a un equipo no necesita aprobación** (DOC 03). La migración pendiente y su
  ensayo están reescritos: `seguir_equipo`, solicitudes solo de permisos y el nombre real fuera de
  la API (DOC 05 §14.8, puntos 14 y 68 de abajo).
- **El ensayo ha pasado en local**: las ocho migraciones más el ensayo sobre PGlite, con
  `ENSAYO_CORRECTO: 18 pruebas, nada aplicado`. Contra Supabase sigue sin lanzarse.
- **La asistencia del primer gol, quitada** en la base: Raúl la puso sin querer. **El cambio
  repetido sigue ahí**: Raúl dio el visto bueno, pero el borrado pide una confirmación en la
  aplicación que no llegó (punto 65).
- **Pre comprobado**: `main--gavetastats.netlify.app` sirve lo de la T-215 a la T-218. Producción
  sigue en el 27/09.
- **Traspasos nuevos o cambiados** en el proyecto de Claude: T-220 (gana «Sin asistencia»
  arriba), T-301a y T-301c (seguir directo), T-209a a c, T-211, T-303 y el guion de la T-302.

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
| La asistencia del gol del 18', quitada (a las 11:14)  | Raúl la puso sin querer             |

Salió mal una cosa, y está en los puntos 64 y 65: el móvil de Raúl tenía dos de esos cambios en la
cola. El partido lo cerró Raúl desde la aplicación a las 10:11, 0 – 9.

---

## DEUDA TÉCNICA GENERADA

Los puntos 59 a 78 de abajo.

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

   **Decidido por Raúl el 07/10: la B, y además «Equipo» abre el equipo activo**, con la
   plantilla en solo lectura para quien pertenece al equipo o lo sigue; la lista de equipos queda
   para quien gestiona el club. La B sola dejaba el `/403` de «Equipo». «Datos» no se toca. Es
   la **T-304**, con traspaso en `docs/traspasos/`.
   **Cerrado el 07/10 con la T-304.**

2. **`clock` y `plus` haciendo de casa y calendario.** El inventario de 21 iconos del DOC 07 §8.2
   no tiene ninguno de los dos. Decidir si entran dos iconos nuevos.

Pendiente de hacer:

3. **`npm run db:types` deja el archivo de tipos a cero bytes si el CLI falla.** Se restaura con
   `git checkout -- src/types/database.types.ts`. **Antes de tocar ese script, haz copia.** Las
   sesiones de Cowork generan los tipos con el MCP de Supabase.
4. **Solo Raúl tiene `members.manage`.** Isaac, que es quien lleva el equipo, tiene los otros once
   permisos y no ese: no podría invitar ni aceptar a nadie. Dárselo desde la A07 en cuanto exista
   (T-301b). Y marcar `event.approve` a quien lleve el registro cada partido.
   **Desde el 07/10 ya se puede:** Raúl abre «Personas» en la A04, edita a Isaac y se lo marca.
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
    **Cerrado el 08/10**: `release` está en `a7f4918`, igual que `main`.
14. **Cómo entra alguien nuevo, cerrado el 04/10 (DOC 03, I1).** Tres puertas: la invitación a un
    correo, que esa cuenta ve y acepta al entrar con Google; **seguir, que es inmediato y no lo
    aprueba nadie**; y la solicitud de permisos, que acepta quien tiene `members.manage`. Un equipo
    solo se puede seguir, y solo se le puede pedir, si quien lo lleva lo ha puesto en la lista.
    Es la T-301, partida en tres: la migración (T-301a, DOC 05 §14.8, **sin aplicar**), la A07
    (T-301b) y la entrada (T-301c). Raúl no ha dicho nada de que los equipos nazcan fuera de la
    lista: es como está escrito, y se cambia con una casilla.
    **La T-301a está aplicada desde el 07/10**: quedan la A07 y la entrada.
    **Cerrado el 07/10**: la A07 (T-301b) y la entrada (T-301c) están en `main`.
15. **A01b no está en el inventario del DOC 02.** O entra como parada técnica, o se le da otro sitio.
    **Cerrado el 07/10**: es «Unirse a un equipo», `/unirse`, con su fila en el DOC 02 §2 (T-301c).
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
    **Cerrado por la T-219** (descartar sí; reintentar sigue fuera).
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
    **Cerrado con la T-209c (D06-39), salvo la pausa**, que sigue siendo de cada aparato.
40. **El directo no suspende.** El DOC 04 §8.1 tiene el estado `suspended` con su minuto, y desde la
    T-210a la A13 cierra y reabre partidos suspendidos y dice dónde se suspendieron. Pero la A12
    solo lleva a `finished`: suspender es una acción de su reductor, con su transición en la cola
    y `suspended_period` y `suspended_seconds` (la base exige los dos). **Es la T-226**, sin el
    diferido. **Cerrado por la T-226** (05/10, D06-41), salvo el diferido.
41. **Falta la banda «Partido en directo · mm:ss · Volver»** en el resto de pantallas (DOC 02
    §3.1). La marca de `shared/lib/partidoEnCurso.ts` ya dice qué partido está en curso; falta la
    banda. **Es la T-225.** **Cerrado por la T-225** (05/10): la banda sale en `AppLayout`.
42. **Sin comprobar en el navegador**: ni el reloj a 7:1 al sol, ni el bloqueo de pantalla en un
    móvil de verdad. Los colores salen de los tokens del directo del DOC 07.
43. **Corregir el minuto de un evento** (E8-09) es hoy deshacerlo y volver a apuntarlo. La
    edición de verdad, con `update` por la cola, va con las discordancias (T-210b).
    **Cerrado por la T-210b**: el minuto se cambia desde la A13, en línea y con `event.approve`.
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
    **Cerrado por la T-210b**: los pendientes se aprueban o se descartan desde la A13.
52. **En diferido, cerrar crea las partes que falten, y eso pide `match.live.write`.** Quien solo
    tenga `match.close` ve el motivo y no puede cerrar. Con los permisos sembrados del Cadete A no
    pasa. Salida si molesta: la función del punto 50, que no dependería de la RLS de
    `match_periods`.
53. **C-03 a medias.** El cierre da por terminadas las coberturas abiertas en el final del
    partido, pero no las lista: hasta la T-209a no existe ninguna. La lista entra con ella.
    **Cerrado con la T-209a:** el directo las declara y la A13 las lista.

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
    **Cerrado en la T-220**: «Ir al directo» / «Ir a apuntar», también en solo lectura.

60. **Flecos del flujo de registro** (T-215 y T-218), todos sin ver en un móvil: los botones
    desactivados mientras guarda no tienen estilo propio en `Registro.module.css`; si el guardado
    falla, el foco puede irse a `body`; el aviso de los 4 s no tiene prueba; las pastillas de lo
    respondido no se han visto a 320 px con cuatro seguidas; el selector dice «2ª parte» y el
    resumen y el error «2.ª parte»; y en la ficha de jugador en diferido el resumen sale vacío en
    el paso del minuto. Va en la T-220, menos lo de ver en un móvil, que es de la T-302.
    **La T-220 cierra** los estilos desactivados, el foco, «1.ª parte» y la prueba de los 4 s.
    **Sigue abierto:** ver las pastillas a 320 px y el resumen vacío de la ficha en diferido.

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
    siete cambios y fueron seis. **Raúl dio el visto bueno a borrarlo el 04/10**, y el borrado
    volvió cancelado: la herramienta pide una confirmación en la aplicación de Claude y no llegó.
    La fila que sobra es la `abcea703-…`, la que no tiene motivo. Dos salidas: repetirlo con Raúl
    mirando la pantalla, o descartarlo desde la A13 cuando esté la T-210b, reabriendo el partido.
    **Desde la T-210b ya se puede descartar desde la A13**, reabriendo el partido.

66. **El primer partido no tiene cobertura declarada**, porque la declaración llega con la T-209a.
    Su fiabilidad saldrá «Sin cobertura declarada» hasta que se le ponga la del diferido, que el
    DOC 04 §10.6 da por entera desde el minuto 0.
    **Tras la T-209a sigue igual:** el primer partido no tiene cobertura hasta que alguien se la
    ponga a mano.

67. **Los traspasos guiados van en `docs/traspasos/`** desde la tarde del 04/10, y el proyecto de
    Claude guarda una copia como `claude/traspaso_T-xxx.md`. Los de la T-212 a la T-220, la
    T-210b, la T-209a, la T-211, la T-303 y las tres T-301 siguen solo en el proyecto. Las
    sesiones programadas corren en la nube, clonan el repositorio y leen el traspaso de ahí:
    así no dependen de tener el proyecto a mano. Cada sesión añade su cierre aquí arriba, corto,
    y la siguiente sesión de revisión los junta. Falta darle su sitio en el DOC 00 §5.

68. **El nombre real de los jugadores se podía pedir por la API.** `authenticated` tiene permiso
    de lectura sobre toda la tabla `players`, y la política deja leer la fila a quien sigue al
    equipo. La aplicación nunca pide `full_name` y hoy está vacío en todos, así que no ha salido
    nada. La T-301a lo cierra con permisos de columna (DOC 05 §14.8). **Hasta que se aplique, que
    nadie rellene `full_name`.** Tampoco está cerrada la escritura: quien tiene `roster.manage`
    puede escribirlo por la API.
    **La lectura quedó cerrada el 07/10 con la T-301a.** La escritura sigue abierta.

69. **Sin lista de bloqueados.** A quien se le quita de seguidor puede volver a seguir mientras el
    equipo esté en la lista. Para cerrarle el paso hay que sacar al equipo de ella. Se asume para
    el MVP: el seguidor solo lee calendario, resultados, dorsales y apodos.

70. **«Sin asistencia» está, pero no se ve.** Va debajo de la lista de jugadores, junto a «Atrás».
    La noche del primer partido era además el último paso del flujo, el que daba el error falso de
    la T-215: Raúl acabó eligiendo a un jugador para poder guardar. La T-220 lo sube encima de la
    lista, y lo mismo con «Sin motivo».
    **Cerrado en la T-220.**

71. **Lo apuntado mal no se corrige desde la aplicación**, salvo el minuto (T-210b). Cambiar el
    jugador o la asistencia, o borrar un evento propio, es la A14, «Mis aportaciones» (T-211), que
    ya tiene traspaso. Hasta entonces, por SQL y con el punto 64 delante.
    **Cerrado en la T-211 para los partidos sin cerrar**: en uno cerrado, primero se reabre.

72. **El ensayo de la T-301a pasa en local y no en Supabase.** Se montó con PGlite en la carpeta
    temporal de la sesión, sin tocar el repositorio: tres roles, un esquema `auth` mínimo, las ocho
    migraciones, `seed.sql` y dos jugadores. Si se quiere repetible, pide una dependencia de
    desarrollo y un script; no se ha añadido.
    **Cerrado el 07/10**: el ensayo pasó contra Supabase antes de aplicar.

73. **Lo de un partido cerrado se puede cambiar con una pantalla vieja.** El panel del cierre
    (T-210b) y «Mis aportaciones» (T-211) solo esconden las acciones si el partido está cerrado;
    sus `update` y `delete` van por el `id` del evento y la base no mira el estado del partido.
    Si otro aparato cierra mientras, quien tiene `event.approve` cambia o borra un evento de un
    partido cerrado y los tramos ya no cuadran. La T-222 añadió el `match_id` al filtro; cerrarlo
    de verdad es un disparador en la base, **sin escribir y sin tarea**: pide decidir antes cómo
    se corrige entonces un partido cerrado desde SQL.

74. **La banda pierde el foco al descartar**, su borrado no es una sola operación y un fallo de
    Dexie al descartar se queda sin decir nada (T-219). Va en la T-221.
    **Cerrado por la T-221.** Queda: el foco va al `h1` buscándolo en el documento, que es lo
    único que `sync` sabe de la pantalla.

75. **La cobertura es del aparato, no de la persona.** Si alguien deja una abierta y otra cuenta
    entra en ese móvil, no declara la suya y al salir encola un cierre que la base rechaza.
    Además: salir del directo espera a que se guarde el cierre de la cobertura, sin límite de
    tiempo; cambiar lo que se sigue anuncia el cambio aunque no se haya guardado; y abrir el
    directo sin red deja «1 anotación sin enviar» sin haber apuntado nada. Va en la T-221.
    **Cerrado por la T-221.** Queda, como deuda: los fallos de la cobertura en el aparato no
    llegan al registro de errores, porque `match` no puede importar de `logging`; si el cierre
    no llega a guardarse al salir, la cobertura queda abierta hasta el cierre del partido; y una
    guardada antes de la T-221, sin `userId`, se sigue dando por propia de quien entre.

76. **Flecos del cierre, de «Mis aportaciones» y del registro de errores**: aprobar en bloque no
    avisa si aprobó menos de los pedidos; el registro pagina por desplazamiento y repite o se
    salta filas si entran errores mientras; faltan regiones vivas y foco tras «Cargar 50 más» y
    tras un fallo; y ninguna de las tres `api/` nuevas tiene prueba propia: sus pantallas las
    prueban con dobles. Cerrado en la T-222.

77. **Realtime sin publicar.** La T-209b deja escrito el canal y funciona sin él: el refresco de
    seguridad va cada 20 s hasta que llega el primer aviso de verdad, y a partir de ahí cada 60.
    Aplicar `supabase/pendientes/realtime_del_directo.sql` es una línea y pide la confirmación
    de Raúl.
    **Desde la T-209b el código está en `main`**: falta solo aplicar el SQL (DOC 05 §14.9).
    **Ojo al aplicarlo:** Supabase no filtra los borrados («Delete events are not filterable»), y
    el canal los pide con filtro. La T-223 los escucha sin filtro. Con dos sesiones, deshacer un
    evento en una y mirar que la otra lo quita en un par de segundos.

78. **Entrar al directo a mirar deja una cobertura de duración cero**, y volver tras cerrar la
    aplicación a medias da por cubierto el hueco entero. La fórmula de fiabilidad tendrá que
    ignorar las primeras; lo segundo se asume. Es del bloque B.

79. **Flecos del directo entre aparatos** (revisión de la T-209b y la T-209c). Lo que otro
    aparato termina o finaliza cambia la pantalla sin anunciarse, y si pilla un flujo abierto el
    foco se pierde; un toque puede reducir sobre un estado anterior al último fundido; una
    descarga lenta puede pisar en el aparato un paquete más nuevo; los borrados pueden no avisar
    por Realtime; los eventos se descargan sin orden; y quedan pruebas repetidas de la segunda
    T-209c. **Es la T-223.** Fuera de ella, y solo con la base incoherente: con dos partes
    abiertas en el servidor, `reducir` mira la primera abierta y la fase, la última; y un partido
    `suspended` con la parte abierta queda finalizado con la parte en pausa.
    **Cerrado por la T-223 el 05/10, salvo esos dos estados raros.**

80. **Flecos del cierre, de «Mis aportaciones» y del registro de errores** (revisión de la
    T-222). El registro vuelve a pedir la primera página al volver el foco y descoloca las
    siguientes; si falla «Cargar 50 más» no se puede reintentar; una ruta que sea solo `*` filtra
    de más; `guardarOrigen` no lleva el `match_id`; «Borrando…» sale de más; y a las pruebas de
    las `api/` les falta exigir la fila de vuelta. **Cerrado por la T-224 (05/10).**

81. **La herramienta de Supabase cancela lo que cambia la base sin enseñar la confirmación.**
    Pasó el 04/10 con Raúl en el móvil y el 07/10 con él en el ordenador: la llamada vuelve
    `cancelled` y a Raúl no le sale nada. Leer sí funciona. Lo que escribe en la base lo pega
    Raúl en el SQL Editor, con el SQL preparado en un archivo y la sesión comprobando después.
    Vale para la línea de Realtime (punto 77) y para el cambio repetido (punto 65). Una
    migración así se apunta a mano en `supabase_migrations.schema_migrations`, dentro del mismo
    bloque.

82. **El equipo recordado gana aunque solo se siga** (revisión de la T-301c). Quien sigue al
    equipo B y después entra como miembro en el A se queda con B de activo, sin permisos y con
    las rutas guardadas en `/403`, y no hay dónde cambiar de equipo. Con un solo equipo en la
    lista no se puede dar. Además, un fallo al leer `team_followers` tumba el contexto entero,
    y «Mi equipo» y la tarjeta de Ajustes se quedan en «Cargando…» si el contexto falla. **Es
    la T-305.**
    **Cerrado el 07/10 con la T-305.**

83. **Flecos de la A07, las invitaciones y «Unirse a un equipo»** (revisión de la T-301b y la
    T-301c). «Guardar» calcula los cambios contra los permisos de ahora y no contra los de
    cuando se abrió «Editar»; un guardado a medias no se dice; el mensaje de una invitación que
    ya no vale desaparece con la tarjeta; y el foco cae en `body` al dar de baja, revocar,
    aceptar, cancelar y tras un fallo. **Es la T-306.**
    **Cerrado el 07/10 con la T-306.**

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
   (punto 13). Pre ya lo tiene todo.
2. **Estar delante para lo que toca la base**: la T-301a, que desbloquea la T-301b y la T-301c;
   la línea de Realtime (punto 77); y el borrado del cambio repetido (punto 65), que ya se
   puede hacer también desde el cierre, reabriendo el partido.
3. **Probar en el móvil, en pre, lo de hoy**: descartar el rechazado de la banda, «Sin
   asistencia» arriba, el panel del cierre y «Mis aportaciones». Y con dos móviles en un partido
   de prueba: que uno vea lo que apunta el otro y que los dos relojes marquen lo mismo.
4. **Decir si los equipos nacen fuera de la lista** (punto 14). Es como está escrito.
5. **Decidir los destinos de la barra** (punto 1). En la prueba de campo, un anotador sin
   `team.manage` que pulse «Equipo» cae en `/403`. La salida recomendada es la B.

**Las tareas, en orden**, cada una con su traspaso en `docs/traspasos/` o en el proyecto de Claude:

| Orden | Tarea      | Qué                                                              | Esfuerzo | Necesita a Raúl |
| :---- | :--------- | :--------------------------------------------------------------- | :------- | :-------------- |
| 1     | **T-225**  | La banda «Partido en directo» en el resto de pantallas           | Medio    | No              |
| 2     | **T-226**  | Suspender el partido desde el directo                            | Medio    | No              |
| 3     | **T-301a** | Migración de personas: invitaciones, seguir y solicitudes        | Alto     | Sí              |
| 4     | **T-301b** | A07, personas y permisos                                         | Medio    | No, tras la a   |
| 5     | **T-301c** | Entrar sin equipo: seguir, pedir permisos y el seguidor que mira | Medio    | No, tras la b   |
| 6     | **T-302**  | Prueba de campo, el sábado 17 de octubre en casa. Tiene guion    | —        | Sí              |

La T-302 tiene fecha y no espera a nadie: lo que no esté fusionado y publicado el jueves 15 no
entra en la prueba. Todas tocan el DOC 08 y este documento: de una en una.

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
