# DOC 06 — Arquitectura frontend y convenciones

> **Versión:** 2.8 — 04/10/2026 (T-209b: §5.4 con D06-38, Realtime es solo el aviso, el dato sale de volver a descargar y se funde con lo del aparato) · 2.7 — 04/10/2026 (T-209a: §5.4 con D06-37, la cobertura declarada vive en la instantánea, fuera del reductor, y viaja por la cola) · 2.6 — 04/10/2026 (T-217: §5.4 con D06-36, el reglamento y la convocatoria salen siempre del paquete, y el diferido mira el minuto del evento) · 2.5 — 04/10/2026 (T-216: §8.5 con D06-35, la cola solo la vacía la pestaña visible) · 2.4 — 04/10/2026 (T-213: §4.2 con D06-34, Inicio la sirve `agenda`) · 2.3 — 26/09/2026 (T-208: D06-33, el registro de eventos) · 2.2 — 26/09/2026 (T-207: D06-29 a D06-32, la A12 perezosa, el estado y la cola en una transacción, y la marca de partido en curso) · 2.1 — 26/09/2026 (T-206: §8.3 a §8.5 con D06-26, D06-27 y D06-28, transporte de la cola y presupuesto tras Dexie) · 2.0 — 26/09/2026 (T-201: §10.1, las actualizaciones que la RLS rechaza sin error) · 1.9 — 25/09/2026 (T-107: §5.5 con `reintentarContexto` y el cierre de sesión, §9.3 con D06-25, preferencias en el dispositivo) · 1.8 — 25/09/2026 (T-106: §10.1 con las tres capas montadas, D06-23 y §10.3 al día) · 1.7 — 25/09/2026 (§11: D06-24 —publicada como D06-22 por error—, TypeScript estricto explícito y tres reglas de `oxlint` contra `any`, `!` y comentarios `@ts-`) · 1.6 — 20/09/2026 (T-105: §2.2, §5.5 y §10.3 al día; el acceso con Google, enchufado) · 1.5 — 19/09/2026 (§11: el arnés de pruebas montado y corriendo en el CI, con `env.ts` como primera prueba; §2.2 y §3.1 al día) · 1.4 — 19/09/2026 (§3.4: el MVP son 19 pantallas, no 21) · 1.3 — 18/09/2026 (§10.3: el presupuesto, resuelto con la medición real) · 1.2 — 12/09/2026 (T-101: alias corregidos, peso del paquete medido) · 1.1 el mismo día · 1.0 — 11/09/2026
> **Depende de:** DOC 02 (pantallas y rutas), DOC 03 (decisiones cerradas), DOC 04 (reglas de negocio), DOC 05 (modelo de datos), DOC 15 (convenciones de Git)
> **Alimenta a:** DOC 07 (sistema de diseño), DOC 08 (tareas), DOC 09 (observabilidad), DOC 10 (entornos)

---

## 1. Para qué sirve este documento

Fija dónde vive cada archivo, quién puede importar a quién, cómo se guarda el estado y cómo sobrevive un partido sin cobertura. Cada decisión va con la alternativa que se descartó y el motivo, para que dentro de tres meses nadie vuelva a discutirla sin argumento nuevo.

Lo que este documento **no** hace: elegir colores, tipografías ni componentes visuales. Eso es el DOC 07.

Las decisiones llevan identificador `D06-nn`. Se citan desde los commits, desde las tareas del DOC 08 y desde los traspasos del DOC 13.

---

## 2. Punto de partida

### 2.1 Lo que ya existe en el repositorio

React 19 + Vite 8 + TypeScript 6 con la plantilla `react-ts`, `oxlint`, Prettier, Husky, commitlint, CI de GitHub y `netlify.toml` con la redirección de SPA y las cabeceras de caché. Node 22 fijado en `.nvmrc`.

`src/` seguía con el contenido de la plantilla: `App.tsx`, `App.css`, `index.css`, `main.tsx` y los recursos de ejemplo. **Se borró en la T-101**, que movió el punto de entrada a `src/app/main.tsx`.

### 2.2 Lo que falta y este documento decide

Columna de estado al cerrar la **T-102**. Las decisiones de este documento no cambian; lo que cambia es cuánto de ellas está ya en el repositorio.

| Pieza                | Estado                                                                                |
| :------------------- | :------------------------------------------------------------------------------------ |
| Enrutador            | **Hecho** en la T-104: `src/app/router.tsx`. Se decide en §6                          |
| Cliente de Supabase  | **Hecho**: `src/shared/lib/supabase.ts`. Se decide en §7                              |
| Caché de lectura     | **Hecha** en la T-104: `app/providers/QueryProvider.tsx`. Se decide en §5             |
| Almacén local y cola | **Hecho** en la T-206: `shared/lib/db.ts` y `modules/sync`. Se decide en §8           |
| `vite-plugin-pwa`    | **Hecho** en la T-102: manifiesto, iconos y service worker. Se decide en §8.7         |
| Pruebas              | **Hecho** el 19/09: bloque `test` en `vite.config.ts` y paso de CI. Se decide en §11  |
| Esquema de la base   | **Aplicado** a GavetaStats: cuatro migraciones (DOC 05 §14)                           |
| Login con Google     | **Hecho** en la T-105: entrada, vuelta por `/auth/callback`, equipo activo y permisos |

### 2.3 Dependencias que se añaden

Todas caben en el presupuesto de 0 €, ninguna pide cuenta ni servicio nuevo.

```bash
npm i react-router @tanstack/react-query @supabase/supabase-js dexie
npm i -D vite-plugin-pwa vitest @vitest/coverage-v8 jsdom fake-indexeddb \
         @testing-library/react @testing-library/user-event @testing-library/jest-dom supabase
```

De las cuatro dependencias de producción, el grueso del peso lo pone `@supabase/supabase-js`; el enrutador, la caché y Dexie suman poco más de 50 kB comprimidos entre las tres.

**Medido en la T-101** con `vite build`, sobre un `main.tsx` que no pinta nada:

| Qué entra en el grafo                          | Crudo     | Comprimido    |
| :--------------------------------------------- | :-------- | :------------ |
| React 19 y ReactDOM                            | 219,70 kB | 68,64 kB      |
| Lo anterior más `@supabase/supabase-js`        | 436,08 kB | 124,10 kB     |
| Lo anterior más el enrutador, la caché y Dexie | 643,55 kB | **190,27 kB** |

O sea el 95 % del presupuesto de 200 kB del §10.3 gastado en dependencias, antes de la primera pantalla. Las consecuencias y las salidas están en §10.3.

**Regla de dependencias nuevas (D06-01).** Cualquier paquete que no esté en esa lista entra con una nota en el DOC 13 que diga qué problema resuelve y qué se evaluó antes. Una dependencia es código que hay que mantener sin haberlo escrito.

---

## 3. Estructura de carpetas

### 3.1 El árbol

```
App/
├── docs/                         # documentación viva (DOC 00–15)
├── public/                       # iconos, manifiesto, recursos sin procesar
├── supabase/
│   └── migrations/               # esquema versionado (DOC 05 §14)
├── src/
│   ├── app/                      # arranque de la aplicación
│   │   ├── main.tsx              # punto de entrada
│   │   ├── App.tsx               # proveedores + enrutador
│   │   ├── router.tsx            # árbol de rutas del DOC 02 §3
│   │   ├── providers/            # QueryProvider, AuthProvider, SyncProvider
│   │   ├── layouts/              # AppLayout (barra inferior / rail), BareLayout
│   │   └── guards/               # RequireAuth, RequirePermission
│   ├── modules/                  # un directorio por módulo del principio P3
│   │   ├── auth/
│   │   ├── core/
│   │   ├── rules/
│   │   ├── agenda/
│   │   ├── lineup/
│   │   ├── match/
│   │   ├── review/
│   │   ├── training/
│   │   ├── discipline/
│   │   ├── stats/
│   │   ├── sync/
│   │   └── logging/
│   ├── shared/                   # lo que usan tres módulos o más
│   │   ├── ui/                   # componentes sin lógica de negocio
│   │   ├── hooks/
│   │   ├── lib/                  # supabase.ts, db.ts, env.ts, time.ts
│   │   └── utils/
│   ├── styles/                   # tokens y hojas globales (DOC 07)
│   ├── test/
│   │   └── setup.ts              # preparación común de Vitest (§11)
│   └── types/
│       └── database.types.ts     # generado desde Supabase, nunca a mano
└── index.html
```

### 3.2 Qué hay dentro de un módulo

```
modules/match/
├── api/            # acceso a datos: una función por operación
├── model/          # tipos y lógica pura, sin React ni red
├── hooks/          # hooks de React que atan model + api a la pantalla
├── components/     # piezas de interfaz propias del módulo
├── routes/         # un archivo por pantalla del DOC 02
└── index.ts        # contrato público: lo único que otro módulo puede importar
```

`model/` es la carpeta más importante y la que más se prueba: cálculo del reloj, reducción del estado del partido, detección de duplicados, validación de convocatoria. Son funciones puras. Si algo de ahí necesita `import React`, está mal colocado.

**D06-02 · Carpetas por módulo, no por tipo técnico.**
Se descartó agrupar por `components/`, `hooks/`, `pages/`, `services/` en la raíz de `src/`. Con esa forma, tocar el partido en directo obliga a abrir cuatro carpetas lejanas entre sí y nada impide que `stats` acabe importando el reloj. Rompe el principio P3 desde el primer mes.
También se descartó el _Feature-Sliced Design_ completo, con sus capas `shared / entities / features / widgets / pages`: resuelve un problema de equipos grandes al precio de una ceremonia que un solo desarrollador paga cada día.
Ventaja añadida: los directorios de `modules/` coinciden uno a uno con los ámbitos de commit del DOC 15, así que el ámbito del commit sale solo de la ruta del archivo.

### 3.3 Los módulos que no son carpeta

Tres ámbitos del DOC 15 no tienen directorio propio en `modules/`, y conviene dejar escrito dónde caen:

| Ámbito     | Dónde vive                                                                       |
| :--------- | :------------------------------------------------------------------------------- |
| `platform` | `src/app/`, `shared/lib/pwa.ts`, `shared/hooks/`, `vite.config.ts`, `index.html` |
| `design`   | `src/styles/` y `src/shared/ui/`                                                 |
| `db`       | `supabase/migrations/` y `src/types/database.types.ts`                           |

### 3.4 Reparto de las pantallas del MVP

Cada pantalla del DOC 02 pertenece a un solo módulo. El módulo dueño es quien la construye, la prueba y la arregla.

| Módulo       | Pantallas               |
| :----------- | :---------------------- |
| `auth`       | A01, A07, C05           |
| `core`       | A02, A03, A04, A05, A06 |
| `rules`      | A08                     |
| `agenda`     | A09, A10                |
| `lineup`     | A11                     |
| `match`      | **A12**                 |
| `review`     | A13, A14                |
| `training`   | A15                     |
| `discipline` | A16                     |
| `stats`      | B01, B02, B03, B04      |
| `logging`    | C02, C03                |
| `sync`       | C04 (estado, no ruta)   |
| `platform`   | C01                     |

---

## 4. Límites entre módulos

### 4.1 Las cinco reglas

1. `app/` puede importar de cualquier módulo y de `shared/`. Nadie importa de `app/`.
2. Un módulo importa **libremente dentro de sí mismo** por ruta relativa.
3. Un módulo importa de otro **solo a través de su `index.ts`**, y solo si la tabla de §4.2 lo permite. Nunca `modules/match/model/clock` desde fuera de `match`.
4. `shared/` no importa de `modules/` **jamás**. Si una pieza de `shared/` necesita saber qué es un partido, no es compartida: es de `match`.
5. Prohibidos los ciclos. Si A necesita de B y B de A, la pieza común sube a `shared/` o baja a un módulo nuevo.

### 4.2 Grafo permitido

| Módulo       | Puede importar de                                   |
| :----------- | :-------------------------------------------------- |
| `logging`    | `shared`                                            |
| `sync`       | `shared`, `logging`                                 |
| `auth`       | `shared`, `logging`                                 |
| `core`       | `shared`, `auth`                                    |
| `rules`      | `shared`, `auth`, `core`                            |
| `agenda`     | `shared`, `auth`, `core`, `rules`                   |
| `lineup`     | `shared`, `auth`, `core`, `rules`, `agenda`         |
| `match`      | `shared`, `auth`, `core`, `rules`, `lineup`, `sync` |
| `review`     | `shared`, `auth`, `core`, `match`, `sync`           |
| `training`   | `shared`, `auth`, `core`                            |
| `discipline` | `shared`, `auth`, `core`, `match` (solo tipos)      |
| `stats`      | `shared`, `auth`, `core`                            |

**`sync` no conoce a `match`.** Es la regla que sostiene la decisión C5 del DOC 03: la cola se escribe genérica aunque solo se enchufe al directo. `match` empuja trabajos a la cola; la cola no sabe qué es un gol. El día que la convocatoria o los entrenamientos necesiten funcionar sin red, se añade un tipo de entidad y nada más.

**`stats` no conoce a `match`.** Lee las vistas del DOC 05 §11 y nada más. Si mañana el cálculo pasa a precalculado, `stats` no se entera.

**D06-34 · Inicio la sirve `agenda`, y `HomePage` no importa de `agenda` (T-213).** La A02 vive en `core` y su tarjeta «Próximo evento» necesita el calendario, que es de `agenda`; la tabla de arriba no deja a `core` importar de `agenda`, y abrirle esa puerta cerraría un ciclo, porque `agenda` ya importa de `core`. Se resuelve como la D06-28: `HomePage` expone un enganche, la prop opcional `proximoEvento`, y `agenda` la envuelve con `routes/InicioPage`, que es la pantalla que carga la ruta índice del enrutador por el barril de `agenda`. Sin la prop, la tarjeta enseña su estado vacío. El próximo partido lo elige `proximoPartido` —el que está en juego y, si no hay, el primero por fecha de los que quedan por jugar— sobre la misma consulta del calendario, sin llamada nueva a la base, y lo pinta `ResumenDePartido`, el componente que comparten la A09 y la tarjeta, con las mismas acciones y los mismos permisos. Los dos componentes no salen del módulo. Coste: entrar en Inicio descarga el trozo de `agenda` además del de `core`.

### 4.3 Cómo se hace cumplir

`oxlint` todavía no valida rutas de importación entre carpetas con la precisión que esto pide, así que de momento la regla es humana y se comprueba en la revisión del PR: el subagente `revisor` mira los `import` del diff. Queda anotado como deuda en §13.

Alias de importación en `tsconfig.app.json` y en `vite.config.ts`, para que la regla se vea en el propio import:

```json
"paths": {
  "@app/*": ["./src/app/*"],
  "@modules/*": ["./src/modules/*"],
  "@shared/*": ["./src/shared/*"],
  "@app-types/*": ["./src/types/*"]
}
```

Un `import { useMatchClock } from '@modules/match'` se lee como contrato. Un `import ... from '../../../match/model/clock'` canta que alguien se saltó la valla.

**Corregido en la v1.2, con la herramienta delante.** La v1.1 escribía `"baseUrl": "."` y `"@types/*"`, y ninguna de las dos cosas compila con el `tsc` de este proyecto:

- TypeScript 6 da `baseUrl` por obsoleto y aborta con **TS5101**. Sin `baseUrl`, las rutas de `paths` tienen que ser relativas a la carpeta del propio `tsconfig` (**TS5090**): de ahí el `./` delante de cada una.
- TypeScript rechaza con **TS6137** cualquier importación que empiece por `@types/`, porque reserva ese prefijo para los paquetes de declaraciones. El alias pasa a **`@app-types/*`**.

El mismo mapa se repite en `resolve.alias` de `vite.config.ts`, con rutas absolutas resueltas desde `import.meta.url`. Son dos sitios y se tocan a la vez: TypeScript resuelve con el `tsconfig` y Vite con el suyo, y una desviación entre los dos compila pero no arranca.

Dentro de un mismo módulo la ruta relativa sigue siendo la correcta (regla 2 del §4.1): `supabase.ts` importa `./env`, no `@shared/lib/env`.

---

## 5. Gestión de estado

### 5.1 Cuatro clases de estado, cuatro herramientas

El error clásico es meterlo todo en un almacén global. Aquí el estado se separa por naturaleza, y cada clase tiene un sitio.

| Clase           | Qué es                                                         | Dónde vive                           | Herramienta          |
| :-------------- | :------------------------------------------------------------- | :----------------------------------- | :------------------- |
| **De servidor** | Todo lo que está en Supabase: plantilla, calendario, eventos   | Caché de consultas                   | TanStack Query       |
| **De partido**  | Reloj, alineación en pista, eventos sin sincronizar            | Reductor propio + IndexedDB          | `useReducer` + Dexie |
| **De sesión**   | Usuario, equipo activo, temporada activa, permisos             | Un contexto de React, creado una vez | `AuthProvider`       |
| **De interfaz** | Modal abierto, paso del flujo encadenado, pestaña seleccionada | Componente que lo usa                | `useState`           |

**Regla que evita el 90 % de los fallos de sincronía: el estado de servidor nunca se copia a `useState`.** Se lee de la caché en cada render. Copiarlo crea dos verdades y la que se muestra siempre es la vieja.

**D06-03 · TanStack Query como única caché de lectura.**
Se descartó un almacén global (Zustand, Redux Toolkit): casi todo el estado de esta aplicación es un reflejo del servidor, y un almacén global obliga a escribir a mano lo que Query ya trae hecho —reintentos, invalidación, deduplicación de peticiones simultáneas, estados de carga y error—. La única pieza de verdad local, el partido en directo, necesita persistencia y máquina de estados propias, cosas que un almacén global tampoco resuelve.
También se descartaron los hooks propios sobre `supabase-js`: funcionan hasta la cuarta pantalla y después cada una reinventa su carga, su error y su recarga.

### 5.2 Configuración de la caché

En `app/providers/QueryProvider.tsx`:

```ts
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // los catálogos cambian poco
      gcTime: 24 * 60 * 60 * 1000,
      retry: (failureCount, error) => !isClientError(error) && failureCount < 2,
      refetchOnWindowFocus: false,
    },
  },
});
```

`refetchOnWindowFocus` va apagado a propósito: en el campo la pantalla se bloquea y se desbloquea cada dos minutos, y cada vuelta al foco dispararía una ráfaga de peticiones justo cuando la cobertura es peor. Los datos del directo llegan por su propio canal (§7.4).

`staleTime` por tipo de dato, sobrescrito en cada consulta:

| Dato                           | `staleTime`       |
| :----------------------------- | :---------------- |
| Reglamento, competición, club  | 1 hora            |
| Plantilla, temporada           | 15 minutos        |
| Calendario, partidos           | 5 minutos         |
| Eventos de un partido en curso | 0 (siempre viejo) |
| Estadísticas de temporada      | 10 minutos        |

### 5.3 Claves de consulta

Una fábrica por módulo en `modules/<x>/api/queryKeys.ts`. Nada de literales sueltos por los componentes: una clave mal escrita invalida otra cosa y el fallo no da la cara hasta el partido siguiente.

```ts
export const matchKeys = {
  all: ['match'] as const,
  detail: (matchId: string) => [...matchKeys.all, matchId] as const,
  events: (matchId: string) => [...matchKeys.detail(matchId), 'events'] as const,
  squad: (matchId: string) => [...matchKeys.detail(matchId), 'squad'] as const,
};
```

Jerarquía de menor a mayor detalle, para que invalidar `matchKeys.detail(id)` arrastre los eventos y la convocatoria sin enumerarlos.

### 5.4 Estado del partido en directo

**D06-04 · Reductor puro con máquina de estados propia.**
El estado del directo es un objeto plano gobernado por un reductor en `modules/match/model/matchReducer.ts`. Toda acción es serializable y toda transición es una función pura `(estado, acción) → { estado, trabajos }`, donde `trabajos` son las filas que hay que encolar.

```
inactivo → parte_en_curso → parte_pausada → parte_en_curso → descanso → … → finalizado
```

Transiciones ilegales bloqueadas en el propio reductor: no se registra un gol con el partido inactivo, ni se abre la tercera parte de una competición de dos.

**El reductor también responde a «quién está en el campo ahora»**, y lo hace con todos los eventos que conoce el dispositivo, aprobados o no (DOC 04 §6.5). Es estado de pantalla y alimenta las validaciones R-04, R-05 y R-07. Los minutos oficiales siguen saliendo de los tramos del servidor, que solo miran lo aprobado. Dos anotadores pueden ver alineaciones distintas durante unos segundos: asumido.

Ventajas de que sea puro: se prueba entero con Vitest sin navegador, se guarda tal cual en IndexedDB y se reconstruye tras una recarga sin ningún trabajo extra.

Se descartó **Zustand**: aporta poco sobre `useReducer` cuando el estado vive en un solo árbol de pantalla, y añade una dependencia en la pieza más crítica. Se descartó **XState**: su modelo encaja de maravilla con este problema, pero pesa, tiene curva propia y el diagrama de estados de aquí cabe en veinte líneas de `switch`.

**D06-36 · El reglamento y la convocatoria salen siempre del paquete (T-217).** `elegirEstado` devolvía el estado local entero cuando su avance igualaba al del servidor, y ese estado lleva dentro el reglamento y la convocatoria del día en que se abrió el directo. El 04/10 se subió el límite de cambios de 5 a 7 y se convocó a dos jugadores más con el directo ya abierto una vez: el móvil siguió con 5 cambios y sin esos dos. Desde ahora, del estado local solo mandan **la fase, las partes y los eventos**, con la regla de D06-31; `titulares`, `convocados`, `posicionesIniciales`, `periodos`, `minutosDeParte`, `titularesPedidos`, `cambiosMax`, `cambiosFijos`, `tiposActivos` y `diferido` salen siempre del paquete, y `enCampo` se recalcula con los titulares del paquete. Sin red no cambia nada: el paquete es el último descargado, que es lo mejor que se sabe.

**En diferido, quién está en el campo se mira en el minuto del evento (D06-36).** `estado.enCampo` sale de todos los eventos apuntados, que en diferido es el final del partido: con el cambio del 46 ya metido, un gol del 20 no ofrecía a quien salió y sí a quien entró. `hastaElInstante` (`model/eventos.ts`) da los eventos que ya habían pasado en una parte y un segundo; con ellos, `contextoDe` calcula los candidatos del flujo y `validar` comprueba el evento. Para entrar en un cambio, con cambios fijos, no se ofrece a quien ya sale ni a quien ya entra en un cambio apuntado, sea del minuto que sea; los cambios hechos se cuentan todos. Con reloj no cambia nada. **Límite que se asume:** apuntar un evento anterior no revisa los posteriores ya metidos; si quedan incoherentes, lo dirá el cierre.

**D06-37 · La cobertura declarada vive en la instantánea, fuera del reductor, y viaja por la cola (T-209a).** Lo que sigue cada anotador (DOC 04 §10.2) no es estado del partido sino de quien anota en ese aparato: dos móviles en el mismo partido comparten partido y tienen coberturas distintas. Por eso no entra en `EstadoDirecto` ni en `reducir`: va en `Instantanea.cobertura`, al lado de `estado`, con `match/model/cobertura.ts` de lógica pura y `match/api/cobertura.ts` de guardado. `guardarPaquete` la conserva igual que conserva `estado`, o un refresco de la precarga haría declarar otra encima de la que sigue abierta. Cada cambio —alta, cierre, o cierre y alta al cambiar de alcance— encola sus filas de `coverage` y escribe la instantánea en una sola transacción con `encolarJunto` (D06-30), sobre la cola y `matchSnapshots` nada más (D06-35). **Dentro de la transacción se comprueba qué cobertura hay abierta**, y si no es la que la pantalla creía no se guarda ni se encola nada: así el efecto de arranque repetido, un doble toque u otra pestaña no dan dos altas ni dos cierres. Se declara al abrir la A12 con `full_team`, se cierra al salir con el botón y al finalizar, y **que falle no impide anotar ni salir**: la que se quede abierta la termina el cierre del partido (C-03). En diferido es una sola, desde el minuto 0 y marcada, y no se cierra al salir: no hay reloj del que sacar el instante. Declarar no bloquea ningún evento (reparto blando).

**D06-38 · Realtime es solo el aviso; el dato sale de volver a descargar, y se funde con lo del aparato (T-209b).** Hasta ahora cada aparato veía lo de los demás al volver a entrar en el directo. Desde la T-209b la A12 se refresca sola, y un refresco es siempre lo mismo: descargar el paquete entero, como al abrir (`refrescarDirecto`). **Del mensaje de Realtime no se lee nada**: el canal `directo:<partido>` (`api/tiempoReal.ts`) solo dice «algo ha cambiado», y así no hay dos caminos por los que entre un dato ni dos sitios donde decidir qué se ve. Sustituye al último párrafo de D06-08 (§7.5): ya no se reconcilian eventos del canal. **Cuándo** (`hooks/useRefresco.ts`): un segundo después del último aviso, que agrupa los seguidos; por seguridad cada **20 s** con la pantalla visible y con red, y cada **60 s** desde que en esa sesión de la pantalla llega un aviso de verdad; y al volver a la pantalla o a tener red. Hoy la publicación está vacía (DOC 05 §14.9) y solo trabaja la red de seguridad. Nunca hay dos a la vez, uno que no contesta en 15 s deja de valer, y si falla se calla. **Qué se queda y qué se quita** (`fusionar`, en `model/directo.ts`): lo que está en el servidor sale con la copia del servidor, y sigue siendo propio si lo era; lo que está en el servidor pero este aparato ha deshecho y tiene el borrado de camino, no sale; lo que solo está en el aparato se queda si su alta sigue en la cola —sin enviar, rechazada o confirmada después de pedir la descarga— y se quita si no, porque alguien lo borró. La cola lo dice con `pendientesDelPartido` de `sync`. La fase, las partes, la convocatoria y el reglamento siguen saliendo de `elegirEstado` (D06-31 y D06-36). `cargarDirecto` funde igual al abrir, y por eso lo deshecho ya no vuelve al recargar; **sin cobertura no quita nada de lo del aparato**, porque sin descarga nueva nadie ha dicho que se borrara. **Un refresco nunca se come un toque**: no coge el cerrojo de guardar, que haría que `intentar` devolviese `ocupado` y el toque se perdiera en silencio. Lee la cola sin ningún guardado en marcha, la da por buena solo si al acabar sigue sin haberlo y el contador de guardados de la pantalla no se ha movido, y cambia el estado en ese mismo turno; si no, espera medio segundo y vuelve a leer, hasta cinco veces, y si no encuentra el hueco lo deja para el siguiente. El estado fundido no se escribe en la instantánea: lo escribe el siguiente guardado. **El aviso de posible repetido** (`parejasRepetidas`, en `model/eventos.ts`) compara en el aparato el tipo, el bando, la parte y los segundos contra la ventana de `app_settings`, que viaja en el paquete: lo dice en la línea, lo anuncia una vez por pareja y no bloquea ni pregunta. Cuál vale se decide en el cierre.

### 5.5 Sesión, equipo activo y permisos

`AuthProvider` expone `{ session, cargando, permisos, profile, teams, activeTeamId, activeSeasonId, setActiveTeam, errorContexto, reintentarContexto }`. Los dos últimos llegan con la T-106. El cierre de sesión (T-107) es `cerrarSesion()` de `modules/auth/api/session.ts`, con `scope: 'local'`: sale en este dispositivo y deja abiertos los demás; la C01 vacía después la caché de react-query. Un usuario puede tener función en varios equipos (decisión H3), así que el equipo activo es estado de sesión, se elige en la interfaz y se recuerda en `localStorage` bajo la clave `sasi.equipo-activo`.

**D06-22 · `permisos` vale `null` hasta que la consulta conteste, y un conjunto —vacío incluido— a partir de ahí.** Son dos cosas distintas: `null` es «todavía no se sabe» y el conjunto vacío es «se preguntó y no tiene ninguno». Rellenarlo antes de tiempo manda a `/403` a quien sí tiene el permiso, y el fallo parece de permisos cuando es de carga. `cargando`, en cambio, habla **solo** de la sesión: encadenarlo también al contexto de acceso dejaría esperando al inicio, que no pide ningún permiso.

**Y el conjunto es espejo exacto de `has_team_permission` (DOC 05 §12.2): los permisos salen de `team_member_permissions` del equipo activo y de ningún otro sitio.** El administrador de plataforma **no** suma permisos, porque la base tampoco se los da: `is_platform_admin()` abre la lectura y nunca la escritura. Concedérselos en el cliente enseñaría botones que la RLS va a rechazar.

Lo que el equipo activo decide es el conjunto entero: quien tenga función en dos equipos cambia de permisos al cambiar de equipo. El equipo recordado se valida siempre contra la lista de membresías, porque a quien le dan de baja le queda el identificador viejo en `localStorage`.

Los permisos se leen una vez por equipo y se cachean como cualquier otra consulta:

```ts
const canWriteLive = useHasPermission('match.live.write');
```

**El frontend oculta lo que no se puede hacer; no lo impide.** Quien decide es la RLS del DOC 05 §12. Esconder un botón mejora la experiencia y evita errores feos; no es seguridad. Cualquier comprobación de permiso en el cliente que no tenga detrás su política en la base de datos es un agujero, no una medida.

---

## 6. Enrutado

**D06-05 · React Router, modo de datos.**
Árbol declarado en `app/router.tsx` con `createBrowserRouter`, una ruta por pantalla del DOC 02 §2 y los cinco destinos del DOC 02 §3.1 como rutas hijas de `AppLayout`. La redirección de SPA ya está puesta en `netlify.toml`, así que entrar directo a `/partidos/:id/directo` funciona desde el primer despliegue.

Se descartó **TanStack Router**: sus parámetros tipados de extremo a extremo son una ventaja real, pero atan la aplicación a un ecosistema con menos ejemplos y menos respuestas cuando algo se atasca a las once de la noche. Se descartó un enrutador propio: barato de escribir, caro en cuanto aparecen rutas anidadas, redirecciones y foco tras navegar.

### 6.1 Guardias

```
<RequireAuth>                       → sin sesión, a /login
  <RequirePermission permission=…>  → sin permiso, a /403 (pantalla C05)
```

La guardia de permiso recibe el permiso concreto del DOC 05 §4, no un rol. Es la consecuencia directa de la decisión C4: los permisos son filas, y la pantalla pregunta por el permiso que necesita.

### 6.2 División del paquete

**D06-06 · Carga perezosa por ruta, con una excepción.**
Cada `routes/*.tsx` se carga con `React.lazy`, salvo la pantalla **A12**, que entra en el paquete principal. Motivo: A12 tiene que abrirse con el móvil sin cobertura y sin haber pasado antes por ella. Un trozo perezoso que no se descargó es una pantalla en blanco a pie de campo.
Se descartó cargarlo todo de golpe (el arranque en 3G de un campo de fútbol tarda demasiado) y cargarlo todo perezoso (A12 dejaría de ser fiable, que es justo lo que no se puede permitir).

### 6.3 Foco y anuncios al navegar

Al cambiar de ruta, el foco va al `<h1>` de la pantalla nueva y el título del documento se actualiza. Sin eso, quien navega con teclado o lector se queda en el enlace que pulsó y no se entera de que la página cambió. Criterios 2.4.3 y 2.4.7 del DOC 02 §5.1.

Una sola región `aria-live="polite"` en `AppLayout`, alimentada por un hook `useAnnounce()`. Todos los mensajes de estado del DOC 02 §5.1 (criterio 4.1.3) pasan por ahí: «Gol registrado», «3 eventos pendientes de sincronizar», «Conexión recuperada». Varias regiones vivas compitiendo se pisan entre sí y el lector acaba leyendo a destiempo.

---

## 7. Cliente de Supabase

### 7.1 Un solo cliente, en un solo archivo

`src/shared/lib/supabase.ts` crea el cliente una vez y lo exporta. Tipado con el esquema generado:

```ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@app-types/database.types';
import { env } from './env';

export const supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
```

Crear el cliente dos veces rompe la sesión y duplica las suscripciones en tiempo real. Un archivo, una instancia.

### 7.2 Nadie llama a Supabase desde un componente

**D06-07 · Todo el acceso a datos pasa por `modules/<x>/api/`.**
Una función por operación, con nombre que dice qué hace, que recibe y devuelve tipos del dominio y que no sabe nada de React:

```ts
// modules/match/api/matchEvents.ts
export async function insertMatchEvent(input: NewMatchEvent): Promise<MatchEvent> { … }
export async function listMatchEvents(matchId: string): Promise<MatchEvent[]> { … }
```

Los hooks del módulo envuelven esas funciones con `useQuery` y `useMutation`. Los componentes solo ven hooks.

Motivo: el día que la escritura del directo tenga que pasar por la cola en vez de ir directa —que es hoy mismo—, se toca un archivo por módulo y no doscientos componentes. Es también la frontera por la que se simula en las pruebas (§11).

### 7.3 Tipos generados, nunca escritos a mano

```json
"scripts": {
  "db:types": "supabase gen types typescript --project-id <id> > src/types/database.types.ts"
}
```

Se regenera **en la misma tarea** que aplica una migración, y el archivo generado entra en el mismo commit que el `.sql`. Un tipo escrito a mano se desincroniza del esquema en la segunda semana y entonces TypeScript miente, que es peor que no tener tipos.

Los tipos del dominio (`MatchEvent`, `SquadMember`) se derivan de los generados en `model/types.ts`, con los nombres del negocio encima de los de la tabla. Así el resto del código no depende de la forma exacta de una fila.

### 7.4 Lecturas de estadísticas

El DOC 04 §14.2 y el DOC 05 §11 lo cierran y aquí solo se anota su consecuencia: **ninguna pantalla agrega por su cuenta**. Ni un `reduce` que sume goles, ni un contador de minutos en el cliente. Todo sale de las vistas `v_*` y de las funciones de fiabilidad. Si falta un dato, se amplía la vista; no se calcula en React.

### 7.5 Tiempo real en el directo

**D06-08 · Suscripción en tiempo real solo en A12 y A13, con sondeo de respaldo.**
Cuatro personas anotan a la vez desde los amistosos (decisión C1). Cada dispositivo necesita ver lo que apuntan los demás, o los duplicados se multiplican. Se suscribe a los cambios de `match_events` filtrados por `match_id` al entrar en la pantalla de directo o en la de discordancias, y se cancela al salir.

Si la suscripción no se establece en 10 segundos, o se cae, la pantalla pasa a sondear cada 20 segundos mientras haya red. La degradación es silenciosa salvo por el indicador de conexión.

Se descartó **sondear siempre**: hasta 20 segundos de retardo entre los cuatro anotadores es justo la ventana que fabrica los duplicados que la decisión C3 intenta detectar, y el gasto de batería es peor. Se descartó **tiempo real en toda la aplicación**: multiplica conexiones del plan gratuito sin ninguna ventaja fuera del partido.

Los eventos que llegan por el canal se reconcilian por `client_event_id`: si ya está en local, se descarta. La idempotencia funciona en los dos sentidos (§8.5).

**Desde la T-209b manda D06-38 (§5.4):** del canal no se lee ningún evento, solo sirve de aviso para volver a descargar el paquete, y el sondeo de respaldo va siempre, a 20 s sin avisos y a 60 s con ellos. La A13 sigue sin suscripción.

---

## 8. Capa offline

Esta es la sección que decide si el proyecto vale para lo que se hizo. El alcance del MVP es el que fija la decisión C5: **offline solo en el partido en directo**, con la capa escrita genérica.

### 8.1 Las dos piezas, que no son la misma

| Pieza              | Qué guarda                                                     | Herramienta       |
| :----------------- | :------------------------------------------------------------- | :---------------- |
| **Service worker** | El código de la aplicación y los recursos estáticos            | `vite-plugin-pwa` |
| **Almacén local**  | Los datos: partido precargado, eventos propios, cola de salida | IndexedDB (Dexie) |

**D06-09 · El service worker no cachea nunca las respuestas de la API.**
Los datos llegan con la sesión y la RLS del usuario detrás; guardarlos en la caché del navegador significa servir a un usuario lo que se descargó con la sesión de otro en el mismo dispositivo, y significa además que los datos no se pueden inspeccionar ni migrar. Los datos van a IndexedDB, donde tienen esquema, versión y forma de mirarlos.
Se descartó una estrategia `NetworkFirst` sobre las llamadas a Supabase, que es el atajo habitual y el que produce la clase de fallo más difícil de reproducir: datos correctos servidos al usuario equivocado.

### 8.2 Almacén local

**D06-10 · Dexie sobre IndexedDB.**
Consultas legibles, índices declarados, migraciones de versión del almacén local y observación reactiva. Unos 25 kB comprimidos.
Se descartó `idb` (más ligero, pero los índices, las migraciones y las consultas de la cola se escriben a mano justo en la pieza que no puede perder datos) y la API nativa en crudo (verbosa, basada en eventos y un infierno para depurar a pie de campo).

Esquema local, en `shared/lib/db.ts`:

```ts
db.version(1).stores({
  outbox: 'id, status, matchId, nextAttemptAt, [matchId+createdAt]',
  matchEvents: 'clientEventId, matchId, syncState, [matchId+period]',
  matchSnapshots: 'matchId, updatedAt',
  meta: 'key',
});
```

| Almacén          | Contenido                                                                                |
| :--------------- | :--------------------------------------------------------------------------------------- |
| `outbox`         | La cola de salida: trabajos pendientes de enviar                                         |
| `matchEvents`    | Los eventos del partido, propios y ajenos, con su estado de sincronización               |
| `matchSnapshots` | El partido precargado y el estado del reductor, para sobrevivir a una recarga            |
| `meta`           | Clave y valor: identificador del dispositivo, última sincronización, versión del esquema |

El identificador de dispositivo se genera una vez con `crypto.randomUUID()` y se guarda en `meta`. Sirve para saber qué aparato dejó un evento colgado cuando haya cuatro anotando.

**D06-10b · El almacén se pide persistente.** Al entrar por primera vez en un partido se llama a `navigator.storage.persist()`. Safari borra el almacenamiento de sitios que no se usan durante siete días, y el escenario es de lo más normal: partido sin cobertura, la aplicación se cierra al acabar y no se vuelve a abrir hasta el partido siguiente. Entre medias desaparecerían eventos que el invariante I-07 promete no perder. Como la petición se puede denegar, van dos avisos detrás: al salir del directo con trabajos en cola, con el número por delante, y en la pantalla de inicio nada más abrir la aplicación, antes que cualquier otra cosa.

### 8.3 Precarga del partido

**D06-28 · La precarga vive en `match` y la dispara el enrutador (T-206, decisión de Raúl del 26/09).** Precargar al entrar en la convocatoria obligaría a `lineup` a importar de la capa offline, y el §4.2 no lo deja. La ruta `/partidos/:id/convocatoria` carga `match/routes/ConvocatoriaConPrecarga`, que es la A11 de `lineup` con el estado de la precarga encima y una segunda precarga al guardar. En la T-206, `app/router.tsx` la importaba por ruta directa, porque el barril de `match` iba en el paquete inicial con la A12; **desde la T-207 el barril es perezoso (D06-29) y la ruta la carga por él**. `lineup` solo expone dos enganches, `aviso` y `alGuardar`, y no sabe nada de la capa offline.

**D06-11 · Al entrar en la convocatoria o en el directo, el partido se descarga entero a IndexedDB.**
Se guardan el partido, la competición con su reglamento, la plantilla, la convocatoria y los eventos ya registrados. A partir de ahí, la pantalla de directo **lee de local**, no de la red. La red solo aporta lo que llega en tiempo real.

Se descartó persistir la caché de TanStack Query con `persistQueryClient`: es opaca, guarda lo que le apetece según cuándo se visitó cada pantalla, y no da ninguna garantía de que el partido de las 10:00 esté completo en el móvil a las 9:55 en un campo sin cobertura. La precarga explícita sí la da, y además se puede enseñar: «Partido listo para usar sin conexión ✓».

Si la precarga falla, la pantalla lo dice antes de empezar, no a los quince minutos de juego.

### 8.4 La cola de salida

Una fila de `outbox` es un trabajo pendiente:

| Campo           | Tipo                                                                      | Para qué                                         |
| :-------------- | :------------------------------------------------------------------------ | :----------------------------------------------- |
| `id`            | uuid                                                                      | Identificador local del trabajo                  |
| `entity`        | `match` \| `match_event` \| `match_period` \| `match_squad` \| `coverage` | Qué tabla toca                                   |
| `op`            | `insert` \| `update` \| `delete`                                          | Qué operación                                    |
| `payload`       | json                                                                      | La fila tal como va a viajar                     |
| `clientEventId` | uuid                                                                      | Idempotencia. Es el `client_event_id` del DOC 05 |
| `matchId`       | uuid                                                                      | Para ordenar y para aislar fallos                |
| `createdAt`     | número                                                                    | Orden dentro del partido                         |
| `attempts`      | número                                                                    | Cuántas veces se intentó                         |
| `nextAttemptAt` | número                                                                    | Cuándo toca el siguiente intento                 |
| `status`        | `pending` \| `sending` \| `sent` \| `failed`                              | Estado del transporte                            |
| `lastError`     | texto                                                                     | Qué dijo el servidor la última vez               |
| `userId`        | uuid                                                                      | Quién lo encoló. Añadido en la T-206 (D06-27)    |
| `sentAt`        | número                                                                    | Cuándo lo confirmó el servidor. Para la purga    |

### 8.5 Reglas de la cola

**D06-12 · El identificador lo genera el dispositivo.** `crypto.randomUUID()` en el momento de registrar el evento, sin red de por medio. Es lo que hace que reintentar sea seguro: el índice único de `client_event_id` del DOC 05 §8.4 convierte el segundo envío en un choque que se trata como éxito. Se descartó dejar que el identificador lo ponga el servidor, que obliga a saber si el envío llegó antes de reintentar, y eso no se puede saber cuando se corta a mitad.

**Orden por partido, no global.** Dentro de un partido el orden importa: una sustitución antes del gol de quien entró. Entre partidos no importa nada, así que un partido atascado no bloquea a los demás.

**Retroceso exponencial con tope y aleatorio.** 1 s, 2 s, 4 s, 8 s… hasta 60 s, más un margen aleatorio para que los cuatro dispositivos no vuelvan a la vez cuando regrese la cobertura.

**Los errores 4xx no se reintentan.** Una violación de RLS o de restricción no se arregla repitiéndola. El trabajo pasa a `failed`, se registra en `error_logs` (DOC 09) y sale en la interfaz. Los errores de red y los 5xx sí se reintentan.

**Nada se borra hasta que el servidor confirma.** El trabajo pasa a `sent` y se purga al cerrar el partido o a las 48 horas, lo que llegue antes.

**Un solo vaciador, con cerrojo.** El vaciado corre en la pestaña que obtenga `navigator.locks.request('sasi-outbox')`. Sin cerrojo, dos pestañas abiertas envían lo mismo dos veces. En los navegadores sin la API de cerrojos, la pestaña visible es la que vacía. Desde la T-216 solo vacía la pestaña que se ve, tenga o no cerrojos el navegador: D06-35, más abajo.

**Cuándo se vacía:** al arrancar la aplicación, cuando vuelve el evento `online`, cada 10 segundos mientras haya pendientes y haya red, y cuando el usuario pulsa «Sincronizar ahora» en la banda de estado.

**D06-13 · El vaciado vive en la aplicación, no en el service worker.**
Se descartó la Background Sync API: no existe en Safari de iOS, y la mitad de quienes anotan llevan iPhone. Una capa de sincronización que solo funciona en Android es media capa. Consecuencia asumida y escrita: **si se cierra la aplicación con eventos pendientes, se envían al volver a abrirla**, no antes. La pantalla avisa antes de salir con trabajos en cola (DOC 02 §3.3, regla 5).

**Tres reglas del transporte, fijadas en la T-206.** El duplicado de una inserción (23505) es éxito en cualquier tabla, no solo en `match_events`: toda fila que viaja por la cola lleva una clave que genera el dispositivo, así que si ya está es que el primer envío llegó. Un `update` que no toca ninguna fila es `SIN_FILAS` y definitivo (§10.1). Un `delete` que no toca ninguna es éxito: lo borrado ya no está, que es lo que se quería. Se reintentan el estado 0, los 5xx, el 401 (la sesión se renueva sola), el 408 y el 429.

**D06-26 · `sync` y Dexie no van en el arranque (T-206).** Dexie pesa 31 kB comprimidos y el margen era de 20 kB. `app/components/Sincronizacion.tsx` carga `@modules/sync` con `import()` en cuanto hay sesión, arranca el vaciado y pinta la banda C04. Con `import()` en un efecto y no con `lazy`: si el trozo no baja en una primera visita sin red, `lazy` lanzaría y el Error Boundary pintaría la C03 entera por una banda. Coste: el vaciado del arranque sale unos milisegundos después de pintar, lo que tarda en bajar el trozo, y desde la segunda visita lo sirve la precaché.

**D06-27 · Cada trabajo lleva quién lo encoló, y solo se envía con su sesión (T-206).** Dos cuentas en el mismo móvil —Isaac le deja el suyo a Raúl— no se mandan lo de la otra con la sesión equivocada, que es la misma clase de fallo que D06-09 evita en la caché. Cerrar sesión no borra la cola: lo pendiente se queda y sale cuando vuelve a entrar esa cuenta. La C01 lo avisa antes de salir, con el número por delante.

**D06-35 · La cola solo la vacía la pestaña que se ve, y el cerrojo se roba (T-216).** El 04/10, con la aplicación en varias pestañas del móvil, cada evento tardó un minuto en salir. Los registros de la API de Supabase de esa noche, de 00:21 a 00:41 UTC, dan trece peticiones de la cola, una por minuto exacto y siempre en el segundo 40, también después de recargar el directo. Eso lo explica una pestaña vieja y oculta haciendo de vaciadora: Chrome en Android la despierta una vez por minuto, coge el cerrojo, manda un trabajo y se duerme con el cerrojo cogido; la que se ve lo pide con `ifAvailable`, lo encuentra ocupado y no vacía nunca. **No se pudo reproducir en un móvil**: el diagnóstico sale de los registros y del código.

| Punto                 | Decisión                                                                                                                                                                                                                 |
| :-------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quién vacía           | Solo una página con `document.visibilityState === 'visible'`. Una oculta ni pide el cerrojo ni empieza un vaciado; el temporizador y `sincronizarAhora` salen sin hacer nada                                             |
| A mitad de vaciado    | `vaciar` recibe `seguir` y lo mira antes de coger cada trabajo. `arranque` le pasa «sigo visible y no me han quitado el cerrojo»                                                                                         |
| Cerrojo ocupado       | Se pide con `ifAvailable: true`. Al segundo intento seguido con el cerrojo ocupado (`FALLOS_PARA_ROBAR`, en `model/turno.ts`), la página visible lo pide con `steal: true`                                               |
| Por qué robar no daña | Dos vaciadores mandan lo mismo: los `insert` repetidos vuelven con `23505`, que ya es éxito, y `update` y `delete` son repetibles. El orden se mantiene porque los dos eligen el primero sin enviar de cada partido      |
| A quien le roban      | Su `navigator.locks.request` rechaza con `AbortError`. Se captura sin registrarlo y `seguir` pasa a dar `false`                                                                                                          |
| Banda C04             | `useEstadoDeCola` cancela su `liveQuery` al ocultarse la página y la abre de nuevo al verse. Una página oculta no toca IndexedDB                                                                                         |
| Transacción           | `encolarJunto` acepta las tablas que toca `tambien` y abre la transacción sobre `outbox` más esas; sin ellas, sobre todas, como antes. El directo pasa `[db.matchSnapshots]`, y así no espera detrás de las demás tablas |
| Registro de lentitud  | Si encolar tarda más de 3 000 ms, `encolarJunto` registra «Encolado lento» con los milisegundos. Ni filas ni valores. Es la medida que faltó el 04/10                                                                    |

### 8.6 Dos ejes que se confunden a menudo

El estado del transporte y el estado de la anotación son cosas distintas y viven en sitios distintos:

| Eje                                      | Valores                                   | Dónde vive                       | Quién lo cambia                    |
| :--------------------------------------- | :---------------------------------------- | :------------------------------- | :--------------------------------- |
| **Sincronización** (¿llegó al servidor?) | `pending` / `sending` / `sent` / `failed` | IndexedDB, en local              | La cola                            |
| **Anotación** (¿es un dato bueno?)       | `pending` / `approved` / `rejected`       | Columna `status`, en el servidor | La revisión de discordancias (A13) |

Un evento puede estar sincronizado y rechazado, o pendiente de enviar y destinado a aprobarse. La interfaz los muestra por separado: el contador «⚠3» de la cabecera del directo cuenta el primero; el panel de discordancias trabaja con el segundo.

### 8.7 PWA

**D06-14 · `vite-plugin-pwa` con `registerType: 'prompt'`.**
Una versión nueva no se instala sola: aparece un aviso «Hay una versión nueva · Actualizar» que el usuario acepta cuando quiere. Mientras un partido esté en curso, el aviso se guarda y no se muestra.
Se descartó `autoUpdate`, que recarga la página al detectar una versión nueva. Recargar la pantalla de directo en el minuto 63 porque se desplegó una corrección es exactamente el fallo que este proyecto no se puede permitir.

Precaché del código y de los recursos estáticos. `navigateFallback` a `index.html` para que cualquier ruta abra sin red. El manifiesto, los iconos y los metadatos de `index.html` entran en la primera tarea de la Fase 1, que ya está identificada en el DOC 13.

### 8.8 El reloj

**D06-15 · El reloj se calcula por anclaje, nunca por acumulación.**
El ancla es `match_periods.started_at`, que escribe quien lleva el reloj y es la fuente de verdad del partido (DOC 04 §5.1.1), no un instante local de cada dispositivo. Se guarda en `matchSnapshots` junto con los milisegundos acumulados en pausa. El tiempo mostrado sale de `Date.now() - ancla - pausado`. El temporizador de 250 ms solo repinta.

Al registrar un evento, el dispositivo guarda `occurred_at` y calcula `seconds` contra el ancla. Si todavía no conoce el arranque de la parte —empezó mientras estaba sin cobertura—, manda `occurred_at` y deja `seconds` nulo: lo rellena el servidor.

Se descartó el contador que suma en cada tick: los navegadores móviles limitan los temporizadores en segundo plano y con la pantalla bloqueada, así que un reloj acumulativo se retrasa minutos en un partido. Y el móvil se bloquea solo cada dos minutos (DOC 02 §5.2).

El ancla se guarda en `matchSnapshots` tras cada transición. Una recarga, un bloqueo o un cierre accidental recuperan el minuto exacto.

**D06-29 · La A12 es perezosa, como el resto (T-207, decisión de Raúl del 26/09).** Iba en el paquete inicial para abrir sin red sin haber pasado antes por el directo. Pero el service worker precachea todos los `.js`, perezosos incluidos (`globPatterns`): tras la primera visita con red, el trozo del directo está en el móvil aunque nunca se haya abierto. Y el directo necesita Dexie, que no cabe en el arranque (D06-26). Se descartó dejar el esqueleto en el arranque y cargar solo su capa de datos: mismo resultado sin red, con el arranque cargando el directo aunque no haya partido.

**D06-30 · El estado del directo y sus trabajos se guardan en una sola transacción (T-207).** `sync` expone `encolarJunto(trabajos, tambien)`: mete los trabajos en `outbox` y ejecuta `tambien` —que en el directo escribe el estado del reductor en `matchSnapshots`— dentro de la misma transacción de IndexedDB. Sin esto, un cierre entre las dos escrituras deja una parte abierta en el móvil sin su fila en la cola, o al revés. `tambien` solo puede tocar Dexie: cualquier otra espera cierra la transacción. Los trabajos de una misma llamada llevan un milisegundo de diferencia en `createdAt`, para que el partido pase a `live` antes de que llegue su primera parte. La pantalla solo cambia de estado cuando lo guardado ha salido bien.

**D06-31 · El estado local manda si ha avanzado igual o más que el del servidor (T-207).** Al abrir el directo se refresca la precarga si hay red y se elige entre el estado guardado en el aparato y el que sale de las partes del servidor: gana el más avanzado —partes abiertas y cerradas, y terminado por encima de todo— y, a igualdad, el local, que conoce la pausa. Así, si otro aparato cerró la parte, se ve cerrada, y lo que este hizo sin red no se deshace porque el servidor aún no lo sepa. Desde la T-217 esa regla decide la fase, las partes y los eventos; el reglamento y la convocatoria salen siempre del paquete (D06-36, §5.4).

**La pausa es local.** Descuenta del reloj de este aparato y de la duración real de la parte, pero el servidor no la conoce: otro dispositivo que derive los segundos de `started_at` no la ve. Con reloj corrido, como el cadete, solo se pausa por un parón largo. Lo recoge el DOC 13.

**D06-32 · La marca «partido en curso» vive en `localStorage` (T-207).** La lee el aviso de versión nueva, que está en el marco y fuera del enrutador, para callarse durante el partido (D06-14). En `localStorage` y no en IndexedDB porque la lee el arranque. Caduca a las cuatro horas: un partido abandonado sin finalizar no deja el aviso callado para siempre. Vive en `shared/lib/partidoEnCurso.ts`, y es también la pieza que necesitará la banda «Partido en directo · mm:ss · Volver».

**D06-33 · El registro de eventos es puro y vive en tres archivos de `match/model` (T-208).** `eventos.ts` deriva de los eventos que conoce el aparato quién está en el campo, los expulsados, los sustituidos, los amonestados y el marcador. `registro.ts` valida el evento contra el reglamento y lo que sabe el aparato (R-04, R-05, R-06, R-07, R-09) y lo convierte en una fila comprobada contra `TablesInsert<'match_events'>`. `flujo.ts` define los pasos de cada botón y ofrece solo los candidatos válidos: lo que el reductor rechazaría, no se ofrece. Tres reglas que salen de aquí: **el aparato manda los segundos**, calculados por anclaje con la pausa descontada, además de `occurred_at`, porque el servidor no conoce la pausa; **una amarilla a un amonestado se apunta como segunda amarilla** y expulsa; y **los modelos no importan barriles en tiempo de ejecución**: los nombres de los tipos de `rules` entran como argumento, porque el barril arrastra pantallas y el cliente de Supabase.

### 8.9 La pantalla encendida

**D06-16 · Bloqueo de suspensión mientras dure el directo.**
El móvil se apaga solo cada dos minutos (DOC 02 §5.2), y desbloquearlo antes de cada gol destruye la premisa de la pantalla: registrar de pie, con una mano y sin apartar la vista del campo. Se pide `navigator.wakeLock` al entrar en el directo y se suelta al salir. El bloqueo se pierde al cambiar de aplicación o al ocultarse la pestaña, así que se vuelve a pedir cuando la pestaña recupera visibilidad.

Disponible en Chrome de Android y en Safari desde la 16.4, o sea los cuatro anotadores. Coste asumido y que conviene decir en la interfaz: gasta batería, y un partido son dos horas.

---

## 9. Nomenclatura

### 9.1 Archivos y símbolos

| Elemento        | Convención                    | Ejemplo                    |
| :-------------- | :---------------------------- | :------------------------- |
| Carpetas        | `kebab-case`                  | `match-events/`            |
| Componente      | `PascalCase`, uno por archivo | `EventButton.tsx`          |
| Pantalla (ruta) | `PascalCase` + `Page`         | `LiveMatchPage.tsx`        |
| Hook            | `camelCase` con prefijo `use` | `useMatchClock.ts`         |
| Lógica pura     | `camelCase`                   | `computeStints.ts`         |
| Acceso a datos  | `camelCase`, verbo delante    | `insertMatchEvent`         |
| Tipo o interfaz | `PascalCase`, sin prefijo `I` | `MatchEvent`               |
| Constante       | `SCREAMING_SNAKE_CASE`        | `DUPLICATE_WINDOW_SECONDS` |
| Hoja de estilos | `Componente.module.css`       | `EventButton.module.css`   |
| Prueba          | Junto al archivo, `.test.ts`  | `matchReducer.test.ts`     |

Cada archivo de `routes/` lleva en la primera línea un comentario con el identificador de la pantalla del DOC 02: `// Pantalla A12 — Partido en directo`. Es lo que ata el código a la documentación sin mantener una tabla aparte.

### 9.2 Idioma

**D06-16 · Identificadores en inglés, textos e interfaz en español.**
Continuidad con la decisión H1 —el esquema está en inglés— y con los tipos generados, que llegan en inglés quiera uno o no. Mezclar `jugadorId` con `player_id` en la misma función es una fuente de errores gratuita.
Los textos de interfaz, los comentarios y los mensajes de error para el usuario van en español de España. Se descartó traducir el dominio al español en el frontend (obliga a un diccionario mental en cada consulta) y se descartó escribir la interfaz en inglés (la usa Isaac, no un anglosajón).

**Sin capa de traducción en el MVP.** Los textos viven en el componente. Se descartó `react-i18next`: no hay segundo idioma previsto ni fecha para tenerlo, y añade fricción a cada pantalla desde hoy a cambio de una ventaja que quizá no llegue nunca. El día que haga falta, extraer literales es un trabajo mecánico.

### 9.3 Estilos

**D06-17 · CSS Modules más variables CSS.**
Los tokens del DOC 07 viven en `src/styles/tokens.css` como variables de `:root`. El color del equipo se inyecta en caliente sobre `--color-team` desde `teams.primary_color`, y el modo de alto contraste del DOC 02 §5.2 conmuta un atributo en `<html>` que redefine el bloque de variables. Cada componente lleva su `.module.css` al lado.

**D06-25 · Las preferencias de pantalla se guardan en el dispositivo, no en el perfil (T-107).** Alto contraste (`data-contrast="high"`) y movimiento reducido (`data-motion="reduced"`) viven en `localStorage` bajo `sasi.preferencias`, las lee `shared/lib/preferencias.ts` y `main.tsx` las aplica antes de cargar `App`. El DOC 07 §4 pide guardarlas en el perfil, pero `profiles` no tiene columna y esta tarea no podía migrar. Ventaja: se aplican sin esperar a la red. Coste: no viajan de un dispositivo a otro. Las salidas están en el DOC 13. `movimientoReducido` se suma a `prefers-reduced-motion` y nunca lo anula: con el sistema pidiéndolo, apagar la casilla no devuelve las animaciones.

Se descartó **Tailwind**: el color de equipo inyectable y el modo de alto contraste hay que resolverlos igual con variables CSS, así que la ventaja se reduce a escribir más rápido a cambio de un marcado lleno de clases y de una capa de compilación más. Se descartó el **CSS global con `@layer`**: el aislamiento dependería de la disciplina en vez de la herramienta, y con veintiuna pantallas eso se rompe.

### 9.4 Formularios

**D06-18 · Sin librería de formularios en el MVP.**
Estado controlado y validación en funciones puras de `model/`, que son las mismas que usa la cola antes de encolar. Se descartó `react-hook-form` + `zod`: los invariantes de verdad (I-01 a I-05 del DOC 04) ya los vigila la base de datos, y un esquema de validación en el cliente crea una segunda verdad que hay que mantener sincronizada con el `.sql` a mano. Los formularios de esta aplicación son pocos y cortos.

Si algún formulario se vuelve inmanejable, se revisa entonces y se anota en el DOC 13.

---

## 10. Errores, accesibilidad y rendimiento en el código

### 10.1 Errores

Cada llamada de `api/` desenvuelve la respuesta de Supabase con un ayudante común que convierte `{ data, error }` en un error tipado. Nada de comprobar `error` a mano en cada sitio y olvidarlo en dos.

Tres capas de captura:

1. **Error Boundary global** en `app/` → pantalla C03 (DOC 09).
2. **Error por pantalla**: el estado de error de cada consulta se muestra dentro de la pantalla, sin tumbarla entera.
3. **Registro**: todo error no previsto va a `error_logs` con ruta, mensaje, traza, dispositivo y versión. **Nunca el contenido del formulario** (DOC 05 §9.5).

**Montado en la T-106**, y así queda:

| Capa                   | Pieza                                                                                       | Qué hace                                                                                                                    |
| :--------------------- | :------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------- |
| 1 · Boundary global    | `modules/logging/components/ErrorBoundary.tsx`, por fuera de todos los proveedores en `App` | Pinta la C03 y registra con origen `boundary`                                                                               |
| 1 · Boundary de ruta   | `app/components/RouteErrorPage.tsx`, `errorElement` raíz del enrutador                      | Lo que revienta dentro de una ruta lo captura react-router antes; misma C03, origen `ruta`. Los 4xx no se registran         |
| 1 · Arranque           | `app/main.tsx`                                                                              | Carga `App` con `import()` y pinta la C03 si falla: error de entorno (D06-21) o trozo que no baja. D06-23                   |
| 2 · Contexto de acceso | `app/components/ErrorDeAcceso.tsx`, desde `RequirePermission`                               | «No se pudo cargar tu acceso» con reintento, en vez de «Cargando…» para siempre. Origen `contexto`                          |
| 3 · Global             | `instalarCapturaGlobal()` desde `App`                                                       | Manejadores de eventos, temporizadores y promesas sin `catch`. Orígenes `global` y `promesa`                                |
| Registro               | `modules/logging/api/registro.ts` y `model/errorLog.ts`                                     | Una sola puerta, `registrarError`. Solo con sesión, nunca lanza, diez filas por carga y el mismo mensaje una vez por minuto |

La vista de la C03 es una sola, `PantallaError`, pura: sin red, sin contexto y sin enrutador, porque tiene que pintarse justo cuando eso es lo que ha fallado. Sus dos salidas recargan la página entera.

**Qué entra en `error_logs` y qué no.** Mensaje con el origen delante (`[boundary] …`), traza, pila de componentes cuando la hay, solo el camino de la ruta —sin consulta ni fragmento, que es donde viajan el `code` y el `access_token` de la vuelta de Google—, club del equipo activo, commit desplegado (`__APP_VERSION__`, de `COMMIT_REF` de Netlify) y dispositivo: agente, idioma, tamaño de ventana, si hay red y si se abrió como PWA instalada. Antes de salir, `limpiarTexto` tapa JWT, cabeceras `Bearer`, los parámetros `code`, `*_token`, `apikey` y `password`, y cualquier correo. El contenido de un formulario no llega nunca a estas funciones.

**Sin sesión no se registra.** La política `error_logs_insert` es para `authenticated`. Lo que falla antes de entrar —el acceso, la vuelta de Google, un error de entorno— se queda en la consola. Es una limitación de la RLS actual y se deja así: abrir la inserción a `anon` abre también la puerta a llenar la tabla desde fuera.

**Una actualización que la RLS rechaza no da error (T-201).** PostgREST devuelve cero filas y nada más. Toda función de `api/` que haga `update` pide la fila de vuelta con `.select()` y, si no llega, lanza `new Error(SIN_FILAS)` (`modules/core/model/clubYEquipos.ts`). Sin eso, un «no» de la base pasa por un «guardado» en la pantalla. Es la primera pieza del ayudante común de abajo, y cuando exista se muda allí.

**El ayudante común de `api/` no entra aquí.** Este apartado lo pide, pero no lo asigna a ninguna tarea, y la T-106 no lo necesita: el registro trata igual un `Error` que un error de Supabase (`normalizarError`). Sigue abierto en el DOC 13.

**D06-23 · `App` se carga con `import()` desde `main.tsx`.** `env.ts` lanza al importarse (D06-21), y con una importación estática ese error aborta la carga del módulo antes de que `main.tsx` ejecute una línea: pantalla en blanco. Con `import()`, el error llega como promesa rechazada y se pinta la C03 «Falta configuración» con el detalle plegado. Para reconocerlo sin importar `env.ts`, el error es de una clase propia, `ErrorDeEntorno`, en `shared/lib/errorDeEntorno.ts`, un archivo sin efectos al cargarse.

Coste medido: **1,87 kB comprimidos** más en el arranque por partir el paquete en dos, y un viaje de red más en la primera visita, porque Vite no precarga el trozo de `App` desde `index.html`. A partir de la segunda visita lo sirve la precaché del service worker. Se descartaron escuchar el error desde un `<script>` en línea de `index.html`, que pinta fuera de React y del sistema de diseño, y hacer que `env.ts` no lance, que rompe la D06-21.

**Aviso de sesión a punto de caducar (criterio 2.2.1).** `app/components/AvisoSesion.tsx`, con el cálculo en `modules/auth/model/caducidad.ts`. Supabase renueva el testigo solo cuando le quedan unos noventa segundos, así que el aviso salta con **sesenta** (`AVISO_CADUCIDAD_MS`): solo aparece si la renovación automática ya ha fallado, que en la práctica es falta de cobertura. Con red no se ve nunca. «Seguir conectado» llama a `refreshSession()`; si tampoco puede, lo dice y avisa de que se renovará sola al volver la señal. Caducar no cierra la sesión ni borra nada.

### 10.2 Accesibilidad que condiciona el código

**D06-19 · `jsx-a11y` activado en `oxlint`.** Cierra la deuda que el DOC 13 dejó abierta: `oxlint` sí trae las reglas de `eslint-plugin-jsx-a11y` como plugin integrado, aunque desactivado por defecto. Se añade a `.oxlintrc.json`:

```json
{ "plugins": ["react", "typescript", "oxc", "jsx-a11y"] }
```

La cobertura de reglas no es completa todavía, así que sigue siendo un primer filtro, no una garantía: la verificación por pantalla del DOC 02 §5.3 manda. Se descartó volver a ESLint solo por esto: significaría arrastrar dos linters o perder la velocidad de `oxlint` en cada commit, a cambio de unas pocas reglas que la revisión manual ya cubre.

Convenciones que salen del DOC 02 §5 y que afectan a cómo se escribe cada componente:

- **La acción va en el `onClick` de un `<button>` real.** `onClick` se dispara al levantar el dedo y funciona con teclado; eso cumple el criterio 2.5.2 de serie. Nunca `onPointerDown` ni `onMouseDown` para ejecutar una acción, y nunca un `<div>` con manejador de clic.
- **Nada de `outline: none`** sin un indicador de foco propio de 2 px y 3:1.
- **Tamaño táctil**: 48×48 px con 8 px de separación en A12; 24×24 px como mínimo en el resto.
- **El color nunca va solo**: estado, tarjeta y fiabilidad llevan icono y texto.
- **Tablas de verdad** para las estadísticas, con `<th>`, `scope` y `caption`. Cada gráfica lleva su tabla equivalente.
- La respuesta háptica se pide con `navigator.vibrate`, que no existe en iOS. Nunca es la única confirmación: siempre hay confirmación visible.

### 10.3 Rendimiento

La pantalla que importa es A12 y su enemigo es el render en cascada. Tres reglas:

1. El estado del reloj se aísla en el componente que lo pinta. Un tick no vuelve a renderizar el campo con los once jugadores.
2. La lista de eventos se renderiza por clave estable (`clientEventId`), nunca por índice.
3. Presupuesto del paquete inicial: **por debajo de 200 kB comprimidos**. Se mide con `vite build` en cada entrega. Sin herramienta automática todavía (§13).

**El presupuesto se resolvió en la T-104, y no hizo falta ninguna de las tres salidas.** Medido con el enrutado montado de verdad, el paquete inicial fue de **167,83 kB comprimidos**, con la PWA de la T-102 encima pasó a **171,58 kB** y con el acceso de la T-105 está en **175,19 kB** y con la captura de errores de la T-106 en **179,50 kB**: quedan unos 20 kB de margen. **Tras la T-206, 180,61 kB, y tras la T-207, 180,97 kB**, con la A12 ya fuera del arranque (D06-29): Rollup saca a un trozo común (`announceContext-*.js`, con `supabase-js` dentro) lo que comparten el arranque y los trozos perezosos, y el paquete inicial pasa a contarse recorriendo las importaciones estáticas desde `index.html` y desde `App-*.js`, no por nombre de archivo. Dexie queda en `db-*.js`, fuera. La T-106 parte el arranque en dos trozos (D06-23), así que desde ahí el paquete inicial es la suma de `index-*.js`, `preload-helper-*.js`, `App-*.js`, `workbox-window` y sus tres hojas de estilo. La proyección que sigue abajo se quedaba corta por un motivo concreto: aquella medición metió las cuatro dependencias de producción en el grafo a la fuerza, y **a Dexie no lo importa nadie hasta la T-206**.

**Y una trampa que la T-105 encontró midiendo, porque el aviso es fácil de pasar por alto.** Si un archivo del paquete inicial importa de forma estática el mismo `index.ts` que el enrutador carga en perezoso, el empaquetador renuncia a separarlo y avisa con `INEFFECTIVE_DYNAMIC_IMPORT`: las pantallas del módulo se caen al arranque sin que nadie toque una línea de `router.tsx`. Por eso `app/providers/AuthProvider.tsx` importa `@modules/auth/api/...` y `@modules/auth/model/...` por ruta directa, y no el barril. La regla 3 del §4.1 rige entre módulos; `app/` es la composición.

Las tres salidas se dejan escritas porque el margen se va a estrechar —faltan por entrar A12 de verdad (T-207 y T-208), Dexie (T-206) y las pantallas del bloque de datos—, y la primera tarea que cruce los 200 kB decide con esta misma tabla.

**La proyección de la T-101, para entender la tabla.** Las cuatro dependencias de producción daban 190,27 kB comprimidos con un punto de entrada que no pintaba nada, o sea menos de 10 kB para veintiuna pantallas, los componentes base, los iconos y el runtime de la PWA. Las tres salidas, y ninguna es gratis:

| Salida                                                       | Qué gana                                              | Qué cuesta                                                                                                                         |
| :----------------------------------------------------------- | :---------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- |
| Sacar `@supabase/supabase-js` del arranque                   | 55,5 kB comprimidos, el mayor bloque después de React | La sesión se necesita en la primera pantalla, así que el retardo se paga en el arranque en vez de en el paquete                    |
| Aflojar la excepción de D06-06 y dejar A12 fuera del inicial | Recupera margen sin tocar dependencias                | Cambia «A12 abre sin cobertura sin haber pasado por ella» por «A12 abre sin cobertura si pasaste antes por la convocatoria» (§8.3) |
| Subir el presupuesto                                         | Honesto: una cifra medida contra el 3G de un campo    | Hay que medirla de verdad antes de escribirla, no elegirla para que quepa lo que ya hay                                            |

Ninguna está aplicada. La medición real de la T-104 dejó margen de sobra y aplicarlas «por si acaso» habría pagado su coste sin necesidad.

**Herramienta de medición.** `vite build` con la variable `NODE_ENV` puesta a `development` empaqueta React en modo desarrollo y da una cifra falsa, un 50 % por encima. La máquina de desarrollo la tiene puesta a `production` en el sistema, lo que a su vez hace que `npm ci` se salte las devDependencies. Se quita de la terminal antes de instalar y antes de medir.

---

## 11. Pruebas

**D06-20 · Vitest más Testing Library desde la primera tarea de código.**
Con jsdom, `@testing-library/user-event` y `fake-indexeddb` para la cola. Script `npm run test`, y `npm run test -- --run` en el workflow de CI junto al lint y el build.

**Montado el 19/09/2026**, y esto es lo que hay:

| Pieza         | Dónde                                                                              |
| :------------ | :--------------------------------------------------------------------------------- |
| Configuración | Bloque `test` en `vite.config.ts`, no en un `vitest.config.ts` aparte              |
| Entorno       | `jsdom`                                                                            |
| Preparación   | `src/test/setup.ts`: comparadores de `@testing-library/jest-dom` y limpieza de RTL |
| Guion         | `npm run test` en `package.json`                                                   |
| CI            | Paso «Pruebas» con `npm run test -- --run`, dentro del trabajo «Lint y build»      |
| Cobertura     | `v8`, informes `text` y `html`, **sin umbrales**                                   |

La configuración vive en `vite.config.ts` para que los alias de `resolve` sean literalmente los mismos que usa la aplicación. Un `vitest.config.ts` aparte obligaría a mantener el mapa de alias por tercera vez —ya son dos, con `tsconfig.app.json`— y una desviación entre ellos compila pero no arranca.

**Sin `globals: true`.** Cada prueba importa de `vitest` lo que usa, igual que cualquier otro módulo del proyecto, así que no hace falta ampliar los `types` de `tsconfig.app.json` y `tsc -b` comprueba las pruebas tal cual. El precio: Testing Library no puede engancharse sola a un `afterEach` global, y la limpieza del DOM se registra a mano en `src/test/setup.ts`.

Para que no se coma la ruta crítica hasta el 25 de octubre, el alcance va acotado por escrito:

| Qué                                                                              | ¿Se prueba?                     |
| :------------------------------------------------------------------------------- | :------------------------------ |
| `model/`: reloj, reductor del partido, cálculo de tramos, duplicados, validación | **Siempre.** Sin excepción      |
| Cola de salida: orden, reintentos, idempotencia, errores 4xx                     | **Siempre**                     |
| Componentes que registran datos: botonera, flujo encadenado, convocatoria        | **Sí**, camino feliz y un fallo |
| Pantallas de consulta del Bloque B                                               | Después de la Fase 4            |
| Maquetación, estilos, animaciones                                                | No                              |

La regla en una línea: **si un fallo ahí pierde un dato, se prueba.**

Los dobles se ponen en la frontera de `api/`, que es estrecha y propia. Se descartó **MSW**: interceptar peticiones HTTP obliga a imitar la forma de las respuestas de PostgREST, que es un detalle de implementación de Supabase y cambia sin avisar. Simular la función `insertMatchEvent` es más estable y más rápido.

Nada de perseguir un porcentaje de cobertura. Se mide, se mira y no se convierte en objetivo. Por eso la cobertura se configura sin umbrales: uno solo consigue romper la construcción por una cifra que nadie ha acordado, y el camino corto para arreglarlo son pruebas que tocan líneas sin comprobar nada.

**D06-20b · La primera prueba es de `env.ts`, no del `model/` de `match`.**
La tabla de arriba sigue mandando: el `model/` se prueba siempre y sin excepción. Pero al montar el arnés ese módulo todavía no existía —llega con la T-207— y montar el arnés sin nada que probar es dejarlo a medias otra vez. `shared/lib/env.ts` encaja con la regla de la línea: es lógica pura, sin React ni red, valida las tres variables de entorno al arrancar y su trabajo es romper pronto y con un mensaje claro cuando un despliegue está mal configurado. Un fallo ahí no se ve hasta producción.

Diecisiete casos cubren las tres variables correctas, cada una faltando o con solo espacios, una URL sin `https`, una que ni siquiera es una URL, un entorno fuera de la lista y varios fallos a la vez. Tres de ellos vigilan que la clave anónima **nunca** aparezca en el mensaje de error: `env.ts` la omite a propósito (§12) y es lo primero que rompe una refactorización que busque «mensajes más útiles».

**`env.ts` no se toca para hacerlo más cómodo de probar.** Lanza desde el cuerpo del módulo por la D06-21: el fallo tiene que ocurrir al arrancar. La prueba se adapta a eso —`vi.resetModules()`, `vi.stubEnv()` y un `await import()` por caso, con las tres variables fijadas siempre para que un `.env.local` de la máquina no cambie el resultado—, y esa forma vale de plantilla para cualquier otro módulo que valide al importarse.

**D06-24 · TypeScript estricto, escrito a mano y vigilado por el linter.** 25/09/2026. Nació como «D06-22» por error, con ese número ya ocupado en el §5.5; se renumera en la T-107.
TypeScript 6 trae `strict` encendido por defecto, así que el proyecto compila en estricto desde la T-101 aunque ningún `tsconfig` lo dijera. Se escribe `"strict": true` en `tsconfig.app.json` y en `tsconfig.node.json` para que no dependa de la versión del compilador: una vuelta atrás a TypeScript 5 lo apagaría en silencio.

Lo que `strict` no impide lo prohíbe `oxlint`, en error y no en aviso:

| Regla                              | Qué prohíbe                                             |
| :--------------------------------- | :------------------------------------------------------ |
| `typescript/no-explicit-any`       | `any` escrito a mano. Para lo desconocido, `unknown`    |
| `typescript/no-non-null-assertion` | El `!` de aserción para callar al compilador            |
| `typescript/ban-ts-comment`        | `@ts-ignore`, `@ts-expect-error` y `@ts-nocheck`, todos |

`@ts-expect-error` se prohíbe también con descripción, que es lo que la regla deja pasar por defecto: el error se arregla, no se comenta.

`noUncheckedIndexedAccess` sigue **apagado**. Encenderlo hoy saca siete errores, seis en `permissions.test.ts` y uno en `permissions.ts`. La decisión y sus salidas están en el DOC 13.

---

## 12. Variables de entorno

Solo las que empiezan por `VITE_` llegan al navegador, y todo lo que llegue al navegador es público. La `service_role` no aparece en ningún archivo del frontend, ni siquiera en `.env.local`.

**D06-21 · Validación al arrancar, en un solo sitio.**
`shared/lib/env.ts` lee `import.meta.env`, comprueba que están todas y falla con un mensaje claro si falta alguna. El resto de la aplicación importa `env`, nunca `import.meta.env`. Una variable que falta tiene que romper al arrancar en local, no producir un `undefined` que viaja hasta una llamada de red en producción.

Variable nueva: se añade a `.env.example`, a `env.ts` y al panel de Netlify **en el mismo commit**.

---

## 13. Deuda técnica que genera este documento

| Deuda                                                                                                    | Cuándo se paga                                                                                           |
| :------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------- |
| Los límites entre módulos los vigila una persona, no una regla del linter                                | Cuando `oxlint` cubra restricciones de importación, o si aparece un segundo desarrollador                |
| El presupuesto de 200 kB se comprueba a ojo en la salida de `vite build`                                 | Si el paquete crece. Una acción de CI lo automatiza en diez minutos                                      |
| Sin envío en segundo plano: con la aplicación cerrada, la cola espera                                    | Asumida. La alternativa deja fuera a los iPhone                                                          |
| La cobertura de `jsx-a11y` en `oxlint` es parcial                                                        | Se revisa cada pocos meses. La verificación manual del DOC 02 §5.3 no se sustituye                       |
| Sin pruebas de extremo a extremo: nadie prueba el flujo completo del día de partido en un navegador real | Después del MVP. Hasta entonces, los amistosos son la prueba                                             |
| El estado de sesión y el equipo activo viven en `localStorage` sin cifrar                                | No se paga: ahí solo hay identificadores, y la RLS decide igual                                          |
| La reconciliación entre lo local y lo remoto se apoya solo en `client_event_id`                          | Basta mientras no se editen eventos desde dos dispositivos a la vez. Si pasa, hace falta versión de fila |
| La librería de gráficas sigue sin elegir (Recharts o Chart.js)                                           | En la Fase 4, junto al DOC 07. No bloquea ninguna pantalla del Bloque A                                  |

---

## 14. Qué desbloquea este documento

- **DOC 07** — ya sabe dónde viven los tokens, cómo se inyecta el color de equipo y que los componentes llevan CSS Modules.
- **DOC 08** — la lista de tareas puede escribirse con archivos y rutas reales, y con el orden de §2.3 para las dependencias.
- **DOC 09** — el Error Boundary, las tres capas de captura y el envío a `error_logs` tienen sitio asignado.
- **DOC 10** — las variables de entorno, su validación y el comportamiento de la PWA en cada despliegue quedan definidos.

La primera tarea de código, la T-101, está cerrada: dependencias, alias, validación del entorno y cliente de Supabase. La siguiente es la **T-102**, PWA y metadatos, y ya se puede especificar entera contra este documento.
