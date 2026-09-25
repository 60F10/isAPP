// Aviso de sesión a punto de caducar (T-106, DOC 02 §5.1, criterio 2.2.1).
//
// Cuándo sale y cuándo no está explicado en `modules/auth/model/caducidad.ts`.
// En corto: solo si la renovación automática de Supabase ya ha fallado, que en
// la práctica es falta de cobertura. Con red, esta banda no se ve nunca.
//
// Caducar no cierra la sesión ni borra nada: la sesión se queda guardada y se
// renueva sola en cuanto vuelve la red. Lo que sí pasa es que, mientras tanto,
// el servidor rechaza cualquier escritura. De eso avisa la banda.
//
// Mismo reparto que `ActualizacionDisponible`: interfaz normal, sin región
// viva propia, y un anuncio por la región única cuando aparece.

import { useEffect, useState } from 'react';

// Rutas directas y no el barril `@modules/auth`: mismo motivo que en
// `AuthProvider` y en las guardias (DOC 13, hallazgo 3).
import { renovarSesion } from '@modules/auth/api/session';
import { useAuth } from '@modules/auth/hooks/authContext';
import { faseDeSesion } from '@modules/auth/model/caducidad';
import { useAnnounce } from '@shared/hooks/announceContext';
import { Button } from '@shared/ui/Button';

import styles from './AvisoSesion.module.css';

/** Cada cuánto se mira el reloj. El margen del aviso cubre este intervalo. */
const INTERVALO_MS = 15_000;

export function AvisoSesion() {
  const { session } = useAuth();
  const anunciar = useAnnounce();
  const [ahora, setAhora] = useState(() => Date.now());
  const [renovando, setRenovando] = useState(false);
  // Se guarda la caducidad de la sesión que no se pudo renovar, no un «falló»
  // a secas: en cuanto llega una sesión nueva el aviso de fallo sobra solo,
  // sin un efecto que lo borre.
  const [falloCon, setFalloCon] = useState<number | null>(null);

  const expiraEn = session === null ? undefined : session.expires_at;

  useEffect(() => {
    if (expiraEn === undefined) {
      return;
    }

    const temporizador = window.setInterval(() => {
      setAhora(Date.now());
    }, INTERVALO_MS);

    // El móvil bloqueado congela los temporizadores. Al desbloquear se mira el
    // reloj en el acto, sin esperar a la siguiente vuelta.
    const alVolver = () => {
      if (document.visibilityState === 'visible') {
        setAhora(Date.now());
      }
    };

    document.addEventListener('visibilitychange', alVolver);

    return () => {
      window.clearInterval(temporizador);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [expiraEn]);

  const fase = faseDeSesion(expiraEn, ahora);

  // Una vez por cambio de fase, no en cada vuelta del reloj.
  useEffect(() => {
    if (fase === 'por_caducar') {
      anunciar('Tu sesión caduca en menos de un minuto');
    } else if (fase === 'caducada') {
      anunciar('Tu sesión ha caducado');
    }
  }, [fase, anunciar]);

  if (fase === 'vigente' || expiraEn === undefined) {
    return null;
  }

  const fallo = falloCon === expiraEn;

  const renovar = async () => {
    setRenovando(true);

    try {
      await renovarSesion();
      anunciar('Sesión renovada');
    } catch {
      setFalloCon(expiraEn);
      anunciar('No se ha podido renovar la sesión');
    } finally {
      setRenovando(false);
    }
  };

  return (
    <div className={styles.banda}>
      <div className={styles.texto}>
        <p className={styles.titular}>
          {fase === 'por_caducar'
            ? 'Tu sesión caduca en menos de un minuto'
            : 'Tu sesión ha caducado'}
        </p>
        <p>
          {fallo
            ? 'No se ha podido renovar, seguramente por falta de cobertura. Se renovará sola al volver la señal.'
            : 'Mientras no se renueve, no se guardará nada nuevo.'}
        </p>
      </div>
      <Button
        variant="primary"
        disabled={renovando}
        onClick={() => {
          void renovar();
        }}
      >
        {renovando ? 'Renovando…' : 'Seguir conectado'}
      </Button>
    </div>
  );
}
