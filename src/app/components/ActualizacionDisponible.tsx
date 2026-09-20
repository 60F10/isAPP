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

import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { useAnnounce } from '@shared/hooks/announceContext';
import { Button } from '@shared/ui/Button';

import styles from './ActualizacionDisponible.module.css';

export function ActualizacionDisponible() {
  const anunciar = useAnnounce();
  const {
    needRefresh: [hayVersionNueva, setHayVersionNueva],
    updateServiceWorker,
  } = useRegisterSW();

  // Una vez, al aparecer, no en cada render: la dependencia es el propio
  // estado, así que solo dispara en el cambio de falso a cierto. `anunciar`
  // es estable —sale de un `useMemo` sin dependencias— y no vuelve a lanzarlo.
  useEffect(() => {
    if (hayVersionNueva) {
      anunciar('Hay una versión nueva disponible');
    }
  }, [hayVersionNueva, anunciar]);

  // PUNTO DE ENGANCHE DE LA T-207. La D06-14 dice que, con un partido en
  // curso, el aviso se guarda y no se enseña hasta que el partido acabe. Hoy
  // no existe el estado de partido, así que el aviso sale siempre, también en
  // mitad del directo: es la deuda que deja esta tarea. Cuando la T-207 cree
  // ese estado, esto pasa a ser
  //     if (!hayVersionNueva || partidoEnCurso) return null;
  // y no hace falta nada más: `needRefresh` se queda a cierto por su cuenta y
  // la banda aparece sola al terminar el partido.
  if (!hayVersionNueva) {
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
