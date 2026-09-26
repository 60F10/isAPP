# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 26/09/2026 — T-203, competiciones y reglamento: ✅ cerrada

Sesión en la nube, sin acceso a Supabase, con Raúl respondiendo. **Raúl confirmó con Isaac el
reglamento del cadete** del DOC 04 §4.2 —2 × 40, 15 de descanso, reloj corrido, 5 cambios fijos
**sin reentrada**, 18 convocados, 11 titulares, 5 amarillas— y dio el nombre de la liga: **«Cadete
Primera Tenerife G2»**, temporada 2026-27, club C.D. Unión Tejina, equipo Cadete A. Pidió que la
liga especifique la categoría, y pasó el orden de la federación en Tenerife, de más a menos:
Autonómico Canarias, Provincial Tenerife, Preferente G1 a G3 y Primera G1 a G7. Anotado en el DOC 04
§4.2. En su lista, la Primera G7 aparece como 2025-26; es la temporada anterior y no se usa.

El entorno obliga a subir a una rama `claude/…`; la que toca por convención es
`feat/rules-competiciones`, y con ese nombre se hizo el commit para que pasara el hook de
`pre-commit`. La pull request lo dice.

---

## HECHO

**El módulo `rules` nace con la A08**, en su propio trozo perezoso. Sustituye a las dos
`PantallaPendiente` de `/competiciones` y `/competiciones/:id`.

| Pantalla                | Qué hace                                                                                                                                                                                                                                               |
| :---------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A08 · Competiciones** | Las de la temporada en curso del club, cada una con su reglamento en una línea: «Liga · 2 × 40 min · 5 cambios fijos, sin reentrada · 18 convocados, 11 titulares». Debajo, «Crear competición», que nace con el reglamento del cadete y abre su ficha |
| **A08 · Reglamento**    | Nombre, tipo y el reglamento entero del DOC 04 §4.1 en cinco bloques: partido, cambios, convocatoria, disciplina y botones del directo. La duración se calcula a la vista de lo escrito                                                                |

| Pieza                                      | Qué hace                                                                                                                                      |
| :----------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| `modules/rules/model/competicion.ts`       | Tipos, rangos iguales a los `check` de la base, `REGLAMENTO_CADETE`, nombres en español, `duracionDeJuego`, validación y resumen en una línea |
| `modules/rules/api/competiciones.ts`       | Listar, leer, crear y actualizar, con `SIN_FILAS` en la actualización                                                                         |
| `modules/rules/hooks/useCompeticiones.ts`  | Club y temporada del equipo activo, consultas y mutaciones                                                                                    |
| `modules/rules/components/GrupoDeOpciones` | Radios nativos con `fieldset` y `legend`, genérico en el tipo del valor                                                                       |
| `modules/rules/index.ts`                   | Las dos pantallas y el modelo que leerá el directo: `duracionDeJuego`, `TIPOS_DEL_MVP`, `NOMBRES_DE_EVENTO` y los tipos                       |
| `shared/lib/guardado.ts`                   | `SIN_FILAS`, `mensajeDeErrorAlGuardar` y `limpiarTexto`, mudados desde `core` porque `rules` los necesita. Suma el 23514 (fuera de rango)     |

**Sin comprobar en el navegador**, porque aquí no se puede entrar con Google. Las pruebas montan las
dos pantallas enteras con la red simulada; el viaje real está en «Comandos para verificar».

### Pruebas

**142 en verde**, 21 nuevas. Cada una se vio fallar antes de darla por buena: trece contra un
esbozo vacío y las demás con un mutante a mano sobre la línea que vigilan.

| Archivo                               | Casos | Qué vigila                                                                                                                   |
| :------------------------------------ | ----: | :--------------------------------------------------------------------------------------------------------------------------- |
| `rules/model/competicion.test.ts`     |    13 | El cadete confirmado; los once del MVP; rangos iguales a la base; duración; nombre; repetido; rangos; titulares ≤ convocados |
| `rules/routes/Competiciones.test.tsx` |     6 | Lista y resumen; alta con el cadete que abre la ficha; repetido; duración viva y guardado; fuera de rango; tipos conservados |
| `shared/lib/guardado.test.ts`         |     2 | Duplicado en general y el 23514                                                                                              |

---

## DECISIONES TOMADAS

**La categoría va en el nombre de la competición.** `competitions` solo tiene `name` y `kind`: ni
categoría, ni nivel, ni ámbito, ni grupo. Sin poder migrar, la ayuda del campo pide escribirla como
la llama la federación, sin la temporada, que ya va aparte. Las salidas para tenerla en columnas,
en el punto 33.

**Una competición nueva nace con el reglamento del cadete, no con los valores por defecto de la
base.** La base trae 2 × 45: nacer con eso obligaría a cambiarlo siempre, y el único equipo es un
cadete. Al crearla se abre su ficha para revisarlo.

**Los rangos de la pantalla son los mismos que los `check` de `competitions`**, y una prueba lo
vigila: si se toca uno, se toca el otro.

**Titulares no más que convocados.** Con más titulares que convocados no se podrían cumplir a la vez
la R-01 y la R-02 del DOC 04 §4.3. La base no lo impide; la pantalla sí.

**El nombre no se repite en la temporada**, sin mirar mayúsculas. Esta vez solo lo comprueba la
pantalla: la base no tiene restricción (punto 34).

**Solo los once botones del MVP se encienden desde la A08.** Los otros ocho no tienen botón en el
directo. Si alguien los encendió en la base, se conservan al guardar (punto 35).

**Sin borrado de competiciones** (punto 36).

**`rules` exporta el modelo por su barril.** El directo (T-207) leerá de ahí la duración, los tipos
encendidos y los nombres de los eventos, sin entrar en las carpetas de `rules` (DOC 06 §4.1, regla 3).

**Lo común de guardar sube a `shared/lib/guardado.ts`.** `rules` no puede importar el `model/` de
`core`. `core` lo reexporta para no cambiar sus importaciones, y su mensaje de duplicado sigue
hablando de equipos.

---

## PENDIENTE DE LA TAREA

Nada de lo que pide la fila del DOC 08. La categoría en columnas propias pide migración (punto 33).

---

## DEUDA TÉCNICA GENERADA

Los puntos 33 a 36 de abajo.

---

## LO QUE SIGUE ABIERTO

**No se cierra ningún punto de la lista anterior.** Se suman cuatro al final, del 33 al 36, y se
actualizan el 11 (doce pantallas pendientes) y el 16 (el ayudante común empieza a existir). La
numeración no cambia.

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
4. **`set_updated_at()` arrastra el `EXECUTE` de `authenticated` que no necesita.** Una línea en la
   próxima migración de permisos. DOC 05 §14.3.
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
11. **Doce rutas comparten la misma `PantallaPendiente`.** Cada una la sustituye su tarea.
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
    devuelve el equipo de cualquier partido. La T-201 y la T-202 no lo tocan: el alta de jugador
    lo crea en el club del equipo y lo inscribe en ese mismo equipo, así que la pantalla no puede
    mezclar clubes. **Decidir antes de la T-204**, que enlaza partido, competición y rival: ahí sí
    se eligen identificadores de listas. Pide migración: sesión de Cowork.
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
25. **Cerrar sesión no avisa de datos sin sincronizar.** Hoy no hay ninguno. La T-206 tiene que
    añadir el aviso y no dejar salir con la cola llena sin que la persona lo confirme.
26. **El alta de un club nuevo no se puede hacer desde la aplicación.** `clubs_insert` deja crear el
    club, pero `clubs_select` y `teams_insert` piden ser miembro del club, y en uno nuevo no lo es
    nadie: el club nace invisible y sin forma de meterle un equipo. Salidas:

    | Salida                                                                                                                                                                                   | Consecuencia                                                                                                                                                                                               |
    | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | **A. Seguir sembrando a mano** con `seed.sql`                                                                                                                                            | Cero trabajo. Basta mientras haya un solo club, que es el caso del MVP. **Recomendada hasta la liga**                                                                                                      |
    | **B. Una función `crear_club()` `SECURITY DEFINER`** que, en una transacción, cree el club, su primer equipo, la temporada en curso y al que llama como entrenador con los doce permisos | No toca ninguna política: la lógica queda en un sitio y se prueba con el script de la T-105b. La A03 ganaría el alta. **Recomendada para cuando llegue un segundo club**. Pide migración: sesión de Cowork |
    | C. Aflojar políticas: que `created_by` baste para leer el club y crear el primer equipo                                                                                                  | Toca tres políticas y abre casos raros (¿y el segundo equipo?, ¿y los permisos del creador?). La cola pidió no tocar la RLS para esto                                                                      |

27. **`teams_insert` pide menos que el DOC 05.** Solo `is_club_member`, no `team.manage`: por la API,
    cualquier miembro del club puede crear equipos. Una línea en la próxima migración de permisos:
    `with check (public.has_club_permission(club_id, 'team.manage'))`.
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
32. **El permiso de la A05 y la A06 lo mira la guardia en el equipo activo, no en el de la
    dirección.** Quien abra la plantilla de otro equipo del club ve lo que la RLS le deje leer, y al
    guardar recibe «No tienes permiso» si no tiene `roster.manage` en ese equipo. No hay fuga, pero
    sí una pantalla que ofrece lo que no puede hacer. Salida: comprobar el permiso del equipo de la
    ruta con las membresías de `useAuth()`.
33. **La categoría de la competición va en el nombre.** `competitions` solo tiene `name` y `kind`.
    La federación nombra las ligas por categoría, nivel, ámbito y grupo («Cadete Primera Tenerife
    G2»), y Raúl pidió que la liga especifique la categoría: hoy se cumple escribiéndola en el
    nombre, con la ayuda del campo pidiéndolo. Salidas:

    | Salida                                                                             | Consecuencia                                                                                                                                                                 |
    | :--------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | **A. Dejarlo en el nombre**                                                        | Cero trabajo. Se lee bien y basta para elegir la competición al crear un partido. No se puede filtrar ni ordenar por nivel                                                   |
    | **B. Una columna `category text`** en `competitions`, como la que ya tiene `teams` | Una línea de migración. Permite unir equipo y competición por categoría (el Cadete A solo ve ligas cadete). **Recomendada**                                                  |
    | C. Cuatro columnas: categoría, nivel, ámbito y grupo                               | Recoge entera la jerarquía de la federación y permite ordenar de más a menos. Cuatro campos más en la A08 y una lista de niveles que mantener. Sale caro para un solo equipo |

34. **El nombre de la competición no es único en la base.** La A08 no deja repetirlo en la
    temporada, pero `competitions` no tiene restricción: por la API, o con dos móviles a la vez, se
    pueden crear dos «Cadete Primera Tenerife G2». Una línea en la próxima migración:
    `unique (club_id, season_id, name)`.
35. **Los ocho tipos de evento fuera del MVP no se encienden desde la A08.** No tienen botón en el
    directo, y encenderlos prometería algo que no existe. Si alguien los enciende en la base, la A08
    los conserva al guardar. Cuando se construya su botón, se añaden a la lista de la ficha.
36. **No se borran competiciones.** La RLS lo permite, pero los partidos apuntan a su competición con
    `on delete restrict`, y una con partidos no se puede borrar. Una sin partidos mal creada se
    renombra. Si molesta, un «Borrar» que solo salga sin partidos.

Asumidas y sin fecha: el marco de la ventana vive en `App` como una pieza más entre el enrutador y
las maquetas; la siembra se lanza a mano; `useHasPermission` recibe `string` y no `AppPermission`;
`teams` del contexto devuelve membresías y no equipos pelados, a propósito; el club activo del
registro vive en una variable de módulo de `logging`; `sasi.equipo-activo` sobrevive al cierre de
sesión, a propósito; los rivales se duplican por club, como ya decía el DOC 05 §5.4 (E17-03); y
«Sancionado» no se elige en la A06: lo pone y lo quita el cómputo de sanciones, que llega con la
disciplina, después del MVP.

---

## EL PAQUETE, MEDIDO

| Momento                   | Inicial comprimido | Margen sobre 200 kB |
| :------------------------ | -----------------: | ------------------: |
| Tras la T-202, en Linux   |          179,77 kB |            20,23 kB |
| **Esta sesión, en Linux** |      **179,85 kB** |        **20,15 kB** |

**+0,08 kB, en `App-*.js`**: las dos entradas perezosas de la A08. La A08 vive en el trozo de
`rules` (4,92 kB de JavaScript y 0,70 kB de estilos). Lo que comparten `core` y `rules` —`Field`, lo
de guardar— sale a un trozo común, `guardado-*.js` (1,73 kB y 0,46 kB de estilos). Ninguno de los
tres se descarga al arrancar.

| Trozo del arranque         |    Comprimido |
| :------------------------- | ------------: |
| `index-*.js`               |      72,21 kB |
| `App-*.js`                 |     101,50 kB |
| `QueryClientProvider-*.js` |       0,26 kB |
| `workbox-window`           |       2,20 kB |
| Dos hojas de estilo        |       3,68 kB |
| **Total**                  | **179,85 kB** |

La lista buena de trozos sale de `dist/index.html` y de las importaciones de `App-*.js`. En crudo,
`precache 28 entries (719.43 KiB)`.

---

## SIGUIENTE TAREA SUGERIDA

**T-204**: calendario y alta de partido, incluido el partido a posteriori. Necesita la competición de
esta tarea y los rivales de la A04. Lo que conviene tener antes:

- **El calendario de la Cadete Primera Tenerife G2**: rivales, jornadas, fechas y si se juega en
  casa o fuera. No bloquea —cada partido se da de alta a mano—, pero con la lista delante se meten
  los rivales en la A04 de una vez.
- **El nombre del campo de casa**, tal como quiere verlo Isaac. `matches.venue` es texto libre.
- **El punto 20** (referencias cruzadas entre clubes). La pantalla solo ofrecerá los rivales y las
  competiciones del propio club, así que no puede mezclar clubes; lo que queda abierto es que la
  base tampoco lo impida.

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

`npm run test -- --run` tiene que decir `Test Files 16 passed (16)` y `Tests 142 passed (142)`. El
build, en verde y sin `INEFFECTIVE_DYNAMIC_IMPORT`.

**En el navegador, con `npm run dev` y la cuenta de Isaac o la tuya:**

1. Abre `/competiciones`. Sin ninguna todavía, lo dice.
2. «Crear competición»: «Cadete Primera Tenerife G2», tipo «Liga». Se abre su ficha con «Duración: 80
   minutos de juego» y los cambios fijos marcados.
3. Cambia los minutos por parte a 35: la duración pasa a 70 al momento. Déjalo en 40 y guarda.
4. Vuelve a Competiciones: sale con «Liga · 2 × 40 min · 5 cambios fijos, sin reentrada · 18
   convocados, 11 titulares».
5. Intenta crear otra con el mismo nombre en minúsculas: el aviso sale junto al campo.

**`npm run db:types` NO se lanza a la ligera.** Esta sesión no tocó el esquema.

---

## AVISO DE SEGURIDAD

Sin cambios de configuración esta sesión: ni variables de entorno, ni Netlify, ni migraciones. El
aviso de Chrome autorrellenando el panel de Google en Supabase sigue vigente para el día que haga
falta abrirlo: **vacía «Client IDs» y «Client Secret» antes de tocar nada.**
