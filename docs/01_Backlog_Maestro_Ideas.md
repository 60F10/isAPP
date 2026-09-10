# DOC 01 — Backlog maestro de ideas

> **Versión:** 1.0 — 08/09/2026
> **Fuente:** conversación completa con Gemini + documento `Proyecto_App_Futbol_Cadete.md` + aportaciones de esta sesión.
> **Regla:** aquí no se descarta nada. Una idea fuera de alcance se marca como `FUTURO`, jamás se borra.

---

## Cómo leer este documento

| Campo      | Valores                                                                                |
| :--------- | :------------------------------------------------------------------------------------- |
| **ID**     | `Ex-nn`. Referencia estable. El DOC 08 (`TAREAS.md`) apunta a estos IDs                |
| **Origen** | `R` idea tuya · `G` propuesta de Gemini · `R+G` idea tuya refinada por Gemini          |
| **Fase**   | `MVP` obligatorio para el 25/10 · `V1.1` corto plazo tras la liga · `FUTURO` sin fecha |
| **Módulo** | Módulo funcional al que pertenece (P3 del DOC 00: módulos independientes)              |

Leyenda de estado: `📋` definido · `❓` requiere decisión (ver DOC 03) · `🔒` bloqueado por otra idea.

---

## E1 · Identidad, acceso y roles — módulo `Auth`

| ID    | Idea                                                                                                                           | Origen | Fase   | Est. |
| :---- | :----------------------------------------------------------------------------------------------------------------------------- | :----- | :----- | :--- |
| E1-01 | Login nativo con cuenta de Google                                                                                              | R      | MVP    | 📋   |
| E1-02 | Rol **Admin**: creador del sistema, mantenimiento técnico, acceso a logs                                                       | R      | MVP    | 📋   |
| E1-03 | Rol **Entrenador**: dueño del equipo, acceso total, crea jugadores, asigna roles, configura competición, valida datos          | R      | MVP    | 📋   |
| E1-04 | Rol **Delegado**: permisos que le asigna el entrenador al añadirlo                                                             | R      | MVP    | 📋   |
| E1-05 | Rol **Ojeador/a**: permisos editables por el entrenador, puede apuntar o modificar datos                                       | R      | MVP    | 📋   |
| E1-06 | Rol **Invitado/Espectador**: solo lectura, o sugerir datos si el entrenador habilita el modo colaborativo                      | R      | MVP    | 📋   |
| E1-07 | Permisos **granulares** por usuario, no solo por rol (ej. «solo puede añadir eventos durante el partido, no borrar jugadores») | R+G    | MVP    | ❓   |
| E1-08 | Sistema de **invitaciones**: el entrenador invita a delegado, ojeadora y espectadores                                          | G      | MVP    | 📋   |
| E1-09 | Separación estricta entre `User` (cuenta real, +18) y `Player` (entidad deportiva sin cuenta)                                  | R+G    | MVP    | 📋   |
| E1-10 | Los jugadores puedan identificarse y ver las estadísticas que el entrenador les habilite                                       | R      | FUTURO | ❓   |
| E1-11 | Arquitectura multitenant desde el día uno: cada club ve solo sus datos vía RLS                                                 | G      | MVP    | 📋   |

---

## E2 · Estructura del club — módulo `Core`

| ID    | Idea                                                                                                                                                              | Origen | Fase   | Est. |
| :---- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----- | :----- | :--- |
| E2-01 | CRUD completo de **Club**                                                                                                                                         | R      | MVP    | 📋   |
| E2-02 | CRUD completo de **Equipo** (categoría, temporada)                                                                                                                | R      | MVP    | 📋   |
| E2-03 | CRUD completo de **Jugadores** de la plantilla                                                                                                                    | R      | MVP    | 📋   |
| E2-04 | Dorsal asignable y **cambiable** por el entrenador                                                                                                                | R      | MVP    | 📋   |
| E2-05 | Identificación del jugador por dorsal, apodo o nombre si lo autoriza                                                                                              | R      | MVP    | 📋   |
| E2-06 | Posición por defecto del jugador, independiente de la posición que ocupe en cada partido                                                                          | R      | MVP    | 📋   |
| E2-07 | Un club puede tener varios equipos; un usuario puede estar en varios equipos                                                                                      | R      | V1.1   | ❓   |
| E2-08 | Color corporativo del equipo almacenado en base de datos (`primary_color`)                                                                                        | R+G    | V1.1   | 📋   |
| E2-09 | Importar jugadores desde una base de datos pública de la federación, si existe                                                                                    | R      | FUTURO | ❓   |
| E2-10 | **Equipos rivales como entidad** sin plantilla: Isaac da de alta todos los equipos de su liga, vacíos. Campo que distingue equipo gestionado de equipo referencia | R      | MVP    | 📋   |
| E2-11 | **Tabla clasificatoria de la liga** calculada con los partidos y resultados introducidos en la app                                                                | R      | V1.1   | 📋   |
| E2-12 | Sincronización de resultados entre clubes cuando la app la use más gente, para que la clasificación se rellene sola                                               | R      | FUTURO | 📋   |
| E2-13 | **Otras figuras del club** además del entrenador: presidente, secretario, coordinador…                                                                            | R      | V1.1   | ❓   |

---

## E3 · Competición y reglamento — módulo `Rules`

> El objetivo es que la app sirva a cualquier categoría, de alevines a regional. Nada de reglas cableadas en el código.

| ID    | Idea                                                                                 | Origen | Fase | Est. |
| :---- | :----------------------------------------------------------------------------------- | :----- | :--- | :--- |
| E3-01 | CRUD de **Competición** con su bloque de reglas configurable                         | R      | MVP  | 📋   |
| E3-02 | Duración de cada parte y del descanso · **cadete: 2×40 + 15**                        | R+G    | MVP  | ✅   |
| E3-03 | Número de partes (2 tiempos, 4 cuartos en categorías menores)                        | G      | MVP  | 📋   |
| E3-04 | Tipo de sustituciones: volantes o fijas · **cadete: fijas**                          | R+G    | MVP  | ✅   |
| E3-05 | Máximo de convocados, configurable por competición **y** por equipo · **cadete: 18** | R      | MVP  | ✅   |
| E3-06 | Máximo de sustituciones por partido · **cadete: 5**                                  | G      | MVP  | ✅   |
| E3-07 | Ciclo de amarillas con sanción automática · **cadete: 5 amarillas = 1 partido**      | G      | MVP  | ✅   |
| E3-08 | Reloj corrido o a tiempo parado · **cadete: corrido**                                | G      | MVP  | ✅   |
| E3-09 | Número de jugadores en campo (11, 7, 8 según categoría)                              | G      | V1.1 | 📋   |

---

## E4 · Calendario y agenda — módulo `Agenda`

| ID    | Idea                                                                                                     | Origen | Fase   | Est. |
| :---- | :------------------------------------------------------------------------------------------------------- | :----- | :----- | :--- |
| E4-01 | Programación de días de entrenamiento                                                                    | R      | MVP    | 📋   |
| E4-02 | Programación de partidos con rival, fecha y hora                                                         | R      | MVP    | 📋   |
| E4-03 | Ubicación del evento: estadio y zona                                                                     | R      | MVP    | 📋   |
| E4-04 | Vista de calendario del equipo                                                                           | R      | MVP    | 📋   |
| E4-05 | Exportar eventos como archivo `.ics`                                                                     | R+G    | FUTURO | 📋   |
| E4-06 | Integración con Google Calendar para entrenadores y jugadores                                            | R      | FUTURO | 📋   |
| E4-07 | Notificaciones de avisos para aficionados sobre próximos partidos                                        | R      | FUTURO | 📋   |
| E4-08 | Notificación con **acceso directo a la pantalla de partido** en las horas previas y durante el encuentro | R      | V1.1   | 📋   |
| E4-09 | Notificación al terminar el partido recordando rellenar el post-partido                                  | R      | V1.1   | 📋   |

---

## E5 · Entrenamientos — módulo `Training`

| ID    | Idea                                                         | Origen | Fase | Est. |
| :---- | :----------------------------------------------------------- | :----- | :--- | :--- |
| E5-01 | Crear sesión de entrenamiento asociada al calendario         | R      | MVP  | 📋   |
| E5-02 | Pasar lista en tiempo real: **Presente / Ausente / Retraso** | R      | MVP  | 📋   |
| E5-03 | Observaciones individuales por jugador en cada entrenamiento | R      | MVP  | 📋   |
| E5-04 | Observaciones globales del equipo por entrenamiento          | R      | MVP  | 📋   |
| E5-05 | Historial de asistencia consultable por jugador y por sesión | R      | MVP  | 📋   |
| E5-06 | Cruce de asistencia con minutos jugados en partido           | —      | V1.1 | 📋   |

---

## E6 · Disciplina y disponibilidad — módulo `Discipline`

| ID    | Idea                                                                                                                               | Origen  | Fase | Est.     |
| :---- | :--------------------------------------------------------------------------------------------------------------------------------- | :------ | :--- | :------- |
| E6-01 | Registro de tarjetas amarillas y rojas                                                                                             | R+G     | MVP  | 📋       |
| E6-02 | Ciclos de acumulación de amarillas con sanción automática                                                                          | R+G     | V1.1 | 🔒 E3-07 |
| E6-03 | **Arrestos** y decisiones técnicas del entrenador                                                                                  | R       | MVP  | 📋       |
| E6-04 | Estado de disponibilidad del jugador, que condiciona la convocatoria                                                               | R+G     | MVP  | 📋       |
| E6-05 | Historial disciplinario por jugador y temporada                                                                                    | —       | V1.1 | 📋       |
| E6-06 | **Sanción por roja de duración variable (1 a N partidos)**, introducida a mano cuando el comité resuelve, días después del partido | R+Isaac | MVP  | 📋       |

---

## E7 · Convocatoria y alineación — módulo `Lineup`

| ID    | Idea                                                                            | Origen | Fase   | Est.     |
| :---- | :------------------------------------------------------------------------------ | :----- | :----- | :------- |
| E7-01 | Plantilla segmentada en **Titulares / Suplentes / No convocados**               | R      | MVP    | 📋       |
| E7-02 | Entrada manual ultrarrápida de la alineación antes del partido                  | R+G    | MVP    | 📋       |
| E7-03 | Colocación gráfica de jugadores sobre el campo                                  | R      | V1.1   | ❓       |
| E7-04 | Sistema táctico del partido (4-4-2, 4-3-3…)                                     | —      | V1.1   | 📋       |
| E7-05 | Bloqueo de convocatoria si el jugador está sancionado o arrestado               | R      | MVP    | 🔒 E6-04 |
| E7-06 | Aviso si la convocatoria supera el máximo configurado                           | R      | MVP    | 🔒 E3-05 |
| E7-07 | Dictar la alineación por voz o texto y que la app la interprete                 | R      | FUTURO | 📋       |
| E7-08 | Subir la ficha de alineación en PDF o foto y que un OCR coloque a los jugadores | R+G    | FUTURO | 📋       |

---

## E8 · Partido en directo — módulo `MatchEngine` ⭐ NÚCLEO DEL MVP

| ID    | Idea                                                                                                                                                             | Origen | Fase   | Est.     |
| :---- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----- | :----- | :------- |
| E8-01 | **Cronómetro interno** de la aplicación, arrancado con un botón grande de «Iniciar partido»                                                                      | R+G    | MVP    | 📋       |
| E8-02 | Cada evento captura automáticamente el minuto y segundo exacto del reloj interno                                                                                 | R+G    | MVP    | 📋       |
| E8-03 | Interfaz _tap-friendly_: botones grandes, cero teclado, uso a una mano                                                                                           | R+G    | MVP    | 📋       |
| E8-04 | Flujo rápido encadenado: **Evento → Jugador → Relacionado** (ej. Gol → Goleador → ¿Asistencia? → Asistente)                                                      | R+G    | MVP    | 📋       |
| E8-05 | Vista de la alineación en pantalla durante el partido                                                                                                            | R      | MVP    | 📋       |
| E8-06 | **Cambio de posición dinámico en directo**: tocar un jugador y reasignar su posición aunque tenga una por defecto (portero expulsado → jugador de campo al arco) | R+G    | MVP    | 📋       |
| E8-07 | Registro de sustituciones con múltiples intervalos por jugador (necesario si hay cambios volantes)                                                               | R+G    | MVP    | 🔒 E3-04 |
| E8-08 | Razón de la sustitución: táctica, lesión, cansancio                                                                                                              | G      | V1.1   | 📋       |
| E8-09 | Añadir un evento **con posterioridad** al momento en que ocurrió (ej. la falta se apunta después del gol)                                                        | R      | MVP    | 📋       |
| E8-10 | Corrección o borrado de un evento recién metido, sin salir del directo                                                                                           | R      | MVP    | 📋       |
| E8-11 | Comentarios libres durante el partido, generales o asociados a un jugador                                                                                        | R      | MVP    | 📋       |
| E8-12 | Arranque del cronómetro detectando por micrófono el pitido del árbitro                                                                                           | R      | FUTURO | 📋       |
| E8-13 | Gestión de partido **suspendido** en el minuto X, marcándolo como incompleto para que no distorsione las medias de temporada                                     | R+G    | MVP    | ❓       |
| E8-14 | Indicador visible de conexión y de eventos pendientes de sincronizar                                                                                             | —      | MVP    | 📋       |

### E8-M · Métricas registrables en directo

| ID     | Métrica                                                                        | Origen | Fase                                                                              |
| :----- | :----------------------------------------------------------------------------- | :----- | :-------------------------------------------------------------------------------- |
| E8-M01 | Minutos jugados por jugador                                                    | R      | MVP                                                                               |
| E8-M02 | Titular / suplente / no convocado                                              | R      | MVP                                                                               |
| E8-M03 | Goles                                                                          | R      | MVP                                                                               |
| E8-M04 | Asistencias                                                                    | R      | MVP                                                                               |
| E8-M05 | Faltas cometidas                                                               | R      | MVP                                                                               |
| E8-M06 | Faltas recibidas (a favor)                                                     | R      | MVP                                                                               |
| E8-M07 | Córners a favor                                                                | R      | MVP                                                                               |
| E8-M08 | Córners en contra                                                              | R+G    | MVP                                                                               |
| E8-M09 | Tarjetas amarillas y rojas                                                     | G      | MVP                                                                               |
| E8-M10 | Pases dados (destino opcional, activable) · ⚠️ registro necesariamente parcial | R      | MVP                                                                               |
| E8-M11 | Comentarios de partido y por jugador                                           | R      | MVP                                                                               |
| E8-M12 | Tiros a puerta                                                                 | G      | V1.1                                                                              |
| E8-M13 | Tiros fuera                                                                    | G      | V1.1                                                                              |
| E8-M14 | Fueras de juego                                                                | G      | V1.1                                                                              |
| E8-M15 | Recuperaciones de balón                                                        | G      | V1.1                                                                              |
| E8-M16 | Pérdidas de balón, distinguiendo campo propio                                  | G      | V1.1                                                                              |
| E8-M17 | Valoración del jugador de 1 a 5                                                | G      | V1.1                                                                              |
| E8-M18 | MVP del partido                                                                | G      | V1.1                                                                              |
| E8-M19 | Mapa de calor con posición de la acción                                        | G      | **DESCARTADO para MVP** — multiplica la fricción de registro. Revisable en FUTURO |

> **Punto abierto:** las faltas en contra son ejecutadas por el rival, así que no cuelgan de ningún jugador propio. Hay que decidir si se registran a nivel de partido o si se asocian al jugador que la recibe. Ver DOC 03.

---

## E9 · Concurrencia, conflictos y trazabilidad — módulo `Sync`

| ID    | Idea                                                                                                                                                                                                                          | Origen | Fase | Est. |
| :---- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----- | :--- | :--- |
| E9-01 | Trazabilidad silenciosa en todo evento: `created_by`, `created_at`, `match_id`                                                                                                                                                | R+G    | MVP  | 📋   |
| E9-02 | Registro de cambios: quién editó qué y cuándo                                                                                                                                                                                 | R      | MVP  | 📋   |
| E9-03 | Varios dispositivos alrededor del campo registrando a la vez (banquillo y grada)                                                                                                                                              | R      | MVP  | 📋   |
| E9-04 | Estado del evento: `pending` / `approved` / `rejected` según el rol que lo introduce                                                                                                                                          | R+G    | MVP  | 📋   |
| E9-05 | **Peso por origen** (`source_weight`): el dato del delegado pesa más que el de la grada hasta validarse                                                                                                                       | G      | V1.1 | ❓   |
| E9-06 | Cada usuario con permiso de escritura ve **su propio historial** de aportaciones y las edita o borra                                                                                                                          | R      | MVP  | 📋   |
| E9-07 | **Modo offline**: guardar en el dispositivo y sincronizar solo al recuperar cobertura                                                                                                                                         | R+G    | MVP  | 📋   |
| E9-08 | Detección de eventos duplicados entre dispositivos (mismo tipo, mismo jugador, ventana temporal cercana)                                                                                                                      | R+G    | MVP  | ❓   |
| E9-09 | **Cobertura declarada**: cada anotador declara al entrar al directo qué está siguiendo (todo el equipo, un jugador, solo goles y tarjetas) y desde qué minuto. Reparto blando: nadie queda bloqueado para registrar otra cosa | R      | MVP  | 📋   |

---

## E10 · Post-partido y validación — módulo `Review`

| ID     | Idea                                                                                           | Origen | Fase | Est. |
| :----- | :--------------------------------------------------------------------------------------------- | :----- | :--- | :--- |
| E10-01 | Pantalla de post-partido como paso obligatorio del flujo                                       | R      | MVP  | 📋   |
| E10-02 | Panel de resolución de discordancias: el entrenador revisa, aprueba o rechaza eventos cruzados | R      | MVP  | 📋   |
| E10-03 | Los cambios de posición registrados por espectadores requieren aprobación del entrenador       | R      | MVP  | 📋   |
| E10-04 | Cierre del partido con resultado final y comentarios generales                                 | R      | MVP  | 📋   |
| E10-05 | Valoración de jugadores y elección de MVP en el cierre                                         | G      | V1.1 | 📋   |

---

## E11 · Estadísticas y visualización — módulo `Stats`

> **Todo este bloque llega después del bloque de entrada de datos** (principio P1 del DOC 00).

| ID     | Idea                                                                                                                                                          | Origen | Fase   | Est. |
| :----- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ | :----- | :----- | :--- |
| E11-01 | Dashboard de equipo con agregados de temporada                                                                                                                | R+G    | MVP    | 📋   |
| E11-02 | Ficha estadística por jugador: minutos, goles, participación, evolución                                                                                       | R+G    | MVP    | 📋   |
| E11-03 | Informe de partido: cronología de eventos y totales                                                                                                           | R      | MVP    | 📋   |
| E11-04 | Gráficas con Recharts o Chart.js                                                                                                                              | G      | MVP    | 📋   |
| E11-05 | **Filtro por origen del dato**: ver estadísticas solo del entrenador, solo de la grada, o la media de todos los roles                                         | R      | V1.1   | 📋   |
| E11-06 | Comparador entre jugadores                                                                                                                                    | —      | V1.1   | 📋   |
| E11-07 | Vista de estadísticas para invitados, con el alcance que decida el entrenador                                                                                 | R      | V1.1   | ❓   |
| E11-08 | Análisis de momentos del partido: en qué franjas de minuto el equipo flojea o aprieta                                                                         | G      | V1.1   | 📋   |
| E11-09 | Exportar estadísticas a CSV o PDF                                                                                                                             | —      | FUTURO | 📋   |
| E11-10 | **Índice de fiabilidad junto a cada métrica**, calculado desde la cobertura declarada. Formato «Fiabilidad media · 56 %», distinguible sin depender del color | R      | MVP    | 📋   |
| E11-11 | Aviso explícito cuando una métrica tiene fiabilidad baja y se está usando para comparar jugadores                                                             | R      | MVP    | 📋   |

---

## E12 · Observabilidad y errores — módulo `Logging`

> Prioridad transversal. Nace en la Fase 1 y acompaña a todo el desarrollo.

| ID     | Idea                                                                        | Origen | Fase | Est. |
| :----- | :-------------------------------------------------------------------------- | :----- | :--- | :--- |
| E12-01 | Tabla `error_logs` en base de datos                                         | R+G    | MVP  | 📋   |
| E12-02 | Capturador global de fallos (_Error Boundary_) en el frontend               | R+G    | MVP  | 📋   |
| E12-03 | Cada fallo registra traza técnica, ID de usuario, vista, dispositivo y hora | R+G    | MVP  | 📋   |
| E12-04 | El registro ocurre en silencio, sin interrumpir al usuario a pie de campo   | R      | MVP  | 📋   |
| E12-05 | Vista de administración para consultar los logs                             | R      | MVP  | 📋   |
| E12-06 | Registro de fallos de sincronización offline, no solo de _crashes_          | —      | MVP  | 📋   |

---

## E13 · Plataforma, PWA y offline — módulo `Platform`

| ID     | Idea                                                      | Origen | Fase | Est. |
| :----- | :-------------------------------------------------------- | :----- | :--- | :--- |
| E13-01 | PWA instalable desde el navegador                         | R      | MVP  | 📋   |
| E13-02 | Responsive y funcional en iOS, Android, Mac y Windows     | R      | MVP  | 📋   |
| E13-03 | Frontend en React con Vite y `vite-plugin-pwa`            | R+G    | MVP  | 📋   |
| E13-04 | Backend, base de datos y autenticación en Supabase        | G      | MVP  | 📋   |
| E13-05 | Hosting en Netlify con despliegue automático desde GitHub | R+G    | MVP  | 📋   |
| E13-06 | Persistencia local con IndexedDB para el modo offline     | G      | MVP  | 📋   |
| E13-07 | Dominio propio separado                                   | R      | V1.1 | ❓   |
| E13-08 | Arquitectura de módulos independientes y sustituibles     | R      | MVP  | 📋   |
| E13-09 | Coste cero: todo sobre planes gratuitos                   | R      | MVP  | 📋   |

---

## E14 · Diseño, identidad y personalización — módulo `Design`

| ID     | Idea                                                                                                                                                               | Origen | Fase   | Est. |
| :----- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----- | :----- | :--- |
| E14-01 | Interfaz visualmente limpia                                                                                                                                        | R      | V1.1   | 📋   |
| E14-02 | Nombre de la aplicación (propuestas de Gemini: Míster.app, StatPitch, Pizarra.io, DatoOnce)                                                                        | R+G    | V1.1   | ❓   |
| E14-03 | Logo SVG monocolor y abstracto (hexágono cuyos lados forman barras ascendentes; libreta táctica con nodos de datos)                                                | G      | V1.1   | ❓   |
| E14-04 | Color configurable **por usuario**, con un valor por defecto                                                                                                       | R      | V1.1   | 📋   |
| E14-05 | La app se pinta con los colores del equipo al que sigues, inyectando el hexadecimal como variable CSS `--color-team`                                               | R+G    | V1.1   | 📋   |
| E14-06 | Módulo selector de **estilo visual** que solo afecta a la capa de presentación: Clean/Minimalista, Windows Aero, Flat, Material/Fluent, Glassmorphism, Neumorphism | R      | FUTURO | 📋   |
| E14-07 | Contraste alto pensado para uso al sol en un campo de fútbol                                                                                                       | —      | MVP    | 📋   |

---

## E15 · RGPD y legal — módulo `Legal`

| ID     | Idea                                                                                     | Origen | Fase | Est. |
| :----- | :--------------------------------------------------------------------------------------- | :----- | :--- | :--- |
| E15-01 | Solo mayores de 18 años tienen cuenta de usuario                                         | R      | MVP  | 📋   |
| E15-02 | Los cadetes existen como entidades `Player` sin cuenta, identificados por apodo y dorsal | R+G    | MVP  | 📋   |
| E15-03 | Cero datos personales sensibles de menores: sin DNI, sin fotos reales, sin datos médicos | R+G    | MVP  | 📋   |
| E15-04 | La razón de sustitución por lesión es dato de salud: tratarla con cuidado o suprimirla   | G      | MVP  | ❓   |
| E15-05 | Nombre real del jugador solo con autorización expresa                                    | R      | MVP  | 📋   |
| E15-06 | Política de privacidad y aviso legal publicados                                          | —      | V1.1 | 📋   |

---

## E16 · Inteligencia artificial — módulo `AI` (FUTURO)

| ID     | Idea                                                                                                  | Origen | Fase   |
| :----- | :---------------------------------------------------------------------------------------------------- | :----- | :----- |
| E16-01 | Relatar un evento hablando a la app y que la IA lo interprete y guarde en los campos correspondientes | R      | FUTURO |
| E16-02 | Igual pero por texto libre post-partido                                                               | R      | FUTURO |
| E16-03 | Implementación mediante Edge Function que llama a la API de la IA y devuelve JSON estructurado        | G      | FUTURO |
| E16-04 | OCR de la ficha de alineación en PDF o foto                                                           | R+G    | FUTURO |

---

## E17 · Integraciones externas — módulo `Integrations` (FUTURO)

| ID     | Idea                                                                                                                                                                                                 | Origen | Fase   |
| :----- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----- | :----- |
| E17-01 | Localizar un portal con datos de las ligas de Tenerife o del fútbol nacional                                                                                                                         | R      | FUTURO |
| E17-02 | Web scraping de portales federativos para tablas y clasificaciones                                                                                                                                   | R+G    | FUTURO |
| E17-03 | **Sincronización multiclub (crowdsourcing global)**: cruzar datos recogidos por aficionados de distintos clubes de la misma categoría. En todo partido hay dos equipos, un entrenador y espectadores | R      | FUTURO |
| E17-04 | Ecosistema de notificaciones para aficionados                                                                                                                                                        | R      | FUTURO |
| E17-05 | **Cada padre sigue a su hijo**: reparto natural de la cobertura entre los espectadores, de forma que métricas costosas como los pases sí lleguen a registrarse completas                             | R      | FUTURO |

---

## E18 · Producto y negocio — módulo `Business` (FUTURO)

| ID     | Idea                                                      | Origen | Fase   |
| :----- | :-------------------------------------------------------- | :----- | :----- |
| E18-01 | Convertir la app en SaaS vendible a otros clubes          | R      | FUTURO |
| E18-02 | Multitenancy real vía RLS, ya prevista en la arquitectura | G      | FUTURO |
| E18-03 | Pasarela de pagos y suscripción mensual                   | G      | FUTURO |
| E18-04 | Modelo _premium_ para las funciones de IA                 | G      | FUTURO |

---

## Resumen de alcance

| Fase            | Épicas implicadas                    | Ideas |
| :-------------- | :----------------------------------- | :---- |
| **MVP (25/10)** | E1–E13, E15 parcial                  | 78    |
| **V1.1**        | Refinamiento de E3–E11, E14 completo | 31    |
| **FUTURO**      | E16, E17, E18 y extensiones          | 24    |

**Ruta crítica hacia el 25 de octubre:**
`E13 (plataforma) → E1 (auth) → E12 (logs) → E2 (club/equipo/jugadores) → E3 (reglas) → E4 (calendario) → E7 (convocatoria) → E8 (directo) → E9 (offline y trazabilidad) → E10 (post-partido) → E11 (estadísticas)`

Todo lo demás cede si la ruta crítica peligra.
