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
import { aInstante, partesDeInstante } from '@shared/lib/instante';

// Fecha y hora viven en `shared/lib/instante.ts` desde la T-228, porque
// `training` las usa también y no puede importar de `agenda`. Se vuelven a
// exportar para que nada de `agenda` cambie de dónde las importa.
export { aInstante, partesDeInstante };

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
 * El partido que Inicio enseña en «Próximo evento» (T-213): de los que están
 * por jugar, el que está en juego; si no hay ninguno, el primero por fecha.
 * `null` si no queda nada por jugar. Con dos en juego a la vez, el que empezó
 * antes.
 */
export function proximoPartido<T extends Pick<Partido, 'status' | 'kickoffAt'>>(
  partidos: readonly T[],
): T | null {
  const { proximos } = separarCalendario(partidos);

  return proximos.find((partido) => partido.status === 'live') ?? proximos[0] ?? null;
}

/**
 * El campo del partido en casa más reciente que lo tenga. Desde la T-203b es
 * solo el recambio de `campoDeCasaPropuesto`, para un club que no tenga
 * rellenado su campo de casa.
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

/**
 * El campo que se propone en un partido en casa: el del club, que vive en
 * `clubs.home_venue` desde el 26/09 (DOC 05 §14.4) y, si el club no lo tiene,
 * el del último partido en casa que lo tuviera. Vacío si no hay ninguno.
 */
export function campoDeCasaPropuesto(
  campoDelClub: string | null,
  partidos: readonly Pick<Partido, 'isHome' | 'venue' | 'kickoffAt'>[],
): string {
  const delClub = campoDelClub === null ? '' : limpiarTexto(campoDelClub);

  return delClub === '' ? ultimoCampoDeCasa(partidos) : delClub;
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

/**
 * Si el calendario enlaza el directo del partido (A12, T-212): convocado o en
 * juego. Programado no tiene convocatoria que llevar al campo, y terminado
 * solo le queda el cierre. Qué se puede hacer allí lo decide `match`; esto
 * solo elige cuándo enseñar el enlace.
 */
export function tieneDirecto(estado: EstadoDePartido): boolean {
  return estado === 'called' || estado === 'live';
}

/**
 * Si el calendario enlaza el cierre del partido (A13, T-210a): terminado,
 * suspendido o cerrado; en diferido, también convocado o en juego, porque
 * ese partido no tiene reloj y se termina desde el cierre. Qué se puede
 * hacer allí lo decide `review`; esto solo elige cuándo enseñar el enlace.
 */
export function tieneCierre(partido: Pick<Partido, 'status' | 'isRetroactive'>): boolean {
  switch (partido.status) {
    case 'finished':
    case 'suspended':
    case 'closed':
      return true;
    case 'called':
    case 'live':
      return partido.isRetroactive;
    case 'scheduled':
      return false;
  }
}
