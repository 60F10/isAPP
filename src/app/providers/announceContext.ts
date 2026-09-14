// Contexto de la región viva y su hook (DOC 06 §6.3).
//
// Separado del proveedor por el mismo motivo que `authContext.ts`: componente
// y hook en el mismo archivo rompen el refresco en caliente.

import { createContext, useContext } from 'react';

/** Manda un mensaje a la región viva de la aplicación. */
export type Anunciar = (mensaje: string) => void;

export interface AnnounceApi {
  anunciar: Anunciar;
}

export const AnnounceContext = createContext<AnnounceApi | null>(null);

/**
 * Devuelve la función para anunciar. Lanza fuera de `<AnnounceProvider>`: un
 * anuncio que se pierde en silencio es peor que un fallo ruidoso, porque solo
 * se nota con un lector de pantalla puesto.
 */
export function useAnnounce(): Anunciar {
  const api = useContext(AnnounceContext);

  if (api === null) {
    throw new Error('useAnnounce() se ha usado fuera de <AnnounceProvider>.');
  }

  return api.anunciar;
}
