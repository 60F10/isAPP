// Banda «Partido en directo · 34:12 · Volver» (DOC 02 §3.1, T-225).
//
// Con un partido en curso en este aparato, quien sale del directo a mirar
// otra pantalla ve por dónde va el reloj y vuelve con un toque. La pinta
// `AppLayout`; el directo usa `FullScreenLayout` y por eso no la ve.
//
// SOLO LEE `localStorage` (D06-40). El reloj sale de la marca de
// `shared/lib/partidoEnCurso.ts`, que escribe la A12, y no de IndexedDB: esto
// va en el paquete inicial, y ahí no entran ni Dexie, ni `@modules/sync`, ni
// `@modules/match` (D06-26).
//
// Sin `aria-live` ni `role="timer"`: un reloj en una región viva se anuncia
// cada segundo. Tampoco se anuncia al aparecer: quien la ve acaba de salir
// del directo por su propio pie.

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router';

import { useAhora } from '@shared/hooks/useAhora';
import {
  leerMarcaEnCurso,
  suscribirPartidoEnCurso,
  textoDePartidoEnCurso,
} from '@shared/lib/partidoEnCurso';
import { formatoReloj, segundosDesde } from '@shared/lib/reloj';

import styles from './PartidoEnCurso.module.css';

/**
 * Cada cuánto se vuelve a mirar si la marca ha caducado. Con el reloj
 * corriendo la banda ya se repinta sola; en pausa y en el descanso no hay
 * nada que la mueva, y un partido abandonado dejaría la banda puesta hasta la
 * próxima recarga. La caducidad son cuatro horas: un minuto de más no importa.
 */
const REVISION_MS = 60_000;

export function PartidoEnCurso() {
  // La instantánea es el texto crudo de la marca, que es el mismo valor
  // mientras no cambie. Un objeto recién interpretado sería uno nuevo en cada
  // lectura y `useSyncExternalStore` repintaría sin fin.
  const texto = useSyncExternalStore(suscribirPartidoEnCurso, textoDePartidoEnCurso);
  const [revisada, setRevisada] = useState(() => Date.now());

  // La caducidad se mira contra la hora de la última revisión. Si se queda
  // vieja, lo único que pasa es que una marca tarda hasta un minuto de más en
  // darse por caducada.
  const marca = texto === null ? null : leerMarcaEnCurso(revisada);
  const hayMarca = marca !== null;
  const reloj = marca?.reloj ?? null;
  const corriendo = reloj !== null && reloj.pausaDesde === null;
  // Solo repinta con el reloj en marcha: en pausa la cuenta sale del instante
  // en que se paró, y en el descanso no hay cuenta.
  const ahora = useAhora(corriendo);

  useEffect(() => {
    if (!hayMarca) {
      return;
    }

    const temporizador = window.setInterval(() => {
      setRevisada(Date.now());
    }, REVISION_MS);

    return () => {
      window.clearInterval(temporizador);
    };
  }, [hayMarca]);

  if (marca === null) {
    return null;
  }

  // «Descanso» es «no hay parte abierta»: entre partes, y también con todas
  // jugadas y el partido sin finalizar.
  const momento =
    reloj === null
      ? 'Descanso'
      : `${formatoReloj(segundosDesde(reloj, ahora))}${corriendo ? '' : ' · En pausa'}`;

  return (
    <section className={styles.banda} aria-label="Partido en directo">
      <p className={styles.texto}>{`Partido en directo · ${momento}`}</p>
      {/* El nombre accesible empieza por lo que se lee en pantalla (criterio
          2.5.3): «Volver» a secas no dice adónde a quien no ve la banda. */}
      <Link
        className={styles.volver}
        to={`/partidos/${encodeURIComponent(marca.partidoId)}/directo`}
        aria-label="Volver al partido en directo"
      >
        Volver
      </Link>
    </section>
  );
}
