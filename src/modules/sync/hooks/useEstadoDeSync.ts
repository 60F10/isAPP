// Estado de la conexión y de la cola para la interfaz (T-206).

import { useEffect, useState } from 'react';

import { observarEstado } from '../api/almacen';

import type { EstadoDeCola } from '../model/cola';

const VACIA: EstadoDeCola = {
  pendientes: 0,
  fallidos: 0,
  ultimoError: null,
  rechazados: [],
};

/**
 * Si el navegador cree que hay red. Que diga que sí no garantiza que llegue
 * nada —una wifi sin salida también cuenta—, pero que diga que no es fiable.
 */
export function useEnLinea(): boolean {
  const [enLinea, setEnLinea] = useState(() => navigator.onLine);

  useEffect(() => {
    const actualizar = () => {
      setEnLinea(navigator.onLine);
    };

    window.addEventListener('online', actualizar);
    window.addEventListener('offline', actualizar);

    return () => {
      window.removeEventListener('online', actualizar);
      window.removeEventListener('offline', actualizar);
    };
  }, []);

  return enLinea;
}

/**
 * La cola de esa persona, al día con cada cambio de IndexedDB.
 *
 * Solo mientras la página se ve (D06-35, T-216): al ocultarse cancela la
 * consulta viva y al volver la abre de nuevo, que trae el estado del momento.
 * Una página oculta no toca IndexedDB.
 */
export function useEstadoDeCola(userId: string): EstadoDeCola {
  const [estado, setEstado] = useState<EstadoDeCola>(VACIA);

  useEffect(() => {
    let cancelar: (() => void) | null = null;

    const ajustar = () => {
      if (document.visibilityState === 'visible') {
        cancelar ??= observarEstado(userId, setEstado);
        return;
      }

      if (cancelar !== null) {
        cancelar();
        cancelar = null;
      }
    };

    ajustar();
    document.addEventListener('visibilitychange', ajustar);

    return () => {
      document.removeEventListener('visibilitychange', ajustar);

      if (cancelar !== null) {
        cancelar();
      }
    };
  }, [userId]);

  return estado;
}
