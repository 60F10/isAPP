// El reductor del partido en directo: lógica pura (DOC 06 §5.4, D06-04,
// DOC 04 §5 y §8.1, T-207).
//
// Toda transición es `(estado, acción) → { estado, trabajos, error }`. Los
// trabajos son las filas que hay que encolar en `sync`; la pantalla las
// encola y guarda el estado en IndexedDB, y así sobrevive a una recarga sin
// ningún trabajo extra. Lo ilegal no lanza: devuelve el mismo estado, ningún
// trabajo y el motivo en palabras.
//
//   inactivo → en_juego ⇄ pausado → descanso → en_juego … → finalizado
//
// LA HORA ENTRA COMO ARGUMENTO. El reductor no llama a `Date.now()` ni genera
// identificadores: así se prueba entero y una acción repetida da lo mismo.
//
// «QUIÉN ESTÁ EN EL CAMPO» es estado de pantalla (DOC 04 §6.5): los
// titulares, movidos por los cambios y las expulsiones que conoce el aparato
// (T-208, `registro.ts`). Los tramos oficiales los recalcula el servidor con
// los eventos aprobados.
//
// LA PAUSA ES LOCAL. Descuenta del reloj de este aparato y de la duración
// real de la parte, pero el servidor no la conoce: otro dispositivo que
// derive los segundos de `started_at` no la verá. Con reloj corrido, como el
// cadete, solo se pausa por un parón largo (DOC 13).
//
// LAS PARTES SON DE TODOS LOS APARATOS (T-209c, D06-39). Se concilian por
// número con las del servidor: el `id` y el arranque son del primero que llegó
// a la base, y por eso una parte se termina por partido y número, no por `id`.
//
// SUSPENDER ES UNA TRANSICIÓN MÁS (T-226, D06-41). Cierra la parte abierta, si
// la hay, y deja el partido en `suspended` con su parte y su segundo. La fase
// local es `finalizado`, como la de un partido terminado: lo que distingue al
// suspendido es `suspension`. No se deshace, y en diferido no la hay.

import { calcularEnCampo, desdeFilas } from './eventos';
import { conEventos, deshacer, registrar } from './registro';

import type { EventoDelDirecto } from './eventos';
import type { PaqueteDePartido } from './paquete';
import type { AccionRegistrar } from './registro';
import type { Posicion } from '@modules/core';
import type { TipoDeEvento } from '@modules/rules';
import type { EntradaDeTrabajo } from '@modules/sync';

export type Fase = 'inactivo' | 'en_juego' | 'pausado' | 'descanso' | 'finalizado';

export interface ParteLocal {
  /**
   * El `id` de `match_periods`. Lo genera el dispositivo que la abre, y se
   * cambia por el del servidor si otro la abrió antes (`conciliarPartes`).
   */
  id: string;
  numero: number;
  /** Instante de arranque en milisegundos: el ancla del reloj (D06-15). */
  inicio: number;
  pausadoMs: number;
  /** Desde cuándo está en pausa, o `null` si corre. */
  pausaDesde: number | null;
  /** Duración real, al cerrarla. `null` mientras está abierta. */
  segundosReales: number | null;
}

export interface EstadoDirecto {
  partidoId: string;
  fase: Fase;
  partes: ParteLocal[];
  /** Quién está en el campo según este aparato. Se deriva de `titulares` y `eventos`. */
  enCampo: string[];
  titulares: string[];
  /** Titulares y suplentes: los que pueden aparecer en un evento. */
  convocados: string[];
  /** Posición de cada convocado en la convocatoria. Los cambios de posición la mueven. */
  posicionesIniciales: Record<string, Posicion | null>;
  /** Los eventos que conoce el aparato: precargados y apuntados aquí. */
  eventos: EventoDelDirecto[];
  periodos: number;
  minutosDeParte: number;
  titularesPedidos: number;
  cambiosMax: number;
  /** Cambios fijos: quien sale no vuelve (R-05). */
  cambiosFijos: boolean;
  /** Los botones que salen: `enabled_event_types` de la competición (R-09). */
  tiposActivos: TipoDeEvento[];
  /** Partido en diferido: sin reloj, con el minuto a mano (DOC 04 §5.4). */
  diferido: boolean;
  /**
   * Dónde se suspendió el partido (T-226, DOC 04 §8.1): el número de la parte
   * y sus segundos. `null` si no está suspendido. Con ella, la fase es
   * `finalizado`.
   */
  suspension: Suspension | null;
}

export interface Suspension {
  parte: number;
  segundos: number;
}

export type Accion =
  | { tipo: 'empezar_parte'; ahora: number; parteId: string }
  | { tipo: 'pausar' | 'reanudar' | 'terminar_parte' | 'finalizar'; ahora: number }
  | { tipo: 'suspender'; ahora: number }
  | AccionRegistrar
  | { tipo: 'deshacer'; clientEventId: string };

export interface Resultado {
  estado: EstadoDirecto;
  trabajos: EntradaDeTrabajo[];
  error: string | null;
}

/** El estado a partir de lo precargado del servidor. */
export function desdePaquete(paquete: PaqueteDePartido): EstadoDirecto {
  const diferido = paquete.partido.isRetroactive;
  const partes = paquete.partes
    // En diferido las partes no tienen arranque: se crean con su duración.
    .filter((parte) => diferido || parte.startedAt !== null)
    .sort((a, b) => a.periodNumber - b.periodNumber)
    .map((parte): ParteLocal => ({
      id: parte.id,
      numero: parte.periodNumber,
      inicio: parte.startedAt === null ? 0 : Date.parse(parte.startedAt),
      pausadoMs: 0,
      pausaDesde: null,
      segundosReales:
        diferido || parte.endedAt !== null ? (parte.actualSeconds ?? parte.plannedSeconds) : null,
    }));

  const ultima = partes[partes.length - 1];
  // Un paquete guardado antes de la T-226 no trae la parte ni el segundo.
  const { status, suspendedPeriod = null, suspendedSeconds = null } = paquete.partido;
  let fase: Fase = 'inactivo';

  if (status === 'finished' || status === 'closed' || status === 'suspended') {
    fase = 'finalizado';
  } else if (ultima !== undefined && !diferido) {
    fase = ultima.segundosReales === null ? 'en_juego' : 'descanso';
  }

  const convocados = paquete.convocatoria.filter((linea) => linea.callStatus !== 'not_called');
  const titulares = convocados
    .filter((linea) => linea.callStatus === 'starter')
    .map((linea) => linea.playerId);
  const eventos = desdeFilas(paquete.eventos);
  const { reglamento } = paquete;

  return {
    partidoId: paquete.partido.id,
    fase,
    partes,
    enCampo: calcularEnCampo(titulares, eventos),
    titulares,
    convocados: convocados.map((linea) => linea.playerId),
    posicionesIniciales: Object.fromEntries(
      convocados.map((linea) => [linea.playerId, linea.position]),
    ),
    eventos,
    periodos: reglamento.periods_count,
    minutosDeParte: reglamento.period_minutes,
    titularesPedidos: reglamento.players_on_pitch,
    cambiosMax: reglamento.substitutions_max,
    cambiosFijos: reglamento.substitution_type === 'fixed',
    tiposActivos: reglamento.enabled_event_types,
    diferido,
    suspension:
      status === 'suspended' && suspendedPeriod !== null && suspendedSeconds !== null
        ? { parte: suspendedPeriod, segundos: suspendedSeconds }
        : null,
  };
}

/** Empezado y sin terminar: lo que calla el aviso de versión nueva (D06-14). */
export function enCurso(estado: EstadoDirecto): boolean {
  return estado.fase !== 'inactivo' && estado.fase !== 'finalizado';
}

function ilegal(estado: EstadoDirecto, error: string): Resultado {
  return { estado, trabajos: [], error };
}

function estadoDelPartido(partidoId: string, status: 'live' | 'finished'): EntradaDeTrabajo {
  return {
    entity: 'match',
    op: 'update',
    matchId: partidoId,
    payload: { valores: { status }, clave: { id: partidoId } },
  };
}

function conParte(estado: EstadoDirecto, parte: ParteLocal): ParteLocal[] {
  return estado.partes.map((otra) => (otra.id === parte.id ? parte : otra));
}

/**
 * Cierra la parte abierta: sus segundos reales, descontada la pausa, y el
 * trabajo que la termina en la base. Lo usan `terminar_parte` y `suspender`
 * (T-226), que cierran igual.
 */
function cerrarParte(
  estado: EstadoDirecto,
  abierta: ParteLocal,
  ahora: number,
): { parte: ParteLocal; trabajo: EntradaDeTrabajo } {
  const hasta = abierta.pausaDesde ?? ahora;
  const segundosReales = Math.max(
    0,
    Math.floor((hasta - abierta.inicio - abierta.pausadoMs) / 1000),
  );

  return {
    parte: { ...abierta, pausaDesde: null, segundosReales },
    trabajo: {
      entity: 'match_period',
      op: 'update',
      matchId: estado.partidoId,
      payload: {
        valores: {
          ended_at: new Date(ahora).toISOString(),
          actual_seconds: segundosReales,
        },
        // Por partido y número, no por `id` (D06-39): si otro aparato
        // abrió antes esta parte, el `id` de este no está en la base
        // hasta el siguiente refresco. El número va como texto.
        clave: { match_id: estado.partidoId, period_number: String(abierta.numero) },
      },
    },
  };
}

export function reducir(estado: EstadoDirecto, accion: Accion): Resultado {
  const abierta = estado.partes.find((parte) => parte.segundosReales === null);

  switch (accion.tipo) {
    case 'empezar_parte': {
      if (estado.fase !== 'inactivo' && estado.fase !== 'descanso') {
        return ilegal(estado, 'Ya hay una parte en juego.');
      }

      const numero = estado.partes.length + 1;

      if (numero > estado.periodos) {
        return ilegal(estado, `Esta competición tiene ${estado.periodos} partes.`);
      }

      if (estado.diferido) {
        return ilegal(estado, 'En diferido no hay reloj: cada evento lleva su minuto.');
      }

      // R-02: se comprueba antes de empezar, que es cuando todavía se puede
      // volver a la convocatoria.
      if (numero === 1 && estado.titulares.length !== estado.titularesPedidos) {
        return ilegal(
          estado,
          `Tienen que salir ${estado.titularesPedidos} titulares y la convocatoria tiene ${estado.titulares.length}.`,
        );
      }

      const parte: ParteLocal = {
        id: accion.parteId,
        numero,
        inicio: accion.ahora,
        pausadoMs: 0,
        pausaDesde: null,
        segundosReales: null,
      };
      const trabajos: EntradaDeTrabajo[] = [
        {
          entity: 'match_period',
          op: 'insert',
          matchId: estado.partidoId,
          payload: {
            valores: {
              id: parte.id,
              match_id: estado.partidoId,
              period_number: numero,
              planned_seconds: estado.minutosDeParte * 60,
              started_at: new Date(accion.ahora).toISOString(),
            },
          },
        },
      ];

      return {
        estado: { ...estado, fase: 'en_juego', partes: [...estado.partes, parte] },
        // El partido pasa a en juego antes que la parte: la cola respeta el
        // orden, y así nadie ve una parte abierta de un partido convocado.
        trabajos:
          numero === 1 ? [estadoDelPartido(estado.partidoId, 'live'), ...trabajos] : trabajos,
        error: null,
      };
    }

    case 'pausar': {
      if (estado.fase !== 'en_juego' || abierta === undefined) {
        return ilegal(estado, 'Solo se pausa una parte en juego.');
      }

      return {
        estado: {
          ...estado,
          fase: 'pausado',
          partes: conParte(estado, { ...abierta, pausaDesde: accion.ahora }),
        },
        trabajos: [],
        error: null,
      };
    }

    case 'reanudar': {
      if (estado.fase !== 'pausado' || abierta === undefined || abierta.pausaDesde === null) {
        return ilegal(estado, 'No hay ninguna parte en pausa.');
      }

      return {
        estado: {
          ...estado,
          fase: 'en_juego',
          partes: conParte(estado, {
            ...abierta,
            pausadoMs: abierta.pausadoMs + (accion.ahora - abierta.pausaDesde),
            pausaDesde: null,
          }),
        },
        trabajos: [],
        error: null,
      };
    }

    case 'terminar_parte': {
      if ((estado.fase !== 'en_juego' && estado.fase !== 'pausado') || abierta === undefined) {
        return ilegal(estado, 'No hay ninguna parte en juego.');
      }

      const cierre = cerrarParte(estado, abierta, accion.ahora);

      return {
        estado: { ...estado, fase: 'descanso', partes: conParte(estado, cierre.parte) },
        trabajos: [cierre.trabajo],
        error: null,
      };
    }

    case 'finalizar': {
      if (estado.fase !== 'descanso') {
        return ilegal(estado, 'Termina antes la parte en juego.');
      }

      if (estado.partes.length < estado.periodos) {
        return ilegal(estado, 'Quedan partes por jugar.');
      }

      return {
        estado: { ...estado, fase: 'finalizado' },
        trabajos: [estadoDelPartido(estado.partidoId, 'finished')],
        error: null,
      };
    }

    case 'suspender': {
      if (estado.fase === 'finalizado') {
        return ilegal(estado, 'El partido ya ha terminado.');
      }

      if (estado.diferido) {
        return ilegal(estado, 'En diferido, el partido se termina desde el cierre.');
      }

      if (estado.fase === 'inactivo') {
        return ilegal(estado, 'El partido no ha empezado.');
      }

      // Con una parte abierta —en juego o en pausa— se cierra como en
      // `terminar_parte`. En el descanso ya está cerrada, y vale como está.
      const cierre = abierta === undefined ? null : cerrarParte(estado, abierta, accion.ahora);
      const partes = cierre === null ? estado.partes : conParte(estado, cierre.parte);
      const ultima = partes[partes.length - 1];

      if (ultima === undefined || ultima.segundosReales === null) {
        return ilegal(estado, 'El partido no ha empezado.');
      }

      const suspension: Suspension = { parte: ultima.numero, segundos: ultima.segundosReales };
      const partido: EntradaDeTrabajo = {
        entity: 'match',
        op: 'update',
        matchId: estado.partidoId,
        payload: {
          // Los tres a la vez: la base exige la parte y el segundo con el
          // estado `suspended` (restricción `matches_suspension`).
          valores: {
            status: 'suspended',
            suspended_period: suspension.parte,
            suspended_seconds: suspension.segundos,
          },
          clave: { id: estado.partidoId },
        },
      };

      return {
        estado: { ...estado, fase: 'finalizado', partes, suspension },
        // La parte antes que el partido: la cola respeta el orden, y así nadie
        // ve un partido suspendido con una parte abierta.
        trabajos: cierre === null ? [partido] : [cierre.trabajo, partido],
        error: null,
      };
    }

    case 'registrar':
      return registrar(estado, accion);

    case 'deshacer':
      return deshacer(estado, accion.clientEventId);
  }
}

/**
 * Lo que manda siempre el servidor (D06-36): la convocatoria y el reglamento.
 * No son del avance del partido, y pueden cambiar con el directo ya abierto
 * una vez: se sube el límite de cambios, se convoca a alguien más.
 */
const DEL_SERVIDOR = [
  'titulares',
  'convocados',
  'posicionesIniciales',
  'periodos',
  'minutosDeParte',
  'titularesPedidos',
  'cambiosMax',
  'cambiosFijos',
  'tiposActivos',
  'diferido',
] as const satisfies readonly (keyof EstadoDirecto)[];

function igual(una: unknown, otra: unknown): boolean {
  return JSON.stringify(una) === JSON.stringify(otra);
}

/**
 * Las partes de este aparato, conciliadas por número con las del servidor
 * (T-209c, D06-39). Dos aparatos pueden abrir la misma parte, cada uno con su
 * `id`; en la base solo cabe una por partido y número, la del primero que llegó.
 *
 * - La misma parte en los dos: el `id` y el arranque son del servidor, y así
 *   todos los relojes salen de la misma ancla. `pausadoMs` y `pausaDesde` son
 *   locales: el servidor no conoce la pausa.
 * - Cerrada en el servidor y abierta aquí: se cierra con los segundos del
 *   servidor y se le quita la pausa.
 * - Cerrada aquí, lo esté o no en el servidor: se queda con los segundos de
 *   este aparato. Su cierre está en la cola, o ya llegó.
 * - Solo en el servidor: se añade. Solo aquí: se queda, su alta está en la cola.
 *
 * Sin diferencias devuelve `local`, la misma lista.
 */
export function conciliarPartes(
  local: ParteLocal[],
  servidor: readonly ParteLocal[],
): ParteLocal[] {
  const delServidor = new Map(servidor.map((parte) => [parte.numero, parte]));
  const numeros = new Set(local.map((parte) => parte.numero));

  const conciliadas = local.map((parte): ParteLocal => {
    const otra = delServidor.get(parte.numero);

    if (otra === undefined) {
      return parte;
    }

    const cerradaFuera = parte.segundosReales === null && otra.segundosReales !== null;

    return {
      ...parte,
      id: otra.id,
      inicio: otra.inicio,
      pausaDesde: cerradaFuera ? null : parte.pausaDesde,
      segundosReales: cerradaFuera ? otra.segundosReales : parte.segundosReales,
    };
  });

  for (const parte of servidor) {
    if (!numeros.has(parte.numero)) {
      conciliadas.push(parte);
    }
  }

  conciliadas.sort((a, b) => a.numero - b.numero);

  return igual(conciliadas, local) ? local : conciliadas;
}

/**
 * La fase que sale de las partes conciliadas: la regla de `desdePaquete`, con
 * dos salvedades. Terminado en cualquiera de los dos, terminado. Y la pausa de
 * este aparato se conserva mientras siga abierta la parte que pausó.
 */
function faseConciliada(
  local: EstadoDirecto,
  servidor: EstadoDirecto,
  partes: readonly ParteLocal[],
): Fase {
  if (local.fase === 'finalizado' || servidor.fase === 'finalizado') {
    return 'finalizado';
  }

  const ultima = partes[partes.length - 1];

  if (ultima === undefined || servidor.diferido) {
    return 'inactivo';
  }

  if (ultima.segundosReales !== null) {
    return 'descanso';
  }

  return local.fase === 'pausado' && ultima.pausaDesde !== null ? 'pausado' : 'en_juego';
}

/**
 * Qué estado manda al abrir el directo y en cada refresco: el guardado en
 * este aparato, puesto al día con lo que sale del paquete del servidor.
 *
 * LAS PARTES se concilian por número (`conciliarPartes`, D06-39), y LA FASE
 * se deriva de ellas. Así, si otro aparato abrió, cerró o terminó, se ve sin
 * recargar; y lo que este aparato hizo sin red no se deshace porque el
 * servidor aún no lo sepa.
 *
 * LOS EVENTOS son siempre los de este aparato. Unirlos con los del servidor
 * y quitar los borrados es de `fusionar`, que mira la cola. Con estado local,
 * nunca se devuelve `servidor` entero: se llevaría lo que está sin enviar.
 *
 * LA CONVOCATORIA Y EL REGLAMENTO son siempre del servidor (D06-36, T-217),
 * y el campo se recalcula con sus titulares. Sin red, `servidor` sale del
 * último paquete descargado, que es lo mejor que se sabe.
 *
 * LA SUSPENSIÓN (T-226) es la de este aparato si la tiene, y si no la del
 * servidor: quien suspendió sin red no la pierde, y quien no, se entera.
 *
 * Si no cambia nada, devuelve `local` tal cual: no provoca un repintado.
 */
export function elegirEstado(
  local: EstadoDirecto | undefined,
  servidor: EstadoDirecto,
): EstadoDirecto {
  if (local === undefined) {
    return servidor;
  }

  const partes = conciliarPartes(local.partes, servidor.partes);
  const fase = faseConciliada(local, servidor, partes);
  const suspension = local.suspension ?? servidor.suspension;
  const alDia = DEL_SERVIDOR.every((campo) => igual(local[campo], servidor[campo]));

  if (
    alDia &&
    partes === local.partes &&
    fase === local.fase &&
    igual(suspension, local.suspension)
  ) {
    return local;
  }

  if (alDia) {
    return { ...local, fase, partes, suspension };
  }

  return {
    ...local,
    fase,
    partes,
    suspension,
    titulares: servidor.titulares,
    convocados: servidor.convocados,
    posicionesIniciales: servidor.posicionesIniciales,
    periodos: servidor.periodos,
    minutosDeParte: servidor.minutosDeParte,
    titularesPedidos: servidor.titularesPedidos,
    cambiosMax: servidor.cambiosMax,
    cambiosFijos: servidor.cambiosFijos,
    tiposActivos: servidor.tiposActivos,
    diferido: servidor.diferido,
    enCampo: calcularEnCampo(servidor.titulares, local.eventos),
  };
}

/**
 * Lo que la cola de este aparato tiene de camino de los eventos del partido:
 * `pendientesDelPartido` de `sync`. Aquí solo se lee.
 */
export interface Pendientes {
  altas: ReadonlySet<string>;
  bajas: ReadonlySet<string>;
}

/**
 * Los eventos después de un refresco (T-209b, D06-38): lo del servidor manda,
 * menos lo que este aparato tiene de camino.
 *
 * - Está en el servidor y en `bajas`: no sale. Se ha deshecho aquí y su
 *   borrado no ha llegado todavía.
 * - Está en el servidor: sale con la copia del servidor —su minuto, su jugador
 *   y su estado son los buenos—, y sigue siendo propio si lo era.
 * - Solo en local y en `altas`: se queda. No ha llegado todavía, o el servidor
 *   lo rechazó y está en la banda.
 * - Solo en local y fuera de `altas`: se quita. Alguien lo borró en el servidor.
 *
 * El orden es el que tenía el aparato, con lo nuevo del servidor detrás: en
 * «Últimos eventos», lo que acaba de llegar sale arriba.
 */
function fusionarEventos(
  locales: readonly EventoDelDirecto[],
  servidor: readonly EventoDelDirecto[],
  pendientes: Pendientes,
): EventoDelDirecto[] {
  const delServidor = new Map(
    servidor
      .filter((evento) => !pendientes.bajas.has(evento.clientEventId))
      .map((evento) => [evento.clientEventId, evento]),
  );
  const vistos = new Set<string>();
  const fusionados: EventoDelDirecto[] = [];

  for (const local of locales) {
    const copia = delServidor.get(local.clientEventId);
    vistos.add(local.clientEventId);

    if (copia !== undefined) {
      fusionados.push({ ...copia, propio: local.propio });
    } else if (
      pendientes.altas.has(local.clientEventId) &&
      !pendientes.bajas.has(local.clientEventId)
    ) {
      fusionados.push(local);
    }
  }

  for (const evento of delServidor.values()) {
    if (!vistos.has(evento.clientEventId)) {
      fusionados.push(evento);
    }
  }

  return fusionados;
}

/**
 * Funde el estado de este aparato con lo que acaba de descargarse del
 * servidor (T-209b, D06-38). Lo usan el refresco del directo y la carga al
 * abrirlo, con la misma lectura de la cola: si la carga no la mirase, lo
 * deshecho aquí volvería al recargar.
 *
 * Los eventos, según `fusionarEventos`. Lo demás —la fase, las partes, la
 * convocatoria y el reglamento—, de `elegirEstado`, tal cual. El campo se
 * recalcula con los eventos fundidos.
 *
 * `pendientes` tiene que haberse leído de la cola DESPUÉS del último guardado
 * de `local`: con una lectura anterior, un evento recién apuntado no estaría
 * en `altas` y se quitaría. De eso se encarga quien llama.
 *
 * Si no cambia nada, devuelve el mismo estado: un refresco cada 20 s no
 * repinta la pantalla si no hay nada nuevo.
 */
export function fusionar(
  local: EstadoDirecto | undefined,
  servidor: EstadoDirecto,
  pendientes: Pendientes,
): EstadoDirecto {
  const elegido = elegirEstado(local, servidor);
  const eventos = fusionarEventos(
    local === undefined ? [] : local.eventos,
    servidor.eventos,
    pendientes,
  );

  if (JSON.stringify(eventos) === JSON.stringify(elegido.eventos)) {
    return elegido;
  }

  return conEventos(elegido, eventos);
}
