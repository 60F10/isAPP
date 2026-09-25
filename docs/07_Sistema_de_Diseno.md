# DOC 07 — Sistema de diseño y tokens

> **Versión:** 1.2 — 25/09/2026 (T-107: §4, dónde se guarda hoy el alto contraste) · 1.1 — 13/09/2026 (T-103: iconos sin SVGR, tokens de control, hoja global) · 1.0 — 12/09/2026
> **Para qué sirve:** fija el color, la tipografía, el espaciado, el movimiento y los componentes base de GavetaStats. Es la única fuente de verdad de la capa visual.
> **Se apoya en:** DOC 02 (accesibilidad y pantallas), DOC 03 bloque F (identidad), DOC 04 §7 (catálogo de eventos), DOC 06 §6 (dónde viven los tokens)
> **Alimenta a:** DOC 08 (tareas) y todo el código de interfaz
> **Archivos asociados:** `src/styles/tokens.css` y `src/styles/base.css`, importados una sola vez y en ese orden desde `src/app/main.tsx`

---

## 1. De dónde sale esto

| Decisión                                              | Origen               |
| :---------------------------------------------------- | :------------------- |
| Neutro frío con acento índigo, tema claro por defecto | DOC 03 · F3          |
| Inter variable autoalojada, familia única             | DOC 03 · F3 (12/09)  |
| Iconos propios en SVG, sin librería                   | DOC 03 · F2          |
| Alto contraste anula el color del equipo              | DOC 03 · F3          |
| 48×48 px, texto de 16 px, foco visible, 7:1 al sol    | DOC 02 · §5.1 y §5.2 |
| Tokens en `:root`, color de equipo inyectable         | DOC 06 · §6          |

El tema oscuro queda fuera del MVP. Duplica cada token y obliga a medir dos veces cada contraste, y el problema real —la pantalla al sol— lo resuelve el modo de alto contraste, no el oscuro.

---

## 2. Color

### 2.1 Escalas

Dos escalas primitivas, neutro frío e índigo, más tres semánticas. Los valores viven en `tokens.css` §1. Cada uno lleva anotado su contraste medido contra blanco puro.

**Umbrales que manda el DOC 02:**

| Uso                                       | Mínimo  |
| :---------------------------------------- | :------ |
| Texto en pantallas del Bloque A (directo) | **7:1** |
| Texto normal en el resto                  | 4.5:1   |
| Texto grande, bordes de control, iconos   | 3:1     |

**Consecuencia práctica:** `--gray-500` (5.20) sirve como texto secundario en listados y ajustes, pero **queda prohibido en la pantalla de directo**. Ahí el secundario es `--gray-600` (7.84). Lo mismo con el acento: `--indigo-500` fuera del directo, `--indigo-600` dentro.

`--gray-300` no vale como borde de control: se queda en 1.92 y no llega al 3:1 del criterio 1.4.11. Los bordes de control usan `--gray-400`; `--gray-200` queda para separadores decorativos, que no portan información.

### 2.2 Estados del dato

Los tres estados de `match_events` tienen color, icono y texto. Nunca solo color.

| Estado     | Tinta              | Fondo                   | Icono | Texto      |
| :--------- | :----------------- | :---------------------- | :---- | :--------- |
| `pending`  | `--color-pending`  | `--color-pending-soft`  | reloj | Pendiente  |
| `approved` | `--color-approved` | `--color-approved-soft` | visto | Aprobado   |
| `rejected` | `--color-rejected` | `--color-rejected-soft` | aspa  | Descartado |

Ámbar, verde y rojo se distinguen por luminosidad además de por tono, así que sobreviven a la deuteranopía y a la protanopía: 7.27, 8.16 y 8.01 sobre blanco. Aun así, el icono y la palabra mandan.

### 2.3 Fiabilidad

El indicador del DOC 03 §G3 —«Fiabilidad media · 56 %»— **no usa la paleta de estados**. Si la fiabilidad alta se pintara de verde, se confundiría con un dato aprobado, que es otra cosa: un dato aprobado puede tener fiabilidad baja y al revés. El indicador va en neutro (`--color-text-secondary`) con un icono de tres barras que se rellenan según el nivel, más el porcentaje en texto.

### 2.4 Tarjetas del árbitro

Amarilla y roja se pintan con su color real, que aquí es información del objeto, no decoración. La amarilla solo admite tinta `--gray-900` encima (10.73). Ambas llevan icono y texto: en alto contraste el relleno desaparece y quedan la forma y la palabra.

---

## 3. El color del equipo

`--color-team` lo inyecta el frontend desde `teams.primary_color` (DOC 06 §6).

**Dónde se usa:** cabecera de la pantalla de equipo, marco del escudo, franja de identificación en listas de partidos, series de gráficas de ese equipo.

**Dónde no se usa nunca:** texto, estados, avisos, botones primarios, iconos de evento y cualquier dato del que dependa una lectura. Lo teclea el usuario y puede ser un amarillo flúor; ningún contraste se puede garantizar sobre un valor libre.

**Tinta encima.** La calcula el frontend al inyectar, por luminancia relativa, y la escribe en `--color-team-ink`:

```ts
// src/shared/lib/pickInk.ts
const channel = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** Devuelve la tinta legible sobre un color de equipo arbitrario. */
export function pickInk(hex: string): '#ffffff' | '#141922' {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const l = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  // Contraste contra blanco y contra el gris 900; gana el mayor.
  return 1.05 / (l + 0.05) >= (l + 0.05) / 0.0603 ? '#ffffff' : '#141922';
}
```

En alto contraste `--color-team` pasa a negro y la distinción entre equipos queda en la posición y el nombre, como ya ocurre en el resto de pantallas.

---

## 4. Modo de alto contraste

Conmutable desde Ajustes. Escribe `data-contrast="high"` en `<html>` y redefine el bloque de variables. Lo que cambia:

- Texto a negro puro sobre blanco puro: 21:1.
- Bordes negros en todo control, y el anillo de foco sube a 4 px.
- Fondos suaves de estado a blanco: el estado queda en icono, texto y tinta.
- Sombras fuera. La elevación pasa a ser un borde.
- El color del equipo desaparece.

La preferencia se guarda en el perfil del usuario y se aplica antes del primer pintado, para que no haya parpadeo al abrir con el móvil ya al sol.

**Hoy se guarda en el dispositivo, no en el perfil (T-107, D06-25 del DOC 06).** `profiles` no tiene columna para ella y hace falta una migración. Se aplica igual antes de cargar la aplicación, desde `localStorage`. El movimiento reducido de Ajustes sigue el mismo camino con `data-motion="reduced"`, que pone a cero las mismas duraciones que `prefers-reduced-motion`.

---

## 5. Tipografía

### 5.1 La fuente

**Inter variable, autoalojada.** Licencia SIL OFL 1.1, así que se puede servir desde el propio dominio sin coste ni dependencia de terceros: el presupuesto sigue en 0 € y la PWA no pide nada a un servidor ajeno estando sin red.

| Punto           | Resolución                                                                     |
| :-------------- | :----------------------------------------------------------------------------- |
| Archivo         | `public/fonts/InterVariable-latin.woff2`, subconjunto latino                   |
| Grosores        | Uno solo: el archivo variable cubre de 100 a 900                               |
| Cursiva         | No se descarga. La interfaz no la usa                                          |
| Carga           | `font-display: swap`. En la segunda visita sale del precaché y no hay parpadeo |
| Precaché        | Añadir `woff2` a los `globPatterns` de `vite-plugin-pwa` (DOC 06 §9)           |
| Descarga a mano | Se coge la versión variable del proyecto Inter y se coloca en `public/fonts/`  |

> **Ojo: el archivo todavía no está** (13/09/2026). El `@font-face` vive en `tokens.css` desde la T-101 y apunta a una ruta vacía. La familia de reserva —`system-ui` y siguientes— funciona y no se rompe nada, pero el servidor devuelve `index.html` para esa ruta y el navegador deja dos avisos por carga al no poder decodificarlo como fuente. **Lo cierra la T-102**, que es quien descarga el archivo y lo mete en el precaché.

Se descartó Helvetica: es una fuente comercial de Monotype, la licencia web se paga y solo está instalada de serie en iPhone y Mac, así que ni pagándola se vería igual en Android.

### 5.2 Escala

Base 16 px, razón 1.25, suelo en 14 px.

| Token             | Tamaño | Uso                                              |
| :---------------- | :----- | :----------------------------------------------- |
| `--font-size-75`  | 14 px  | Etiquetas de campo y pies. Nada de texto corrido |
| `--font-size-100` | 16 px  | Texto base de toda la aplicación                 |
| `--font-size-200` | 18 px  | Nombre de jugador en ficha y en botonera         |
| `--font-size-300` | 22 px  | Título de sección                                |
| `--font-size-400` | 28 px  | Título de pantalla                               |
| `--font-size-500` | 36 px  | Marcador                                         |
| `--font-size-600` | 44 px  | Reloj del directo                                |

**Cifras tabulares obligatorias** en reloj, marcador, minutos y toda columna numérica: `font-variant-numeric: tabular-nums`. Sin ellas el reloj baila a cada segundo y obliga a mirar dos veces, que es justo lo contrario de lo que busca la pantalla de directo.

Los títulos de 28 px en adelante llevan `--letter-spacing-tight`. Inter se abre demasiado en tamaños grandes con el espaciado por defecto.

---

## 6. Espaciado, radios, elevación y movimiento

Espaciado en múltiplos de 4 px. Radios en tres pasos más la píldora. Dos niveles de elevación: la superficie que se levanta y la capa que tapa.

El movimiento se queda en 120 ms para respuestas de control y 200 ms para transiciones de capa. Con `prefers-reduced-motion` ambos pasan a cero: en pleno partido una animación que distrae cuesta un evento sin registrar.

**`--duration-toast`, los 2 s de la confirmación de registro, se queda fuera de esa regla a propósito.** No es movimiento, es tiempo de lectura: ponerlo a cero haría desaparecer el aviso al instante justo para quien ha pedido menos animación.

**Tokens de estado de control, añadidos en la T-103.** Los componentes no pueden escribir un color, así que el pulsado y el deshabilitado necesitan el suyo:

| Token                                                                     | Para qué                                                                                                                                                             |
| :------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--color-accent-active`                                                   | Botón primario pulsado. Índigo 800, 12.09                                                                                                                            |
| `--color-surface-pressed`                                                 | Pulsado del resto. Gris muy claro, 18.5 con la tinta principal encima. Sobrevive al alto contraste: es la única señal de que el dedo cayó dentro                     |
| `--color-disabled-bg`, `--color-disabled-text`, `--color-disabled-border` | Control inactivo. El criterio 1.4.3 los exime del contraste mínimo, pero la tinta se queda en 6.59 sobre su propio fondo: un botón que no se lee tampoco se entiende |
| `--icon-sm`, `--icon-md`, `--icon-lg`                                     | 20, 24 y 32 px de lienzo de icono. En `rem`, para que acompañen al zoom del texto al 200 % (criterio 1.4.4)                                                          |

---

## 7. Objetivos táctiles, foco y gesto

| Regla                                                       | Token         |
| :---------------------------------------------------------- | :------------ |
| Todo control mide 48×48 px como mínimo                      | `--tap-min`   |
| Separación mínima entre controles: 8 px                     | `--tap-gap`   |
| Botón de evento del directo: 72 px de alto                  | `--tap-event` |
| Foco visible de 3 px con 2 px de separación, contraste 7.62 | `--focus-*`   |

**La acción se dispara al levantar el dedo.** En la práctica: los manejadores van en `onClick`, nunca en `onPointerDown` ni en `onTouchStart`. `click` se emite al soltar y se cancela si el dedo sale del control antes, que es exactamente lo que pide el criterio 2.5.2 y lo que salva un toque erróneo con el partido en marcha.

**Confirmación de registro:** respuesta háptica corta más una confirmación visible durante 2 s. La háptica se pide con `navigator.vibrate(30)` y se degrada sola en iPhone, donde no existe: por eso la confirmación visual es obligatoria y la háptica un extra.

---

## 8. Iconografía

Sin librería. Veintiún SVG propios, monocolor, dibujados contra un contrato fijo para que la sustitución futura sea cambiar archivos y no tocar pantallas.

### 8.1 Contrato del icono

| Punto         | Valor                                                                                                                                                                  |
| :------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lienzo        | `viewBox="0 0 24 24"`                                                                                                                                                  |
| Trazo         | 2 px, extremos y uniones redondeados                                                                                                                                   |
| Color         | `stroke="currentColor"` y `fill="none"`. Ningún color escrito dentro                                                                                                   |
| Tamaño        | Lo fija quien lo usa con `--icon-sm`, `--icon-md` o `--icon-lg`. Por defecto, 24 px. **El archivo no lleva `width` ni `height`**: los pondría por encima de los tokens |
| Accesibilidad | `aria-hidden="true"`. El nombre accesible lo pone el control que lo lleva                                                                                              |
| Ubicación     | `src/shared/ui/icons/<nombre>.svg`, con el registro en `registry.ts`                                                                                                   |
| Importación   | Como texto, con el sufijo `?raw` de Vite. Sin SVGR (§8.4)                                                                                                              |
| Consumo       | Un único componente `<Icon name="goal" />`                                                                                                                             |

### 8.2 Inventario

**De evento, uno por tipo activo en el MVP (DOC 04 §7.1):** `goal`, `own_goal`, `yellow_card`, `second_yellow`, `red_card`, `foul_committed`, `foul_received`, `corner`, `substitution`, `position_change`, `note`. Once.

Los ocho tipos apagados no se dibujan hasta que se enciendan.

**De interfaz:** `check`, `close`, `clock`, `reliability`, `sync`, `chevron`, `plus`, `settings`, `user`, `team`. Diez.

### 8.3 Aviso

Dibujar veintiún iconos son tres o cuatro horas que no van a la pantalla de directo. Si el calendario aprieta camino del 25 de octubre, el MVP puede salir con los once de evento dibujados y los diez de interfaz resueltos con formas elementales. Queda anotado como deuda asumida, no como descuido.

**Cerrado el 12/09:** los veintiún están dibujados y en el repositorio. La deuda no llegó a vencer.

### 8.4 Cómo entran los SVG en el código, y por qué no con SVGR (T-103)

La v1.0 de este documento daba SVGR por hecho. Al montar el componente se vio que **SVGR no está instalado ni figura en la lista cerrada de dependencias del DOC 06 §2.3**, y la regla D06-01 obliga a justificar cada paquete nuevo por el problema que resuelve.

**Lo elegido: `?raw`.** Cada `.svg` entra como texto con el sufijo de Vite y el componente lo inyecta tal cual dentro de un envoltorio que solo pone el tamaño. El `viewBox`, el trazo, el `currentColor` y el `aria-hidden` siguen viviendo en el propio archivo, así que la promesa del §8 —«que la sustitución futura sea cambiar archivos y no tocar pantallas»— se cumple igual y sin dependencia nueva. Añadir un icono es dejar el `.svg` en la carpeta y sumar su línea en `registry.ts`.

**Lo descartado:**

| Salida                                  | Por qué no                                                                                                                                                                |
| :-------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `vite-plugin-svgr`                      | Una dependencia de mantenimiento para ganar un envoltorio que cuesta seis líneas de CSS. Ninguna ventaja que la regla D06-01 justifique                                   |
| Sprite con `<use href="/sprite.svg#…">` | Mete una petición de red en la pantalla de directo, que es la que tiene que abrir sin cobertura, y un archivo generado que hay que mantener a la par de los 21 originales |
| Iconos escritos a mano en TSX           | Dos fuentes de verdad para el mismo dibujo. El primer retoque de un icono las desincroniza                                                                                |

**El coste, que conviene saber:** el componente usa `dangerouslySetInnerHTML`. El contenido son archivos del propio repositorio, no entrada de usuario, y la alternativa era la dependencia. Si algún día un icono llegara de fuera del repositorio —de una API, de un campo de base de datos—, esto deja de valer y hay que volver a plantearlo.

---

## 9. Componentes base

Cada uno con su `.module.css` al lado, consumiendo solo variables.

| Componente             | Notas                                                                                                                                                                                                     |
| :--------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`               | Variantes `primary` (relleno índigo, tinta blanca, 7.62), `secondary` (borde `--gray-400`) y `ghost`. Alto mínimo 48 px                                                                                   |
| `EventButton`          | 72 px de alto, icono de 32 px sobre etiqueta de 18 px. Ocupa el tercio inferior. Estado presionado visible sin depender del color. Lleva accesible la definición del DOC 04 §7.6 sin salir de la pantalla |
| `StatusChip`           | Tinta, fondo suave, icono y palabra. Los tres estados del §2.2                                                                                                                                            |
| `ReliabilityMeter`     | Barras más nivel más porcentaje, en neutro (§2.3)                                                                                                                                                         |
| `Field`                | Etiqueta siempre visible, nunca `placeholder` como etiqueta. Error con icono y texto                                                                                                                      |
| `Card`                 | Superficie elevada con `--shadow-raised`, que en alto contraste pasa a borde                                                                                                                              |
| `Toast`                | Confirmación de 2 s, `aria-live="polite"`, por encima de la botonera                                                                                                                                      |
| `Clock` y `Scoreboard` | Cifras tabulares, 44 y 36 px, contraste 17.62                                                                                                                                                             |

### 9.1 Qué está construido (T-103, 13/09/2026)

| Componente             | Estado                                                                      |
| :--------------------- | :-------------------------------------------------------------------------- |
| `Icon`                 | ✅ `src/shared/ui/Icon.tsx`, con los 21 iconos                              |
| `Button`               | ✅ Tres variantes, icono delante o detrás, ancho completo                   |
| `Field`                | ✅ Solo `input`. `textarea` y `select` cuando alguna pantalla los pida      |
| `Card`                 | ✅                                                                          |
| `Toast`                | ✅                                                                          |
| `StatusChip`           | ✅                                                                          |
| `EventButton`          | ⬜ Es de la T-208, que es la que sabe cómo se registra un evento            |
| `ReliabilityMeter`     | ⬜ Espera a que exista el cálculo de cobertura                              |
| `Clock` y `Scoreboard` | ⬜ De la T-207. La clase `.tabular` de `base.css` ya está puesta para ellos |

**Sin barril en `shared/ui`.** Cada pantalla importa el componente que usa, `@shared/ui/Button` y no `@shared/ui`. Un barril mete los seis en el grafo por pedir uno, y el presupuesto del DOC 06 §10.3 no está para regalar kilobytes.

**Dos reglas de accesibilidad que el tipo hace cumplir, no la revisión:** un `Button` sin texto visible no compila sin `aria-label`, y un `Field` no se puede montar sin `label`. Lo que se puede cerrar en el tipo, se cierra ahí.

### 9.2 La hoja global

`src/styles/base.css` acompaña a `tokens.css` y no hace nada más que lo imprescindible: normalizar la caja, atar la tipografía, el color y el fondo del documento a las variables, dejar el anillo de foco visible de serie y poner una red de seguridad de `prefers-reduced-motion` para lo que no pase por los tokens. Lleva además una única clase de utilidad, `.tabular`, para las cifras que no deben bailar (§5.2).

Las dos hojas se importan desde `src/app/main.tsx` y **en ese orden, antes que cualquier otra cosa**: el orden de importación es el orden del CSS en el paquete, y las variables tienen que estar declaradas antes de que las use el primer `.module.css`.

---

## 10. Reglas que no se negocian

1. Ningún valor literal de color, tamaño o duración fuera de `tokens.css`.
2. El color nunca porta información solo: siempre con icono y texto.
3. El color del equipo no entra en nada que haya que leer.
4. Nada por debajo de 14 px, y el texto corrido nunca baja de 16 px.
5. `outline: none` solo si hay un indicador de foco propio en su lugar.
6. En pantallas del Bloque A, 7:1 o no entra.

---

## 11. Verificación

La del DOC 02 §5.3, sin cambios. Se añade una comprobación al sistema de diseño: **cada token de color nuevo entra con su contraste medido escrito al lado**, como están los actuales. Un token sin cifra es un token que nadie ha comprobado.

---

## 12. Deuda y fuera de alcance

| Punto                                              | Estado                                                                                                                                                                                                                              |
| :------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tema oscuro                                        | Fuera del MVP. Duplica tokens y contrastes                                                                                                                                                                                          |
| Veintiún iconos por dibujar                        | ✅ Cerrada el 12/09. Los veintiuno están en `src/shared/ui/icons/`                                                                                                                                                                  |
| **`public/fonts/InterVariable-latin.woff2`**       | **Abierta y con consecuencia visible.** El `@font-face` del §5.1 apunta a un archivo que todavía no existe: la familia de reserva funciona, pero el navegador deja dos avisos por carga y `vite build` otro. **La cierra la T-102** |
| Identidad definitiva (logo y marca)                | Aplazada a la diseñadora, DOC 03 §F                                                                                                                                                                                                 |
| Subconjunto de Inter afinado por caracteres reales | Abierta. El subconjunto latino basta; afinar ahorraría unos kB                                                                                                                                                                      |
| `Field` solo cubre `input`                         | Abierta. Se amplía a `textarea` o `select` cuando una pantalla los pida                                                                                                                                                             |
| `Icon` usa `dangerouslySetInnerHTML`               | Asumida. Solo vale mientras el SVG venga del repositorio (§8.4)                                                                                                                                                                     |
| Componentes de gráfica                             | Pendientes del bloque de visualización, que va después de la entrada de datos                                                                                                                                                       |
