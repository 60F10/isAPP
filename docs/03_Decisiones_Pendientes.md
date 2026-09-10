# DOC 03 — Decisiones pendientes

> **Versión:** 1.0 — 08/09/2026
> **Para qué sirve:** cada decisión de esta lista bloquea un documento posterior. Respóndelas y los DOC 04 a 08 salen del tirón, sin suposiciones mías.
> **Cómo usarlo:** responde en la columna vacía o pega las respuestas en la siguiente sesión. Las marcadas 🔴 bloquean el modelo de datos, así que van primero.

---

## A · Reglamento de la competición → ✅ RESUELTO (Isaac, 09/09/2026)

| #     | Decisión        | Respuesta de Isaac                                                                                                | Consecuencia técnica                                                                                                                                                                                                             |
| :---- | :-------------- | :---------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1 ✅ | Tipo de cambios | **Fijos.** El jugador sustituido no vuelve a entrar                                                               | Aun así se modela por **intervalos** (`entrada`/`salida` en tabla propia), con una validación que impide la reentrada si la competición es de cambios fijos. Así la app sirve a categorías con cambios volantes sin rehacer nada |
| A2 ✅ | Duración        | **2 partes de 40 min + 15 de descanso**                                                                           | Los 90 min que figuraban como valor por defecto en el documento inicial quedan corregidos a **80**. El total sale de `nº partes × duración`, nunca de una constante                                                              |
| A3 ✅ | Cronómetro      | **Reloj corrido**, no se detiene en las interrupciones                                                            | Simplifica el motor: el reloj no necesita pausas automáticas. Se mantiene una pausa manual solo para el descanso y para el descuento                                                                                             |
| A4 ✅ | Sanciones       | **5 amarillas = 1 partido.** Roja = expulsión en el encuentro + sanción variable de 1 a N partidos según gravedad | La sanción por roja **no se puede automatizar**: el número de partidos lo dicta el comité de competición. La tabla `sanctions` necesita un campo `partidos_sancion` editable a mano                                              |
| A5 ✅ | Convocatoria    | **Máximo 18 convocados y 5 cambios por partido**                                                                  | Ambos como reglas de la competición, editables. Validación en la pantalla de convocatoria (A11) y en el registro de cambios del directo (A12)                                                                                    |

**Lo que estas respuestas desbloquean:** el cálculo de minutos jugados, la validación de convocatoria, el contador de cambios en el directo y la estructura de la tabla de sanciones. Con esto, el DOC 04 y el DOC 05 ya se pueden escribir.

**Punto nuevo que abren:** la sanción por roja es variable y la decide el comité días después del partido. Hace falta una pantalla o un campo donde Isaac introduzca a posteriori los partidos de sanción. Va al backlog como **E6-06**.

---

## B · Eventos y métricas → bloquea DOC 05

| #     | Decisión                                | Por qué importa                                                                                                                                                                                                                                                                   | Mi recomendación                                                                                                                                                                           |
| :---- | :-------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1 ✅ | **Los pases**                           | **Resuelto:** contador de pases dados en el MVP. El evento `pase` se modela con `player_from` obligatorio y `player_to` **nullable**, y un ajuste activa o desactiva el segundo paso. Los pases recibidos se derivan del mismo dato cuando el destino esté relleno, sin migración | ⚠️ **Riesgo asumido:** 400–500 pases por partido hacen imposible el registro completo. Decidir en DOC 04 si se asume como dato parcial o si se restringe a _pases clave_                   |
| B2 ✅ | **Faltas en contra**                    | **Resuelto:** dos eventos distintos, `falta_cometida` (jugador propio obligatorio) y `falta_recibida` (jugador propio opcional)                                                                                                                                                   | Ambas suman a nivel de partido y de jugador. El rival nunca necesita jugadores para que el dato cuadre                                                                                     |
| B3 ✅ | **Datos de jugadores del equipo rival** | **Resuelto:** el rival es una **entidad Equipo** reutilizable, sin jugadores. Isaac da de alta todos los equipos de su liga, vacíos. Solo se registran goles y córners del rival a nivel de equipo                                                                                | La tabla `teams` necesita un campo que distinga equipo **gestionado** (con plantilla, permisos y usuarios) de equipo **referencia** (solo nombre y escudo). Absorbe también la decisión B4 |
| B5 ✅ | **Entidad Temporada**                   | **Resuelto: sí, desde el día uno.** Necesaria para tener registros históricos                                                                                                                                                                                                     | Permite comparar años y archivar plantillas sin migración posterior                                                                                                                        |
| B6 ✅ | **Partido suspendido**                  | **Resuelto:** estado `suspendido` + minuto de suspensión                                                                                                                                                                                                                          | Excluido de las medias por defecto, con opción de incluirlo en los filtros                                                                                                                 |

---

## C · Concurrencia y validación → bloquea DOC 05 y DOC 06

| #     | Decisión                                   | Por qué importa                                                                                                                | Mi recomendación                                                                                                                                                                                                                  |
| :---- | :----------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1 ✅ | **Espectadores aportando datos en el MVP** | **Resuelto: sí.** Cuatro personas anotando a la vez en los amistosos: Isaac, tú, tu colega y el subdelegado                    | El campo `status` nace desde el primer día y el panel de discordancias (A13) entra en el MVP, no en V1.1. Sube el peso de E9 y E12 en la ruta crítica: el registro de errores y la cola de sincronización dejan de ser opcionales |
| C2 ✅ | **Peso por origen**                        | **Resuelto:** solo estados `pending`/`approved`/`rejected` en el MVP, sin peso numérico                                        | El peso numérico se reconsidera cuando exista crowdsourcing multiclub                                                                                                                                                             |
| C3 ✅ | **Definición de duplicado**                | **Resuelto:** mismo tipo de evento, mismo equipo y menos de 30 s de diferencia → candidatos a duplicado, sin fusión automática | El umbral de 30 s vive como constante configurable, no cableada, para poder ajustarlo tras los amistosos                                                                                                                          |
| C4 ✅ | **Permisos granulares**                    | **Resuelto:** lista cerrada de permisos marcables en el MVP; **matriz totalmente configurable como objetivo posterior**        | El modelo de permisos se guarda como filas (`usuario` + `permiso`), no como un rol rígido. Así la matriz libre es una pantalla nueva, no una migración. Entra en el backlog como **E1-12**                                        |
| C5 ✅ | **Alcance del modo offline**               | **Resuelto:** solo partido en directo en el MVP; toda la app en algún momento                                                  | La capa de sincronización se escribe genérica desde el principio, aunque solo se enchufe a los eventos de partido. Entra en el backlog como **E13-10**                                                                            |

---

## D · Alcance y plataforma → bloquea DOC 06, 08 y 10

| #     | Decisión                                                                                 | Por qué importa                                                                                                     | Mi recomendación                                                                                                                |
| :---- | :--------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------ |
| D1 ✅ | **Modo de trabajo**                                                                      | **Resuelto:** Claude Code para desarrollo, chat web para diseño y documentación                                     | Instalación y método de trabajo en el **DOC 14**                                                                                |
| D2 ✅ | **Visibilidad del repositorio**                                                          | **Resuelto: privado**                                                                                               | Sin efecto sobre Claude Code, que trabaja en local                                                                              |
| D3 ✅ | **Dominio**                                                                              | **Resuelto:** subdominio de Netlify por ahora                                                                       | Presupuesto intacto en 0 €. El dominio propio espera a que haya nombre (F1)                                                     |
| D5 ✅ | **Partidos a posteriori**                                                                | **Resuelto: sí.** La pantalla de partido admite crearlo y rellenarlo en diferido                                    | Misma pantalla con el reloj parado y el minuto introducido a mano en cada evento                                                |
| D4 ✅ | **Arquitectura multitenant**                                                             | **Resuelto: sí, desde el MVP.** La base de datos se estructura para varios clubes aunque solo se cargue el de Isaac | Jerarquía `Club → Equipo → Jugador` como columna vertebral. Las políticas RLS se escriben una sola vez y no se rehacen          |
| D5    | Empiezas la liga el 25/10: ¿qué pasa con los **partidos ya jugados** si algo se retrasa? | Puede hacer falta un modo de carga manual a posteriori                                                              | Que la pantalla de partido admita crearlo y rellenarlo en diferido desde el principio. Es la misma pantalla con el reloj parado |

---

## E · Legal y privacidad → bloquea DOC 11

| #     | Decisión                          | Por qué importa                                                                              | Mi recomendación                                                                                                                                                                                             |
| :---- | :-------------------------------- | :------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1 ✅ | **Razón de sustitución «lesión»** | **Resuelto: se elimina.** Los motivos disponibles quedan en «táctica», «cansancio» y «otros» | La app no trata ningún dato de salud. La indisponibilidad del jugador se refleja en su estado (E6-04), sin motivo escrito                                                                                    |
| E2 ✅ | **Nombres reales de jugadores**   | **Resuelto:** sin nombres por ahora, pero el sistema debe poder mostrarlos en el futuro      | El campo `nombre_real` existe en la tabla desde el principio, vacío y oculto, junto a un campo de consentimiento. Activarlo después será una pantalla, no una migración. Entra en el backlog como **E15-07** |
| E3 ✅ | **Responsable del tratamiento**   | **Resuelto:** el club, con Isaac como contacto                                               | Tú figuras como desarrollador, no como responsable. Conviene dejarlo por escrito antes de que la app salga del entorno de pruebas                                                                            |

---

## F · Identidad → no bloquea nada

| #   | Decisión                                                                                   | Estado                                             |
| :-- | :----------------------------------------------------------------------------------------- | :------------------------------------------------- |
| F1  | Nombre de la app. Propuestas de Gemini: Míster.app, StatPitch, Pizarra.io, DatoOnce        | Pendiente. Se puede decidir en noviembre sin coste |
| F2  | Logo. Concepto propuesto: hexágono cuyos lados forman barras ascendentes, en SVG monocolor | Pendiente                                          |
| F3  | Paleta base por defecto, antes de inyectar el color del equipo                             | Pendiente                                          |

---

## G · Índice de fiabilidad y cobertura → bloquea DOC 04 y DOC 05

Idea nueva de Raúl: cada métrica muestra al lado un indicador de cuánto se puede confiar en ella. Es una idea potente y afecta al modelo de datos, así que hay que definirla antes de escribirlo.

| #     | Decisión                                | Resolución                                                                                                                                                                                                                                                                            | Consecuencia técnica                                                                                                                                                                                                                                                                       |
| :---- | :-------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1 ✅ | **Contra qué se calcula la fiabilidad** | **Resuelto: cobertura declarada.** Cada anotador declara al entrar al directo qué está siguiendo (todo el equipo, un jugador concreto, solo goles y tarjetas) y desde qué minuto. La fiabilidad de una métrica sale de si alguien declaró seguirla y durante cuánta parte del partido | Tabla `coverage` con anotador, partido, alcance, minuto de inicio y minuto de fin. Es la pieza más original del proyecto: ninguna app de este tipo declara lo que no sabe                                                                                                                  |
| G2 ✅ | **Modo de anotación en el directo**     | **Resuelto: reparto blando.** Cada anotador declara su cobertura al entrar, pero nadie queda bloqueado para registrar cualquier otra cosa que vea                                                                                                                                     | Alimenta G1 y reduce los duplicados de C3 sin imponer rigidez a pie de campo                                                                                                                                                                                                               |
| G3 ✅ | **Presentación del indicador**          | **Resuelto: nivel + porcentaje visible.** Formato «Fiabilidad media · 56 %»                                                                                                                                                                                                           | El nivel y el porcentaje se muestran juntos. Por accesibilidad (criterio 1.4.1), el nivel lleva icono y texto, nunca solo color                                                                                                                                                            |
| G4 ✅ | **Cálculo al vuelo o precalculado**     | **Resuelto: al vuelo, con la velocidad como prioridad**                                                                                                                                                                                                                               | A escala de un equipo y una temporada el cálculo es instantáneo. Para que la velocidad siga siendo prioritaria si el volumen crece, **todas las lecturas de estadísticas pasan por una única capa** (vista o función de PostgreSQL). Cambiar a precalculado será tocar un sitio, no veinte |

---

## Resumen: estado de las decisiones

**Todas las decisiones bloqueantes están cerradas.** Veintitrés de veinticinco.

**Abiertas y no bloqueantes:** el bloque F (nombre de la app, logo y paleta base). Se deciden cuando toque, sin coste para el desarrollo.

**Siguiente paso:** DOC 04 (reglas de negocio) y DOC 05 (modelo de datos y políticas RLS). Ya no falta ningún dato para escribirlos.

Con G1 y G2 respondidas salen el DOC 04 (reglas de negocio) y el DOC 05 (modelo de datos y RLS) en una sola sesión.
