// El cierre del partido, lógica pura (T-210a, DOC 04 §8.1 y §8.4).
//
// Qué partido se puede cerrar, qué lo impide y cómo se lee el acta. La
// pantalla (A13) pinta lo que esto decide; `api/` hace los pasos contra la
// base. Aquí no entra ni la red ni IndexedDB.
//
// Los tipos del directo entran solo como tipos: un `model/` no importa
// barriles en tiempo de ejecución (D06-33).

import type { EventoRevisable } from './discordancias';
import type { EventoDelDirecto } from '@modules/match';

export type EstadoDelPartido =
  'scheduled' | 'called' | 'live' | 'suspended' | 'finished' | 'closed';

/** El estado en palabras, como lo lee quien cierra. */
export const NOMBRES_DE_ESTADO: Record<EstadoDelPartido, string> = {
  scheduled: 'Programado',
  called: 'Convocado',
  live: 'En juego',
  suspended: 'Suspendido',
  finished: 'Terminado, sin cerrar',
  closed: 'Cerrado',
};

export interface PartidoDelCierre {
  id: string;
  teamId: string;
  opponentName: string;
  competitionName: string;
  isHome: boolean;
  kickoffAt: string;
  status: EstadoDelPartido;
  isRetroactive: boolean;
  periodos: number;
  minutosDeParte: number;
  /** Solo si se suspendió (DOC 05 §8.1). */
  suspendidoEnParte: number | null;
  suspendidoEnSegundo: number | null;
  actaAFavor: number | null;
  actaEnContra: number | null;
  cerradoEn: string | null;
}

export interface LineaDelCierre {
  playerId: string;
  nickname: string;
  shirtNumber: number | null;
}

/**
 * Del identificador de un jugador a «7 · Juanito»: del jugador solo se enseña
 * dorsal y apodo. Lo usan la A13 y la A14 para describir los eventos.
 */
export function nombrador(convocatoria: readonly LineaDelCierre[]): (id: string) => string {
  const nombres = new Map(
    convocatoria.map((linea) => [
      linea.playerId,
      linea.shirtNumber === null
        ? linea.nickname
        : `${String(linea.shirtNumber)} · ${linea.nickname}`,
    ]),
  );

  return (id) => nombres.get(id) ?? 'Jugador fuera de la convocatoria';
}

export interface Resultado {
  aFavor: number;
  enContra: number;
}

/** Un momento del partido: la parte y los segundos dentro de ella. */
export interface MomentoDelPartido {
  periodo: number;
  segundos: number;
}

/**
 * Lo que declaró seguir un anotador (T-209a, DOC 04 §10.2). `custom` no se
 * ofrece en el directo, pero existe en la base y aquí se lee lo que haya.
 */
export interface CoberturaDelCierre {
  id: string;
  /** `user_id`: quién la declaró. */
  autorId: string;
  alcance: 'full_team' | 'single_player' | 'goals_cards' | 'custom';
  /** Solo con `single_player`. */
  jugador: string | null;
  desde: MomentoDelPartido;
  /** `null` si sigue abierta: se termina al cerrar el partido (C-03). */
  hasta: MomentoDelPartido | null;
  /** De un partido en diferido (DOC 04 §10.6). */
  diferido: boolean;
}

export interface DatosDelCierre {
  partido: PartidoDelCierre;
  /** Del jugador solo apodo y dorsal: la convocatoria del partido. */
  convocatoria: LineaDelCierre[];
  /** Todos, también los descartados, con lo que pide revisarlos (T-210b). */
  eventos: EventoRevisable[];
  /** Números de las partes que ya existen en `match_periods`. */
  partes: number[];
  /** El marcador de `v_match_scores`: solo eventos aprobados (DOC 05 §11). */
  calculado: Resultado;
  /** Lo que declaró seguir cada anotador, en el orden en que se declaró (T-209a). */
  coberturas: CoberturaDelCierre[];
}

/**
 * Si el partido admite cierre por su estado. Terminado o suspendido
 * (DOC 04 §8.1); en diferido, también convocado o en juego, porque ese
 * partido no tiene reloj y se termina desde aquí (T-207).
 */
export function admiteCierre(partido: Pick<PartidoDelCierre, 'status' | 'isRetroactive'>): boolean {
  if (partido.status === 'finished' || partido.status === 'suspended') {
    return true;
  }

  return partido.isRetroactive && (partido.status === 'called' || partido.status === 'live');
}

/** Por qué todavía no se puede cerrar, por su estado. `null` si sí se puede o ya está cerrado. */
export function motivoDeEstado(
  partido: Pick<PartidoDelCierre, 'status' | 'isRetroactive'>,
): string | null {
  if (partido.status === 'closed' || admiteCierre(partido)) {
    return null;
  }

  if (partido.status === 'live') {
    return 'El partido sigue en juego. Finalízalo desde el directo y vuelve aquí.';
  }

  return partido.isRetroactive
    ? 'El partido en diferido necesita su convocatoria antes de cerrarse.'
    : 'El partido todavía no se ha jugado.';
}

type Suspension = Pick<PartidoDelCierre, 'suspendidoEnParte' | 'suspendidoEnSegundo'>;

function seSuspendio(partido: Suspension): partido is {
  suspendidoEnParte: number;
  suspendidoEnSegundo: number;
} {
  return partido.suspendidoEnParte !== null && partido.suspendidoEnSegundo !== null;
}

/**
 * Dónde se suspendió, en palabras: «en la parte 2, a los 23:10». Minutos y
 * segundos dentro de la parte, que es lo que guarda la base (DOC 05 §8.1).
 * `null` si el partido no se suspendió.
 */
export function dondeSeSuspendio(partido: Suspension): string | null {
  if (!seSuspendio(partido)) {
    return null;
  }

  const minutos = Math.floor(partido.suspendidoEnSegundo / 60);
  const segundos = partido.suspendidoEnSegundo % 60;

  return `en la parte ${String(partido.suspendidoEnParte)}, a los ${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
}

/**
 * A qué estado vuelve un partido cerrado al reabrirlo (C-05): al de antes de
 * cerrarlo. Un suspendido sigue suspendido, que es lo que lo deja fuera de
 * las medias (DOC 04 §8.1); la base exige su parte y su segundo para ese
 * estado (`matches_suspension`), y si los tiene es que se suspendió.
 */
export function estadoAlReabrir(partido: Suspension): 'suspended' | 'finished' {
  return seSuspendio(partido) ? 'suspended' : 'finished';
}

/** Las partes que faltan para cerrar un partido en diferido (DOC 04 §5.4). */
export function partesQueFaltan(existentes: readonly number[], periodos: number): number[] {
  const faltan: number[] = [];

  for (let numero = 1; numero <= periodos; numero += 1) {
    if (!existentes.includes(numero)) {
      faltan.push(numero);
    }
  }

  return faltan;
}

export interface CuentaDeEventos<Evento extends EventoDelDirecto = EventoDelDirecto> {
  pendientes: Evento[];
  descartados: number;
}

/** Genérica para que el panel de eventos reciba sus revisables con su `id` (T-210b). */
export function contarEventos<Evento extends EventoDelDirecto>(
  eventos: readonly Evento[],
): CuentaDeEventos<Evento> {
  return {
    pendientes: eventos.filter((evento) => evento.estado === 'pending'),
    descartados: eventos.filter((evento) => evento.estado === 'rejected').length,
  };
}

export interface SituacionDelCierre {
  pendientes: number;
  /** Cambios de este aparato sin enviar. `null` si no se ha podido leer la cola. */
  sinEnviar: number | null;
  /** En diferido, partes que faltan y que quien cierra no puede crear. */
  partesSinPermiso: number;
}

/**
 * Lo que impide cerrar, en palabras. Vacío si nada lo impide.
 *
 * C-01: con eventos pendientes no se cierra. Lo que este aparato no ha
 * enviado tampoco: el servidor no tendría el partido entero. Si la cola no
 * se puede leer, no se sabe, y no se bloquea: cerrar se puede deshacer.
 */
export function bloqueosDelCierre(situacion: SituacionDelCierre): string[] {
  const bloqueos: string[] = [];

  if (situacion.pendientes > 0) {
    bloqueos.push(
      situacion.pendientes === 1
        ? 'Queda 1 evento pendiente de revisar.'
        : `Quedan ${String(situacion.pendientes)} eventos pendientes de revisar.`,
    );
  }

  if (situacion.sinEnviar !== null && situacion.sinEnviar > 0) {
    bloqueos.push(
      situacion.sinEnviar === 1
        ? 'Este móvil tiene 1 cambio del partido sin enviar.'
        : `Este móvil tiene ${String(situacion.sinEnviar)} cambios del partido sin enviar.`,
    );
  }

  if (situacion.partesSinPermiso > 0) {
    bloqueos.push(
      'Faltan partes del partido y crearlas pide el permiso de anotar en directo, que no tienes.',
    );
  }

  return bloqueos;
}

/** Goles de más que admite el acta: nadie mete cien en un partido. */
export const MAXIMO_DE_GOLES = 99;

export interface FormularioActa {
  aFavor: string;
  enContra: string;
}

export interface ResultadoActa {
  valores: Resultado | null;
  errores: Partial<Record<keyof FormularioActa, string>>;
}

function goles(texto: string): number | null {
  const limpio = texto.trim();

  if (!/^\d{1,2}$/.test(limpio)) {
    return null;
  }

  return Number(limpio);
}

/** El acta: dos números enteros entre 0 y 99, los dos obligatorios. */
export function validarActa(formulario: FormularioActa): ResultadoActa {
  const aFavor = goles(formulario.aFavor);
  const enContra = goles(formulario.enContra);
  const errores: ResultadoActa['errores'] = {};
  const mensaje = `Escribe un número entre 0 y ${String(MAXIMO_DE_GOLES)}.`;

  if (aFavor === null) {
    errores.aFavor = mensaje;
  }

  if (enContra === null) {
    errores.enContra = mensaje;
  }

  return {
    valores: aFavor === null || enContra === null ? null : { aFavor, enContra },
    errores,
  };
}

/** Lo que se propone en el acta al abrir: lo ya confirmado, o lo calculado. */
export function actaInicial(datos: Pick<DatosDelCierre, 'partido' | 'calculado'>): FormularioActa {
  const { partido, calculado } = datos;

  return {
    aFavor: String(partido.actaAFavor ?? calculado.aFavor),
    enContra: String(partido.actaEnContra ?? calculado.enContra),
  };
}

/** C-02: si el acta y lo calculado no dicen lo mismo. */
export function difiere(acta: Resultado, calculado: Resultado): boolean {
  return acta.aFavor !== calculado.aFavor || acta.enContra !== calculado.enContra;
}

/** «2 - 1», siempre a favor delante: en el cierre no importa quién jugó en casa. */
export function resultadoEnTexto(resultado: Resultado): string {
  return `${String(resultado.aFavor)} - ${String(resultado.enContra)}`;
}

/** Orígenes del gol (DOC 04 §7.5). Viajan en `details.origen`. */
export const ORIGENES_DE_GOL = [
  { valor: 'jugada', etiqueta: 'Jugada' },
  { valor: 'penalti', etiqueta: 'Penalti' },
  { valor: 'falta_directa', etiqueta: 'Falta directa' },
  { valor: 'corner', etiqueta: 'Córner directo' },
  { valor: 'rechace', etiqueta: 'Rechace' },
] as const;

export type OrigenDeGol = (typeof ORIGENES_DE_GOL)[number]['valor'];

export function esOrigen(valor: string): valor is OrigenDeGol {
  return ORIGENES_DE_GOL.some((origen) => origen.valor === valor);
}

/** El origen guardado, o `null` si no lo tiene. «Jugada» es el valor por defecto, no el vacío. */
export function origenDe(evento: Pick<EventoDelDirecto, 'detalles'>): OrigenDeGol | null {
  const origen = evento.detalles.origen;

  return origen !== undefined && esOrigen(origen) ? origen : null;
}

/** Los goles aprobados, de los dos equipos, en orden de partido. A estos se les pone origen. */
export function golesAprobados(eventos: readonly EventoDelDirecto[]): EventoDelDirecto[] {
  return eventos
    .filter((evento) => evento.tipo === 'goal' && evento.estado === 'approved')
    .sort(
      (a, b) =>
        a.periodo - b.periodo ||
        (a.segundos ?? Number.MAX_SAFE_INTEGER) - (b.segundos ?? Number.MAX_SAFE_INTEGER),
    );
}

/** Qué siguió, en palabras. Del jugador, lo que dé `nombre`: dorsal y apodo. */
export function alcanceEnTexto(
  cobertura: Pick<CoberturaDelCierre, 'alcance' | 'jugador'>,
  nombre: (jugadorId: string) => string,
): string {
  switch (cobertura.alcance) {
    case 'full_team':
      return 'Todo el equipo';
    case 'single_player':
      return cobertura.jugador === null
        ? 'Solo a un jugador'
        : `Solo a ${nombre(cobertura.jugador)}`;
    case 'goals_cards':
      return 'Solo goles y tarjetas';
    case 'custom':
      return 'Una selección de tipos';
  }
}

/** Los minutos de partido que van hasta ese momento, contando las partes anteriores enteras. */
function minutoDePartido(momento: MomentoDelPartido, minutosDeParte: number): number {
  return (momento.periodo - 1) * minutosDeParte + Math.floor(momento.segundos / 60);
}

/**
 * Desde y hasta cuándo, en minutos de partido: «Del minuto 12 al 40». Una
 * abierta solo dice desde cuándo; que sigue sin cerrar lo marca la pantalla.
 * El descuento de una parte cuenta como minutos de más: una primera parte de
 * 40 que se alargó dos acaba en el 42, y la segunda empieza en el 40.
 */
export function tramoEnTexto(
  cobertura: Pick<CoberturaDelCierre, 'desde' | 'hasta' | 'diferido'>,
  minutosDeParte: number,
): string {
  const desde = String(minutoDePartido(cobertura.desde, minutosDeParte));
  const tramo =
    cobertura.hasta === null
      ? `Desde el minuto ${desde}`
      : `Del minuto ${desde} al ${String(minutoDePartido(cobertura.hasta, minutosDeParte))}`;

  return cobertura.diferido ? `${tramo}, en diferido` : tramo;
}
