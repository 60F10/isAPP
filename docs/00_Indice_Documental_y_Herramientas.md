# DOC 00 — Índice documental, herramientas y método de trabajo

> **Proyecto:** App de gestión y estadísticas de fútbol base (nombre sin decidir → ver DOC 12)
> **Deadline MVP:** 25 de octubre de 2026 (inicio de liga). Amistosos antes como banco de pruebas.
> **Presupuesto:** 0 € extra sobre las suscripciones ya contratadas.
> **Versión:** 1.1 — 11/09/2026 (DOC 04 y DOC 05 entregados)

---

## 1. Para qué sirve este documento

Fija tres cosas: qué documentos componen el proyecto, qué herramientas hacen falta para desarrollarlo y cómo se trabaja sesión a sesión sin agotar la ventana de contexto ni dejar nada a medias.

Es el primer archivo que se sube al _Knowledge_ del proyecto y el primero que se lee al arrancar cualquier sesión.

---

## 2. Principios rectores

Estas cinco reglas mandan sobre cualquier decisión posterior. Si un documento las contradice, gana esta lista.

| #   | Principio                                | Consecuencia práctica                                                                                                   |
| :-- | :--------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- |
| P1  | **Primero meter datos, luego ver datos** | El bloque de entrada se construye completo antes de tocar una sola gráfica. Un dashboard sin datos reales no vale nada. |
| P2  | **Funcional antes que bonito**           | Blanco, negro y gris hasta que el motor gire sin errores. La capa visual es la última fase.                             |
| P3  | **Módulos independientes**               | Cada módulo (Auth, Core, MatchEngine, Stats, OCR, Scraping) se puede tocar o sustituir sin romper el resto.             |
| P4  | **Una tarea = una conversación**         | Ninguna sesión abarca más de lo que cabe en su ventana. Si no cabe, se parte y se deja traspaso escrito.                |
| P5  | **Accesible por diseño**                 | WCAG 2.2 AA se aplica al construir cada pantalla, no como repaso final. Ver DOC 02 §5.                                  |

---

## 3. Mapa documental

### 3.1 Estado actual

| Código | Documento                             | Qué contiene                                                                                                                            | Estado                                                |
| :----- | :------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------- |
| **00** | Índice documental y herramientas      | Este archivo. Mapa de docs, tooling y método de sesiones                                                                                | ✅ v1.0                                               |
| **01** | Backlog maestro de ideas              | Todas las ideas (tuyas y de Gemini) con ID, origen, módulo y fase                                                                       | ✅ v1.0                                               |
| **02** | Pantallas, navegación y accesibilidad | Inventario de pantallas, árbol de rutas, patrones de navegación y criterios WCAG                                                        | ✅ v1.0                                               |
| **03** | Decisiones pendientes                 | Preguntas que bloquean los documentos siguientes                                                                                        | ✅ v1.0                                               |
| **04** | Reglas de negocio y glosario          | Reglamento configurable, cálculo de minutos, casos límite, estados de evento                                                            | ✅ v1.0                                               |
| **05** | Modelo de datos y políticas RLS       | Tablas, relaciones, índices, trazabilidad y seguridad a nivel de fila. El esquema vive en `supabase/migrations/0001_initial_schema.sql` | ✅ v1.0                                               |
| **06** | Arquitectura frontend y convenciones  | Estructura de carpetas, gestión de estado, capa offline, nomenclatura                                                                   | ⏳ **Desbloqueado. Siguiente**                        |
| **07** | Sistema de diseño y tokens            | Variables CSS, escala tipográfica, color de equipo inyectable, componentes base                                                         | ⏳ Bloqueado por 02                                   |
| **08** | `TAREAS.md` — plan de tareas          | Lista atómica de tareas con ID, dependencia, estimación y estado                                                                        | ⏳ Bloqueado por 06 y 07                              |
| **09** | Observabilidad y registro de errores  | Tabla `error_logs`, Error Boundary global, qué se captura y qué no                                                                      | ⏳ Desbloqueado. La tabla ya existe en el DOC 05      |
| **10** | Entornos y despliegue                 | Variables de entorno, deploy previews, checklist de release. El modelo de ramas ya vive en DOC 15                                       | ⏳ Bloqueado por 06                                   |
| **11** | RGPD y política de datos              | Base legal, minimización, entidades `Player` sin datos sensibles, retención                                                             | ⏳ Desbloqueado                                       |
| **12** | Identidad corporativa                 | Nombre, logo SVG, paleta base                                                                                                           | ⏳ No bloqueante. Se puede hacer en cualquier momento |
| **13** | `HANDOFF.md` — traspaso vivo          | Estado real del desarrollo al cerrar cada sesión                                                                                        | ⏳ Nace con la primera tarea de código                |
| **14** | Guía de arranque de Claude Code       | Instalación en Windows, `CLAUDE.md`, método de trabajo y reparto con el chat web                                                        | ✅ v1.0                                               |
| **15** | Convenciones de Git                   | Ramas por módulo, commits por tarea, pull requests y qué hace cumplir cada hook                                                         | ✅ v1.0                                               |

### 3.2 Dónde vive cada documento

Todos los documentos viven en `/docs` dentro del repositorio. Esa es la única copia buena.

Al _Knowledge_ del proyecto de Claude suben solo los que hacen falta como contexto permanente: **00, 04, 05, 06, 07, 08, 13**. El **15** no hace falta subirlo: su resumen vive en `CLAUDE.md` y los hooks lo aplican solos. Los demás se adjuntan a mano en la sesión concreta que los necesite. Así el contexto base se mantiene ligero.

Cuando un documento cambia, se actualiza en `/docs`, se hace commit y se vuelve a subir al _Knowledge_ la versión nueva. Un documento desactualizado en el _Knowledge_ provoca más daño que su ausencia.

---

## 4. Herramientas necesarias

### 4.1 Cómo trabajo yo sobre el proyecto

Hay tres modos. Elige uno como principal; los otros quedan de reserva.

| Modo                                     | Qué permite                                                                                             | Coste                                                      | Cuándo usarlo                                                                       |
| :--------------------------------------- | :------------------------------------------------------------------------------------------------------ | :--------------------------------------------------------- | :---------------------------------------------------------------------------------- |
| **A · Claude Code** _(recomendado)_      | Lee el repo entero, edita varios archivos, ejecuta `npm`, lanza el servidor de desarrollo, hace commits | Incluido en tu plan de pago, mismo pool de uso que el chat | Desarrollo diario, refactores, tareas que tocan varios archivos                     |
| **B · Escritorio con carpeta conectada** | Escribo los archivos directamente en tu carpeta local; tú haces commit y push                           | Incluido                                                   | Es el flujo que ya usas en RefuelControl. Bueno para entregas de archivos completos |
| **C · Chat web + Project**               | Te entrego archivos completos y los pegas tú                                                            | Incluido                                                   | Diseño, documentación, dudas puntuales, revisión de código                          |

**Corrección a la conversación con Gemini:** el modo A no requiere API de pago ni agentes de terceros tipo Aider o Cline. Claude Code se autentica con la misma cuenta del plan. Ojo con un detalle: si tienes una variable de entorno `ANTHROPIC_API_KEY` puesta en el sistema, Claude Code la usará y te facturará por token en vez de consumir la suscripción. Bórrala antes de empezar.

Lo que **no** es posible: trabajar solo por las noches sin ti delante. Las sesiones son reactivas y necesitan que alguien lance la instrucción. La alternativa realista es preparar la tarea la noche anterior en `TAREAS.md` y ejecutarla del tirón cuando te sientes.

### 4.2 Qué necesito de ti en cada sesión

1. **Acceso a los archivos** por el modo A, B o C.
2. **Los documentos de contexto** actualizados (DOC 00, 04, 05, 06, 08, 13 como mínimo).
3. **Datos reales de prueba**: una plantilla ficticia de 18–20 jugadores con apodos y dorsales.
4. **Ejemplos de los documentos que la app tendrá que leer** en fase 2: una ficha de alineación real en PDF o foto, y un acta de partido de la federación.
5. **Salida de errores literal** cuando algo falle: consola del navegador, terminal o captura. Un «no va» no permite diagnosticar.

### 4.3 Qué no debes darme nunca

Claves de Supabase (`service_role`), secretos de OAuth de Google, tokens de Netlify o de GitHub, contraseñas. Todo eso vive en `.env.local` (ignorado por Git) y en las variables de entorno de Netlify. La `anon key` de Supabase es pública por diseño y sí puede aparecer en el código del frontend, siempre con RLS activo detrás.

### 4.4 Servicios externos a dar de alta

| Servicio                 | Para qué                                                    | Coste             | Ojo con                                                                                                                                                             |
| :----------------------- | :---------------------------------------------------------- | :---------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **GitHub**               | Repositorio y despliegue continuo                           | Gratis            | Decide público o privado antes del primer commit                                                                                                                    |
| **Netlify**              | Hosting del frontend, variables de entorno, deploy previews | Gratis            | El _deploy preview_ de cada rama sirve para probar en el móvil sin tocar producción                                                                                 |
| **Supabase** ✅          | PostgreSQL, autenticación, RLS, Storage, Edge Functions     | Gratis            | Dado de alta: proyecto **GavetaStats**, región West EU (Irlanda). El plan gratuito pausa proyectos tras inactividad prolongada; con uso semanal real no es problema |
| **Google Cloud Console** | Cliente OAuth para el login con Google                      | Gratis            | Paso que se olvida siempre. Hay que registrar los _redirect URI_ de Supabase, de Netlify y de `localhost`                                                           |
| **Node.js LTS + npm**    | Entorno de desarrollo local                                 | Gratis            | —                                                                                                                                                                   |
| **VS Code + Git**        | Editor y control de versiones                               | Gratis            | —                                                                                                                                                                   |
| **Dominio propio**       | `loquesea.app` en vez del subdominio de Netlify             | **≈ 10–15 €/año** | Única partida que rompe el 0 €. El subdominio de Netlify funciona igual de bien para el MVP                                                                         |

### 4.5 Herramientas de apoyo

| Herramienta                      | Uso                                                                                               | Coste         |
| :------------------------------- | :------------------------------------------------------------------------------------------------ | :------------ |
| Lighthouse (integrado en Chrome) | Auditoría de PWA, rendimiento y accesibilidad                                                     | Gratis        |
| axe DevTools (extensión)         | Detección de fallos WCAG en cada pantalla                                                         | Gratis        |
| Excalidraw                       | Bocetos rápidos de pantalla antes de picar código                                                 | Gratis        |
| Dispositivos físicos             | Un Android y un iPhone. La instalación de PWA y el modo offline se comportan distinto en cada uno | Ya los tienes |

---

## 5. Método de sesiones

### 5.1 Regla de oro

Una tarea del DOC 08 se resuelve en una conversación. Si al planificarla ves que no cabe, pártela en subtareas antes de empezar. Nunca se cierra una sesión con código a medias sin traspaso escrito.

### 5.2 Plantilla de arranque

Pega esto al abrir una sesión nueva:

```
TAREA: [ID y título exactos del DOC 08]
CONTEXTO ADJUNTO: DOC 00, 04, 05, 06, 08, 13
ARCHIVOS IMPLICADOS: [rutas]
ESTADO ACTUAL: [qué funciona ya]
CRITERIO DE HECHO: [cuándo doy la tarea por terminada]
NO TOQUES: [archivos o módulos fuera del alcance]
```

### 5.3 Plantilla de cierre (`HANDOFF.md`)

Al terminar, el DOC 13 se sobrescribe con esto:

```
## Sesión [fecha] — Tarea [ID]
- HECHO: [lista de cambios reales, con archivos]
- PENDIENTE DE LA TAREA: [lo que quedó fuera y por qué]
- DEUDA TÉCNICA GENERADA: [atajos que habrá que pagar]
- SIGUIENTE TAREA SUGERIDA: [ID]
- DECISIONES TOMADAS: [las que haya que subir al DOC 04 o 05]
- COMANDOS PARA VERIFICAR: [npm run dev, pasos de prueba]
```

### 5.4 Economía de contexto

- No pegues el proyecto entero. Adjunta solo los archivos que la tarea toca.
- Prefiere edición sobre reescritura completa de archivos.
- Si un dato ya está en un documento del _Knowledge_, no lo repitas en el chat.
- Cierra la conversación cuando la tarea termine. Reutilizar un hilo largo para una tarea nueva desperdicia ventana.

---

## 6. Definición de «hecho»

Una tarea se considera terminada cuando cumple las cinco condiciones:

1. Funciona en `localhost` sobre datos reales de prueba.
2. No lanza errores ni avisos en la consola del navegador.
3. Pasa la revisión de accesibilidad del DOC 02 §5 aplicable a esa pantalla.
4. Funciona en Android y en iPhone si afecta a una vista de uso a pie de campo.
5. El traspaso del DOC 13 está escrito y el commit hecho.

---

## 7. Orden de construcción

```
FASE 0 · Documentación        DOC 00→05 hechos → pendientes DOC 06, 07 y 08
FASE 1 · Cimientos            Repo + Vite/PWA + Supabase + login Google + error_logs
FASE 2 · Meter datos (P1)     Club → Equipo → Jugadores → Competición → Calendario
                              → Convocatoria → PARTIDO EN DIRECTO → Post-partido
FASE 3 · Concurrencia         Invitaciones, roles, prueba con los tres alphatesters
FASE 4 · Ver datos (P1)       Dashboards, ficha de jugador, informe de partido
FASE 5 · Capa visual          Sistema de diseño, color de equipo, identidad
FASE 6 · Post-deadline        IA de voz, OCR, scraping, notificaciones, multiclub
```

El módulo de registro de errores (DOC 09) es transversal: nace en la Fase 1 y acompaña a todas las demás.
