# GEMINI.md — Contexto del proyecto SASI para Gemini CLI

El contexto de este proyecto es **el mismo** para cualquier asistente. Vive en `CLAUDE.md`
y en `/docs`, y esa es la única copia buena. Aquí no se duplica: se importa.

@CLAUDE.md

---

## Reparto de trabajo

Este proyecto usa dos asistentes a propósito. El criterio no es «cuál es mejor», es dónde
se gasta el contexto:

| Va a Gemini CLI                                      | Va a Claude Code                          |
| :--------------------------------------------------- | :---------------------------------------- |
| Renombrar, mover y reorganizar archivos              | Arquitectura, modelo de datos y RLS       |
| Traducir textos de interfaz y revisar la redacción   | El motor de partido en directo (`match`)  |
| Convertir un mock a JSON, generar datos de prueba    | Capa de sincronización y offline (`sync`) |
| Escribir tests repetitivos ya con el patrón definido | Depurar un fallo con la traza delante     |
| Resumir un log largo, leer un CSV, buscar en el repo | Decisiones que condicionan otros módulos  |
| Boilerplate de componentes ya especificados          | Cualquier cosa marcada `/duro`            |

Regla práctica: **si la tarea ya tiene la decisión tomada y solo hay que teclearla, es de
Gemini. Si hay que decidir algo, es de Claude.**

## Reglas que no cambian por asistente

- Español de España en comentarios y textos de interfaz. Mensajes de commit en inglés,
  con la convención de `docs/15_Convenciones_Git.md`.
- No supongas nada sobre el esquema de datos ni la arquitectura. Si falta información,
  pregunta antes de escribir código.
- Entrega archivos completos. Nada de «// el resto igual».
- Los commits y los push los hace el usuario.
- Cero datos personales de menores: los jugadores existen como apodo y dorsal.
- Nunca escribas secretos en el código. Van a `.env.local` y a Netlify.
- Accesibilidad WCAG 2.2 AA aplicada al construir, no como repaso final.

## Comprobación

Al arrancar `gemini` en esta carpeta, escribe `/memory show`. Tiene que aparecer el
contenido de `CLAUDE.md`. Si no aparece, la importación con `@` no está activa en tu
versión: pega entonces el contenido a mano o usa `/memory refresh`.
