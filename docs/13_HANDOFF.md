# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 10/09/2026 — Tarea: montaje del repositorio y andamiaje (Fase 1, parcial)

### HECHO

**Repositorio enlazado** con `https://github.com/60F10/isAPP` (privado, `main` por defecto, licencia MIT). Tres pull requests fusionados con squash, CI en verde en todos.

- **Convención de Git** — `docs/15_Convenciones_Git.md` (nuevo): Conventional Commits con asunto en inglés y ámbito obligatorio, ramas `tipo/modulo-descripcion`, un commit por tarea, squash merge.
- **Hooks que la aplican** — `.husky/pre-commit` (bloquea `main`, valida el nombre de rama, pasa `lint-staged`), `.husky/commit-msg` (commitlint), `.husky/pre-push` (bloquea el push a `main`). Configuración en `commitlint.config.mjs` y `.lintstagedrc.json`.
- **Higiene del repositorio** — `.gitignore`, `.gitattributes` (LF), `.editorconfig`, `.env.example`, `.nvmrc` (Node 22), `.prettierrc.json`, `.prettierignore`.
- **CI** — `.github/workflows/ci.yml`: job `Lint y build` (`npm ci`, `oxlint`, `prettier --check`, `tsc -b && vite build`) en cada push y PR, y job `Mensajes de commit` (commitlint sobre la rama) en cada PR. Acciones en v5.
- **Plantillas** — `.github/pull_request_template.md` con la lista de comprobación del proyecto (accesibilidad, datos de menores, trazabilidad, secretos) y `.github/ISSUE_TEMPLATE/` con `tarea.yml` y `fallo.yml`.
- **Andamiaje** — React 19 + Vite 8 + TypeScript 6, plantilla `react-ts`. Scripts: `dev`, `build`, `preview`, `lint`, `format`, `format:check`.
- **Despliegue** — Netlify conectado por su GitHub App al repositorio. Sitio `gavetastats` en `https://gavetastats.netlify.app`. `netlify.toml` con build, redirección de SPA y cabeceras de caché de la PWA. **Sin variables de entorno todavía**: no hay proyecto de Supabase.
- **Subagentes** — `.claude/agents/`: `explorador` (haiku, solo lectura), `implementador` (sonnet, ejecuta lo ya especificado y pregunta si le falta un dato), `revisor` (sonnet, revisa el diff contra las reglas no negociables).
- **Comando** — `.claude/commands/commit.md` (`/commit`): redacta el mensaje del índice según la convención.
- **`CLAUDE.md`** actualizado: estado real, comandos reales, apartado de Git, tabla de configuración del repositorio, subagentes y reparto con Gemini.
- **`GEMINI.md`** (nuevo): importa `CLAUDE.md` con `@CLAUDE.md`, sin duplicar contexto.
- **Formato** — Prettier aplicado a todo el markdown existente en un commit aparte. Los docs 00, 01, 02, 03 y 14 se resubieron al _Knowledge_ del proyecto de Claude ya reformateados.

### PENDIENTE DE LA TAREA

La Fase 1 **no está cerrada**. Falta todo esto, y en este orden:

1. **`vite-plugin-pwa` y metadatos de la app.** `index.html` sigue con `<title>scaffold</title>`, `lang="en"` y el favicon de Vite. Título, idioma, `theme-color`, descripción, icono y manifiesto van juntos en esta tarea. **No depende de Supabase: es la primera tarea de mañana.**
2. **Proyecto de Supabase.** Hay que crearlo a mano (cuenta y organización). Sin él no hay cliente, ni login, ni `error_logs`.
3. **Cliente de Supabase** en el frontend, leyendo `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` de `.env.local`, y las mismas variables en el panel de Netlify.
4. **Login con Google.**
5. **Tabla `error_logs`** y Error Boundary global (DOC 09, sin escribir).

**Bloqueo documental:** los documentos **04, 05, 06, 07 y 08 no existen**. No hay modelo de datos ni lista de tareas atómicas, así que no se puede «hacer la tarea 1» del DOC 08 porque el DOC 08 está vacío. La tarea 1 de arriba se puede especificar sola; de la 3 en adelante hace falta el DOC 05.

### DEUDA TÉCNICA GENERADA

- **La protección de `main` vive solo en los hooks locales.** Los rulesets de GitHub no se aplican en repositorio privado con cuenta personal gratuita. Quien clone tiene que ejecutar `npm install` para que los hooks se activen. Con un desarrollador basta; con dos, no.
- **CI no es un check obligatorio.** Se puede fusionar en rojo. Disciplina, no garantía.
- **El linter es `oxlint`, no ESLint.** Es lo que trae la plantilla de Vite. Hay que comprobar si cubre las reglas de accesibilidad de JSX que exige el principio P5; `eslint-plugin-jsx-a11y` no tiene equivalente directo. **Decisión pendiente antes de construir la primera pantalla.**
- **`README.md` es el genérico de Vite.** Hay que escribir uno real.
- **Sin estrategia de pruebas.** Vitest y Testing Library son lo natural con Vite, pero no está decidido.
- **Sin migraciones de Supabase versionadas.** En cuanto exista el proyecto, el esquema y las RLS tienen que vivir en `supabase/migrations/` dentro del repositorio, o no serán reproducibles ni revisables en un PR.
- **Sin detección de secretos en CI**, sin accesibilidad automatizada (axe o Lighthouse) y sin Dependabot.
- **El DOC 14 no menciona los subagentes.** Su apartado 6 reparte el trabajo solo entre Claude Code y el chat web.
- **`.claude/settings.json` no existe.** Permitir `git status`/`diff`/`log` sin preguntar y denegar `git push` quitaría fricción y cerraría una puerta.

### SIGUIENTE TAREA SUGERIDA

**PWA y metadatos de la aplicación**: instalar y configurar `vite-plugin-pwa`, escribir el manifiesto y corregir `index.html` (título, `lang="es"`, `theme-color`, descripción, icono). Rama `feat/platform-pwa-y-metadatos`. No necesita Supabase ni el DOC 05.

### DECISIONES TOMADAS

Ninguna de arquitectura ni de modelo de datos: el DOC 03 sigue intacto. Las de proceso, para el DOC 10 cuando se escriba:

- **Mensajes de commit con el asunto en inglés** y el cuerpo en español. Corrige lo que decía `CLAUDE.md`.
- **Repositorio privado.** Se descartó hacerlo público para conseguir rulesets: mal cambio. Ojo con la licencia MIT el día que se abra — autoriza a cualquiera a cerrar el código y venderlo.
- **Solo squash merge** habilitado, con el título del PR como mensaje, y borrado automático de rama.
- **Node 22**, fijado en `.nvmrc`, `netlify.toml` y el workflow de CI. Los tres tienen que decir lo mismo.
- **Gemini en sesión aparte**, nunca en paralelo sobre la misma carpeta. Desde Claude Code solo por Bash cuando entra mucho y sale poco.
- **Delegar lo decidido, no lo que hay que decidir.** Arquitectura, modelo de datos, RLS y sincronización se quedan en la sesión principal.

### COMANDOS PARA VERIFICAR

```powershell
cd D:\Documentos\Proyectos\ProyectoSASI\App

git switch main
git pull                 # main al día
npm ci                   # dependencias exactas del lockfile
npm run lint             # oxlint
npm run format:check     # Prettier, lo mismo que corre en CI
npm run build            # tsc -b && vite build
npm run dev              # arranca en local
```

Comprobar que los hooks siguen vivos:

```powershell
git config core.hooksPath      # tiene que devolver  .husky/_
```
