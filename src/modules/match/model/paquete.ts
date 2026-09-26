// El partido precargado: lo que el directo necesita para funcionar sin red
// (DOC 06 §8.3, D06-11, T-206).
//
// El partido, el reglamento de su competición, la convocatoria, las partes
// y los eventos ya registrados. Del jugador, solo apodo, dorsal y posición:
// la convocatoria es la de `lineup`, que no trae nada más.

import type { LineaGuardada } from '@modules/lineup';
import type { Reglamento } from '@modules/rules';

export type EstadoDelPartido =
  'scheduled' | 'called' | 'live' | 'suspended' | 'finished' | 'closed';

export interface PartidoPrecargado {
  id: string;
  teamId: string;
  competitionId: string;
  opponentName: string;
  isHome: boolean;
  kickoffAt: string;
  venue: string | null;
  status: EstadoDelPartido;
  isRetroactive: boolean;
}

export interface ParteDelPartido {
  periodNumber: number;
  plannedSeconds: number;
  actualSeconds: number | null;
  /** Ancla del reloj (D06-15). */
  startedAt: string | null;
  endedAt: string | null;
}

export interface PaqueteDePartido {
  partido: PartidoPrecargado;
  reglamento: Reglamento;
  convocatoria: LineaGuardada[];
  partes: ParteDelPartido[];
  /** Las filas de `match_events` tal como llegan. Las lee el directo (T-207). */
  eventos: Record<string, unknown>[];
}

/** Lo que se guarda en `matchSnapshots.datos`. */
export interface Instantanea {
  paquete: PaqueteDePartido;
  descargadoEn: number;
}

/** El resumen de una precarga para la interfaz. */
export interface ResultadoDePrecarga {
  descargadoEn: number;
  convocados: number;
  /**
   * Si el navegador ha prometido no borrar el almacén (D06-10b). `null` si no
   * tiene la API: no se sabe.
   */
  persistente: boolean | null;
}

export function contarConvocados(paquete: Pick<PaqueteDePartido, 'convocatoria'>): number {
  return paquete.convocatoria.filter((linea) => linea.callStatus !== 'not_called').length;
}
