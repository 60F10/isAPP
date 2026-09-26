# DOC 08 — TAREAS

> **Versión:** 2.6 — 26/09/2026 (T-207 cerrada) · 2.5 — 26/09/2026 (T-206 cerrada, antes del hito del 4 de octubre) · 2.4 — 26/09/2026 (T-205 cerrada) · 2.3 — 26/09/2026 (T-204 cerrada; nace la T-203b) · 2.2 — 26/09/2026 (T-203 cerrada) · 2.1 — 26/09/2026 (T-202 cerrada) · 2.0 — 26/09/2026 (T-201 cerrada, con el alta de club y el escudo fuera) · 1.9 — 25/09/2026 (T-107 cerrada: fase 1 completa) · 1.8 — 25/09/2026 (T-106 cerrada) · 1.7 — 18/09/2026 (T-102 cerrada) · 1.6 — 14/09/2026 (T-104) · 1.5 — 13/09/2026 (T-103) · 1.4 — 12/09/2026 (T-101) · 1.3, 1.2 y 1.1 el mismo día
> **Para qué sirve:** lista atómica de tareas hasta el MVP. Una tarea, una conversación, una rama.
> **Se apoya en:** DOC 00 §5 y §7 (método y fases), DOC 02 (pantallas), DOC 06 (módulos), DOC 07 (sistema de diseño)
> **Archivo:** `docs/08_TAREAS.md`

---

## 1. Cómo se usa

Cada fila es una tarea. Se abre una conversación con la plantilla del DOC 00 §5.2, se trabaja, y se cierra con el traspaso del DOC 13. El criterio de terminada es el del DOC 00 §6: las cinco condiciones, sin excepciones.

**Unidad de estimación: la sesión.** Una sesión es una conversación de trabajo de hora y media o dos horas con el proyecto delante. Las tareas de dos sesiones ya vienen partidas por dentro; las de tres no existen, porque una tarea que no cabe en dos sesiones está mal definida.

**Estados:** ⬜ sin empezar · 🚧 en curso · ✅ terminada · ⏸️ aparcada.

---

## 2. Capacidad, y el problema

Del 12 de septiembre al 25 de octubre hay **seis semanas justas**.

| Concepto                                     | Cifra          |
| :------------------------------------------- | :------------- |
| Sesiones que pide la ruta completa (§4 a §6) | **26**         |
| Sesiones que pide la ruta mínima (§3)        | **24,5**       |
| Semanas disponibles                          | 6              |
| Ritmo que exige la ruta completa             | 4,3 por semana |
| Ritmo que exige la ruta mínima               | 4,1 por semana |

> **Actualización (v1.2).** La auditoría del 12/09 añade la T-100b y la T-105b, media sesión cada una. La ruta mínima pasa de 23,5 a 24,5 y el ritmo cruza las cuatro sesiones semanales. Las dos son baratas hoy y caras en noviembre: una migración sobre una base vacía y la prueba que convierte la multitenencia en un hecho.
>
> **Corrección (v1.1).** La v1.0 daba 17 sesiones para la ruta mínima. Diecisiete son las **tareas**, no las sesiones, y además aquella ruta se dejaba fuera los permisos y la prueba de campo, que la decisión C1 vuelve obligatorios. Las cifras de arriba son la suma real de la columna «Sesiones».

**No hay ruta cómoda.** Recortar el alcance ya se hizo en el §7 y solo ahorra 1,5 sesiones, porque lo gordo —el directo, la capa offline y el cierre— es precisamente el MVP. Con los cuatro anotadores dentro, el plan exige **3,9 sesiones semanales sin fallar ninguna**, y eso no deja colchón: una semana en blanco hay que recuperarla con dos dobles.

**Palanca de emergencia**, si a mitad de camino el ritmo no se sostiene: quitar el tiempo real entre anotadores de la T-209 y dejar que cada uno anote por su cuenta, resolviendo las discordancias al cerrar el partido. Ahorra vez y media y conserva los cuatro anotadores. Se decide en el hito del 4 de octubre, no antes.

---

## 3. Ruta mínima al 25 de octubre

**El MVP es esto y nada más: que se pueda meter un partido entero, de principio a fin.** Lo que se haga después con esos datos se decide con la liga en marcha.

Lo que tiene que estar en pie para que Isaac registre el primer partido de liga:

```
T-100 → T-100b → T-101 → T-102 → T-103 → T-104 → T-105 → T-105b → T-106
      → T-201 → T-202 → T-203 → T-204 → T-205
      → T-206 → T-207 → T-208 → T-209 → T-210
      → T-301 → T-302
```

Veintiuna tareas. **T-301 y T-302 no son opcionales**: con cuatro anotadores en el campo (decisión C1, confirmada el 12/09), la pantalla de personas y permisos es por donde entran los otros tres, y la prueba de campo es lo único que valida de verdad que la pantalla de directo aguanta el uso real. Todo lo demás espera.

**Hito de control: el 4 de octubre.** Si en esa fecha la T-206 no está cerrada, la capa offline se recorta a lo imprescindible —cola de salida sin precarga— y se documenta como deuda. Llegar sin directo no es una opción; llegar con un directo que solo funciona con cobertura, sí lo es, aunque duela.

---

## 4. Fase 1 · Cimientos

| ID         | Tarea                                                                                                        | Pantallas | Depende de | Sesiones | Rama                              | Estado |
| :--------- | :----------------------------------------------------------------------------------------------------------- | :-------- | :--------- | :------- | :-------------------------------- | :----- |
| **T-100**  | Cerrar la tarea de base de datos: commit, merge y `.env.local`                                               | —         | —          | 0,5      | `feat/db-aplicar-esquema-inicial` | ✅     |
| **T-100b** | Migración de correcciones de la auditoría y del permiso `event.approve` (DOC 05 §14.2). Aplicada y fusionada | —         | T-100      | 0,5      | `feat/db-correcciones-auditoria`  | ✅     |
| **T-101**  | Dependencias del DOC 06 §2.3, `shared/lib/env.ts` y `shared/lib/supabase.ts`. `tsc -b` y CI en verde         | —         | T-100      | 1        | `feat/platform-cliente-supabase`  | ✅     |
| **T-102**  | PWA y metadatos: `vite-plugin-pwa`, manifiesto, iconos, precaché de la fuente, instalable de verdad          | —         | T-101      | 1        | `feat/platform-pwa-y-metadatos`   | ✅     |
| **T-103**  | `tokens.css`, `Icon` con los 21 SVG ya dibujados, `Button`, `Field`, `Card`, `Toast`, `StatusChip`           | —         | T-101      | 1        | `feat/platform-sistema-diseno`    | ✅     |
| **T-104**  | Enrutado, guardias de sesión y permiso, esqueleto de navegación, foco al navegar, división del paquete       | A02       | T-103      | 1        | `feat/platform-enrutado`          | ✅     |
| **T-105**  | Acceso con Google en la aplicación, sesión, equipo activo y permisos en memoria                              | A01, A01b | T-104      | 1        | `feat/auth-login-google`          | ✅     |
| **T-105b** | Prueba de aislamiento entre clubes: segundo club, otro usuario, y que no vea nada del primero                | —         | T-105      | 0,5      | `fix/db-aislamiento-clubes`       | ✅     |
| **T-106**  | Error boundary, escritura en `error_logs` y aviso de sesión a punto de expirar                               | C03       | T-104      | 1        | `feat/logging-captura-errores`    | ✅     |
| **T-107**  | Ajustes de usuario: alto contraste, movimiento reducido, cierre de sesión                                    | C01       | T-103      | 0,5      | `feat/platform-ajustes`           | ✅     |

**La T-107, cerrada el 25/09, y con ella la fase 1.** Pantalla C01 con alto contraste, movimiento reducido y «Cerrar sesión». Las dos preferencias se guardan en el dispositivo y no en el perfil, porque `profiles` no tiene columna para ellas (D06-25). El cierre de sesión sale solo en este dispositivo. Los destinos de la barra siguen como estaban, pendientes de Raúl. Detalle en el DOC 13.

**La T-106, cerrada el 25/09.** Error Boundary global con la C03, la misma C03 en el `errorElement` del enrutador, captura global de `window` y registro silencioso en `error_logs`, limpio de testigos y correos y con freno contra bucles. El error de entorno ya tiene pantalla: `main.tsx` carga `App` con `import()` para poder pintarlo. Las rutas guardadas enseñan un «No se pudo cargar tu acceso» con reintento cuando falla el contexto de acceso, y una banda avisa de que la sesión caduca cuando la renovación automática no ha podido. Detalle en el DOC 13.

**La T-105b, cerrada el 25/09.** El script `supabase/pruebas/aislamiento_clubes.sql` confirma que ningún club lee ni escribe en otro. De paso destapó que `rebuild_match_stints` y `flag_duplicate_candidates` se ejecutaban sobre partidos ajenos, y lo cierra la migración `20260925182524_guarda_permiso_funciones_partido.sql`. Queda como deuda que un club puede enlazar objetos de otro en sus propias filas. Detalle en el DOC 13.

La T-103 bajó de dos sesiones a una porque los veintiún iconos y el logo ya estaban dibujados desde el 12/09. **Cerrada el 13/09** con el componente `Icon` y cinco de los siete componentes base: `EventButton` se va a la T-208 y `ReliabilityMeter` al bloque de cobertura, porque ninguno de los dos se puede escribir bien sin la pantalla que los usa.

**El presupuesto de 200 kB, resuelto en la T-104 con el dato delante.** El paquete inicial mide **167,83 kB comprimidos**: 165,08 de JavaScript y 2,75 de CSS. Quedan **32,2 kB de margen** y **no hace falta ninguna de las tres salidas del DOC 06 §10.3**: ni sacar Supabase del arranque, ni aflojar la excepción de A12, ni subir la cifra.

**Por qué la proyección se quedaba corta.** La T-101 daba 190,27 kB y la T-103 sumaba unos 5 kB del sistema de diseño, o sea unos 195 kB para el arranque de la T-104. Aquella medición metió las cuatro dependencias de producción en el grafo a la fuerza, y **a Dexie no lo importa nadie todavía**: entra con la T-206.

**Y la T-102 se comió 3,75 kB de ese margen.** El paquete inicial quedó entonces en **171,58 kB comprimidos**, contando el trozo de `workbox-window`.

**La T-105 se comió otros 3,61 kB.** El paquete inicial está ahora en **175,19 kB comprimidos**: 169,87 de JavaScript, 3,12 de CSS y 2,20 de `workbox-window`. Quedan **24,81 kB** para A12 de verdad (T-207 y T-208) y Dexie (T-206). La medición completa está en el DOC 13.

**La T-105 cerró con una persona delante**, que era su condición desde el primer día: el clic en la pantalla de cuenta de Google no lo da una sesión automática. Trajo además una pieza que no estaba en la tarea y sin la cual no se podía verificar: `supabase/seed.sql`, con el club, la temporada, el equipo y los doce permisos, porque la base estaba vacía y sin filas las veinte rutas mandaban a `/403`. El porqué está en el DOC 13.

**La T-102, además, apagó la deuda de la fuente.** Inter vive autoalojada en `public/fonts/InterVariable-latin.woff2`, subconjunto latino del eje variable, 48 kB, y entra en la precaché. Con eso se van los tres avisos que arrastrábamos desde la T-101: los dos por carga del navegador y el de `vite build`.

**El criterio de la T-102 cambió de redacción, y conviene saber por qué.** La versión original pedía «Lighthouse ≥ 90 en PWA». **Esa categoría ya no existe**: Lighthouse la retiró en la versión 12 y la máquina de desarrollo tiene la 13.5.0, cuyas categorías son `accessibility`, `best-practices`, `performance`, `seo` y `agentic-browsing`. El criterio pasa a ser lo que aquella categoría medía, y se comprueba a mano: manifiesto servido como `application/manifest+json` y sin errores de parseo, service worker registrado, activo y controlando la página tras recargar, iconos de 192 y 512 más el maskable resueltos, `start_url` respondiendo 200 y `display: standalone`.

---

## 5. Fase 2 · Meter datos

| ID         | Tarea                                                                                                | Pantallas | Depende de | Sesiones | Rama                           | Estado |
| :--------- | :--------------------------------------------------------------------------------------------------- | :-------- | :--------- | :------- | :----------------------------- | :----- |
| **T-201**  | Club y equipos: alta, edición, escudo, equipo gestionado frente a equipo de referencia               | A03, A04  | T-105      | 1        | `feat/core-club-y-equipos`     | ✅     |
| **T-202**  | Plantilla y ficha de jugador: apodo, dorsal, posición, estado. Sin nombre real ni foto               | A05, A06  | T-201      | 1        | `feat/core-plantilla`          | ✅     |
| **T-203**  | Competiciones y reglamento: duración de partes, jugadores en campo, `enabled_event_types`            | A08       | T-201      | 1        | `feat/rules-competiciones`     | ✅     |
| **T-203b** | Categoría de la competición en columnas y campo de casa del club, tras la migración del DOC 05 §14.4 | A08, A10  | T-204      | 0,5      | `feat/rules-categoria-y-campo` | ⬜     |
| **T-204**  | Calendario y alta de partido, incluido el partido a posteriori                                       | A09, A10  | T-203      | 1        | `feat/agenda-calendario`       | ✅     |
| **T-205**  | Convocatoria y alineación inicial                                                                    | A11       | T-204      | 1        | `feat/lineup-convocatoria`     | ✅     |
| **T-206**  | Capa offline: Dexie, precarga del partido y cola de salida con reintento e idempotencia              | C04       | T-205      | 2        | `feat/sync-cola-offline`       | ✅     |
| **T-207**  | Directo, esqueleto: reloj, partes, marcador, tramos y bloqueo de pantalla                            | A12       | T-206      | 2        | `feat/match-directo-reloj`     | ✅     |
| **T-208**  | Directo, registro: botonera de eventos, ficha de jugador, háptica y confirmación de 2 s              | A12       | T-207      | 2        | `feat/match-directo-botonera`  | ⬜     |
| **T-209**  | Directo, varios anotadores: cobertura declarada, tiempo real y marca de duplicado                    | A12       | T-208      | 1,5      | `feat/match-directo-cobertura` | ⬜     |
| **T-210**  | Cierre de partido y panel de discordancias: aprobar, descartar, recálculo de tramos                  | A13       | T-209      | 2        | `feat/review-cierre-partido`   | ⬜     |
| **T-211**  | Mis aportaciones                                                                                     | A14       | T-210      | 0,5      | `feat/review-mis-aportaciones` | ⬜     |

**La T-201, cerrada el 26/09, con dos piezas fuera.** A03 enseña y edita el club del equipo activo; A04 lista los equipos del club separando los propios de los rivales, y los da de alta y los edita. **Fuera**: el alta de un club nuevo, porque con la RLS actual el club nacería invisible hasta para quien lo crea (ciclo del DOC 13, punto 26), y el escudo, porque el cubo `crests` no existe. El logo del C.D. Unión Tejina espera en `docs/recursos/` para subirlo cuando exista. Sin borrado: ni `clubs` ni `teams` tienen política para ello.

**La T-202, cerrada el 26/09.** A05 lista la plantilla del equipo por dorsal y da de alta jugadores; A06 edita apodo, dorsal, posición habitual y disponibilidad, y da de baja. Del jugador solo viajan apodo, dorsal y posición: ninguna consulta toca las columnas del nombre real. «Sancionado» se enseña y no se elige. Detalle en el DOC 13.

**La T-203, cerrada el 26/09.** A08 lista las competiciones del club en la temporada en curso, las da de alta con el reglamento del cadete que Isaac confirmó ese día y edita el reglamento entero: partes, minutos, descanso, reloj, tipo y número de cambios, convocados, titulares, amarillas, roja y los once botones del directo. La duración se calcula a la vista. La categoría va en el nombre, porque `competitions` no tiene columna para ella. Detalle en el DOC 13.

**La T-204, cerrada el 26/09.** A09 enseña el calendario del equipo activo en dos listas, por jugar y jugados, con el local delante, el estado en palabras y, según los permisos, «Editar» y «Convocatoria». A10 da de alta y edita partidos: competición, rival, en casa o fuera, fecha, hora, campo y la casilla del partido en diferido (D5). Borra solo si sigue programado. Detalle en el DOC 13.

**La T-205, cerrada el 26/09.** A11 reparte la plantilla del equipo en titulares, suplentes y no convocados, con el dorsal y la posición de ese partido propuestos desde la inscripción. Quien no está disponible sale con el motivo y sin opciones. Guardar exige los titulares exactos y no pasar del máximo de la competición, y pasa el partido a convocado. Empezado el partido, la convocatoria se enseña y no se toca. **Pasar a convocado pide hoy `schedule.manage`**: la RLS de `matches` no admite `lineup.manage`, y la función que lo arregla espera en el DOC 05 §14.5. Detalle en el DOC 13.

**La T-206, cerrada el 26/09, en una sesión y sin recorte.** El hito del 4 de octubre queda cumplido. Cola de salida en IndexedDB con Dexie, en orden por partido, con retroceso de 1 a 60 s, errores definitivos a `failed` y a `error_logs`, idempotencia por clave del dispositivo, un solo vaciador por cerrojo entre pestañas y purga a las 48 horas. Cada trabajo se envía solo con la sesión de quien lo encoló. La banda C04 dice «Sin conexión», lo que queda por enviar y lo rechazado. Precarga del partido al entrar en la convocatoria, con «Partido listo para usar sin conexión» y la petición de almacén persistente. La C01 avisa antes de cerrar sesión con trabajos en cola. **Nada la usa todavía**: el directo (T-207 y T-208) es quien encola eventos. Dexie queda fuera del paquete inicial. **La T-207 tiene que decidir** cómo entra la A12, que hoy va en el arranque y necesitará Dexie (DOC 13, punto 47). Detalle en el DOC 13.

**La T-207, cerrada el 26/09, en una sesión.** La A12 tiene su esqueleto: reductor puro del partido, reloj por anclaje con pausa y descuento, empezar y terminar partes con confirmación, finalizar, marcador con los goles sin aprobar avisados, campo y banquillo, y pantalla encendida. Lee de lo precargado y guarda cada transición junto con sus filas en una sola transacción: sobrevive a una recarga. La A12 pasa a perezosa (decisión de Raúl) y el aviso de versión nueva se calla durante el partido. **Sin botonera de eventos**: es la T-208, que además hereda dos cosas, tipar las filas que encola y mandar los segundos cuando haya habido pausa. Detalle en el DOC 13.

**La T-203b nace el 26/09**, de dos decisiones de Raúl: la categoría de la competición en columnas propias y el nombre único por temporada, más el campo de casa del club, que dio ese mismo día. Pide antes la migración del DOC 05 §14.4, que hace una sesión de Cowork.

**La T-206 va antes que el directo a propósito.** Enchufar la cola a una pantalla ya escrita obliga a reescribir cada manejador de evento; escribir la pantalla contra una cola que ya existe no cuesta nada. Es la dependencia que más caro sale saltarse.

---

## 6. Fase 3 · Concurrencia y prueba de campo

| ID        | Tarea                                                                                   | Pantallas | Depende de | Sesiones | Rama                          | Estado |
| :-------- | :-------------------------------------------------------------------------------------- | :-------- | :--------- | :------- | :---------------------------- | :----- |
| **T-301** | Personas y permisos: invitación por correo, alta en el equipo, permisos por filas       | A07       | T-210      | 1,5      | `feat/auth-personas-permisos` | ⬜     |
| **T-302** | Prueba de campo en un amistoso, con los cuatro anotadores y los dos sistemas operativos | —         | T-301      | 1        | —                             | ⬜     |
| **T-303** | Registro de errores para administración                                                 | C02       | T-106      | 0,5      | `feat/logging-panel-admin`    | ⬜     |

La T-302 no es código. Es la única tarea que valida de verdad lo construido, y sale del campo con una lista de arreglos que se convierte en tareas nuevas. **Resérvale un amistoso antes del 18 de octubre**: si aparece después, no queda semana para arreglar lo que destape.

---

## 7. Qué sale del MVP, y por qué → ✅ CONFIRMADO (Raúl, 12/09/2026)

| Fuera                                | Motivo                                                                                                                  | Vuelve en                                      |
| :----------------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------- |
| Entrenamiento en directo (A15)       | No bloquea la liga. Un entrenamiento sin registrar no rompe ninguna estadística de partido                              | Sin fecha. Se decide después de la liga        |
| Disciplina y sanciones (A16)         | El dato de tarjetas ya queda registrado en el partido; el cómputo de sanciones se puede llevar a mano seis semanas más  | Sin fecha. Se decide después de la liga        |
| Panel de equipo y fichas (B01 a B04) | Principio del DOC 02 §1: primero meter datos. Sin dos partidos reales, un dashboard esconde fallos en vez de mostrarlos | Después de la liga, con partidos reales dentro |
| Cubos de Storage y escudos           | Nada depende de ellos hasta que haya escudos que subir                                                                  | Cuando haga falta                              |

Las cuatro están marcadas MVP en el DOC 02. El recorte es consciente y queda confirmado: **el MVP termina donde termina la entrada de datos de partido.** Qué se hace luego con esos datos, y qué pasa con los entrenamientos, se decide con la liga ya en marcha y con partidos reales dentro, no ahora.

**Corregido el 19/09.** El DOC 02 §2 arrastraba la columna «Fase» desfasada en A15, A16 y el Bloque B desde este mismo recorte. Ya está al día: las seis pasan a «Post-liga» y el total del MVP baja de 21 pantallas a **19**.

---

## 8. Riesgos

| Riesgo                                                                     | Señal temprana                                        | Respuesta                                                                            |
| :------------------------------------------------------------------------- | :---------------------------------------------------- | :----------------------------------------------------------------------------------- |
| El plan no tiene colchón: 3,9 sesiones semanales sin fallar ninguna        | Una sola semana por debajo de tres sesiones           | Palanca del §2: quitar el tiempo real de la T-209 y resolver discordancias al cierre |
| La capa offline se come dos semanas                                        | T-206 abierta el 4 de octubre                         | Recorte a cola sin precarga, documentado como deuda                                  |
| El directo no aguanta el uso real de pie y al sol                          | Lo dirá la T-302, no antes                            | Por eso la prueba de campo va antes del 18 de octubre                                |
| Cuatro anotadores generan más discordancias de las previstas               | Cola de pendientes sin vaciar tras el primer amistoso | Subir el umbral de duplicado, que ya es configurable (C3)                            |
| Las sesiones caen por debajo de tres semanales                             | Dos semanas seguidas con una sola sesión              | Recortar T-211, T-303 y la mitad del panel de discordancias                          |
| La liga se adelanta o Isaac necesita registrar un amistoso antes de tiempo | Aviso de Isaac                                        | El partido a posteriori (D5) permite meterlo después, sin prisa                      |
