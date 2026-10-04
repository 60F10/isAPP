// Pantalla A13 — Cierre del partido (T-210a y T-210b, DOC 04 §8.4).
//
// Después del partido y con cobertura: el resultado calculado frente al del
// acta, lo que impide cerrar, el origen de los goles y el paso a `closed`,
// que mete el partido en las estadísticas de temporada. Cerrado, se puede
// reabrir (C-05). La lógica vive en `model/cierre.ts`; aquí solo se pinta.
//
// LAS COBERTURAS (T-209a) se listan, sin tocar nada: quién declaró seguir
// qué, y desde y hasta cuándo. Las que sigan abiertas las termina el cierre.
//
// LOS EVENTOS SE REVISAN EN `PanelDeEventos` (T-210b): aprobar, descartar,
// recuperar, corregir el minuto y ver los posibles repetidos. Solo con el
// partido sin cerrar: cerrado, primero se reabre. C-01 sigue en pie: con
// eventos pendientes no se cierra.
//
// Las confirmaciones van en dos pasos en el mismo sitio, sin ventana
// emergente, como el borrado de la A10. Una sola región viva, la de
// `useAnnounce`. Al cerrar y al reabrir, el foco va a la línea del estado,
// que es lo que ha cambiado.

import { useEffect, useId, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';

import { useHasPermission } from '@modules/auth';
import { describirEvento } from '@modules/match';
import { NOMBRES_DE_EVENTO } from '@modules/rules';
import { useAnnounce } from '@shared/hooks/announceContext';
import { mensajeDeErrorAlGuardar } from '@shared/lib/guardado';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { Field } from '@shared/ui/Field';
import { Pantalla } from '@shared/ui/Pantalla';

import { CON_PENDIENTES, PARTIDO_CAMBIADO } from '../api/cierre';
import { PanelDeEventos } from '../components/PanelDeEventos';
import {
  useAutores,
  useCerrarPartido,
  useCierre,
  useColaDelPartido,
  useEnviarAhora,
  useGuardarOrigen,
  useReabrirPartido,
} from '../hooks/useCierre';
import {
  actaInicial,
  alcanceEnTexto,
  bloqueosDelCierre,
  contarEventos,
  difiere,
  dondeSeSuspendio,
  esOrigen,
  golesAprobados,
  motivoDeEstado,
  NOMBRES_DE_ESTADO,
  ORIGENES_DE_GOL,
  origenDe,
  partesQueFaltan,
  resultadoEnTexto,
  tramoEnTexto,
  validarActa,
} from '../model/cierre';

import styles from './CierrePartidoPage.module.css';

import type { DatosDelCierre, FormularioActa, ResultadoActa } from '../model/cierre';
import type { EventoDelDirecto } from '@modules/match';

// «sábado, 3 de octubre de 2026, 12:00», en la hora del móvil (DOC 13).
const FECHA = new Intl.DateTimeFormat('es-ES', { dateStyle: 'full', timeStyle: 'short' });

type Describir = (evento: EventoDelDirecto) => string;

/** Del jugador solo dorsal y apodo: «7 · Juanito». */
function nombrador(convocatoria: DatosDelCierre['convocatoria']): (id: string) => string {
  const nombres = new Map(
    convocatoria.map((linea) => [
      linea.playerId,
      linea.shirtNumber === null
        ? linea.nickname
        : `${String(linea.shirtNumber)} · ${linea.nickname}`,
    ]),
  );

  return (id) => nombres.get(id) ?? 'Jugador fuera de la convocatoria';
}

function mensajeDeCierre(error: Error): string {
  if (error.message === CON_PENDIENTES) {
    return 'Han llegado eventos pendientes mientras tanto. El partido sigue sin cerrar.';
  }

  if (error.message === PARTIDO_CAMBIADO) {
    return 'Otra persona ha cambiado el partido mientras tanto. Ya está al día: revísalo.';
  }

  return mensajeDeErrorAlGuardar(error);
}

/** Dos pasos en el mismo sitio: el botón, y después «Sí» o «Cancelar». */
interface ConfirmarProps {
  texto: string;
  pregunta: string;
  si: string;
  ocupado: boolean;
  confirmando: boolean;
  alCambiar: (confirmando: boolean) => void;
  alConfirmar: () => void;
}

function Confirmar({
  texto,
  pregunta,
  si,
  ocupado,
  confirmando,
  alCambiar,
  alConfirmar,
}: ConfirmarProps) {
  const refPregunta = useRef<HTMLParagraphElement>(null);

  // El botón que se pulsó desaparece: el foco va a la pregunta, y no al
  // «Sí», para que un segundo toque sin mirar no confirme.
  useEffect(() => {
    if (confirmando) {
      refPregunta.current?.focus();
    }
  }, [confirmando]);

  if (!confirmando) {
    return (
      <div>
        <Button
          variant="primary"
          onClick={() => {
            alCambiar(true);
          }}
        >
          {texto}
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.bloque}>
      <p ref={refPregunta} className={styles.aviso} tabIndex={-1}>
        {pregunta}
      </p>
      <div className={styles.acciones}>
        <Button variant="primary" disabled={ocupado} onClick={alConfirmar}>
          {ocupado ? 'Un momento…' : si}
        </Button>
        <Button
          variant="secondary"
          disabled={ocupado}
          onClick={() => {
            alCambiar(false);
          }}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}

interface OrigenProps {
  partidoId: string;
  gol: EventoDelDirecto;
  descripcion: string;
}

/**
 * El origen de un gol (DOC 04 §7.5), con un `<select>` nativo. Se guarda al
 * elegir: guardar no cambia de pantalla ni mueve el foco (3.2.2). «Sin
 * indicar» solo sale mientras no tenga origen: vaciarlo no aporta nada.
 */
function OrigenDeUnGol({ partidoId, gol, descripcion }: OrigenProps) {
  const id = useId();
  const anunciar = useAnnounce();
  const guardar = useGuardarOrigen(partidoId);
  const guardado = origenDe(gol);
  const [valor, setValor] = useState<string>(guardado ?? '');

  return (
    <div className={styles.campo}>
      <label className={styles.etiqueta} htmlFor={id}>
        Origen · {descripcion}
      </label>
      <select
        id={id}
        className={styles.selector}
        value={valor}
        disabled={guardar.isPending}
        onChange={(evento) => {
          const origen = evento.target.value;

          if (!esOrigen(origen)) {
            return;
          }

          setValor(origen);
          guardar.mutate(
            { clientEventId: gol.clientEventId, detalles: gol.detalles, origen },
            {
              onSuccess: () => {
                const etiqueta = ORIGENES_DE_GOL.find((o) => o.valor === origen)?.etiqueta;
                anunciar(`Origen guardado: ${etiqueta ?? origen}`);
              },
              onError: (error) => {
                setValor(guardado ?? '');
                anunciar(mensajeDeErrorAlGuardar(error));
              },
            },
          );
        }}
      >
        {guardado === null ? <option value="">Sin indicar</option> : null}
        {ORIGENES_DE_GOL.map((origen) => (
          <option key={origen.valor} value={origen.valor}>
            {origen.etiqueta}
          </option>
        ))}
      </select>
    </div>
  );
}

function OrigenDeLosGoles({
  datos,
  describir,
  aprueba,
}: {
  datos: DatosDelCierre;
  describir: Describir;
  aprueba: boolean;
}) {
  const goles = golesAprobados(datos.eventos);

  if (goles.length === 0) {
    return <p className={styles.nota}>No hay goles aprobados.</p>;
  }

  if (!aprueba) {
    return (
      <p className={styles.nota}>
        Poner el origen de los goles pide el permiso de aprobar eventos, que no tienes. No impide
        cerrar.
      </p>
    );
  }

  return (
    <div className={styles.bloque}>
      <p className={styles.nota}>Opcional. No impide cerrar, y «Jugada» es lo normal.</p>
      <ul className={styles.lista}>
        {goles.map((gol) => (
          <li key={gol.clientEventId} className={styles.fila}>
            <OrigenDeUnGol partidoId={datos.partido.id} gol={gol} descripcion={describir(gol)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Lo que queda de este partido en la cola de este móvil. */
function EsteMovil({ partidoId }: { partidoId: string }) {
  const anunciar = useAnnounce();
  const cola = useColaDelPartido(partidoId);
  const enviar = useEnviarAhora(partidoId);

  if (cola.isPending) {
    return <p className={styles.nota}>Mirando lo que queda en este móvil…</p>;
  }

  if (cola.isError) {
    return (
      <p className={styles.nota}>
        No se ha podido leer lo que queda en este móvil. No impide cerrar.
      </p>
    );
  }

  const { sinEnviar, rechazados } = cola.data;

  return (
    <div className={styles.bloque}>
      {sinEnviar === 0 ? (
        <p className={styles.nota}>
          Todo lo de este partido que se apuntó en este móvil está enviado.
        </p>
      ) : (
        <>
          <p className={styles.aviso}>
            {sinEnviar === 1
              ? 'Queda 1 cambio sin enviar.'
              : `Quedan ${String(sinEnviar)} cambios sin enviar.`}{' '}
            Se envían solos en cuanto hay cobertura.
          </p>
          <div>
            <Button
              variant="secondary"
              disabled={enviar.isPending}
              onClick={() => {
                enviar.mutate(undefined, {
                  onSettled: async () => {
                    const { data } = await cola.refetch();
                    const quedan = data?.sinEnviar ?? sinEnviar;

                    anunciar(
                      quedan === 0
                        ? 'Enviado. No queda nada de este partido en el móvil.'
                        : 'Sigue sin salir. Suele ser falta de cobertura.',
                    );
                  },
                });
              }}
            >
              {enviar.isPending ? 'Enviando…' : 'Enviar ahora'}
            </Button>
          </div>
        </>
      )}
      {rechazados === 0 ? null : (
        <p className={styles.nota}>
          {rechazados === 1
            ? 'El servidor rechazó 1 cambio de este partido.'
            : `El servidor rechazó ${String(rechazados)} cambios de este partido.`}{' '}
          No impide cerrar. La banda de sincronización dice por qué.
        </p>
      )}
    </div>
  );
}

/**
 * Lo que declaró seguir cada anotador (T-209a, DOC 04 §10.2): quién, qué y
 * desde y hasta cuándo. Solo se lee. De quien la declaró, el nombre de su
 * perfil; de quien no se ve, «Otra persona», como en los eventos.
 */
function Coberturas({ datos, cerrado }: { datos: DatosDelCierre; cerrado: boolean }) {
  const { coberturas, partido } = datos;
  const nombre = nombrador(datos.convocatoria);
  const autores = useAutores([...new Set(coberturas.map((cobertura) => cobertura.autorId))].sort());
  const abiertas = coberturas.filter((cobertura) => cobertura.hasta === null).length;

  return (
    <Card title="Coberturas" headingLevel={2}>
      {coberturas.length === 0 ? (
        <p className={styles.nota}>Nadie declaró qué seguía en este partido.</p>
      ) : (
        <div className={styles.bloque}>
          <p className={styles.nota}>
            Lo que cada anotador dijo que seguía. De aquí sale cuánto fiarse de cada dato.
          </p>
          <ul className={styles.lista}>
            {coberturas.map((cobertura) => (
              <li key={cobertura.id} className={styles.fila}>
                <span className={styles.dato}>
                  {autores.isPending
                    ? '…'
                    : (autores.data?.get(cobertura.autorId) ?? 'Otra persona')}
                </span>
                <span aria-hidden="true"> · </span>
                <span>{alcanceEnTexto(cobertura, nombre)}</span>
                <span aria-hidden="true"> · </span>
                <span>{tramoEnTexto(cobertura, partido.minutosDeParte)}</span>
                {cobertura.hasta === null ? (
                  <>
                    <span aria-hidden="true"> · </span>
                    <span className={styles.dato}>Sin cerrar</span>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
          {abiertas > 0 && !cerrado ? (
            <p className={styles.nota}>
              {abiertas === 1
                ? 'La que sigue sin cerrar se termina sola'
                : 'Las que siguen sin cerrar se terminan solas'}{' '}
              en el final del partido al cerrarlo.
            </p>
          ) : null}
        </div>
      )}
    </Card>
  );
}

interface AbiertoProps {
  datos: DatosDelCierre;
  describir: Describir;
  alCerrar: (aviso: string | null) => void;
}

/** El partido sin cerrar: acta, eventos que revisar, este móvil, goles y el botón de cerrar. */
function Abierto({ datos, describir, alCerrar }: AbiertoProps) {
  const anunciar = useAnnounce();
  const anota = useHasPermission('match.live.write') === true;
  const aprueba = useHasPermission('event.approve') === true;
  const cola = useColaDelPartido(datos.partido.id);
  const cerrar = useCerrarPartido(datos);
  const [formulario, setFormulario] = useState<FormularioActa>(() => actaInicial(datos));
  const [errores, setErrores] = useState<ResultadoActa['errores']>({});
  const [confirmando, setConfirmando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  const { partido, calculado } = datos;
  const { pendientes } = contarEventos(datos.eventos);
  const faltan = partido.isRetroactive ? partesQueFaltan(datos.partes, partido.periodos) : [];
  const bloqueos = bloqueosDelCierre({
    pendientes: pendientes.length,
    sinEnviar: cola.data?.sinEnviar ?? null,
    partesSinPermiso: anota ? 0 : faltan.length,
  });
  const acta = validarActa(formulario).valores;
  const noCuadra = acta !== null && difiere(acta, calculado);

  const cambiar = (cambio: Partial<FormularioActa>) => {
    setFormulario((anterior) => ({ ...anterior, ...cambio }));
    setConfirmando(false);
  };

  const confirmarCierre = () => {
    const resultado = validarActa(formulario);
    setErrores(resultado.errores);

    if (resultado.valores === null) {
      setConfirmando(false);
      anunciar('Revisa el resultado del acta');
      return;
    }

    setFallo(null);
    cerrar.mutate(resultado.valores, {
      onSuccess: (repetidas) => {
        const aviso =
          repetidas === 0
            ? null
            : `${String(repetidas)} ${repetidas === 1 ? 'sustitución repetida no cuenta' : 'sustituciones repetidas no cuentan'} en los minutos.`;

        anunciar(`Partido cerrado. ${aviso ?? 'Ya entra en las estadísticas de temporada.'}`);
        alCerrar(aviso);
      },
      onError: (error) => {
        const mensaje = mensajeDeCierre(error);
        setConfirmando(false);
        setFallo(mensaje);
        anunciar(mensaje);
      },
    });
  };

  return (
    <>
      <Card title="Resultado" headingLevel={2}>
        <div className={styles.bloque}>
          <p>
            Calculado con los eventos aprobados:{' '}
            <span className={styles.dato}>{resultadoEnTexto(calculado)}</span>, a favor delante.
          </p>
          <p className={styles.nota}>
            Escribe el resultado del acta. Si no coincide con el calculado, se avisa y se puede
            cerrar igual.
          </p>
          <div className={styles.acta}>
            <Field
              label="Goles a favor"
              inputMode="numeric"
              required
              maxLength={2}
              autoComplete="off"
              value={formulario.aFavor}
              error={errores.aFavor}
              onChange={(evento) => {
                cambiar({ aFavor: evento.target.value });
              }}
            />
            <Field
              label="Goles en contra"
              inputMode="numeric"
              required
              maxLength={2}
              autoComplete="off"
              value={formulario.enContra}
              error={errores.enContra}
              onChange={(evento) => {
                cambiar({ enContra: evento.target.value });
              }}
            />
          </div>
          {noCuadra ? (
            <p className={styles.aviso}>
              El acta ({resultadoEnTexto(acta)}) no coincide con lo calculado (
              {resultadoEnTexto(calculado)}). Se puede cerrar igual.
            </p>
          ) : null}
        </div>
      </Card>

      <PanelDeEventos partido={partido} eventos={datos.eventos} describir={describir} />

      <Coberturas datos={datos} cerrado={false} />

      <Card title="Este móvil" headingLevel={2}>
        <EsteMovil partidoId={partido.id} />
      </Card>

      <Card title="Origen de los goles" headingLevel={2}>
        <OrigenDeLosGoles datos={datos} describir={describir} aprueba={aprueba} />
      </Card>

      <Card title="Cerrar el partido" headingLevel={2}>
        <div className={styles.bloque}>
          {bloqueos.length > 0 ? (
            <>
              <p className={styles.aviso}>Todavía no se puede cerrar:</p>
              <ul className={styles.motivos}>
                {bloqueos.map((bloqueo) => (
                  <li key={bloqueo}>{bloqueo}</li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <p className={styles.nota}>
                Al cerrar se recalculan los minutos de cada jugador y el partido entra en las
                estadísticas de temporada. Se puede reabrir después.
              </p>
              {faltan.length > 0 ? (
                <p className={styles.nota}>
                  {faltan.length === 1
                    ? `Falta la parte ${String(faltan[0])}: se crea`
                    : `Faltan las partes ${faltan.join(', ')}: se crean`}{' '}
                  con su duración prevista, {String(partido.minutosDeParte)} minutos.
                </p>
              ) : null}
              {cola.isPending ? (
                <p className={styles.nota}>Mirando lo que queda en este móvil…</p>
              ) : (
                <Confirmar
                  texto="Cerrar el partido"
                  pregunta={
                    acta === null
                      ? '¿Cerrar el partido?'
                      : `¿Cerrar el partido con ${resultadoEnTexto(acta)} en el acta?`
                  }
                  si="Sí, cerrar el partido"
                  ocupado={cerrar.isPending}
                  confirmando={confirmando}
                  alCambiar={(valor) => {
                    if (!valor) {
                      setConfirmando(false);
                      return;
                    }

                    const resultado = validarActa(formulario);
                    setErrores(resultado.errores);

                    if (resultado.valores === null) {
                      anunciar('Revisa el resultado del acta');
                      return;
                    }

                    setConfirmando(true);
                  }}
                  alConfirmar={confirmarCierre}
                />
              )}
            </>
          )}
          {fallo === null ? null : <p className={styles.fallo}>{fallo}</p>}
        </div>
      </Card>
    </>
  );
}

interface CerradoProps {
  datos: DatosDelCierre;
  aviso: string | null;
  alReabrir: () => void;
}

/** El partido cerrado: el acta, cuándo se cerró y reabrir (C-05). */
function Cerrado({ datos, aviso, alReabrir }: CerradoProps) {
  const anunciar = useAnnounce();
  const reabrir = useReabrirPartido(datos);
  const [confirmando, setConfirmando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const { partido, calculado } = datos;
  const acta =
    partido.actaAFavor === null || partido.actaEnContra === null
      ? null
      : { aFavor: partido.actaAFavor, enContra: partido.actaEnContra };

  return (
    <>
      <Card title="Resultado" headingLevel={2}>
        <div className={styles.bloque}>
          <p>
            Acta:{' '}
            <span className={styles.dato}>
              {acta === null ? 'sin confirmar' : resultadoEnTexto(acta)}
            </span>
            . Calculado con los eventos aprobados:{' '}
            <span className={styles.dato}>{resultadoEnTexto(calculado)}</span>.
          </p>
          {partido.cerradoEn === null ? null : (
            <p className={styles.nota}>
              Cerrado el{' '}
              <time dateTime={partido.cerradoEn}>{FECHA.format(new Date(partido.cerradoEn))}</time>.
              Entra en las estadísticas de temporada.
            </p>
          )}
          {aviso === null ? null : <p className={styles.aviso}>{aviso}</p>}
        </div>
      </Card>

      <Coberturas datos={datos} cerrado />

      <Card title="Reabrir" headingLevel={2}>
        <div className={styles.bloque}>
          <p className={styles.nota}>
            Reabrirlo lo saca de las estadísticas hasta que se vuelva a cerrar. El acta se conserva
            y queda constancia de quién lo reabrió.
          </p>
          <Confirmar
            texto="Reabrir el partido"
            pregunta="¿Reabrir el partido? Dejará de contar hasta que se cierre otra vez."
            si="Sí, reabrir el partido"
            ocupado={reabrir.isPending}
            confirmando={confirmando}
            alCambiar={setConfirmando}
            alConfirmar={() => {
              setFallo(null);
              reabrir.mutate(undefined, {
                onSuccess: () => {
                  anunciar('Partido reabierto. Ya no cuenta en las estadísticas.');
                  alReabrir();
                },
                onError: (error) => {
                  const mensaje = mensajeDeCierre(error);
                  setConfirmando(false);
                  setFallo(mensaje);
                  anunciar(mensaje);
                },
              });
            }}
          />
          {fallo === null ? null : <p className={styles.fallo}>{fallo}</p>}
        </div>
      </Card>
    </>
  );
}

interface CuerpoProps {
  datos: DatosDelCierre;
  aviso: string | null;
  alCerrar: (aviso: string | null) => void;
  alReabrir: () => void;
}

/** Lo que va debajo del estado: cerrado, todavía no cerrable o abierto. */
function Cuerpo({ datos, aviso, alCerrar, alReabrir }: CuerpoProps) {
  const { partido } = datos;
  const nombre = nombrador(datos.convocatoria);
  const describir: Describir = (evento) =>
    describirEvento(evento, nombre, partido.minutosDeParte, NOMBRES_DE_EVENTO);

  if (partido.status === 'closed') {
    return <Cerrado datos={datos} aviso={aviso} alReabrir={alReabrir} />;
  }

  const motivo = motivoDeEstado(partido);

  if (motivo !== null) {
    return <p className={styles.nota}>{motivo}</p>;
  }

  return <Abierto datos={datos} describir={describir} alCerrar={alCerrar} />;
}

export function CierrePartidoPage() {
  const { id: partidoId = '' } = useParams();
  const cierre = useCierre(partidoId);
  const refEstado = useRef<HTMLParagraphElement>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const titulo =
    cierre.data === undefined || cierre.data === null
      ? 'Cierre del partido'
      : `Cierre del partido contra ${cierre.data.partido.opponentName}`;

  const contenido = () => {
    if (cierre.isPending) {
      return <p className={styles.nota}>Cargando…</p>;
    }

    if (cierre.isError) {
      return (
        <div className={styles.bloque}>
          <p className={styles.nota}>
            No se ha podido cargar el partido. Suele ser falta de cobertura.
          </p>
          <div>
            <Button
              variant="secondary"
              onClick={() => {
                void cierre.refetch();
              }}
            >
              Reintentar
            </Button>
          </div>
        </div>
      );
    }

    if (cierre.data === null) {
      return <p className={styles.nota}>No se encuentra este partido, o no tienes acceso a él.</p>;
    }

    const { partido } = cierre.data;
    const suspension = dondeSeSuspendio(partido);

    return (
      <>
        <div className={styles.bloque}>
          <p className={styles.nota}>
            <time dateTime={partido.kickoffAt}>{FECHA.format(new Date(partido.kickoffAt))}</time>
            {` · ${partido.isHome ? 'En casa' : 'Fuera'} · ${partido.competitionName}`}
          </p>
          {/* Recibe el foco al cerrar y al reabrir: es lo que ha cambiado. */}
          <p ref={refEstado} className={styles.dato} tabIndex={-1}>
            Estado: {NOMBRES_DE_ESTADO[partido.status]}
            {partido.isRetroactive ? ' · en diferido' : null}
            {partido.status === 'suspended' && suspension !== null ? ` · ${suspension}` : null}
          </p>
        </div>
        <Cuerpo
          datos={cierre.data}
          aviso={aviso}
          alCerrar={(nuevo) => {
            setAviso(nuevo);
            refEstado.current?.focus();
          }}
          alReabrir={() => {
            setAviso(null);
            refEstado.current?.focus();
          }}
        />
      </>
    );
  };

  return (
    <Pantalla id="A13" titulo={titulo}>
      <p>
        <Link className={styles.volver} to="/calendario">
          Volver al calendario
        </Link>
      </p>
      {contenido()}
    </Pantalla>
  );
}
