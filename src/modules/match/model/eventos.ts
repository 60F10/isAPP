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

/**
 * Los que entraron en un cambio. En diferido y con cambios fijos, quien ya
 * entra en un cambio apuntado no se ofrece para entrar en otro (D06-36).
 */
export function incorporados(eventos: readonly EventoDelDirecto[]): Set<string> {
  return new Set(
    propiosDeTipo(eventos, ['substitution'])
      .map((evento) => evento.segundo)
      .filter((jugador): jugador is string => jugador !== null),
  );
}

/** Un momento del partido: la parte y los segundos dentro de ella. */
export interface Instante {
  periodo: number;
  segundos: number;
}

/**
 * Los eventos que ya habían pasado en ese instante (D06-36, T-217): los de
 * una parte anterior y los de la misma parte hasta ese segundo, incluido. Los
 * que no tienen segundos quedan fuera: no se sabe cuándo pasaron.
 *
 * En diferido, con el partido entero ya apuntado, es lo que permite saber
 * quién estaba en el campo en el minuto 20 aunque el cambio del 46 ya esté
 * metido.
 */
export function hastaElInstante(
  eventos: readonly EventoDelDirecto[],
  instante: Instante,
): EventoDelDirecto[] {
  return eventos.filter(
    (evento) =>
      evento.segundos !== null &&
      (evento.periodo < instante.periodo ||
        (evento.periodo === instante.periodo && evento.segundos <= instante.segundos)),
  );
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

/**
 * Las ventanas de posible repetido, en segundos (DOC 04 §9.2): el valor de la
 * fila `duplicate_window_seconds` de `app_settings`. Viajan en el paquete.
 */
export interface Ventanas {
  default: number;
  by_type: Partial<Record<string, number>>;
}

/** La ventana si el paquete no trae ninguna: la del DOC 04 §9.2. */
export const VENTANA_POR_DEFECTO = 30;

function segundosValidos(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0;
}

/**
 * Lee el valor de `duplicate_window_seconds` tal como llega de la base. Sin
 * fila, o con otra forma, no hay ventanas y valen los 30 s; de `by_type` solo
 * se queda con lo que es un número.
 */
export function leerVentanas(valor: unknown): Ventanas | undefined {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    return undefined;
  }

  const { default: porDefecto, by_type: porTipo } = valor as Record<string, unknown>;

  if (!segundosValidos(porDefecto)) {
    return undefined;
  }

  const tipos =
    typeof porTipo === 'object' && porTipo !== null && !Array.isArray(porTipo)
      ? Object.entries(porTipo).filter((par): par is [string, number] => segundosValidos(par[1]))
      : [];

  return { default: porDefecto, by_type: Object.fromEntries(tipos) };
}

/**
 * Las parejas de eventos que parecen el mismo apuntado dos veces (T-209b,
 * DOC 04 §9.2): ninguno rechazado, el mismo tipo, el mismo bando y la misma
 * parte, con los segundos dentro de la ventana de su tipo, y que no sean los
 * dos de este aparato, que sabe lo que apunta. Sin segundos no se comparan.
 *
 * El borde de la ventana cuenta, igual que en `flag_duplicate_candidates`,
 * que es la que marca los repetidos en el cierre: así el directo y la A13 no
 * dicen cosas distintas de dos goles a 30 s justos.
 *
 * Solo avisa. Cuál de los dos vale se decide en el cierre.
 *
 * @returns cada pareja una vez, con el que va antes en la lista delante.
 */
export function parejasRepetidas(
  eventos: readonly EventoDelDirecto[],
  ventanas: Ventanas | undefined,
): [string, string][] {
  const comparables = eventos.filter(
    (evento) => evento.estado !== 'rejected' && evento.segundos !== null,
  );
  const parejas: [string, string][] = [];

  comparables.forEach((uno, indice) => {
    const ventana = ventanas?.by_type[uno.tipo] ?? ventanas?.default ?? VENTANA_POR_DEFECTO;

    for (const otro of comparables.slice(indice + 1)) {
      if (
        uno.tipo === otro.tipo &&
        uno.rival === otro.rival &&
        uno.periodo === otro.periodo &&
        !(uno.propio && otro.propio) &&
        Math.abs((uno.segundos ?? 0) - (otro.segundos ?? 0)) <= ventana
      ) {
        parejas.push([uno.clientEventId, otro.clientEventId]);
      }
    }
  });

  return parejas;
}

/** Los `clientEventId` de los eventos que están en alguna pareja de posibles repetidos. */
export function posiblesRepetidos(
  eventos: readonly EventoDelDirecto[],
  ventanas: Ventanas | undefined,
): Set<string> {
  return new Set(parejasRepetidas(eventos, ventanas).flat());
}
