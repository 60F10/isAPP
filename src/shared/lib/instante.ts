// Fecha y hora de formulario, de ida y vuelta al instante que guarda la base.
//
// Nacieron en `agenda/model/partido.ts` (T-204) y se mudan aquí en la T-228,
// cuando `training` las necesita también: un módulo no importa de otro que no
// sea `shared`, `auth` o `core` (DOC 06 §4.2).
//
// LA HORA ES LA DEL MÓVIL. `<input type="date">` y `<input type="time">`
// devuelven la hora local de quien escribe, y así se interpreta: en Canarias
// es la hora canaria. La base guarda el instante en UTC y cada dispositivo lo
// enseña en su hora.

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
