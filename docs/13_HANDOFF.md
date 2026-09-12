# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 12/09/2026 — Tarea: cerrar el bloque F, escribir los DOC 07 y 08, dibujar la iconografía y auditar el proyecto

Sesión de chat web **desde el móvil**. Sin repositorio, sin terminal y sin Claude Code: todo sale como archivos completos para colocar a mano. No se tocó una línea de código de aplicación.

### HECHO

**DOC 03 v1.2 — bloque F cerrado.** Las tres decisiones de identidad, con dos apartados nuevos:

- **F1 · Nombre.** GavetaStats para el MVP; el nombre público queda aplazado. El §F1.1 recoge qué cuesta renombrar —configuración de Netlify, Supabase y Google, unos cuarenta y cinco minutos— y fija el **momento límite: antes de publicar fuera del grupo de prueba**, porque el subdominio forma parte de la identidad de la PWA instalada y cambiarlo obliga a reinstalar. El §F1.2 guarda los criterios del nombre definitivo: internacional, reconocible como aplicación de fútbol y con sitio para el componente de red social.
- **F2 · Logo.** Descartado el hexágono: a 16 px las barras se empastan y el icono _maskable_ recorta a círculo con un 20 % de margen, que se lleva justo las esquinas. Queda una marca mínima de tres barras ascendentes, monocolor y **sin letras**, para que sobreviva al cambio de nombre. La identidad definitiva la hará una diseñadora gráfica.
- **F3 · Paleta.** Neutro frío con acento índigo, tema claro por defecto, alto contraste como recurso para el sol.

**DOC 07 v1.0 (nuevo) y `src/styles/tokens.css` (nuevo).** Sistema de diseño completo: escalas de color con **el contraste medido de cada token**, escala tipográfica, espaciado, radios, movimiento, objetivos táctiles, contrato de icono, inventario de los 21 SVG y ocho componentes base.

Lo que salió al medir y condiciona el código:

- El 7:1 del directo parte la paleta en dos. `--gray-500` (5.20) y `--indigo-500` (5.78) valen fuera del Bloque A; dentro mandan `--gray-600` (7.84) y `--indigo-600` (7.62).
- `--gray-300` no sirve como borde de control: 1.92, por debajo del 3:1 del criterio 1.4.11. Los bordes de control usan `--gray-400` (3.05).
- Los tres estados del dato llevan tinta a 7:1 sobre blanco: 8.16 aprobado, 7.27 pendiente, 8.01 descartado. Se distinguen por luminosidad además de por tono, así que aguantan el daltonismo, pero el icono y la palabra siguen siendo obligatorios.
- **La fiabilidad no usa la paleta de estados.** Verde para fiabilidad alta se confundiría con dato aprobado, y son cosas distintas: un dato aprobado puede tener fiabilidad baja. Va en neutro con barras y porcentaje.
- El color del equipo no entra en nada que haya que leer, y la tinta encima la calcula `pickInk()` por luminancia. En alto contraste desaparece.

**DOC 08 v1.1 (nuevo).** Plan de tareas con ID, pantalla, dependencia, estimación en sesiones, rama y estado.

La v1.0 salió con la aritmética mal: daba 17 sesiones para la ruta mínima, y 17 son las **tareas**. Peor aún, aquella ruta mínima se dejaba fuera los permisos (T-301) y la prueba de campo (T-302), que con cuatro anotadores son obligatorios. Cifras reales, ya corregidas y comprobadas contra la columna: **25 sesiones la ruta completa, 23,5 la mínima, seis semanas. Ritmo exigido: 3,9 sesiones semanales sin fallar ninguna.**

**Los 21 iconos y el logo, dibujados.** SVG monocolor contra el contrato del DOC 07 §8.1, más un `LEEME.md`. Bajan la T-103 de dos sesiones a una. Dos notas: `reliability` quedó como medidor de aguja porque tres barras chocaban con el logo, y `foul_committed` y `foul_received` comparten silbato y se distinguen solo por la dirección de la flecha, cosa que hay que mirar en la prueba de campo.

**Auditoría completa de los DOC 02, 04, 05 y 06.** Trece hallazgos, cinco de ellos capaces de estropear el día del partido. Las correcciones ya están aplicadas a los documentos; lo que toca base de datos queda como migración por escribir (T-100b). El informe entero, con el razonamiento de cada uno, está en `AUDITORIA_2026-09-12.md`, que **no va al repositorio**: su contenido útil ya vive en los documentos corregidos.

| Hallazgo                                                         | Dónde quedó resuelto                  |
| :--------------------------------------------------------------- | :------------------------------------ |
| A-01 · El reloj no tenía dueño con cuatro anotadores             | DOC 04 §5.1.1, DOC 05 §8, DOC 06 §8.8 |
| A-02 · El estado del partido no viajaba por la cola de salida    | DOC 06 §8.4                           |
| A-03 · Sustitución duplicada tumbaba el recálculo de tramos      | DOC 04 §6.3                           |
| A-04 · En directo no se sabía quién estaba en el campo           | DOC 04 §6.5, DOC 06 §5.4              |
| A-05 · Los seguidores no podían leer `players`                   | DOC 05 §12.3                          |
| A-06 · Sin copias de seguridad                                   | DOC 10 §5.1                           |
| A-07 · La fiabilidad presentaba un 95 % como 100 %               | DOC 04 §10.3                          |
| A-08 · La ventana de duplicados daba falsos positivos            | DOC 04 §9.2                           |
| A-09 · La pantalla se apagaba sola en pleno partido              | DOC 06 §8.9                           |
| A-10 · En iPhone el almacén local podía desaparecer              | DOC 06 §8.2                           |
| A-11 · Las tarjetas se trataban como dato de acta sin haber acta | DOC 04 §10.1                          |
| A-12 · Faltaba la tarea de prueba de multitenencia               | DOC 08 · T-105b                       |
| A-13 · Defectos documentales                                     | DOC 05 §12.5 renumerado               |

### ESTADO DEL REPOSITORIO

**La T-100 está cerrada.** Lo de la sesión del 11/09 se fusionó en los PR #9 y #10: migraciones renombradas, tipos generados y documentos alineados ya están en `main`. `.env.local` también existe.

Lo de esta sesión, en el árbol de trabajo:

| Archivo                                     | Estado     | Sesión |
| :------------------------------------------ | :--------- | :----- |
| `docs/03_Decisiones_Pendientes.md`          | Modificado | 12/09  |
| `docs/04_Reglas_Negocio_Glosario.md` (v1.1) | Modificado | 12/09  |
| `docs/05_Modelo_Datos_RLS.md` (v1.1)        | Modificado | 12/09  |
| `docs/06_Arquitectura_Frontend.md` (v1.1)   | Modificado | 12/09  |
| `docs/10_Entornos_y_Despliegue.md` (v0.2)   | Modificado | 12/09  |
| `docs/07_Sistema_de_Diseno.md`              | Nuevo      | 12/09  |
| `docs/08_TAREAS.md`                         | Nuevo      | 12/09  |
| `docs/13_HANDOFF.md`                        | Modificado | 12/09  |
| `src/styles/tokens.css`                     | Nuevo      | 12/09  |
| `src/shared/ui/icons/*.svg` (21 archivos)   | Nuevos     | 12/09  |
| `src/assets/logo.svg`                       | Nuevo      | 12/09  |

Aparte de eso, `src/` sigue siendo la plantilla de Vite: ninguna dependencia del DOC 06 §2.3 está instalada y no existen `src/shared/lib/supabase.ts` ni `env.ts`.

**`tokens.css`, los iconos y el logo no van con los documentos.** Están colocados en su sitio, pero son código y entran con la rama de la **T-103**, junto a los componentes que los importan. En `main` sin nadie que los use solo estorban.

### PENDIENTE DE LA TAREA

1. **Fusionar el pull request de documentación** de esta sesión.
2. ~~Confirmar el recorte del MVP~~ — **confirmado (Raúl, 12/09/2026).** Fuera entrenamiento en directo (A15), disciplina (A16) y todo el Bloque B. El MVP termina donde termina la entrada de datos de partido. Queda una corrección de documentación pendiente: la columna «Fase» del DOC 02 §2 sigue marcando esas pantallas como MVP.
3. **Descargar la fuente.** `InterVariable-latin.woff2` a `public/fonts/`, y añadir `woff2` a los `globPatterns` del plugin de PWA, o la fuente no estará disponible sin red. Va dentro de la T-102.
4. **Commitear `tokens.css`, los 21 iconos y el logo**, que están colocados en `src/` pero fuera del commit de documentación. Entran con la rama de la T-103.
5. **Escribir la migración de la T-100b** con el esquema aplicado delante, nunca de memoria: toca restricciones, políticas y funciones que ya existen, y adivinar un nombre de política rompe la migración. Los cinco cambios, listados en el DOC 05 §14.2.
6. **Marcar `event.approve` a quien lleve el registro** cuando exista la pantalla de personas (T-301). Hasta entonces, la fila se siembra a mano junto con el resto de permisos.
7. **Cubos de Storage (`crests`, `docs`) sin crear.** DOC 05 §13. No bloquean nada todavía.

### AVISO DE SEGURIDAD

Sigue vigente: al abrir el panel del proveedor de Google en Supabase, **Chrome autorrellena «Client IDs» y «Client Secret»** con credenciales guardadas. Vacía los dos campos antes de tocar nada; si se pulsa «Save» con eso dentro, tu contraseña acaba escrita en la configuración del proveedor.

### DEUDA TÉCNICA

De la sesión anterior, todas abiertas:

| Deuda                                                                     | Estado                                                                      |
| :------------------------------------------------------------------------ | :-------------------------------------------------------------------------- |
| `btree_gist` instalado en `public` en vez de en `extensions`              | Abierta. Moverlo obliga a rehacer la restricción de exclusión de los tramos |
| Veintisiete claves ajenas sin índice, casi todas `created_by`             | Abierta. Ninguna se consulta hoy                                            |
| Trece tablas con dos políticas permisivas para `SELECT`                   | Abierta. Se paga separando `insert`/`update`/`delete`                       |
| Se usa la `anon key` heredada y no la clave publicable `sb_publishable_…` | Abierta. Coincide con el DOC 05 y el `.env.example`                         |
| Borrar un club falla mientras haya filas en `match_squad`                 | Abierta. Protege el histórico                                               |
| `CLAUDE.md` cita `docs/05_Modelo_Datos.md`, que no es el nombre real      | Abierta. Corrección de una línea                                            |
| El DOC 14 no menciona los subagentes                                      | Abierta                                                                     |

Nueva de esta sesión:

| Deuda                                                                                 | Estado                                                                                                       |
| :------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------- |
| Veintiún iconos por dibujar, tres o cuatro horas de ruta crítica                      | Abierta. Plan B en el DOC 07 §8.3: los once de evento dibujados, los diez de interfaz con formas elementales |
| Tema oscuro fuera del MVP                                                             | Asumida. El problema real —la pantalla al sol— lo resuelve el alto contraste                                 |
| Subconjunto de Inter sin afinar a los caracteres reales                               | Abierta. El subconjunto latino basta; afinarlo ahorraría unos kB                                             |
| El recorte del MVP deja A15, A16 y el Bloque B fuera del alcance escrito en el DOC 02 | Confirmado por Raúl el 12/09/2026. Queda pendiente corregir la columna «Fase» del DOC 02 §2                  |

### DECISIONES TOMADAS

**El reloj del partido tiene un solo dueño.** `match_periods.started_at` deja de ser informativa y pasa a ser la fuente de verdad; cada evento guarda `occurred_at` y los segundos se derivan. Un dispositivo que anota sin conocer el arranque manda `occurred_at` con los segundos nulos y los rellena el servidor. Se descartó la alternativa —nadie anota hasta recibir el arranque— porque deja tirado al anotador sin cobertura, que es para quien se montó la capa offline.

**El recálculo de tramos se vuelve tolerante.** Una sustitución cuyo jugador entrante ya tiene tramo abierto se ignora y se anota el descarte. La restricción de exclusión sigue vigilando I-03, pero deja de poder tumbar la función entera.

**La fórmula de fiabilidad cambia**: la corroboración suma sobre lo no cubierto, no sobre el total, y el 100 % queda reservado a la cobertura completa.

**Medición de campo en el amistoso de Isaac.** Segunda parte de 40 minutos con contadores de toque: 69 pases, 58 recuperaciones, 5 faltas cometidas, 9 recibidas. 3,5 pulsaciones por minuto sin atribuir a jugador. Confirma la decisión H2 con datos propios y deja escrito un principio nuevo: una métrica de alto volumen solo puede vivir a nivel de equipo y sin jugador, cosa que el modelo hoy no admite (DOC 04 §7.1, DOC 05 §15).

**El gol guarda su origen** —jugada, penalti, falta directa, córner o rechace— en el `details` que ya existe. Sin columna nueva, paso opcional y saltable (DOC 04 §7.5).

**Cada botón de evento lleva escrita su definición** (DOC 04 §7.6). Sin eso, dos anotadores producen números que no se pueden comparar: en la prueba de campo se contaron los fueras de juego como faltas, y el fuera de juego es un tipo aparte que está apagado.

**`match.close` se parte en dos permisos.** `event.approve` aprueba, rechaza y edita eventos ajenos; `match.close` cierra el partido y confirma el acta. Con un solo permiso para las dos cosas, o el entrenador dejaba de dirigir para anotar, o todo lo que apuntaba el anotador principal nacía pendiente y el cierre pasaba a ser un repaso de ciento y pico eventos. El cambio entra en la T-100b, con el aviso de que el valor nuevo de la enumeración necesita su propia transacción.

**Se mantienen los cuatro anotadores en el MVP (C1).** La alternativa era arrancar con un solo anotador y dejar la concurrencia para noviembre, que ahorraba cuatro sesiones. Se descarta: el reparto en el campo es media gracia del proyecto. El coste queda asumido y escrito: 3,9 sesiones semanales y cero colchón, con la palanca del DOC 08 §2 —quitar el tiempo real de la T-209— reservada para el hito del 4 de octubre.

**El MVP termina en la entrada de datos de partido.** Fuera entrenamientos, disciplina y todo el bloque de consulta. Qué se hace con los datos registrados se decide con la liga ya en marcha y con partidos reales dentro, que es cuando se puede juzgar de verdad qué hace falta ver.

**Inter en lugar de Helvetica.** Helvetica es comercial: la licencia web se paga, lo que rompe el presupuesto de 0 €, y solo está instalada de serie en iPhone y Mac, así que ni pagándola se vería igual en Android. Inter es SIL OFL, variable —un archivo cubre todos los grosores— y trae cifras tabulares, que es lo que el reloj del directo necesita para no bailar cada segundo.

**El alto contraste anula el color del equipo.** Al sol manda el contraste. La consecuencia se aplica en todas las pantallas, no solo en esa: los dos equipos se distinguen por posición y por nombre, nunca por color.

**La capa offline (T-206) va antes que la pantalla de directo.** Enchufar la cola a una pantalla ya escrita obliga a reescribir cada manejador de evento; escribir la pantalla contra una cola existente no cuesta nada. Es la dependencia que más caro sale saltarse.

**Hito de control el 4 de octubre.** Si la T-206 sigue abierta ese día, la capa offline se recorta a cola sin precarga y se documenta. Llegar al 25 de octubre sin directo no es una opción; llegar con un directo que solo funciona con cobertura, sí.

### SIGUIENTE TAREA SUGERIDA

**T-100b**, la migración de correcciones de la auditoría, que conviene aplicar con la base todavía vacía. Detrás van T-101 y T-102. La T-100 quedó cerrada el 12/09.

Si la próxima sesión vuelve a caer en el móvil, hay trabajo sin código: revisar el recorte del DOC 08 §7, o adelantar el DOC 09 (observabilidad) o el DOC 11 (legal y privacidad), que no dependen de nada de lo anterior.

### COMANDOS PARA CERRAR LA TAREA

```powershell
cd D:\Documentos\Proyectos\ProyectoSASI\App

# ---- Rama de documentación de esta sesión ----
git switch main
git pull
git switch -c docs/docs-bloque-f-diseno-y-tareas

git add docs/03_Decisiones_Pendientes.md docs/04_Reglas_Negocio_Glosario.md `
        docs/05_Modelo_Datos_RLS.md docs/06_Arquitectura_Frontend.md `
        docs/07_Sistema_de_Diseno.md docs/08_TAREAS.md `
        docs/10_Entornos_y_Despliegue.md docs/13_HANDOFF.md
git commit -m "docs: close decision block f, add design system, task plan and audit fixes"

npm run format:check
git push -u origin docs/docs-bloque-f-diseno-y-tareas
```

`src/styles/tokens.css` se queda sin commitear hasta la T-103. Guárdalo donde va —`src/styles/`— y déjalo fuera de estos dos commits.

Pull request por rama con el mismo título que el commit, CI en verde, squash merge, y la rama se borra sola (DOC 15 §4). Y al fusionar, sube al _Knowledge_ del proyecto las versiones nuevas del 00, 03, 07, 08 y 13: un documento desactualizado ahí hace más daño que su ausencia.
