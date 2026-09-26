# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 26/09/2026 — T-202, plantilla y ficha de jugador: ✅ cerrada

Sesión en la nube, sin acceso a Supabase. Raúl preguntó qué tenía que decidir antes de la tarea y
pidió hacerla: la respuesta es que **nada la bloqueaba**. El punto 20 (referencias cruzadas entre
clubes) no le afecta, porque el alta crea el jugador en el club del equipo y lo inscribe en ese mismo
equipo; pasa a decidirse antes de la T-204.

El entorno obliga a subir a una rama `claude/…`; la que toca por convención es
`feat/core-plantilla`, y con ese nombre se hizo el commit para que pasara el hook de `pre-commit`.
La pull request lo dice.

---

## HECHO

**A05 y A06 sustituyen a sus `PantallaPendiente`**, las dos en el trozo perezoso de `core`.

| Pantalla                   | Qué hace                                                                                                                                                                                                                            |
| :------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A05 · Plantilla**        | Los jugadores del equipo de la ruta en la temporada en curso, por dorsal: dorsal, apodo, posición y, solo si no puede jugar, «No disponible» o «Sancionado» escrito. Debajo, «Añadir jugador». Un rival dice que no tiene plantilla |
| **A06 · Ficha de jugador** | Apodo, dorsal, posición habitual y disponibilidad. «Dar de baja» en dos pasos en el mismo sitio, sin ventana emergente, y vuelta a la plantilla                                                                                     |

| Pieza                                      | Qué hace                                                                                                                          |
| :----------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| `modules/core/model/plantilla.ts`          | Valida apodo, dorsal (1–99, solo cifras, sin repetir) y posición; ordena por dorsal; nombres de posiciones y estados; fecha local |
| `modules/core/api/plantilla.ts`            | Leer plantilla, ficha y equipo; alta con borrado compensatorio; cambiar apodo e inscripción                                       |
| `modules/core/hooks/usePlantilla.ts`       | Consultas y mutaciones. Guardar invalida la plantilla entera del equipo                                                           |
| `modules/core/components/SelectorPosicion` | `<select>` nativo con el aspecto de `Field`, compartido por A05 y A06                                                             |
| `mensajeDeErrorAlGuardar`                  | Acepta ya qué decir ante un duplicado: el nombre del equipo en la A04, el dorsal en la plantilla                                  |

**Sin comprobar en el navegador**, porque aquí no se puede entrar con Google. Las pruebas montan las
dos pantallas enteras con la red simulada; el viaje real está en «Comandos para verificar».

### Pruebas

**121 en verde**, 24 nuevas. Cada una se vio fallar antes de darla por buena: diez contra un esbozo
vacío y las demás con un mutante a mano sobre la línea que vigilan. Una destapó un fallo de verdad:
la A05 pedía la plantilla aunque el equipo fuera un rival. Arreglado: la consulta espera a saber que
el equipo es propio.

| Archivo                           | Casos | Qué vigila                                                                                                                          |
| :-------------------------------- | ----: | :---------------------------------------------------------------------------------------------------------------------------------- |
| `core/model/plantilla.test.ts`    |    11 | Que solo salgan las tres columnas permitidas; apodo; dorsal fuera de rango, con decimales o repetido; orden con «ñ»; fecha          |
| `core/model/clubYEquipos.test.ts` |    +1 | El mensaje de duplicado lo elige cada pantalla                                                                                      |
| `core/api/plantilla.test.ts`      |     3 | A `players` solo viaja el apodo; si la inscripción falla, el jugador se borra; si el jugador no se crea, no se inscribe             |
| `core/routes/Plantilla.test.tsx`  |     9 | Orden y avisos de la lista; alta limpia; dorsal repetido sin red; rechazo de la base; rival; sin temporada; ficha; sancionado; baja |

---

## DECISIONES TOMADAS

**Del jugador solo viajan apodo, dorsal y posición.** Ninguna consulta de `api/plantilla.ts` nombra
`full_name`, `name_consent_at` ni `name_consent_note`: ni al leer, ni al escribir. Aunque alguien las
rellenara a mano en la base, la aplicación no las pasearía. `validarJugador` solo produce las tres
columnas permitidas, y una prueba lo vigila. La ayuda del campo lo pide con palabras: «Solo el apodo.
Nada de nombre ni apellidos».

**El alta son dos inserciones con borrado compensatorio.** PostgREST no junta dos tablas en una
transacción. Si la inscripción falla —un dorsal que otra persona acaba de coger—, se borra el jugador
recién creado y el error que sale es el de la inscripción, que es el que explica qué pasó. El borrado
lo permite `players_write`, que es `for all` con `roster.manage`.

**El dorsal es opcional.** La base lo admite nulo, y un chico que llega a mitad de semana puede no
tenerlo todavía. Si se escribe, solo cifras del 1 al 99 y sin repetir entre los activos: la base lo
impide igual con `squad_shirt_unique`, pero así el aviso sale junto al campo.

**Disponibilidad: «Disponible» o «No disponible», sin motivo.** DOC 04 §12.4: la app no trata datos
de salud. **«Sancionado» no se elige**: lo pone y lo quita el cómputo de sanciones. La ficha lo
enseña y no manda la disponibilidad al guardar, para no pisarlo.

**La lista solo escribe la disponibilidad cuando es la excepción.** Diecinueve «Disponible»
seguidos son ruido; el que no puede jugar tiene que saltar a la vista. Va en palabras, en la tinta
del estado pendiente (7,27:1).

**La baja rellena `left_on` con la fecha local y nada más.** El jugador sigue en el club y sus
partidos siguen contando. Fecha local y no UTC: `toISOString()` daría el día anterior pasada la
medianoche en Canarias en horario de verano.

**La ficha recibe el equipo en `?equipo=`.** Un jugador puede estar inscrito en dos equipos del club
la misma temporada, y dorsal y disponibilidad son de cada inscripción. Sin el parámetro, se usa el
equipo activo.

**Guardar la ficha manda primero la inscripción y después el apodo, y el apodo solo si cambia.** El
choque de dorsal es lo más probable, así que va primero.

---

## PENDIENTE DE LA TAREA

Nada de lo que pide la fila del DOC 08. Lo que se queda corto está en los puntos 29 a 32.

---

## DEUDA TÉCNICA GENERADA

Los puntos 29 a 32 de abajo: jugador compartido entre equipos, bajas sin reincorporación,
operaciones de dos peticiones y permiso mirado en el equipo activo.

---

## LO QUE SIGUE ABIERTO

**No se cierra ningún punto de la lista anterior.** Se suman cuatro al final, del 29 al 32, y se
actualizan el 11 (catorce pantallas pendientes) y el 20 (se decide antes de la T-204). La numeración
no cambia.

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
11. **Catorce rutas comparten la misma `PantallaPendiente`.** Cada una la sustituye su tarea.
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
    todavía no existe en `shared/lib/` ni tiene tarea asignada. La T-201 deja la primera pieza,
    `SIN_FILAS`, para mudarla allí.
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
| Tras la T-201, en Linux   |          179,44 kB |            20,56 kB |
| **Esta sesión, en Linux** |      **179,77 kB** |        **20,23 kB** |

**+0,33 kB, todo en `App-*.js`**: las dos entradas perezosas nuevas del enrutador. Las pantallas
viven en el trozo de `core`, que crece a 8,41 kB de JavaScript y 1,38 kB de estilos y no se
descarga al arrancar.

| Trozo del arranque         |    Comprimido |
| :------------------------- | ------------: |
| `index-*.js`               |      72,21 kB |
| `App-*.js`                 |     101,42 kB |
| `QueryClientProvider-*.js` |       0,26 kB |
| `workbox-window`           |       2,20 kB |
| Dos hojas de estilo        |       3,68 kB |
| **Total**                  | **179,77 kB** |

La lista buena de trozos sale de `dist/index.html` y de las importaciones de `App-*.js`. En crudo,
`precache 24 entries (702.21 KiB)`.

---

## SIGUIENTE TAREA SUGERIDA

**T-203**: competiciones y reglamento. **Antes, que Isaac confirme los valores del cadete** del DOC
04 §4.2, porque de ellos sale la duración del partido y la validación de cambios del directo:

| Valor                  | Hoy en el DOC 04 | Qué confirmar                                                           |
| :--------------------- | :--------------- | :---------------------------------------------------------------------- |
| Partes × minutos       | 2 × 40           | Que siga siendo así esta temporada                                      |
| Descanso               | 15 min           | —                                                                       |
| Tipo de cambios        | Fijos            | Si son fijos o volantes, y si un jugador cambiado puede volver a entrar |
| Cambios máximos        | 5                | El número de la federación para cadete                                  |
| Convocados máximos     | 18               | —                                                                       |
| Jugadores en el campo  | 11               | —                                                                       |
| Amarillas para sanción | 5                | —                                                                       |

Y el nombre de la liga tal como quiere verlo. Si no llega la respuesta, la T-203 arranca con estos
valores, que se pueden cambiar en la A08 sin tocar código.

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

`npm run test -- --run` tiene que decir `Test Files 13 passed (13)` y `Tests 121 passed (121)`. El
build, en verde y sin `INEFFECTIVE_DYNAMIC_IMPORT`.

**En el navegador, con `npm run dev` y la cuenta de Isaac o la tuya:**

1. «Equipo» → «Plantilla» del Cadete A. Si el club no tiene temporada en curso, la pantalla lo dice:
   entonces hay que crearla en la base antes de seguir.
2. Añade «El Rubio» con el 7 y «Centrocampista». Sale en la lista en su sitio por dorsal.
3. Añade otro con el 7: el aviso sale junto al dorsal y no se envía nada.
4. «Editar» en El Rubio: márcalo «No disponible» y guarda. En la plantilla sale «No disponible».
5. «Dar de baja» → «Sí, dar de baja a El Rubio». Vuelves a la plantilla y ya no está.
6. En Supabase, `players`: la fila de El Rubio tiene `full_name`, `name_consent_at` y
   `name_consent_note` vacíos.

**`npm run db:types` NO se lanza a la ligera.** Esta sesión no tocó el esquema.

---

## AVISO DE SEGURIDAD

Sin cambios de configuración esta sesión: ni variables de entorno, ni Netlify, ni migraciones. El
aviso de Chrome autorrellenando el panel de Google en Supabase sigue vigente para el día que haga
falta abrirlo: **vacía «Client IDs» y «Client Secret» antes de tocar nada.**
