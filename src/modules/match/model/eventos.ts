// Los eventos del directo y lo que se deriva de ellos: lógica pura (T-208,
// DOC 04 §6.5, §7 y §4.3).
//
// El aparato conoce los eventos precargados del servidor y los que ha
// registrado él. Con todos ellos, aprobados o pendientes, responde a «quién
// está en el campo», a quién se puede convocar para un cambio (R-04, R-05 y
// R-07) y al marcador. Lo rechazado no cuenta para nada, pero no se borra.
//
// DEL JUGADOR SOLO VIAJA SU IDENTIFICADOR. El apodo y el dorsal los pone la
// pantalla desde la convocatoria.

import type { Posicion } from '@modules/core';
import type { TipoDeEvento } from '@modules/rules';

export type EstadoDeEvento = 'pending' | 'approved' | 'rejected';

export interface EventoDelDirecto {
  /** El `client_event_id`: lo genera el aparato y da la idempotencia. */
  clientEventId: string;
  tipo: TipoDeEvento;
  periodo: number;
  /** Segundos dentro de la parte. `null` mientras el servidor no los derive. */
  segundos: number | null;
  /** Del rival: sin jugador (decisión B3). */
  rival: boolean;
  jugador: string | null;
  /** Asistente, o quien entra en un cambio. */
  segundo: string | null;
  /** Origen del gol, motivo del cambio, posición nueva o texto de la nota. */
  detalles: Record<string, string>;
  estado: EstadoDeEvento;
  /** Lo registró este aparato en esta sesión del directo: se puede deshacer. */
  propio: boolean;
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' ? valor : null;
}

function numero(valor: unknown): number | null {
  return typeof valor === 'number' ? valor : null;
}

/** Del `details` que llega, solo lo que es texto: es lo único que se escribe. */
function soloTextos(valor: unknown): Record<string, string> {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(valor).filter((par): par is [string, string] => typeof par[1] === 'string'),
  );
}

function esEstado(valor: unknown): valor is EstadoDeEvento {
  return valor === 'pending' || valor === 'approved' || valor === 'rejected';
}

/** Las filas de `match_events` que trae la precarga, como eventos del directo. */
export function desdeFilas(filas: readonly Record<string, unknown>[]): EventoDelDirecto[] {
  return filas.map((fila) => ({
    clientEventId: String(fila.client_event_id),
    tipo: fila.event_type as TipoDeEvento,
    periodo: numero(fila.period) ?? 1,
    segundos: numero(fila.seconds),
    rival: fila.is_opponent === true,
    jugador: texto(fila.player_id),
    segundo: texto(fila.secondary_player_id),
    detalles: soloTextos(fila.details),
    estado: esEstado(fila.status) ? fila.status : 'pending',
    propio: false,
  }));
}

/**
 * Junta los eventos del aparato con los del servidor, sin repetir. De uno que
 * está en los dos, manda la copia del servidor —su estado de aprobación es el
 * bueno—, pero sigue siendo propio si lo era: se puede deshacer.
 */
export function unirEventos(
  locales: readonly EventoDelDirecto[],
  servidor: readonly EventoDelDirecto[],
): EventoDelDirecto[] {
  const delServidor = new Map(servidor.map((evento) => [evento.clientEventId, evento]));
  const vistos = new Set<string>();
  const unidos = locales.map((local) => {
    vistos.add(local.clientEventId);
    const copia = delServidor.get(local.clientEventId);

    return copia === undefined ? local : { ...copia, propio: local.propio };
  });

  return [...unidos, ...servidor.filter((evento) => !vistos.has(evento.clientEventId))];
}

/** Lo que cuenta, en orden de partido: parte y segundo, sin segundos al final. */
function vigentes(eventos: readonly EventoDelDirecto[]): EventoDelDirecto[] {
  return eventos
    .filter((evento) => evento.estado !== 'rejected')
    .map((evento, orden) => ({ evento, orden }))
    .sort(
      (a, b) =>
        a.evento.periodo - b.evento.periodo ||
        (a.evento.segundos ?? Number.MAX_SAFE_INTEGER) -
          (b.evento.segundos ?? Number.MAX_SAFE_INTEGER) ||
        a.orden - b.orden,
    )
    .map(({ evento }) => evento);
}

function propiosDeTipo(
  eventos: readonly EventoDelDirecto[],
  tipos: readonly TipoDeEvento[],
): EventoDelDirecto[] {
  return vigentes(eventos).filter((evento) => !evento.rival && tipos.includes(evento.tipo));
}

/**
 * Quién está en el campo ahora según este aparato (DOC 04 §6.5): los
 * titulares, movidos por los cambios y las expulsiones que conoce, aprobados
 * o no. Es estado de pantalla; los minutos oficiales salen de los tramos.
 */
export function calcularEnCampo(
  titulares: readonly string[],
  eventos: readonly EventoDelDirecto[],
): string[] {
  const campo = [...titulares];

  for (const evento of propiosDeTipo(eventos, ['substitution', 'red_card', 'second_yellow'])) {
    const sale = campo.indexOf(evento.jugador ?? '');

    if (sale !== -1) {
      campo.splice(sale, 1);
    }

    if (
      evento.tipo === 'substitution' &&
      evento.segundo !== null &&
      !campo.includes(evento.segundo)
    ) {
      campo.push(evento.segundo);
    }
  }

  return campo;
}

/** La posición de cada jugador: la de la convocatoria, movida por los cambios de posición. */
export function calcularPosiciones(
  base: Readonly<Record<string, Posicion | null>>,
  eventos: readonly EventoDelDirecto[],
): Record<string, Posicion | null> {
  const posiciones = { ...base };

  for (const evento of propiosDeTipo(eventos, ['position_change'])) {
    const nueva = evento.detalles.posicion;

    if (
      evento.jugador !== null &&
      (nueva === 'GK' || nueva === 'DF' || nueva === 'MF' || nueva === 'FW')
    ) {
      posiciones[evento.jugador] = nueva;
    }
  }

  return posiciones;
}

function jugadoresDe(eventos: readonly EventoDelDirecto[]): Set<string> {
  return new Set(
    eventos
      .map((evento) => evento.jugador)
      .filter((jugador): jugador is string => jugador !== null),
  );
}

/** Con una amarilla: la siguiente es la segunda, y expulsa. */
export function amonestados(eventos: readonly EventoDelDirecto[]): Set<string> {
  return jugadoresDe(propiosDeTipo(eventos, ['yellow_card']));
}

/** Expulsados: no vuelven a entrar nunca, ni con cambios volantes (R-07). */
export function expulsados(eventos: readonly EventoDelDirecto[]): Set<string> {
  return jugadoresDe(propiosDeTipo(eventos, ['red_card', 'second_yellow']));
}

/** Los que salieron en un cambio: con cambios fijos, no vuelven (R-05). */
export function sustituidos(eventos: readonly EventoDelDirecto[]): Set<string> {
  return jugadoresDe(propiosDeTipo(eventos, ['substitution']));
}

/** Cambios hechos, contra `substitutions_max` (R-04). */
export function cambiosHechos(eventos: readonly EventoDelDirecto[]): number {
  return propiosDeTipo(eventos, ['substitution']).length;
}

export interface Marcador {
  aFavor: number;
  enContra: number;
  /** Goles sin aprobar que ya cuentan: el marcador lo avisa (DOC 04 §7.3). */
  pendientes: number;
}

/**
 * El marcador del directo (DOC 04 §7.3): goles propios más goles en propia
 * del rival, y al revés. Cuenta los pendientes, porque en directo es lo que
 * se sabe, y no los rechazados.
 */
export function marcador(eventos: readonly EventoDelDirecto[]): Marcador {
  const resultado: Marcador = { aFavor: 0, enContra: 0, pendientes: 0 };

  for (const evento of vigentes(eventos)) {
    if (evento.tipo !== 'goal' && evento.tipo !== 'own_goal') {
      continue;
    }

    const suma = evento.tipo === 'goal' ? !evento.rival : evento.rival;

    if (suma) {
      resultado.aFavor += 1;
    } else {
      resultado.enContra += 1;
    }

    if (evento.estado === 'pending') {
      resultado.pendientes += 1;
    }
  }

  return resultado;
}
