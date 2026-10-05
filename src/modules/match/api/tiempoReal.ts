// El aviso de que algo ha cambiado en un partido, por Realtime (T-209b,
// D06-38, DOC 05 §14.9).
//
// SOLO ES UN AVISO. De lo que trae el mensaje no se lee nada: al llegar uno,
// el directo vuelve a descargar el paquete entero, como al abrir. Así no hay
// dos caminos por los que entre un dato, y la RLS que decide lo que se ve es
// la de siempre, la de la consulta.
//
// HOY NO AVISA. La publicación `supabase_realtime` está vacía hasta que se
// aplique `supabase/pendientes/realtime_del_directo.sql`: el canal se
// suscribe y no recibe nada. Por eso el directo no depende de esto, y tiene
// su refresco de seguridad (`useRefresco`).
//
// LOS BORRADOS SE ESCUCHAN SIN FILTRO (T-223). Supabase no filtra los `DELETE`
// («Delete events are not filterable»): con el filtro del partido, un evento
// deshecho en otro móvil podía no avisar. Así que avisa cualquier borrado de
// `match_events`, sea del partido que sea; si no era de este, el refresco no
// trae nada nuevo, y agrupar los avisos durante 1 s evita la ráfaga. De las
// partes se escuchan solo las altas y los cambios.
//
// SI FALLA, EN SILENCIO. Sin canal se anota igual.

import { supabase } from '@shared/lib/supabase';

import type { RealtimeChannel } from '@supabase/supabase-js';

/** Las tablas de las que avisa: lo que se apunta y las partes. */
const TABLAS = ['match_events', 'match_periods'] as const;

/**
 * Escucha los cambios de un partido y llama a `alCambiar` con cada uno, sin
 * decir cuál.
 *
 * @returns la función que deja de escuchar.
 */
export function escucharPartido(partidoId: string, alCambiar: () => void): () => void {
  const nombre = `directo:${partidoId}`;
  const filtro = `match_id=eq.${partidoId}`;
  let canal: RealtimeChannel | null = null;
  let parado = false;

  const abrir = async () => {
    // La librería devuelve el canal que ya exista con ese nombre. Si se sale
    // del directo y se vuelve a entrar enseguida —o en desarrollo, donde React
    // monta dos veces—, el de antes puede seguir cerrándose, y suscribirse a
    // uno que se va no escucha nada. Se espera a que termine de quitarse.
    const anterior = supabase.getChannels().find((otro) => otro.topic === `realtime:${nombre}`);

    if (anterior !== undefined) {
      await supabase.removeChannel(anterior);
    }

    if (parado) {
      return;
    }

    const avisar = () => {
      if (!parado) {
        alCambiar();
      }
    };
    let nuevo = supabase.channel(nombre);

    for (const tabla of TABLAS) {
      nuevo = nuevo
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: tabla, filter: filtro },
          avisar,
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: tabla, filter: filtro },
          avisar,
        );
    }

    nuevo = nuevo.on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'match_events' },
      avisar,
    );

    canal = nuevo.subscribe();
  };

  abrir().catch(() => undefined);

  return () => {
    parado = true;

    if (canal !== null) {
      supabase.removeChannel(canal).catch(() => undefined);
    }
  };
}
