# DOC 13 — HANDOFF: estado real al cerrar la última sesión

> Se **sobrescribe** al cerrar cada sesión. Plantilla en DOC 00 §5.3.
> Lo que hay aquí es el estado real, no el planificado.

---

## Sesión 11/09/2026 — Tarea: DOC 06, arquitectura frontend y convenciones

Sesión de chat con la carpeta conectada (modo B del DOC 00 §4.1). **No se tocó código: solo `/docs`.**

### HECHO

- **`docs/06_Arquitectura_Frontend.md` (nuevo, v1.0).** Fija estructura de carpetas, límites entre módulos, gestión de estado, cliente de Supabase, capa offline con su cola de sincronización, nomenclatura, manejo de errores, accesibilidad en el código, pruebas y variables de entorno. Veintiuna decisiones numeradas `D06-01` a `D06-21`, cada una con su alternativa descartada y el motivo. Se citan por su identificador desde los commits y desde el DOC 08.
- **`docs/00_Indice_Documental_y_Herramientas.md` → v1.2.** DOC 06 a ✅; DOC 07 pasa a «desbloqueado, siguiente»; DOC 08 queda bloqueado solo por el 07; DOC 10 desbloqueado; DOC 13 marcado como vivo; la Fase 0 del orden de construcción actualizada.
- **`docs/13_HANDOFF.md`** — este archivo, reescrito.
- **Subidos al _Knowledge_** del proyecto de Claude: 00, 06 y 13.
- **Deuda cerrada de la sesión anterior:** `oxlint` **sí** trae las reglas de `eslint-plugin-jsx-a11y` como plugin integrado, apagado por defecto. Se activa añadiendo `"jsx-a11y"` a `plugins` en `.oxlintrc.json` (DOC 06 §10.2). No hace falta volver a ESLint. La cobertura de reglas es parcial, así que la verificación manual del DOC 02 §5.3 sigue mandando.

### ESTADO DEL REPOSITORIO

Sin cambios desde la sesión del 10/09. Se repite aquí porque es el estado real de partida de la próxima sesión:

- React 19 + Vite 8 + TypeScript 6 con la plantilla `react-ts`. **`src/` sigue siendo la plantilla de Vite**, sin código de la aplicación.
- Herramientas completas: `oxlint`, Prettier, Husky (`pre-commit`, `commit-msg`, `pre-push`), commitlint, CI de GitHub, plantillas de PR y de _issue_, subagentes de `.claude/agents/` y el comando `/commit`.
- Netlify conectado al repositorio. Sitio en `https://gavetastats.netlify.app`. **Sin variables de entorno todavía.**
- Supabase: proyecto **GavetaStats** (West EU, Irlanda) dado de alta. El esquema está escrito y probado contra PostgreSQL en `supabase/migrations/0001_initial_schema.sql`, **sin aplicar al proyecto**.
- Login con Google **sin configurar** en Google Cloud Console.
- Documentación escrita: 00, 01, 02, 03, 04, 05, 06, 13, 14, 15. Faltan: 07, 08, 09, 10, 11, 12.

### PENDIENTE DE LA TAREA

Del DOC 06, nada. Quedan dos arreglos de documentación que esta sesión destapó y que caen fuera del alcance:

1. **`CLAUDE.md`, apartado «Documentación viva», está desfasado.** Cita `docs/05_Modelo_Datos.md`, que no es el nombre real del archivo, y da los DOC 04, 05 y 06 por no escritos. Como lo lee cada sesión de Claude Code al arrancar, conviene corregirlo pronto y en su propio commit.
2. **El DOC 14 sigue sin mencionar los subagentes.** Su apartado 6 reparte el trabajo solo entre Claude Code y el chat web. Viene de la sesión anterior.

### DEUDA TÉCNICA

La del frontend vive en el **DOC 06 §13** y no se repite aquí. Lo que sigue abierto del repositorio:

| Deuda                                                                            | Estado                                        |
| :------------------------------------------------------------------------------- | :-------------------------------------------- |
| La protección de `main` vive solo en los hooks locales, no en reglas de GitHub   | Abierta. Con un desarrollador basta           |
| CI no es un _check_ obligatorio: se puede fusionar en rojo                       | Abierta. Disciplina, no garantía              |
| `README.md` sigue siendo el genérico de Vite                                     | Abierta                                       |
| Sin detección de secretos en CI, sin accesibilidad automatizada y sin Dependabot | Abierta                                       |
| `.claude/settings.json` no existe                                                | Abierta                                       |
| El DOC 14 no menciona los subagentes                                             | Abierta                                       |
| El linter no cubre las reglas de accesibilidad de JSX                            | **Cerrada** en esta sesión (DOC 06 §10.2)     |
| Sin estrategia de pruebas                                                        | **Cerrada** en esta sesión (DOC 06 §11)       |
| Sin migraciones de Supabase versionadas                                          | **Cerrada**: `supabase/migrations/` ya existe |

### SIGUIENTE TAREA SUGERIDA

**DOC 07 — Sistema de diseño y tokens.** Rama `docs/design-sistema-de-diseno`. El DOC 06 ya fija dónde viven los tokens (`src/styles/tokens.css`), cómo se inyecta `--color-team` y que cada componente lleva su CSS Module, así que el 07 arranca con el terreno preparado.

Antes conviene cerrar el **bloque F del DOC 03**: confirmar o descartar «GavetaStats» como nombre de la aplicación (F1). El logo y la paleta base cuelgan de esa decisión, y el proyecto de Supabase y el sitio de Netlify ya se llaman así.

Si prefieres volver al código en vez de seguir documentando, la tarea de la Fase 1 sigue siendo la misma y no depende de nada de esto: **PWA y metadatos de la aplicación**, rama `feat/platform-pwa-y-metadatos`.

### DECISIONES TOMADAS

Las veintiuna del DOC 06, con su alternativa descartada, en el propio documento. Las cuatro que respondió Raúl en la sesión y que gobiernan el resto:

- **React Router + TanStack Query** como enrutador y única caché de lectura.
- **CSS Modules + variables CSS** para los estilos. Condiciona el DOC 07.
- **Dexie** sobre IndexedDB para el almacén local y la cola de salida.
- **Vitest + Testing Library desde la primera tarea de código**, con el alcance acotado en el DOC 06 §11 para que no se coma la ruta crítica.

Ninguna decisión cerrada del DOC 03 se reabrió. El bloque H sigue intacto.

### COMANDOS PARA VERIFICAR

```powershell
cd D:\Documentos\Proyectos\ProyectoSASI\App

npm run format:check     # los tres documentos ya pasan Prettier
git status               # solo docs/00, docs/06 y docs/13
```
