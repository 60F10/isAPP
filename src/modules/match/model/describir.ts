// Un evento del directo en palabras (T-208): «Gol · 7 · Juanito · 35'». Lo
// usan la confirmación de 2 s y la lista de últimos eventos.
//
// Los nombres de los tipos entran como argumento, y son los de `rules`: el
// modelo no importa el barril en tiempo de ejecución, que arrastraría sus
// pantallas y el cliente de Supabase a una función pura.

import { minutoDePresentacion } from './reloj';

import type { EventoDelDirecto } from './eventos';
import type { TipoDeEvento } from '@modules/rules';

/**
 * @param nombre del identificador de un jugador a «dorsal · apodo». Del
 *   jugador solo se enseña eso.
 * @param nombres `NOMBRES_DE_EVENTO` de `rules`.
 */
export function describirEvento(
  evento: EventoDelDirecto,
  nombre: (id: string) => string,
  minutosDeParte: number,
  nombres: Readonly<Record<TipoDeEvento, string>>,
): string {
  const trozos: string[] = [];

  if (evento.tipo === 'corner') {
    trozos.push(evento.rival ? 'Córner en contra' : 'Córner a favor');
  } else {
    trozos.push(`${nombres[evento.tipo]}${evento.rival ? ' del rival' : ''}`);
  }

  if (evento.tipo === 'substitution' && evento.jugador !== null && evento.segundo !== null) {
    trozos.push(`sale ${nombre(evento.jugador)}, entra ${nombre(evento.segundo)}`);
  } else if (evento.jugador !== null) {
    trozos.push(
      evento.tipo === 'goal' && evento.segundo !== null
        ? `${nombre(evento.jugador)}, asistencia de ${nombre(evento.segundo)}`
        : nombre(evento.jugador),
    );
  }

  if (evento.segundos !== null) {
    trozos.push(minutoDePresentacion(evento.segundos, evento.periodo, minutosDeParte));
  }

  return trozos.join(' · ');
}
