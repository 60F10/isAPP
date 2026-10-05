// Acceso a datos del módulo `logging` (D06-07).

import { supabase } from '@shared/lib/supabase';

import { TAMANO_DE_PAGINA } from '../model/consulta';

import type { Json } from '@app-types/database.types';
import type { CursorDeErrores, FiltrosDeErrores } from '../model/consulta';
import type { Dispositivo, FilaDeError } from '../model/errorLog';

/**
 * Inserta una fila en `error_logs`.
 *
 * Sin `.select()` detrás, a propósito: la RLS deja insertar a cualquiera con
 * sesión (`error_logs_insert`, DOC 05 §12), pero leer solo al administrador de
 * plataforma. Pedir la fila de vuelta haría fallar la inserción entera a
 * cualquier otro usuario.
 */
export async function insertarErrorLog(fila: FilaDeError): Promise<void> {
  const { error } = await supabase.from('error_logs').insert(fila);

  if (error) {
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Lectura para la C02 (T-303). Solo `is_platform_admin()` recibe filas.
// ---------------------------------------------------------------------------

export type { CursorDeErrores, FiltrosDeErrores } from '../model/consulta';

export interface ErrorRegistrado {
  id: string;
  createdAt: string;
  mensaje: string;
  ruta: string | null;
  traza: string | null;
  dispositivo: Dispositivo;
  appVersion: string | null;
  /** `display_name` de quien tuvo el error; `null` si no se pudo resolver. */
  nombre: string | null;
}

export interface PaginaDeErrores {
  filas: ErrorRegistrado[];
  hayMas: boolean;
}

/**
 * Escapa lo que `LIKE` toma por comodín (`%`, `_` y la barra) y quita el `*`,
 * que en los filtros de PostgREST también hace de comodín.
 */
export function escaparComodines(texto: string): string {
  return texto.replace(/\*/g, '').replace(/[\\%_]/g, (letra) => `\\${letra}`);
}

function inicioDelDia(): Date {
  const ahora = new Date();

  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}

function comoDispositivo(valor: Json | null): Dispositivo {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return {};
  }

  const salida: Dispositivo = {};

  for (const [clave, dato] of Object.entries(valor)) {
    if (typeof dato === 'string' || typeof dato === 'number' || typeof dato === 'boolean') {
      salida[clave] = dato;
    }
  }

  return salida;
}

/** ¿Es administrador de plataforma quien tiene la sesión? Lo dice su perfil. */
export async function fetchEsAdministrador(): Promise<boolean> {
  const { data: sesion } = await supabase.auth.getSession();

  if (sesion.session === null) {
    return false;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', sesion.session.user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.is_platform_admin === true;
}

/** `display_name` por `id` de perfil. Sin correos: solo se pide esa columna. */
export async function fetchNombres(ids: readonly string[]): Promise<Map<string, string>> {
  const nombres = new Map<string, string>();

  if (ids.length === 0) {
    return nombres;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', [...ids]);

  if (error) {
    throw error;
  }

  for (const perfil of data) {
    if (perfil.display_name !== null) {
      nombres.set(perfil.id, perfil.display_name);
    }
  }

  return nombres;
}

/**
 * Una página de errores, del más reciente al más antiguo (`created_at` e `id`
 * descendentes), con los filtros aplicados en la consulta. Se pagina por
 * cursor y no por desplazamiento: si entra un error mientras se mira, la
 * página siguiente no repite ni se salta ninguna fila. `desde` es la última
 * fila vista, y se pide lo anterior: `created_at` menor, o igual con `id`
 * menor. Se piden `TAMANO_DE_PAGINA + 1` para saber si queda más sin una
 * segunda consulta de recuento.
 */
export async function fetchErrores(
  filtros: FiltrosDeErrores,
  desde: CursorDeErrores | null,
): Promise<PaginaDeErrores> {
  let consulta = supabase
    .from('error_logs')
    .select('id, user_id, route, message, stack, device, app_version, created_at')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(TAMANO_DE_PAGINA + 1);

  if (desde !== null) {
    consulta = consulta.or(
      `created_at.lt.${desde.createdAt},and(created_at.eq.${desde.createdAt},id.lt.${desde.id})`,
    );
  }

  if (filtros.origen !== 'todos') {
    consulta = consulta.like('message', `[${filtros.origen}]%`);
  }

  // El vacío se mira después de escapar: una ruta que fuera solo `*` se
  // quedaría en `%%` y dejaría fuera las filas sin ruta.
  const ruta = escaparComodines(filtros.ruta.trim());

  if (ruta !== '') {
    consulta = consulta.ilike('route', `%${ruta}%`);
  }

  if (filtros.soloHoy) {
    consulta = consulta.gte('created_at', inicioDelDia().toISOString());
  }

  const { data, error } = await consulta;

  if (error) {
    throw error;
  }

  const hayMas = data.length > TAMANO_DE_PAGINA;
  const pagina = data.slice(0, TAMANO_DE_PAGINA);
  const ids = [...new Set(pagina.flatMap((fila) => (fila.user_id === null ? [] : [fila.user_id])))];
  const nombres = await fetchNombres(ids);

  return {
    hayMas,
    filas: pagina.map((fila) => ({
      id: fila.id,
      createdAt: fila.created_at,
      mensaje: fila.message,
      ruta: fila.route,
      traza: fila.stack,
      dispositivo: comoDispositivo(fila.device),
      appVersion: fila.app_version,
      nombre: fila.user_id === null ? null : (nombres.get(fila.user_id) ?? null),
    })),
  };
}

/** Cuántos errores hay desde `desde`. Solo recuento: no baja ninguna fila. */
export async function contarErroresDesde(desde: Date): Promise<number> {
  const { count, error } = await supabase
    .from('error_logs')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', desde.toISOString());

  if (error) {
    throw error;
  }

  return count ?? 0;
}
