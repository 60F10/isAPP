# Pruebas en navegador

Recorren la aplicación compilada con un Chromium de verdad, contra un PostgreSQL de verdad, con sus políticas y sus disparadores. Corren solas en GitHub Actions, en cada pull request y en cada fusión a `main` (`.github/workflows/e2e.yml`, flujo «E2E»).

**Nunca tocan producción.** La base es un Supabase local que nace en el trabajo y muere con él. Aquí no hay ni la URL ni una clave del proyecto real, y `ayudas/entorno.ts` se niega a arrancar contra una dirección que no sea de la propia máquina.

## Qué levanta el flujo

1. `supabase start`, con base, API, autenticación y Realtime. Al arrancar aplica `supabase/migrations/` entero, desde cero.
2. `e2e/plataforma.sql`: la función `rls_auto_enable()` y el disparador `ensure_rls`, que en producción pone la plataforma y el Supabase local no trae.
3. `npm run build` con la URL y la clave anónima de la base local, que quedan dentro del paquete.
4. `npm run e2e`. Playwright sirve `dist/` con `vite preview`, lanza la preparación (`preparacion.ts`) y después las pruebas, de una en una.
5. Sube el informe como artefacto, «informe-de-playwright». De las pruebas que fallan trae la traza y la captura.

La API local va por HTTPS con el certificado autofirmado de la CLI, porque la aplicación rechaza una URL que no sea https. La aplicación no se toca para probarla.

**No se pueden lanzar en una sesión en la nube ni, hoy, en el ordenador de desarrollo:** hace falta Docker para el Supabase local. Un cambio se comprueba subiendo la rama y mirando el flujo.

Lo que sí se puede en una sesión en la nube es **ensayarlas antes de subir**, contra un PostgreSQL, un GoTrue y un PostgREST sueltos. La receta está en el proyecto de Claude, `claude/ensayo_e2e_sin_docker.md`. Es un ensayo, no la prueba: lo que vale es el flujo.

## Las tres personas

| Persona      | Correo                | Qué puede                               |
| :----------- | :-------------------- | :-------------------------------------- |
| `entrenador` | `entrenador@e2e.test` | Los doce permisos del equipo            |
| `anotador`   | `anotador@e2e.test`   | `match.live.write` y `stats.view`       |
| `seguidor`   | `seguidor@e2e.test`   | Nada: solo sigue al equipo, sin función |

Las crea la preparación, con contraseñas aleatorias que no se escriben en ningún sitio, y deja la sesión de cada una en `e2e/.estado/`. La aplicación solo ofrece Google y Google no se automatiza: la sesión se siembra por debajo. **El botón «Entrar con Google» y la vuelta por `/auth/callback` quedan sin probar.**

Una prueba elige quién es con una línea, para el archivo entero o dentro de un `test.describe`:

```ts
import { estadoDe, SIN_SESION } from './ayudas/personas';

test.use({ storageState: estadoDe('anotador') });
// Y para probar sin sesión: test.use({ storageState: SIN_SESION });
```

## Los datos

Los pone `siembra.sql`, con identificadores fijos que `ayudas/datos.ts` nombra: `CLUB`, `TEMPORADA`, `EQUIPO` («Equipo de pruebas»), `RIVAL` («Rival de pruebas»), `LIGA` («Liga de pruebas», con el reglamento del cadete) y `jugador(n)`, de «Jugador 1» a «Jugador 14». El 1 es el portero. Todo es inventado: ningún nombre real, de nadie.

**No hay partidos sembrados: cada prueba crea el suyo y lo borra.**

```ts
import { borrarPartido, crearPartido } from './ayudas/datos';

let partido = '';

test.beforeAll(async () => {
  // Por defecto: programado, en casa y mañana. Admite `estado`, `cuando` y `enCasa`.
  partido = await crearPartido({ estado: 'called' });
});

test.afterAll(async () => {
  await borrarPartido(partido);
});
```

`crearPartido` escribe con la clave de servicio: es preparar datos. Para probar el alta de un partido, se usa la pantalla.

Las pruebas comparten la base y corren de una en una (`workers: 1`). Lo que una prueba crea, lo borra: si no, sale en el Inicio y en el calendario de la siguiente.

## Leer la base desde Node

Hay dos clientes de `supabase-js`, en `ayudas/clientes.ts`, y sirven para cosas distintas:

```ts
import { clienteDe, clienteDeServicio } from './ayudas/clientes';
import { sesionDe } from './ayudas/personas';

// Lo que guardó la pantalla, leído sin RLS.
const { data } = await clienteDeServicio()
  .from('match_events')
  .select('event_type, status, created_by')
  .eq('match_id', partido);

// Lo que la base le deja a una persona: su sesión, bajo la RLS.
const intento = await clienteDe('seguidor').from('match_events').insert(evento);
expect(intento.error?.code).toBe('42501');

// Su identificador, para `created_by` y para comparar.
const { userId } = sesionDe('anotador');
```

**Un permiso no se prueba nunca con `clienteDeServicio`**: con él todo entra. Y una prueba de «no le deja» lleva su control: la misma operación, hecha por quien sí puede, entra. Sin el control pasaría también si la base rechazara a todo el mundo.

## Accesibilidad

`ayudas/accesibilidad.ts` tiene dos comprobaciones: `sinInfraccionesGraves(page)`, que pasa `axe` con las reglas de WCAG 2.2 AA y falla con las infracciones graves y críticas, y `sinDesplazamientoHorizontal(page)`. Antes de llamarlas, espera a que la pantalla haya terminado de cargar: `axe` mira lo que hay en ese instante.

Es una red, no la verificación por pantalla del DOC 02 §5: un programa no sabe si el orden del foco tiene sentido.

## Cuando una prueba destapa un fallo

**La tarea de pruebas no arregla la aplicación.** El fallo se apunta en `docs/13_HANDOFF.md` como punto nuevo y la prueba se marca con `test.fixme`, con el número del punto en un comentario encima. El conjunto queda en verde y el fallo, apuntado. Quien lo arregle quita el `fixme`.

```ts
// DOC 13, punto 92: Inicio no le dice su equipo a quien tiene función en él.
test.fixme('abre Inicio y lee el nombre de su equipo', async ({ page }) => {
  // …
});
```

Con `axe` es igual: la regla que una pantalla incumple se apunta en el DOC 13 y se excluye **por su identificador y solo en esa pantalla**, con el número del punto al lado (`excluir`, en `accesibilidad.spec.ts`). Nunca se apaga `axe` entero ni una pantalla entera.

## Añadir una prueba

1. Un archivo `e2e/lo-que-sea.spec.ts`. Vitest no lo ve: su `include` es `src/**`.
2. Elige persona con `test.use`.
3. Busca los elementos por su rol y su nombre (`getByRole`), como los encuentra quien usa un lector de pantalla. Nada de clases de CSS.
4. Antes de afirmar que algo **no** está, espera a algo que sí tenga que estar: mientras los permisos cargan, tampoco está.
5. Sube la rama y mira el flujo «E2E» de la pull request.
