// A quién le toca vaciar la cola (DOC 06 §8.5, D06-35, T-216).
//
// Sin DOM ni cerrojos: `api/arranque.ts` mira la visibilidad y pide el
// cerrojo, y aquí se decide qué hacer con lo que se encontró.
//
// Solo vacía la página que se ve. Una oculta, en el móvil, se despierta una
// vez por minuto, coge el cerrojo, manda un trabajo y se duerme con el
// cerrojo cogido: la que se ve no vaciaba nunca. Por eso una oculta espera
// siempre, y una visible que se encuentra el cerrojo ocupado dos veces
// seguidas se lo quita a quien lo tenga.

/** Intentos seguidos con el cerrojo ocupado a partir de los cuales se roba. */
export const FALLOS_PARA_ROBAR = 2;

export type Turno = 'vaciar' | 'robar' | 'esperar';

/**
 * @param visible si la página se ve ahora mismo.
 * @param cerrojoLibre si el cerrojo se ha conseguido en este intento.
 * @param fallosSeguidos intentos seguidos con el cerrojo ocupado, contando
 *   este.
 */
export function decidirTurno(
  visible: boolean,
  cerrojoLibre: boolean,
  fallosSeguidos: number,
): Turno {
  if (!visible) {
    return 'esperar';
  }

  if (cerrojoLibre) {
    return 'vaciar';
  }

  return fallosSeguidos >= FALLOS_PARA_ROBAR ? 'robar' : 'esperar';
}
