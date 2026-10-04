// Tarjeta «Eventos» de la A13 (T-210b, DOC 04 §8.2, §8.4 y §9).
//
// Todos los eventos del partido sin cerrar, también los descartados, en orden
// de parte y segundo. Quien tiene `event.approve` aprueba, descarta, recupera
// y cambia el minuto de cada uno, y aprueba en bloque los pendientes (C-01).
// Sin el permiso, la lista se ve y no ofrece nada. La lógica vive en
// `model/discordancias.ts`; aquí solo se pinta.
//
// LOS POSIBLES REPETIDOS se buscan una vez, al abrir, con
// `flag_duplicate_candidates`. Salen juntos y marcados; nada se fusiona solo
// (DOC 04 §9.2): se descarta el que sobre.
//
// EN LÍNEA, no por la cola: sin cobertura, nada de esto se guarda, y se dice.
//
// EL FOCO. Al aprobar o descartar, el botón que se pulsó desaparece: el foco
// va a la descripción de su evento, salga bien o mal, que es donde se lee el
// estado nuevo. Tras aprobar en bloque, al resumen. Una sola región viva, la
// de `useAnnounce`.

import { useIsFetching } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { useHasPermission } from '@modules/auth';
import { useAnnounce } from '@shared/hooks/announceContext';
import { mensajeDeErrorAlGuardar, SIN_FILAS } from '@shared/lib/guardado';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { StatusChip } from '@shared/ui/StatusChip';

import { EVENTO_CAMBIADO } from '../api/discordancias';
import { reviewKeys } from '../api/queryKeys';
import {
  useAprobarPendientes,
  useAutores,
  useCambiarMinuto,
  useMarcarRepetidos,
  useResolverEvento,
} from '../hooks/useCierre';
import { contarEventos } from '../model/cierre';
import {
  accionesDe,
  agruparRepetidos,
  EVENTO_YA_NO_SE_PUEDE_CAMBIAR,
  ordenar,
} from '../model/discordancias';

import { MinutoDelEvento } from './MinutoDelEvento';

import styles from './PanelDeEventos.module.css';

import type { PartidoDelCierre } from '../model/cierre';
import type { AccionDeEvento, EventoRevisable } from '../model/discordancias';

type Estado = EventoRevisable['estado'];

/** A qué estado lleva cada acción que lo cambia, y cómo se cuenta al terminar. */
const RESOLUCIONES: Record<
  Exclude<AccionDeEvento, 'minuto'>,
  { texto: string; a: Estado; hecho: string }
> = {
  aprobar: { texto: 'Aprobar', a: 'approved', hecho: 'Evento aprobado.' },
  descartar: { texto: 'Descartar', a: 'rejected', hecho: 'Evento descartado: ya no cuenta.' },
  recuperar: { texto: 'Recuperar', a: 'approved', hecho: 'Evento recuperado: vuelve a contar.' },
};

function mensajeDeRevision(error: Error): string {
  if (error.message === EVENTO_CAMBIADO) {
    return 'Ese evento ha cambiado: vuelve a mirar.';
  }

  if (error.message === SIN_FILAS) {
    return EVENTO_YA_NO_SE_PUEDE_CAMBIAR;
  }

  return mensajeDeErrorAlGuardar(error);
}

interface PanelDeEventosProps {
  partido: Pick<PartidoDelCierre, 'id' | 'periodos' | 'minutosDeParte'>;
  eventos: readonly EventoRevisable[];
  /** Del jugador solo dorsal y apodo: lo pone la página desde la convocatoria. */
  describir: (evento: EventoRevisable) => string;
}

export function PanelDeEventos({ partido, eventos, describir }: PanelDeEventosProps) {
  const anunciar = useAnnounce();
  const puedeAprobar = useHasPermission('event.approve') === true;
  const marcar = useMarcarRepetidos();
  const resolver = useResolverEvento(partido.id);
  const aprobarTodos = useAprobarPendientes(partido.id);
  const minuto = useCambiarMinuto(partido.id);
  const autores = useAutores([...new Set(eventos.map((evento) => evento.autorId))].sort());
  const refrescando = useIsFetching({ queryKey: reviewKeys.cierre(partido.id) }) > 0;
  const refResumen = useRef<HTMLParagraphElement>(null);
  const refDescripciones = useRef(new Map<string, HTMLParagraphElement>());
  const [editando, setEditando] = useState<string | null>(null);
  /** El último fallo, y de qué evento: `null` si fue al aprobar en bloque. */
  const [fallo, setFallo] = useState<{ id: string | null; mensaje: string } | null>(null);

  // Una vez por partido y por montaje, y solo quien puede: la función exige
  // `event.approve`. Si los permisos se recargan, no se vuelve a llamar.
  const { mutate: buscarRepetidos } = marcar;
  const yaBuscado = useRef<string | null>(null);
  useEffect(() => {
    if (puedeAprobar && yaBuscado.current !== partido.id) {
      yaBuscado.current = partido.id;
      buscarRepetidos(partido.id);
    }
  }, [puedeAprobar, buscarRepetidos, partido.id]);

  const bloques = agruparRepetidos(ordenar(eventos));
  const { pendientes, descartados } = contarEventos(eventos);
  const hayRepetidos = bloques.some((bloque) => bloque.grupo !== null);
  // Mientras la lista se vuelve a pedir, lo que se ve puede no ser lo que hay:
  // un segundo toque sobre el mismo evento chocaría con el primero.
  const ocupado = resolver.isPending || aprobarTodos.isPending || minuto.isPending || refrescando;

  const enfocar = (id: string) => {
    refDescripciones.current.get(id)?.focus();
  };

  const falla = (id: string | null, error: Error) => {
    const mensaje = mensajeDeRevision(error);

    setFallo({ id, mensaje });
    anunciar(mensaje);
  };

  const resolverUno = (evento: EventoRevisable, accion: Exclude<AccionDeEvento, 'minuto'>) => {
    const { a, hecho } = RESOLUCIONES[accion];

    setFallo(null);
    resolver.mutate(
      { id: evento.id, de: evento.estado, a },
      {
        onSuccess: () => {
          anunciar(hecho);
        },
        onError: (error) => {
          falla(evento.id, error);
        },
        onSettled: () => {
          enfocar(evento.id);
        },
      },
    );
  };

  const aprobarLosPendientes = () => {
    setFallo(null);
    aprobarTodos.mutate(
      pendientes.map((evento) => evento.id),
      {
        onSuccess: ({ pedidos, aprobados }) => {
          if (aprobados < pedidos) {
            const mensaje = `Aprobados ${String(aprobados)} de ${String(pedidos)}. Los demás habían cambiado: vuelve a mirar.`;

            setFallo({ id: null, mensaje });
            anunciar(mensaje);
            return;
          }

          anunciar(
            aprobados === 1 ? '1 evento aprobado.' : `${String(aprobados)} eventos aprobados.`,
          );
        },
        onError: (error) => {
          falla(null, error);
        },
        onSettled: () => {
          refResumen.current?.focus();
        },
      },
    );
  };

  const guardarMinuto = (evento: EventoRevisable, periodo: number, segundos: number) => {
    setFallo(null);
    minuto.mutate(
      { id: evento.id, periodo, segundos },
      {
        onSuccess: () => {
          setEditando(null);
          anunciar('Minuto cambiado.');
          enfocar(evento.id);
        },
        onError: (error) => {
          falla(evento.id, error);
        },
      },
    );
  };

  const resumen = () => {
    if (eventos.length === 0) {
      return 'No hay ningún evento apuntado.';
    }

    if (pendientes.length === 0) {
      return 'No queda ningún evento pendiente.';
    }

    return pendientes.length === 1
      ? 'Queda 1 evento pendiente. Mientras quede, el partido no se cierra.'
      : `Quedan ${String(pendientes.length)} eventos pendientes. Mientras queden, el partido no se cierra.`;
  };

  return (
    <Card title="Eventos" headingLevel={2}>
      <div className={styles.bloque}>
        {/* Recibe el foco tras aprobar en bloque: el botón desaparece. */}
        <p ref={refResumen} className={styles.nota} tabIndex={-1}>
          {resumen()}
        </p>
        {pendientes.length > 0 && !puedeAprobar ? (
          <p className={styles.nota}>
            Aprobarlos o descartarlos pide el permiso de aprobar eventos, que no tienes.
          </p>
        ) : null}
        {descartados === 0 ? null : (
          <p className={styles.nota}>
            {descartados === 1
              ? '1 evento descartado: no cuenta.'
              : `${String(descartados)} eventos descartados: no cuentan.`}
            {puedeAprobar ? ' No se borra: se puede recuperar.' : null}
          </p>
        )}
        {hayRepetidos ? (
          <p className={styles.nota}>
            Los marcados como posible repetido son del mismo tipo y casi del mismo minuto, y los
            apuntaron personas distintas. Si son el mismo, descarta el que sobre; si no, déjalos
            como están.
          </p>
        ) : null}
        {marcar.isError ? (
          <p className={styles.nota}>
            No se han podido buscar los posibles repetidos. No impide revisar ni cerrar.
          </p>
        ) : null}
        {pendientes.length > 0 && puedeAprobar ? (
          <div>
            <Button variant="primary" disabled={ocupado} onClick={aprobarLosPendientes}>
              {pendientes.length === 1
                ? 'Aprobar el pendiente'
                : `Aprobar los ${String(pendientes.length)} pendientes`}
            </Button>
          </div>
        ) : null}
        {fallo !== null && fallo.id === null ? (
          <p className={styles.fallo}>{fallo.mensaje}</p>
        ) : null}
        {eventos.length === 0 ? null : (
          <ul className={styles.lista}>
            {bloques.flatMap((bloque) =>
              bloque.eventos.map((evento) => {
                const descripcion = describir(evento);
                const acciones = accionesDe(evento, puedeAprobar);

                return (
                  <li
                    key={evento.id}
                    className={
                      bloque.grupo === null ? styles.fila : `${styles.fila} ${styles.repetido}`
                    }
                  >
                    <div className={styles.marcas}>
                      <StatusChip status={evento.estado} />
                      {bloque.grupo === null ? null : (
                        <span className={styles.marca}>Posible repetido</span>
                      )}
                    </div>
                    <p
                      ref={(nodo) => {
                        if (nodo === null) {
                          refDescripciones.current.delete(evento.id);
                        } else {
                          refDescripciones.current.set(evento.id, nodo);
                        }
                      }}
                      className={styles.descripcion}
                      tabIndex={-1}
                    >
                      {descripcion}
                    </p>
                    {autores.isPending ? null : (
                      <p className={styles.autor}>
                        Lo apuntó: {autores.data?.get(evento.autorId) ?? 'Otra persona'}
                      </p>
                    )}
                    {editando === evento.id ? (
                      <MinutoDelEvento
                        evento={evento}
                        descripcion={descripcion}
                        periodos={partido.periodos}
                        minutosDeParte={partido.minutosDeParte}
                        ocupado={ocupado}
                        guardando={minuto.isPending}
                        alGuardar={(periodo, segundos) => {
                          guardarMinuto(evento, periodo, segundos);
                        }}
                        alCancelar={() => {
                          setEditando(null);
                          setFallo(null);
                          enfocar(evento.id);
                        }}
                      />
                    ) : acciones.length === 0 ? null : (
                      <div className={styles.acciones}>
                        {acciones.map((accion) =>
                          accion === 'minuto' ? (
                            <Button
                              key={accion}
                              variant="secondary"
                              disabled={ocupado}
                              aria-label={`Cambiar minuto: ${descripcion}`}
                              onClick={() => {
                                setFallo(null);
                                setEditando(evento.id);
                              }}
                            >
                              Cambiar minuto
                            </Button>
                          ) : (
                            <Button
                              key={accion}
                              variant={accion === 'descartar' ? 'secondary' : 'primary'}
                              disabled={ocupado}
                              aria-label={`${RESOLUCIONES[accion].texto}: ${descripcion}`}
                              onClick={() => {
                                resolverUno(evento, accion);
                              }}
                            >
                              {RESOLUCIONES[accion].texto}
                            </Button>
                          ),
                        )}
                      </div>
                    )}
                    {fallo !== null && fallo.id === evento.id ? (
                      <p className={styles.fallo}>{fallo.mensaje}</p>
                    ) : null}
                  </li>
                );
              }),
            )}
          </ul>
        )}
      </div>
    </Card>
  );
}
