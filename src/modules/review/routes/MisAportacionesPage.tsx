// Pantalla A14 — Mis aportaciones (T-211).
//
// Lo que ha apuntado uno mismo en los partidos de su equipo, por partido, el
// más reciente primero. De cada evento de un partido sin cerrar se cambia el
// minuto, el jugador o el segundo jugador —la asistencia de un gol, quien
// entra en un cambio—, o se borra. La lógica vive en `model/aportaciones.ts`;
// aquí solo se pinta.
//
// EN LÍNEA, contra Supabase y no por la cola, como la A13: sin cobertura nada
// de esto se guarda, y se dice. Lo que el móvil aún no ha enviado no está en
// el servidor y aquí no sale.
//
// QUIÉN PUEDE LO DECIDE LA BASE: el autor, lo suyo mientras está pendiente;
// con `event.approve`, también lo ya revisado. La pantalla solo deja de
// ofrecer lo que la base va a rechazar.
//
// UN PARTIDO CERRADO SALE PLEGADO Y SOLO PARA LEER: sus tramos ya están
// calculados, y para corregirlo hay que reabrirlo desde su cierre.
//
// Todo se hace en su sitio, sin ventana emergente, y una cosa cada vez. Una
// sola región viva, la de `useAnnounce`. EL FOCO: el botón que se pulsa
// desaparece al abrir su formulario, y el foco va a la pregunta o al primer
// campo, nunca al «Sí»; al terminar vuelve a la descripción del evento, y
// tras borrar, a la línea que dice qué se ha borrado.

import { useIsFetching } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { useAuth, useHasPermission } from '@modules/auth';
import { describirEvento } from '@modules/match';
import { NOMBRES_DE_EVENTO } from '@modules/rules';
import { useAnnounce } from '@shared/hooks/announceContext';
import { mensajeDeErrorAlGuardar, SIN_FILAS } from '@shared/lib/guardado';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { Pantalla } from '@shared/ui/Pantalla';
import { StatusChip } from '@shared/ui/StatusChip';

import { reviewKeys } from '../api/queryKeys';
import { MinutoDelEvento } from '../components/MinutoDelEvento';
import { useAportaciones, useCorregirAportacion } from '../hooks/useAportaciones';
import { accionesDe, agruparPorPartido, candidatos } from '../model/aportaciones';
import { nombrador, NOMBRES_DE_ESTADO } from '../model/cierre';
import { EVENTO_YA_NO_SE_PUEDE_CAMBIAR } from '../model/discordancias';

import styles from './MisAportacionesPage.module.css';

import type { Correccion } from '../hooks/useAportaciones';
import type {
  AccionDeAportacion,
  Aportacion,
  CampoDeJugador,
  Convocado,
  GrupoDeAportaciones,
} from '../model/aportaciones';

// «sábado, 3 de octubre de 2026, 12:00», en la hora del móvil (DOC 13).
const FECHA = new Intl.DateTimeFormat('es-ES', { dateStyle: 'full', timeStyle: 'short' });

type Describir = (evento: Aportacion) => string;

const TEXTOS: Record<AccionDeAportacion, string> = {
  minuto: 'Minuto',
  jugador: 'Jugador',
  asistencia: 'Asistencia',
  entra: 'Entra',
  borrar: 'Borrar',
};

const YA_NO_SE_PUEDE = EVENTO_YA_NO_SE_PUEDE_CAMBIAR;

/**
 * Frase para quien está delante cuando corregir no sale bien. Lo que rechaza
 * `validate_match_event` llega como P0001 —un `raise exception`— con su texto
 * en español, y se enseña tal cual: dice mejor que nadie qué no cuadra.
 */
function mensajeDeCorreccion(error: unknown): string {
  if (error instanceof Error && error.message === SIN_FILAS) {
    return YA_NO_SE_PUEDE;
  }

  if (typeof error === 'object' && error !== null && 'code' in error && 'message' in error) {
    const { code, message } = error;

    if (code === 'P0001' && typeof message === 'string' && message !== '') {
      return message;
    }
  }

  return mensajeDeErrorAlGuardar(error);
}

/** De qué jugador del evento habla cada acción, y cómo se pregunta y se cuenta. */
function campoDe(
  accion: 'jugador' | 'asistencia' | 'entra',
  evento: Pick<Aportacion, 'tipo'>,
): { campo: CampoDeJugador; pregunta: string; hecho: string } {
  switch (accion) {
    case 'jugador':
      return {
        campo: 'jugador',
        pregunta: evento.tipo === 'substitution' ? 'Sale en' : 'Jugador de',
        hecho: 'Jugador cambiado.',
      };
    case 'asistencia':
      return { campo: 'segundo', pregunta: 'Asistencia de', hecho: 'Asistencia cambiada.' };
    case 'entra':
      return { campo: 'segundo', pregunta: 'Entra en', hecho: 'Cambiado quien entra.' };
  }
}

function etiqueta(linea: Convocado): string {
  return linea.shirtNumber === null
    ? linea.nickname
    : `${String(linea.shirtNumber)} · ${linea.nickname}`;
}

interface ElegirJugadorProps {
  /** «Asistencia de: Gol · 7 · Juanito · 35'». Da nombre al grupo. */
  titulo: string;
  opciones: readonly Convocado[];
  /** El que está puesto ahora: sale marcado y no se puede elegir. */
  actual: string | null;
  /** Ofrece quitarlo: «Sin asistencia», la primera. */
  conNinguno: boolean;
  ocupado: boolean;
  alElegir: (jugador: string | null) => void;
  alCancelar: () => void;
}

/** Los convocados del partido, en su sitio: se elige con un toque. */
function ElegirJugador({
  titulo,
  opciones,
  actual,
  conNinguno,
  ocupado,
  alElegir,
  alCancelar,
}: ElegirJugadorProps) {
  const refTitulo = useRef<HTMLLegendElement>(null);

  // El botón que se pulsó desaparece: el foco va a la leyenda del grupo, y no a
  // la primera opción, para que un segundo toque sin mirar no elija nada.
  useEffect(() => {
    refTitulo.current?.focus();
  }, []);

  return (
    <fieldset className={styles.grupo}>
      <legend ref={refTitulo} className={styles.leyenda} tabIndex={-1}>
        {titulo}
      </legend>
      {opciones.length === 0 ? (
        <p className={styles.nota}>No hay ningún otro convocado que elegir.</p>
      ) : null}
      <div className={styles.acciones}>
        {conNinguno ? (
          <Button
            variant="secondary"
            disabled={ocupado || actual === null}
            onClick={() => {
              alElegir(null);
            }}
          >
            {actual === null ? 'Sin asistencia (ahora)' : 'Sin asistencia'}
          </Button>
        ) : null}
        {opciones.map((linea) => (
          <Button
            key={linea.playerId}
            variant="secondary"
            disabled={ocupado || linea.playerId === actual}
            onClick={() => {
              alElegir(linea.playerId);
            }}
          >
            {linea.playerId === actual ? `${etiqueta(linea)} (ahora)` : etiqueta(linea)}
          </Button>
        ))}
      </div>
      <div>
        <Button variant="ghost" disabled={ocupado} onClick={alCancelar}>
          Cancelar
        </Button>
      </div>
    </fieldset>
  );
}

interface ConfirmarBorradoProps {
  descripcion: string;
  ocupado: boolean;
  /** Solo mientras la mutación de borrar está en marcha, no mientras se vuelve a pedir la lista. */
  borrando: boolean;
  alConfirmar: () => void;
  alCancelar: () => void;
}

/** El segundo paso del borrado, en su sitio. */
function ConfirmarBorrado({
  descripcion,
  ocupado,
  borrando,
  alConfirmar,
  alCancelar,
}: ConfirmarBorradoProps) {
  const refPregunta = useRef<HTMLParagraphElement>(null);

  // El foco va a la pregunta, y no al «Sí», como en el cierre del partido.
  useEffect(() => {
    refPregunta.current?.focus();
  }, []);

  return (
    <div className={styles.editor}>
      <p ref={refPregunta} className={styles.pregunta} tabIndex={-1}>
        ¿Borrar {descripcion}? No se puede deshacer.
      </p>
      <div className={styles.acciones}>
        <Button variant="primary" disabled={ocupado} onClick={alConfirmar}>
          {borrando ? 'Borrando…' : 'Sí, borrar'}
        </Button>
        <Button variant="secondary" disabled={ocupado} onClick={alCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

/** Qué se está corrigiendo ahora mismo: un evento y una acción, y solo uno. */
interface Edicion {
  id: string;
  accion: AccionDeAportacion;
}

interface Fallo {
  id: string;
  mensaje: string;
}

interface ListaProps {
  grupos: readonly GrupoDeAportaciones[];
}

function Lista({ grupos }: ListaProps) {
  const anunciar = useAnnounce();
  const puedeAprobar = useHasPermission('event.approve') === true;
  const corregir = useCorregirAportacion();
  const refrescando = useIsFetching({ queryKey: reviewKeys.aportaciones() }) > 0;
  const refDescripciones = useRef(new Map<string, HTMLParagraphElement>());
  const refBorrado = useRef<HTMLParagraphElement>(null);
  const refEditor = useRef<HTMLDivElement>(null);
  const [editando, setEditando] = useState<Edicion | null>(null);
  const [fallo, setFallo] = useState<Fallo | null>(null);
  /** La descripción de lo último que se borró: su fila ya no está para decirlo. */
  const [borrado, setBorrado] = useState<string | null>(null);

  // Mientras la lista se vuelve a pedir, lo que se ve puede no ser lo que hay.
  const ocupado = corregir.isPending || refrescando;

  // Tras borrar, la fila desaparece: el foco va a la línea que lo cuenta.
  useEffect(() => {
    if (borrado !== null) {
      refBorrado.current?.focus();
    }
  }, [borrado]);

  const enfocar = (id: string) => {
    refDescripciones.current.get(id)?.focus();
  };

  const cerrar = (id: string) => {
    setEditando(null);
    setFallo(null);
    enfocar(id);
  };

  const guardar = (correccion: Correccion, hecho: string, descripcion: string) => {
    setFallo(null);
    setBorrado(null);
    corregir.mutate(correccion, {
      onSuccess: () => {
        setEditando(null);
        anunciar(hecho);

        if (correccion.campo === 'borrar') {
          setBorrado(descripcion);
        } else {
          enfocar(correccion.id);
        }
      },
      onError: (error: unknown) => {
        const mensaje = mensajeDeCorreccion(error);

        // Con `SIN_FILAS` el evento ya no está como se veía: no tiene sentido
        // dejar abierto un formulario sobre él. Con lo demás —sin cobertura,
        // un jugador que la base no admite— se queda, para probar otra vez.
        if (mensaje === YA_NO_SE_PUEDE) {
          setEditando(null);
          enfocar(correccion.id);
        } else {
          // El botón que se pulsó está desactivado y el foco habría caído en
          // `body`: vuelve a la leyenda del formulario que sigue abierto.
          refEditor.current?.querySelector<HTMLElement>('[tabindex="-1"]')?.focus();
        }

        setFallo({ id: correccion.id, mensaje });
        anunciar(mensaje);
      },
    });
  };

  const editor = (grupo: GrupoDeAportaciones, evento: Aportacion, descripcion: string) => {
    const { partido } = grupo;
    const base = { id: evento.id, partidoId: partido.id };

    if (editando === null || editando.id !== evento.id) {
      return null;
    }

    if (editando.accion === 'minuto') {
      return (
        <MinutoDelEvento
          evento={evento}
          descripcion={descripcion}
          periodos={partido.periodos}
          minutosDeParte={partido.minutosDeParte}
          ocupado={ocupado}
          guardando={corregir.isPending}
          alGuardar={(periodo, segundos) => {
            guardar(
              { ...base, campo: 'minuto', periodo, segundos },
              'Minuto cambiado.',
              descripcion,
            );
          }}
          alCancelar={() => {
            cerrar(evento.id);
          }}
        />
      );
    }

    if (editando.accion === 'borrar') {
      return (
        <ConfirmarBorrado
          descripcion={descripcion}
          ocupado={ocupado}
          borrando={corregir.isPending}
          alConfirmar={() => {
            guardar({ ...base, campo: 'borrar' }, 'Evento borrado.', descripcion);
          }}
          alCancelar={() => {
            cerrar(evento.id);
          }}
        />
      );
    }

    const { accion } = editando;
    const { campo, pregunta, hecho } = campoDe(accion, evento);

    return (
      <ElegirJugador
        titulo={`${pregunta}: ${descripcion}`}
        opciones={candidatos(partido.convocatoria, evento, campo)}
        actual={campo === 'jugador' ? evento.jugador : evento.segundo}
        conNinguno={accion === 'asistencia'}
        ocupado={ocupado}
        alElegir={(jugador) => {
          if (campo === 'segundo') {
            guardar(
              { ...base, campo: 'segundo', segundo: jugador },
              jugador === null ? 'Asistencia quitada.' : hecho,
              descripcion,
            );
          } else if (jugador !== null) {
            guardar({ ...base, campo: 'jugador', jugador }, hecho, descripcion);
          }
        }}
        alCancelar={() => {
          cerrar(evento.id);
        }}
      />
    );
  };

  const fila = (grupo: GrupoDeAportaciones, evento: Aportacion, describir: Describir) => {
    const cerrado = grupo.partido.status === 'closed';
    const descripcion = describir(evento);
    const acciones = accionesDe(evento, grupo.partido, puedeAprobar);
    const abierto = editor(grupo, evento, descripcion);

    const debajo = () => {
      if (cerrado) {
        return null;
      }

      if (abierto !== null) {
        return <div ref={refEditor}>{abierto}</div>;
      }

      if (acciones.length === 0) {
        return <p className={styles.nota}>Ya está revisado: lo corrige quien cierra el partido.</p>;
      }

      return (
        <div className={styles.acciones}>
          {acciones.map((accion) => (
            <Button
              key={accion}
              variant="secondary"
              disabled={ocupado}
              aria-label={`${TEXTOS[accion]}: ${descripcion}`}
              onClick={() => {
                setFallo(null);
                setBorrado(null);
                setEditando({ id: evento.id, accion });
              }}
            >
              {TEXTOS[accion]}
            </Button>
          ))}
        </div>
      );
    };

    return (
      <li key={evento.id} className={styles.fila}>
        <StatusChip status={evento.estado} />
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
        {debajo()}
        {fallo !== null && fallo.id === evento.id ? (
          <p className={styles.fallo}>{fallo.mensaje}</p>
        ) : null}
      </li>
    );
  };

  // Un fallo sobre un evento que ya no está en la lista —lo han borrado— no
  // tiene fila donde salir: se enseña arriba.
  const sinFila =
    fallo !== null &&
    !grupos.some((grupo) => grupo.eventos.some((evento) => evento.id === fallo.id));

  return (
    <>
      {borrado === null ? null : (
        <p ref={refBorrado} className={styles.aviso} tabIndex={-1}>
          Borrado: {borrado}
        </p>
      )}
      {fallo !== null && sinFila ? <p className={styles.fallo}>{fallo.mensaje}</p> : null}
      {grupos.map((grupo) => {
        const { partido, eventos } = grupo;
        const nombre = nombrador(partido.convocatoria);
        const describir: Describir = (evento) =>
          describirEvento(evento, nombre, partido.minutosDeParte, NOMBRES_DE_EVENTO);
        const cabecera = (
          <p className={styles.nota}>
            <time dateTime={partido.kickoffAt}>{FECHA.format(new Date(partido.kickoffAt))}</time>
            {` · ${NOMBRES_DE_ESTADO[partido.status]}`}
          </p>
        );
        const lista = (
          <ul className={styles.lista}>
            {eventos.map((evento) => fila(grupo, evento, describir))}
          </ul>
        );

        return (
          <Card key={partido.id} title={`Contra ${partido.opponentName}`} headingLevel={2}>
            <div className={styles.bloque}>
              {cabecera}
              {partido.status === 'closed' ? (
                <>
                  <p className={styles.nota}>
                    Partido cerrado: para corregirlo hay que reabrirlo desde su cierre.
                  </p>
                  <details className={styles.plegado}>
                    <summary className={styles.resumen}>
                      {eventos.length === 1
                        ? 'Ver el evento que apuntaste'
                        : `Ver los ${String(eventos.length)} eventos que apuntaste`}
                    </summary>
                    {lista}
                  </details>
                </>
              ) : (
                lista
              )}
            </div>
          </Card>
        );
      })}
    </>
  );
}

export function MisAportacionesPage() {
  const { activeTeamId, activeSeasonId } = useAuth();
  const aportaciones = useAportaciones();

  const contenido = () => {
    if (activeTeamId === null) {
      return <p className={styles.nota}>No hay equipo activo, así que no hay nada que enseñar.</p>;
    }

    if (activeSeasonId === null) {
      return (
        <p className={styles.nota}>
          El club no tiene ninguna temporada en curso, y lo apuntado va por temporada.
        </p>
      );
    }

    if (aportaciones.isPending) {
      return <p className={styles.nota}>Cargando…</p>;
    }

    if (aportaciones.isError) {
      return (
        <div className={styles.bloque}>
          <p className={styles.nota}>
            No se ha podido cargar lo que has apuntado. Suele ser falta de cobertura.
          </p>
          <div>
            <Button
              variant="secondary"
              onClick={() => {
                void aportaciones.refetch();
              }}
            >
              Reintentar
            </Button>
          </div>
        </div>
      );
    }

    const grupos = agruparPorPartido(aportaciones.data.partidos, aportaciones.data.eventos);

    return (
      <>
        {grupos.length === 0 ? (
          <p className={styles.nota}>Todavía no has apuntado nada en esta temporada.</p>
        ) : null}
        {/* Siempre montada: lo último borrado se sigue diciendo aunque ya no quede nada. */}
        <Lista grupos={grupos} />
      </>
    );
  };

  return (
    <Pantalla id="A14" titulo="Mis aportaciones">
      <p className={styles.nota}>
        Lo que has apuntado tú esta temporada. Mientras el partido siga sin cerrar, se puede
        corregir y borrar.
      </p>
      {contenido()}
      <p className={styles.nota}>Lo que este móvil aún no ha enviado no sale aquí.</p>
    </Pantalla>
  );
}
