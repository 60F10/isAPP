# DOC 04 — Reglas de negocio y glosario

> **Versión:** 1.0 — 11/09/2026
> **Depende de:** DOC 03 (decisiones), DOC 01 (backlog), DOC 02 (pantallas)
> **Alimenta a:** DOC 05 (modelo de datos), DOC 06 (arquitectura), DOC 08 (tareas), DOC 09 (observabilidad), DOC 11 (RGPD)

---

## 1. Para qué sirve este documento

Fija el vocabulario y las reglas que la aplicación tiene que cumplir, con independencia de cómo se programen. Es la referencia que resuelve las discusiones de tipo «¿qué pasa si…?» sin abrir el código.

Todo lo que aquí se escribe como **regla** tiene que poder comprobarse: o la impone la base de datos, o la impone una función, o la impone la interfaz. Una regla que nadie hace cumplir es un comentario.

**Norma general:** ninguna regla de competición vive cableada en el código. Todas salen de la configuración de la competición. La app tiene que servir a un alevín de fútbol 7 sin tocar una línea.

---

## 2. Decisiones cerradas en esta sesión

Cinco decisiones nuevas que el DOC 03 no recogía. Hay que subirlas allí en la próxima revisión.

| #   | Decisión                           | Resolución                                                                                                                                      | Afecta a                               |
| :-- | :--------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------- |
| H1  | **Idioma del esquema**             | Inglés en `snake_case` para tablas, columnas y valores de enumeración. Los documentos siguen en español                                         | Todo el DOC 05                         |
| H2  | **Pases (cierra el riesgo de B1)** | **Fuera del MVP.** Los tipos de evento existen en la base de datos desde el principio, pero no aparecen en la botonera hasta después de la liga | §7, `competitions.enabled_event_types` |
| H3  | **Unidad de pertenencia para RLS** | El equipo. `team_members` con permisos por fila. Un usuario puede estar en varios equipos sin migración                                         | §15, DOC 05 §9                         |
| H4  | **Espectador que solo mira**       | Tabla aparte, `team_followers`. Seguir un equipo y tener función en él son cosas distintas                                                      | §15, DOC 05 §9                         |
| H5  | **Registro de periodos**           | Las partes del partido no son eventos, son filas de `match_periods` que solo escribe quien lleva el reloj                                       | §5, §6                                 |

**Errata detectada en el DOC 03:** el identificador **D5** aparece dos veces en el bloque D, una resuelta y otra abierta con el mismo contenido. La abierta sobra.

---

## 3. Glosario

### 3.1 Entidades

| Término               | Qué es                                                                                                           | Qué no es                                                                           |
| :-------------------- | :--------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------- |
| **Club**              | Entidad raíz. Todo dato cuelga de un club. Es la frontera del aislamiento entre inquilinos                       | No es un equipo. Un club tiene varios equipos                                       |
| **Equipo gestionado** | Equipo con plantilla, personas y permisos. El cadete de Isaac                                                    | —                                                                                   |
| **Equipo referencia** | Rival. Solo nombre y escudo. Sin plantilla, sin usuarios, sin permisos                                           | No tiene jugadores ni se le registran datos individuales                            |
| **Temporada**         | Ventana temporal con fecha de inicio y fin, propia de cada club. La plantilla y las estadísticas cuelgan de ella | No es el año natural                                                                |
| **Jugador**           | Entidad deportiva sin cuenta, identificada por apodo y dorsal. Pertenece al club, no al equipo                   | No es un usuario. Nunca tiene acceso a la app en el MVP                             |
| **Inscripción**       | Presencia de un jugador en un equipo durante una temporada, con su dorsal y su posición por defecto              | No es el jugador. Un jugador puede tener varias inscripciones a lo largo del tiempo |
| **Usuario**           | Persona mayor de edad con cuenta de Google                                                                       | No es un jugador                                                                    |
| **Miembro**           | Usuario con función en un equipo y una lista de permisos                                                         | —                                                                                   |
| **Seguidor**          | Usuario que solo consulta estadísticas de un equipo, sin función ni permisos de escritura                        | No es miembro. No sale en la pantalla de personas del equipo                        |
| **Competición**       | Liga, copa o bloque de amistosos, con su reglamento configurable                                                 | —                                                                                   |
| **Partido**           | Encuentro entre un equipo gestionado y un equipo referencia, dentro de una competición y una temporada           | —                                                                                   |
| **Parte**             | Cada periodo de juego del partido, con duración prevista y duración real                                         | —                                                                                   |
| **Convocatoria**      | Reparto de la plantilla entre titulares, suplentes y no convocados para un partido                               | No es la alineación táctica                                                         |
| **Tramo**             | Intervalo continuo que un jugador pasa en el campo dentro de una misma parte                                     | No es la sustitución. El tramo es el efecto, la sustitución es la causa             |
| **Evento**            | Hecho observado durante el partido, con tipo, momento, autor y estado                                            | No es una métrica. La métrica se calcula a partir de los eventos                    |
| **Cobertura**         | Declaración de un anotador sobre qué está siguiendo y durante cuánto tiempo                                      | No limita lo que puede registrar                                                    |
| **Fiabilidad**        | Porcentaje que indica cuánta parte del partido estuvo vigilada una métrica                                       | No mide si el dato es correcto, mide si alguien estaba mirando                      |
| **Discordancia**      | Conjunto de eventos candidatos a describir el mismo hecho, registrados por personas distintas                    | No es un error. Es un dato pendiente de resolver                                    |
| **Sanción**           | Partidos que un jugador no puede disputar, por acumulación de amarillas, por roja o por decisión del club        | —                                                                                   |

### 3.2 Términos de funcionamiento

| Término                     | Significado                                                                                                                  |
| :-------------------------- | :--------------------------------------------------------------------------------------------------------------------------- |
| **Reloj corrido**           | El cronómetro no se detiene en las interrupciones. Solo para en el descanso y al finalizar la parte                          |
| **Minuto de juego**         | Segundos transcurridos dentro de la parte en curso, convertidos a minuto de presentación                                     |
| **Registro diferido**       | Apuntar un evento después de que ocurriera, corrigiendo su minuto a mano                                                     |
| **Partido en diferido**     | Partido entero introducido con el reloj parado, después de jugarse                                                           |
| **Métrica estructural**     | La que sale del acta y no de la observación: minutos, titularidad, resultado. No lleva índice de fiabilidad                  |
| **Métrica de observación**  | La que depende de que alguien esté mirando: goles, faltas, córners, tarjetas. Lleva índice de fiabilidad                     |
| **Identificador de origen** | UUID que genera el dispositivo antes de enviar un evento, para que reenviarlo no lo duplique                                 |
| **Cierre del partido**      | Acto por el que el entrenador resuelve las discordancias, confirma el resultado y deja el partido apto para las estadísticas |

---

## 4. Reglamento configurable

### 4.1 Parámetros de la competición

| Parámetro               | Tipo      | Valores               | Por defecto | Qué controla                                                             |
| :---------------------- | :-------- | :-------------------- | :---------- | :----------------------------------------------------------------------- |
| `periods_count`         | entero    | 1–4                   | 2           | Número de partes. Cubre los cuartos de las categorías menores            |
| `period_minutes`        | entero    | 10–60                 | 45          | Duración prevista de cada parte                                          |
| `halftime_minutes`      | entero    | 0–30                  | 15          | Descanso. Solo informativo, el reloj de juego no lo cuenta               |
| `clock_mode`            | enumerado | `running` · `stopped` | `running`   | Reloj corrido o a tiempo parado                                          |
| `substitution_type`     | enumerado | `fixed` · `rolling`   | `fixed`     | Si el sustituido puede volver a entrar                                   |
| `substitutions_max`     | entero    | 0–99                  | 5           | Máximo de sustituciones por partido. 99 equivale a sin límite            |
| `squad_max`             | entero    | 5–30                  | 18          | Máximo de convocados                                                     |
| `players_on_pitch`      | entero    | 5–11                  | 11          | Jugadores en campo al inicio                                             |
| `yellow_cards_for_ban`  | entero    | 0–20                  | 5           | Amarillas que cierran ciclo y provocan un partido de sanción. 0 lo apaga |
| `red_card_default_bans` | entero    | 0–10                  | 1           | Sanción propuesta al sacar una roja, siempre editable a mano             |
| `enabled_event_types`   | lista     | tipos del §7          | ver §7      | Qué botones aparecen en el directo                                       |

### 4.2 Valores del cadete de Isaac

`periods_count = 2` · `period_minutes = 40` · `halftime_minutes = 15` · `clock_mode = running` · `substitution_type = fixed` · `substitutions_max = 5` · `squad_max = 18` · `players_on_pitch = 11` · `yellow_cards_for_ban = 5`

**La duración total de un partido nunca es una constante.** Sale de `periods_count × period_minutes`, y para el cadete son 80 minutos, no 90.

### 4.3 Validaciones que impone el reglamento

| Regla | Enunciado                                                                       | Dónde se comprueba           | Si se incumple                            |
| :---- | :------------------------------------------------------------------------------ | :--------------------------- | :---------------------------------------- |
| R-01  | La convocatoria no supera `squad_max`                                           | Pantalla A11 y base de datos | Se bloquea el guardado                    |
| R-02  | Los titulares son exactamente `players_on_pitch`                                | Pantalla A11                 | Aviso bloqueante antes de iniciar         |
| R-03  | Un jugador sancionado o no disponible no entra en la convocatoria               | Pantalla A11                 | No aparece como seleccionable             |
| R-04  | Las sustituciones de un partido no superan `substitutions_max`                  | Pantalla A12 y base de datos | El botón de cambio se deshabilita         |
| R-05  | Con `substitution_type = fixed`, un jugador sustituido no vuelve a entrar       | Pantalla A12 y base de datos | El jugador no aparece entre los entrantes |
| R-06  | Solo entra al campo quien está convocado en ese partido                         | Base de datos                | Se rechaza el evento                      |
| R-07  | Un jugador expulsado no vuelve a entrar en ningún caso, ni con cambios volantes | Pantalla A12 y base de datos | El jugador queda fuera de la lista        |
| R-08  | El número de parte de un evento está entre 1 y `periods_count`                  | Base de datos                | Se rechaza el evento                      |
| R-09  | Un evento de tipo desactivado en la competición no se registra                  | Pantalla A12                 | El botón no existe                        |

> El límite de sustituciones se cuenta por **acto de sustitución**, no por jugador. Una sustitución doble son dos.

---

## 5. Reloj y minuto de partido

### 5.1 Modelo

El cronómetro pertenece a la aplicación, no al árbitro. Arranca con un botón y corre sin pausas dentro de cada parte. Cada evento captura el momento en dos datos: **la parte** y **los segundos transcurridos dentro de esa parte**.

No se guarda un «minuto absoluto» del partido. Si se guardara, el descuento de la primera parte desplazaría todos los minutos de la segunda y cualquier corrección obligaría a recalcular el partido entero.

### 5.2 Partes

Cada parte se abre y se cierra explícitamente y deja una fila con su duración prevista y su **duración real**. La duración real es la que manda en todos los cálculos.

| Momento            | Qué ocurre                                                                                |
| :----------------- | :---------------------------------------------------------------------------------------- |
| Inicio de la parte | Se abre la fila de la parte y se abren los tramos de los jugadores que están en el campo  |
| Durante la parte   | El reloj corre. Los eventos guardan parte y segundos                                      |
| Descuento          | El reloj sigue pasado `period_minutes`. La pantalla muestra `40+2`                        |
| Fin de la parte    | Se cierra la fila con su duración real y se cierran todos los tramos abiertos             |
| Descanso           | No hay reloj de juego. Los cambios hechos aquí se apuntan al inicio de la parte siguiente |

**Regla del descuento:** el tiempo añadido cuenta como tiempo jugado. Un jugador que aguanta una parte de 41:30 acumula 41:30, no 40:00.

### 5.3 Minuto de presentación

Lo que se enseña al usuario sale de los datos guardados, nunca al revés.

| Situación                      | Cálculo                                                 | Ejemplo      |
| :----------------------------- | :------------------------------------------------------ | :----------- |
| Dentro de la duración prevista | `parte anterior acumulada + ⌊segundos ÷ 60⌋ + 1`        | `34'`        |
| En el descuento                | `minuto previsto` + `+n`                                | `40+2'`      |
| Reloj en marcha en pantalla    | `mm:ss` de la parte en curso, con indicador de la parte | `34:12 · 2ª` |

En la segunda parte del cadete, el minuto de presentación arranca en 41 aunque los segundos guardados vuelvan a empezar en cero.

### 5.4 Registro diferido y partido en diferido

Todo evento admite corregir su parte y sus segundos después de crearse. Es la misma operación que usa el partido introducido días después: el reloj se queda parado en cero y cada evento lleva su minuto a mano.

Un partido en diferido necesita igualmente sus partes con duración real. Si no se sabe, se toma la prevista.

---

## 6. Participación y minutos jugados

### 6.1 Los tramos se derivan, no se escriben

La fuente de verdad son **la convocatoria y los eventos aprobados**. Los tramos se recalculan a partir de ellos cada vez que cambia un cambio, una expulsión o la convocatoria. Nadie los edita a mano.

Así, corregir una sustitución mal apuntada arregla los minutos de los dos jugadores sin tocar nada más.

### 6.2 Regla del tramo corto

**Un tramo nunca cruza el final de una parte.** Al cerrar la parte se cierran todos los tramos abiertos, y al abrir la siguiente se abren tramos nuevos para los jugadores que siguen en el campo.

Con esto, el cálculo de minutos se resuelve dentro de cada parte y no hace falta convertir nada a una escala absoluta. El descuento de la primera parte deja de contaminar la segunda.

### 6.3 Algoritmo

```
Para cada parte P del partido:
    en_campo ← jugadores que empiezan la parte P
              (titulares si P = 1; los que estaban al cerrar P-1, más los cambios del descanso)
    abrir tramo(jugador, P, 0) para cada uno

    Para cada evento aprobado de P, en orden de segundos:
        substitution → cerrar tramo(sale, P, segundos)
                       abrir  tramo(entra, P, segundos)
        red_card     → cerrar tramo(jugador, P, segundos)
        second_yellow→ cerrar tramo(jugador, P, segundos)

    cerrar todos los tramos abiertos en (P, duración real de P)

minutos_jugados(jugador) = redondeo( Σ (fin − inicio) de sus tramos ÷ 60 )
```

Los segundos se guardan siempre. El redondeo vive en la capa de presentación, así que cambiar de criterio no obliga a migrar nada.

### 6.4 Casos límite

| Caso                                            | Resolución                                                                                                 |
| :---------------------------------------------- | :--------------------------------------------------------------------------------------------------------- |
| Convocado que no llega a jugar                  | Cero minutos. Aparece en la lista con `0'`, que no es lo mismo que no aparecer                             |
| Cambio en el descanso                           | El que sale cierra en el fin de la parte anterior; el que entra abre en el segundo 0 de la siguiente       |
| Expulsión                                       | Cierra el tramo. El equipo sigue con uno menos y `players_on_pitch` deja de validarse a la baja            |
| Expulsión de un suplente o del entrenador       | Se registra la tarjeta sin tramo asociado. No afecta a minutos                                             |
| Portero expulsado y jugador de campo al arco    | Cambio de posición, no de tramo. Los minutos no se alteran                                                 |
| Partido suspendido                              | El minuto de suspensión cierra las partes y los tramos. El partido queda marcado como incompleto           |
| Partido no cerrado                              | No entra en ninguna estadística de temporada, ni siquiera en los totales del jugador                       |
| Sustitución apuntada dos veces por dos personas | Solo cuenta la aprobada. Mientras haya discordancia sin resolver, los minutos se marcan como provisionales |
| Corrección después del cierre                   | Se permite, se registra en la auditoría y dispara el recálculo de tramos del partido                       |

---

## 7. Catálogo de eventos

### 7.1 Tipos

Todos los tipos existen en la base de datos desde el primer día. Lo que decide si un botón aparece es `enabled_event_types` de la competición, nunca una migración.

| Tipo              | Jugador propio    | Segundo jugador        | Admite rival    | Detalle                           | MVP |
| :---------------- | :---------------- | :--------------------- | :-------------- | :-------------------------------- | :-- |
| `goal`            | Obligatorio       | Asistente, opcional    | Sí, sin jugador | —                                 | ✅  |
| `own_goal`        | Obligatorio       | —                      | Sí, sin jugador | —                                 | ✅  |
| `yellow_card`     | Obligatorio       | —                      | Sí, sin jugador | —                                 | ✅  |
| `second_yellow`   | Obligatorio       | —                      | Sí, sin jugador | Implica expulsión                 | ✅  |
| `red_card`        | Obligatorio       | —                      | Sí, sin jugador | —                                 | ✅  |
| `foul_committed`  | Obligatorio       | —                      | Sí, sin jugador | —                                 | ✅  |
| `foul_received`   | Opcional          | —                      | No              | —                                 | ✅  |
| `corner`          | —                 | —                      | Sí, sin jugador | A favor o en contra               | ✅  |
| `substitution`    | Sale, obligatorio | Entra, obligatorio     | No              | Motivo: táctica, cansancio, otros | ✅  |
| `position_change` | Obligatorio       | —                      | No              | Posición nueva                    | ✅  |
| `note`            | Opcional          | —                      | No              | Texto libre                       | ✅  |
| `pass`            | Obligatorio       | Destinatario, opcional | No              | **Desactivado**                   | ❌  |
| `key_pass`        | Obligatorio       | Destinatario, opcional | No              | **Desactivado**                   | ❌  |
| `shot_on_target`  | Obligatorio       | —                      | Sí              | —                                 | ❌  |
| `shot_off_target` | Obligatorio       | —                      | Sí              | —                                 | ❌  |
| `offside`         | Obligatorio       | —                      | Sí              | —                                 | ❌  |
| `recovery`        | Obligatorio       | —                      | No              | —                                 | ❌  |
| `turnover`        | Obligatorio       | —                      | No              | Mitad del campo                   | ❌  |
| `player_rating`   | Obligatorio       | —                      | No              | Valoración de 1 a 5               | ❌  |

Los ocho últimos nacen declarados y apagados. Encenderlos después es marcar una casilla en la competición, no una migración.

> **Decisión H2 — los pases.** Registrar 400 o 500 pases a mano durante un partido no se sostiene, y un contador a medias produce cifras que nadie puede comparar entre jugadores ni entre jornadas. Queda fuera del MVP con el tipo ya modelado: `player_id` obligatorio y `secondary_player_id` opcional, tal como cerraba B1. Cuando se encienda, se enciende con `key_pass` primero, que sí es registrable.

### 7.2 Eventos del rival

El rival es un equipo sin plantilla, así que sus eventos se registran a nivel de equipo con la marca `is_opponent` y sin jugador. En el MVP solo se registran del rival: goles, córners y tarjetas.

### 7.3 Cómputo del marcador

| Marcador        | Fórmula                                   |
| :-------------- | :---------------------------------------- |
| Goles a favor   | `goal` propios **+** `own_goal` del rival |
| Goles en contra | `goal` del rival **+** `own_goal` propios |

Solo cuentan los eventos aprobados. El marcador que se muestra durante el directo incluye los pendientes y se avisa de ello.

### 7.4 Flujo de registro

`Acción → Jugador → Detalle opcional → Guardado`. El paso de detalle siempre se puede saltar: **un gol sin asistencia vale más que ningún gol**.

Cada evento se guarda con su identificador de origen generado en el dispositivo, de forma que reenviarlo desde la cola offline nunca lo duplica.

---

## 8. Estados

### 8.1 Estados del partido

```
scheduled → called → live → finished → closed
                       ↓
                   suspended → closed
```

| Estado      | Qué significa                      | Qué permite                                   |
| :---------- | :--------------------------------- | :-------------------------------------------- |
| `scheduled` | Programado en el calendario        | Editar fecha, rival, campo                    |
| `called`    | Convocatoria guardada y validada   | Iniciar el partido                            |
| `live`      | En juego                           | Registrar eventos, abrir y cerrar partes      |
| `suspended` | Interrumpido en un minuto concreto | Pasar a cierre. Queda marcado como incompleto |
| `finished`  | Terminado, pendiente de revisar    | Resolver discordancias y confirmar resultado  |
| `closed`    | Cerrado                            | Entra en las estadísticas de temporada        |

**Regla:** ningún partido entra en las estadísticas antes de estar cerrado. Sin esta regla, un partido a medio apuntar contamina todas las medias.

### 8.2 Estados del evento

| Estado     | Cuándo                                         | Cuenta en estadísticas |
| :--------- | :--------------------------------------------- | :--------------------- |
| `pending`  | Lo registró alguien sin permiso de validación  | No                     |
| `approved` | Lo registró el entrenador, o lo aprobó después | Sí                     |
| `rejected` | El entrenador lo descartó                      | No, y no se borra      |

Un evento rechazado se conserva. Sirve para medir quién acierta y para deshacer un rechazo equivocado.

### 8.3 Aprobación automática

Quien tiene el permiso `match.close` registra eventos que nacen `approved`. Todos los demás los registran `pending`. No hay peso numérico por origen en el MVP, tal como cerraba C2.

### 8.4 Reglas del cierre

| Regla | Enunciado                                                                                                                 |
| :---- | :------------------------------------------------------------------------------------------------------------------------ |
| C-01  | No se cierra un partido con eventos `pending`. Existe una acción de aprobar en bloque los que queden                      |
| C-02  | El cierre confirma el resultado final a mano y lo compara con el calculado. Si difieren, se avisa y se puede cerrar igual |
| C-03  | El cierre lista las coberturas que quedaron abiertas y las da por terminadas en el minuto final                           |
| C-04  | El cierre dispara el recálculo de tramos y deja los minutos en firme                                                      |
| C-05  | Reabrir un partido cerrado es posible, queda auditado y vuelve a dejar los datos como provisionales                       |

---

## 9. Concurrencia

Cuatro personas anotando a la vez en los amistosos. Esto no es un caso raro, es el caso normal.

### 9.1 Idempotencia

Cada evento lleva un identificador único generado en el dispositivo **antes** de enviarlo. El servidor rechaza el segundo envío con el mismo identificador sin dar error al usuario. Es lo que permite reintentar la cola offline sin miedo.

### 9.2 Duplicados

Dos eventos son **candidatos a duplicado** cuando coinciden en:

- tipo de evento,
- bando (propio o rival),
- misma parte y diferencia menor que la ventana configurada,
- y los registró gente distinta.

**Ventana por defecto: 30 segundos**, configurable en los ajustes de la aplicación, no cableada. Tras los amistosos habrá que ajustarla con datos reales.

Nunca se fusionan solos. Se agrupan y se muestran juntos en la pantalla de cierre para que el entrenador decida.

### 9.3 Discordancias

| Situación                                               | Resolución                                                    |
| :------------------------------------------------------ | :------------------------------------------------------------ |
| Dos personas apuntan el mismo gol                       | Se aprueba uno y se rechaza el otro                           |
| Dos personas apuntan el mismo gol con goleador distinto | Se aprueba el correcto. El rechazado conserva quién lo apuntó |
| Un espectador apunta un cambio de posición              | Requiere aprobación del entrenador antes de contar            |
| Alguien apunta un evento de un jugador no convocado     | Se rechaza en el momento del registro                         |

---

## 10. Cobertura declarada e índice de fiabilidad

La pieza más original del proyecto. Ninguna aplicación de este tipo declara lo que no sabe.

### 10.1 Qué métricas llevan índice

| Clase              | Métricas                                                               | Lleva índice |
| :----------------- | :--------------------------------------------------------------------- | :----------- |
| **Estructurales**  | Minutos, titularidad, convocatoria, resultado, tarjetas del acta       | No           |
| **De observación** | Goles, asistencias, faltas, córners, y todo lo que se enciende después | Sí           |

Los minutos salen de la convocatoria y de los cambios, que son un dato de acta. Ponerles un porcentaje de fiabilidad confundiría más que ayudar.

### 10.2 Declaración

Al entrar al directo, cada anotador declara qué sigue. Es obligatorio y tiene valor por defecto, así que no añade fricción.

| Alcance         | Qué cubre                             | Exige jugador |
| :-------------- | :------------------------------------ | :------------ |
| `full_team`     | Todos los tipos activos del equipo    | No            |
| `single_player` | Los tipos activos, solo de un jugador | Sí            |
| `goals_cards`   | Goles, autogoles y tarjetas           | No            |
| `custom`        | Selección libre de tipos              | No            |

La declaración guarda el momento de inicio, y el de fin cuando el anotador sale. **Reparto blando:** declarar no bloquea. Quien sigue a un solo jugador puede apuntar un gol del equipo si lo ve, y ese gol cuenta igual.

### 10.3 Fórmula

Para una métrica **M** en un partido **P**:

```
T  = duración real total del partido en segundos
     (si el partido se suspendió, hasta el minuto de suspensión)

C1 = segundos de P cubiertos por al menos UNA declaración que incluya M
C2 = segundos de P cubiertos por DOS O MÁS declaraciones que incluyan M

fiabilidad(M, P) = mínimo( 1 ; C1/T + 0,10 × C2/T )
```

La corroboración suma un diez por ciento como máximo: dos personas mirando lo mismo no garantizan el dato, pero lo hacen más creíble que una sola.

Para una métrica **individual del jugador J**, una declaración `single_player` solo cuenta si su objetivo es J. Una `full_team` cuenta siempre.

### 10.4 Umbrales y presentación

| Nivel         | Rango        | Presentación                      |
| :------------ | :----------- | :-------------------------------- |
| Alta          | 80 % – 100 % | Icono + «Fiabilidad alta · 92 %»  |
| Media         | 50 % – 79 %  | Icono + «Fiabilidad media · 56 %» |
| Baja          | 1 % – 49 %   | Icono + «Fiabilidad baja · 31 %»  |
| Sin cobertura | 0 %          | «Sin cobertura declarada»         |

Nivel e icono acompañan siempre al porcentaje. Nada depende solo del color, por el criterio 1.4.1 del DOC 02.

Cuando una métrica con fiabilidad baja se usa para comparar jugadores, la pantalla lo advierte de forma explícita.

### 10.5 Agregación por temporada

La fiabilidad de una métrica en la temporada es la media de sus fiabilidades por partido, **ponderada por la duración de cada partido**. Solo entran partidos cerrados.

### 10.6 Casos límite

| Caso                                          | Resolución                                                                                   |
| :-------------------------------------------- | :------------------------------------------------------------------------------------------- |
| Nadie declara nada                            | No puede pasar: entrar al directo crea la declaración, con `full_team` por defecto           |
| El anotador cierra la app sin declarar el fin | La cobertura se cierra en el minuto final del partido y se lista en el cierre para revisarla |
| El anotador entra en el minuto 60             | Su cobertura empieza ahí. Los 60 primeros minutos no cuentan para él                         |
| Un solo anotador todo el partido              | Fiabilidad del 100 %, sin bonificación por corroboración                                     |
| Métrica apagada en la competición             | No se muestra el índice. No hay nada que medir                                               |
| Partido en diferido                           | Cobertura declarada del 100 % desde el minuto 0, marcada como de origen diferido             |

---

## 11. Convocatoria y alineación

| Regla | Enunciado                                                                                                       |
| :---- | :-------------------------------------------------------------------------------------------------------------- |
| L-01  | La plantilla se reparte en titulares, suplentes y no convocados. Todo jugador inscrito aparece en alguno        |
| L-02  | Titulares + suplentes no superan `squad_max`                                                                    |
| L-03  | Los titulares son exactamente `players_on_pitch`                                                                |
| L-04  | Un jugador sancionado o no disponible no se puede convocar, y la pantalla dice por qué                          |
| L-05  | El dorsal del partido sale de la inscripción, y se puede cambiar solo para ese partido                          |
| L-06  | La posición inicial sale de la posición por defecto de la inscripción, y se puede cambiar solo para ese partido |
| L-07  | Guardar la convocatoria pasa el partido a `called`                                                              |
| L-08  | Empezado el partido, la convocatoria se bloquea. Corregirla obliga a volver atrás de forma explícita            |

---

## 12. Disciplina y disponibilidad

### 12.1 Tipos de sanción

| Tipo                  | Origen                                    | Partidos                      | Automática |
| :-------------------- | :---------------------------------------- | :---------------------------- | :--------- |
| `yellow_accumulation` | Cerrar un ciclo de `yellow_cards_for_ban` | 1                             | Sí         |
| `red_card`            | Roja directa o doble amarilla             | De 1 a N, lo decide el comité | No         |
| `club_decision`       | Arresto o decisión técnica del entrenador | Las que fije el entrenador    | No         |

### 12.2 Ciclo de amarillas

Se cuentan las amarillas aprobadas del jugador en la competición y la temporada. Al llegar a `yellow_cards_for_ban`, la app **propone** la sanción de un partido y reinicia el contador. Proponer, no imponer: la aplica el entrenador.

Una doble amarilla en el mismo partido cuenta como **una** amarilla para el ciclo, más la roja correspondiente.

### 12.3 Roja

La app nunca decide cuántos partidos son. Propone `red_card_default_bans` y deja el número editable, porque lo dicta el comité de competición días después. Hasta que el entrenador lo confirme, la sanción queda en estado propuesto.

### 12.4 Disponibilidad

| Estado        | Efecto                                                        |
| :------------ | :------------------------------------------------------------ |
| `available`   | Convocable                                                    |
| `unavailable` | No convocable. **Sin motivo escrito**                         |
| `sanctioned`  | No convocable mientras queden partidos de sanción por cumplir |

**La app no trata ningún dato de salud.** No existe el motivo «lesión» en ninguna parte: ni en la disponibilidad, ni en la razón de sustitución, que queda en táctica, cansancio y otros.

### 12.5 Cumplimiento

Una sanción se descuenta cuando el jugador se pierde un partido **cerrado** de la competición que la originó. Al llegar a cero, el jugador vuelve a estar disponible solo.

---

## 13. Entrenamientos

| Regla | Enunciado                                                                               |
| :---- | :-------------------------------------------------------------------------------------- |
| T-01  | La sesión pertenece a un equipo y una temporada, y aparece en el calendario             |
| T-02  | La asistencia admite tres estados: presente, ausente y retraso                          |
| T-03  | Cada jugador admite una observación por sesión, y la sesión una observación global      |
| T-04  | La asistencia no lleva índice de fiabilidad: la pasa el entrenador, es dato estructural |
| T-05  | Las observaciones son texto libre y nunca recogen información de salud                  |

---

## 14. Agregación de estadísticas

### 14.1 Qué entra

| Filtro               | Criterio                                                          |
| :------------------- | :---------------------------------------------------------------- |
| Partidos             | Solo `closed`                                                     |
| Eventos              | Solo `approved`                                                   |
| Partidos suspendidos | **Excluidos de las medias por defecto**, con opción de incluirlos |
| Amistosos            | Separados de la liga por competición, agrupables a voluntad       |

### 14.2 Una sola puerta de lectura

**Toda lectura de estadísticas pasa por la misma capa** de vistas y funciones de la base de datos. Ninguna pantalla monta agregados por su cuenta.

El cálculo se hace al vuelo, porque a escala de un equipo y una temporada es instantáneo. Si algún día deja de serlo, precalcular será tocar un sitio en lugar de veinte.

### 14.3 Medias

Las medias por partido se calculan sobre los partidos en que el jugador **disputó algún minuto**, no sobre los partidos del equipo. Las medias por noventa minutos se calculan sobre los minutos reales, y se ocultan cuando el jugador no llega a 90 minutos en total, porque extrapolar desde 20 minutos es ruido.

---

## 15. Permisos

### 15.1 Lista cerrada del MVP

Los permisos se guardan como filas, no como un rol rígido. El rol es una plantilla que rellena esas filas al añadir a alguien, y a partir de ahí cada permiso se marca y se desmarca por separado.

| Permiso              | Qué habilita                                    |
| :------------------- | :---------------------------------------------- |
| `team.manage`        | Editar el equipo y sus datos                    |
| `roster.manage`      | Crear y editar jugadores e inscripciones        |
| `competition.manage` | Crear competiciones y editar su reglamento      |
| `schedule.manage`    | Crear y editar partidos y entrenamientos        |
| `lineup.manage`      | Guardar la convocatoria                         |
| `match.live.write`   | Registrar eventos durante el partido            |
| `match.close`        | Aprobar y rechazar eventos, y cerrar el partido |
| `discipline.manage`  | Sanciones, arrestos y disponibilidad            |
| `training.manage`    | Pasar lista y escribir observaciones            |
| `stats.view`         | Consultar estadísticas del equipo               |
| `members.manage`     | Invitar personas y asignar permisos             |

### 15.2 Plantillas de rol

| Rol            | Permisos que rellena                                                   |
| :------------- | :--------------------------------------------------------------------- |
| **Entrenador** | Todos los de la tabla                                                  |
| **Delegado**   | `schedule.manage`, `match.live.write`, `training.manage`, `stats.view` |
| **Ojeador**    | `match.live.write`, `stats.view`                                       |
| **Espectador** | `stats.view`, y `match.live.write` si el entrenador lo habilita        |

El administrador de la plataforma es una condición del usuario, no un permiso de equipo. Solo sirve para mantenimiento y para consultar los registros de error.

### 15.3 Miembros y seguidores

**Decisión H4.** Son dos tablas distintas:

- **Miembro** — tiene función en el equipo y permisos. Sale en la pantalla de personas. Es quien trabaja.
- **Seguidor** — solo consulta estadísticas aprobadas del equipo. No tiene permisos, no sale en la pantalla de personas y no puede escribir nada.

Un mismo usuario no debería estar en las dos tablas del mismo equipo. Si ocurre, manda la de miembro.

> **Deuda técnica asumida.** Esta separación duplica las políticas de lectura: cada tabla consultable necesita una regla para miembros y otra para seguidores. A cambio, distingue con claridad seguir a un equipo de tener función en él, y evita inflar la pantalla de personas con la grada. Coste estimado: una decena de políticas adicionales y una función auxiliar.

---

## 16. Invariantes

Lo que tiene que ser cierto siempre. Si algo de esto se rompe, hay un fallo.

| #    | Invariante                                                                                               |
| :--- | :------------------------------------------------------------------------------------------------------- |
| I-01 | Todo dato cuelga de un club, y nadie ve datos de un club al que no pertenece                             |
| I-02 | Todo evento tiene autor, momento de creación y partido                                                   |
| I-03 | Ningún jugador tiene dos tramos solapados en la misma parte                                              |
| I-04 | Ningún evento apunta a un jugador que no está convocado en ese partido                                   |
| I-05 | Un dorsal no se repite dentro de la misma inscripción de equipo y temporada                              |
| I-06 | Las estadísticas de temporada solo agregan partidos cerrados y eventos aprobados                         |
| I-07 | Ningún evento se pierde: si sale del dispositivo, llega o queda en la cola con su error registrado       |
| I-08 | Reenviar un evento ya guardado no lo duplica                                                             |
| I-09 | La suma de los minutos de los tramos de una parte nunca supera la duración real de esa parte por jugador |
| I-10 | Ningún jugador tiene datos de salud, DNI, foto ni nombre real sin consentimiento registrado              |

---

## 17. Deuda técnica que genera este documento

| Deuda                                                                                        | Cuándo se paga                                    |
| :------------------------------------------------------------------------------------------- | :------------------------------------------------ |
| Los pases quedan fuera del MVP: no habrá dato de circulación ni de participación en el juego | Al encender `key_pass`, después de la liga        |
| Los tramos se recalculan enteros por partido, sin cálculo incremental                        | Solo si el recálculo se nota. A esta escala, no   |
| Las estadísticas se calculan al vuelo                                                        | Si crece el volumen, materializando la misma capa |
| `team_followers` duplica las políticas de lectura                                            | Se asume. Es el precio de la decisión H4          |
| La fiabilidad depende de que la gente declare bien su cobertura                              | Se revisa tras los amistosos, con datos reales    |
| La ventana de duplicados de 30 segundos es una conjetura                                     | Se ajusta tras los amistosos                      |

---

## 18. Qué desbloquea este documento

El **DOC 05** (modelo de datos y políticas RLS) sale entero de aquí. Detrás van el **DOC 09** (registro de errores), el **DOC 11** (RGPD) y las tareas del **DOC 08** del bloque de entrada de datos.
