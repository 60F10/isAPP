// El transporte de la cola: un trabajo, una petición a Supabase (T-206).
//
// Nunca lanza: devuelve lo que pasó reducido a `ResultadoDeEnvio`, y decide
// `model/cola.ts`. Una petición sin respuesta llega de `supabase-js` como
// error con estado 0, y así se queda.
//
// LAS FILAS VIAJAN SIN TIPO. La cola guarda JSON en IndexedDB y no sabe qué
// es un gol (DOC 06 §4.2): el tipo de cada fila lo comprueba `match` al
// encolarla, contra los tipos generados. Aquí se entrega tal cual.
//
// - `insert` inserta. El duplicado lo decide `clasificar`.
// - `update` pide la fila de vuelta y, si no toca ninguna, es `SIN_FILAS`:
//   la RLS dijo que no sin decir nada (DOC 06 §10.1).
// - `delete` también la pide, pero cero filas es éxito: lo borrado ya no está,
//   que es lo que se quería. Reintentar un borrado no puede fallar por eso.

import { SIN_FILAS } from '@shared/lib/guardado';
import { supabase } from '@shared/lib/supabase';

import type { ResultadoDeEnvio } from '../model/cola';
import type { Database } from '@app-types/database.types';
import type { Entidad, Trabajo } from '@shared/lib/db';

type Tabla = keyof Database['public']['Tables'];

const TABLAS = {
  match: 'matches',
  match_event: 'match_events',
  match_period: 'match_periods',
  match_squad: 'match_squad',
  coverage: 'coverage_declarations',
} as const satisfies Record<Entidad, Tabla>;

interface Respuesta {
  data: unknown;
  error: { code: string; message: string } | null;
  status: number;
}

function aResultado(respuesta: Respuesta, sinFilasEsExito: boolean): ResultadoDeEnvio {
  if (respuesta.error !== null) {
    return {
      ok: false,
      status: respuesta.status,
      code: respuesta.error.code === '' ? null : respuesta.error.code,
      mensaje: respuesta.error.message,
    };
  }

  const filas = Array.isArray(respuesta.data) ? respuesta.data.length : 1;

  if (filas === 0 && !sinFilasEsExito) {
    return { ok: false, status: respuesta.status, code: SIN_FILAS, mensaje: null };
  }

  return { ok: true, status: respuesta.status, code: null, mensaje: null };
}

/**
 * Las tres operaciones sobre una tabla cualquiera. `supabase.from()` con un
 * nombre que no es literal pierde el tipo de la fila, y eso es lo que se
 * quiere aquí: la fila ya viene comprobada (ver la cabecera).
 */
function consultar(tabla: Tabla, trabajo: Trabajo): PromiseLike<Respuesta> {
  const { valores, clave = {} } = trabajo.payload;
  const desde = supabase.from(tabla);

  if (trabajo.op === 'insert') {
    return desde.insert(valores as never);
  }

  if (trabajo.op === 'update') {
    return desde
      .update(valores as never)
      .match(clave)
      .select();
  }

  return desde.delete().match(clave).select();
}

export async function enviar(trabajo: Trabajo): Promise<ResultadoDeEnvio> {
  try {
    const respuesta = await consultar(TABLAS[trabajo.entity], trabajo);

    return aResultado(respuesta, trabajo.op !== 'update');
  } catch (error) {
    return {
      ok: false,
      status: 0,
      code: null,
      mensaje: error instanceof Error ? error.message : String(error),
    };
  }
}
