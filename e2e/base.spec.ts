// Lo que decide la base, sin pantalla por medio (T-236).
//
// `supabase-js` desde Node, con la sesión de cada persona: las mismas
// llamadas que haría la aplicación, contra las políticas, los permisos de
// columna y los disparadores de verdad. Es lo que los dobles de las pruebas
// de `src/` no pueden decir.

import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';

import { clienteDe, clienteDeServicio } from './ayudas/clientes';
import { borrarPartido, crearPartido, JUGADORES } from './ayudas/datos';
import { sesionDe } from './ayudas/personas';

import type { Persona } from './ayudas/personas';

/** Lo que PostgreSQL contesta a quien no tiene permiso. */
const SIN_PERMISO = '42501';

test.describe('los jugadores', () => {
  test('al anotador, pedir todas las columnas le falla y pedir el apodo le da los catorce', async () => {
    const anotador = clienteDe('anotador');

    // Desde la T-301a, `authenticated` no puede leer el nombre real ni su
    // consentimiento: un `select('*')` los nombra y la base lo rechaza entero.
    const todo = await anotador.from('players').select('*');

    expect(todo.data).toBeNull();
    expect(todo.error?.code).toBe(SIN_PERMISO);

    const apodos = await anotador.from('players').select('nickname');

    expect(apodos.error).toBeNull();
    expect(apodos.data).toHaveLength(JUGADORES);
    expect((apodos.data ?? []).map((fila) => fila.nickname)).toContain('Jugador 14');
  });
});

test.describe('los eventos del partido', () => {
  let partido = '';

  // En juego: en un partido sin empezar, quien rechaza el evento es el
  // disparador de validación, y aquí se prueba el permiso.
  test.beforeAll(async () => {
    partido = await crearPartido({ estado: 'live', cuando: new Date() });
  });

  test.afterAll(async () => {
    await borrarPartido(partido);
  });

  function corner(persona: Persona) {
    return {
      client_event_id: randomUUID(),
      match_id: partido,
      event_type: 'corner' as const,
      period: 1,
      seconds: 60,
      is_opponent: true,
      created_by: sesionDe(persona).userId,
    };
  }

  test('al seguidor, una inserción en match_events no le entra', async () => {
    const intento = await clienteDe('seguidor').from('match_events').insert(corner('seguidor'));

    expect(intento.error?.code).toBe(SIN_PERMISO);

    // El control: el mismo evento, de quien sí tiene `match.live.write`, entra.
    // Sin él, la prueba pasaría también si la base rechazara a todo el mundo.
    const control = await clienteDe('anotador').from('match_events').insert(corner('anotador'));

    expect(control.error).toBeNull();

    // Y lo que quedó guardado, leído sin RLS: un evento, el del anotador,
    // pendiente porque no tiene `event.approve`.
    const guardado = await clienteDeServicio()
      .from('match_events')
      .select('created_by, status')
      .eq('match_id', partido);

    expect(guardado.error).toBeNull();
    expect(guardado.data).toEqual([{ created_by: sesionDe('anotador').userId, status: 'pending' }]);
  });
});
