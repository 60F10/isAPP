// El foco, al mensaje de error cuando aparece (2.4.3).
//
// Nace en la A07 (T-306) y se muda aquí en la T-235, cuando lo necesitan
// también «Unirse a un equipo» y Ajustes.
//
// POR QUÉ HACE FALTA. El botón que lanza la petición se desactiva mientras
// dura, y un botón desactivado suelta el foco: en Chromium `activeElement`
// pasa a `body` y no vuelve al reactivarse. Quien va con teclado o con lector
// de pantalla se queda sin sitio justo cuando algo ha salido mal.

import { useEffect, useRef } from 'react';

import type { RefObject } from 'react';

/**
 * Devuelve el `ref` del elemento del mensaje, que tiene que llevar
 * `tabIndex={-1}`. El foco va a él cada vez que `fallo` deja de ser `null`.
 */
export function useFocoAlFallar<T extends HTMLElement>(fallo: string | null): RefObject<T | null> {
  const mensaje = useRef<T>(null);

  useEffect(() => {
    if (fallo !== null) {
      mensaje.current?.focus();
    }
  }, [fallo]);

  return mensaje;
}
