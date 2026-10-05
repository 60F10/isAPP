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
//
// EL FOCO NO SE QUEDA EN `body` (T-221, criterio 2.4.3). «Descartar» y su
// confirmación se sustituyen el uno al otro, y lo descartado se va de la
// lista: cada vez que se desmonta lo que tenía el foco, se dice a dónde va.
// A la pregunta al abrirla; al «Descartar» de ese elemento con «No»; y tras
// descartar, al del siguiente, al del anterior, al titular de la banda o, si
// la banda se va, al `h1` de la pantalla.

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
// Con segundos, para el nombre de cada «Descartar»: dos anotaciones rechazadas
// en el mismo minuto no pueden llamarse igual (T-221, criterio 2.4.6).
const formatoDeHoraExacta = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'short',
  timeStyle: 'medium',
});

const NO_SE_HA_PODIDO = 'No se ha podido descartar. Vuelve a intentarlo.';
const YA_NO_ESTABA = 'Eso ya no estaba en la lista.';

/** A dónde va el foco en el siguiente pintado. */
type Destino = { a: 'pregunta' } | { a: 'descartar'; id: string } | { a: 'titular' };

/** El nombre de «Descartar» y de su confirmación: empieza por lo que se lee (2.5.3). */
function nombreDeDescartar(rechazado: Rechazado): string {
  return `Descartar: ${NOMBRE_DE_ENTIDAD[rechazado.entity]} · ${formatoDeHoraExacta.format(rechazado.createdAt)}`;
}

/** El elemento que hereda el foco al irse otro: el siguiente y, si no hay, el anterior. */
function vecinoDe(lista: readonly Rechazado[], id: string): Rechazado | undefined {
  const lugar = lista.findIndex((otro) => otro.id === id);

  if (lugar === -1) {
    return undefined;
  }

  return lista.at(lugar + 1) ?? (lugar > 0 ? lista.at(lugar - 1) : undefined);
}

function anotaciones(cuantas: number): string {
  return cuantas === 1 ? '1 anotación' : `${cuantas} anotaciones`;
}

export function BandaDeSincronizacion({ userId }: { userId: string }) {
  const anunciar = useAnnounce();
  const enLinea = useEnLinea();
  const { pendientes, fallidos, rechazados } = useEstadoDeCola(userId);
  const [enviando, setEnviando] = useState(false);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  // El último intento de descartar falló en este dispositivo: se dice dentro
  // de la confirmación, que sigue abierta.
  const [fallo, setFallo] = useState(false);
  const descartando = useRef(false);
  const anterior = useRef(enLinea);
  const raiz = useRef<HTMLDivElement>(null);
  const refTitular = useRef<HTMLParagraphElement>(null);
  const pregunta = useRef<HTMLParagraphElement>(null);
  const destino = useRef<Destino | null>(null);
  // Se ha descartado el último y el foco se quedó en el titular: si la banda
  // se va, se lo lleva, y hay que devolverlo a la pantalla.
  const devolverALaPantalla = useRef(false);
  const visible = !(enLinea && pendientes === 0 && fallidos === 0);

  useEffect(() => {
    if (anterior.current === enLinea) {
      return;
    }

    anterior.current = enLinea;
    anunciar(enLinea ? 'Conexión recuperada' : 'Sin conexión');
  }, [enLinea, anunciar]);

  // Mueve el foco a donde se haya dicho, después de pintar. Sin dependencias a
  // propósito: el destino se apunta en un `ref` justo antes de cambiar el
  // estado, y esto lo recoge en el pintado que sigue, sea el que sea.
  useEffect(() => {
    if (!visible) {
      // Solo si la banda se ha ido con el foco dentro, que entonces cae en
      // `body`: quien ya está en otra cosa no pierde su sitio.
      const activo = document.activeElement;

      if (devolverALaPantalla.current && (activo === null || activo === document.body)) {
        document.querySelector('h1')?.focus();
      }

      devolverALaPantalla.current = false;
      destino.current = null;
      return;
    }

    const pendiente = destino.current;

    if (pendiente === null) {
      return;
    }

    destino.current = null;

    if (pendiente.a === 'pregunta') {
      pregunta.current?.focus();
      return;
    }

    if (pendiente.a === 'descartar') {
      const elemento = Array.from(
        raiz.current?.querySelectorAll<HTMLElement>('[data-rechazado]') ?? [],
      ).find((nodo) => nodo.dataset.rechazado === pendiente.id);
      const boton = elemento?.querySelector('button');

      if (boton !== null && boton !== undefined) {
        boton.focus();
        return;
      }
    }

    // El titular, o el elemento que ya no está: la banda sigue ahí.
    refTitular.current?.focus();
  });

  function abrirConfirmacion(id: string) {
    destino.current = { a: 'pregunta' };
    setFallo(false);
    setConfirmando(id);
  }

  function cerrarConfirmacion(id: string) {
    destino.current = { a: 'descartar', id };
    setFallo(false);
    setConfirmando(null);
  }

  async function descartar(rechazado: Rechazado) {
    // Un segundo toque mientras se borra no es otro descarte.
    if (descartando.current) {
      return;
    }

    descartando.current = true;
    setFallo(false);

    let borrado: boolean;

    try {
      borrado = await descartarRechazado(rechazado.id, userId);
    } catch {
      // Dexie no ha podido: sigue en la cola, y la confirmación abierta para
      // reintentar. El foco no se mueve: está en «Sí, descartar».
      setFallo(true);
      anunciar(NO_SE_HA_PODIDO);
      return;
    } finally {
      descartando.current = false;
    }

    // Borrado o ya no estaba: en los dos casos se va de la lista, y el foco
    // con él si no se le dice a dónde.
    const vecino = vecinoDe(rechazados, rechazado.id);

    destino.current = vecino === undefined ? { a: 'titular' } : { a: 'descartar', id: vecino.id };
    devolverALaPantalla.current = vecino === undefined;
    setConfirmando(null);
    anunciar(borrado ? `Descartado: ${NOMBRE_DE_ENTIDAD[rechazado.entity]}` : YA_NO_ESTABA);
  }

  if (!visible) {
    return null;
  }

  const titular = !enLinea
    ? 'Sin conexión'
    : pendientes > 0
      ? `${anotaciones(pendientes)} por enviar`
      : `${anotaciones(fallidos)} sin guardar`;

  return (
    <div
      ref={raiz}
      className={[styles.banda, fallidos > 0 ? styles.conFallos : ''].filter(Boolean).join(' ')}
    >
      <div className={styles.texto}>
        <p ref={refTitular} className={styles.titular} tabIndex={-1}>
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
                    <li
                      key={rechazado.id}
                      className={styles.elemento}
                      data-rechazado={rechazado.id}
                    >
                      <p className={styles.nombre}>
                        {NOMBRE_DE_ENTIDAD[rechazado.entity]} ·{' '}
                        {formatoDeHora.format(rechazado.createdAt)}
                      </p>
                      <p className={styles.detalle}>
                        {rechazado.lastError ?? 'El servidor no dijo por qué.'}
                      </p>
                      {confirmando === rechazado.id ? (
                        // «Sí, descartar» y «No» no dicen de qué: lo dice el grupo.
                        // `fieldset` es el `role="group"` de HTML, y no choca
                        // con la regla `prefer-tag-over-role` de oxlint.
                        <fieldset
                          aria-label={nombreDeDescartar(rechazado)}
                          className={styles.confirmacion}
                        >
                          <p ref={pregunta} className={styles.pregunta} tabIndex={-1}>
                            ¿Descartar? No se puede recuperar.
                          </p>
                          {fallo ? <p className={styles.fallo}>{NO_SE_HA_PODIDO}</p> : null}
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
                                cerrarConfirmacion(rechazado.id);
                              }}
                            >
                              No
                            </Button>
                          </div>
                        </fieldset>
                      ) : (
                        <Button
                          variant="secondary"
                          aria-label={nombreDeDescartar(rechazado)}
                          onClick={() => {
                            abrirConfirmacion(rechazado.id);
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
