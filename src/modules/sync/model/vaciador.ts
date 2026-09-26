// El vaciado de la cola (DOC 06 §8.5, T-206).
//
// Sin Dexie ni Supabase: el almacén y el transporte entran como argumento, y
// así se prueba con un almacén en memoria. `api/arranque.ts` le pasa los de
// verdad y se encarga del cerrojo entre pestañas.
//
// Vuelta a vuelta: elige el primero listo de cada partido, lo marca como
// «enviándose», lo manda y guarda lo que haya pasado. Sigue hasta que no queda
// nada listo: lo aplazado espera a su hora, lo fallido se queda quieto.

import { aplicarDecision, clasificar, elegirListos } from './cola';

import type { ResultadoDeEnvio } from './cola';
import type { Trabajo } from '@shared/lib/db';

export interface Almacen {
  /** Los de esa persona que siguen por enviar: `pending` y `sending`. */
  pendientes: (userId: string) => Promise<Trabajo[]>;
  guardar: (trabajo: Trabajo) => Promise<void>;
}

export interface OpcionesDeVaciado {
  almacen: Almacen;
  enviar: (trabajo: Trabajo) => Promise<ResultadoDeEnvio>;
  /** La persona con la sesión abierta. Solo se envía lo suyo. */
  userId: string;
  ahora: () => number;
  azar: () => number;
}

export interface ResumenDeVaciado {
  enviados: number;
  aplazados: number;
  /** Los que el servidor rechazó en esta vuelta, para registrarlos. */
  fallidos: Trabajo[];
}

/** Tope de vueltas: una cola sana acaba mucho antes. Es un seguro, no una regla. */
const VUELTAS_MAXIMAS = 1_000;

function mensajeDe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function vaciar(opciones: OpcionesDeVaciado): Promise<ResumenDeVaciado> {
  const { almacen, enviar, userId, ahora, azar } = opciones;
  const resumen: ResumenDeVaciado = { enviados: 0, aplazados: 0, fallidos: [] };

  for (let vuelta = 0; vuelta < VUELTAS_MAXIMAS; vuelta += 1) {
    const listos = elegirListos(await almacen.pendientes(userId), ahora());

    if (listos.length === 0) {
      break;
    }

    for (const trabajo of listos) {
      const enviandose: Trabajo = { ...trabajo, status: 'sending' };
      await almacen.guardar(enviandose);

      let resultado: ResultadoDeEnvio;

      try {
        resultado = await enviar(enviandose);
      } catch (error) {
        // El transporte no debería lanzar, pero si lo hace no se pierde nada:
        // se trata como un envío sin respuesta y se reintenta.
        resultado = { ok: false, status: 0, code: null, mensaje: mensajeDe(error) };
      }

      const decision = clasificar(resultado, trabajo.op);
      const despues = aplicarDecision(enviandose, decision, resultado, ahora(), azar());
      await almacen.guardar(despues);

      if (decision === 'exito') {
        resumen.enviados += 1;
      } else if (decision === 'reintentar') {
        resumen.aplazados += 1;
      } else {
        resumen.fallidos.push(despues);
      }
    }
  }

  return resumen;
}
