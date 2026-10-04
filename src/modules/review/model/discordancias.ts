// El panel de eventos del cierre, lógica pura (T-210b, DOC 04 §8.2 y §9).
//
// Qué se enseña, en qué orden, qué va junto por ser un posible repetido y
// qué se le puede hacer a cada evento. La tarjeta (`PanelDeEventos`) pinta lo
// que esto decide; `api/discordancias.ts` escribe en la base.
//
// Los tipos del directo entran solo como tipos: un `model/` no importa
// barriles en tiempo de ejecución (D06-33).

import type { EventoDelDirecto } from '@modules/match';

/** Un evento del partido con lo que hace falta para revisarlo. */
export interface EventoRevisable extends EventoDelDirecto {
  /** El `id` de la fila: los `update` de la revisión van por él. */
  id: string;
  /** `created_by`: quién lo apuntó. */
  autorId: string;
  /** `duplicate_group_id`: la marca de posible repetido, o `null`. */
  grupo: string | null;
}

/**
 * En orden de partido: parte y segundo. El que no tiene segundos va al final
 * de su parte, que sí se sabe, como en `golesAprobados`. No toca la lista que
 * recibe, y en un empate respeta el orden de llegada.
 */
export function ordenar(eventos: readonly EventoRevisable[]): EventoRevisable[] {
  return [...eventos].sort(
    (a, b) =>
      a.periodo - b.periodo ||
      (a.segundos ?? Number.MAX_SAFE_INTEGER) - (b.segundos ?? Number.MAX_SAFE_INTEGER),
  );
}

/** Eventos que van juntos en la lista. Con `grupo`, son posibles repetidos entre sí. */
export interface BloqueDeEventos {
  grupo: string | null;
  eventos: EventoRevisable[];
}

/**
 * Junta los posibles repetidos (DOC 04 §9.2): los que comparten
 * `duplicate_group_id` salen seguidos, en el sitio del primero. El resto va
 * solo, cada uno en su bloque sin grupo.
 *
 * UN DESCARTADO NO HACE GRUPO. `flag_duplicate_candidates` tampoco lo cuenta,
 * pero solo recalcula las marcas al abrir la pantalla: hasta entonces, la del
 * evento que se acaba de descartar sigue puesta. Sin esta regla, el que queda
 * seguiría saliendo como repetido de uno que ya no cuenta. Por lo mismo, una
 * marca que no comparte nadie más no es un repetido.
 *
 * @param eventos ya ordenados: los bloques salen en ese orden.
 */
export function agruparRepetidos(eventos: readonly EventoRevisable[]): BloqueDeEventos[] {
  const vivos = new Map<string, number>();

  for (const evento of eventos) {
    if (evento.grupo !== null && evento.estado !== 'rejected') {
      vivos.set(evento.grupo, (vivos.get(evento.grupo) ?? 0) + 1);
    }
  }

  const bloques: BloqueDeEventos[] = [];
  const porGrupo = new Map<string, BloqueDeEventos>();

  for (const evento of eventos) {
    const repetido =
      evento.grupo !== null && evento.estado !== 'rejected' && (vivos.get(evento.grupo) ?? 0) > 1;

    if (!repetido || evento.grupo === null) {
      bloques.push({ grupo: null, eventos: [evento] });
      continue;
    }

    const bloque = porGrupo.get(evento.grupo);

    if (bloque === undefined) {
      const nuevo: BloqueDeEventos = { grupo: evento.grupo, eventos: [evento] };

      porGrupo.set(evento.grupo, nuevo);
      bloques.push(nuevo);
    } else {
      bloque.eventos.push(evento);
    }
  }

  return bloques;
}

export type AccionDeEvento = 'aprobar' | 'descartar' | 'recuperar' | 'minuto';

/**
 * Lo que se le puede hacer a un evento desde el cierre (DOC 04 §8.2). Lo
 * descartado no se borra: se recupera, y vuelve aprobado. Sin `event.approve`
 * la lista se ve y no ofrece nada, que es lo que deja la RLS.
 */
export function accionesDe(
  evento: Pick<EventoRevisable, 'estado'>,
  puedeAprobar: boolean,
): AccionDeEvento[] {
  if (!puedeAprobar) {
    return [];
  }

  switch (evento.estado) {
    case 'pending':
      return ['aprobar', 'descartar', 'minuto'];
    case 'approved':
      return ['descartar', 'minuto'];
    case 'rejected':
      return ['recuperar'];
  }
}
