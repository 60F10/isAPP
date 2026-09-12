# DOC 03 — Decisiones pendientes

> **Versión:** 1.2 — 12/09/2026 (bloque F cerrado: nombre, logo y paleta base)
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

| #     | Decisión                        | Por qué importa                                                                                                     | Mi recomendación                                                                                                       |
| :---- | :------------------------------ | :------------------------------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------- |
| D1 ✅ | **Modo de trabajo**             | **Resuelto:** Claude Code para desarrollo, chat web para diseño y documentación                                     | Instalación y método de trabajo en el **DOC 14**                                                                       |
| D2 ✅ | **Visibilidad del repositorio** | **Resuelto: privado**                                                                                               | Sin efecto sobre Claude Code, que trabaja en local                                                                     |
| D3 ✅ | **Dominio**                     | **Resuelto:** subdominio de Netlify por ahora                                                                       | Presupuesto intacto en 0 €. El dominio propio espera a que haya nombre (F1)                                            |
| D5 ✅ | **Partidos a posteriori**       | **Resuelto: sí.** La pantalla de partido admite crearlo y rellenarlo en diferido                                    | Misma pantalla con el reloj parado y el minuto introducido a mano en cada evento                                       |
| D4 ✅ | **Arquitectura multitenant**    | **Resuelto: sí, desde el MVP.** La base de datos se estructura para varios clubes aunque solo se cargue el de Isaac | Jerarquía `Club → Equipo → Jugador` como columna vertebral. Las políticas RLS se escriben una sola vez y no se rehacen |

---

## E · Legal y privacidad → bloquea DOC 11

| #     | Decisión                          | Por qué importa                                                                              | Mi recomendación                                                                                                                                                                                             |
| :---- | :-------------------------------- | :------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1 ✅ | **Razón de sustitución «lesión»** | **Resuelto: se elimina.** Los motivos disponibles quedan en «táctica», «cansancio» y «otros» | La app no trata ningún dato de salud. La indisponibilidad del jugador se refleja en su estado (E6-04), sin motivo escrito                                                                                    |
| E2 ✅ | **Nombres reales de jugadores**   | **Resuelto:** sin nombres por ahora, pero el sistema debe poder mostrarlos en el futuro      | El campo `nombre_real` existe en la tabla desde el principio, vacío y oculto, junto a un campo de consentimiento. Activarlo después será una pantalla, no una migración. Entra en el backlog como **E15-07** |
| E3 ✅ | **Responsable del tratamiento**   | **Resuelto:** el club, con Isaac como contacto                                               | Tú figuras como desarrollador, no como responsable. Conviene dejarlo por escrito antes de que la app salga del entorno de pruebas                                                                            |

---

## F · Identidad → ✅ RESUELTO (Raúl, 12/09/2026) → desbloquea DOC 07

| #     | Decisión        | Resolución                                                                                                                                                              | Consecuencia técnica                                                                                                                                                                                        |
| :---- | :-------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1 ✅ | **Nombre**      | **GavetaStats para el MVP, nombre definitivo aplazado.** Sirve mientras la app viva en el círculo de prueba. El nombre público se decide antes de salir de ahí          | El nombre visible sale de **una sola constante** y del manifiesto, nunca escrito a mano en pantallas. Renombrar debe ser tocar un archivo más la configuración de §F1.1, no una búsqueda por todo el código |
| F2 ✅ | **Logo**        | **Marca mínima para el MVP: tres barras ascendentes en SVG monocolor**, sin hexágono y sin letras. Descartado el hexágono. La identidad definitiva la hará quien diseñe | Sin letras, el icono sobrevive a un cambio de nombre. Sin hexágono, aguanta el recorte circular del icono _maskable_ y se lee a 16 px. Un único SVG con `currentColor`                                      |
| F3 ✅ | **Paleta base** | **Neutro frío con acento índigo.** Tema claro por defecto; el modo de alto contraste del DOC 02 §5.2 es el recurso para el sol. Tema oscuro fuera del MVP               | El DOC 07 fija los valores y mide cada uno: 7:1 en la pantalla de directo, 4.5:1 en el resto, 3:1 en bordes e iconos. El acento no es verde, amarillo ni rojo: están tomados por los estados y las tarjetas |

### F1.1 · Qué cuesta cambiar el nombre, y hasta cuándo sale barato

Hoy el cambio son unos cuarenta y cinco minutos de configuración: nombre del sitio en Netlify —que arrastra el subdominio—, Site URL y URL de redirección en Supabase, orígenes autorizados y nombre de la aplicación en el cliente de OAuth de Google, manifiesto, iconos y título.

El identificador del proyecto de Supabase **no cambia**, así que la `VITE_SUPABASE_URL` y el URI de retorno de OAuth se quedan como están.

Encarece en dos momentos, y conviene no llegar a ellos sin nombre:

1. **Cuando alguien instale la PWA.** El subdominio forma parte de la identidad de la aplicación instalada: si cambia, hay que reinstalar.
2. **Cuando se compre el dominio** (D3).

**Momento límite: antes de publicar la aplicación fuera del grupo de usuarios de prueba.**

### F1.2 · Criterios para el nombre definitivo

Apuntados para la sesión en que toque, sin abrirla ahora:

- Internacional, pronunciable fuera del español.
- Que se reconozca como aplicación de fútbol.
- Que admita el componente de red social, no solo el de estadísticas.
- Dominio libre y sin colisión con marcas del sector.

Ninguno de los cuatro afecta al MVP. La ambición de red social tampoco obliga a tocar nada hoy: la arquitectura multitenant (D4) y la tabla `team_followers` (H4) ya la admiten.

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

## H · Decisiones cerradas al escribir el DOC 04 y el DOC 05 (11/09/2026)

Cinco cuestiones que aparecieron al bajar las decisiones anteriores a reglas y a tablas. Todas resueltas en esa sesión.

| #     | Decisión                           | Resolución                                                                                                                                                       | Consecuencia técnica                                                                                                                                                                              |
| :---- | :--------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| H1 ✅ | **Idioma del esquema**             | **Inglés en `snake_case`** para tablas, columnas, enumeraciones y funciones. Los documentos siguen en español                                                    | Coherente con los commits en inglés (DOC 15) y con la documentación de PostgreSQL y Supabase                                                                                                      |
| H2 ✅ | **Los pases (cierra B1)**          | **Fuera del MVP.** Registrar 400 o 500 pases a mano no se sostiene, y un contador a medias da cifras que no se pueden comparar entre jugadores ni entre jornadas | Los tipos `pass` y `key_pass` existen en el esquema desde el primer día, apagados en `competitions.enabled_event_types`. Encenderlos es marcar una casilla, no migrar. Se empezará por `key_pass` |
| H3 ✅ | **Unidad de pertenencia para RLS** | **El equipo.** `team_members` con los permisos como filas                                                                                                        | Un usuario puede estar en varios equipos sin migración (E2-07). El delegado del cadete no ve al infantil                                                                                          |
| H4 ✅ | **Espectador que solo mira**       | **Tabla aparte, `team_followers`.** Seguir un equipo y tener función en él son cosas distintas                                                                   | El seguidor solo ve eventos **aprobados**, no la pantalla de personas ni el barullo de discordancias. Coste asumido: duplica las políticas de lectura                                             |
| H5 ✅ | **Registro de las partes**         | **Las partes no son eventos**, son filas de `match_periods` que solo escribe quien lleva el reloj                                                                | Cada parte guarda su duración **real**, con descuento incluido, y esa es la que manda en el cálculo de minutos. No entran en la cola de anotaciones ni admiten discordancia                       |

**Errata corregida en esta versión:** el identificador D5 figuraba dos veces en el bloque D, una resuelta y otra abierta con el mismo contenido. Se ha eliminado la duplicada.

---

## Resumen: estado de las decisiones

**Las treinta decisiones están cerradas**, contando los bloques H y F.

**Aplazado a propósito:** el nombre público de la aplicación. GavetaStats vale para el MVP; los criterios y el momento límite están en §F1.1 y §F1.2. No bloquea ningún documento.

**Hecho desde entonces:** DOC 04 (reglas de negocio y glosario) y DOC 05 (modelo de datos y políticas RLS), con el esquema aplicado a Supabase en las migraciones `20260911213846` y `20260911214032`. DOC 06 (arquitectura frontend) y DOC 10 v0.1 (entornos y despliegue).

**Siguiente paso:** DOC 07 (sistema de diseño), ya desbloqueado por el bloque F, y con él el DOC 08.
