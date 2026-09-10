# DOC 15 — Convenciones de Git: ramas, commits y pull requests

> **Versión:** 1.0 — 10/09/2026
> **Para qué sirve:** que cualquiera (tú, Claude, Gemini o tú dentro de seis meses) escriba el historial igual.
> **Se aplica solo:** los hooks de `.husky` y el workflow de CI rechazan lo que no cumpla. Esto no es una recomendación.

---

## 1. Repositorio

| Dato             | Valor                                |
| :--------------- | :----------------------------------- |
| Remoto           | `https://github.com/60F10/isAPP.git` |
| Visibilidad      | Privado                              |
| Rama por defecto | `main`                               |
| Licencia         | MIT                                  |

`main` está protegida: siempre desplegable, siempre verde, nunca se le hace commit directo.

---

## 2. Ramas: una por módulo y tarea

**Formato:** `tipo/modulo-descripcion-corta`

```
feat/match-reloj-interno
fix/sync-cola-duplicados
docs/docs-modelo-datos
chore/repo-configurar-husky
```

Reglas:

- Todo en minúsculas, palabras separadas por guiones, sin acentos ni `ñ`.
- El módulo es uno de los ámbitos de la tabla del apartado 3.
- Una rama = una tarea = un pull request. Si la rama crece hasta tocar dos módulos, es que eran dos tareas.
- La rama nace de `main` actualizado y se borra al fusionar.

```bash
git switch main
git pull
git switch -c feat/match-reloj-interno
```

El hook `pre-commit` rechaza el commit si estás en `main` o si el nombre de la rama no encaja con el patrón.

**Netlify genera un deploy preview por rama**, así que el nombre de la rama acaba siendo la URL con la que pruebas en el móvil. Otra razón para que sea legible.

---

## 3. Commits: Conventional Commits en inglés

**Formato:**

```
tipo(ámbito): asunto en imperativo, minúscula, sin punto final

Cuerpo opcional en español, explicando el porqué y no el qué.
Líneas de 100 caracteres como máximo.

Refs: #12
```

El asunto va en inglés y no pasa de 72 caracteres. El cuerpo, en español de España, porque ahí es donde se explica la decisión y ahí sí importa la precisión.

### Tipos

| Tipo       | Cuándo                                                            |
| :--------- | :---------------------------------------------------------------- |
| `feat`     | Funcionalidad nueva visible para el usuario                       |
| `fix`      | Corrección de un fallo                                            |
| `docs`     | Documentación, sin tocar código                                   |
| `style`    | Formato: espacios, comas, comillas. Cero cambio de comportamiento |
| `refactor` | Reescritura que no cambia el comportamiento                       |
| `perf`     | Mejora de rendimiento                                             |
| `test`     | Pruebas                                                           |
| `build`    | Build, dependencias, Vite, PWA                                    |
| `ci`       | GitHub Actions, Netlify                                           |
| `chore`    | Mantenimiento sin efecto en producción                            |
| `revert`   | Deshace un commit anterior                                        |

### Ámbitos (obligatorios)

Son los módulos del principio P3, más los transversales:

| Ámbito       | Qué cubre                                     |
| :----------- | :-------------------------------------------- |
| `auth`       | Login con Google, sesión, permisos de acceso  |
| `core`       | Club / Equipo / Jugador / Temporada           |
| `rules`      | Competición y reglamento configurable         |
| `agenda`     | Calendario y eventos                          |
| `training`   | Entrenamientos                                |
| `discipline` | Sanciones y disciplina                        |
| `lineup`     | Convocatoria y alineación                     |
| `match`      | MatchEngine: partido en directo               |
| `sync`       | Concurrencia, offline, cola de sincronización |
| `review`     | Post-partido y resolución de discordancias    |
| `stats`      | Estadísticas, cobertura y fiabilidad          |
| `logging`    | `error_logs` y observabilidad                 |
| `platform`   | PWA, service worker, IndexedDB                |
| `design`     | Capa visual, tokens, componentes base         |
| `db`         | Migraciones de Supabase, esquema, RLS         |
| `docs`       | Documentos de `/docs`                         |
| `deps`       | Dependencias                                  |
| `ci`         | Integración continua y despliegue             |
| `repo`       | Configuración del repositorio y tooling       |

Ámbito nuevo: se añade a `commitlint.config.mjs`, al patrón de `.husky/pre-commit` y a esta tabla. En el mismo commit.

### Ejemplos

```
feat(match): add internal running clock with manual pause
fix(sync): drop duplicate events within the 30s window
feat(db): add coverage table with rls policies
docs(docs): write data model and rls policies
refactor(stats): move all reads through a single postgres view
chore(repo): configure husky and commitlint
```

Un commit mal formado:

```
Añadido el reloj y arreglado lo de la cola      X  sin tipo, sin ámbito, en español, dos cosas a la vez
feat: reloj interno                             X  falta el ámbito
feat(match): Add internal clock.                X  mayúscula inicial y punto final
```

### Un commit por tarea

Un commit deja el repositorio en un estado coherente y describible en una línea. Si el asunto pide una «y», son dos commits.

Cambios de ruptura: `!` después del ámbito y un pie `BREAKING CHANGE:` explicando la migración.

```
feat(db)!: split user and player into separate tables

BREAKING CHANGE: las filas antiguas de `user` con dorsal hay que migrarlas
a `player` antes de desplegar. Script en supabase/migrations/0007.
```

---

## 4. Pull requests

- Uno por rama. El título sigue **exactamente** el mismo formato que un commit: `feat(match): add internal running clock`.
- Se rellena la plantilla. La lista de comprobación no es decorativa: la accesibilidad y los datos de menores se miran ahí.
- Fusión con **squash merge**. El historial de `main` queda con un commit por tarea, legible de arriba abajo.
- CI en verde antes de fusionar. La rama se borra al fusionar.

---

## 5. Qué hace cumplir cada cosa

| Regla                           | Quién la aplica                     | Cuándo salta                |
| :------------------------------ | :---------------------------------- | :-------------------------- |
| Nada de commits en `main`       | `.husky/pre-commit`                 | Al hacer commit en local    |
| Nombre de rama válido           | `.husky/pre-commit`                 | Al hacer commit en local    |
| Lint y formato de lo commiteado | `.husky/pre-commit` + `lint-staged` | Al hacer commit en local    |
| Formato del mensaje             | `.husky/commit-msg` + `commitlint`  | Al hacer commit en local    |
| Mensajes de toda la rama        | Workflow `CI / commits`             | Al abrir el pull request    |
| Lint, formato y build           | Workflow `CI / verify`              | En cada push y pull request |
| Nada de push directo a `main`   | Protección de rama en GitHub        | Al hacer push               |

Saltarse un hook (`--no-verify`) es una decisión consciente que deja rastro en el pull request. No es el camino habitual.

---

## 6. Cómo lo usa Claude Code

`CLAUDE.md` recoge estas reglas en su apartado de Git. Además, `.claude/commands/commit.md` monta el mensaje a partir de lo que hay en el índice.

El flujo de una sesión:

1. `git switch main && git pull && git switch -c tipo/modulo-tarea`
2. Trabajas la tarea con Claude.
3. `git add` de lo que entra en el commit.
4. `/commit` — Claude lee el diff en el índice y propone el mensaje.
5. Lo revisas, haces el commit y el push. **El commit y el push los haces tú.**
6. Pull request en GitHub, CI en verde, squash merge.

---

## 7. Cosas que no van al repositorio, nunca

- `.env`, `.env.local` ni ninguna clave. La `service_role` de Supabase, menos todavía.
- Nombres reales, fotos, DNI ni datos de salud de menores.
- `node_modules`, `dist`, `dev-dist` ni el service worker generado.
- Capturas con datos reales de jugadores.

Si algo de esto entra en un commit, no basta con borrarlo en el commit siguiente: queda en el historial. Se rota la clave y se reescribe la historia.
