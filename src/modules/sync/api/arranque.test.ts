// Quién vacía la cola (D06-35, T-216): solo la página que se ve, y al segundo
// intento con el cerrojo ocupado se lo quita a quien lo tenga.
//
// `jsdom` no trae `navigator.locks`, y `visibilityState` es de solo lectura:
// los dos se ponen a mano. `arranque.ts` guarda estado en el módulo, así que
// cada caso lo carga de nuevo.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { OpcionesDeVaciado } from '../model/vaciador';

type Cuerpo = (cerrojo: { name: string } | null) => Promise<unknown>;

const dobles = vi.hoisted(() => ({
  vaciar: vi.fn(),
  registrarError: vi.fn(),
}));

vi.mock('../model/vaciador', () => ({ vaciar: dobles.vaciar }));
vi.mock('./almacen', () => ({
  almacenDexie: {},
  purgarEnviados: () => Promise.resolve(),
  usuarioActual: () => Promise.resolve('u1'),
}));
vi.mock('./transporte', () => ({ enviar: () => Promise.resolve() }));
vi.mock('@modules/logging', () => ({ registrarError: dobles.registrarError }));

const pagina = { visibilidad: 'visible' as DocumentVisibilityState };
const pedirCerrojo = vi.fn();

function cerrojoLibre(): void {
  pedirCerrojo.mockImplementation((nombre: string, _opciones: LockOptions, cuerpo: Cuerpo) =>
    cuerpo({ name: nombre }),
  );
}

/** Ocupado para quien pide con `ifAvailable`; quien roba se lo lleva. */
function cerrojoOcupado(): void {
  pedirCerrojo.mockImplementation((nombre: string, opciones: LockOptions, cuerpo: Cuerpo) =>
    cuerpo(opciones.steal === true ? { name: nombre } : null),
  );
}

async function cargar(): Promise<typeof import('./arranque')> {
  return import('./arranque');
}

beforeEach(() => {
  vi.resetModules();
  pagina.visibilidad = 'visible';
  pedirCerrojo.mockReset();
  dobles.vaciar.mockReset();
  dobles.vaciar.mockResolvedValue({ enviados: 0, aplazados: 0, fallidos: [] });
  dobles.registrarError.mockReset();
  dobles.registrarError.mockResolvedValue(undefined);

  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: { request: pedirCerrojo },
  });
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => pagina.visibilidad,
  });
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, 'locks');
  Reflect.deleteProperty(document, 'visibilityState');
});

describe('sincronizarAhora', () => {
  it('con la página oculta no pide el cerrojo', async () => {
    pagina.visibilidad = 'hidden';
    cerrojoLibre();
    const { sincronizarAhora } = await cargar();

    await sincronizarAhora();

    expect(pedirCerrojo).not.toHaveBeenCalled();
    expect(dobles.vaciar).not.toHaveBeenCalled();
  });

  it('visible y con el cerrojo libre, vacía sin robar', async () => {
    cerrojoLibre();
    const { sincronizarAhora } = await cargar();

    await sincronizarAhora();

    expect(pedirCerrojo).toHaveBeenCalledTimes(1);
    expect(pedirCerrojo).toHaveBeenCalledWith(
      'sasi-outbox',
      { ifAvailable: true },
      expect.any(Function),
    );
    expect(dobles.vaciar).toHaveBeenCalledTimes(1);
  });

  it('visible y con el cerrojo ocupado dos veces, a la segunda lo roba y vacía', async () => {
    cerrojoOcupado();
    const { sincronizarAhora } = await cargar();

    await sincronizarAhora();

    expect(pedirCerrojo).toHaveBeenCalledTimes(1);
    expect(dobles.vaciar).not.toHaveBeenCalled();

    await sincronizarAhora();

    expect(pedirCerrojo).toHaveBeenLastCalledWith(
      'sasi-outbox',
      { steal: true },
      expect.any(Function),
    );
    expect(dobles.vaciar).toHaveBeenCalledTimes(1);
  });

  it('un cerrojo libre entre medias pone la cuenta de fallos a cero', async () => {
    const { sincronizarAhora } = await cargar();

    cerrojoOcupado();
    await sincronizarAhora();
    cerrojoLibre();
    await sincronizarAhora();
    cerrojoOcupado();
    await sincronizarAhora();

    expect(pedirCerrojo).not.toHaveBeenCalledWith(
      'sasi-outbox',
      { steal: true },
      expect.any(Function),
    );
  });

  it('un AbortError del cerrojo no se registra como error', async () => {
    pedirCerrojo.mockRejectedValue(new DOMException('Me han quitado el cerrojo', 'AbortError'));
    const { sincronizarAhora } = await cargar();

    await sincronizarAhora();

    expect(dobles.registrarError).not.toHaveBeenCalled();
  });

  it('cualquier otro fallo del cerrojo sí se registra', async () => {
    const fallo = new Error('IndexedDB cerrada');
    pedirCerrojo.mockRejectedValue(fallo);
    const { sincronizarAhora } = await cargar();

    await sincronizarAhora();

    expect(dobles.registrarError).toHaveBeenCalledWith(fallo, 'sync');
  });

  it('le pasa a `vaciar` un `seguir` que da false al ocultarse la página', async () => {
    cerrojoLibre();
    const { sincronizarAhora } = await cargar();

    await sincronizarAhora();

    const opciones = dobles.vaciar.mock.calls[0]?.[0] as OpcionesDeVaciado;
    expect(opciones.seguir?.()).toBe(true);

    pagina.visibilidad = 'hidden';
    expect(opciones.seguir?.()).toBe(false);
  });

  it('a quien le roban el cerrojo, `seguir` le da false', async () => {
    let soltar: () => void = () => undefined;
    let seguir: (() => boolean) | undefined;

    dobles.vaciar.mockImplementation((opciones: OpcionesDeVaciado) => {
      seguir = opciones.seguir;

      return new Promise((resolver) => {
        soltar = () => {
          resolver({ enviados: 0, aplazados: 0, fallidos: [] });
        };
      });
    });
    // El navegador rechaza la petición de quien tenía el cerrojo en cuanto se
    // lo roban, aunque su tarea siga a medias.
    pedirCerrojo.mockImplementation((nombre: string, _opciones: LockOptions, cuerpo: Cuerpo) => {
      void cuerpo({ name: nombre });

      return Promise.reject(new DOMException('Me han quitado el cerrojo', 'AbortError'));
    });
    const { sincronizarAhora } = await cargar();

    const vaciado = sincronizarAhora();
    await vi.waitFor(() => {
      expect(seguir).toBeDefined();
    });
    await Promise.resolve();

    expect(seguir?.()).toBe(false);

    soltar();
    await vaciado;

    expect(dobles.registrarError).not.toHaveBeenCalled();
  });
});

describe('arrancarSincronizacion', () => {
  it('el temporizador no pide vaciado con la página oculta', async () => {
    vi.useFakeTimers();
    cerrojoLibre();
    const { arrancarSincronizacion } = await cargar();

    const parar = arrancarSincronizacion();
    await vi.advanceTimersByTimeAsync(0);
    pedirCerrojo.mockClear();

    pagina.visibilidad = 'hidden';
    await vi.advanceTimersByTimeAsync(30_000);

    expect(pedirCerrojo).not.toHaveBeenCalled();

    pagina.visibilidad = 'visible';
    await vi.advanceTimersByTimeAsync(10_000);

    expect(pedirCerrojo).toHaveBeenCalledTimes(1);

    parar();
  });
});
