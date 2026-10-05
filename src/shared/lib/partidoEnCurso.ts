// Marca de «hay un partido en curso en este dispositivo» (D06-14, T-207).
//
// La lee el aviso de versión nueva, que vive en el marco de la aplicación y
// fuera del enrutador: con un partido en curso se calla, porque actualizar
// recarga la página, y recargar el directo en el minuto 63 es justo el fallo
// que este proyecto no se puede permitir. La pone y la quita la A12.
//
// Desde la T-225 lleva también el reloj de la parte abierta, y con ella pinta
// `AppLayout` la banda «Partido en directo · 34:12 · Volver» (D06-40). Son los
// tres números del ancla, no los segundos: la banda hace la cuenta con la
// hora de cada repintado, igual que el directo.
//
// En `localStorage` y no en IndexedDB: la lee el arranque, y Dexie no cabe en
// él (D06-26). Caduca a las cuatro horas, para que un partido abandonado sin
// finalizar no deje el aviso callado para siempre.
//
// Como `preferencias.ts`, todo acceso va envuelto: en navegación privada de
// algún navegador `localStorage` lanza, y eso no puede tumbar nada.

import type { Reloj } from './reloj';

const CLAVE = 'sasi.partido-en-curso';
const EVENTO = 'sasi:partido-en-curso';

/** Un partido son unas dos horas; con cuatro sobra margen. */
export const CADUCIDAD_MS = 4 * 60 * 60 * 1000;

interface Marca {
  partidoId: string;
  desde: number;
  /** El reloj de la parte abierta, o `null` si no hay ninguna (T-225). */
  reloj: Reloj | null;
}

/** Lo que enseña la banda: qué partido y por dónde va su reloj. */
export interface MarcaEnCurso {
  partidoId: string;
  reloj: Reloj | null;
}

function avisar(): void {
  window.dispatchEvent(new Event(EVENTO));
}

/**
 * El reloj de una marca guardada. Una marca de antes de la T-225 no lo trae,
 * y una estropeada puede traer cualquier cosa: las dos se leen sin reloj, que
 * es decir «Descanso», antes que perder la marca entera.
 */
function leerReloj(reloj: unknown): Reloj | null {
  if (
    typeof reloj === 'object' &&
    reloj !== null &&
    'inicio' in reloj &&
    'pausadoMs' in reloj &&
    'pausaDesde' in reloj &&
    typeof reloj.inicio === 'number' &&
    typeof reloj.pausadoMs === 'number' &&
    (reloj.pausaDesde === null || typeof reloj.pausaDesde === 'number')
  ) {
    return { inicio: reloj.inicio, pausadoMs: reloj.pausadoMs, pausaDesde: reloj.pausaDesde };
  }

  return null;
}

/**
 * La marca tal cual está guardada, o `null` si no hay o no se puede leer.
 *
 * Es la instantánea de `useSyncExternalStore` para quien necesita algo más
 * que un sí o un no: un texto es el mismo valor mientras la marca no cambie,
 * y un objeto recién interpretado sería uno nuevo en cada lectura, que para
 * React es un cambio y repinta sin fin. Se interpreta después, con
 * `leerMarcaEnCurso`.
 */
export function textoDePartidoEnCurso(): string | null {
  try {
    return window.localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

function leerMarca(): Marca | null {
  const texto = textoDePartidoEnCurso();

  if (texto === null) {
    return null;
  }

  try {
    const marca: unknown = JSON.parse(texto);

    if (
      typeof marca === 'object' &&
      marca !== null &&
      'partidoId' in marca &&
      'desde' in marca &&
      typeof marca.partidoId === 'string' &&
      typeof marca.desde === 'number'
    ) {
      return {
        partidoId: marca.partidoId,
        desde: marca.desde,
        reloj: 'reloj' in marca ? leerReloj(marca.reloj) : null,
      };
    }
  } catch {
    // Estropeada: como si no hubiera marca.
  }

  return null;
}

function mismoReloj(uno: Reloj | null, otro: Reloj | null): boolean {
  if (uno === null || otro === null) {
    return uno === otro;
  }

  return (
    uno.inicio === otro.inicio &&
    uno.pausadoMs === otro.pausadoMs &&
    uno.pausaDesde === otro.pausaDesde
  );
}

/**
 * Pone la marca, con el reloj de la parte abierta o `null` si no hay ninguna.
 *
 * La A12 la llama en cada cambio de estado, así que casi siempre no hay nada
 * que hacer: solo escribe —y solo entonces avisa a quien escucha— si el
 * partido es otro o el reloj ha cambiado.
 */
export function marcarPartidoEnCurso(
  partidoId: string,
  ahora: number,
  reloj: Reloj | null = null,
): void {
  const actual = leerMarca();
  const mismoPartido = actual !== null && actual.partidoId === partidoId;

  if (mismoPartido && mismoReloj(actual.reloj, reloj)) {
    return;
  }

  // Recargar el directo no reinicia la caducidad del mismo partido, y que el
  // reloj se pare, siga o cambie de parte, tampoco.
  const marca: Marca = { partidoId, desde: mismoPartido ? actual.desde : ahora, reloj };

  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(marca));
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
 * El partido en curso con su reloj, o `null` si no hay o la marca ha caducado:
 * la misma caducidad que `leerPartidoEnCurso`. `reloj: null` es que no hay
 * parte abierta.
 */
export function leerMarcaEnCurso(ahora: number): MarcaEnCurso | null {
  const marca = leerMarca();

  return marca === null || ahora - marca.desde > CADUCIDAD_MS
    ? null
    : { partidoId: marca.partidoId, reloj: marca.reloj };
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
