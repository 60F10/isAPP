// C04 (T-206): la banda sale sin red, con trabajos por enviar o con trabajos
// rechazados, y se calla en el resto. IndexedDB y la red se sustituyen en la
// frontera de los hooks y de `api/`.

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnnounceContext } from '@shared/hooks/announceContext';

import { BandaDeSincronizacion } from './BandaDeSincronizacion';

import type { EstadoDeCola } from '../model/cola';

const estado = vi.hoisted(() => ({
  enLinea: true,
  cola: { pendientes: 0, fallidos: 0, ultimoError: null, rechazados: [] } as EstadoDeCola,
}));
const sincronizarAhora = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const descartarRechazado = vi.hoisted(() =>
  vi.fn<(id: string, userId: string) => Promise<boolean>>(() => Promise.resolve(true)),
);

vi.mock('../hooks/useEstadoDeSync', () => ({
  useEnLinea: () => estado.enLinea,
  useEstadoDeCola: () => estado.cola,
}));
vi.mock('../api/arranque', () => ({ sincronizarAhora }));
vi.mock('../api/almacen', () => ({ descartarRechazado }));

function montar() {
  const anunciar = vi.fn();
  const resultado = render(
    <AnnounceContext value={{ anunciar }}>
      <BandaDeSincronizacion userId="u1" />
    </AnnounceContext>,
  );

  return { anunciar, ...resultado };
}

/** La banda dentro de una pantalla con su `h1`, como la deja `Pantalla`. */
function enPantalla(anunciar: (texto: string) => void) {
  return (
    <AnnounceContext value={{ anunciar }}>
      <BandaDeSincronizacion userId="u1" />
      <h1 tabIndex={-1}>Calendario</h1>
    </AnnounceContext>
  );
}

// El nombre de cada «Descartar» empieza por lo que se lee en el botón (2.5.3)
// y sigue con el nombre y la hora de su elemento (T-221).
const DESCARTAR = /^Descartar: /;
const DESCARTAR_ANOTACION = /^Descartar: Anotación · /;
const DESCARTAR_ESTADO = /^Descartar: Estado del partido · /;
const PREGUNTA = '¿Descartar? No se puede recuperar.';

beforeEach(() => {
  estado.enLinea = true;
  estado.cola = { pendientes: 0, fallidos: 0, ultimoError: null, rechazados: [] };
  sincronizarAhora.mockClear();
  descartarRechazado.mockReset();
  descartarRechazado.mockResolvedValue(true);
});

function cola2(): EstadoDeCola {
  return {
    pendientes: 0,
    fallidos: 2,
    ultimoError: '42501 · rls',
    rechazados: [
      { id: 'r1', entity: 'match_event', op: 'insert', createdAt: 2, lastError: '42501 · rls' },
      { id: 'r2', entity: 'match', op: 'update', createdAt: 1, lastError: null },
    ],
  };
}

describe('C04 · Banda de sincronización', () => {
  it('con red y la cola vacía no enseña nada', () => {
    const { container } = montar();

    expect(container).toBeEmptyDOMElement();
  });

  it('sin red lo dice, y cuánto hay guardado esperando', () => {
    estado.enLinea = false;
    estado.cola = { pendientes: 3, fallidos: 0, ultimoError: null, rechazados: [] };
    montar();

    expect(screen.getByText('Sin conexión')).toBeInTheDocument();
    expect(
      screen.getByText(
        '3 anotaciones guardadas en este dispositivo. Se envían solas al volver la cobertura.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('con red y trabajos por enviar, ofrece sincronizar ahora', async () => {
    estado.cola = { pendientes: 1, fallidos: 0, ultimoError: null, rechazados: [] };
    montar();

    expect(screen.getByText('1 anotación por enviar')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sincronizar ahora' }));

    expect(sincronizarAhora).toHaveBeenCalledTimes(1);
  });

  it('cuenta los rechazados y guarda plegado lo que dijo el servidor', () => {
    estado.cola = cola2();
    montar();

    expect(screen.getByText('2 anotaciones sin guardar')).toBeInTheDocument();
    expect(
      screen.getByText('El servidor ha rechazado 2 anotaciones y no se van a reintentar.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Qué dijo el servidor')).toBeInTheDocument();
    expect(screen.getByText('42501 · rls')).not.toBeVisible();
  });

  it('anuncia el cambio de conexión, no la cuenta', () => {
    const { anunciar, rerender } = montar();

    estado.enLinea = false;
    rerender(
      <AnnounceContext value={{ anunciar }}>
        <BandaDeSincronizacion userId="u1" />
      </AnnounceContext>,
    );

    expect(anunciar).toHaveBeenCalledWith('Sin conexión');
    expect(anunciar).toHaveBeenCalledTimes(1);
  });

  it('lista cada rechazado con su nombre y lo que dijo el servidor', async () => {
    estado.cola = cola2();
    montar();

    await userEvent.click(screen.getByText('Qué dijo el servidor'));

    const elementos = screen.getAllByRole('listitem');
    expect(elementos).toHaveLength(2);
    expect(elementos[0]).toHaveTextContent('Anotación');
    expect(elementos[0]).toHaveTextContent('42501 · rls');
    expect(elementos[1]).toHaveTextContent('Estado del partido');
    expect(elementos[1]).toHaveTextContent('El servidor no dijo por qué.');
  });

  it('descartar pide confirmación y «No» no borra', async () => {
    estado.cola = cola2();
    montar();

    await userEvent.click(screen.getByText('Qué dijo el servidor'));
    await userEvent.click(screen.getByRole('button', { name: DESCARTAR_ANOTACION }));

    expect(screen.getByText(PREGUNTA)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'No' }));

    expect(descartarRechazado).not.toHaveBeenCalled();
    expect(screen.queryByText(PREGUNTA)).toBeNull();
  });

  it('«Sí, descartar» borra ese trabajo y lo anuncia', async () => {
    estado.cola = cola2();
    const { anunciar } = montar();

    await userEvent.click(screen.getByText('Qué dijo el servidor'));
    await userEvent.click(screen.getByRole('button', { name: DESCARTAR_ESTADO }));
    await userEvent.click(screen.getByRole('button', { name: 'Sí, descartar' }));

    expect(descartarRechazado).toHaveBeenCalledWith('r2', 'u1');
    // Por el nombre de su entidad: la cola no sabe si era un gol (DOC 06 §4.2).
    expect(anunciar).toHaveBeenCalledWith('Descartado: Estado del partido');
    expect(anunciar).not.toHaveBeenCalledWith('Anotación descartada');
  });

  // T-221: lo que salió de revisar la T-219 (DOC 13, punto 74).
  describe('nombres y foco al descartar (T-221)', () => {
    async function abrir() {
      const montado = montar();
      await userEvent.click(screen.getByText('Qué dijo el servidor'));

      return montado;
    }

    it('cada «Descartar» tiene un nombre accesible distinto', async () => {
      estado.cola = cola2();
      await abrir();

      const nombres = screen
        .getAllByRole('button', { name: DESCARTAR })
        .map((boton) => boton.getAttribute('aria-label'));

      expect(nombres).toHaveLength(2);
      expect(new Set(nombres).size).toBe(2);
      expect(screen.getByRole('button', { name: DESCARTAR_ANOTACION })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: DESCARTAR_ESTADO })).toBeInTheDocument();
    });

    it('dos anotaciones rechazadas en el mismo minuto no comparten nombre', async () => {
      const minuto = Date.UTC(2026, 9, 4, 11, 5, 0);
      estado.cola = {
        pendientes: 0,
        fallidos: 2,
        ultimoError: null,
        rechazados: [
          {
            id: 'r1',
            entity: 'match_event',
            op: 'insert',
            createdAt: minuto + 40_000,
            lastError: null,
          },
          {
            id: 'r2',
            entity: 'match_event',
            op: 'insert',
            createdAt: minuto + 5_000,
            lastError: null,
          },
        ],
      };
      await abrir();

      const nombres = screen
        .getAllByRole('button', { name: DESCARTAR_ANOTACION })
        .map((boton) => boton.getAttribute('aria-label'));

      expect(new Set(nombres).size).toBe(2);
    });

    it('la confirmación es un grupo con el nombre de su elemento', async () => {
      estado.cola = cola2();
      await abrir();

      const nombre = screen
        .getByRole('button', { name: DESCARTAR_ESTADO })
        .getAttribute('aria-label');
      await userEvent.click(screen.getByRole('button', { name: DESCARTAR_ESTADO }));

      const grupo = screen.getByRole('group', { name: nombre ?? '' });
      expect(within(grupo).getByRole('button', { name: 'Sí, descartar' })).toBeInTheDocument();
      expect(within(grupo).getByRole('button', { name: 'No' })).toBeInTheDocument();
    });

    it('tras «Descartar», el foco está en la pregunta', async () => {
      estado.cola = cola2();
      await abrir();

      await userEvent.click(screen.getByRole('button', { name: DESCARTAR_ANOTACION }));

      expect(screen.getByText(PREGUNTA)).toHaveFocus();
    });

    it('tras «No», el foco vuelve al «Descartar» de ese elemento', async () => {
      estado.cola = cola2();
      await abrir();

      await userEvent.click(screen.getByRole('button', { name: DESCARTAR_ESTADO }));
      await userEvent.click(screen.getByRole('button', { name: 'No' }));

      expect(screen.getByRole('button', { name: DESCARTAR_ESTADO })).toHaveFocus();
    });

    it('tras descartar el primero de dos, el foco va al «Descartar» del otro', async () => {
      estado.cola = cola2();
      await abrir();

      await userEvent.click(screen.getByRole('button', { name: DESCARTAR_ANOTACION }));
      await userEvent.click(screen.getByRole('button', { name: 'Sí, descartar' }));

      expect(descartarRechazado).toHaveBeenCalledWith('r1', 'u1');
      expect(screen.getByRole('button', { name: DESCARTAR_ESTADO })).toHaveFocus();
    });

    it('tras descartar el último, el foco va al «Descartar» del anterior', async () => {
      estado.cola = cola2();
      await abrir();

      await userEvent.click(screen.getByRole('button', { name: DESCARTAR_ESTADO }));
      await userEvent.click(screen.getByRole('button', { name: 'Sí, descartar' }));

      expect(screen.getByRole('button', { name: DESCARTAR_ANOTACION })).toHaveFocus();
    });

    it('tras descartar el único, con la banda todavía ahí, el foco va a su titular', async () => {
      const unico = cola2().rechazados.slice(0, 1);
      estado.enLinea = false;
      estado.cola = { pendientes: 0, fallidos: 1, ultimoError: null, rechazados: unico };
      await abrir();

      await userEvent.click(screen.getByRole('button', { name: DESCARTAR_ANOTACION }));
      await userEvent.click(screen.getByRole('button', { name: 'Sí, descartar' }));

      expect(screen.getByText('Sin conexión').closest('p')).toHaveFocus();
    });

    it('si la banda desaparece al descartar el único, el foco va al `h1` de la pantalla', async () => {
      const unico = cola2().rechazados.slice(0, 1);
      estado.cola = { pendientes: 0, fallidos: 1, ultimoError: null, rechazados: unico };
      const anunciar = vi.fn();
      const { rerender } = render(enPantalla(anunciar));

      await userEvent.click(screen.getByText('Qué dijo el servidor'));
      await userEvent.click(screen.getByRole('button', { name: DESCARTAR_ANOTACION }));
      await userEvent.click(screen.getByRole('button', { name: 'Sí, descartar' }));

      // Dexie avisa del borrado y la cola se queda vacía: la banda se va.
      estado.cola = { pendientes: 0, fallidos: 0, ultimoError: null, rechazados: [] };
      rerender(enPantalla(anunciar));

      expect(screen.queryByText('Qué dijo el servidor')).toBeNull();
      expect(screen.getByRole('heading', { level: 1, name: 'Calendario' })).toHaveFocus();
    });

    it('si la banda se va sin que nadie haya descartado nada, no roba el foco', () => {
      estado.cola = { pendientes: 1, fallidos: 0, ultimoError: null, rechazados: [] };
      const anunciar = vi.fn();
      const { rerender } = render(enPantalla(anunciar));

      estado.cola = { pendientes: 0, fallidos: 0, ultimoError: null, rechazados: [] };
      rerender(enPantalla(anunciar));

      expect(screen.getByRole('heading', { level: 1, name: 'Calendario' })).not.toHaveFocus();
    });

    it('si `descartarRechazado` lanza, se anuncia el fallo y la confirmación sigue abierta', async () => {
      estado.cola = cola2();
      descartarRechazado.mockRejectedValue(new Error('QuotaExceededError'));
      const { anunciar } = await abrir();

      await userEvent.click(screen.getByRole('button', { name: DESCARTAR_ANOTACION }));
      await userEvent.click(screen.getByRole('button', { name: 'Sí, descartar' }));

      const mensaje = 'No se ha podido descartar. Vuelve a intentarlo.';
      expect(anunciar).toHaveBeenCalledWith(mensaje);
      expect(anunciar).not.toHaveBeenCalledWith('Descartado: Anotación');
      // La confirmación sigue abierta, con el fallo a la vista y el botón listo.
      expect(screen.getByText(PREGUNTA)).toBeInTheDocument();
      expect(screen.getByText(mensaje)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sí, descartar' })).toBeEnabled();

      // Y al reintentar, sale.
      descartarRechazado.mockResolvedValue(true);
      await userEvent.click(screen.getByRole('button', { name: 'Sí, descartar' }));

      expect(anunciar).toHaveBeenCalledWith('Descartado: Anotación');
      expect(screen.queryByText(PREGUNTA)).toBeNull();
    });

    it('si ya no estaba en la cola, lo dice y cierra la confirmación', async () => {
      estado.cola = cola2();
      descartarRechazado.mockResolvedValue(false);
      const { anunciar } = await abrir();

      await userEvent.click(screen.getByRole('button', { name: DESCARTAR_ANOTACION }));
      await userEvent.click(screen.getByRole('button', { name: 'Sí, descartar' }));

      expect(anunciar).toHaveBeenCalledWith('Eso ya no estaba en la lista.');
      expect(anunciar).not.toHaveBeenCalledWith('Descartado: Anotación');
      expect(screen.queryByText(PREGUNTA)).toBeNull();
    });
  });
});
