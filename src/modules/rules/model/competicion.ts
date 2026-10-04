// Competición y reglamento: lógica pura de la A08 (T-203, DOC 04 §4).
//
// Sin React ni red. El reglamento son columnas explícitas de `competitions`
// (DOC 05 §7.1), y aquí están sus rangos, su valor para el cadete, su
// validación y cómo se cuentan en una línea.
//
// LA DURACIÓN NUNCA ES UNA CONSTANTE. Sale de `periods_count × period_minutes`
// (DOC 04 §4.2): para el cadete son 80 minutos, no 90.

import { limpiarTexto } from '@shared/lib/guardado';

export type TipoDeCompeticion = 'league' | 'cup' | 'friendly';
export type ModoDeReloj = 'running' | 'stopped';
export type TipoDeCambios = 'fixed' | 'rolling';

/** Los diecinueve de `event_type`. Existen todos; la competición decide cuáles salen. */
export type TipoDeEvento =
  | 'goal'
  | 'own_goal'
  | 'yellow_card'
  | 'second_yellow'
  | 'red_card'
  | 'foul_committed'
  | 'foul_received'
  | 'corner'
  | 'substitution'
  | 'position_change'
  | 'note'
  | 'pass'
  | 'key_pass'
  | 'shot_on_target'
  | 'shot_off_target'
  | 'offside'
  | 'recovery'
  | 'turnover'
  | 'player_rating';

/** El reglamento, con los nombres de las columnas de `competitions`. */
export interface Reglamento {
  periods_count: number;
  period_minutes: number;
  halftime_minutes: number;
  clock_mode: ModoDeReloj;
  substitution_type: TipoDeCambios;
  substitutions_max: number;
  squad_max: number;
  players_on_pitch: number;
  yellow_cards_for_ban: number;
  red_card_default_bans: number;
  enabled_event_types: TipoDeEvento[];
}

/**
 * Cómo clasifica la federación la competición (DOC 05 §14.4). Para el Cadete
 * A: `Cadete`, `Primera`, `Tenerife`, `G2`. Texto libre y opcional: una copa o
 * un torneo de verano no tiene grupo, y los niveles cambian de un año a otro.
 */
export type CampoDeCategoria = 'category' | 'level' | 'scope' | 'group_label';

export type Categoria = Record<CampoDeCategoria, string | null>;

export const CAMPOS_DE_CATEGORIA: readonly CampoDeCategoria[] = [
  'category',
  'level',
  'scope',
  'group_label',
];

export const SIN_CATEGORIA: Categoria = {
  category: null,
  level: null,
  scope: null,
  group_label: null,
};

/** Largo de interfaz; el esquema no lo limita. «Autonómico Canarias» cabe de sobra. */
export const LARGO_CATEGORIA = 40;

/** Lo que se guarda: reglamento, categoría, nombre y tipo. */
export type DatosDeCompeticion = Reglamento &
  Categoria & {
    name: string;
    kind: TipoDeCompeticion;
  };

export interface Competicion extends DatosDeCompeticion {
  id: string;
  clubId: string;
  seasonId: string;
}

export type CampoNumerico =
  | 'periods_count'
  | 'period_minutes'
  | 'halftime_minutes'
  | 'substitutions_max'
  | 'squad_max'
  | 'players_on_pitch'
  | 'yellow_cards_for_ban'
  | 'red_card_default_bans';

/**
 * Rangos del DOC 04 §4.1, los mismos que las restricciones `check` de
 * `competitions`. Si se toca uno, se toca el otro: la pantalla avisaría de
 * menos o la base rechazaría lo que la pantalla dio por bueno.
 */
export const LIMITES: Record<CampoNumerico, { min: number; max: number }> = {
  periods_count: { min: 1, max: 4 },
  period_minutes: { min: 10, max: 60 },
  halftime_minutes: { min: 0, max: 30 },
  substitutions_max: { min: 0, max: 99 },
  squad_max: { min: 5, max: 30 },
  players_on_pitch: { min: 5, max: 11 },
  yellow_cards_for_ban: { min: 0, max: 20 },
  red_card_default_bans: { min: 0, max: 10 },
};

/** 99 cambios equivale a «sin límite» (DOC 04 §4.1). */
export const SIN_LIMITE_DE_CAMBIOS = 99;

/** Los once tipos con botón en el directo del MVP (DOC 04 §7.1). */
export const TIPOS_DEL_MVP: readonly TipoDeEvento[] = [
  'goal',
  'own_goal',
  'yellow_card',
  'second_yellow',
  'red_card',
  'foul_committed',
  'foul_received',
  'corner',
  'substitution',
  'position_change',
  'note',
];

export const NOMBRES_DE_EVENTO: Record<TipoDeEvento, string> = {
  goal: 'Gol',
  own_goal: 'Gol en propia',
  yellow_card: 'Amarilla',
  second_yellow: 'Segunda amarilla',
  red_card: 'Roja directa',
  foul_committed: 'Falta cometida',
  foul_received: 'Falta recibida',
  corner: 'Córner',
  substitution: 'Cambio',
  position_change: 'Cambio de posición',
  note: 'Nota',
  pass: 'Pase',
  key_pass: 'Pase clave',
  shot_on_target: 'Tiro a puerta',
  shot_off_target: 'Tiro fuera',
  offside: 'Fuera de juego',
  recovery: 'Recuperación',
  turnover: 'Pérdida',
  player_rating: 'Valoración',
};

export const NOMBRES_DE_TIPO: Record<TipoDeCompeticion, string> = {
  league: 'Liga',
  cup: 'Copa',
  friendly: 'Amistosos',
};

/**
 * El reglamento del cadete de Isaac (DOC 04 §4.2), confirmado por Raúl con
 * Isaac el 26/09/2026: 2 × 40 con 15 de descanso, reloj corrido, cambios
 * fijos, 7 como mucho y sin reentrada, 18 convocados, 11 titulares y 5
 * amarillas para un partido de sanción. Es con lo que nace una competición
 * nueva: se ajusta después en su ficha.
 *
 * Los cambios eran 5 hasta el 04/10/2026: Raúl lo corrigió tras el primer
 * partido de liga (T-214). Una competición ya creada conserva su límite.
 */
export const REGLAMENTO_CADETE: Reglamento = {
  periods_count: 2,
  period_minutes: 40,
  halftime_minutes: 15,
  clock_mode: 'running',
  substitution_type: 'fixed',
  substitutions_max: 7,
  squad_max: 18,
  players_on_pitch: 11,
  yellow_cards_for_ban: 5,
  red_card_default_bans: 1,
  enabled_event_types: [...TIPOS_DEL_MVP],
};

/** Largo de interfaz; el esquema no lo limita. «Cadete Primera Tenerife G2» cabe de sobra. */
export const LARGO_NOMBRE_COMPETICION = 80;

/** Lo que se dice si el nombre ya está, lo diga la pantalla o la base (23505). */
export const NOMBRE_REPETIDO = 'Ya hay una competición con ese nombre esta temporada.';

/** Minutos de juego del partido: partes por minutos. El descanso no cuenta. */
export function duracionDeJuego(
  reglamento: Pick<Reglamento, 'periods_count' | 'period_minutes'>,
): number {
  return reglamento.periods_count * reglamento.period_minutes;
}

/** Lo que hay en pantalla: los números y la categoría como texto, tal como se escriben. */
export type FormularioReglamento = Record<CampoNumerico, string> &
  Record<CampoDeCategoria, string> & {
    name: string;
    kind: TipoDeCompeticion;
    clock_mode: ModoDeReloj;
    substitution_type: TipoDeCambios;
    enabled_event_types: readonly TipoDeEvento[];
  };

export interface ResultadoCompeticion {
  errores: Partial<
    Record<CampoNumerico | CampoDeCategoria | 'name' | 'enabled_event_types', string>
  >;
  valores: DatosDeCompeticion | null;
}

const CAMPOS_NUMERICOS = Object.keys(LIMITES) as CampoNumerico[];

/** Del dato guardado al formulario. La categoría vacía se escribe como texto vacío. */
export function aFormulario(competicion: DatosDeCompeticion): FormularioReglamento {
  const numeros = Object.fromEntries(
    CAMPOS_NUMERICOS.map((campo) => [campo, String(competicion[campo])]),
  ) as Record<CampoNumerico, string>;

  return {
    ...numeros,
    category: competicion.category ?? '',
    level: competicion.level ?? '',
    scope: competicion.scope ?? '',
    group_label: competicion.group_label ?? '',
    name: competicion.name,
    kind: competicion.kind,
    clock_mode: competicion.clock_mode,
    substitution_type: competicion.substitution_type,
    enabled_event_types: competicion.enabled_event_types,
  };
}

/**
 * Valida el formulario entero.
 *
 * @param otras competiciones de la misma temporada, para no repetir nombre.
 *   Desde el 26/09 la base también lo impide, con el índice único
 *   `competitions_name_unique` sobre `lower(name)` (DOC 05 §14.4); la
 *   pantalla lo mira antes para decirlo junto al campo, sin viajar.
 * @param idActual al editar, la propia competición, que no cuenta.
 */
export function validarCompeticion(
  formulario: FormularioReglamento,
  otras: readonly Pick<Competicion, 'id' | 'name'>[],
  idActual?: string,
): ResultadoCompeticion {
  const errores: ResultadoCompeticion['errores'] = {};
  const nombre = limpiarTexto(formulario.name);

  if (nombre === '') {
    errores.name = 'Escribe el nombre de la competición.';
  } else if (nombre.length > LARGO_NOMBRE_COMPETICION) {
    errores.name = `Como mucho ${LARGO_NOMBRE_COMPETICION} caracteres.`;
  } else if (
    otras.some(
      (otra) =>
        otra.id !== idActual &&
        limpiarTexto(otra.name).toLocaleLowerCase('es') === nombre.toLocaleLowerCase('es'),
    )
  ) {
    errores.name = NOMBRE_REPETIDO;
  }

  const numeros: Partial<Record<CampoNumerico, number>> = {};

  for (const campo of CAMPOS_NUMERICOS) {
    const { min, max } = LIMITES[campo];
    const escrito = formulario[campo].trim();
    // Solo cifras: ni decimales, ni signos, ni vacío.
    const valor = /^\d{1,3}$/.test(escrito) ? Number(escrito) : NaN;

    if (!Number.isInteger(valor) || valor < min || valor > max) {
      errores[campo] = `Entre ${min} y ${max}.`;
    } else {
      numeros[campo] = valor;
    }
  }

  // R-01 y R-02 del DOC 04 §4.3 no se pueden cumplir a la vez si hay más
  // titulares que convocados. La base no lo impide; mejor pararlo aquí.
  if (
    numeros.players_on_pitch !== undefined &&
    numeros.squad_max !== undefined &&
    numeros.players_on_pitch > numeros.squad_max
  ) {
    errores.players_on_pitch = 'No puede haber más titulares que convocados.';
  }

  if (formulario.enabled_event_types.length === 0) {
    errores.enabled_event_types = 'Deja al menos un botón encendido para el directo.';
  }

  // La categoría es opcional: lo vacío se guarda como nulo, no como texto vacío.
  const categoria: Categoria = { ...SIN_CATEGORIA };

  for (const campo of CAMPOS_DE_CATEGORIA) {
    const escrito = limpiarTexto(formulario[campo]);

    if (escrito.length > LARGO_CATEGORIA) {
      errores[campo] = `Como mucho ${LARGO_CATEGORIA} caracteres.`;
    } else {
      categoria[campo] = escrito === '' ? null : escrito;
    }
  }

  if (Object.keys(errores).length > 0) {
    return { errores, valores: null };
  }

  // Aquí todos los números están: si faltara uno, habría error y no se llega.
  const leer = (campo: CampoNumerico): number => numeros[campo] ?? LIMITES[campo].min;

  return {
    errores,
    valores: {
      name: nombre,
      kind: formulario.kind,
      ...categoria,
      periods_count: leer('periods_count'),
      period_minutes: leer('period_minutes'),
      halftime_minutes: leer('halftime_minutes'),
      clock_mode: formulario.clock_mode,
      substitution_type: formulario.substitution_type,
      substitutions_max: leer('substitutions_max'),
      squad_max: leer('squad_max'),
      players_on_pitch: leer('players_on_pitch'),
      yellow_cards_for_ban: leer('yellow_cards_for_ban'),
      red_card_default_bans: leer('red_card_default_bans'),
      enabled_event_types: [...formulario.enabled_event_types],
    },
  };
}

/** El reglamento en una línea, para la lista de competiciones. */
export function resumenDelReglamento(reglamento: Reglamento): string {
  const cambios =
    reglamento.substitution_type === 'fixed'
      ? `${reglamento.substitutions_max} cambios fijos, sin reentrada`
      : reglamento.substitutions_max >= SIN_LIMITE_DE_CAMBIOS
        ? 'cambios volantes sin límite'
        : `${reglamento.substitutions_max} cambios volantes`;

  return [
    `${reglamento.periods_count} × ${reglamento.period_minutes} min`,
    cambios,
    `${reglamento.squad_max} convocados, ${reglamento.players_on_pitch} titulares`,
  ].join(' · ');
}
