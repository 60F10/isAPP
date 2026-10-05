// La cuenta del reloj de una parte: una sola para toda la aplicación (D06-40).
//
// La usan el directo, por `match/model/reloj.ts`, y la banda «Partido en
// directo» del marco (T-225). Dos cuentas escritas por separado acabarían
// marcando un segundo distinto, y la banda está para decir lo mismo que el
// reloj que se acaba de dejar atrás.
//
// POR ANCLAJE, NUNCA POR ACUMULACIÓN (D06-15). El tiempo sale de
// `ahora − arranque − pausado`. El temporizador de la pantalla solo repinta.
//
// Lógica pura y sin importaciones: entra en el paquete inicial con la banda.

/** Lo que hace falta de una parte abierta para saber por dónde va su reloj. */
export interface Reloj {
  /** Instante de arranque en milisegundos: el ancla. */
  inicio: number;
  /** Lo que lleva parado en pausas ya terminadas. */
  pausadoMs: number;
  /** Desde cuándo está en pausa, o `null` si corre. */
  pausaDesde: number | null;
}

/** Segundos jugados de una parte abierta. */
export function segundosDesde(reloj: Reloj, ahora: number): number {
  // En pausa, el reloj se queda en el instante en que se paró.
  const hasta = reloj.pausaDesde ?? ahora;
  const jugados = hasta - reloj.inicio - reloj.pausadoMs;

  // El reloj de pared de un móvil puede ir un poco por detrás del de quien
  // abrió la parte. Mejor 00:00 que un reloj negativo.
  return Math.max(0, Math.floor(jugados / 1000));
}

function dosCifras(numero: number): string {
  return String(numero).padStart(2, '0');
}

/** `34:12`. Los minutos siguen contando pasados los sesenta: `62:05`. */
export function formatoReloj(segundos: number): string {
  return `${dosCifras(Math.floor(segundos / 60))}:${dosCifras(segundos % 60)}`;
}
