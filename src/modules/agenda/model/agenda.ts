// La agenda: partidos y entrenamientos en una sola lista (T-231, D06-42).
//
// Sin React ni red. Mezcla los partidos por jugar con los entrenamientos
// cercanos, para la tarjeta «Por jugar» del calendario, y dice cuál es el
// próximo entrenamiento, para Inicio.
//
// LA VENTANA ES SOLO DE ENTRENAMIENTOS. Con una tanda semanal hay decenas por
// temporada, y enseñarlos todos enterraría los partidos: salen los de hoy a
// catorce días en el calendario y a siete en Inicio. Los partidos no se
// filtran aquí ni cambian de orden entre ellos: llegan ya separados por
// `separarCalendario`, que los parte por su estado.
//
// «HOY» ES EL DÍA DEL MÓVIL, desde las 00:00, como en `training`: el
// entrenamiento de hoy sigue saliendo después de su hora, que es cuando se
// pasa lista.
//
// De `training` solo entra el tipo. Este archivo no importa su barril en
// tiempo de ejecución (`CLAUDE.md`, T-208): arrastraría sus pantallas y el
// cliente de Supabase a una prueba de lógica pura.

import type { Partido } from './partido';
import type { Entrenamiento } from '@modules/training';

/** Cuántos días de entrenamientos enseña el calendario, contando desde hoy. */
export const DIAS_EN_EL_CALENDARIO = 14;

/** Cuántos días mira Inicio para enseñar el próximo entrenamiento. */
export const DIAS_EN_INICIO = 7;

export type EntradaDeAgenda<
  P extends Pick<Partido, 'kickoffAt'> = Partido,
  E extends Pick<Entrenamiento, 'scheduledAt'> = Entrenamiento,
> = { tipo: 'partido'; partido: P } | { tipo: 'entrenamiento'; entrenamiento: E };

/**
 * Los instantes se comparan como fechas y no como texto: la base no siempre
 * escribe el mismo instante con las mismas letras (`Z` o `+00:00`).
 */
function milisegundos(instante: string): number {
  return new Date(instante).getTime();
}

/**
 * Los entrenamientos desde las 00:00 de hoy hasta el final del día que cae
 * dentro de `dias` días, del más cercano al más lejano. Los límites se
 * construyen con el calendario del móvil y no sumando horas, para que un
 * cambio de hora no deje fuera el último día.
 */
function enVentana<E extends Pick<Entrenamiento, 'scheduledAt'>>(
  entrenamientos: readonly E[],
  ahora: Date,
  dias: number,
): E[] {
  const desde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();
  const hasta = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate() + dias + 1,
  ).getTime();

  return entrenamientos
    .filter((entrenamiento) => {
      const instante = milisegundos(entrenamiento.scheduledAt);

      return instante >= desde && instante < hasta;
    })
    .sort((a, b) => milisegundos(a.scheduledAt) - milisegundos(b.scheduledAt));
}

/**
 * La tarjeta «Por jugar»: los partidos que recibe, en el orden en que llegan,
 * con los entrenamientos de los próximos catorce días intercalados por fecha.
 * A la misma hora, el partido va delante.
 *
 * `partidos` son los que están por jugar, ya ordenados. Uno atrasado que nadie
 * ha empezado sigue ahí, por delante de todo: no se filtra por fecha.
 */
export function mezclarAgenda<
  P extends Pick<Partido, 'kickoffAt'>,
  E extends Pick<Entrenamiento, 'scheduledAt'>,
>(partidos: readonly P[], entrenamientos: readonly E[], ahora: Date): EntradaDeAgenda<P, E>[] {
  const cercanos = enVentana(entrenamientos, ahora, DIAS_EN_EL_CALENDARIO);
  const mezcla: EntradaDeAgenda<P, E>[] = [];
  let siguiente = 0;

  for (const partido of partidos) {
    const saque = milisegundos(partido.kickoffAt);

    while (siguiente < cercanos.length && milisegundos(cercanos[siguiente].scheduledAt) < saque) {
      mezcla.push({ tipo: 'entrenamiento', entrenamiento: cercanos[siguiente] });
      siguiente += 1;
    }

    mezcla.push({ tipo: 'partido', partido });
  }

  for (const entrenamiento of cercanos.slice(siguiente)) {
    mezcla.push({ tipo: 'entrenamiento', entrenamiento });
  }

  return mezcla;
}

/**
 * El entrenamiento que Inicio enseña: el primero desde las 00:00 de hoy hasta
 * dentro de siete días. `null` si no hay ninguno.
 */
export function proximoEntrenamiento<E extends Pick<Entrenamiento, 'scheduledAt'>>(
  entrenamientos: readonly E[],
  ahora: Date,
): E | null {
  return enVentana(entrenamientos, ahora, DIAS_EN_INICIO)[0] ?? null;
}

/** Si el instante cae en el día de `ahora`, en la hora del móvil. */
export function esHoy(instante: string, ahora: Date): boolean {
  const dia = new Date(instante);

  return (
    dia.getFullYear() === ahora.getFullYear() &&
    dia.getMonth() === ahora.getMonth() &&
    dia.getDate() === ahora.getDate()
  );
}

/**
 * Si se tiene función en el equipo, y no solo se le sigue (T-301c). Quien
 * solo lo sigue no puede leer los entrenamientos, así que ni se le piden ni
 * se le enlazan. La forma es la de `Membership`, de `auth`, sin importarla.
 */
export function tieneFuncion(
  equipos: readonly { team: { id: string }; seguidor?: boolean }[] | null,
  equipoId: string | null,
): boolean {
  return (
    equipos !== null &&
    equipoId !== null &&
    equipos.some((membresia) => membresia.team.id === equipoId && membresia.seguidor !== true)
  );
}
