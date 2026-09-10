# DOC 14 — Guía de arranque de Claude Code

> **Versión:** 1.0 — 09/09/2026
> **Para qué sirve:** dejarte Claude Code instalado y trabajando sobre el repo del proyecto, y explicarte cómo se trabaja así.
> **Decisión que implementa:** D1 (Claude Code para desarrollo, chat web para diseño y documentación).

---

## 1. Antes de instalar

| Requisito        | Valor                                                                                                           |
| :--------------- | :-------------------------------------------------------------------------------------------------------------- |
| Sistema          | Windows 10 build 1809 o superior                                                                                |
| Memoria          | 4 GB mínimo                                                                                                     |
| Git para Windows | Opcional, pero instálalo: habilita la herramienta Bash. Sin él, Claude Code ejecuta los comandos con PowerShell |
| Node.js          | **No hace falta.** Solo lo pide el método antiguo por npm                                                       |
| WSL              | **No hace falta.** La instalación nativa de Windows ya está soportada                                           |

**Comprobación previa importante:** si tienes una variable de entorno `ANTHROPIC_API_KEY` puesta en el sistema, bórrala. Claude Code la detecta y factura por token en vez de consumir tu suscripción.

Para verlo, en PowerShell:

```powershell
echo $env:ANTHROPIC_API_KEY
```

Si devuelve algo, quítala desde _Variables de entorno_ en las propiedades del sistema.

---

## 2. Instalación

Abre PowerShell **sin permisos de administrador** y ejecuta:

```powershell
irm https://claude.ai/install.ps1 | iex
```

Cierra la terminal y abre una nueva para que se actualice el PATH. Comprueba que todo está bien:

```powershell
claude doctor
```

Ese comando te dice el tipo de instalación y la versión, y avisa de cualquier problema de configuración.

---

## 3. Primer arranque y sesión

Abre una terminal **dentro de la carpeta del repo** y lanza:

```powershell
cd D:\Documentos\Proyectos\FutbolApp
claude
```

En el primer arranque te pedirá autenticarte. Elige iniciar sesión con tu cuenta del plan, no con clave de API. Se abre el navegador, autorizas y vuelves a la terminal.

A partir de ahí, escribes lo que quieres en lenguaje natural. Claude Code lee los archivos que necesita, propone los cambios y te pide permiso antes de tocar nada.

---

## 4. El archivo `CLAUDE.md`

Es el archivo más importante del montaje. Va en la raíz del repo y se lee automáticamente al arrancar cada sesión, así que ahí se pone lo que no quieres repetir nunca.

Puedes generar un esqueleto con `/init`, pero para este proyecto conviene escribirlo a mano. Contenido mínimo:

```markdown
# Contexto del proyecto

App PWA de gestión y estadísticas de fútbol base.
Stack: React + Vite (PWA), Supabase (PostgreSQL + Auth + RLS), Netlify.
Deadline MVP: 25 de octubre de 2026.

## Documentación

La documentación viva está en /docs. Léela antes de proponer arquitectura:

- /docs/00_Indice_Documental_y_Herramientas.md
- /docs/03_Decisiones_Pendientes.md (decisiones ya cerradas, NO las cuestiones)
- /docs/05_Modelo_Datos.md
- /docs/08_TAREAS.md
- /docs/13_HANDOFF.md (estado real al cerrar la última sesión)

## Reglas

- Una tarea por sesión. No amplíes el alcance sin preguntar.
- No inventes esquema de base de datos: si falta un dato, pregunta.
- Accesibilidad WCAG 2.2 AA en toda pantalla nueva. Ver /docs/02.
- Nunca escribas secretos en el código. Van a .env.local y a Netlify.
- No hagas commit ni push sin que yo lo pida.
- Español de España en comentarios, mensajes de commit y textos de interfaz.
```

Cada vez que cerréis una decisión de arquitectura, se añade ahí o al documento correspondiente. Un `CLAUDE.md` bien puesto ahorra la mitad del contexto de cada sesión.

---

## 5. Cómo se trabaja

| Práctica                                | Por qué                                                                                                                                           |
| :-------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Una tarea por sesión**                | Es el principio P4 del DOC 00. Al terminar, `/clear` para vaciar el contexto antes de la siguiente                                                |
| **Pide un plan antes de picar**         | «Antes de escribir código, explícame qué vas a tocar y espera mi visto bueno». Evita que se lance a modificar diez archivos por una frase ambigua |
| **Revisa los cambios como una PR**      | Antes de aceptar, mira el diff. Claude Code se equivoca, y lo tuyo es el código, no la fe                                                         |
| **El commit lo haces tú**               | Como en RefuelControl. Que proponga el mensaje si quieres, pero el push es decisión humana                                                        |
| **Actualiza `13_HANDOFF.md` al cerrar** | Es lo que permite que la sesión siguiente arranque sabiendo dónde quedó todo                                                                      |
| **Trabaja en rama**                     | Netlify genera un _deploy preview_ por rama. Te deja probar en el móvil sin tocar producción                                                      |

### Comandos que vas a usar a diario

| Comando         | Qué hace                                         |
| :-------------- | :----------------------------------------------- |
| `/clear`        | Vacía el contexto. Entre tarea y tarea, siempre  |
| `/init`         | Genera un `CLAUDE.md` inicial analizando el repo |
| `/help`         | Lista los comandos disponibles en tu versión     |
| `claude doctor` | Diagnóstico de la instalación                    |

---

## 6. Reparto entre Claude Code y el chat web

| Va a Claude Code                     | Va al chat web                           |
| :----------------------------------- | :--------------------------------------- |
| Escribir y modificar código          | Diseño de arquitectura y modelo de datos |
| Refactores que tocan varios archivos | Documentación del proyecto               |
| Depurar errores con la traza delante | Decisiones de producto y priorización    |
| Migraciones de Supabase              | Revisión de accesibilidad sobre capturas |
| Ejecutar `npm` y el servidor local   | Manuales de usuario                      |

El motivo del reparto es simple: en Claude Code el contexto se llena de código, y las conversaciones de diseño lo desperdician. En el chat web pasa al revés.

---

## 7. Seguridad

- **El repo privado no supone ningún problema.** Claude Code trabaja sobre tu carpeta local, no habla con GitHub. Los `push` los hace Git con tus credenciales de siempre.
- **Los archivos que abre se envían como contexto al modelo**, igual que si los pegaras en el chat. No es procesamiento local.
- **Añade `.env.local` al `.gitignore` antes del primer commit.** Es el fallo más caro y el más fácil de cometer.
- La `anon key` de Supabase puede vivir en el frontend siempre que las políticas RLS estén activas. La `service_role` no sale del servidor jamás.
