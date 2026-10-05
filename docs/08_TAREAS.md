# DOC 08 — TAREAS

> **Versión:** 5.3 — 05/10/2026 (T-224 cerrada: el registro de errores se actualiza a mano y reintenta, y el cierre y «Mis aportaciones» quedan pulidos) · 5.2 — 05/10/2026 (T-223 cerrada: el directo funde sobre el último estado, anuncia lo que cambia otro aparato y escucha los borrados sin filtro) · 5.1 — 05/10/2026 (T-221 cerrada: la banda no pierde el foco al descartar y la cobertura es de quien la declara) · 5.0 — 04/10/2026 (revisión de la T-209b, la T-209c y la T-222: salen la T-223 y la T-224; la T-221 sigue sin hacer) · 4.9 — 04/10/2026 (T-222 cerrada: arreglos del cierre, «Mis aportaciones» y el registro de errores, con pruebas de sus `api/`) · 4.8 — 04/10/2026 (T-209c cerrada: las partes se concilian por número entre aparatos, sin tocar la base) · 4.7 — 04/10/2026 (T-209b cerrada: el directo ve lo que apuntan los demás y avisa de los posibles repetidos, sin tocar la base) · 4.6 — 04/10/2026 (revisión de las T-219 a T-303: salen la T-221 y la T-222; la T-209b va sin migración) · 4.5 — 04/10/2026 (T-303 cerrada: el administrador de plataforma lee el registro de errores desde Ajustes) · 4.4 — 04/10/2026 (T-211 cerrada: «Mis aportaciones» corrige y borra lo apuntado por uno mismo en los partidos sin cerrar) · 4.3 — 04/10/2026 (T-209a cerrada: cada anotador declara qué sigue, y el cierre lista las coberturas) · 4.2 — 04/10/2026 (T-210b cerrada: el cierre revisa los eventos, con aprobar, descartar, recuperar, minuto y posibles repetidos) · 4.1 — 04/10/2026 (T-220 cerrada: flecos del flujo, «Sin asistencia» arriba y enlace al directo desde la convocatoria) · 4.0 — 04/10/2026 (T-219 cerrada: la banda lista lo rechazado y deja descartarlo) · 3.9 — 04/10/2026 (I1 cerrada: seguir no se aprueba; la T-301a y la T-301c cambian de alcance; la T-220 gana «Sin asistencia» arriba; traspasos de la T-211, la T-303 y guion de la T-302) · 3.8 — 04/10/2026 (revisión de las T-212 a T-218; el lote siguiente, partido en T-219, T-220, T-210b, T-209a a c y T-301a a c; la prueba de campo, el 17/10) · 3.7 — 04/10/2026 (T-218 cerrada: el flujo enseña lo ya respondido y el minuto dice el rango de su parte) · 3.6 — 04/10/2026 (T-217 cerrada: el directo con el reglamento al día y el diferido según el minuto) · 3.5 — 04/10/2026 (T-216 cerrada: la cola solo la vacía la pestaña visible) · 3.4 — 04/10/2026 (T-215 cerrada: el directo dice que está guardando) · 3.3 — 04/10/2026 (T-214 cerrada: siete cambios en el cadete) · 3.2 — 04/10/2026 (T-213 cerrada: Inicio con el próximo partido) · 3.1 — 04/10/2026 (T-212 cerrada: el calendario enlaza el directo) · 3.0 — 27/09/2026 (T-210a: la A13 en 🚧; la T-210 se adelanta a la T-209 por decisión de Raúl; hora del primer partido confirmada) · 2.9 — 26/09/2026 (T-203b cerrada; riesgo nuevo: la liga empieza el 3/10) · 2.8 — 26/09/2026 (migración del DOC 05 §14.4 a §14.6 aplicada: la T-203b queda libre) · 2.7 — 26/09/2026 (T-208 cerrada) · 2.6 — 26/09/2026 (T-207 cerrada) · 2.5 — 26/09/2026 (T-206 cerrada, antes del hito del 4 de octubre) · 2.4 — 26/09/2026 (T-205 cerrada) · 2.3 — 26/09/2026 (T-204 cerrada; nace la T-203b) · 2.2 — 26/09/2026 (T-203 cerrada) · 2.1 — 26/09/2026 (T-202 cerrada) · 2.0 — 26/09/2026 (T-201 cerrada, con el alta de club y el escudo fuera) · 1.9 — 25/09/2026 (T-107 cerrada: fase 1 completa) · 1.8 — 25/09/2026 (T-106 cerrada) · 1.7 — 18/09/2026 (T-102 cerrada) · 1.6 — 14/09/2026 (T-104) · 1.5 — 13/09/2026 (T-103) · 1.4 — 12/09/2026 (T-101) · 1.3, 1.2 y 1.1 el mismo día
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

> **Actualización (v3.8), a 4 de octubre.** Quedan tres semanas y, de la ruta mínima, la T-210b, la T-209, la T-301 y la T-302: unas seis sesiones y media, más media de la T-219 y la T-220. La T-209 y la T-301 van partidas en tres entregas cada una para que quepan en sesiones guiadas y baratas (DOC 13, punto 67). La palanca de emergencia sigue siendo la misma, y ahora tiene nombre: dejar fuera la T-209b y la T-209c.

**No hay ruta cómoda.** Recortar el alcance ya se hizo en el §7 y solo ahorra 1,5 sesiones, porque lo gordo —el directo, la capa offline y el cierre— es precisamente el MVP. Con los cuatro anotadores dentro, el plan exige **3,9 sesiones semanales sin fallar ninguna**, y eso no deja colchón: una semana en blanco hay que recuperarla con dos dobles.

**Palanca de emergencia**, si a mitad de camino el ritmo no se sostiene: quitar el tiempo real entre anotadores de la T-209 y dejar que cada uno anote por su cuenta, resolviendo las discordancias al cerrar el partido. Ahorra vez y media y conserva los cuatro anotadores. Se decide en el hito del 4 de octubre, no antes.

---

## 3. Ruta mínima al 25 de octubre

**El MVP es esto y nada más: que se pueda meter un partido entero, de principio a fin.** Lo que se haga después con esos datos se decide con la liga en marcha.

Lo que tiene que estar en pie para que Isaac registre el primer partido de liga:

```
T-100 → T-100b → T-101 → T-102 → T-103 → T-104 → T-105 → T-105b → T-106
      → T-201 → T-202 → T-203 → T-204 → T-205
      → T-206 → T-207 → T-208 → T-210a → T-210b
      → T-301a → T-301b → T-301c → T-209a → T-209b → T-209c → T-302
```

**La T-210 va antes que la T-209 desde el 26/09, por decisión de Raúl**: sin cierre, el primer partido de liga, el 3 de octubre, no entra en las estadísticas, y con un solo anotador el directo ya funciona. Se parte en dos entregas: la T-210a (cierre) y la T-210b (panel de discordancias).

Veintiuna tareas. **T-301 y T-302 no son opcionales**: con cuatro anotadores en el campo (decisión C1, confirmada el 12/09), la pantalla de personas y permisos es por donde entran los otros tres, y la prueba de campo es lo único que valida de verdad que la pantalla de directo aguanta el uso real. Todo lo demás espera.

**El orden cambia el 04/10: la T-301 va antes que la T-209.** Sin personas no hay segundo anotador con el que probar el tiempo real, y la prueba de campo del 17 de octubre necesita antes a los cuatro dentro que viéndose entre sí. Si no llega todo, se anota sin tiempo real y las discordancias se resuelven al cerrar.

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

| ID         | Tarea                                                                                                | Pantallas     | Depende de   | Sesiones | Rama                                 | Estado |
| :--------- | :--------------------------------------------------------------------------------------------------- | :------------ | :----------- | :------- | :----------------------------------- | :----- |
| **T-201**  | Club y equipos: alta, edición, escudo, equipo gestionado frente a equipo de referencia               | A03, A04      | T-105        | 1        | `feat/core-club-y-equipos`           | ✅     |
| **T-202**  | Plantilla y ficha de jugador: apodo, dorsal, posición, estado. Sin nombre real ni foto               | A05, A06      | T-201        | 1        | `feat/core-plantilla`                | ✅     |
| **T-203**  | Competiciones y reglamento: duración de partes, jugadores en campo, `enabled_event_types`            | A08           | T-201        | 1        | `feat/rules-competiciones`           | ✅     |
| **T-203b** | Categoría de la competición en columnas y campo de casa del club, tras la migración del DOC 05 §14.4 | A08, A10      | T-204        | 0,5      | `feat/rules-categoria-y-campo`       | ✅     |
| **T-204**  | Calendario y alta de partido, incluido el partido a posteriori                                       | A09, A10      | T-203        | 1        | `feat/agenda-calendario`             | ✅     |
| **T-205**  | Convocatoria y alineación inicial                                                                    | A11           | T-204        | 1        | `feat/lineup-convocatoria`           | ✅     |
| **T-206**  | Capa offline: Dexie, precarga del partido y cola de salida con reintento e idempotencia              | C04           | T-205        | 2        | `feat/sync-cola-offline`             | ✅     |
| **T-207**  | Directo, esqueleto: reloj, partes, marcador, tramos y bloqueo de pantalla                            | A12           | T-206        | 2        | `feat/match-directo-reloj`           | ✅     |
| **T-208**  | Directo, registro: botonera de eventos, ficha de jugador, háptica y confirmación de 2 s              | A12           | T-207        | 2        | `feat/match-directo-botonera`        | ✅     |
| **T-209a** | Cobertura declarada: qué sigue cada anotador, desde cuándo y hasta cuándo, y su lista en el cierre   | A12, A13      | T-301b       | 0,5      | `feat/match-cobertura-declarada`     | ✅     |
| **T-209b** | Ver lo que apuntan los demás: tiempo real con sondeo de respaldo y aviso de posible repetido         | A12           | T-209a       | 1        | `feat/match-tiempo-real`             | ✅     |
| **T-209c** | Partes compartidas: un solo arranque de parte entre aparatos                                         | A12           | T-209b       | 0,5      | `fix/match-partes-compartidas`       | ✅     |
| **T-210a** | Cierre de partido: resultado, acta, origen de los goles y recálculo de tramos                        | A13           | T-208        | 1        | `feat/review-cierre-partido`         | ✅     |
| **T-210b** | Panel de discordancias: aprobar y descartar pendientes, repetidos y corregir el minuto               | A13           | T-210a       | 1        | `feat/review-discordancias`          | ✅     |
| **T-211**  | Mis aportaciones                                                                                     | A14           | T-210        | 0,5      | `feat/review-mis-aportaciones`       | ✅     |
| **T-212**  | Puerta al directo desde el calendario                                                                | A09           | T-208        | 0,25     | `feat/agenda-acceso-directo`         | ✅     |
| **T-213**  | Inicio con el próximo partido                                                                        | A02           | T-212        | 0,5      | `feat/agenda-inicio-proximo-partido` | ✅     |
| **T-214**  | Siete cambios en el cadete y hallazgos del primer partido                                            | A08           | —            | 0,25     | `fix/rules-cambios-cadete`           | ✅     |
| **T-215**  | Directo: estado de guardado y errores a la vista                                                     | A12           | —            | 0,25     | `fix/match-guardando-flujo`          | ✅     |
| **T-216**  | Cola: solo vacía la pestaña visible                                                                  | C04           | —            | 0,5      | `fix/sync-vaciado-pestana-visible`   | ✅     |
| **T-217**  | Directo: reglamento al día y diferido según el minuto                                                | A12           | T-215        | 0,5      | `fix/match-estado-al-dia`            | ✅     |
| **T-218**  | Directo: resumen del flujo y minuto por parte                                                        | A12           | T-217        | 0,5      | `feat/match-resumen-del-flujo`       | ✅     |
| **T-219**  | Banda de sincronización: listar lo rechazado y descartarlo                                           | C04           | T-216        | 0,25     | `feat/sync-descartar-rechazados`     | ✅     |
| **T-220**  | Flecos del flujo de registro, «Sin asistencia» arriba y enlace al directo desde la convocatoria      | A11, A12      | T-218        | 0,25     | `fix/match-flecos-del-flujo`         | ✅     |
| **T-221**  | Arreglos de la revisión: foco y borrado de la banda, y la cobertura por persona                      | A12, C04      | T-209a       | 0,5      | `fix/match-arreglos-de-la-revision`  | ✅     |
| **T-222**  | Arreglos de la revisión: cierre, «Mis aportaciones» y registro de errores, con pruebas de sus `api/` | A13, A14, C02 | T-211, T-303 | 0,5      | `fix/review-arreglos-de-la-revision` | ✅     |
| **T-223**  | Flecos del directo entre aparatos: anunciar lo que cambia otro, borrados de Realtime y pruebas       | A12           | T-221        | 0,5      | `fix/match-flecos-entre-aparatos`    | ✅     |
| **T-224**  | Flecos del cierre, «Mis aportaciones» y el registro de errores                                       | A13, A14, C02 | T-222        | 0,25     | `fix/review-flecos-de-la-revision`   | ✅     |

**La T-201, cerrada el 26/09, con dos piezas fuera.** A03 enseña y edita el club del equipo activo; A04 lista los equipos del club separando los propios de los rivales, y los da de alta y los edita. **Fuera**: el alta de un club nuevo, porque con la RLS actual el club nacería invisible hasta para quien lo crea (ciclo del DOC 13, punto 21), y el escudo, porque el cubo `crests` no existe. El logo del C.D. Unión Tejina espera en `docs/recursos/` para subirlo cuando exista. Sin borrado: ni `clubs` ni `teams` tienen política para ello.

**La T-202, cerrada el 26/09.** A05 lista la plantilla del equipo por dorsal y da de alta jugadores; A06 edita apodo, dorsal, posición habitual y disponibilidad, y da de baja. Del jugador solo viajan apodo, dorsal y posición: ninguna consulta toca las columnas del nombre real. «Sancionado» se enseña y no se elige. Detalle en el DOC 13.

**La T-203, cerrada el 26/09.** A08 lista las competiciones del club en la temporada en curso, las da de alta con el reglamento del cadete que Isaac confirmó ese día y edita el reglamento entero: partes, minutos, descanso, reloj, tipo y número de cambios, convocados, titulares, amarillas, roja y los once botones del directo. La duración se calcula a la vista. La categoría va en el nombre, porque `competitions` no tiene columna para ella. Detalle en el DOC 13.

**La T-204, cerrada el 26/09.** A09 enseña el calendario del equipo activo en dos listas, por jugar y jugados, con el local delante, el estado en palabras y, según los permisos, «Editar» y «Convocatoria». A10 da de alta y edita partidos: competición, rival, en casa o fuera, fecha, hora, campo y la casilla del partido en diferido (D5). Borra solo si sigue programado. Detalle en el DOC 13.

**La T-205, cerrada el 26/09.** A11 reparte la plantilla del equipo en titulares, suplentes y no convocados, con el dorsal y la posición de ese partido propuestos desde la inscripción. Quien no está disponible sale con el motivo y sin opciones. Guardar exige los titulares exactos y no pasar del máximo de la competición, y pasa el partido a convocado. Empezado el partido, la convocatoria se enseña y no se toca. **Pasar a convocado pide hoy `schedule.manage`**: la RLS de `matches` no admite `lineup.manage`. **Resuelto el 26/09** con `marcar_convocado()` (DOC 05 §14.5). Detalle en el DOC 13.

**La T-206, cerrada el 26/09, en una sesión y sin recorte.** El hito del 4 de octubre queda cumplido. Cola de salida en IndexedDB con Dexie, en orden por partido, con retroceso de 1 a 60 s, errores definitivos a `failed` y a `error_logs`, idempotencia por clave del dispositivo, un solo vaciador por cerrojo entre pestañas y purga a las 48 horas. Cada trabajo se envía solo con la sesión de quien lo encoló. La banda C04 dice «Sin conexión», lo que queda por enviar y lo rechazado. Precarga del partido al entrar en la convocatoria, con «Partido listo para usar sin conexión» y la petición de almacén persistente. La C01 avisa antes de cerrar sesión con trabajos en cola. **Nada la usa todavía**: el directo (T-207 y T-208) es quien encola eventos. Dexie queda fuera del paquete inicial. **La T-207 tiene que decidir** cómo entra la A12, que hoy va en el arranque y necesitará Dexie (resuelto en la T-207: D06-29). Detalle en el DOC 13.

**La T-207, cerrada el 26/09, en una sesión.** La A12 tiene su esqueleto: reductor puro del partido, reloj por anclaje con pausa y descuento, empezar y terminar partes con confirmación, finalizar, marcador con los goles sin aprobar avisados, campo y banquillo, y pantalla encendida. Lee de lo precargado y guarda cada transición junto con sus filas en una sola transacción: sobrevive a una recarga. La A12 pasa a perezosa (decisión de Raúl) y el aviso de versión nueva se calla durante el partido. **Sin botonera de eventos**: es la T-208, que además hereda dos cosas, tipar las filas que encola y mandar los segundos cuando haya habido pausa. Detalle en el DOC 13.

**La T-208, cerrada el 26/09, en una sesión.** La A12 ya registra: botonera con la definición bajo cada botón, flujo `Acción → Jugador → Detalle opcional → Guardado` con solo los candidatos válidos, ficha de jugador desde el campo, confirmación de 2 s con vibración, últimos eventos con «Deshacer», y el partido en diferido con parte y minuto a mano. Cada evento sale tipado, con los segundos del aparato, y pendiente o aprobado según `event.approve`. Los cambios y las expulsiones mueven quién está en el campo. **Hallazgo para Cowork**: la base no fijaba el estado del evento según el permiso; lo fija desde el 26/09 (DOC 05 §14.6). Detalle en el DOC 13.

**La T-203b nace el 26/09**, de dos decisiones de Raúl: la categoría de la competición en columnas propias y el nombre único por temporada, más el campo de casa del club, que dio ese mismo día. Pedía antes la migración del DOC 05 §14.4, **aplicada el 26/09 en una sesión de Cowork** junto con el §14.5 y el §14.6: las columnas y el campo de casa del C.D. Unión Tejina ya están en la base y en los tipos.

**La T-203b, cerrada el 26/09, en media sesión.** La A08 da de alta y edita la categoría, el nivel, el ámbito y el grupo de la competición, opcionales y de texto libre; el nombre visible sigue siendo el suyo y no se compone con ellos. Si la base rechaza un nombre repetido, la pantalla lo dice con sus mismas palabras. La A10 propone en los partidos en casa el campo de casa del club y, si el club no lo tiene, el del último partido en casa. **Fuera**: editar el campo de casa desde la A03 (DOC 13). Detalle en el DOC 13.

**La T-206 va antes que el directo a propósito.** Enchufar la cola a una pantalla ya escrita obliga a reescribir cada manejador de evento; escribir la pantalla contra una cola que ya existe no cuesta nada. Es la dependencia que más caro sale saltarse.

**La T-212, cerrada el 04/10.** Ninguna pantalla enlazaba la A12: solo se entraba escribiendo la dirección. El calendario enseña ahora «Directo» —«Apuntar» si el partido es en diferido— en cada partido convocado o en juego, a quien tiene `match.live.write`. Sin base de datos. Detalle en el DOC 13.

**La T-213, cerrada el 04/10.** Inicio enseñaba un texto fijo en «Próximo evento», hubiera o no partidos. Ahora enseña el próximo partido del equipo activo —el que está en juego o, si no, el más cercano— con las mismas acciones que su fila del calendario, así que el directo queda a un toque (DOC 02 §3.3). La A02 sigue en `core` y la sirve `agenda` (D06-34). Sin base de datos. Detalle en el DOC 13.

**La T-215, cerrada el 04/10.** Al meter el primer partido en diferido, el último toque de cada flujo no respondía y, al repetirlo, salía un error falso: el primer toque seguía guardando. Ahora el flujo dice «Guardando…», desactiva sus botones mientras guarda y, si falla, enseña el motivo de verdad —la regla o el dispositivo— en el propio flujo. Solo pantalla, sin base de datos; por qué tarda el guardado local es la T-216. Detalle en el DOC 13.

**La T-216, cerrada el 04/10.** Con la aplicación en varias pestañas del móvil, cada evento tardaba un minuto en salir: una pestaña oculta hacía de vaciadora y se dormía con el cerrojo cogido. Ahora solo vacía la pestaña que se ve, que le quita el cerrojo a quien lo tenga al segundo intento fallido, y el directo abre su transacción solo sobre la cola y la instantánea (D06-35). Sin base de datos y **sin reproducir en un móvil**. Detalle en el DOC 13.

**La T-217, cerrada el 04/10.** Dos fallos vistos con el primer partido: el móvil se quedaba con el reglamento y la convocatoria del día en que abrió el directo, y en diferido los candidatos eran los del final del partido. Ahora el reglamento y la convocatoria salen siempre del paquete, y en diferido el campo se calcula en el minuto del evento (D06-36). Sin base de datos; apuntar un evento anterior no revisa los posteriores. Detalle en el DOC 13.

**La T-218, cerrada el 04/10.** Al apuntar un evento, cada paso borraba el anterior: en «¿Asistencia?» ya no se veía de qué minuto era el gol ni quién lo marcó. Ahora cada paso enseña encima lo ya respondido, y en diferido la ayuda y el error del minuto dicen el rango de la parte elegida, que además se recuerda de un evento al siguiente. Solo pantalla, sin base de datos y **sin probar en un móvil ni al sol**. Detalle en el DOC 13.

**La T-219, cerrada el 04/10.** El servidor rechazó un cambio del primer partido y la banda roja de sincronización no se iba nunca. Ahora, dentro de «Qué dijo el servidor», lista cada anotación rechazada con su nombre, la hora y lo que dijo el servidor, y deja descartarla una a una con confirmación.
Descartar borra el trabajo de la cola y no toca nada más. Sin base de datos y sin probar en un móvil.

**La T-220, cerrada el 04/10.** Seis flecos del directo y la convocatoria. Los botones desactivados del flujo se distinguen sin depender del color (borde discontinuo y texto secundario), el foco vuelve a la pregunta si el guardado falla, el selector dice «1.ª parte» y «2.ª parte», y «Sin asistencia» y «Sin motivo» suben encima de la lista, a todo el ancho. La A11 enlaza «Ir al directo» (o «Ir a apuntar» en diferido) con el partido convocado o en juego y `match.live.write`. Sin base de datos y sin probar en un móvil.

**La T-210b, cerrada el 04/10.** La A13 sin cerrar enseña todos los eventos del partido, también los descartados, con quién apuntó cada uno. Quien tiene `event.approve` aprueba, descarta, recupera y cambia el minuto de cada uno, y aprueba de una vez los pendientes que ve; sin el permiso, la lista se ve y no ofrece nada.
Al abrir se buscan los posibles repetidos con `flag_duplicate_candidates`: salen juntos y marcados, y nada se fusiona solo. Con eso C-01 deja de atascar el cierre.
Todo en línea y con el estado de partida en el filtro: si otro cambió el evento, se dice y no se pisa. Sin migración.
Sin probar en un móvil ni contra la base de verdad: la prueba sobre el primer partido queda escrita en la PR para Raúl.

**La T-209a, cerrada el 04/10.** Abrir el directo declara qué sigue ese anotador, «todo el equipo» si no dice otra cosa, y salir con el botón o finalizar lo cierra. Bajo el marcador se cambia a un jugador o a solo goles y tarjetas.
La declaración vive en la instantánea, fuera del reductor, y viaja por la cola como los eventos (D06-37): el directo sigue funcionando sin red. En diferido es una sola, desde el minuto 0.
La A13 gana la tarjeta «Coberturas»: quién, qué siguió y de qué minuto a cuál, con las abiertas marcadas. Con eso C-03 queda entero. Sin migración.
Sin probar en un móvil ni contra la base de verdad. El índice de fiabilidad sigue sin pintarse: es del bloque B.

**La T-303, cerrada el 04/10.** La C02, `/admin/logs`, lista los 50 últimos errores de `error_logs` con fecha, origen, ruta, mensaje, versión y quién (solo el nombre), con tres filtros en la consulta (origen, ruta, solo de hoy), el recuento de 24 horas y 7 días, «Cargar 50 más» y el detalle en `<details>`. Se llega desde un enlace al final de Ajustes, solo con `is_platform_admin`.
Quién lee lo decide la política `error_logs_select`; la frase de la cuenta, el perfil. Sin migración y sin permiso nuevo. Sin probar en un móvil ni contra la base de verdad.
Deuda: los errores no se borran ni caducan y la tabla crece sola; no hay aviso cuando entra uno nuevo; y un fallo de guardado que el directo enseña como mensaje no es una excepción y no llega al registro.

**La T-211, cerrada el 04/10.** La A14, «Mis aportaciones», lista lo que ha apuntado uno mismo en los partidos del equipo y la temporada activos, por partido y el más reciente primero. En un partido sin cerrar, de cada evento se cambia el minuto, el jugador o el segundo jugador —la asistencia, con «Sin asistencia», o quien entra— y se borra, con confirmación.
Quién puede lo decide la base: el autor lo suyo mientras está pendiente, y con `event.approve` también lo ya revisado; sin él, la fila dice que lo corrige quien cierra. Los partidos cerrados salen plegados y solo para leer.
Todo en línea, con el `id` en el filtro y pidiendo la fila de vuelta: cero filas es que el evento ya no se puede cambiar, y se vuelve a pedir la lista. El formulario del minuto es el del panel de la T-210b, sacado a un componente común. Sin migración.
Sin probar en un móvil ni contra la base de verdad. No se cambia el tipo de un evento: se borra y se apunta otra vez.

**Revisión del 04/10.** Las siete tareas del día, de la T-212 a la T-218, nacieron del primer partido de liga, metido en diferido la noche del 3, y se ejecutaron en sesiones aparte con un traspaso guiado cada una. Revisadas juntas: 480 pruebas en verde, y ninguna probada en un móvil. Lo que dejaron pendiente está en los puntos 59 a 67 del DOC 13; lo pequeño se recoge en la T-219 y la T-220.

---

## 6. Fase 3 · Concurrencia y prueba de campo

| ID         | Tarea                                                                                   | Pantallas | Depende de | Sesiones | Rama                             | Estado |
| :--------- | :-------------------------------------------------------------------------------------- | :-------- | :--------- | :------- | :------------------------------- | :----- |
| **T-301a** | Migración de personas: invitaciones, seguir sin aprobación y solicitudes (DOC 05 §14.8) | —         | —          | 0,5      | `feat/db-personas-y-solicitudes` | ⬜     |
| **T-301b** | Personas y permisos: miembros, permisos, invitaciones, solicitudes y seguidores         | A07       | T-301a     | 1        | `feat/auth-personas-permisos`    | ⬜     |
| **T-301c** | Entrar sin equipo: seguir un equipo, pedir permisos, y el seguidor como lectura         | A01b      | T-301b     | 1        | `feat/auth-entrada-sin-equipo`   | ⬜     |
| **T-302**  | Prueba de campo en un partido, con los cuatro anotadores y los dos sistemas operativos  | —         | T-301c     | 1        | —                                | ⬜     |
| **T-303**  | Registro de errores para administración                                                 | C02       | T-106      | 0,5      | `feat/logging-panel-admin`       | ✅     |

**Cambio del 04/10 a mediodía.** Raúl cierra la I1: seguir a un equipo no necesita aprobación. La T-301a gana `seguir_equipo` y el cierre del nombre real por la API, y pierde las solicitudes de seguidor; su ensayo, de 18 pruebas, ha pasado en un PostgreSQL local. La T-301c deja de aprobar seguidores. La T-211 y la T-303 tienen ya traspaso, y la T-302, guion.

**Revisión del 04/10 por la tarde.** Las seis tareas del lote —T-219, T-220, T-210b, T-209a, T-211 y T-303— están en `main`, con 597 pruebas en verde. La revisión no encuentra nada que rompa datos en el uso normal y deja dos tareas de arreglos, la T-221 y la T-222 (DOC 13, puntos 73 a 78). **La T-209b va sin migración**: el canal de Realtime queda escrito y el directo se refresca solo cada 20 s hasta que se publique, con `supabase/pendientes/realtime_del_directo.sql`. La T-209a no depende de la T-301b: era solo el orden previsto.

**T-209b cerrada el 04/10.** El directo vuelve a descargar el partido solo —un segundo después de un aviso de Realtime, cada 20 s por seguridad y al volver a la pantalla o a tener red— y lo funde con lo del aparato: lo que este tiene de camino se queda, lo que deshizo no vuelve y lo que otro borró se quita (DOC 06 §5.4, D06-38).
Lo de otros aparatos dice «De otro aparato», y lo que parece apuntado dos veces, «Posible repetido», con su anuncio; no bloquea ni pregunta.
Un refresco nunca se come un toque: no coge el cerrojo de guardar y solo funde con una lectura de la cola posterior al último guardado.
**Sin tocar la base**: Realtime sigue sin publicar (DOC 05 §14.9) y hoy solo trabaja la red de seguridad.
**Sin probar con dos móviles en un campo.**

**T-209c cerrada el 04/10.** Si dos aparatos abren la misma parte, el segundo adopta el `id` y el arranque del primero que llegó a la base, y los dos relojes marcan lo mismo (DOC 06 §5.4, D06-39).
Lo que otro cierra o finaliza se ve sin recargar, y terminar una parte va por partido y número, no por `id`.
Lo que este aparato tiene sin enviar no sale de su pantalla. **Sin tocar la base**, y todo en el modelo puro: la pantalla no cambia.
**La pausa sigue siendo local**, y está sin probar con dos móviles en un campo.

**T-222 cerrada el 04/10.** Los `update` y el `delete` de eventos llevan ya el `match_id` en el filtro; aprobar en bloque dice cuántos aprobó de los pedidos y el registro de errores pagina por cursor, anuncia lo que da filtrar y deja el foco en la primera fila nueva.
Las tres `api/` tienen por fin pruebas propias, con un doble del cliente de Supabase que apunta las llamadas encadenadas.
Deuda: el `match_id` en el filtro no impide cambiar un evento de un partido que otro acaba de cerrar; solo lo cierra un disparador en la base (DOC 13, punto 73).

**Revisión del 04/10 por la noche.** La T-209b, la T-209c y la T-222 están en `main` y hacen lo que pedían sus traspasos. La T-209c se hizo dos veces y la segunda fusión dejó `main` sin compilar; lo arregla la #78, con 712 pruebas en verde.
**La T-221 no se hizo**: su sesión falló a los cuatro minutos y no dejó rama. Va la primera de la tanda siguiente.
De la revisión salen la **T-223** y la **T-224**, con su traspaso en `docs/traspasos/`. Ninguna toca la base. Van de una en una y en este orden: T-221, T-223, T-224.

**T-221 cerrada el 05/10.** La banda lleva el foco a donde toca al descartar, nombra cada «Descartar», borra en una sola operación y dice cuándo no ha podido. La cobertura local lleva de quién es: otra cuenta en el mismo móvil declara la suya y no cierra la ajena.
Salir del directo espera al cierre de la cobertura segundo y medio como mucho y no pregunta por la cobertura sin enviar; cambiar lo que se sigue dice cuándo no se ha cambiado.
Deuda: los fallos de la cobertura en el aparato no llegan al registro de errores, y la que no llega a cerrarse al salir queda abierta hasta el cierre del partido (DOC 13, puntos 74 y 75).

**T-223 cerrada el 05/10.** El directo reduce y funde sobre el último estado y no sobre el pintado, anuncia cuando otro aparato empieza o termina una parte o finaliza, y al finalizar no deja el foco en `body`. Una descarga lenta ya no pisa a otra más nueva, los eventos se descargan en orden, los borrados se escuchan sin filtro y «Últimos eventos» dice «Descartado».
Salen las pruebas repetidas de la segunda T-209c y se corrige la de la parte adoptada.
Deuda: la escucha de borrados está sin probar contra Realtime, que sigue sin publicar, y avisará a todos los directos abiertos con cualquier borrado de `match_events` (DOC 13, punto 79).

**T-224 cerrada el 05/10.** El registro de errores no vuelve a pedir ninguna página solo: se pone al día con «Actualizar» y, si falla «Cargar 50 más», se reintenta esa misma página. `guardarOrigen` lleva el `match_id`, «Borrando…» solo sale con el borrado en marcha y los botones con `aria-disabled` no reaccionan al ratón.
Deuda: el registro ya no se actualiza solo, y el `match_id` en el filtro no impide tocar un evento de un partido que otro acaba de cerrar (DOC 13, punto 73).

La T-302 no es código. Es la única tarea que valida de verdad lo construido, y sale del campo con una lista de arreglos que se convierte en tareas nuevas. **Tiene fecha: el sábado 17 de octubre, en casa, que es el siguiente partido del calendario**. Se pedía antes del 18 de octubre: si aparece después, no queda semana para arreglar lo que destape.

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

| Riesgo                                                                     | Señal temprana                                        | Respuesta                                                                                                                       |
| :------------------------------------------------------------------------- | :---------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------ |
| El plan no tiene colchón: 3,9 sesiones semanales sin fallar ninguna        | Una sola semana por debajo de tres sesiones           | Palanca del §2: quitar el tiempo real de la T-209 y resolver discordancias al cierre                                            |
| La capa offline se come dos semanas                                        | T-206 abierta el 4 de octubre                         | Recorte a cola sin precarga, documentado como deuda                                                                             |
| El directo no aguanta el uso real de pie y al sol                          | Lo dirá la T-302, no antes                            | Por eso la prueba de campo va antes del 18 de octubre                                                                           |
| Cuatro anotadores generan más discordancias de las previstas               | Cola de pendientes sin vaciar tras el primer amistoso | Subir el umbral de duplicado, que ya es configurable (C3)                                                                       |
| Las sesiones caen por debajo de tres semanales                             | Dos semanas seguidas con una sola sesión              | Recortar T-211, T-303 y la mitad del panel de discordancias                                                                     |
| La liga se adelanta o Isaac necesita registrar un amistoso antes de tiempo | Aviso de Isaac                                        | El partido a posteriori (D5) permite meterlo después, sin prisa                                                                 |
| **La liga empezó el sábado 3/10/2026, antes del 25/10 del MVP**            | Ya ha pasado                                          | El primer partido se metió en diferido esa noche y se cerró el 04/10, con un solo anotador. De ahí salieron la T-212 a la T-218 |
| Corregir datos en la base mientras un móvil tiene cola sin enviar          | Ya ha pasado: un cambio repetido en el primer partido | Antes de escribir en la base, ese móvil abre la aplicación con cobertura y su banda no dice nada (DOC 13, punto 64)             |
