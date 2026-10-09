// Las tres personas de prueba y su sesión (T-236).
//
// Nacen en la preparación (`e2e/preparacion.ts`), que deja la sesión de cada
// una en `e2e/.estado/<persona>.json`, en el formato `storageState` de
// Playwright. Una prueba elige quién es con una línea:
//
//   test.use({ storageState: estadoDe('anotador') });
//
// La aplicación solo ofrece Google, y Google no se automatiza: la sesión se
// siembra en el `localStorage` del navegador, que es donde `supabase-js` la
// guarda. Ningún camino nuevo de entrada llega al código de la aplicación.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type Persona = 'entrenador' | 'anotador' | 'seguidor';

/**
 * Quién es quién. Los permisos los da `e2e/siembra.sql`:
 *  - entrenador: los doce permisos del equipo.
 *  - anotador: `match.live.write` y `stats.view`.
 *  - seguidor: ninguno. Solo sigue al equipo.
 */
export const CORREOS: Record<Persona, string> = {
  entrenador: 'entrenador@e2e.test',
  anotador: 'anotador@e2e.test',
  seguidor: 'seguidor@e2e.test',
};

export const PERSONAS: readonly Persona[] = ['entrenador', 'anotador', 'seguidor'];

/** Carpeta de los estados: fuera de Git, se rehace en cada ejecución. */
export const CARPETA_DE_ESTADOS = fileURLToPath(new URL('../.estado/', import.meta.url));

/** El archivo `storageState` de una persona, para `test.use`. */
export function estadoDe(persona: Persona): string {
  return `${CARPETA_DE_ESTADOS}${persona}.json`;
}

/** Sin sesión: para probar que todo lleva al acceso. */
export const SIN_SESION = { cookies: [], origins: [] };

export interface Sesion {
  accessToken: string;
  userId: string;
}

interface EstadoGuardado {
  origins: { localStorage: { name: string; value: string }[] }[];
}

function esTexto(valor: unknown): valor is string {
  return typeof valor === 'string' && valor !== '';
}

/**
 * La sesión que la preparación dejó para una persona: su testigo de acceso y
 * su identificador. Sale del mismo archivo que usa el navegador, así que Node
 * y la pantalla son la misma cuenta con la misma sesión.
 */
export function sesionDe(persona: Persona): Sesion {
  const estado = JSON.parse(readFileSync(estadoDe(persona), 'utf8')) as EstadoGuardado;

  for (const origen of estado.origins) {
    for (const entrada of origen.localStorage) {
      if (!/^sb-.+-auth-token$/.test(entrada.name)) {
        continue;
      }

      const sesion = JSON.parse(entrada.value) as {
        access_token?: unknown;
        user?: { id?: unknown };
      };

      if (esTexto(sesion.access_token) && esTexto(sesion.user?.id)) {
        return { accessToken: sesion.access_token, userId: sesion.user.id };
      }
    }
  }

  throw new Error(`No hay sesión guardada de «${persona}»: ¿ha corrido la preparación?`);
}
