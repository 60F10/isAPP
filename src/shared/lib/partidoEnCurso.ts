// Marca de «hay un partido en curso en este dispositivo» (D06-14, T-207).
//
// La lee el aviso de versión nueva, que vive en el marco de la aplicación y
// fuera del enrutador: con un partido en curso se calla, porque actualizar
// recarga la página, y recargar el directo en el minuto 63 es justo el fallo
// que este proyecto no se puede permitir. La pone y la quita la A12.
//
// En `localStorage` y no en IndexedDB: la lee el arranque, y Dexie no cabe en
// él (D06-26). Caduca a las cuatro horas, para que un partido abandonado sin
// finalizar no deje el aviso callado para siempre.
//
// Como `preferencias.ts`, todo acceso va envuelto: en navegación privada de
// algún navegador `localStorage` lanza, y eso no puede tumbar nada.

const CLAVE = 'sasi.partido-en-curso';
const EVENTO = 'sasi:partido-en-curso';

/** Un partido son unas dos horas; con cuatro sobra margen. */
export const CADUCIDAD_MS = 4 * 60 * 60 * 1000;

interface Marca {
  partidoId: string;
  desde: number;
}

function avisar(): void {
  window.dispatchEvent(new Event(EVENTO));
}

function leerMarca(): Marca | null {
  try {
    const texto = window.localStorage.getItem(CLAVE);

    if (texto === null) {
      return null;
    }

    const marca: unknown = JSON.parse(texto);

    if (
      typeof marca === 'object' &&
      marca !== null &&
      'partidoId' in marca &&
      'desde' in marca &&
      typeof marca.partidoId === 'string' &&
      typeof marca.desde === 'number'
    ) {
      return { partidoId: marca.partidoId, desde: marca.desde };
    }
  } catch {
    // Estropeada o sin acceso: como si no hubiera marca.
  }

  return null;
}

export function marcarPartidoEnCurso(partidoId: string, ahora: number): void {
  const actual = leerMarca();

  // Recargar el directo no reinicia la caducidad del mismo partido.
  if (actual !== null && actual.partidoId === partidoId) {
    return;
  }

  try {
    window.localStorage.setItem(CLAVE, JSON.stringify({ partidoId, desde: ahora }));
  } catch {
    return;
  }

  avisar();
}

/** Quita la marca, solo si es de ese partido. */
export function quitarPartidoEnCurso(partidoId: string): void {
  const actual = leerMarca();

  if (actual === null || actual.partidoId !== partidoId) {
    return;
  }

  try {
    window.localStorage.removeItem(CLAVE);
  } catch {
    return;
  }

  avisar();
}

/** El partido en curso, o `null` si no hay o la marca ha caducado. */
export function leerPartidoEnCurso(ahora: number): string | null {
  const marca = leerMarca();

  return marca === null || ahora - marca.desde > CADUCIDAD_MS ? null : marca.partidoId;
}

/**
 * Escucha los cambios de la marca: los de esta pestaña, por un evento propio,
 * y los de otras, por el evento `storage` del navegador.
 */
export function suscribirPartidoEnCurso(alCambiar: () => void): () => void {
  const alGuardar = (evento: StorageEvent) => {
    if (evento.key === CLAVE) {
      alCambiar();
    }
  };

  window.addEventListener(EVENTO, alCambiar);
  window.addEventListener('storage', alGuardar);

  return () => {
    window.removeEventListener(EVENTO, alCambiar);
    window.removeEventListener('storage', alGuardar);
  };
}
