// Pantalla C04 — Sin conexión (T-206, E9-07, E8-14). Estado, no ruta.
//
// Una banda del marco, como el aviso de sesión: sin `position: fixed`, así
// que no tapa nunca el control con el foco (criterio 2.4.11). Sale en tres
// casos y se calla en el resto:
//
//   - Sin red: lo dice, y cuánto hay guardado esperando.
//   - Con red y trabajos por enviar: cuántos, y «Sincronizar ahora».
//   - Con trabajos rechazados: cuántos, y lo que dijo el servidor, plegado.
//
// Los números van en palabras y el estado en texto, nunca solo en color
// (1.4.1). Solo se anuncia el cambio de conexión, no cada cambio de la cuenta:
// cuatro anotadores a la vez harían de la región viva un contador.

import { useEffect, useRef, useState } from 'react';

import { useAnnounce } from '@shared/hooks/announceContext';
import { Button } from '@shared/ui/Button';
import { Icon } from '@shared/ui/Icon';

import { sincronizarAhora } from '../api/arranque';
import { useEnLinea, useEstadoDeCola } from '../hooks/useEstadoDeSync';

import styles from './BandaDeSincronizacion.module.css';

function anotaciones(cuantas: number): string {
  return cuantas === 1 ? '1 anotación' : `${cuantas} anotaciones`;
}

export function BandaDeSincronizacion({ userId }: { userId: string }) {
  const anunciar = useAnnounce();
  const enLinea = useEnLinea();
  const { pendientes, fallidos, ultimoError } = useEstadoDeCola(userId);
  const [enviando, setEnviando] = useState(false);
  const anterior = useRef(enLinea);

  useEffect(() => {
    if (anterior.current === enLinea) {
      return;
    }

    anterior.current = enLinea;
    anunciar(enLinea ? 'Conexión recuperada' : 'Sin conexión');
  }, [enLinea, anunciar]);

  if (enLinea && pendientes === 0 && fallidos === 0) {
    return null;
  }

  const titular = !enLinea
    ? 'Sin conexión'
    : pendientes > 0
      ? `${anotaciones(pendientes)} por enviar`
      : `${anotaciones(fallidos)} sin guardar`;

  return (
    <div className={[styles.banda, fallidos > 0 ? styles.conFallos : ''].filter(Boolean).join(' ')}>
      <div className={styles.texto}>
        <p className={styles.titular}>
          <Icon name="sync" />
          <span>{titular}</span>
        </p>
        {!enLinea ? (
          <p>
            {pendientes > 0
              ? `${anotaciones(pendientes)} guardada${pendientes === 1 ? '' : 's'} en este dispositivo. Se envían solas al volver la cobertura.`
              : 'Lo que anotes en el directo se guarda en este dispositivo y se envía al volver la cobertura. Las demás pantallas necesitan red para guardar.'}
          </p>
        ) : null}
        {fallidos > 0 ? (
          <>
            <p className={styles.fallo}>
              El servidor ha rechazado {anotaciones(fallidos)} y no se van a reintentar.
            </p>
            {ultimoError === null ? null : (
              <details>
                <summary className={styles.resumen}>Qué dijo el servidor</summary>
                <p className={styles.detalle}>{ultimoError}</p>
              </details>
            )}
          </>
        ) : null}
      </div>
      {enLinea && pendientes > 0 ? (
        <Button
          variant="primary"
          disabled={enviando}
          onClick={() => {
            setEnviando(true);
            void sincronizarAhora().finally(() => {
              setEnviando(false);
            });
          }}
        >
          {enviando ? 'Sincronizando…' : 'Sincronizar ahora'}
        </Button>
      ) : null}
    </div>
  );
}
