# DOC 02 — Pantallas, navegación y accesibilidad

> **Versión:** 1.0 — 08/09/2026
> **Depende de:** DOC 01 (backlog)
> **Alimenta a:** DOC 06 (arquitectura frontend), DOC 07 (sistema de diseño), DOC 08 (tareas)

---

## 1. Principio de construcción

**Primero meter datos, luego ver datos.**

El bloque de entrada se construye entero antes de tocar una gráfica. Sin partidos registrados no hay nada que graficar, y un dashboard con datos inventados esconde los fallos del motor en lugar de revelarlos.

Consecuencia directa: las pantallas del **Bloque A** entran en el MVP; las del **Bloque B** se construyen cuando Isaac tenga al menos dos partidos reales metidos de extremo a extremo.

---

## 2. Inventario de pantallas

### Bloque A — Entrada de datos · prioridad 1

| ID | Pantalla | Ruta | Quién entra | Fase | Épicas |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A01** | Acceso | `/login` | Todos | MVP | E1-01 |
| **A02** | Inicio | `/` | Todos | MVP | E4-04 |
| **A03** | Club | `/club` | Entrenador, Admin | MVP | E2-01 |
| **A04** | Equipos | `/equipos` | Entrenador, Admin | MVP | E2-02 |
| **A05** | Plantilla | `/equipos/:id/plantilla` | Entrenador, Delegado | MVP | E2-03, E2-04 |
| **A06** | Ficha de jugador (edición) | `/jugadores/:id/editar` | Entrenador | MVP | E2-04→06, E6-04 |
| **A07** | Personas y permisos | `/equipos/:id/personas` | Entrenador | MVP | E1-04→08 |
| **A08** | Competiciones y reglamento | `/competiciones` · `/competiciones/:id` | Entrenador | MVP | E3 completa |
| **A09** | Calendario | `/calendario` | Todos | MVP | E4-01→04 |
| **A10** | Alta / edición de partido | `/partidos/nuevo` · `/partidos/:id/editar` | Entrenador, Delegado | MVP | E4-02, E4-03 |
| **A11** | Convocatoria y alineación | `/partidos/:id/convocatoria` | Entrenador | MVP | E7-01→06 |
| **A12** | **Partido en directo** ⭐ | `/partidos/:id/directo` | Con permiso de escritura | MVP | E8 completa |
| **A13** | Cierre y post-partido | `/partidos/:id/cierre` | Entrenador | MVP | E10 completa |
| **A14** | Mis aportaciones | `/mis-aportaciones` | Con permiso de escritura | MVP | E9-06 |
| **A15** | Entrenamiento en directo | `/entrenamientos/:id/lista` | Entrenador, Delegado | MVP | E5-02→04 |
| **A16** | Disciplina y sanciones | `/disciplina` | Entrenador | MVP | E6 completa |

### Bloque B — Consulta de datos · prioridad 2

| ID | Pantalla | Ruta | Quién entra | Fase | Épicas |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **B01** | Panel de equipo | `/estadisticas` | Todos según permiso | MVP tardío | E11-01, E11-04 |
| **B02** | Estadísticas de jugador | `/estadisticas/jugador/:id` | Todos según permiso | MVP tardío | E11-02 |
| **B03** | Informe de partido | `/partidos/:id/informe` | Todos según permiso | MVP tardío | E11-03, E11-08 |
| **B04** | Historial de entrenamientos | `/entrenamientos` | Entrenador, Delegado | MVP tardío | E5-05 |
| **B05** | Comparador de jugadores | `/estadisticas/comparar` | Entrenador | V1.1 | E11-06 |
| **B06** | Vista de invitado | `/publico/:token` | Invitado | V1.1 | E11-07 |

### Bloque C — Sistema

| ID | Pantalla | Ruta | Quién entra | Fase | Épicas |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **C01** | Ajustes de usuario | `/ajustes` | Todos | MVP | E14-04, accesibilidad |
| **C02** | Registro de errores | `/admin/logs` | Admin | MVP | E12-05 |
| **C03** | Error de aplicación | — (Error Boundary) | Todos | MVP | E12-02 |
| **C04** | Sin conexión | — (estado, no ruta) | Todos | MVP | E9-07, E8-14 |
| **C05** | Sin permiso | `/403` | Todos | MVP | E1-07 |

**Total MVP: 21 pantallas.** De ellas, una sola concentra el riesgo: **A12, el partido en directo**.

---

## 3. Árbol de navegación

```
/login
 │
 └─ / ······················ INICIO
     │   Próximo evento · accesos rápidos · avisos pendientes
     │
     ├─ EQUIPO
     │   ├─ /club
     │   ├─ /equipos ─ /equipos/:id
     │   │              ├─ /plantilla ─ /jugadores/:id/editar
     │   │              └─ /personas          (roles e invitaciones)
     │   ├─ /competiciones ─ /competiciones/:id
     │   └─ /disciplina
     │
     ├─ AGENDA
     │   ├─ /calendario
     │   ├─ /partidos/nuevo
     │   └─ /partidos/:id
     │        ├─ /convocatoria ──┐
     │        ├─ /directo    ◄───┘  (flujo lineal del día de partido)
     │        ├─ /cierre     ◄───┘
     │        └─ /informe            (Bloque B)
     │   └─ /entrenamientos ─ /entrenamientos/:id/lista
     │
     ├─ DATOS
     │   ├─ /estadisticas
     │   ├─ /estadisticas/jugador/:id
     │   └─ /estadisticas/comparar
     │
     └─ MÁS
         ├─ /mis-aportaciones
         ├─ /ajustes
         └─ /admin/logs           (solo Admin)
```

### 3.1 Patrón de navegación

| Contexto | Patrón |
| :--- | :--- |
| **Móvil** | Barra inferior fija de 5 destinos: Inicio · Equipo · Agenda · Datos · Más. Es la zona alcanzable con el pulgar |
| **Escritorio y tablet** | Rail lateral con los mismos 5 destinos, siempre visible |
| **Partido en directo** | Toma la pantalla completa y **oculta la barra inferior**. Salir requiere una acción explícita, para evitar abandonos accidentales con el móvil en la mano |
| **Partido en curso desde otra pantalla** | Banda superior persistente «Partido en directo · 34:12 · Volver». Un toque devuelve al panel |

### 3.2 Flujo del día de partido

```
Calendario → Partido → Convocatoria → [Iniciar partido] → DIRECTO → [Finalizar] → Cierre → Informe
                            │                                │                        │
                       Titulares                       Eventos + reloj          Resolución de
                       Suplentes                       Cambios + posiciones     discordancias
                       No convocados                   Offline + cola sync      Comentarios
```

Es un flujo lineal con estados: `programado → convocado → en_juego → finalizado → cerrado`. La pantalla de cierre no se salta: sin cerrar el partido, sus datos no entran en las estadísticas de temporada.

### 3.3 Reglas de navegación

1. **Cada pantalla tiene URL propia.** Sin ella no hay enlaces desde notificación (E4-08) ni recuperación tras un cierre inesperado de la app.
2. **La pantalla de directo sobrevive a una recarga.** El estado vive en almacenamiento local, no solo en memoria.
3. **Máximo tres toques desde Inicio** hasta cualquier pantalla del Bloque A.
4. **El partido en directo está a un toque desde Inicio** cuando hay uno programado en las próximas horas o en curso.
5. **Retroceder nunca destruye datos.** Cualquier salida con eventos sin sincronizar avisa antes.

---

## 4. Anatomía del partido en directo (A12)

Es la pantalla que decide si el proyecto funciona. Se registra de pie, con una mano, al sol, con el partido en marcha y sin apartar la vista más de dos segundos.

```
┌─────────────────────────────────────────┐
│  ● 34:12   2ª parte      1 - 0     ⚠3   │  ← reloj, marcador, cola de sync
├─────────────────────────────────────────┤
│                                         │
│         CAMPO CON ALINEACIÓN            │  ← toque en jugador = menú de acción
│         (11 fichas con dorsal)          │     mantener = cambiar posición
│                                         │
├─────────────────────────────────────────┤
│  BANQUILLO  ▸ 7 suplentes               │
├─────────────────────────────────────────┤
│  ⚽ GOL   │  🟨 TARJETA  │  ⚑ FALTA     │  ← botonera principal
│  ⚐ CÓRNER │  ⇄ CAMBIO   │  ✎ NOTA      │     mínimo 48×48 px
├─────────────────────────────────────────┤
│  ÚLTIMOS EVENTOS          [Deshacer]    │  ← corrección inmediata sin salir
└─────────────────────────────────────────┘
```

**Flujo encadenado (E8-04):** `Acción → Jugador → Detalle opcional → Guardado`. Cada paso ocupa la pantalla entera con objetivos grandes. El paso de detalle siempre se puede saltar: un gol sin asistencia registrada vale más que ningún gol registrado.

**Registro diferido (E8-09):** todo evento admite corregir su minuto después de crearlo. La falta que precede al gol se apunta cuando haya calma.

---

## 5. Accesibilidad

Referencia: **WCAG 2.2 nivel AA**. Si algún día vendes la app como servicio de consumo en la UE, el nivel AA es también el punto de partida de la norma europea EN 301 549, así que aplicarlo ahora evita rehacer las pantallas después.

### 5.1 Criterios que condicionan el diseño

| Criterio | Nivel | Qué obliga a hacer aquí |
| :--- | :--- | :--- |
| **1.4.3 Contraste mínimo** | AA | 4.5:1 en texto normal, 3:1 en texto grande. El uso al sol pide apuntar más alto: 7:1 en la pantalla de directo |
| **1.4.11 Contraste no textual** | AA | 3:1 en bordes de botón, iconos de evento y series de las gráficas |
| **1.4.1 Uso del color** | A | Una tarjeta amarilla se distingue por **color + icono + texto**. Los estados `pending`/`approved`/`rejected` nunca dependen solo del color |
| **2.5.8 Tamaño del objetivo** | AA | 24×24 px CSS como mínimo legal. En A12 el mínimo real es **48×48 px con 8 px de separación** |
| **2.5.2 Cancelación del puntero** | A | La acción se dispara al **levantar** el dedo, no al pulsarlo. Permite deslizar fuera para abortar un toque erróneo. Crítico con el móvil en la mano y el partido en marcha |
| **2.5.7 Movimientos de arrastre** | AA | Si la alineación se coloca arrastrando fichas (E7-03), hace falta alternativa de un solo toque: tocar jugador → tocar posición |
| **2.5.1 Gestos del puntero** | A | Nada depende de gestos multipunto o de trazado. Todo se resuelve con un toque |
| **4.1.3 Mensajes de estado** | AA | «Gol registrado», «3 eventos pendientes de sincronizar», «Conexión recuperada» se anuncian con `aria-live="polite"` sin robar el foco |
| **2.4.11 Foco no oscurecido** | AA | La barra inferior y la banda de partido en curso son fijas: hay que garantizar que no tapen el elemento enfocado. Es el fallo más probable de este diseño |
| **2.4.7 Foco visible** | AA | Indicador de foco propio, de al menos 2 px y 3:1 de contraste. Jamás `outline: none` sin sustituto |
| **1.3.4 Orientación** | AA | Sin bloqueo de orientación. En la grada se sujeta el móvil como se puede |
| **1.4.10 Reflujo** | AA | Legible a 320 px de ancho sin desplazamiento horizontal |
| **1.4.4 Cambio de tamaño del texto** | AA | Zoom al 200 % sin pérdida de función. Nada de `user-scalable=no` |
| **3.3.7 Entrada redundante** | AA | El rival, la competición y el campo se arrastran desde el partido a la convocatoria y al directo. No se piden dos veces |
| **3.3.8 Autenticación accesible** | AA | El login con Google lo cumple: sin captcha ni pruebas de memoria |
| **3.2.6 Ayuda coherente** | AA | El acceso a ayuda o contacto ocupa siempre la misma posición relativa |
| **2.1.1 Teclado** | A | Toda función accesible por teclado. El entrenador prepara la convocatoria en el portátil |
| **1.1.1 Contenido no textual** | A | Alternativa textual en escudos, iconos de evento y **gráficas**: cada gráfica lleva su tabla de datos equivalente |
| **1.3.1 Información y relaciones** | A | Tablas de estadísticas con `<th>`, `scope` y `caption` reales. Nada de rejillas de `<div>` |
| **4.1.2 Nombre, función, valor** | A | El campo de juego, las fichas de jugador y la botonera son componentes propios: necesitan rol ARIA, nombre accesible y estado |
| **2.2.1 Tiempo ajustable** | A | El cronómetro del partido es un evento en tiempo real y queda exento. Lo que sí obliga: avisar antes de expirar la sesión y **nunca perder eventos sin sincronizar** |

### 5.2 Requisitos propios del contexto

Estos no salen de WCAG, salen del campo de fútbol.

| Requisito | Por qué |
| :--- | :--- |
| Modo de alto contraste conmutable desde Ajustes | Pantalla al sol de mediodía |
| Texto base de 16 px, nunca por debajo de 14 px | Legibilidad de pie y en movimiento |
| Botonera principal en el tercio inferior | Zona alcanzable con el pulgar |
| Respuesta háptica al registrar un evento | Confirma sin obligar a mirar |
| Confirmación visible durante 2 s tras cada registro | Evita el doble apunte por duda |
| Respeto a `prefers-reduced-motion` | Animaciones que marean o distraen en pleno partido |
| Ningún dato se pierde al bloquearse la pantalla | El móvil se apaga solo cada dos minutos |

### 5.3 Verificación

Cada pantalla se da por terminada cuando pasa esta lista:

1. `axe DevTools` sin incidencias críticas ni graves.
2. Navegación completa con teclado, foco siempre visible y nunca tapado.
3. Zoom al 200 % sin romper la maqueta.
4. Contraste medido en los estados normal, foco, activo y deshabilitado.
5. Prueba real en Android y en iPhone, en exterior y con luz directa si es del Bloque A.
6. Lighthouse con puntuación de accesibilidad ≥ 95.

---

## 6. Orden de construcción de pantallas

| Sprint | Pantallas | Meta |
| :--- | :--- | :--- |
| 1 | A01, C03, C05 | Se entra, y si algo revienta queda registrado |
| 2 | A03, A04, A05, A06 | Isaac tiene su club, su equipo y su plantilla |
| 3 | A08, A09, A10 | Reglamento configurado y calendario con partidos |
| 4 | A11 | Convocatoria lista antes del primer amistoso |
| 5–6 | **A12** | Partido en directo. Dos sprints completos, es lo más caro |
| 7 | A13, A14, C04 | Cierre, resolución de discordancias y modo offline probado |
| 8 | A07, A15, A16 | Alphatesters dentro, entrenamientos y disciplina |
| 9 | B01, B02, B03, B04 | Ya hay datos reales: llega el momento de verlos |
| 10 | C01, C02, capa visual | Ajustes, logs y chapa y pintura |
