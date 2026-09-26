// Pantalla encendida mientras dure el partido (D06-16, T-207).
//
// El móvil se apaga solo cada dos minutos, y desbloquearlo antes de cada gol
// destruye la premisa del directo. El bloqueo se pierde al cambiar de
// aplicación o al ocultarse la pestaña, así que se vuelve a pedir cuando la
// pestaña recupera la visibilidad.

import { useEffect, useState } from 'react';

export type EstadoDelBloqueo = 'inactivo' | 'activo' | 'no_disponible' | 'denegado';

export function useBloqueoDePantalla(activo: boolean): EstadoDelBloqueo {
  // Solo lo que dice el navegador al pedirlo. Lo demás se deriva al pintar.
  const [concedido, setConcedido] = useState<boolean | null>(null);
  const disponible = 'wakeLock' in navigator;

  useEffect(() => {
    if (!activo || !disponible) {
      return;
    }

    let cancelado = false;
    let bloqueo: WakeLockSentinel | null = null;

    const pedir = async () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      try {
        const nuevo = await navigator.wakeLock.request('screen');

        if (cancelado) {
          await nuevo.release();
          return;
        }

        bloqueo = nuevo;
        setConcedido(true);
      } catch {
        // Batería baja o permiso denegado: se sigue sin bloqueo y se dice.
        if (!cancelado) {
          setConcedido(false);
        }
      }
    };

    const alVolver = () => {
      void pedir();
    };

    void pedir();
    document.addEventListener('visibilitychange', alVolver);

    return () => {
      cancelado = true;
      document.removeEventListener('visibilitychange', alVolver);

      if (bloqueo !== null) {
        void bloqueo.release();
      }
    };
  }, [activo, disponible]);

  if (!activo) {
    return 'inactivo';
  }

  if (!disponible) {
    return 'no_disponible';
  }

  return concedido === false ? 'denegado' : concedido === true ? 'activo' : 'inactivo';
}
