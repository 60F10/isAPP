---
description: Redacta el mensaje de commit de lo que hay en el índice, siguiendo la convención del proyecto
model: sonnet
effort: medium
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*)
disable-model-invocation: true
---

## Contexto

- Rama actual: !`git branch --show-current`
- Estado: !`git status --short`
- Cambios en el índice: !`git diff --cached --stat`
- Diff completo del índice: !`git diff --cached`
- Últimos commits: !`git log --oneline -10`

## Tu tarea

Redacta el mensaje de commit de lo que hay **en el índice** (solo eso; ignora lo que no esté añadido).

Convención completa en `docs/15_Convenciones_Git.md`. Resumen:

```
tipo(ámbito): asunto en inglés, imperativo, minúscula, sin punto final, ≤ 72 caracteres

Cuerpo opcional en español de España: el porqué, no el qué. Líneas ≤ 100.

Refs: #<issue>
```

- Tipos: `feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore` `revert`.
- Ámbitos: `auth` `core` `rules` `agenda` `training` `discipline` `lineup` `match` `sync` `review` `stats` `logging` `platform` `design` `db` `docs` `deps` `ci` `repo`.
- El ámbito es obligatorio y sale del módulo que toca el diff, no de la carpeta.
- Cuerpo solo si aporta algo que el asunto no dice. Un `chore` no suele necesitarlo.
- Ruptura: `tipo(ámbito)!:` y pie `BREAKING CHANGE:` con la migración.

## Qué me devuelves

1. El mensaje dentro de un bloque de código, listo para pegar.
2. El comando completo, listo para pegar:
   ```bash
   git commit -m "..." -m "..."
   ```
3. **Si el índice mezcla dos cosas que deberían ser dos commits, dímelo** y propón el reparto con los `git restore --staged` que hagan falta. Antes que un mensaje con «y» dentro, prefiero dos commits.

No ejecutes `git commit` ni `git push`. El commit lo hago yo.
