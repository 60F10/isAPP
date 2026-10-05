// La hora para repintar el reloj (D06-15). Solo repinta: el tiempo sale del
// ancla, así que perder vueltas con la pantalla bloqueada no retrasa nada.

import { useEffect, useState } from 'react';

const REPINTADO_MS = 250;

export function useAhora(activo: boolean): number {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    if (!activo) {
      return;
    }

    const temporizador = window.setInterval(() => {
      setAhora(Date.now());
    }, REPINTADO_MS);

    return () => {
      window.clearInterval(temporizador);
    };
  }, [activo]);

  // Parado, el reloj sale de la pausa o de la duración real y la hora no
  // cuenta: se devuelve la última, sin volver a pintar.
  return ahora;
}
