// Contexto de la región viva y su hook (DOC 06 §6.3).
//
// Vive en `shared/` y no en un módulo: no es estado de dominio, la usa
// cualquier pantalla y el proveedor (`AnnounceProvider`) se queda en
// `app/providers/`, que es la composición. Mismo reparto que el contexto de
// sesión de `@modules/auth/hooks/authContext`.
//
// Separado del proveedor por el mismo motivo: componente y hook en el mismo
// archivo rompen el refresco en caliente.

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
