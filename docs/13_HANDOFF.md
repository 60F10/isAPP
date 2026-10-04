# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 04/10/2026, mañana — T-216: ✅ cerrada

- **Diagnóstico:** el 04/10, con la aplicación en varias pestañas del móvil, cada evento tardó un minuto en salir. Los registros de la API de Supabase, de 00:21 a 00:41 UTC, dan trece peticiones de la cola, una por minuto exacto y en el segundo 40: una pestaña oculta se despertaba, cogía el cerrojo `sasi-outbox`, mandaba un trabajo y se dormía con él cogido, y la que se veía lo encontraba ocupado con `ifAvailable` y no vaciaba.
- **Hecho (D06-35):** solo vacía la página visible. `model/turno.ts` decide entre vaciar, esperar y robar; `vaciar` mira `seguir` antes de cada trabajo; `arranque.ts` roba el cerrojo con `steal` al segundo intento seguido con el cerrojo ocupado, y trata el `AbortError` de quien pierde el cerrojo como aviso y no como error. `useEstadoDeCola` cierra su `liveQuery` con la página oculta. `encolarJunto` acepta las tablas de la transacción —el directo pasa `[db.matchSnapshots]`— y registra «Encolado lento» si guardar pasa de 3 s. Rama `fix/sync-vaciado-pestana-visible`, sin base de datos.
- **Pruebas:** 451 en verde, 21 nuevas: `turno.test.ts`, `arranque.test.ts` y `encolar.test.ts` nuevos, y casos añadidos en `vaciador.test.ts` y `almacen.test.ts`. Los de `tablas` corren sobre Dexie de verdad con `fake-indexeddb`, que estaba instalado y sin usar. Cambia una línea de `match/api/directo.test.ts`: la llamada a `encolarJunto` lleva ahora el tercer argumento. `useEstadoDeCola` no tiene prueba. Lint, Prettier y build limpios, sin `INEFFECTIVE_DYNAMIC_IMPORT`.
- **Sin reproducir en un móvil**: la comprobación de verdad es anotar con dos pestañas abiertas. Tres eventos seguidos en una tienen que llegar a Supabase en segundos, no uno por minuto. Si la pestaña oculta tenía el cerrojo, el primero puede tardar hasta diez segundos, que es lo que tarda el segundo intento.
- **A tener en cuenta:** dos ventanas visibles a la vez —en escritorio— se pueden quitar el cerrojo la una a la otra. No pierde ni duplica nada, por lo mismo que hace seguro el robo; solo repite algún envío.

---

## Sesión 04/10/2026, mañana — T-215: ✅ cerrada

- **Diagnóstico:** en la A12, `hacer` devolvía `null` igual si el guardado anterior seguía en marcha, si el reglamento rechazaba la acción o si fallaba IndexedDB, y el flujo pintaba el mismo «No se ha guardado. Corrige…» para los tres; mientras guardaba, la pantalla no decía nada, y por eso se repetía el toque.
- **Hecho:** `intentar` dentro de `Panel` devuelve el resultado o el fallo con su motivo (`ocupado`, `regla`, `dispositivo`) y `hacer` queda como envoltorio con el contrato de antes. `guardarFlujo` enseña el motivo de verdad en el flujo, y con `ocupado` no hace nada. `FlujoDeRegistro` recibe `ocupado` y `estado`: dice «Guardando…» en una región viva propia, a los 4 s «Sigue guardando en este dispositivo. No cierres la pantalla.», y desactiva todos sus botones. Rama `fix/match-guardando-flujo`, sin base de datos.
- **Pruebas:** 430 en verde, cuatro nuevas en `LiveMatchPage.test.tsx`. Cambia una línea de una que ya había, «si no se puede guardar, el flujo sigue en su último paso y lo dice»: esperaba el texto genérico que desaparece y ahora espera el del dispositivo. El aviso de los 4 s no tiene prueba. Lint, Prettier y build limpios.
- **Sin probar en un móvil.** Dos cosas que mirar allí: los botones de opción y de jugador no tienen estilo de desactivado en `Registro.module.css`, así que lo único que se ve es el texto; y al desactivarse el botón que tiene el foco, el foco puede irse a `body` si el guardado falla.

---

## Sesión 04/10/2026, mañana — T-214: ✅ cerrada

- **Hecho:** `REGLAMENTO_CADETE` da 7 cambios, que eran 5. Lo corrigió Raúl el 04/10, tras el At. Tacoronte 0 – 9 Unión Tejina del 03/10, donde el Tejina hizo 6 y el rival 7. Rama `fix/rules-cambios-cadete`, sin base de datos: el valor por defecto de la columna `substitutions_max` sigue en 5.
- **Documentos:** dicen 7 el DOC 03 (A5), el DOC 04 §4.2, el DOC 01 (E3-06) y `CLAUDE.md`. La tabla del DOC 04 §4.1 conserva su 5, que es el de la columna.
- **Pruebas:** 426 en verde, ninguna nueva: cambian tres, las dos de `competicion.test.ts` y la línea de resumen de `Competiciones.test.tsx`. Lint, Prettier y build limpios.
- **Ojo:** la competición que ya existe, «Cadete Primera Tenerife G2», conserva su límite de 5. Lo cambia Raúl en la A08 (punto 56).
- **Abierto:** los cinco hallazgos del primer partido, puntos 54 a 58 de «LO QUE SIGUE ABIERTO».

---

## Sesión 04/10/2026, madrugada — T-213: ✅ cerrada

- **Hecho:** la tarjeta «Próximo evento» de Inicio (A02) enseña el próximo partido del equipo activo con las mismas acciones que su fila del calendario: directo, convocatoria, edición y cierre, cada una con su permiso. Lo que pintaba cada fila de la A09 sale a `agenda/components/ResumenDePartido`, que comparten las dos pantallas. Rama `feat/agenda-inicio-proximo-partido`, sin base de datos.
- **Decisión D06-34:** la A02 sigue en `core`, que no importa de `agenda`. `HomePage` expone la prop `proximoEvento` y `agenda` la envuelve con `InicioPage`, que es la que carga la ruta índice (DOC 06 §4.2).
- **Pruebas:** 426 en verde, 7 nuevas (tres de `proximoPartido` y cuatro de «A02 · Inicio»). Las del calendario, sin tocar, pasan tras la extracción. Lint, Prettier y build limpios, sin `INEFFECTIVE_DYNAMIC_IMPORT`.
- **Tamaño:** `agenda-*.js` mide 18,28 kB, 5,98 kB comprimido. Entrar en Inicio descarga ahora ese trozo además del de `core`.
- **Deuda:** `.nota` y `.error` están repetidas en `ProximoPartido.module.css` y `CalendarioPage.module.css`. Un partido programado sin convocar sale en Inicio sin enlace al directo, igual que en el calendario. **Sin probar en un móvil.**

---

## Sesión 04/10/2026 — T-212: ✅ cerrada

- **Hecho:** el calendario (A09) enlaza el directo (A12) en cada partido convocado o en juego, a quien tiene `match.live.write`: «Directo», o «Apuntar» si el partido es en diferido. `tieneDirecto` en `agenda/model/partido.ts`. Rama `feat/agenda-acceso-directo`, sin base de datos.
- **Pruebas:** 419 en verde, 2 nuevas (una de modelo y una de pantalla). Lint, Prettier y build limpios, sin `INEFFECTIVE_DYNAMIC_IMPORT`.
- **Deuda:** la A11 no enlaza al directo, se llega por el calendario tras guardar la convocatoria. Inicio seguía sin el próximo partido: lo cierra la T-213, arriba.
- **Sin probar en un móvil.**

---

## Sesión 27/09/2026, madrugada — T-210a y correcciones: ✅ cerrada

Dos sesiones de Cowork programadas, sin Raúl delante. La del 26/09 a las 22:10 leyó los documentos,
consultó el esquema y dejó el modelo, el acceso a datos y los hooks sin commitear; se cortó. La del
27/09 a la 01:30 la retomó en modo recuperación y la terminó. Cola renovada el 26/09 por la noche:
**la T-210 se adelanta a la T-209 por decisión de Raúl** y se parte en dos entregas. Esta es la
primera, la T-210a (cierre del partido, A13), con cuatro correcciones de documentación en la misma
PR. Rama `feat/review-cierre-partido`. **Sin DDL**: la T-210a cabe en el esquema actual. De la
base solo se leyeron `enforce_match_changes` y los `CHECK` de `matches`.

---

## HECHO

| Pieza                            | Qué hace                                                                                                                                                                                                       |
| :------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `review/model/cierre.ts`         | Lógica pura del cierre: qué estado admite cierre, qué lo impide en palabras (`bloqueosDelCierre`), el acta (0 a 99, los dos obligatorios), C-02, orígenes del gol, dónde se suspendió y a qué estado se reabre |
| `review/api/cierre.ts`           | Lee lo que pinta la A13, cierra en cinco pasos (abajo), reabre y guarda el origen de un gol. Del jugador solo `nickname` y el dorsal de `match_squad`                                                          |
| `review/api/local.ts`            | Junta lo del aparato: cuenta la cola del partido, intenta enviarla y, con el partido cerrado, limpia la precarga, los eventos locales, lo enviado de la cola y la marca de partido en curso                    |
| `review/hooks/useCierre.ts`      | Consultas y mutaciones. La cola se vuelve a mirar cada 3 s mientras quede algo por enviar                                                                                                                      |
| **A13**, `CierrePartidoPage.tsx` | Sustituye a su `PantallaPendiente`. Estado en palabras, resultado calculado y acta, eventos pendientes, «Este móvil», origen de los goles y cerrar; cerrado, el acta, la fecha del cierre y reabrir            |
| `sync` y `match`                 | `contarDelPartido` (sin enviar y rechazados de un partido, de todas las cuentas del aparato) y `olvidarPartido` (precarga y eventos locales), por sus barriles                                                 |
| Calendario (A09) y directo (A12) | Enlace «Cierre» en el partido terminado, suspendido o cerrado, y en el diferido convocado o en juego; en el directo, «Ir al cierre del partido» al terminar. Los dos, solo con `match.close`                   |
| Primer partido                   | **Sábado 3 de octubre a las 12:00**, confirmado por Raúl el 26/09: `docs/recursos/cadete_primera_tenerife_g2_2026-27.md` y DOC 08 §8                                                                           |
| DOC 10 v0.7                      | Los paneles de Netlify y de Supabase, comprobados por Raúl el 26/09: se retira la hipótesis de la PR #54 y el §4.5 suma `https://main--gavetastats.netlify.app/**`                                             |
| DOC 08 v3.0 y `CLAUDE.md`        | La T-210 en 🚧 y por delante de la T-209 en el §3 y en el §5, con el porqué. Nada más replanificado                                                                                                            |

**Cerrar, paso a paso** (`review/api/cierre.ts`): cuenta otra vez los pendientes en el servidor; en
diferido, crea las partes que falten con la duración prevista; recalcula los tramos con
`rebuild_match_stints`; da por terminadas las coberturas abiertas en el final (C-03; hasta la T-209
no hay ninguna); y pasa el partido a `closed` con el acta, `closed_at` y `closed_by`, con el estado
de partida en el filtro. Si otro lo cambió entre medias, cero filas y «el partido ha cambiado».

### Pruebas

**417 en verde, 42 archivos**, 39 nuevas: treinta del modelo del cierre, cinco de la A13 (pendientes
que bloquean, acta que no cuadra y cierre, acta vacía, reabrir y partido sin jugar), tres de
`tieneCierre` y una del enlace «Cierre» del calendario. **Las de pantalla se vieron fallar** contra
el código roto a propósito; las del modelo no compilan sin él.

`npm run lint`, `npx prettier --check .`, `tsc -b` y `npm run build` en verde en local, sin
`INEFFECTIVE_DYNAMIC_IMPORT`.

---

## DECISIONES TOMADAS

Donde los documentos no daban la regla, se eligió la salida más conservadora y reversible.

**C-01 al pie de la letra: con eventos pendientes no se cierra.** La pantalla los enseña y los
cuenta, y el servidor los vuelve a contar al pulsar «Sí, cerrar». Aprobarlos, en bloque o uno a
uno, es de la T-210b (punto 51).

**Lo que este móvil no ha enviado también impide cerrar.** El servidor no tendría el partido entero,
y el recálculo de los tramos saldría mal. Si la cola no se puede leer, no se bloquea: cerrar se
deshace reabriendo. Alternativa descartada: avisar sin bloquear, que deja cerrar un partido al que
le faltan eventos que llegarán después.

**Lo rechazado por el servidor avisa y no bloquea.** No llegará nunca solo, y bloquear por ello
dejaría el partido sin cerrar hasta que alguien lo revise. Su sitio es la T-210b (punto 34).

**Reabrir pide `match.close` y devuelve el partido al estado de antes.** Es lo que ya exige
`enforce_match_changes`, que no restringe las transiciones: `suspended` si tiene parte y segundo de
suspensión (el `CHECK` `matches_suspension` los exige para ese estado), y si no `finished`. El acta
se conserva y el disparador `matches_audit` lo apunta en `audit_log`. Nadie más reabre: el DOC 04 §8.4 no lo reparte.

**Sin campo de notas del partido.** Es el sitio natural para escribir «se lesionó el 7», y esos datos
no entran (datos de salud de menores). Si hace falta, se decide aparte.

**En diferido, las partes que falten se crean al cerrar con su duración prevista** (DOC 04 §5.4): sin
partes, el recálculo no da minutos a nadie. Crearlas pide `match.live.write`; quien solo tenga
`match.close` ve el motivo y no puede cerrar (punto 52).

**El origen del gol se pone en la A13, solo con `event.approve` y solo sin cerrar.** La RLS pide ese
permiso para tocar un evento aprobado. Va directo a la base, no por la cola: la A13 se usa después
del partido y con cobertura. Se guarda al elegir, con un `<select>` nativo; «Sin indicar» solo sale
mientras no tenga origen. Cerrado, se corrige reabriendo.

**Al cerrar, este móvil olvida el partido**: precarga, eventos locales, lo enviado de la cola y la
marca de partido en curso. Lo rechazado se queda. Un fallo al limpiar no convierte el cierre en
fallo. Los demás aparatos no se enteran (punto 37).

**El acta propone lo ya confirmado o, si no hay, lo calculado.** Si no coinciden, se avisa y se
puede cerrar igual (C-02). Qué resultado manda en las estadísticas lo decidirá la fase 4.

**La suspensión desde el directo no entra aquí.** La A13 cierra y reabre partidos suspendidos y dice
dónde se suspendieron, pero suspender es una acción del reductor de la A12, con su transición en la
cola, y la cola pidió no ampliar el alcance (punto 40).

**Confirmaciones en dos pasos en el mismo sitio**, como el borrado de la A10. Al abrirse, el foco va
a la pregunta y no al «Sí», para que un segundo toque sin mirar no confirme. Al cerrar y al
reabrir, el foco va a la línea del estado, que es lo que ha cambiado. Una sola región viva.

**Cerrar y reabrir invalidan la caché sin esperar.** Si esperan, el partido cambia de estado, la
sección que llamó a `mutate` se desmonta y TanStack Query no llama a sus `onSuccess`: ni anuncio
ni foco.

---

## PENDIENTE DE LA TAREA

**La T-210b**: aprobar y rechazar pendientes (con la acción en bloque de C-01), los candidatos a
duplicado por `duplicate_group_id`, corregir el minuto por la cola (E8-09) y lo rechazado por el
servidor. Con ella, la T-210 pasa a ✅. Hereda los puntos 34, 43 y 51.

---

## DEUDA TÉCNICA GENERADA

Los puntos 50 a 53 de abajo.

---

## LO QUE SIGUE ABIERTO

Se retiran tres puntos: el 41 (tramos recalculados al cerrar) y el 44 (origen del gol al cerrar),
que cierra la T-210a, y el 52 (inicio de sesión en pre), que cerró Raúl al comprobar el panel. **La
lista se renumera**: el 42 y el 43 bajan uno; del 45 al 51, bajan dos. Se reescriben el 13, el 31,
el 37 y el 40, y se suman del 50 al 53.

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
12. **Cerrado el 27/09: se quita el `ignore` de `netlify.toml`.** Era la causa del punto 13 (DOC 10
    §2.1). No se vuelve a poner.
13. **Pre y pro, en marcha desde el 27/09.** Raúl publicó en pro a las 11:07 con
    `git push origin main:release` (`release@f6f38d0`). Pre no compilaba porque el `ignore`
    cancelaba cada despliegue de `main` («Canceled build due to no content change»), también el de
    la #55. Se relanzó a mano con «Retry without cache» y `main--gavetastats` sirve ya el build de
    `f6f38d0`. Desde la PR `build/platform-netlify-sin-ignore`, cada fusión a `main` compila pre sola, con
    coste 0. Cada publicación en pro cuesta 15 de los 300 créditos del mes.
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
    lo cuenta y enseña lo que dijo el servidor, plegado. Se queda en la cola sin purgarse, a
    propósito: nadie lo ha revisado. La A13 lo cuenta y no impide cerrar. Es de la T-210b.
35. **Sin probar el viaje entero hasta Supabase en el navegador**: la A12 encola, la cola envía, la
    base fija el estado del evento, `marcar_convocado` pasa el partido a convocado y la A13 lo
    cierra con `rebuild_match_stints`. Probado en SQL,
    por la RLS, pero no desde la aplicación: desde las sesiones programadas no se entra con Google.
    Es lo primero que hay que mirar (comandos de abajo).
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
46. **Sin probar en el navegador ni en un móvil.** Ni la botonera al sol, ni la vibración, ni el
    tamaño de los botones con la mano. Tampoco la A08 y la A10 de la T-203b, ni la A13.
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
    solo nacen de quien anota sin `event.approve`. **Para el 3 de octubre**: si anota solo quien
    tiene ese permiso, todo nace aprobado y el cierre funciona; si anota alguien más y la T-210b no
    ha llegado, el partido se queda terminado y sin cerrar hasta que llegue, sin perder nada.
52. **En diferido, cerrar crea las partes que falten, y eso pide `match.live.write`.** Quien solo
    tenga `match.close` ve el motivo y no puede cerrar. Con los permisos sembrados del Cadete A no
    pasa. Salida si molesta: la función del punto 50, que no dependería de la RLS de
    `match_periods`.
53. **C-03 a medias.** El cierre da por terminadas las coberturas abiertas en el final del
    partido, pero no las lista: hasta la T-209 no existe ninguna. La lista entra con la T-209.

54. **La tarjeta a un técnico no cabe en el modelo.** Una `yellow_card` propia exige un jugador
    convocado (DOC 04 §7.1, I-04). El 03/10 hubo amarilla al entrenador en el 32' y se apunta como
    `note`. Entra con disciplina (A16), fuera del MVP, y pide decidir si el cuerpo técnico existe
    como entidad sancionable.

55. **Las ventanas de cambio y la prórroga no se modelan.** El reglamento da siete cambios en tres
    ventanas más el descanso. La aplicación cuenta los cambios (R-04) y no las ventanas: las vigila
    el árbitro, y un bloqueo mal configurado impediría apuntar lo que pasó. La prórroga queda sin
    decidir hasta que haya copa.

56. **Una competición ya creada conserva su límite.** `REGLAMENTO_CADETE` solo rige al dar de alta.
    El límite de «Cadete Primera Tenerife G2» se cambia en la A08, que es dato y no código. La base
    rechaza el cambio que pase del máximo.

57. **Posiciones detalladas, a la espera de la lista de Isaac.** Laterales, mediapunta y demás: hoy
    solo hay portero, defensa, medio y delantero (DOC 05 §15). Irían como detalle bajo esas cuatro
    líneas, después de la T-210.

58. **El acta de la federación sirve para contrastar y no entra en el repositorio.** Trae nombre y
    apellidos de menores de los dos equipos. Se usa por dorsal al cerrar el partido (C-02); no se
    guarda en `docs/` ni en la aplicación.

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
| T-203b, en Windows                          |          180,29 kB |            19,71 kB |
| **Esta sesión, en Windows, cifras de Vite** |      **180,33 kB** |        **19,67 kB** |

**La A13 no entra en el arranque**: vive en su trozo perezoso, `review-*.js`, de 6,70 kB
comprimidos, más 0,76 kB de CSS. Los 0,04 kB de más en el inicial son la ruta nueva del enrutador y
los nombres con _hash_. Misma suma que la sesión anterior: `index-*.js`, `App-*.js`,
`announceContext-*.js`, `QueryClientProvider-*.js`, `workbox-window` e `index-*.css`. El CI da la
cifra de referencia. En crudo, `precache 37 entries (934.94 KiB)`.

---

## SIGUIENTE

**Lo que tiene que decidir o hacer Raúl antes del sábado 3 de octubre:**

1. **Quién anota el primer partido.** Con la T-210a, un partido se cierra si no le quedan
   pendientes; si anota alguien sin `event.approve` y la T-210b no ha llegado, el partido espera
   terminado (punto 51).
2. **Meter el partido** en la A10: At. Tacoronte, fuera, sábado 3 de octubre a las 12:00.
3. **Averiguar por qué Netlify no compila `main`** con el panel bien (punto 13). Hasta entonces, lo
   último se prueba en la vista previa de cada PR. **Publicar en pro** cuando vuelvan los
   créditos: `git push origin main:release`.
4. **La convocatoria de un partido empezado** (punto 31), si hace falta antes de la liga.

**Siguiente tarea de código: T-210b**, el panel de discordancias. Hereda los puntos 34, 43 y 51.
Con ella la T-210 pasa a ✅ y la cola termina. Después, la T-209 (varios anotadores), que hereda
los puntos 39, 44 y 53.

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

`npm run test -- --run` tiene que decir `Test Files 42 passed (42)` y `Tests 417 passed (417)`. El
build, en verde y sin `INEFFECTIVE_DYNAMIC_IMPORT`.

**En pre** (`https://main--gavetastats.netlify.app`) **o con `npm run dev`, con tu cuenta:**

1. En Calendario, un partido terminado enseña «Cierre». Un partido en diferido convocado, también.
2. En la A13 de un partido con goles aprobados: el calculado sale solo; pon el acta distinta y sale
   el aviso de C-02. Ponle a un gol «Penalti»: en Supabase, `match_events.details` tiene
   `"origen": "penalti"` y conserva lo que tuviera.
3. «Cerrar el partido» → «Sí, cerrar el partido». En Supabase, `matches` en `closed` con
   `confirmed_goals_for`, `confirmed_goals_against`, `closed_at` y `closed_by`; y
   `player_match_stints` con los tramos del partido.
4. «Reabrir el partido»: vuelve a «Terminado, sin cerrar» y `audit_log` tiene las dos filas de
   `matches`.
5. Lo de sesiones anteriores sigue sin mirar en el navegador (punto 35).

**Para repetir la prueba de aislamiento:** pega `supabase/pruebas/aislamiento_clubes.sql` en el
SQL Editor. Tiene que acabar en «T-105b SUPERADA · 168 comprobaciones · 0 fallos · 14 avisos».

**`npm run db:types` NO se lanza a la ligera** (punto 3).

---

## AVISO DE SEGURIDAD

**Esta sesión no escribió en la base de producción**: solo leyó la definición de
`enforce_match_changes` y los `CHECK` de `matches`. Ni variables de entorno, ni Netlify, ni la
rama `release`. Del jugador siguen viajando solo identificador, apodo y dorsal: la consulta nueva
de la A13 lee `players(nickname)` y nada más.

El aviso de Chrome autorrellenando el panel de Google en Supabase sigue vigente: al abrir el panel
del proveedor de Google, Chrome rellena «Client IDs» y «Client Secret»; **vacía los dos campos
antes de tocar nada.** Vale también al mirar las URL de redirección.
