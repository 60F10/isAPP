// El aviso por Realtime (T-209b). Lo que se vigila: un canal por partido que
// escucha las altas y los cambios de cada tabla con el filtro del partido y
// los borrados de eventos sin filtro (T-223), que del mensaje no se pasa
// nada, que se quita al dejar de escuchar y que un fallo no sale de aquí.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { escucharPartido } from './tiempoReal';

interface Suscripcion {
  tipo: string;
  filtro: Record<string, string>;
  avisar: (mensaje: unknown) => void;
}

const red = vi.hoisted(() => ({
  canales: [] as { topic: string; suscripciones: Suscripcion[]; suscrito: boolean }[],
  quitados: [] as string[],
  falla: false,
}));

vi.mock('@shared/lib/supabase', () => ({
  supabase: {
    getChannels: () => red.canales,
    channel: (nombre: string) => {
      if (red.falla) {
        throw new Error('sin Realtime');
      }

      const canal = {
        topic: `realtime:${nombre}`,
        suscripciones: [] as Suscripcion[],
        suscrito: false,
        on(tipo: string, filtro: Record<string, string>, avisar: (mensaje: unknown) => void) {
          canal.suscripciones.push({ tipo, filtro, avisar });

          return canal;
        },
        subscribe() {
          canal.suscrito = true;

          return canal;
        },
      };
      red.canales.push(canal);

      return canal;
    },
    removeChannel: (canal: { topic: string }) => {
      red.quitados.push(canal.topic);
      red.canales = red.canales.filter((otro) => otro !== canal);

      return Promise.resolve('ok');
    },
  },
}));

beforeEach(() => {
  red.canales = [];
  red.quitados = [];
  red.falla = false;
});

describe('escucharPartido', () => {
  it('abre el canal del partido: altas y cambios con su filtro, y los borrados de eventos sin filtro (T-223)', () => {
    escucharPartido('par-1', () => undefined);

    const conFiltro = (event: string, table: string) => ({
      tipo: 'postgres_changes',
      filtro: { event, schema: 'public', table, filter: 'match_id=eq.par-1' },
    });

    expect(red.canales).toHaveLength(1);
    expect(red.canales[0]?.topic).toBe('realtime:directo:par-1');
    expect(red.canales[0]?.suscrito).toBe(true);
    expect(red.canales[0]?.suscripciones.map(({ tipo, filtro }) => ({ tipo, filtro }))).toEqual([
      conFiltro('INSERT', 'match_events'),
      conFiltro('UPDATE', 'match_events'),
      conFiltro('INSERT', 'match_periods'),
      conFiltro('UPDATE', 'match_periods'),
      // Supabase no filtra los borrados: con filtro, un evento deshecho en
      // otro móvil podría no avisar.
      {
        tipo: 'postgres_changes',
        filtro: { event: 'DELETE', schema: 'public', table: 'match_events' },
      },
    ]);
  });

  it('cualquiera de las cinco escuchas avisa', () => {
    const alCambiar = vi.fn();
    escucharPartido('par-1', alCambiar);

    const suscripciones = red.canales[0]?.suscripciones ?? [];
    expect(suscripciones).toHaveLength(5);

    for (const suscripcion of suscripciones) {
      suscripcion.avisar({});
    }

    expect(alCambiar).toHaveBeenCalledTimes(5);
  });

  it('avisa sin pasar nada de lo que trae el mensaje', () => {
    const alCambiar = vi.fn();
    escucharPartido('par-1', alCambiar);

    red.canales[0]?.suscripciones[0]?.avisar({ new: { player_id: 'p7' } });

    expect(alCambiar).toHaveBeenCalledTimes(1);
    expect(alCambiar).toHaveBeenCalledWith();
  });

  it('al dejar de escuchar quita el canal, y lo que llegue después no avisa', () => {
    const alCambiar = vi.fn();
    const dejar = escucharPartido('par-1', alCambiar);
    const [canal] = red.canales;

    dejar();
    canal?.suscripciones[0]?.avisar({});

    expect(red.quitados).toEqual(['realtime:directo:par-1']);
    expect(alCambiar).not.toHaveBeenCalled();
  });

  it('si queda un canal de antes con ese nombre, espera a quitarlo y abre uno nuevo', async () => {
    escucharPartido('par-1', () => undefined);
    const [viejo] = red.canales;
    const alCambiar = vi.fn();

    escucharPartido('par-1', alCambiar);
    await vi.waitFor(() => {
      expect(red.canales).toHaveLength(1);
      expect(red.canales[0]).not.toBe(viejo);
    });

    red.canales[0]?.suscripciones[1]?.avisar({});
    expect(alCambiar).toHaveBeenCalledTimes(1);
  });

  it('si se deja de escuchar antes de que se abra, no se abre', async () => {
    escucharPartido('par-1', () => undefined);
    const dejar = escucharPartido('par-1', () => undefined);

    dejar();
    await Promise.resolve();
    await Promise.resolve();

    expect(red.canales).toHaveLength(0);
  });

  it('si Realtime falla, no lanza: el directo sigue con su refresco de seguridad', async () => {
    red.falla = true;

    const dejar = escucharPartido('par-1', () => undefined);
    await Promise.resolve();

    expect(() => {
      dejar();
    }).not.toThrow();
  });
});
