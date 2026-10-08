// «Repetir cada semana»: lógica pura del alta de la A15b (T-230).
//
// Sin React ni red. Dice qué fechas caen en los días elegidos, valida lo que
// se ha escrito y separa lo que se va a crear de lo que ya existe.
//
// LA TANDA NO EXISTE EN LA BASE. De aquí salen filas sueltas de
// `training_sessions`, iguales que las demás: nada las une después, y cada
// entrenamiento se edita y se borra de uno en uno.
//
// LA HORA ES LA DEL MÓVIL, DÍA A DÍA. Un entrenamiento de las 18:00 es a las
// 18:00 antes y después del cambio de hora. Por eso el calendario se recorre
// con fechas (`2026-10-13`) y cada una pasa por `aInstante` con su hora: sumar
// siete días de milisegundos a un instante lo movería una hora al cruzar el
// cambio.

import { aInstante } from '@shared/lib/instante';

/** De 1, lunes, a 7, domingo. */
export type DiaDeLaSemana = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Los siete, en orden y con su nombre. */
export const DIAS: readonly { dia: DiaDeLaSemana; nombre: string }[] = [
  { dia: 1, nombre: 'Lunes' },
  { dia: 2, nombre: 'Martes' },
  { dia: 3, nombre: 'Miércoles' },
  { dia: 4, nombre: 'Jueves' },
  { dia: 5, nombre: 'Viernes' },
  { dia: 6, nombre: 'Sábado' },
  { dia: 7, nombre: 'Domingo' },
];

/** Lo más que se crea de una vez. */
export const MAXIMO_DE_LA_TANDA = 150;

/**
 * Lo más que devuelve `fechasSemanales`. Un campo de fecha admite el año 9999,
 * y sin tope un despiste con el año pondría al móvil a contar millones de
 * días con cada tecla. Una lista que llega al tope no pasa nunca por buena:
 * `planDeLaTanda` la da por demasiado larga.
 */
const TOPE_DE_FECHAS = 1000;

const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const UN_DIA = 86_400_000;

/** `getUTCDay()` cuenta desde el domingo, que es el 0. */
const DESDE_EL_DOMINGO: readonly DiaDeLaSemana[] = [7, 1, 2, 3, 4, 5, 6];

const FECHA_LARGA = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * Una fecha `2026-10-13` como día del calendario: su medianoche en UTC, donde
 * todos los días duran lo mismo. Es solo una cuenta de días, no el instante
 * de ningún entrenamiento. `null` si la fecha no existe.
 */
function aDia(fecha: string): number | null {
  const partes = FECHA.exec(fecha);

  if (partes === null) {
    return null;
  }

  const [anio, mes, dia] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  const cuenta = Date.UTC(anio, mes - 1, dia);
  const vuelta = new Date(cuenta);

  // `Date` corrige solo lo imposible (el 31 de febrero pasa a marzo): si al
  // volver no sale lo mismo, es que no existía.
  if (
    vuelta.getUTCFullYear() !== anio ||
    vuelta.getUTCMonth() !== mes - 1 ||
    vuelta.getUTCDate() !== dia
  ) {
    return null;
  }

  return cuenta;
}

function diaDeLaCuenta(cuenta: number): DiaDeLaSemana {
  return DESDE_EL_DOMINGO[new Date(cuenta).getUTCDay()];
}

/** El día de la semana de una fecha `2026-10-13`. `null` si la fecha no existe. */
export function diaDeLaFecha(fecha: string): DiaDeLaSemana | null {
  const cuenta = aDia(fecha);

  return cuenta === null ? null : diaDeLaCuenta(cuenta);
}

/**
 * Las fechas, como texto `2026-10-13`, que caen en alguno de `dias` entre
 * `desde` y `hasta`, las dos incluidas y en orden. Recorre el calendario día a
 * día, sin pasar por instantes. Ninguna si falta algún dato o no hay rango.
 */
export function fechasSemanales({
  desde,
  hasta,
  dias,
}: {
  desde: string;
  hasta: string;
  dias: readonly DiaDeLaSemana[];
}): string[] {
  const primero = aDia(desde);
  const ultimo = aDia(hasta);
  const fechas: string[] = [];

  if (primero === null || ultimo === null || dias.length === 0) {
    return fechas;
  }

  for (let cuenta = primero; cuenta <= ultimo && fechas.length < TOPE_DE_FECHAS; cuenta += UN_DIA) {
    if (dias.includes(diaDeLaCuenta(cuenta))) {
      fechas.push(new Date(cuenta).toISOString().slice(0, 10));
    }
  }

  return fechas;
}

export interface ErroresDeRepeticion {
  dias?: string;
  hasta?: string;
}

/**
 * Los errores de lo que se ha escrito para repetir, cada uno en su campo. Con
 * `finDeTemporada` nulo no se valida contra ella, y manda solo el máximo de
 * la tanda. La fecha de inicio la valida el alta de siempre.
 */
export function validarRepeticion({
  desde,
  hasta,
  dias,
  finDeTemporada,
}: {
  desde: string;
  hasta: string;
  dias: readonly DiaDeLaSemana[];
  finDeTemporada: string | null;
}): ErroresDeRepeticion {
  const errores: ErroresDeRepeticion = {};
  const primero = aDia(desde);
  const ultimo = aDia(hasta);
  const fin = finDeTemporada === null ? null : aDia(finDeTemporada);

  if (dias.length === 0) {
    errores.dias = 'Elige al menos un día.';
  }

  if (ultimo === null) {
    errores.hasta = 'Indica hasta qué día.';
  } else if (primero !== null && ultimo < primero) {
    errores.hasta = 'Tiene que ser posterior a la fecha de inicio.';
  } else if (fin !== null && ultimo > fin) {
    errores.hasta = `La temporada termina el ${FECHA_LARGA.format(fin)}.`;
  }

  return errores;
}

export interface PlanDeLaTanda {
  /** Los instantes ISO que se van a crear, en orden. */
  nuevos: string[];
  /** Los instantes en los que ya hay un entrenamiento: no se repiten. */
  repetidos: string[];
  /** Las fechas en las que esa hora no existe: no se crean. */
  imposibles: string[];
  /** Por qué no se puede crear la tanda, o `null` si se puede. */
  error: string | null;
}

/**
 * Convierte cada fecha con `aInstante` y separa lo que se va a crear de lo que
 * no. `existentes` son los `scheduledAt` del horario que ya se conoce.
 *
 * Dos instantes son el mismo si son el mismo momento: se comparan como fechas
 * y no como texto, que la base no siempre escribe el mismo instante con las
 * mismas letras (`Z` o `+00:00`).
 */
export function planDeLaTanda({
  fechas,
  hora,
  existentes,
}: {
  fechas: readonly string[];
  hora: string;
  existentes: readonly string[];
}): PlanDeLaTanda {
  const ocupados = new Set(existentes.map((instante) => new Date(instante).getTime()));
  const nuevos: string[] = [];
  const repetidos: string[] = [];
  const imposibles: string[] = [];

  for (const fecha of fechas) {
    const instante = aInstante(fecha, hora);

    if (instante === null) {
      imposibles.push(fecha);
    } else if (ocupados.has(new Date(instante).getTime())) {
      repetidos.push(instante);
    } else {
      nuevos.push(instante);
    }
  }

  let error: string | null = null;

  if (nuevos.length > MAXIMO_DE_LA_TANDA || fechas.length >= TOPE_DE_FECHAS) {
    error = `Son demasiados de una vez: como mucho, ${MAXIMO_DE_LA_TANDA}.`;
  } else if (nuevos.length === 0) {
    error = 'No hay ninguno que crear en esas fechas.';
  }

  return { nuevos, repetidos, imposibles, error };
}
