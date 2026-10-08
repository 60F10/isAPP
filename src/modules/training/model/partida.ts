// De qué parte una lista de asistencia nueva (T-229; DOC 04 §13, T-08).
//
// Lo elige quien pasa lista, en la propia pantalla: todos presentes, que es lo
// corriente en un entrenamiento, o todos sin marcar, para ir uno a uno. Solo
// afecta a los jugadores sin fila guardada y sin tocar en esa visita.
//
// SE GUARDA EN EL MÓVIL, en `localStorage`, y no por persona: `profiles` no
// tiene dónde guardarlo y esta tarea va sin migración. Es el mismo criterio
// que las preferencias de pantalla (D06-25), y la misma deuda.
//
// Sin React ni red. Nada de aquí lanza: leer y escribir `localStorage` puede
// fallar —ventana privada, almacenamiento bloqueado— y una preferencia no
// puede dejar la lista sin abrir. Por eso `window.localStorage` se nombra
// dentro del `try` y no como valor por defecto del parámetro: con el
// almacenamiento bloqueado, lanza solo con nombrarlo.

export type Partida = 'presentes' | 'sin_marcar';

export const CLAVE_PARTIDA = 'sasi.lista-de-partida';

export const PARTIDA_POR_DEFECTO: Partida = 'presentes';

/** Lo guardado, o `presentes` si no hay nada o no se entiende. */
export function interpretarPartida(crudo: string | null): Partida {
  return crudo === 'sin_marcar' || crudo === 'presentes' ? crudo : PARTIDA_POR_DEFECTO;
}

/** Lee la partida de este dispositivo. */
export function leerPartida(almacen?: Pick<Storage, 'getItem'>): Partida {
  try {
    return interpretarPartida((almacen ?? window.localStorage).getItem(CLAVE_PARTIDA));
  } catch {
    return PARTIDA_POR_DEFECTO;
  }
}

/** Guarda la partida. Si no se puede, vale para esta visita y se pierde al salir. */
export function guardarPartida(partida: Partida, almacen?: Pick<Storage, 'setItem'>): void {
  try {
    (almacen ?? window.localStorage).setItem(CLAVE_PARTIDA, partida);
  } catch {
    // Sin almacenamiento, lo elegido dura lo que dure la pantalla.
  }
}
