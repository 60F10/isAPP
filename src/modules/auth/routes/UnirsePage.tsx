// «Unirse a un equipo» (T-301c, pantalla A01b, DOC 05 §14.8).
//
// Quien entra con Google y no tiene equipo ni invitación llega aquí. Ve los
// equipos que están en la lista —solo los que quien los lleva ha puesto en
// ella—, sigue el que quiera y, si quiere anotar, pide permisos.
//
// SEGUIR ES INMEDIATO; TENER PERMISOS, NO (decisión I1). «Seguir» no pregunta
// ni espera a nadie, y se deshace con un toque. «Pedir permisos» deja una
// solicitud pendiente y lo dice: ningún texto de esta pantalla promete acceso.
// La aplicación no avisa a nadie, porque no hay notificaciones: quien lleva el
// equipo la ve cuando abre «Personas y permisos».
//
// Sin guardia de permiso: la abre cualquiera con sesión. Lo que cada uno puede
// hacer lo deciden las funciones de la base, y sus mensajes —que ya vienen en
// español— se enseñan tal cual.
//
// De los jugadores no sale nada. De las personas, tampoco: solo equipos.

import { useEffect, useId, useRef, useState } from 'react';

import { useAnnounce } from '@shared/hooks/announceContext';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { Field } from '@shared/ui/Field';
import { Pantalla } from '@shared/ui/Pantalla';

import { useAuth } from '../hooks/authContext';
import {
  useCancelarSolicitud,
  useDejarDeSeguir,
  useEquiposDeLaLista,
  useMisSolicitudes,
  useSeguir,
  useSolicitarAcceso,
} from '../hooks/useSolicitudes';
import {
  diaDe,
  LARGO_MAXIMO_DEL_MENSAJE,
  mensajeDeLaBase,
  NOMBRES_DE_ESTADO,
  validarMensaje,
} from '../model/solicitudes';

import styles from './UnirsePage.module.css';

import type { EquipoDeLaLista, MiSolicitud } from '../model/solicitudes';

const SIN_EQUIPOS =
  'Ningún equipo está en la lista ahora mismo. Pide a quien lleve el tuyo que te invite a este correo.';

/** Qué es ya quien mira para un equipo de la lista. */
type Relacion = 'miembro' | 'seguidor' | 'ninguna';

// ---------------------------------------------------------------------------
// Un equipo de la lista
// ---------------------------------------------------------------------------

interface FilaDeEquipoProps {
  equipo: EquipoDeLaLista;
  relacion: Relacion;
  /** Si ya tiene una solicitud de permisos pendiente en este equipo. */
  pendiente: boolean;
  /** Hay un «Seguir» o un «Dejar de seguir» en marcha, de esta fila o de otra. */
  ocupado: boolean;
  alSeguir: () => void;
  alDejarDeSeguir: () => void;
  alSolicitar: () => void;
}

function FilaDeEquipo({
  equipo,
  relacion,
  pendiente,
  ocupado,
  alSeguir,
  alDejarDeSeguir,
  alSolicitar,
}: FilaDeEquipoProps) {
  const anunciar = useAnnounce();
  const solicitar = useSolicitarAcceso();
  const idAbrir = useId();
  const idMensaje = useId();
  const estado = useRef<HTMLParagraphElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [errorDeMensaje, setErrorDeMensaje] = useState<string | undefined>(undefined);
  const [fallo, setFallo] = useState<string | null>(null);
  // El botón que abre el formulario, el formulario y el aviso de «pendiente»
  // se sustituyen entre sí, y el foco se iría a `body` (2.4.3). Se lleva al
  // campo al abrir, de vuelta al botón al cancelar y al aviso al enviar.
  const moverFoco = useRef<'campo' | 'boton' | 'estado' | null>(null);
  const siguiendo = relacion === 'seguidor';
  const detalle =
    equipo.category === null ? equipo.clubName : `${equipo.clubName} · ${equipo.category}`;

  useEffect(() => {
    const destino = moverFoco.current;
    moverFoco.current = null;

    if (destino === 'campo') {
      document.getElementById(idMensaje)?.focus();
    } else if (destino === 'boton') {
      document.getElementById(idAbrir)?.focus();
    } else if (destino === 'estado') {
      estado.current?.focus();
    }
  }, [abierto, pendiente, idAbrir, idMensaje]);

  const cerrar = () => {
    moverFoco.current = 'boton';
    setAbierto(false);
    setErrorDeMensaje(undefined);
    setFallo(null);
  };

  return (
    <li className={styles.fila}>
      <div className={styles.cabecera}>
        <div className={styles.datos}>
          <span className={styles.nombre}>{equipo.teamName}</span>
          <span className={styles.detalle}>{detalle}</span>
          {siguiendo ? <span className={styles.marca}>Siguiendo</span> : null}
        </div>
        {relacion === 'miembro' ? null : (
          <div className={styles.acciones}>
            {/* Un solo botón que cambia de texto, y no dos que se sustituyen:
                así el foco se queda donde estaba al seguir y al dejar de
                seguir. */}
            <Button
              variant={siguiendo ? 'secondary' : 'primary'}
              aria-label={
                siguiendo ? `Dejar de seguir a ${equipo.teamName}` : `Seguir a ${equipo.teamName}`
              }
              disabled={ocupado}
              onClick={siguiendo ? alDejarDeSeguir : alSeguir}
            >
              {siguiendo ? 'Dejar de seguir' : 'Seguir'}
            </Button>
          </div>
        )}
      </div>

      {relacion === 'miembro' ? (
        <p className={styles.estado}>Ya formas parte de este equipo.</p>
      ) : pendiente ? (
        <p ref={estado} className={styles.estado} tabIndex={-1}>
          Solicitud pendiente. Te tiene que aceptar quien lleva el equipo.
        </p>
      ) : abierto ? (
        <form
          className={styles.formulario}
          aria-label={`Pedir permisos en ${equipo.teamName}`}
          noValidate
          onSubmit={(evento) => {
            evento.preventDefault();
            setFallo(null);

            const resultado = validarMensaje(mensaje);
            setErrorDeMensaje(resultado.error ?? undefined);

            if (resultado.error !== null) {
              anunciar('Revisa el mensaje');
              return;
            }

            solicitar.mutate(
              { teamId: equipo.teamId, mensaje: resultado.mensaje },
              {
                onSuccess: () => {
                  moverFoco.current = 'estado';
                  setAbierto(false);
                  setMensaje('');
                  alSolicitar();
                  anunciar('Solicitud enviada. Te tiene que aceptar quien lleva el equipo.');
                },
                onError: (error) => {
                  const texto = mensajeDeLaBase(error);
                  setFallo(texto);
                  anunciar(texto);
                },
              },
            );
          }}
        >
          <Field
            id={idMensaje}
            label="Di quién eres, para que te reconozcan"
            hint={`Opcional, hasta ${String(LARGO_MAXIMO_DEL_MENSAJE)} caracteres. Lo lee quien lleva el equipo.`}
            type="text"
            autoComplete="off"
            value={mensaje}
            error={errorDeMensaje}
            onChange={(evento) => {
              setMensaje(evento.target.value);
            }}
          />

          {fallo === null ? null : <p className={styles.fallo}>{fallo}</p>}

          <div className={styles.acciones}>
            <Button type="submit" variant="primary" disabled={solicitar.isPending}>
              {solicitar.isPending ? 'Enviando…' : 'Enviar'}
            </Button>
            <Button variant="secondary" onClick={cerrar}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <Button
            id={idAbrir}
            variant="ghost"
            aria-label={`Quiero anotar: pedir permisos en ${equipo.teamName}`}
            onClick={() => {
              moverFoco.current = 'campo';
              setAbierto(true);
            }}
          >
            Quiero anotar: pedir permisos
          </Button>
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Pantalla
// ---------------------------------------------------------------------------

export function UnirsePage() {
  const anunciar = useAnnounce();
  const { teams, reintentarContexto } = useAuth();
  const equipos = useEquiposDeLaLista();
  const solicitudes = useMisSolicitudes();
  // Las mutaciones viven aquí y no en cada fila: al cancelar, la fila de la
  // solicitud cambia, y recargar el contexto vuelve a pintar la lista entera.
  const seguir = useSeguir();
  const dejarDeSeguir = useDejarDeSeguir();
  const cancelar = useCancelarSolicitud();
  const [fallo, setFallo] = useState<string | null>(null);
  const [falloAlCancelar, setFalloAlCancelar] = useState<string | null>(null);
  // Equipos a los que se acaba de pedir permisos desde esta pantalla. Tapa el
  // rato que tarda en volver la lista de solicitudes, para que el equipo diga
  // «pendiente» en cuanto la base contesta y el foco tenga a dónde ir.
  // Guarda, por equipo, las solicitudes que ya había al pedir: la nueva es la
  // que no está entre ellas, y en cuanto `misSolicitudes` la trae, el equipo
  // sale de aquí y manda lo que diga la base (si ya la resolvieron, no sigue
  // diciendo «pendiente»).
  const [recienPedidos, setRecienPedidos] = useState<ReadonlyMap<string, ReadonlySet<string>>>(
    () => new Map(),
  );
  // Equipos que se acaban de seguir desde esta pantalla: la fila dice
  // «Siguiendo» en cuanto la función contesta, sin esperar al contexto.
  const [recienSeguidos, setRecienSeguidos] = useState<ReadonlySet<string>>(() => new Set());
  const tituloDeSolicitudes = useRef<HTMLHeadingElement>(null);

  const relacionCon = (teamId: string): Relacion => {
    const membresia = teams?.find((candidata) => candidata.team.id === teamId);

    if (membresia === undefined) {
      return recienSeguidos.has(teamId) ? 'seguidor' : 'ninguna';
    }

    return membresia.seguidor === true ? 'seguidor' : 'miembro';
  };

  const pendientes = new Set(
    (solicitudes.data ?? [])
      .filter((solicitud) => solicitud.status === 'pending')
      .map((solicitud) => solicitud.teamId),
  );

  /** Si la solicitud que se acaba de pedir a ese equipo aún no ha llegado a la lista. */
  const sinLlegar = (teamId: string): boolean => {
    const vistas = recienPedidos.get(teamId);

    if (vistas === undefined) {
      return false;
    }

    return !(solicitudes.data ?? []).some(
      (solicitud) => solicitud.teamId === teamId && !vistas.has(solicitud.id),
    );
  };

  /** El nombre sale de la lista, y si el equipo ya no está en ella, de los propios. */
  const nombreDelEquipo = (teamId: string): string => {
    const deLaLista = equipos.data?.find((equipo) => equipo.teamId === teamId);

    if (deLaLista !== undefined) {
      return deLaLista.teamName;
    }

    const propio = teams?.find((candidata) => candidata.team.id === teamId);

    return propio === undefined ? 'Un equipo que ya no está en la lista' : propio.team.name;
  };

  const alFallar = (error: unknown) => {
    const texto = mensajeDeLaBase(error);
    setFallo(texto);
    anunciar(texto);
  };

  const cancelarSolicitud = (solicitud: MiSolicitud, equipo: string) => {
    setFalloAlCancelar(null);
    cancelar.mutate(solicitud.id, {
      onSuccess: () => {
        setRecienPedidos((antes) => {
          const siguiente = new Map(antes);
          siguiente.delete(solicitud.teamId);

          return siguiente;
        });
        // El botón se va con la solicitud cancelada (2.4.3).
        tituloDeSolicitudes.current?.focus();
        anunciar(`Solicitud a ${equipo} cancelada`);
      },
      onError: (error) => {
        const texto = mensajeDeLaBase(error);
        setFalloAlCancelar(texto);
        anunciar(texto);
      },
    });
  };

  // Las solicitudes esperan a la lista de equipos, que es de donde sale el
  // nombre: sin ella, cada fila diría un instante «un equipo que ya no está».
  const misSolicitudes = equipos.isPending ? [] : (solicitudes.data ?? []);

  return (
    <Pantalla id="A01b" titulo="Unirse a un equipo">
      <p className={styles.nota}>
        Seguir a un equipo es inmediato: ves su calendario y sus resultados. Para anotar hacen falta
        permisos, y los da quien lleva el equipo.
      </p>

      {misSolicitudes.length === 0 ? null : (
        <Card title="Mis solicitudes" headingLevel={2} headingRef={tituloDeSolicitudes}>
          <ul className={styles.lista}>
            {misSolicitudes.map((solicitud) => {
              const equipo = nombreDelEquipo(solicitud.teamId);

              return (
                <li key={solicitud.id} className={styles.fila}>
                  <div className={styles.cabecera}>
                    <div className={styles.datos}>
                      <span className={styles.nombre}>{equipo}</span>
                      <span className={styles.detalle}>
                        {NOMBRES_DE_ESTADO[solicitud.status]} · Pedida el{' '}
                        {diaDe(solicitud.createdAt)}
                      </span>
                    </div>
                    {solicitud.status === 'pending' ? (
                      <div className={styles.acciones}>
                        <Button
                          variant="secondary"
                          aria-label={`Cancelar la solicitud a ${equipo}`}
                          disabled={cancelar.isPending}
                          onClick={() => {
                            cancelarSolicitud(solicitud, equipo);
                          }}
                        >
                          {cancelar.isPending && cancelar.variables === solicitud.id
                            ? 'Cancelando…'
                            : 'Cancelar'}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          {falloAlCancelar === null ? null : <p className={styles.fallo}>{falloAlCancelar}</p>}
        </Card>
      )}

      <Card title="Equipos" headingLevel={2}>
        {equipos.isPending ? (
          <p className={styles.nota}>Cargando…</p>
        ) : equipos.isError ? (
          <div className={styles.bloque}>
            <p className={styles.nota}>
              No se ha podido cargar la lista de equipos. Suele ser falta de cobertura.
            </p>
            <div>
              <Button
                variant="secondary"
                onClick={() => {
                  void equipos.refetch();
                }}
              >
                Reintentar
              </Button>
            </div>
          </div>
        ) : equipos.data.length === 0 ? (
          <p className={styles.nota}>{SIN_EQUIPOS}</p>
        ) : (
          <div className={styles.bloque}>
            <ul className={styles.lista}>
              {equipos.data.map((equipo) => (
                <FilaDeEquipo
                  key={equipo.teamId}
                  equipo={equipo}
                  relacion={relacionCon(equipo.teamId)}
                  pendiente={pendientes.has(equipo.teamId) || sinLlegar(equipo.teamId)}
                  ocupado={seguir.isPending || dejarDeSeguir.isPending}
                  alSeguir={() => {
                    setFallo(null);
                    seguir.mutate(equipo.teamId, {
                      onSuccess: () => {
                        setRecienSeguidos((antes) => new Set(antes).add(equipo.teamId));
                        // El equipo aparece en el resto de la aplicación sin
                        // recargar la página.
                        reintentarContexto();
                        anunciar(`Ya sigues a ${equipo.teamName}`);
                      },
                      onError: alFallar,
                    });
                  }}
                  alDejarDeSeguir={() => {
                    setFallo(null);
                    dejarDeSeguir.mutate(equipo.teamId, {
                      onSuccess: () => {
                        setRecienSeguidos((antes) => {
                          const siguiente = new Set(antes);
                          siguiente.delete(equipo.teamId);

                          return siguiente;
                        });
                        reintentarContexto();
                        anunciar(`Has dejado de seguir a ${equipo.teamName}`);
                      },
                      onError: alFallar,
                    });
                  }}
                  alSolicitar={() => {
                    const vistas = new Set(
                      (solicitudes.data ?? [])
                        .filter((solicitud) => solicitud.teamId === equipo.teamId)
                        .map((solicitud) => solicitud.id),
                    );

                    setRecienPedidos((antes) => new Map(antes).set(equipo.teamId, vistas));
                  }}
                />
              ))}
            </ul>
            {fallo === null ? null : <p className={styles.fallo}>{fallo}</p>}
          </div>
        )}
      </Card>
    </Pantalla>
  );
}
