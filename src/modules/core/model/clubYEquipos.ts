// Club y equipos: lógica pura de las pantallas A03 y A04 (T-201).
//
// Sin React ni red. Valida lo que se escribe antes de mandarlo, ordena la
// lista de equipos y traduce a una frase lo que la base contesta cuando dice
// que no.
//
// Los largos máximos son de interfaz, no del esquema: `clubs` y `teams` no
// limitan el texto (DOC 05 §5.2 y §5.4). Se ponen para que un nombre quepa
// en una cabecera de móvil y en la ficha de un partido.

import { limpiarTexto, mensajeDeErrorAlGuardar as mensajeComun } from '@shared/lib/guardado';

// Se reexportan para no cambiar los `import` de `core`: viven en `shared/lib`
// desde la T-203, cuando `rules` los necesitó también.
export { limpiarTexto, SIN_FILAS } from '@shared/lib/guardado';

export type TipoDeEquipo = 'managed' | 'reference';

export interface Club {
  id: string;
  name: string;
  /** Para cabeceras estrechas (DOC 05 §5.2). */
  shortName: string | null;
  /** Ruta en Storage. Hoy siempre nula: el cubo `crests` no existe. */
  crestUrl: string | null;
}

export interface Equipo {
  id: string;
  clubId: string;
  name: string;
  category: string | null;
  /** `managed` con plantilla; `reference`, un rival: solo nombre y escudo. */
  kind: TipoDeEquipo;
  crestUrl: string | null;
}

export const LARGO_NOMBRE_CLUB = 80;
export const LARGO_NOMBRE_CORTO = 20;
export const LARGO_NOMBRE_EQUIPO = 60;
export const LARGO_CATEGORIA = 40;

function demasiadoLargo(largo: number): string {
  return `Como mucho ${largo} caracteres.`;
}

/** Comparación de nombres a efectos de «repetido»: sin mayúsculas ni espacios de más. */
function claveDeNombre(nombre: string): string {
  return limpiarTexto(nombre).toLocaleLowerCase('es');
}

export interface ResultadoClub {
  errores: { nombre?: string; nombreCorto?: string };
  /** Listo para `clubs`, o `null` si hay algún error. */
  valores: { name: string; short_name: string | null } | null;
}

export function validarClub(entrada: { nombre: string; nombreCorto: string }): ResultadoClub {
  const nombre = limpiarTexto(entrada.nombre);
  const nombreCorto = limpiarTexto(entrada.nombreCorto);
  const errores: ResultadoClub['errores'] = {};

  if (nombre === '') {
    errores.nombre = 'Escribe el nombre del club.';
  } else if (nombre.length > LARGO_NOMBRE_CLUB) {
    errores.nombre = demasiadoLargo(LARGO_NOMBRE_CLUB);
  }

  if (nombreCorto.length > LARGO_NOMBRE_CORTO) {
    errores.nombreCorto = demasiadoLargo(LARGO_NOMBRE_CORTO);
  }

  if (Object.keys(errores).length > 0) {
    return { errores, valores: null };
  }

  return {
    errores,
    valores: { name: nombre, short_name: nombreCorto === '' ? null : nombreCorto },
  };
}

export interface ResultadoEquipo {
  errores: { nombre?: string; categoria?: string };
  /** Listo para `teams`, o `null` si hay algún error. */
  valores: { name: string; category: string | null; kind: TipoDeEquipo } | null;
}

/**
 * Valida un equipo nuevo o editado.
 *
 * @param otros equipos del mismo club, para no repetir nombre. La base lo
 *   impide igual (`teams_name_unique`), pero avisar antes de enviar evita un
 *   viaje de red y da el error junto al campo.
 * @param idActual al editar, el propio equipo, que no cuenta como repetido.
 */
export function validarEquipo(
  entrada: { nombre: string; categoria: string; tipo: TipoDeEquipo },
  otros: readonly Pick<Equipo, 'id' | 'name'>[],
  idActual?: string,
): ResultadoEquipo {
  const nombre = limpiarTexto(entrada.nombre);
  const categoria = limpiarTexto(entrada.categoria);
  const errores: ResultadoEquipo['errores'] = {};

  if (nombre === '') {
    errores.nombre = 'Escribe el nombre del equipo.';
  } else if (nombre.length > LARGO_NOMBRE_EQUIPO) {
    errores.nombre = demasiadoLargo(LARGO_NOMBRE_EQUIPO);
  } else if (
    otros.some((otro) => otro.id !== idActual && claveDeNombre(otro.name) === claveDeNombre(nombre))
  ) {
    errores.nombre = 'Ya hay un equipo con ese nombre en el club.';
  }

  if (categoria.length > LARGO_CATEGORIA) {
    errores.categoria = demasiadoLargo(LARGO_CATEGORIA);
  }

  if (Object.keys(errores).length > 0) {
    return { errores, valores: null };
  }

  return {
    errores,
    valores: { name: nombre, category: categoria === '' ? null : categoria, kind: entrada.tipo },
  };
}

/**
 * Los equipos propios primero y los rivales después, cada grupo por nombre
 * con el orden alfabético del español (la «ñ» va tras la «n»). Devuelve una
 * lista nueva: la de la caché de react-query no se toca.
 */
export function ordenarEquipos<T extends Pick<Equipo, 'name' | 'kind'>>(
  equipos: readonly T[],
): T[] {
  return [...equipos].sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === 'managed' ? -1 : 1;
    }

    return a.name.localeCompare(b.name, 'es');
  });
}

/** Mismo mensaje que el común, con el duplicado que importa en la A04. */
export function mensajeDeErrorAlGuardar(
  error: unknown,
  repetido = 'Ya hay un equipo con ese nombre en el club.',
): string {
  return mensajeComun(error, repetido);
}
