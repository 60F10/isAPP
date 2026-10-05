// El partido precargado: lo que el directo necesita para funcionar sin red
// (DOC 06 §8.3, D06-11, T-206).
//
// El partido, el reglamento de su competición, la convocatoria, las partes
// y los eventos ya registrados. Del jugador, solo apodo, dorsal y posición:
// la convocatoria es la de `lineup`, que no trae nada más.

import type { CoberturaLocal } from './cobertura';
import type { EstadoDirecto } from './directo';
import type { Ventanas } from './eventos';
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
  /**
   * La parte y el segundo en que se suspendió (T-226): los dos con el estado
   * `suspended`, y `null` si no. Opcionales: un paquete guardado de antes no
   * los trae, y valen `null`.
   */
  suspendedPeriod?: number | null;
  suspendedSeconds?: number | null;
}

export interface ParteDelPartido {
  /** El `id` de `match_periods`: la clave para cerrarla. */
  id: string;
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
  /**
   * Las ventanas de posible repetido de `app_settings` (T-209b). Opcional: una
   * precarga de antes no las trae, y sin ellas valen 30 s.
   */
  ventanas?: Ventanas;
}

/** Lo que se guarda en `matchSnapshots.datos`. */
export interface Instantanea {
  paquete: PaqueteDePartido;
  descargadoEn: number;
  /**
   * Cuándo se pidió la descarga (T-209b). Lo que la cola confirmó desde
   * entonces puede no venir en el paquete: es desde cuándo hay que mirarla al
   * fundir. Una precarga de antes no lo trae, y vale `descargadoEn`.
   */
  pedidoEn?: number;
  /** El estado del reductor del directo en este aparato (T-207). */
  estado?: EstadoDirecto;
  /**
   * Lo que sigue quien anota en este aparato (T-209a, D06-37). Fuera de
   * `estado` a propósito: no es del partido, y el reductor no lo toca.
   */
  cobertura?: CoberturaLocal;
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
