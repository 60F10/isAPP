import { describe, expect, it } from 'vitest';

import { desdePaquete, reducir } from './directo';

import type { EstadoDirecto } from './directo';
import type { BorradorDeEvento } from './registro';
import type { PaqueteDePartido } from './paquete';

const INICIO = Date.UTC(2026, 9, 4, 11, 0, 0);

function paquete(cambios: Partial<PaqueteDePartido> = {}): PaqueteDePartido {
  return {
    partido: {
      id: 'par-1',
      teamId: 'eq-1',
      competitionId: 'comp-1',
      opponentName: 'At. Tacoronte',
      isHome: false,
      kickoffAt: '2026-10-04T11:00:00Z',
      venue: null,
      status: 'called',
      isRetroactive: false,
    },
    reglamento: {
      periods_count: 2,
      period_minutes: 40,
      halftime_minutes: 15,
      clock_mode: 'running',
      substitution_type: 'fixed',
      substitutions_max: 1,
      squad_max: 18,
      players_on_pitch: 2,
      yellow_cards_for_ban: 5,
      red_card_default_bans: 1,
      enabled_event_types: [
        'goal',
        'own_goal',
        'yellow_card',
        'second_yellow',
        'red_card',
        'foul_committed',
        'foul_received',
        'corner',
        'substitution',
        'position_change',
        'note',
      ],
    },
    convocatoria: [
      { playerId: 'p1', nickname: 'Pepe', callStatus: 'starter', shirtNumber: 1, position: 'GK' },
      {
        playerId: 'p7',
        nickname: 'Juanito',
        callStatus: 'starter',
        shirtNumber: 7,
        position: 'FW',
      },
      {
        playerId: 'p8',
        nickname: 'Luis',
        callStatus: 'substitute',
        shirtNumber: 8,
        position: null,
      },
      {
        playerId: 'p9',
        nickname: 'Nico',
        callStatus: 'substitute',
        shirtNumber: 9,
        position: null,
      },
      {
        playerId: 'p5',
        nickname: 'Fuera',
        callStatus: 'not_called',
        shirtNumber: 5,
        position: null,
      },
    ],
    partes: [],
    eventos: [],
    ...cambios,
  };
}

function enJuego(base: PaqueteDePartido = paquete()): EstadoDirecto {
  return reducir(desdePaquete(base), { tipo: 'empezar_parte', ahora: INICIO, parteId: 'parte-1' })
    .estado;
}

function borrador(cambios: Partial<BorradorDeEvento>): BorradorDeEvento {
  return { tipo: 'goal', rival: false, jugador: null, segundo: null, detalles: {}, ...cambios };
}

let contador = 0;

function registrar(estado: EstadoDirecto, cambios: Partial<BorradorDeEvento>, extra = {}) {
  contador += 1;

  return reducir(estado, {
    tipo: 'registrar',
    ahora: INICIO + 125_000,
    clientEventId: `ce-${contador}`,
    parteId: `parte-nueva-${contador}`,
    userId: 'u1',
    aprobado: false,
    borrador: borrador(cambios),
    ...extra,
  });
}

describe('registrar', () => {
  it('un gol con asistencia viaja tipado, con la parte, los segundos del aparato y su hora', () => {
    const { estado, trabajos, error } = reducir(enJuego(), {
      tipo: 'registrar',
      ahora: INICIO + 125_900,
      clientEventId: 'ce-gol',
      parteId: 'no-se-usa',
      userId: 'u1',
      aprobado: true,
      borrador: borrador({ jugador: 'p7', segundo: 'p1' }),
    });

    expect(error).toBeNull();
    expect(trabajos).toEqual([
      {
        entity: 'match_event',
        op: 'insert',
        matchId: 'par-1',
        payload: {
          valores: {
            client_event_id: 'ce-gol',
            match_id: 'par-1',
            event_type: 'goal',
            period: 1,
            seconds: 125,
            occurred_at: '2026-10-04T11:02:05.900Z',
            is_opponent: false,
            player_id: 'p7',
            secondary_player_id: 'p1',
            details: {},
            status: 'approved',
            created_by: 'u1',
          },
        },
      },
    ]);
    expect(estado.eventos.at(-1)).toMatchObject({
      clientEventId: 'ce-gol',
      estado: 'approved',
      propio: true,
      segundos: 125,
    });
  });

  it('sin event.approve el evento nace pendiente', () => {
    const { trabajos } = registrar(enJuego(), { jugador: 'p7' });

    expect(trabajos[0]?.payload.valores.status).toBe('pending');
  });

  it('del rival va sin jugador', () => {
    const { trabajos, error } = registrar(enJuego(), { tipo: 'corner', rival: true });

    expect(error).toBeNull();
    expect(trabajos[0]?.payload.valores).toMatchObject({ is_opponent: true, player_id: null });
  });

  it('no deja un gol de quien no está en el campo, ni asistirse a sí mismo', () => {
    expect(registrar(enJuego(), { jugador: 'p8' }).error).toBe('Ese jugador no está en el campo.');
    expect(registrar(enJuego(), { jugador: 'p7', segundo: 'p7' }).error).toBe(
      'La asistencia es de otro jugador del campo.',
    );
  });

  it('del rival no admite jugador, y solo goles, córners y tarjetas', () => {
    expect(registrar(enJuego(), { rival: true, jugador: 'p7' }).error).toBe(
      'Del rival no se apunta jugador.',
    );
    expect(registrar(enJuego(), { tipo: 'foul_committed', rival: true }).error).toBe(
      'Del rival solo se apuntan goles, córners y tarjetas.',
    );
  });

  it('una segunda amarilla al mismo jugador pasa a ser segunda amarilla, y lo saca del campo', () => {
    let estado = registrar(enJuego(), { tipo: 'yellow_card', jugador: 'p7' }).estado;
    const segunda = registrar(estado, { tipo: 'yellow_card', jugador: 'p7' });
    estado = segunda.estado;

    expect(segunda.trabajos[0]?.payload.valores.event_type).toBe('second_yellow');
    expect(estado.enCampo).toEqual(['p1']);
    expect(registrar(estado, { tipo: 'red_card', jugador: 'p7' }).error).toBe(
      'Ese jugador ya está expulsado.',
    );
  });

  it('una tarjeta a un suplente vale, sin tocar el campo', () => {
    const { estado, error } = registrar(enJuego(), { tipo: 'red_card', jugador: 'p8' });

    expect(error).toBeNull();
    expect(estado.enCampo).toEqual(['p1', 'p7']);
  });

  it('no deja apuntar nada a quien no está convocado', () => {
    expect(registrar(enJuego(), { tipo: 'yellow_card', jugador: 'p5' }).error).toBe(
      'Ese jugador no está convocado.',
    );
  });

  it('el cambio mueve el campo y respeta R-04, R-05 y R-07', () => {
    const tras = registrar(enJuego(), {
      tipo: 'substitution',
      jugador: 'p7',
      segundo: 'p8',
      detalles: { motivo: 'tactica' },
    });

    expect(tras.error).toBeNull();
    expect(tras.estado.enCampo).toEqual(['p1', 'p8']);
    expect(tras.trabajos[0]?.payload.valores).toMatchObject({
      player_id: 'p7',
      secondary_player_id: 'p8',
      details: { motivo: 'tactica' },
    });

    // R-04: el reglamento de la prueba permite un cambio.
    expect(
      registrar(tras.estado, { tipo: 'substitution', jugador: 'p1', segundo: 'p9' }).error,
    ).toBe('Ya se han hecho los 1 cambios del reglamento.');
  });

  it('con cambios fijos, quien salió no vuelve (R-05)', () => {
    const base = paquete();
    const conDos = { ...base, reglamento: { ...base.reglamento, substitutions_max: 5 } };
    const tras = registrar(enJuego(conDos), { tipo: 'substitution', jugador: 'p7', segundo: 'p8' });

    expect(
      registrar(tras.estado, { tipo: 'substitution', jugador: 'p8', segundo: 'p7' }).error,
    ).toBe('Con cambios fijos, quien sale no vuelve a entrar.');
  });

  it('el expulsado no vuelve a entrar nunca (R-07)', () => {
    const base = paquete();
    const conDos = { ...base, reglamento: { ...base.reglamento, substitutions_max: 5 } };
    const expulsado = registrar(enJuego(conDos), { tipo: 'red_card', jugador: 'p9' }).estado;

    expect(registrar(expulsado, { tipo: 'substitution', jugador: 'p7', segundo: 'p9' }).error).toBe(
      'Un jugador expulsado no puede entrar.',
    );
  });

  it('el cambio del descanso va al segundo cero de la parte siguiente', () => {
    const descanso = reducir(enJuego(), {
      tipo: 'terminar_parte',
      ahora: INICIO + 2_400_000,
    }).estado;
    const { trabajos } = registrar(descanso, {
      tipo: 'substitution',
      jugador: 'p7',
      segundo: 'p8',
    });

    expect(trabajos[0]?.payload.valores).toMatchObject({ period: 2, seconds: 0 });
  });

  it('el cambio de posición pide una posición y la guarda en el detalle', () => {
    expect(registrar(enJuego(), { tipo: 'position_change', jugador: 'p7' }).error).toBe(
      'Elige la posición nueva.',
    );
    expect(
      registrar(enJuego(), {
        tipo: 'position_change',
        jugador: 'p7',
        detalles: { posicion: 'GK' },
      }).error,
    ).toBeNull();
  });

  it('la nota pide texto', () => {
    expect(registrar(enJuego(), { tipo: 'note', detalles: { texto: '  ' } }).error).toBe(
      'Escribe la nota.',
    );
  });

  it('no apunta nada sin empezar, ni después de finalizar, ni tipos apagados', () => {
    expect(registrar(desdePaquete(paquete()), { jugador: 'p7' }).error).toBe(
      'Empieza la 1ª parte antes de apuntar nada.',
    );

    const base = paquete();
    const sinNotas = {
      ...base,
      reglamento: { ...base.reglamento, enabled_event_types: ['goal' as const] },
    };
    expect(registrar(enJuego(sinNotas), { tipo: 'note', detalles: { texto: 'x' } }).error).toBe(
      'Ese tipo de evento está apagado en esta competición.',
    );
  });

  it('en diferido, el minuto va a mano y la parte que falta se crea con su duración prevista', () => {
    const base = paquete();
    const diferido = desdePaquete({ ...base, partido: { ...base.partido, isRetroactive: true } });

    expect(registrar(diferido, { jugador: 'p7' }).error).toBe('Escribe el minuto.');

    const { estado, trabajos, error } = registrar(
      diferido,
      { jugador: 'p7' },
      { minuto: { periodo: 2, segundos: 600 } },
    );

    expect(error).toBeNull();
    expect(trabajos.map((t) => t.entity)).toEqual(['match_period', 'match_event']);
    expect(trabajos[0]?.payload.valores).toMatchObject({
      match_id: 'par-1',
      period_number: 2,
      planned_seconds: 2_400,
      actual_seconds: 2_400,
    });
    expect(trabajos[1]?.payload.valores).toMatchObject({
      period: 2,
      seconds: 600,
      occurred_at: null,
    });
    expect(estado.partes.map((p) => p.numero)).toEqual([2]);

    const otro = registrar(estado, { jugador: 'p1' }, { minuto: { periodo: 2, segundos: 700 } });
    expect(otro.trabajos.map((t) => t.entity)).toEqual(['match_event']);
  });
});

describe('deshacer', () => {
  it('quita lo apuntado en este aparato, devuelve el campo y encola el borrado', () => {
    const tras = registrar(enJuego(), { tipo: 'substitution', jugador: 'p7', segundo: 'p8' });
    const id = tras.estado.eventos.at(-1)?.clientEventId ?? '';
    const { estado, trabajos, error } = reducir(tras.estado, {
      tipo: 'deshacer',
      clientEventId: id,
    });

    expect(error).toBeNull();
    expect(estado.enCampo).toEqual(['p1', 'p7']);
    expect(estado.eventos).toEqual([]);
    expect(trabajos).toEqual([
      {
        entity: 'match_event',
        op: 'delete',
        matchId: 'par-1',
        payload: { valores: {}, clave: { client_event_id: id } },
      },
    ]);
  });

  it('no deshace lo que apuntó otro aparato', () => {
    const base = paquete({
      eventos: [
        {
          client_event_id: 'ajeno',
          event_type: 'goal',
          period: 1,
          seconds: 10,
          is_opponent: true,
          player_id: null,
          status: 'approved',
        },
      ],
    });

    expect(reducir(enJuego(base), { tipo: 'deshacer', clientEventId: 'ajeno' }).error).toBe(
      'Solo se deshace lo apuntado en este aparato.',
    );
  });
});
