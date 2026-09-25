// `registrarError`: solo con sesión, nunca lanza y no repite (T-106).
//
// Se sustituyen el cliente de Supabase y la inserción, que son la frontera de
// red. La limpieza de la fila ya la prueba `model/errorLog.test.ts`.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSession = vi.hoisted(() => vi.fn());
const insertarErrorLog = vi.hoisted(() => vi.fn());

vi.mock('@shared/lib/supabase', () => ({ supabase: { auth: { getSession } } }));
vi.mock('./errorLogs', () => ({ insertarErrorLog }));

// El limitador vive en el módulo: cada caso lo quiere a estrenar.
async function cargar() {
  vi.resetModules();
  return await import('./registro');
}

const CON_SESION = { data: { session: { user: { id: 'usuario-1' } } } };

describe('registrarError', () => {
  beforeEach(() => {
    getSession.mockReset();
    insertarErrorLog.mockReset();
    insertarErrorLog.mockResolvedValue(undefined);
  });

  it('sin sesión no intenta insertar: la RLS solo deja a `authenticated`', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const { registrarError } = await cargar();

    await registrarError(new Error('x'), 'global');

    expect(insertarErrorLog).not.toHaveBeenCalled();
  });

  it('con sesión inserta con el usuario, el club fijado y el origen delante', async () => {
    getSession.mockResolvedValue(CON_SESION);
    const { fijarClubDeRegistro, registrarError } = await cargar();

    fijarClubDeRegistro('club-1');
    await registrarError(new Error('Se rompió'), 'boundary', '    at Componente');

    expect(insertarErrorLog).toHaveBeenCalledTimes(1);
    expect(insertarErrorLog).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'usuario-1',
        club_id: 'club-1',
        message: '[boundary] Se rompió',
        stack: expect.stringContaining('at Componente'),
      }),
    );
  });

  it('no lanza aunque falle la inserción', async () => {
    getSession.mockResolvedValue(CON_SESION);
    insertarErrorLog.mockRejectedValue(new Error('sin red'));
    const { registrarError } = await cargar();

    await expect(registrarError(new Error('x'), 'global')).resolves.toBeUndefined();
  });

  it('el mismo fallo seguido se registra una sola vez', async () => {
    getSession.mockResolvedValue(CON_SESION);
    const { registrarError } = await cargar();

    await registrarError(new Error('En bucle'), 'global');
    await registrarError(new Error('En bucle'), 'global');

    expect(insertarErrorLog).toHaveBeenCalledTimes(1);
  });
});
