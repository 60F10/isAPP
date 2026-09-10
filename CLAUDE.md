# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Contexto

Proyecto **SASI**: PWA de gestión y estadísticas de fútbol base, para Isaac, entrenador de un equipo cadete.
Deadline del MVP: **25 de octubre de 2026** (inicio de liga). Presupuesto: 0 € extra sobre suscripciones ya contratadas.

**Stack cerrado** (no propongas alternativas salvo que se pida): React + Vite con `vite-plugin-pwa` · Supabase (PostgreSQL, Auth con Google, RLS, Storage, Edge Functions) · Netlify · IndexedDB para el modo offline · Recharts o Chart.js para gráficas.

## Estado actual del repositorio

Repositorio: `https://github.com/60F10/isAPP.git` (privado, rama por defecto `main`).

Hay documentación (`/docs`), configuración del repositorio (Git, commitlint, Husky, Prettier, CI y Netlify) y los comandos de `.claude/`. **Todavía no existe código de aplicación ni `package.json`.** La primera tarea de código es el andamiaje (Fase 1: Vite/PWA + Supabase + login Google + tabla `error_logs`).

**Requisito**: Node 22 (ver `.nvmrc`). Con Node 18 ni `create-vite` ni Vite 7 arrancan; en Windows se cambia con `nvm use 22` desde una terminal de administrador.

Cuando exista el andamiaje, los comandos habituales serán los estándar de Vite (`npm run dev`, `npm run build`, `npm run preview`) más `npm run lint`; actualiza esta sección en ese momento con los comandos reales.

## Comandos de sesión (slash commands del proyecto)

Definidos en `.claude/commands/`. Fijan modelo, esfuerzo y encuadre según el tipo de tarea:

| Comando   | Para qué                                                                   | Modelo / esfuerzo |
| :-------- | :------------------------------------------------------------------------- | :---------------- |
| `/rapido` | Tareas mecánicas y acotadas                                                | sonnet / medium   |
| `/normal` | Pantallas, hooks, integraciones con Supabase                               | opus / high       |
| `/duro`   | Arquitectura, modelo de datos, RLS, sincronización offline, bugs atascados | opus / xhigh      |
| `/commit` | Redacta el mensaje de commit de lo que hay en el índice                    | sonnet / medium   |

## Documentación viva

Vive en `/docs`, es la única copia buena. **Léela antes de proponer arquitectura o escribir código.** Orden de lectura:

1. `docs/00_Indice_Documental_y_Herramientas.md` — índice, principios rectores (P1–P5), método de sesiones, orden de construcción por fases.
2. `docs/03_Decisiones_Pendientes.md` — decisiones **ya cerradas** (✅). No las reabras ni propongas alternativas.
3. `docs/05_Modelo_Datos.md` — modelo de datos y políticas RLS _(aún no escrito)_.
4. `docs/08_TAREAS.md` — plan de tareas atómicas _(aún no escrito)_.
5. `docs/13_HANDOFF.md` — estado real al cerrar la última sesión _(nace con la primera tarea de código)_.

Otros: `01_Backlog_Maestro_Ideas.md` (todas las ideas con ID `Ex-nn`, referencia estable), `02_Pantallas_Navegacion_Accesibilidad.md` (inventario de 21 pantallas del MVP, árbol de rutas, criterios WCAG), `15_Convenciones_Git.md` (ramas, commits y pull requests). `Instrucciones_del_Proyecto.md` es el encuadre pegado en el proyecto de Claude web.

Cuando se cierre una decisión de arquitectura, se añade al documento que corresponda y se refleja aquí si condiciona el trabajo diario.

## Arquitectura de alto nivel

### Módulos independientes y sustituibles (principio P3)

`Auth` · `Core` (Club/Equipo/Jugador) · `Rules` (competición y reglamento) · `Agenda` (calendario) · `Training` · `Discipline` · `Lineup` (convocatoria y alineación) · `MatchEngine` (partido en directo ⭐) · `Sync` (concurrencia, offline, trazabilidad) · `Review` (post-partido) · `Stats` · `Logging` (transversal, nace en Fase 1) · `Platform` (PWA/offline) · `Design` (capa visual, última fase).

Cada módulo se puede tocar o sustituir sin romper el resto.

### Columna vertebral de datos

- **Multitenant desde el MVP**: jerarquía `Club → Equipo → Jugador`. Las políticas RLS se escriben una vez para varios clubes aunque solo se cargue el de Isaac; no se rehacen después.
- **Separación estricta `User` / `Player`**: `User` es cuenta real mayor de edad; `Player` es entidad deportiva **sin cuenta, sin datos personales** — solo apodo y dorsal. Existen ya (vacíos y ocultos) los campos `nombre_real` y su consentimiento, para activarlos en el futuro sin migración.
- **Equipos**: campo que distingue equipo **gestionado** (plantilla, permisos, usuarios) de equipo **referencia** (rival: solo nombre y escudo, sin jugadores). Del rival solo se registran goles y córners a nivel de equipo.
- **Entidad `Temporada`** desde el día uno, para histórico y archivado sin migración.
- **Permisos como filas** (`usuario` + `permiso`), no como rol rígido. La matriz configurable libre será una pantalla nueva, no una migración.

### Motor de partido en directo (`MatchEngine`) — el núcleo

Es la pantalla que decide si el proyecto funciona (`/partidos/:id/directo`, pantalla A12). Uso de pie, a una mano, al sol, sin apartar la vista del campo. Todo lo demás cede ante la velocidad de registro.

- **Reloj interno corrido** de la app, arrancado con un botón grande. Cada evento captura minuto y segundo del reloj interno. Pausa solo manual (descanso, descuento).
- Duración = `nº partes × duración de parte`, **nunca una constante** (cadete: 2×40+15, total 80 min).
- **Flujo encadenado**: `Acción → Jugador → Detalle opcional → Guardado`. El detalle siempre se puede saltar (un gol sin asistencia vale más que ningún gol).
- **Registro diferido**: todo evento admite corregir su minuto después de crearlo. La pantalla admite crear y rellenar un partido entero en diferido, con el reloj parado.
- **Sustituciones por intervalos** (`entrada`/`salida` en tabla propia), aunque la competición sea de cambios fijos: una validación impide la reentrada según el reglamento. Así sirve a categorías de cambios volantes sin rehacer nada.
- **Cambio de posición dinámico** en directo (portero expulsado → jugador de campo al arco).
- **Sobrevive a una recarga**: el estado vive en almacenamiento local, no solo en memoria.
- Estados del partido: `programado → convocado → en_juego → finalizado → cerrado`. La pantalla de cierre no se salta: sin cerrar, los datos no entran en las estadísticas de temporada. Estado extra `suspendido` + minuto, excluido de las medias por defecto.

### Concurrencia y trazabilidad (`Sync`)

- Varios dispositivos anotan a la vez (Isaac, Raúl, un colega, el subdelegado) **ya en los amistosos**. Registro de errores y cola de sincronización **no son opcionales**, están en la ruta crítica.
- **Trazabilidad silenciosa obligatoria**: todo dato registra `created_by`, `created_at`, `match_id`.
- **Estado del evento**: `pending` / `approved` / `rejected` según el rol que lo introduce, sin peso numérico por origen en el MVP. El panel de resolución de discordancias (A13) entra en el MVP.
- **Duplicado**: mismo tipo de evento, mismo equipo y < 30 s de diferencia → candidatos, sin fusión automática. El umbral de 30 s es constante configurable, no cableada.
- **Modo offline en el MVP: solo el partido en directo** (IndexedDB). Pero la capa de sincronización se escribe genérica desde el principio.

### Cobertura declarada e índice de fiabilidad — la pieza más original

- Tabla `coverage`: cada anotador declara al entrar al directo **qué sigue** (todo el equipo, un jugador concreto, solo goles y tarjetas) y **desde qué minuto**. Reparto blando: nadie queda bloqueado para registrar cualquier otra cosa que vea.
- Cada métrica muestra al lado su fiabilidad, calculada **al vuelo** desde la cobertura declarada. Formato «Fiabilidad media · 56 %». Por accesibilidad (1.4.1), el nivel lleva icono y texto, nunca solo color.
- **Todas las lecturas de estadísticas pasan por una única capa** (vista o función de PostgreSQL). Cambiar a precalculado si el volumen crece será tocar un sitio, no veinte.

### Navegación

- URL propia por pantalla (necesaria para enlaces desde notificación y recuperación tras cierre inesperado). Máximo 3 toques desde Inicio a cualquier pantalla del Bloque A.
- Móvil: barra inferior fija de 5 destinos (Inicio · Equipo · Agenda · Datos · Más). Escritorio/tablet: rail lateral con los mismos 5.
- El partido en directo ocupa pantalla completa y oculta la barra inferior; salir requiere acción explícita. Con un partido en curso, banda superior persistente «Partido en directo · mm:ss · Volver».

### Orden de construcción (principio P1: primero meter datos, luego ver datos)

`Fase 1 Cimientos → Fase 2 Meter datos (Club→Equipo→Jugadores→Competición→Calendario→Convocatoria→PARTIDO EN DIRECTO→Post-partido) → Fase 3 Concurrencia → Fase 4 Ver datos (dashboards) → Fase 5 Capa visual → Fase 6 Post-deadline (IA voz, OCR, scraping)`.

Las pantallas del Bloque B (consulta/gráficas) no se construyen hasta que haya al menos dos partidos reales metidos de extremo a extremo.

## Reglas de trabajo

- **Una tarea por sesión.** No amplíes el alcance sin preguntar. Al terminar, `/clear`.
- **Pide un plan antes de picar código** y espera visto bueno.
- **No supongas nada sobre el esquema de datos ni la arquitectura.** Si falta un dato, pregunta antes de escribir código.
- Entrega archivos completos y listos para pegar. Nada de pseudocódigo ni marcadores «// el resto igual».
- **Los commits los hace el usuario.** No des por hecho que tienes acceso al repositorio. No hagas commit ni push sin que se pida. Si te piden el mensaje, sale de `/commit` y cumple la convención.
- Si un desarrollo no cabe en una sesión, pártelo en entregas y deja traspaso escrito en `docs/13_HANDOFF.md` (plantilla de cierre en DOC 00 §5.3). Nunca te quedes a medias sin dejar constancia.
- **Español de España** en comentarios, cuerpo de los commits y textos de interfaz. Vocabulario canario cuando encaje. El **asunto** del commit va en inglés (ver apartado de Git).
- Avisa de la deuda técnica en el momento de generarla. Di cuando una idea es mala y por qué. Cuando una decisión tenga varias salidas razonables, plantéalas con sus consecuencias en vez de elegir.

## Git: ramas, commits y pull requests

Convención completa en `docs/15_Convenciones_Git.md`. Los hooks de `.husky` y el workflow de CI **rechazan** lo que no cumpla, así que esto no es una recomendación.

- **Rama por módulo y tarea**: `tipo/modulo-descripcion-corta` → `feat/match-reloj-interno`. Nace de `main` actualizado, muere al fusionar. Nunca se hace commit directo en `main`.
- **Commit por tarea**, formato Conventional Commits con ámbito obligatorio:
  `tipo(ámbito): asunto en inglés, imperativo, minúscula, sin punto final` (≤ 72 caracteres).
  Cuerpo opcional en español, explicando el porqué. Si el asunto necesita una «y», son dos commits.
- **Tipos**: `feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore` `revert`.
- **Ámbitos** (= módulos): `auth` `core` `rules` `agenda` `training` `discipline` `lineup` `match` `sync` `review` `stats` `logging` `platform` `design` `db` `docs` `deps` `ci` `repo`.
- Ruptura: `tipo(ámbito)!:` más pie `BREAKING CHANGE:` con la migración.
- **Pull request por rama**, título con el mismo formato que un commit, plantilla rellenada, CI en verde, **squash merge**.
- Ámbito o módulo nuevo: se añade a `commitlint.config.mjs`, al patrón de `.husky/pre-commit` y a DOC 15, en el mismo commit.

Ejemplos buenos: `feat(match): add internal running clock with manual pause` · `fix(sync): drop duplicate events within the 30s window` · `chore(repo): configure husky and commitlint`.

## Configuración del repositorio

| Archivo                              | Qué hace                                                                                                          |
| :----------------------------------- | :---------------------------------------------------------------------------------------------------------------- |
| `.gitignore`                         | Deja fuera `node_modules`, `dist`, `dev-dist`, el service worker generado y **todo `.env*` salvo `.env.example`** |
| `.gitattributes`                     | Finales de línea LF. Sin esto, Windows y Netlify generan diffs fantasma                                           |
| `.env.example`                       | Plantilla de variables. Si añades una variable nueva, se añade aquí en el mismo commit                            |
| `commitlint.config.mjs`              | Tipos y ámbitos permitidos                                                                                        |
| `.husky/commit-msg`                  | Valida el mensaje                                                                                                 |
| `.husky/pre-commit`                  | Bloquea `main`, valida el nombre de la rama y pasa `lint-staged`                                                  |
| `.prettierrc.json` · `.editorconfig` | Formato                                                                                                           |
| `.github/workflows/ci.yml`           | Lint, formato, build y validación de commits en cada push y PR                                                    |
| `netlify.toml`                       | Build, redirección SPA y cabeceras de caché de la PWA                                                             |
| `.nvmrc`                             | Versión de Node del proyecto: **22**. Vite 7 y `create-vite` no arrancan con Node 18                              |

## Accesibilidad (condiciona el diseño, no es un repaso final)

Referencia: **WCAG 2.2 AA**. Ver `docs/02` §5 para la lista completa y la verificación por pantalla. Puntos que más afectan al código:

- Objetivos táctiles: 24×24 px CSS mínimo legal; en el partido en directo, **48×48 px con 8 px de separación**.
- **La acción se dispara al levantar el dedo, no al pulsarlo** (2.5.2). Permite deslizar fuera para abortar.
- Contraste: 4.5:1 texto normal, 3:1 texto grande y no textual; **7:1 en la pantalla de directo** (uso al sol).
- El color nunca es el único portador de información (estados `pending`/`approved`/`rejected`, tarjetas): color + icono + texto.
- Mensajes de estado con `aria-live="polite"` sin robar el foco. Foco visible propio (≥ 2 px, 3:1); nunca `outline: none` sin sustituto.
- Legible a 320 px sin scroll horizontal. Zoom 200 % sin pérdida de función. Nada de `user-scalable=no` ni bloqueo de orientación.
- Tablas de estadísticas con `<th>`, `scope` y `caption` reales; cada gráfica lleva su tabla de datos equivalente. Nada de rejillas de `<div>`.
- Alto contraste conmutable desde Ajustes. Texto base 16 px, nunca < 14 px. Respeto a `prefers-reduced-motion`. Respuesta háptica al registrar evento.
- Ningún dato se pierde al bloquearse la pantalla ni al recargar.

## Seguridad

- Secretos a `.env.local` (en `.gitignore` **antes del primer commit**) y a las variables de entorno de Netlify. Nunca en el código.
- La `anon key` de Supabase puede vivir en el frontend **siempre que las RLS estén activas**. La `service_role` no sale del servidor jamás.
- Cero datos personales de menores: sin DNI, sin fotos reales, sin datos médicos. La razón de sustitución «lesión» está eliminada; los motivos son «táctica», «cansancio» y «otros».
- Responsable del tratamiento: el club, con Isaac como contacto. El desarrollador no es responsable.
