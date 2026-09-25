// Caducidad de la sesión (DOC 02 §5.1, criterio 2.2.1 «Tiempo ajustable»).
//
// El criterio obliga a avisar antes de que caduque la sesión y a dejar al
// menos veinte segundos para ampliarla con una acción sencilla.
//
// CÓMO CADUCA DE VERDAD UNA SESIÓN DE SUPABASE, que no es lo que parece. El
// testigo de acceso dura una hora, pero el cliente lo renueva solo
// (`autoRefreshToken`) cuando le quedan unos noventa segundos. Con cobertura,
// la sesión no caduca nunca mientras la aplicación esté abierta. Solo llega a
// caducar si esa renovación falla: sin red en el campo, o con el móvil
// dormido justo en ese rato.
//
// Por eso el aviso salta con MENOS margen que la renovación automática: si
// saltara antes, la banda aparecería una vez por hora y se iría sola a los
// treinta segundos, sin que nadie hubiera hecho nada. Con sesenta segundos
// solo sale cuando la renovación automática ya ha fallado al menos una vez, y
// deja tiempo de sobra para pulsar el botón.

/** Margen del aviso. Constante configurable, no cableada en la interfaz. */
export const AVISO_CADUCIDAD_MS = 60_000;

export type FaseDeSesion = 'vigente' | 'por_caducar' | 'caducada';

/**
 * En qué punto está la sesión.
 *
 * @param expiraEnSeg `session.expires_at` de Supabase, en SEGUNDOS desde 1970.
 * @param ahoraMs `Date.now()`, en milisegundos.
 * @param avisoMs cuánto antes de caducar se avisa.
 */
export function faseDeSesion(
  expiraEnSeg: number | undefined,
  ahoraMs: number,
  avisoMs: number = AVISO_CADUCIDAD_MS,
): FaseDeSesion {
  if (expiraEnSeg === undefined) {
    return 'vigente';
  }

  const restanteMs = expiraEnSeg * 1000 - ahoraMs;

  if (restanteMs <= 0) {
    return 'caducada';
  }

  return restanteMs <= avisoMs ? 'por_caducar' : 'vigente';
}
