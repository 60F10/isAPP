// «Partido listo para usar sin conexión ✓» (DOC 06 §8.3, T-206).
//
// Si la precarga falla, lo dice aquí, antes de ir al campo, y no a los quince
// minutos de juego. Estado en texto e icono, nunca solo en color (1.4.1).
// Solo se anuncia el fallo: que todo vaya bien no merece interrumpir.

import { useEffect } from 'react';

import { useAnnounce } from '@shared/hooks/announceContext';
import { Button } from '@shared/ui/Button';
import { Icon } from '@shared/ui/Icon';

import { usePrecargaDelPartido } from '../hooks/usePrecarga';

import styles from './EstadoDePrecarga.module.css';

export function EstadoDePrecarga({ partidoId }: { partidoId: string }) {
  const anunciar = useAnnounce();
  const precarga = usePrecargaDelPartido(partidoId);

  useEffect(() => {
    if (precarga.isError) {
      anunciar('No se ha podido preparar el partido para usarlo sin conexión');
    }
  }, [precarga.isError, anunciar]);

  if (precarga.isPending) {
    return <p className={styles.nota}>Preparando el partido para usarlo sin conexión…</p>;
  }

  if (precarga.isError) {
    return (
      <div className={styles.bloque}>
        <p className={styles.fallo}>
          <Icon name="close" />
          <span>
            No se ha podido preparar el partido para usarlo sin conexión. Hazlo con cobertura antes
            de ir al campo.
          </span>
        </p>
        <div>
          <Button
            variant="secondary"
            disabled={precarga.isFetching}
            onClick={() => {
              void precarga.refetch();
            }}
          >
            {precarga.isFetching ? 'Preparando…' : 'Volver a intentarlo'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.bloque}>
      <p className={styles.lista}>
        <Icon name="check" />
        <span>Partido listo para usar sin conexión</span>
      </p>
      {precarga.data.persistente === false ? (
        <p className={styles.nota}>
          Este navegador puede borrar lo guardado si pasan unos días sin abrir la aplicación. Ábrela
          antes del partido para refrescarlo.
        </p>
      ) : null}
    </div>
  );
}
