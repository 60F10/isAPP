// Cuándo se refresca el directo (T-209b, D06-38).
//
// Tres motivos, y los tres acaban en lo mismo, volver a descargar el paquete:
//
// - EL AVISO de Realtime (`api/tiempoReal`): varios seguidos son un solo
//   refresco, un segundo después del último.
// - LA RED DE SEGURIDAD: cada 20 s, por si el aviso no llega, que hoy es
//   siempre. Cuando en esta sesión de la pantalla ya ha llegado uno de
//   verdad, pasa a cada 60 s.
// - VOLVER: a la pantalla (`visibilitychange`) o a tener red (`online`).
//
// Con la pantalla oculta o sin red no se refresca. Con un refresco en marcha
// no se lanza otro: se apunta que hay uno pendiente y se hace al acabar.
//
// SI FALLA, EN SILENCIO. El directo no depende de esto.
//
// Qué hace un refresco lo decide quien usa el hook, que es quien tiene el
// estado de la pantalla. Aquí solo se decide cuándo.

import { useEffect, useRef } from 'react';

import { escucharPartido } from '../api/tiempoReal';

/** Lo que se espera desde el último aviso antes de refrescar. */
export const AGRUPAR_MS = 1_000;
/** La red de seguridad mientras no ha llegado ningún aviso por el canal. */
export const SEGURIDAD_MS = 20_000;
/** La red de seguridad cuando el canal ya ha avisado alguna vez. */
export const SEGURIDAD_CON_AVISOS_MS = 60_000;
/**
 * Lo que puede durar un refresco. Con mala cobertura una petición se queda
 * sin contestar minutos, y mientras tanto no se lanzaría ningún otro: pasado
 * este tiempo se da por perdido, deja de valer y vuelve a contar la red de
 * seguridad.
 */
export const CADUCA_MS = 15_000;

/**
 * Lo que hace un refresco. `vigente` dice si sigue siendo el que vale: deja
 * de serlo si caduca o si la pantalla se desmonta, y entonces no debe tocar
 * el estado, porque puede haber otro más nuevo ya aplicado.
 */
export type AlRefrescar = (vigente: () => boolean) => Promise<void>;

function sePuede(): boolean {
  return document.visibilityState === 'visible' && navigator.onLine;
}

/**
 * Mantiene el directo al día mientras la pantalla esté montada.
 *
 * @param alRefrescar se llama con la última que se haya pasado: puede ser una
 *   función nueva en cada pintado.
 */
export function useRefresco(partidoId: string, alRefrescar: AlRefrescar): void {
  const ultima = useRef(alRefrescar);

  useEffect(() => {
    ultima.current = alRefrescar;
  });

  useEffect(() => {
    let vivo = true;
    /** El refresco en marcha, o `null`. Un objeto por refresco: se compara por identidad. */
    let enMarcha: object | null = null;
    let pendiente = false;
    let avisado = false;
    let agrupacion: number | null = null;
    let seguridad: number | null = null;
    let caducidad: number | null = null;

    const soltarAgrupacion = () => {
      if (agrupacion !== null) {
        window.clearTimeout(agrupacion);
        agrupacion = null;
      }
    };

    const programarSeguridad = () => {
      if (seguridad !== null) {
        window.clearTimeout(seguridad);
      }

      seguridad = window.setTimeout(
        () => {
          seguridad = null;
          void refrescar();
        },
        avisado ? SEGURIDAD_CON_AVISOS_MS : SEGURIDAD_MS,
      );
    };

    /** Da por acabado un refresco, haya ido bien, mal o se haya quedado colgado. */
    const acabar = (turno: object) => {
      if (!vivo || enMarcha !== turno) {
        return;
      }

      enMarcha = null;

      if (caducidad !== null) {
        window.clearTimeout(caducidad);
        caducidad = null;
      }

      if (pendiente) {
        pendiente = false;
        void refrescar();
      } else {
        programarSeguridad();
      }
    };

    const refrescar = async () => {
      if (!vivo) {
        return;
      }

      if (!sePuede()) {
        // No se pierde: al volver a la pantalla o a tener red se refresca, y
        // la red de seguridad sigue contando.
        programarSeguridad();
        return;
      }

      if (enMarcha !== null) {
        pendiente = true;
        return;
      }

      const turno = {};
      enMarcha = turno;
      // Este refresco ya cubre los avisos que estaban esperando, y la red de
      // seguridad vuelve a contar cuando acabe.
      soltarAgrupacion();

      if (seguridad !== null) {
        window.clearTimeout(seguridad);
        seguridad = null;
      }

      caducidad = window.setTimeout(() => {
        caducidad = null;
        acabar(turno);
      }, CADUCA_MS);

      try {
        await ultima.current(() => vivo && enMarcha === turno);
      } catch {
        // En silencio: sin cobertura en el campo es lo normal.
      }

      // Si caducó, ya se dio por acabado y puede haber otro en marcha: no se toca.
      acabar(turno);
    };

    const alAvisar = () => {
      avisado = true;
      soltarAgrupacion();
      agrupacion = window.setTimeout(() => {
        agrupacion = null;
        void refrescar();
      }, AGRUPAR_MS);
    };

    const alVolver = () => {
      if (document.visibilityState === 'visible') {
        void refrescar();
      }
    };

    const alRecuperarLaRed = () => {
      void refrescar();
    };

    let dejarDeEscuchar = () => undefined as void;

    try {
      dejarDeEscuchar = escucharPartido(partidoId, alAvisar);
    } catch {
      // Sin canal queda la red de seguridad.
    }

    programarSeguridad();
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('online', alRecuperarLaRed);

    return () => {
      vivo = false;
      enMarcha = null;
      soltarAgrupacion();

      if (seguridad !== null) {
        window.clearTimeout(seguridad);
      }

      if (caducidad !== null) {
        window.clearTimeout(caducidad);
      }

      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('online', alRecuperarLaRed);

      try {
        dejarDeEscuchar();
      } catch {
        // Nada que hacer: el canal se cierra con la conexión.
      }
    };
  }, [partidoId]);
}
