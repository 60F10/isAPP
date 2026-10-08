// Entrenamientos: lógica pura de las pantallas A15a y A15b (T-228).
//
// Sin React ni red. Valida el alta, parte el horario en próximos y pasados,
// dice si hoy hay entrenamiento y prepara lo que el alta trae relleno.
//
// LA HORA ES LA DEL MÓVIL, como en el calendario: «hoy» es el día de quien
// mira, y la base guarda el instante en UTC en `scheduled_at`.
//
// SIN `notes`. `training_sessions` tiene esa columna, pero la fila la ve todo
// el club (DOC 04 §13, T-06) y ahí no va ninguna observación: ni se lee ni se
// escribe. La observación del entrenamiento tendrá su tabla (T-233).

import { limpiarTexto } from '@shared/lib/guardado';
import { aInstante, partesDeInstante } from '@shared/lib/instante';

export interface Entrenamiento {
  id: string;
  teamId: string;
  seasonId: string;
  /** Instante ISO, en UTC, como lo devuelve la base. */
  scheduledAt: string;
  location: string | null;
  focus: string | null;
}

/** Largos de interfaz: el esquema no los limita. */
export const LARGO_LUGAR = 120;
export const LARGO_OBJETIVO = 200;

export interface FormularioEntrenamiento {
  fecha: string;
  hora: string;
  lugar: string;
  objetivo: string;
}

export interface ResultadoEntrenamiento {
  errores: Partial<Record<keyof FormularioEntrenamiento, string>>;
  /** Columnas de `training_sessions`, o `null` si hay algún error. */
  valores: {
    scheduled_at: string;
    location: string | null;
    focus: string | null;
  } | null;
}

/**
 * Valida el alta o la edición. Las fechas pasadas se admiten: un
 * entrenamiento ya hecho se mete después.
 */
export function validarEntrenamiento(formulario: FormularioEntrenamiento): ResultadoEntrenamiento {
  const errores: ResultadoEntrenamiento['errores'] = {};
  const lugar = limpiarTexto(formulario.lugar);
  const objetivo = limpiarTexto(formulario.objetivo);

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

  if (lugar.length > LARGO_LUGAR) {
    errores.lugar = `Como mucho ${LARGO_LUGAR} caracteres.`;
  }

  if (objetivo.length > LARGO_OBJETIVO) {
    errores.objetivo = `Como mucho ${LARGO_OBJETIVO} caracteres.`;
  }

  if (Object.keys(errores).length > 0 || instante === null) {
    return { errores, valores: null };
  }

  return {
    errores,
    valores: {
      scheduled_at: instante,
      location: lugar === '' ? null : lugar,
      focus: objetivo === '' ? null : objetivo,
    },
  };
}

/**
 * Los instantes se comparan como fechas y no como texto: la base no siempre
 * escribe el mismo instante con las mismas letras (`Z` o `+00:00`).
 */
function milisegundos(entrenamiento: Pick<Entrenamiento, 'scheduledAt'>): number {
  return new Date(entrenamiento.scheduledAt).getTime();
}

/** El día de `ahora` en la hora del móvil, como lo escribe un campo de fecha. */
function fechaDe(ahora: Date): string {
  return partesDeInstante(ahora.toISOString()).fecha;
}

/**
 * Parte el horario en dos listas. Por la fecha, que un entrenamiento no tiene
 * estado: próximos desde las 00:00 de hoy, del más cercano al más lejano, y
 * pasados del más reciente al más antiguo. El de hoy es próximo todo el día,
 * también después de su hora: es cuando se pasa lista.
 */
export function separarEntrenamientos<T extends Pick<Entrenamiento, 'scheduledAt'>>(
  lista: readonly T[],
  ahora: Date,
): { proximos: T[]; pasados: T[] } {
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();

  return {
    proximos: lista
      .filter((entrenamiento) => milisegundos(entrenamiento) >= hoy)
      .sort((a, b) => milisegundos(a) - milisegundos(b)),
    pasados: lista
      .filter((entrenamiento) => milisegundos(entrenamiento) < hoy)
      .sort((a, b) => milisegundos(b) - milisegundos(a)),
  };
}

/**
 * El entrenamiento de hoy, en la hora del móvil: con dos el mismo día, el que
 * va antes. `null` si hoy no hay ninguno.
 */
export function entrenamientoDeHoy<T extends Pick<Entrenamiento, 'scheduledAt'>>(
  lista: readonly T[],
  ahora: Date,
): T | null {
  const hoy = fechaDe(ahora);
  let primero: T | null = null;

  for (const entrenamiento of lista) {
    if (
      partesDeInstante(entrenamiento.scheduledAt).fecha === hoy &&
      (primero === null || milisegundos(entrenamiento) < milisegundos(primero))
    ) {
      primero = entrenamiento;
    }
  }

  return primero;
}

/**
 * Lo que el alta trae relleno: la fecha de hoy, y la hora y el lugar del
 * entrenamiento más reciente, que casi siempre son los del siguiente. «Más
 * reciente» es el de fecha más alta, como `ultimoCampoDeCasa` en `agenda`.
 * Sin ninguno, la hora vacía y el campo de casa del club, o nada.
 */
export function propuestaDeAlta(
  lista: readonly Pick<Entrenamiento, 'scheduledAt' | 'location'>[],
  campoDeCasa: string | null,
  ahora: Date,
): { fecha: string; hora: string; lugar: string } {
  const fecha = fechaDe(ahora);
  let ultimo: Pick<Entrenamiento, 'scheduledAt' | 'location'> | null = null;

  for (const entrenamiento of lista) {
    if (ultimo === null || milisegundos(entrenamiento) > milisegundos(ultimo)) {
      ultimo = entrenamiento;
    }
  }

  if (ultimo === null) {
    return { fecha, hora: '', lugar: campoDeCasa === null ? '' : limpiarTexto(campoDeCasa) };
  }

  return {
    fecha,
    hora: partesDeInstante(ultimo.scheduledAt).hora,
    lugar: ultimo.location ?? '',
  };
}

/**
 * El instante ISO de `ahora` con los segundos a cero: la hora de
 * «Entrenamiento de hoy», que es la misma que escribiría un campo de hora.
 */
export function instanteDeAhora(ahora: Date): string {
  const instante = new Date(ahora);

  instante.setSeconds(0, 0);

  return instante.toISOString();
}
