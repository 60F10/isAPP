// Estado de la conexión y de la cola para la interfaz (T-206).

import { useEffect, useState } from 'react';

import { observarEstado } from '../api/almacen';

import type { EstadoDeCola } from '../model/cola';

const VACIA: EstadoDeCola = { pendientes: 0, fallidos: 0, ultimoError: null };

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

/** La cola de esa persona, al día con cada cambio de IndexedDB. */
export function useEstadoDeCola(userId: string): EstadoDeCola {
  const [estado, setEstado] = useState<EstadoDeCola>(VACIA);

  useEffect(() => observarEstado(userId, setEstado), [userId]);

  return estado;
}
