// Calendario y partido: lógica pura de las pantallas A09 y A10 (T-204).
//
// Sin React ni red. Convierte la fecha y la hora que se escriben en el
// instante que guarda `matches.kickoff_at`, valida el alta y ordena el
// calendario.
//
// LA HORA ES LA DEL MÓVIL. `<input type="date">` y `<input type="time">`
// devuelven la hora local de quien escribe, y así se interpreta: en Canarias
// es la hora canaria. La base guarda el instante en UTC y cada dispositivo lo
// enseña en su hora. Un partido en la península se vería una hora más tarde en
// un móvil canario, que es lo correcto.

import { limpiarTexto } from '@shared/lib/guardado';

export type EstadoDePartido = 'scheduled' | 'called' | 'live' | 'suspended' | 'finished' | 'closed';

export interface Partido {
  id: string;
  teamId: string;
  competitionId: string;
  competitionName: string;
  opponentTeamId: string;
  opponentName: string;
  isHome: boolean;
  /** Instante ISO, en UTC, como lo devuelve la base. */
  kickoffAt: string;
  venue: string | null;
  status: EstadoDePartido;
  isRetroactive: boolean;
}

export const NOMBRES_DE_ESTADO: Record<EstadoDePartido, string> = {
  scheduled: 'Programado',
  called: 'Convocado',
  live: 'En juego',
  suspended: 'Suspendido',
  finished: 'Terminado, sin cerrar',
  closed: 'Cerrado',
};

/** Largo de interfaz: el campo y la zona caben en una línea del calendario. */
export const LARGO_CAMPO = 120;

const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const HORA = /^(\d{2}):(\d{2})$/;

/**
 * Fecha (`2026-10-25`) y hora (`11:30`) locales al instante ISO en UTC. `null`
 * si alguna de las dos no es válida: un 31 de febrero o las 25:00 no pasan.
 */
export function aInstante(fecha: string, hora: string): string | null {
  const f = FECHA.exec(fecha);
  const h = HORA.exec(hora);

  if (f === null || h === null) {
    return null;
  }

  const [anio, mes, dia] = [Number(f[1]), Number(f[2]), Number(f[3])];
  const [horas, minutos] = [Number(h[1]), Number(h[2])];

  if (horas > 23 || minutos > 59) {
    return null;
  }

  const instante = new Date(anio, mes - 1, dia, horas, minutos);

  // `Date` corrige solo lo imposible (el 31 de febrero pasa a marzo). Si al
  // volver no sale lo mismo, es que no existía. La hora también: en una zona
  // con cambio de horario, las 02:30 del día del adelanto no existen y `Date`
  // las pasaría a las 03:30 sin avisar. Canarias cambia de hora a la 01:00, así
  // que no se ve en las pruebas, que corren en UTC; queda cubierto igual.
  if (
    instante.getFullYear() !== anio ||
    instante.getMonth() !== mes - 1 ||
    instante.getDate() !== dia ||
    instante.getHours() !== horas ||
    instante.getMinutes() !== minutos
  ) {
    return null;
  }

  return instante.toISOString();
}

function dos(numero: number): string {
  return String(numero).padStart(2, '0');
}

/** Del instante guardado a fecha y hora locales, para rellenar el formulario. */
export function partesDeInstante(iso: string): { fecha: string; hora: string } {
  const instante = new Date(iso);

  return {
    fecha: `${instante.getFullYear()}-${dos(instante.getMonth() + 1)}-${dos(instante.getDate())}`,
    hora: `${dos(instante.getHours())}:${dos(instante.getMinutes())}`,
  };
}

export interface FormularioPartido {
  competicionId: string;
  rivalId: string;
  enCasa: boolean;
  fecha: string;
  hora: string;
  campo: string;
  /** Partido que ya se jugó y se mete después, con el reloj parado (D5, DOC 04 §5.4). */
  enDiferido: boolean;
}

export interface ResultadoPartido {
  errores: Partial<Record<'competicionId' | 'rivalId' | 'fecha' | 'hora' | 'campo', string>>;
  /** Columnas de `matches`, o `null` si hay algún error. */
  valores: {
    competition_id: string;
    opponent_team_id: string;
    is_home: boolean;
    kickoff_at: string;
    venue: string | null;
    is_retroactive: boolean;
  } | null;
}

/** Valida el alta o la edición. `ahora` entra de fuera para poder probarlo. */
export function validarPartido(formulario: FormularioPartido, ahora: Date): ResultadoPartido {
  const errores: ResultadoPartido['errores'] = {};
  const campo = limpiarTexto(formulario.campo);

  if (formulario.competicionId === '') {
    errores.competicionId = 'Elige la competición.';
  }

  if (formulario.rivalId === '') {
    errores.rivalId = 'Elige el rival.';
  }

  if (formulario.fecha === '') {
    errores.fecha = 'Escribe la fecha.';
  }

  if (formulario.hora === '') {
    errores.hora = 'Escribe la hora.';
  }

  const instante =
    formulario.fecha === '' || formulario.hora === ''
      ? null
      : aInstante(formulario.fecha, formulario.hora);

  if (instante === null && errores.fecha === undefined && errores.hora === undefined) {
    errores.fecha = 'La fecha o la hora no son válidas.';
  }

  if (instante !== null && formulario.enDiferido && new Date(instante) >= ahora) {
    errores.fecha = 'Un partido en diferido ya se jugó: la fecha tiene que ser anterior a ahora.';
  }

  if (campo.length > LARGO_CAMPO) {
    errores.campo = `Como mucho ${LARGO_CAMPO} caracteres.`;
  }

  if (Object.keys(errores).length > 0 || instante === null) {
    return { errores, valores: null };
  }

  return {
    errores,
    valores: {
      competition_id: formulario.competicionId,
      opponent_team_id: formulario.rivalId,
      is_home: formulario.enCasa,
      kickoff_at: instante,
      venue: campo === '' ? null : campo,
      is_retroactive: formulario.enDiferido,
    },
  };
}

/** Por jugar: programado, convocado o en juego. El resto ya se jugó. */
const POR_JUGAR: readonly EstadoDePartido[] = ['scheduled', 'called', 'live'];

/**
 * Parte el calendario en dos listas. Por el estado y no por la fecha: un
 * partido de ayer que nadie ha empezado sigue pendiente, y uno suspendido ya
 * no se va a jugar como estaba.
 */
export function separarCalendario<T extends Pick<Partido, 'status' | 'kickoffAt'>>(
  partidos: readonly T[],
): { proximos: T[]; jugados: T[] } {
  const porFecha = (a: T, b: T) => a.kickoffAt.localeCompare(b.kickoffAt);

  return {
    proximos: partidos.filter((partido) => POR_JUGAR.includes(partido.status)).sort(porFecha),
    jugados: partidos
      .filter((partido) => !POR_JUGAR.includes(partido.status))
      .sort((a, b) => porFecha(b, a)),
  };
}

/**
 * El campo del partido en casa más reciente que lo tenga, para proponerlo en
 * el siguiente. El campo de casa no vive en `clubs` todavía (DOC 13): se
 * escribe una vez y a partir de ahí se propone solo.
 */
export function ultimoCampoDeCasa(
  partidos: readonly Pick<Partido, 'isHome' | 'venue' | 'kickoffAt'>[],
): string {
  let ultimo: { venue: string; kickoffAt: string } | null = null;

  for (const partido of partidos) {
    if (partido.isHome && partido.venue !== null && partido.venue !== '') {
      if (ultimo === null || partido.kickoffAt > ultimo.kickoffAt) {
        ultimo = { venue: partido.venue, kickoffAt: partido.kickoffAt };
      }
    }
  }

  return ultimo === null ? '' : ultimo.venue;
}

/** «Local – Visitante», como se lee en cualquier calendario. */
export function enfrentamiento(
  partido: Pick<Partido, 'isHome' | 'opponentName'>,
  equipo: string,
): string {
  return partido.isHome
    ? `${equipo} – ${partido.opponentName}`
    : `${partido.opponentName} – ${equipo}`;
}

/**
 * Fecha, rival y campo se cambian mientras el partido no ha empezado (DOC 04
 * §8.1). Después, cambiarlos reescribiría un partido que ya se jugó.
 */
export function sePuedeEditar(estado: EstadoDePartido): boolean {
  return estado === 'scheduled' || estado === 'called';
}
