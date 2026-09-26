// Aviso de versión nueva (decisión D06-14).
//
// El service worker se registra en modo 'prompt': la versión nueva se queda
// esperando y no se releva sola. Esta banda es quien le da la orden.
//
// Sin `aria-live` ni `role="status"` propios. La región viva de la aplicación
// es una sola y la pone `AnnounceProvider` (DOC 06 §6.3). Esto no es un
// mensaje de estado, es interfaz que se queda en pantalla hasta que alguien
// decide: se marca como interfaz normal y el anuncio se manda una sola vez
// por la región de siempre.

import { useEffect, useSyncExternalStore } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { useAnnounce } from '@shared/hooks/announceContext';
import { leerPartidoEnCurso, suscribirPartidoEnCurso } from '@shared/lib/partidoEnCurso';
import { Button } from '@shared/ui/Button';

import styles from './ActualizacionDisponible.module.css';

export function ActualizacionDisponible() {
  const anunciar = useAnnounce();
  const {
    needRefresh: [hayVersionNueva, setHayVersionNueva],
    updateServiceWorker,
  } = useRegisterSW();
  const partidoEnCurso = useSyncExternalStore(
    suscribirPartidoEnCurso,
    () => leerPartidoEnCurso(Date.now()) !== null,
  );

  // Una vez, al aparecer, no en cada render: la dependencia es el propio
  // estado, así que solo dispara en el cambio de falso a cierto. `anunciar`
  // es estable —sale de un `useMemo` sin dependencias— y no vuelve a lanzarlo.
  useEffect(() => {
    if (hayVersionNueva && !partidoEnCurso) {
      anunciar('Hay una versión nueva disponible');
    }
  }, [hayVersionNueva, partidoEnCurso, anunciar]);

  // D06-14: con un partido en curso en este dispositivo, el aviso se guarda
  // y no se enseña. `needRefresh` se queda a cierto por su cuenta y la banda
  // aparece sola cuando la A12 quita la marca al finalizar (T-207).
  if (!hayVersionNueva || partidoEnCurso) {
    return null;
  }

  return (
    <div className={styles.banda}>
      <p className={styles.texto}>Hay una versión nueva</p>
      <div className={styles.acciones}>
        {/* `true` recarga la pestaña en cuanto el service worker nuevo toma el
            control. Aquí sí se recarga, porque lo acaba de pedir una persona. */}
        <Button
          variant="primary"
          onClick={() => {
            void updateServiceWorker(true);
          }}
        >
          Actualizar
        </Button>
        {/* Cerrar no descarta la versión: el service worker sigue esperando y
            entra en la próxima carga. Solo quita la banda de en medio. */}
        <Button
          variant="secondary"
          onClick={() => {
            setHayVersionNueva(false);
          }}
        >
          Ahora no
        </Button>
      </div>
    </div>
  );
}
