// Pantalla A15 — Lista de asistencia (T-229; DOC 04 §13).
//
// Quien tiene `training.manage` marca a cada jugador de la plantilla del
// entrenamiento: presente, ausente o retraso, y le apunta una observación. Se
// guarda con un botón, y la pantalla se queda donde está.
//
// SIN MARCAR ES SIN FILA (T-07): ningún radio marcado, y al guardar ese
// jugador no viaja. Guardar con jugadores sin marcar se permite, y la pantalla
// dice cuántos quedan.
//
// DE QUÉ PARTE UNA LISTA NUEVA lo elige quien pasa lista, arriba: todos
// presentes o todos sin marcar (T-08). Se recuerda en el móvil y solo mueve a
// quien no tiene fila guardada ni se ha tocado en esta visita.
//
// QUE NO SE PIERDA NADA. Cada toque escribe lo tocado en `localStorage`
// (`model/lista.ts`): si la pantalla se bloquea, se recarga o falla el
// guardado, sigue ahí, y al volver a entrar se recupera y se dice. Salir sin
// guardar no pregunta nada.
//
// LAS OBSERVACIONES NUNCA RECOGEN SALUD (T-05): la pantalla lo dice arriba.
// La observación del entrenamiento entero no está aquí: irá en su tabla, con
// la T-233. `training_sessions.notes` no se toca.
//
// La ruta cuelga de `training.manage` en `router.tsx`, y la base lo vuelve a
// pedir. Va en línea y no por la cola: sin red no se guarda, y lo marcado
// espera en el borrador.

import { useEffect, useId, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';

import { useAuth } from '@modules/auth';
import { usePlantillaDeLectura } from '@modules/core';
import { useAnnounce } from '@shared/hooks/announceContext';
import { mensajeDeErrorAlGuardar } from '@shared/lib/guardado';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { Field } from '@shared/ui/Field';
import { GrupoDeOpciones } from '@shared/ui/GrupoDeOpciones';
import { Pantalla } from '@shared/ui/Pantalla';

import { useAsistencia, useGuardarLista } from '../hooks/useAsistencia';
import { useEntrenamiento } from '../hooks/useEntrenamientos';
import {
  borrarBorrador,
  cambiosTrasGuardar,
  componerLista,
  ESTADOS_DE_ASISTENCIA,
  fraseDeGuardado,
  fraseDelRecuento,
  fraseDeSinMarcar,
  guardarBorrador,
  hayCambios,
  LARGO_OBSERVACION,
  leerBorrador,
  recuento,
  SIN_CAMBIOS,
  SIN_MARCAR,
} from '../model/lista';
import { guardarPartida, leerPartida } from '../model/partida';

import styles from './ListaPage.module.css';

import type { Entrenamiento } from '../model/entrenamiento';
import type {
  Asistencia,
  Cambios,
  EstadoDeAsistencia,
  JugadorDeLista,
  LineaDeLista,
} from '../model/lista';
import type { Partida } from '../model/partida';

// «jue, 8 oct · 18:00», como en la A15a. Sus dos formatos viven dentro de
// `EntrenamientosPage.tsx`, y un archivo de pantalla no exporta otra cosa que
// su componente: se repiten aquí.
const DIA = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const HORA = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });

const OPCIONES_DE_ESTADO: readonly { valor: EstadoDeAsistencia; etiqueta: string }[] = [
  { valor: 'present', etiqueta: ESTADOS_DE_ASISTENCIA.present },
  { valor: 'absent', etiqueta: ESTADOS_DE_ASISTENCIA.absent },
  { valor: 'late', etiqueta: ESTADOS_DE_ASISTENCIA.late },
];

const OPCIONES_DE_PARTIDA: readonly { valor: Partida; etiqueta: string }[] = [
  { valor: 'presentes', etiqueta: 'Todos presentes' },
  { valor: 'sin_marcar', etiqueta: 'Todos sin marcar' },
];

const FALLO_AL_GUARDAR = 'No se ha podido guardar. Lo marcado sigue aquí: vuelve a intentarlo.';

/** Lo que `mensajeDeErrorAlGuardar` dice cuando la base no ha dicho nada. */
const FALLO_SIN_MOTIVO = mensajeDeErrorAlGuardar(null);

/**
 * La frase del fallo: la de la base si dijo por qué —sin permiso, sin
 * conexión—, y si no, la de esta pantalla, que recuerda que lo marcado sigue.
 */
function mensajeDeFallo(error: unknown): string {
  const texto = mensajeDeErrorAlGuardar(error);

  return texto === FALLO_SIN_MOTIVO ? FALLO_AL_GUARDAR : texto;
}

/**
 * EL FOCO SOLO SE MUEVE SI NADIE LO ESTÁ USANDO. Los radios y los campos no se
 * bloquean al guardar, que con mala cobertura son muchos segundos: quien ha
 * seguido marcando o escribiendo tiene el foco en otro sitio, y quitárselo
 * cuando la base contesta le cortaría lo que está haciendo (3.2.1). Está libre
 * si se quedó en «Guardar lista», desactivado, o si se perdió a `body` porque
 * el botón pulsado ya no está.
 */
function focoLibre(idDeGuardar: string): boolean {
  const activo = document.activeElement;

  return activo === null || activo === document.body || activo.id === idDeGuardar;
}

function nombreConDorsal(linea: Pick<LineaDeLista, 'shirtNumber' | 'nickname'>): string {
  return linea.shirtNumber === null ? linea.nickname : `${linea.shirtNumber} · ${linea.nickname}`;
}

function Volver() {
  return (
    <p>
      <Link className={styles.volver} to="/entrenamientos">
        Volver a entrenamientos
      </Link>
    </p>
  );
}

interface JugadorProps {
  linea: LineaDeLista;
  alMarcar: (playerId: string, estado: EstadoDeAsistencia) => void;
  alObservar: (playerId: string, texto: string) => void;
}

/** Un jugador de la plantilla: su nombre, sus tres opciones y su observación. */
function Jugador({ linea, alMarcar, alObservar }: JugadorProps) {
  const idCampo = useId();
  // El campo sale abierto si ya hay observación, y una vez abierto no se
  // cierra solo: si se cerrase al borrar la última letra, se llevaría el foco.
  const [abierta, setAbierta] = useState(false);
  const recienAbierta = useRef(false);
  const conCampo = abierta || linea.notes !== '';
  // Sin estado no hay fila donde guardar la observación.
  const sinDondeGuardar = linea.status === null && linea.notes.trim() !== '';

  // El botón «Añadir observación» desaparece al pulsarlo: el foco va al campo
  // que acaba de salir, que es donde se va a escribir (2.4.3).
  useEffect(() => {
    if (abierta && recienAbierta.current) {
      recienAbierta.current = false;
      document.getElementById(idCampo)?.focus();
    }
  }, [abierta, idCampo]);

  return (
    <li className={styles.jugador}>
      <h3 className={styles.nombre}>{nombreConDorsal(linea)}</h3>
      {/* La leyenda nombra el grupo para el lector de pantalla y va oculta a
          la vista: el apodo ya se lee justo encima. */}
      <div className={styles.asistencia}>
        <GrupoDeOpciones
          enLinea
          leyenda={`Asistencia de ${linea.nickname}`}
          opciones={OPCIONES_DE_ESTADO}
          valor={linea.status}
          alCambiar={(estado) => {
            alMarcar(linea.playerId, estado);
          }}
        />
      </div>
      {conCampo ? (
        <>
          <Field
            id={idCampo}
            label={`Observación de ${linea.nickname}`}
            maxLength={LARGO_OBSERVACION}
            autoComplete="off"
            value={linea.notes}
            // El aviso va atado al campo: quien llega a él con el lector de
            // pantalla lo oye, y no solo quien lo ve escrito debajo (1.3.1).
            aria-describedby={sinDondeGuardar ? `${idCampo}-aviso` : undefined}
            onChange={(evento) => {
              setAbierta(true);
              alObservar(linea.playerId, evento.target.value);
            }}
          />
          {sinDondeGuardar ? (
            <p id={`${idCampo}-aviso`} className={styles.aviso}>
              Márcalo para guardar la observación.
            </p>
          ) : null}
        </>
      ) : (
        <div>
          {/* El apodo va en el nombre: sin él, veinte «Añadir observación»
              iguales no dicen a un lector de pantalla de quién son (2.4.4). */}
          <Button
            variant="secondary"
            aria-label={`Añadir observación: ${linea.nickname}`}
            onClick={() => {
              recienAbierta.current = true;
              setAbierta(true);
            }}
          >
            Añadir observación
          </Button>
        </div>
      )}
    </li>
  );
}

/** Quien tiene fila y ya no está en la plantilla: se lee y no se cambia. */
function FueraDePlantilla({ lineas }: { lineas: readonly LineaDeLista[] }) {
  return (
    <Card title="Ya no están en la plantilla" headingLevel={2}>
      <ul className={styles.lista}>
        {lineas.map((linea) => (
          <li key={linea.playerId} className={styles.jugador}>
            <h3 className={styles.nombre}>{linea.nickname}</h3>
            <p>{linea.status === null ? SIN_MARCAR : ESTADOS_DE_ASISTENCIA[linea.status]}</p>
            {linea.notes === '' ? null : <p className={styles.detalle}>{linea.notes}</p>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

interface ListaProps {
  sesionId: string;
  userId: string;
  plantilla: readonly JugadorDeLista[];
  guardadas: readonly Asistencia[];
}

function Lista({ sesionId, userId, plantilla, guardadas }: ListaProps) {
  const anunciar = useAnnounce();
  const guardar = useGuardarLista(sesionId);
  const idGuardar = useId();
  // El borrador se lee una vez, al entrar.
  const [borrador] = useState(() => leerBorrador(sesionId, userId));
  const [cambios, setCambios] = useState<Cambios>(borrador ?? SIN_CAMBIOS);
  const [recuperado, setRecuperado] = useState(borrador !== null);
  const [partida, setPartida] = useState<Partida>(() => leerPartida());
  const [fallo, setFallo] = useState<string | null>(null);
  const [guardadaA, setGuardadaA] = useState<string | null>(null);
  // Lo tocado, también fuera del render: cada cambio parte del anterior y se
  // escribe en el borrador en el mismo toque, sin esperar a que React pinte.
  const tocado = useRef(cambios);
  const mensaje = useRef<HTMLParagraphElement>(null);
  const focoAlBoton = useRef(false);

  // Al fallar, el foco va al mensaje, que es lo que hay que leer (2.4.3): el
  // botón que lo tenía estaba desactivado mientras guardaba. El anuncio sale
  // siempre, tenga el foco quien lo tenga.
  useEffect(() => {
    if (fallo !== null && focoLibre(idGuardar)) {
      mensaje.current?.focus();
    }
  }, [fallo, idGuardar]);

  // Tras guardar bien y tras descartar, el foco vuelve a «Guardar lista»: en
  // el primer caso el botón había dejado de responder, y en el segundo
  // «Descartar cambios» ya no está. Se espera a que el botón vuelva a
  // responder, que desactivado no admite el foco.
  useEffect(() => {
    if (focoAlBoton.current && !guardar.isPending) {
      focoAlBoton.current = false;

      if (focoLibre(idGuardar)) {
        document.getElementById(idGuardar)?.focus();
      }
    }
  });

  const fijar = (nuevos: Cambios) => {
    tocado.current = nuevos;
    setCambios(nuevos);
    guardarBorrador(sesionId, userId, nuevos);
  };

  const lineas = componerLista(plantilla, guardadas, cambios, partida);
  const dentro = lineas.filter((linea) => !linea.fueraDePlantilla);
  const fuera = lineas.filter((linea) => linea.fueraDePlantilla);
  const cuenta = recuento(lineas);
  const quedan = fraseDeSinMarcar(cuenta.sinMarcar);

  const guardarLista = () => {
    const enviados = tocado.current;
    const enviadas = lineas;

    setFallo(null);
    guardar.mutate(
      { lineas: enviadas, enviados },
      {
        onSuccess: () => {
          // Lo guardado manda: de lo tocado solo queda lo que no viajó. El
          // borrador ya lo ha puesto al día el hook, que corre aunque esta
          // pantalla ya no esté; aquí se pone al día lo que se ve.
          fijar(cambiosTrasGuardar(tocado.current, enviados, enviadas));
          setRecuperado(false);
          setGuardadaA(HORA.format(new Date()));
          anunciar(fraseDeGuardado(recuento(enviadas)));
          focoAlBoton.current = true;
        },
        onError: (error) => {
          const texto = mensajeDeFallo(error);

          setFallo(texto);
          anunciar(texto);
        },
      },
    );
  };

  const descartar = () => {
    borrarBorrador(sesionId);
    tocado.current = SIN_CAMBIOS;
    setCambios(SIN_CAMBIOS);
    setRecuperado(false);
    setFallo(null);
    anunciar('Cambios descartados.');
    focoAlBoton.current = true;
  };

  return (
    <>
      {recuperado ? <p className={styles.aviso}>Tienes cambios sin guardar de antes.</p> : null}

      <Card title="Jugadores" headingLevel={2}>
        {dentro.length === 0 ? (
          <div className={styles.bloque}>
            <p className={styles.nota}>La plantilla no tiene jugadores.</p>
            <p>
              <Link className={styles.volver} to="/equipo">
                Ir al equipo
              </Link>
            </p>
          </div>
        ) : (
          <div className={styles.bloque}>
            <GrupoDeOpciones
              enLinea
              leyenda="Una lista nueva empieza con"
              opciones={OPCIONES_DE_PARTIDA}
              valor={partida}
              alCambiar={(elegida) => {
                setPartida(elegida);
                guardarPartida(elegida);
              }}
            />
            {/* No es una región viva: anunciar cada toque estorba. */}
            <p className={styles.cuenta}>{fraseDelRecuento(cuenta)}</p>
            <ul className={styles.lista}>
              {dentro.map((linea) => (
                <Jugador
                  key={linea.playerId}
                  linea={linea}
                  alMarcar={(playerId, estado) => {
                    fijar({
                      ...tocado.current,
                      estados: { ...tocado.current.estados, [playerId]: estado },
                    });
                  }}
                  alObservar={(playerId, texto) => {
                    fijar({
                      ...tocado.current,
                      observaciones: { ...tocado.current.observaciones, [playerId]: texto },
                    });
                  }}
                />
              ))}
            </ul>
          </div>
        )}
      </Card>

      {fuera.length === 0 ? null : <FueraDePlantilla lineas={fuera} />}

      {dentro.length === 0 ? null : (
        <div className={styles.bloque}>
          {quedan === null ? null : <p className={styles.nota}>{quedan}</p>}
          {fallo === null ? null : (
            <p ref={mensaje} className={styles.fallo} tabIndex={-1}>
              {fallo}
            </p>
          )}
          <div className={styles.acciones}>
            <Button
              id={idGuardar}
              variant="primary"
              disabled={guardar.isPending}
              onClick={guardarLista}
            >
              {guardar.isPending ? 'Guardando…' : 'Guardar lista'}
            </Button>
            {hayCambios(cambios) ? (
              <Button variant="secondary" disabled={guardar.isPending} onClick={descartar}>
                Descartar cambios
              </Button>
            ) : null}
            {guardadaA === null ? null : (
              <p className={styles.guardada}>Guardada a las {guardadaA}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** El día, la hora y el lugar del entrenamiento, bajo el título. */
function Cabecera({ entrenamiento }: { entrenamiento: Entrenamiento }) {
  const instante = new Date(entrenamiento.scheduledAt);

  return (
    <div className={styles.cabecera}>
      <p className={styles.cuando}>
        <time dateTime={entrenamiento.scheduledAt}>
          {DIA.format(instante)} · {HORA.format(instante)}
        </time>
      </p>
      {entrenamiento.location === null ? null : (
        <p className={styles.detalle}>{entrenamiento.location}</p>
      )}
    </div>
  );
}

export function ListaPage() {
  const { id: sesionId = '' } = useParams();
  const { session } = useAuth();
  const entrenamiento = useEntrenamiento(sesionId);
  const sesion = entrenamiento.data ?? null;
  // La plantilla es la del equipo y la temporada del entrenamiento, que no
  // tienen por qué ser los activos. Hasta saberlos, la consulta espera.
  const plantilla = usePlantillaDeLectura(
    sesion === null ? null : sesion.teamId,
    sesion === null ? null : sesion.seasonId,
  );
  const asistencia = useAsistencia(sesionId);

  const fallo = (alReintentar: () => void) => (
    <div className={styles.bloque}>
      <p className={styles.nota}>No se ha podido cargar la lista. Suele ser falta de cobertura.</p>
      <div>
        <Button variant="secondary" onClick={alReintentar}>
          Reintentar
        </Button>
      </div>
    </div>
  );

  // Se mira si hay dato, y no si la última petición falló: una relectura que
  // falla después de guardar no puede quitar de la pantalla la lista que ya
  // estaba pintada.
  const contenido = () => {
    if (entrenamiento.data === undefined) {
      return entrenamiento.isError ? (
        fallo(() => {
          void entrenamiento.refetch();
        })
      ) : (
        <p className={styles.nota}>Cargando…</p>
      );
    }

    if (entrenamiento.data === null) {
      // El enlace de volver es el de arriba, que sale en todos los estados.
      return <p className={styles.nota}>Ese entrenamiento no existe o no puedes verlo.</p>;
    }

    if (plantilla.data === undefined || asistencia.data === undefined) {
      return plantilla.isError || asistencia.isError ? (
        fallo(() => {
          if (plantilla.isError) {
            void plantilla.refetch();
          }

          if (asistencia.isError) {
            void asistencia.refetch();
          }
        })
      ) : (
        <p className={styles.nota}>Cargando…</p>
      );
    }

    return (
      <>
        <Cabecera entrenamiento={entrenamiento.data} />
        <p className={styles.nota}>
          Las observaciones son para lo deportivo. No apuntes lesiones ni datos de salud.
        </p>
        <Lista
          key={entrenamiento.data.id}
          sesionId={entrenamiento.data.id}
          userId={session === null ? '' : session.user.id}
          plantilla={plantilla.data}
          guardadas={asistencia.data}
        />
      </>
    );
  };

  return (
    <Pantalla id="A15" titulo="Lista de asistencia">
      <Volver />
      {contenido()}
    </Pantalla>
  );
}
