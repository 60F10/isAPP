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

import { descartarRechazado } from '../api/almacen';
import { sincronizarAhora } from '../api/arranque';
import { useEnLinea, useEstadoDeCola } from '../hooks/useEstadoDeSync';

import styles from './BandaDeSincronizacion.module.css';

import type { Rechazado } from '../model/cola';
import type { Entidad } from '@shared/lib/db';

// La cola no mira la fila (DOC 06 §4.2): se nombra por la tabla.
const NOMBRE_DE_ENTIDAD: Record<Entidad, string> = {
  match_event: 'Anotación',
  match_period: 'Parte del partido',
  match: 'Estado del partido',
  match_squad: 'Convocatoria',
  coverage: 'Cobertura',
};

const formatoDeHora = new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' });

function anotaciones(cuantas: number): string {
  return cuantas === 1 ? '1 anotación' : `${cuantas} anotaciones`;
}

export function BandaDeSincronizacion({ userId }: { userId: string }) {
  const anunciar = useAnnounce();
  const enLinea = useEnLinea();
  const { pendientes, fallidos, rechazados } = useEstadoDeCola(userId);
  const [enviando, setEnviando] = useState(false);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const anterior = useRef(enLinea);

  useEffect(() => {
    if (anterior.current === enLinea) {
      return;
    }

    anterior.current = enLinea;
    anunciar(enLinea ? 'Conexión recuperada' : 'Sin conexión');
  }, [enLinea, anunciar]);

  async function descartar(rechazado: Rechazado) {
    const borrado = await descartarRechazado(rechazado.id, userId);

    setConfirmando(null);

    if (borrado) {
      anunciar('Anotación descartada');
    }
  }

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
            {rechazados.length === 0 ? null : (
              <details>
                <summary className={styles.resumen}>Qué dijo el servidor</summary>
                <ul className={styles.lista}>
                  {rechazados.map((rechazado) => (
                    <li key={rechazado.id} className={styles.elemento}>
                      <p className={styles.nombre}>
                        {NOMBRE_DE_ENTIDAD[rechazado.entity]} ·{' '}
                        {formatoDeHora.format(rechazado.createdAt)}
                      </p>
                      <p className={styles.detalle}>
                        {rechazado.lastError ?? 'El servidor no dijo por qué.'}
                      </p>
                      {confirmando === rechazado.id ? (
                        <div className={styles.confirmacion}>
                          <p>¿Descartar? No se puede recuperar.</p>
                          <div className={styles.acciones}>
                            <Button
                              variant="primary"
                              onClick={() => {
                                void descartar(rechazado);
                              }}
                            >
                              Sí, descartar
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setConfirmando(null);
                              }}
                            >
                              No
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setConfirmando(rechazado.id);
                          }}
                        >
                          Descartar
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
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
