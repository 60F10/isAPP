// Preferencias de pantalla de la C01 (T-107, DOC 02 §5.2, DOC 07 §4 y §6).
//
// Dos interruptores: alto contraste y movimiento reducido. Cada uno escribe un
// atributo en `<html>` —`data-contrast="high"` y `data-motion="reduced"`— y
// `tokens.css` redefine las variables debajo. Ningún componente se entera.
//
// DÓNDE SE GUARDAN, Y POR QUÉ NO ES DONDE DICE EL DOC 07 §4. El DOC 07 pide
// guardarlas en el perfil del usuario, y `profiles` no tiene columna para
// ellas: hace falta una migración, que esta tarea no puede hacer. Mientras
// tanto viven en `localStorage` de este dispositivo. Tiene una ventaja que
// no es menor: se aplican al arrancar sin esperar a la red, que es justo lo
// que pide el móvil al sol con poca cobertura. El traspaso (DOC 13) deja las
// salidas.
//
// Vive en `shared/lib` y no en un módulo porque el ámbito `platform` no tiene
// carpeta propia (DOC 06 §3.3) y `main.tsx` la necesita antes de cargar nada
// más.

export interface Preferencias {
  altoContraste: boolean;
  movimientoReducido: boolean;
}

export const PREFERENCIAS_POR_DEFECTO: Preferencias = {
  altoContraste: false,
  movimientoReducido: false,
};

export const CLAVE_PREFERENCIAS = 'sasi.preferencias';

function booleanoO(valor: unknown, porDefecto: boolean): boolean {
  return typeof valor === 'boolean' ? valor : porDefecto;
}

/**
 * Convierte lo guardado en preferencias válidas.
 *
 * Nunca lanza: lo guardado puede venir de una versión anterior, de otra
 * pestaña a medio escribir o de alguien que lo tocó a mano. Lo que no se
 * entiende vuelve al valor por defecto, campo a campo.
 */
export function interpretarPreferencias(crudo: string | null): Preferencias {
  if (crudo === null) {
    return PREFERENCIAS_POR_DEFECTO;
  }

  let datos: unknown;

  try {
    datos = JSON.parse(crudo);
  } catch {
    return PREFERENCIAS_POR_DEFECTO;
  }

  if (typeof datos !== 'object' || datos === null) {
    return PREFERENCIAS_POR_DEFECTO;
  }

  const campos: Record<string, unknown> = { ...datos };

  return {
    altoContraste: booleanoO(campos.altoContraste, PREFERENCIAS_POR_DEFECTO.altoContraste),
    movimientoReducido: booleanoO(
      campos.movimientoReducido,
      PREFERENCIAS_POR_DEFECTO.movimientoReducido,
    ),
  };
}

/**
 * Lee las preferencias de este dispositivo.
 *
 * `localStorage` puede lanzar —ventana privada, almacenamiento bloqueado—, y
 * esto se llama al arrancar: un fallo aquí no puede dejar la aplicación sin
 * abrir por una preferencia de pantalla.
 */
export function leerPreferencias(
  almacen: Pick<Storage, 'getItem'> = window.localStorage,
): Preferencias {
  try {
    return interpretarPreferencias(almacen.getItem(CLAVE_PREFERENCIAS));
  } catch {
    return PREFERENCIAS_POR_DEFECTO;
  }
}

/** Guarda las preferencias. Si no se puede, duran lo que dure la pestaña. */
export function guardarPreferencias(
  preferencias: Preferencias,
  almacen: Pick<Storage, 'setItem'> = window.localStorage,
): void {
  try {
    almacen.setItem(CLAVE_PREFERENCIAS, JSON.stringify(preferencias));
  } catch {
    // Sin almacenamiento, el cambio vale para esta visita y se pierde al
    // cerrar. Tumbar el interruptor por eso sería peor.
  }
}

/** Escribe o quita los dos atributos de `<html>` que leen los tokens. */
export function aplicarPreferencias(
  preferencias: Preferencias,
  raiz: HTMLElement = document.documentElement,
): void {
  if (preferencias.altoContraste) {
    raiz.dataset.contrast = 'high';
  } else {
    delete raiz.dataset.contrast;
  }

  if (preferencias.movimientoReducido) {
    raiz.dataset.motion = 'reduced';
  } else {
    delete raiz.dataset.motion;
  }
}
