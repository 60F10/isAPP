# SASI (isAPP) — Plataforma de Gestión y Estadísticas de Fútbol Base

> **Proyecto:** PWA (Progressive Web App) de gestión deportiva y estadísticas de fútbol base.
> **Destinatario Principal:** Isaac (entrenador de un equipo de categoría cadete) y su cuerpo técnico.
> **Deadline MVP:** 25 de octubre de 2026 (coincidiendo con el inicio de la liga).
> **Presupuesto:** 0 € extra (optimizado bajo capas gratuitas de servicios modernos).
> **Estado:** Fase 1 (Cimientos & Andamiaje inicial).

---

## 📋 Descripción del Proyecto

**SASI** es una aplicación web progresiva diseñada para cubrir las necesidades reales de los cuerpos técnicos de fútbol base. A diferencia de las herramientas genéricas o complejas del mercado, SASI prioriza la **velocidad extrema de registro en tiempo real**, la **colaboración multi-anotador concurrente**, el **modo offline garantizado** y un sistema único de **declaración de cobertura y fiabilidad de métricas**.

La joya de la corona de la aplicación es su **MatchEngine (Motor de Partido en Directo)**, optimizado para ser usado de pie, a una mano, bajo el sol y sin apartar la vista del terreno de juego.

---

## ✨ Principios Rectores (P1–P5)

Toda decisión de diseño, arquitectura o código en este repositorio se rige por cinco pilares fundamentales:

- **P1 — Primero meter datos, luego ver datos:** El bloque de entrada de datos (registro de plantilla, calendario, convocatorias y partido en directo) se construye y valida por completo antes de programar una sola gráfica o dashboard de visualización.
- **P2 — Funcional antes que bonito:** Diseño minimalista en blanco, negro y gris. La interfaz debe girar sin un solo error técnico o de usabilidad antes de aplicar la capa de diseño visual avanzado y personalización cromática.
- **P3 — Módulos independientes:** Cada módulo de la aplicación (`Auth`, `Core`, `MatchEngine`, `Sync`, `Stats`, etc.) está desacoplado, lo que permite sustituirlos o tocarlos individualmente sin provocar efectos de regresión en el resto del sistema.
- **P4 — Una tarea = una conversación:** Estricta parcelación del desarrollo. Ninguna sesión de programación abarca más de lo que cabe en una ventana de contexto de IA de forma segura.
- **P5 — Accesible por diseño:** La accesibilidad no es un checklist de revisión final; se integra activamente en el desarrollo de cada pantalla bajo el estándar **WCAG 2.2 AA** (objetivos táctiles amplios, contrastes adaptados al sol, activación de acciones al levantar el dedo, etc.).

---

## 🏗️ Módulos de la Aplicación (Columna Vertebral)

La plataforma se compone de los siguientes módulos independientes y sustituibles:

1.  **Auth (Autenticación):** Acceso seguro con Google, gestión de sesiones y control de permisos granular basado en base de datos.
2.  **Core (Club/Equipo/Jugador/Temporada):** Estructura jerárquica _multitenant_ para dar soporte a múltiples clubes y equipos de forma nativa desde el primer día.
3.  **Rules (Reglamento):** Configuración flexible del reglamento de la competición (duración de partes, número máximo de cambios, lógica de tarjetas y suspensiones automáticas).
4.  **Agenda:** Calendario unificado de partidos y entrenamientos.
5.  **Training (Entrenamientos):** Registro rápido de asistencia y notas de rendimiento físico o técnico de la plantilla.
6.  **Discipline (Disciplina):** Gestión de sanciones de la federación y control interno de tarjetas acumuladas.
7.  **Lineup (Convocatorias):** Gestión de la convocatoria del partido y confección del once inicial y suplentes.
8.  **MatchEngine (Directo ⭐):** El núcleo de SASI. Reloj corrido interno configurable, flujo de eventos encadenados rápidos (`Acción → Jugador → Detalle → Guardado`) y resiliencia total frente a cierres inesperados de pestañas.
9.  **Sync (Sincronización):** Cola de sincronización en segundo plano con soporte _multi-anotador_ (p. ej. el entrenador, el delegado y un espectador registrando eventos a la vez en amistosos).
10. **Review (Post-partido):** Cierre oficial de actas y resolución visual de discordancias o duplicados en el registro multi-anotador.
11. **Stats (Estadísticas & Fiabilidad):** Capa de cálculo unificada de estadísticas de equipo y jugador. Incluye la métrica de **Fiabilidad declarada** (calculada al vuelo mediante la tabla de coberturas del anotador).
12. **Logging (Observabilidad transversal):** Registro de errores global mediante `error_logs` persistidos y controlados para una depuración proactiva de fallos de sincronización u offline.
13. **Platform (PWA/Offline):** Configuración del Service Worker, almacenamiento IndexedDB para los partidos en directo y estrategias de caché.
14. **Design (Capa visual):** Sistema de diseño, personalización cromática y alto contraste conmutable. Es la última fase: no se toca hasta que el resto de módulos giren sin errores (principio P2).

---

## 🛠️ Stack Tecnológico Cerrado

El stack del proyecto ha sido seleccionado cuidadosamente para garantizar un presupuesto de 0 € en fases de desarrollo e inicio, apalancándose en tecnologías con alta tolerancia a fallos y excelente rendimiento:

- **Frontend:** [React 19](https://react.dev/) + [Vite 8](https://vite.dev/) con TypeScript (modo estricto).
- **PWA / Offline:** [vite-plugin-pwa](https://github.com/vite-pwa/vite-plugin-pwa) para la instalación y modo desconectado + **IndexedDB** para la persistencia local robusta de la cola de sincronización.
- **Backend & DB:** [Supabase](https://supabase.com/) (PostgreSQL, autenticación nativa con Google OAuth, políticas de seguridad a nivel de fila RLS, Storage para escudos/documentos y Edge Functions).
- **Visualización:** [Recharts](https://recharts.org/) o Chart.js (en Fase 4, una vez validados los flujos de datos).
- **Despliegue & Hosting:** [Netlify](https://www.netlify.com/) con integración continua y previsualizaciones de despliegue por rama.

> **Estado del andamiaje:** el repositorio tiene ya el proyecto Vite + React + TypeScript, el tooling (Oxlint, Prettier, Husky, commitlint, CI, `netlify.toml`) y la documentación. Queda pendiente de la primera tarea de código la Fase 1: `vite-plugin-pwa`, cliente de Supabase, login con Google y tabla `error_logs`.

---

## ⚙️ Requisitos del Sistema

- **Node.js:** Versión **22** (pinada en `.nvmrc`). _Nota para Windows:_ Se cambia con `nvm use 22` desde una terminal de administrador. Con Node 18 ni `create-vite` ni Vite arrancan.
- **Gestor de paquetes:** `npm` (incluido en Node).
- **Linter & Formateador:** [Oxlint](https://github.com/oxc-project/oxc) (para un linting instantáneo de milisegundos) y [Prettier](https://prettier.io/) para coherencia de formato de código.

---

## 🚀 Instalación y Configuración de Desarrollo

Sigue estos pasos para levantar el entorno local de desarrollo:

### 1. Clonar el repositorio

```bash
git clone https://github.com/60F10/isAPP.git
cd isAPP
```

### 2. Seleccionar la versión correcta de Node

Si utilizas `nvm`, puedes activar automáticamente la versión del proyecto:

```bash
nvm use
# O si no tienes el nvm local autodetectable, fuerza la versión 22:
nvm use 22
```

### 3. Instalar las dependencias

Instala los módulos de npm (Husky se configurará automáticamente en el proceso de preparación):

```bash
npm install
```

### 4. Configurar las variables de entorno

Crea un archivo local `.env.local` en la raíz del proyecto basándote en la plantilla `.env.example`:

```bash
cp .env.example .env.local          # Git Bash
Copy-Item .env.example .env.local   # PowerShell
```

Rellena las variables de Supabase con tus credenciales de desarrollo (`Project Settings > API`):

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=
VITE_APP_ENV=development
```

La `anon key` puede vivir en el frontend siempre que las políticas RLS estén activas. La `service_role` no sale del servidor jamás.

_(Recuerda que `.env.local` está configurado en `.gitignore` y jamás debe subirse al repositorio)._

### 5. Iniciar el servidor local

Arranca el servidor de desarrollo de Vite:

```bash
npm run dev
```

Abre tu navegador en la dirección local indicada (habitualmente `http://localhost:5173`).

---

## 💾 Scripts del Proyecto

Los siguientes comandos están configurados en el archivo `package.json`:

| Comando                | Descripción                                                                                      |
| :--------------------- | :----------------------------------------------------------------------------------------------- |
| `npm run dev`          | Inicia el servidor de desarrollo local con Vite.                                                 |
| `npm run build`        | Ejecuta la comprobación estricta de TypeScript y compila el proyecto para producción en `/dist`. |
| `npm run preview`      | Previsualiza localmente el build de producción generado.                                         |
| `npm run lint`         | Analiza el código buscando fallos y malas prácticas usando el analizador ultrarrápido `oxlint`.  |
| `npm run format`       | Corrige automáticamente el formato de todos los archivos del proyecto usando Prettier.           |
| `npm run format:check` | Comprueba el formato del código sin aplicar cambios (ideal para procesos de CI).                 |
| `npm run prepare`      | Script interno de Husky para enlazar los git hooks locales.                                      |

---

## 🪵 Git: Ramas, Commits y Pull Requests

Para asegurar una trazabilidad y calidad impecables en el historial del repositorio, el proyecto cuenta con hooks estrictos en `.husky` que se ejecutan en cada acción de Git (ver **DOC 15** para la política detallada). El workflow de CI (`.github/workflows/ci.yml`) vuelve a comprobar lo mismo en cada push y pull request.

- **`pre-commit`:** bloquea los commits directos sobre `main`, valida que el nombre de la rama siga la convención y pasa `lint-staged` (Oxlint + Prettier) sobre lo que se va a commitear.
- **`commit-msg`:** valida el mensaje con `commitlint` (Conventional Commits, tipo y ámbito permitidos).
- **`pre-push`:** bloquea el push directo a `main` (la protección de rama de GitHub no aplica en repos privados de cuenta gratuita).

### 1. Nomenclatura de Ramas

Toda rama debe seguir el patrón: `tipo/modulo-descripcion-corta`

- **Tipos válidos:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- **Módulos válidos:** `auth`, `core`, `rules`, `agenda`, `training`, `discipline`, `lineup`, `match`, `sync`, `review`, `stats`, `logging`, `platform`, `design`, `db`, `docs`, `deps`, `ci`, `repo`.

_Ejemplos correctos:_

- `feat/match-reloj-interno`
- `fix/sync-cola-duplicados`
- `docs/docs-readme-completo`

La rama nace de `main` actualizado y muere al fusionar. Cada rama se cierra con un **pull request** (título con formato de commit, plantilla rellenada, CI en verde y **squash merge**).

### 2. Mensajes de Commit (Conventional Commits)

Los mensajes de commit se escriben con el formato:

```text
tipo(ámbito): asunto en imperativo, minúscula, sin punto final (max 72 chars)

Cuerpo opcional en español de España explicando el porqué del cambio.
Líneas de 100 caracteres como máximo.
```

- **Idioma:** El **asunto** (asociado a la cabecera) se escribe en **inglés** e imperativo. El **cuerpo** se escribe en **español** para reflejar con total precisión técnica las decisiones tomadas.
- **Ámbito (scope):** Es de uso **obligatorio** y debe coincidir con el módulo afectado.

_Ejemplo correcto:_

```text
feat(match): add internal running clock with manual pause

Se introduce el cronómetro de partido continuo (reloj corrido) en el MatchEngine.
Se ha configurado para respetar la duración de 40 minutos por parte configurada
para la categoría cadete, permitiendo pausas manuales para descansos y descuentos.
```

---

## ♿ Accesibilidad (WCAG 2.2 AA) — Reglas Críticas

SASI no hace adaptaciones finales de accesibilidad; se diseña con ella desde el día uno. Ten en cuenta:

1.  **Objetivos Táctiles:** En el motor de partido (`MatchEngine`), los botones de acción miden un mínimo de **48×48 px** con un espaciado físico de **8 px** para permitir su uso rápido y sin errores con una sola mano.
2.  **Activación de Acción (On-Release):** Las acciones críticas se disparan al levantar el dedo de la pantalla (`onPointerUp` / `touchend`), nunca al pulsarlo. Esto permite abortar el registro deslizando el dedo fuera del botón si se pulsa por error.
3.  **Contraste Solar:** La pantalla de partido en directo implementa una paleta de alto contraste optimizada para condiciones extremas de sol directo (relación de contraste mínima de **7:1**).
4.  **No solo color:** Las alertas, estados de sincronización (`pending`, `approved`, `rejected`) y tarjetas se muestran siempre mediante **color + icono legible + texto descriptivo**. El color nunca transporta la información en solitario (criterio WCAG 1.4.1).
5.  **Privacidad Estricta de Menores:** Cero datos personales: sin DNI, sin fotos reales, sin datos médicos. El `Player` es una entidad deportiva sin cuenta, representada solo por su apodo y su dorsal. El club es el responsable del tratamiento.

---

## 🤖 Desarrollo asistido por IA

El repositorio se trabaja con Claude Code y Gemini CLI (`CLAUDE.md` y `GEMINI.md` comparten contexto). En `.claude/` hay slash commands que fijan modelo y encuadre según el tipo de tarea (`/rapido`, `/normal`, `/duro`, `/commit`) y tres subagentes (`explorador`, `implementador`, `revisor`). Regla base: **una tarea por sesión**, plan aprobado antes de picar código, y los commits los hace la persona, nunca el asistente. Ver **DOC 14** para el arranque.

---

## 📂 Mapa Documental

El proyecto cuenta con un sistema de documentación exhaustivo que vive en la carpeta `/docs`. Es de obligada lectura antes de redactar código o modificar lógica de negocio:

- [DOC 00 — Índice documental, herramientas y método de trabajo](./docs/00_Indice_Documental_y_Herramientas.md)
- [DOC 01 — Backlog maestro de ideas](./docs/01_Backlog_Maestro_Ideas.md)
- [DOC 02 — Pantallas, navegación y accesibilidad](./docs/02_Pantallas_Navegacion_Accesibilidad.md)
- [DOC 03 — Decisiones pendientes (y cerradas)](./docs/03_Decisiones_Pendientes.md)
- [DOC 14 — Guía de arranque de Claude Code / Gemini CLI](./docs/14_Guia_Claude_Code.md)
- [DOC 15 — Convenciones de Git: ramas, commits y pull requests](./docs/15_Convenciones_Git.md)
- [Instrucciones del Proyecto](./docs/Instrucciones_del_Proyecto.md) (Contexto inyectado en asistentes de IA)

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia **MIT**. Consulta el archivo `LICENSE` para más detalles.
