// Pantalla A07 — Personas y permisos (T-301b, DOC 04 §15).
//
// Quien tiene `members.manage` ve a los miembros del equipo, les cambia el rol
// y los permisos, los da de baja y los reactiva, e invita a un correo. No se
// borra a nadie y no se envía ningún correo: la invitación se casa con la
// cuenta de Google de quien entra, que la acepta en Inicio.
//
// LA GUARDIA DE LA RUTA MIRA EL EQUIPO ACTIVO, y aquí se comprueba además que
// el `:id` sea un equipo de las membresías del usuario. Quién puede escribir
// lo decide la base, equipo por equipo: esta pantalla solo deja de ofrecerlo.
//
// DOS COSAS QUE NADIE SE HACE A SÍ MISMO: quitarse `members.manage` y darse de
// baja. Van desactivadas con el motivo escrito. La base no lo impide (DOC 05
// §14.8, «Lo que no hace»), así que es esta pantalla la que evita que alguien
// se cierre la puerta por un toque de más.
//
// El nombre del equipo sale de las membresías de `useAuth()`: `auth` no puede
// importar de `core` (DOC 06 §4.2).
//
// DESDE LA T-301C, TRES TARJETAS MÁS (DOC 05 §14.8). «Solicitudes de
// permisos», que solo sale si hay alguna y entonces es la primera: aceptar
// pide rol y permisos, y va por `resolver_solicitud`. «Seguidores», que se
// quitan borrando su fila. Y la casilla que pone al equipo en la lista, que
// escribe `teams.accepts_requests` y solo sale con `team.manage`, que es lo
// que pide la política de `teams`. No hay avisos: una solicitud solo se ve al
// abrir esta pantalla.
//
// Quien solo SIGUE al equipo no entra aquí: su membresía no cuenta.

import { useEffect, useId, useRef, useState } from 'react';

import type { RefObject } from 'react';
import { useParams } from 'react-router';

import { useAnnounce } from '@shared/hooks/announceContext';
import { useAhora } from '@shared/hooks/useAhora';
import { mensajeDeErrorAlGuardar } from '@shared/lib/guardado';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { Field } from '@shared/ui/Field';
import { GrupoDeOpciones } from '@shared/ui/GrupoDeOpciones';
import { Pantalla } from '@shared/ui/Pantalla';

import { useAuth } from '../hooks/authContext';
import {
  useCambiarActivo,
  useGuardarMiembro,
  useInvitaciones,
  useInvitar,
  useMiembros,
  useRevocarInvitacion,
} from '../hooks/usePersonas';
import {
  useEnLaLista,
  useGuardarEnLaLista,
  useQuitarSeguidor,
  useResolverSolicitud,
  useSeguidoresDelEquipo,
  useSolicitudesDelEquipo,
} from '../hooks/useSolicitudes';
import {
  cambiosDePermisos,
  DESCRIPCION_DE_PERMISO,
  enOrden,
  NOMBRES_DE_ROL,
  nombreDeMiembro,
  PERMISOS,
  PLANTILLAS_DE_ROL,
  ROLES,
  textoDePermisos,
  validarInvitacion,
} from '../model/personas';

import { diaDe, mensajeDeLaBase, nombreDePersona } from '../model/solicitudes';

import styles from './PersonasPage.module.css';

import type { Decision } from '../api/solicitudes';
import type { Invitacion, Miembro } from '../model/personas';
import type { AppPermission, TeamRole } from '../model/permissions';
import type { Seguidor, SolicitudRecibida } from '../model/solicitudes';

const OPCIONES_DE_ROL = ROLES.map((rol) => ({ valor: rol, etiqueta: NOMBRES_DE_ROL[rol] }));

const REPETIDA = 'Ya hay una invitación pendiente para ese correo.';

// ---------------------------------------------------------------------------
// Estados de carga. `auth` no importa de `core`, así que no usa los suyos.
// ---------------------------------------------------------------------------

function Cargando() {
  return <p className={styles.nota}>Cargando…</p>;
}

interface ErrorDeCargaProps {
  /** Qué no se ha podido cargar, en minúscula: «los miembros». */
  que: string;
  onReintentar: () => void;
}

function ErrorDeCarga({ que, onReintentar }: ErrorDeCargaProps) {
  return (
    <div className={styles.bloque}>
      <p className={styles.nota}>No se ha podido cargar {que}. Suele ser falta de cobertura.</p>
      <div>
        <Button variant="secondary" onClick={onReintentar}>
          Reintentar
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Las doce casillas, comunes a editar un miembro y a invitar
// ---------------------------------------------------------------------------

interface CasillasDePermisosProps {
  marcados: ReadonlySet<AppPermission>;
  alCambiar: (permiso: AppPermission, marcado: boolean) => void;
  /** Permiso que no se puede tocar, con su motivo escrito debajo. */
  bloqueado?: { permiso: AppPermission; motivo: string };
}

function CasillasDePermisos({ marcados, alCambiar, bloqueado }: CasillasDePermisosProps) {
  const base = useId();

  return (
    <fieldset className={styles.grupo}>
      <legend className={styles.leyenda}>Permisos</legend>
      {PERMISOS.map((permiso) => {
        const id = `${base}-${permiso}`;
        const fijo = bloqueado !== undefined && bloqueado.permiso === permiso;

        return (
          <div key={permiso} className={styles.permiso}>
            <label className={styles.opcion} htmlFor={id}>
              <input
                id={id}
                className={styles.casilla}
                type="checkbox"
                checked={marcados.has(permiso)}
                disabled={fijo}
                aria-describedby={fijo ? `${id}-motivo` : undefined}
                onChange={(evento) => {
                  alCambiar(permiso, evento.target.checked);
                }}
              />
              <span>{DESCRIPCION_DE_PERMISO[permiso]}</span>
            </label>
            {fijo ? (
              <p id={`${id}-motivo`} className={styles.motivo}>
                {bloqueado.motivo}
              </p>
            ) : null}
          </div>
        );
      })}
    </fieldset>
  );
}

/** Marca o desmarca un permiso sin tocar el conjunto anterior. */
function conCambio(
  marcados: ReadonlySet<AppPermission>,
  permiso: AppPermission,
  marcado: boolean,
): Set<AppPermission> {
  const siguiente = new Set(marcados);

  if (marcado) {
    siguiente.add(permiso);
  } else {
    siguiente.delete(permiso);
  }

  return siguiente;
}

// ---------------------------------------------------------------------------
// Un miembro, que se abre en su sitio para editar
// ---------------------------------------------------------------------------

interface FilaMiembroProps {
  miembro: Miembro;
  /** Si la fila es la de quien está usando la pantalla. */
  esUnoMismo: boolean;
}

function FilaMiembro({ miembro, esUnoMismo }: FilaMiembroProps) {
  const anunciar = useAnnounce();
  const guardar = useGuardarMiembro();
  const cambiarActivo = useCambiarActivo();
  const idAccion = useId();
  const idFormulario = useId();
  const idMotivoBaja = useId();
  const nombre = nombreDeMiembro(miembro);
  const [editando, setEditando] = useState(false);
  // Al cerrar la edición, el foco vuelve al botón que la abrió (2.4.3).
  const devolverFoco = useRef(false);
  const [rol, setRol] = useState<TeamRole>(miembro.role);
  const [marcados, setMarcados] = useState<ReadonlySet<AppPermission>>(
    () => new Set(miembro.permisos),
  );
  const [confirmandoBaja, setConfirmandoBaja] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const ocupado = guardar.isPending || cambiarActivo.isPending;

  useEffect(() => {
    if (editando) {
      document.getElementById(idFormulario)?.focus();
    } else if (devolverFoco.current) {
      devolverFoco.current = false;
      document.getElementById(idAccion)?.focus();
    }
  }, [editando, idFormulario, idAccion]);

  const cerrar = () => {
    devolverFoco.current = true;
    setEditando(false);
    setConfirmandoBaja(false);
    setFallo(null);
  };

  const alFallar = (error: unknown) => {
    const mensaje = mensajeDeErrorAlGuardar(error);
    setFallo(mensaje);
    anunciar(mensaje);
  };

  if (!editando) {
    return (
      <li className={styles.fila}>
        <div className={styles.datos}>
          <span className={styles.nombre}>
            {nombre}
            {esUnoMismo ? <span className={styles.detalle}> (tú)</span> : null}
          </span>
          <span className={styles.detalle}>
            {NOMBRES_DE_ROL[miembro.role]} · {textoDePermisos(miembro.permisos.length)}
          </span>
          {miembro.activo ? null : <span className={styles.marca}>De baja</span>}
          {fallo === null ? null : <span className={styles.fallo}>{fallo}</span>}
        </div>
        <div className={styles.acciones}>
          {miembro.activo ? (
            <Button
              id={idAccion}
              variant="secondary"
              aria-label={`Editar a ${nombre}`}
              onClick={() => {
                setRol(miembro.role);
                setMarcados(new Set(miembro.permisos));
                setFallo(null);
                setEditando(true);
              }}
            >
              Editar
            </Button>
          ) : (
            <Button
              id={idAccion}
              variant="secondary"
              aria-label={`Reactivar a ${nombre}`}
              disabled={ocupado}
              onClick={() => {
                setFallo(null);
                cambiarActivo.mutate(
                  { teamMemberId: miembro.teamMemberId, activo: true },
                  {
                    onSuccess: () => {
                      anunciar(`${nombre} reactivado`);
                    },
                    onError: alFallar,
                  },
                );
              }}
            >
              {cambiarActivo.isPending ? 'Reactivando…' : 'Reactivar'}
            </Button>
          )}
        </div>
      </li>
    );
  }

  return (
    <li className={styles.fila}>
      <form
        id={idFormulario}
        className={styles.formulario}
        aria-label={`Editar a ${nombre}`}
        tabIndex={-1}
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault();
          setFallo(null);

          const cambios = cambiosDePermisos(miembro.permisos, marcados);
          const rolNuevo = rol === miembro.role ? null : rol;

          if (rolNuevo === null && cambios.altas.length === 0 && cambios.bajas.length === 0) {
            cerrar();
            return;
          }

          guardar.mutate(
            { teamMemberId: miembro.teamMemberId, role: rolNuevo, cambios },
            {
              onSuccess: () => {
                anunciar(`${nombre} guardado`);
                cerrar();
              },
              onError: alFallar,
            },
          );
        }}
      >
        <p className={styles.nombre}>{nombre}</p>

        <GrupoDeOpciones leyenda="Rol" opciones={OPCIONES_DE_ROL} valor={rol} alCambiar={setRol} />

        <div>
          <Button
            variant="secondary"
            onClick={() => {
              const plantilla = new Set(PLANTILLAS_DE_ROL[rol]);

              // Ni la plantilla le quita a uno mismo la llave de esta pantalla.
              if (esUnoMismo && marcados.has('members.manage')) {
                plantilla.add('members.manage');
              }

              setMarcados(plantilla);
              anunciar(`Marcados los permisos de ${NOMBRES_DE_ROL[rol].toLowerCase()}`);
            }}
          >
            Poner los permisos de su rol
          </Button>
        </div>

        <CasillasDePermisos
          marcados={marcados}
          alCambiar={(permiso, marcado) => {
            setMarcados((antes) => conCambio(antes, permiso, marcado));
          }}
          bloqueado={
            esUnoMismo
              ? {
                  permiso: 'members.manage',
                  motivo:
                    'No puedes quitarte este permiso a ti mismo: te quedarías sin poder entrar en esta pantalla.',
                }
              : undefined
          }
        />

        {fallo === null ? null : <p className={styles.fallo}>{fallo}</p>}

        <div className={styles.acciones}>
          <Button type="submit" variant="primary" disabled={ocupado}>
            {guardar.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
          <Button variant="secondary" onClick={cerrar}>
            Cancelar
          </Button>
        </div>

        <div className={styles.zonaDeBaja}>
          {confirmandoBaja ? (
            <>
              <p className={styles.nota}>
                ¿Dar de baja a {nombre}? Dejará de entrar en el equipo. No se borra nada de lo que
                ha apuntado, y se puede reactivar después.
              </p>
              <div className={styles.acciones}>
                <Button
                  variant="primary"
                  disabled={ocupado}
                  onClick={() => {
                    setFallo(null);
                    cambiarActivo.mutate(
                      { teamMemberId: miembro.teamMemberId, activo: false },
                      {
                        onSuccess: () => {
                          anunciar(`${nombre} dado de baja`);
                          cerrar();
                        },
                        onError: alFallar,
                      },
                    );
                  }}
                >
                  {cambiarActivo.isPending ? 'Dando de baja…' : 'Sí, dar de baja'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setConfirmandoBaja(false);
                  }}
                >
                  No, dejarlo
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <Button
                  variant="ghost"
                  disabled={esUnoMismo || ocupado}
                  aria-describedby={esUnoMismo ? idMotivoBaja : undefined}
                  onClick={() => {
                    setConfirmandoBaja(true);
                  }}
                >
                  Dar de baja
                </Button>
              </div>
              {esUnoMismo ? (
                <p id={idMotivoBaja} className={styles.motivo}>
                  No puedes darte de baja a ti mismo. Si dejas el equipo, que te dé de baja otra
                  persona con este permiso.
                </p>
              ) : null}
            </>
          )}
        </div>
      </form>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Tarjeta «Miembros»
// ---------------------------------------------------------------------------

interface DeEquipoProps {
  teamId: string;
}

function Miembros({ teamId }: DeEquipoProps) {
  const { session } = useAuth();
  const miembros = useMiembros(teamId);
  const yo = session === null ? null : session.user.id;

  if (miembros.isPending) {
    return <Cargando />;
  }

  if (miembros.isError) {
    return (
      <ErrorDeCarga
        que="los miembros"
        onReintentar={() => {
          void miembros.refetch();
        }}
      />
    );
  }

  if (miembros.data.length === 0) {
    return <p className={styles.nota}>Este equipo todavía no tiene a nadie.</p>;
  }

  return (
    <ul className={styles.lista}>
      {miembros.data.map((miembro) => (
        <FilaMiembro
          key={miembro.teamMemberId}
          miembro={miembro}
          esUnoMismo={miembro.userId === yo}
        />
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Tarjeta «Invitar»
// ---------------------------------------------------------------------------

/** Espectador: quien invita con prisa da lo mínimo, no lo máximo. */
const ROL_AL_INVITAR: TeamRole = 'spectator';

function Invitar({ teamId }: DeEquipoProps) {
  const anunciar = useAnnounce();
  const invitar = useInvitar(teamId);
  const [correo, setCorreo] = useState('');
  const [rol, setRol] = useState<TeamRole>(ROL_AL_INVITAR);
  const [marcados, setMarcados] = useState<ReadonlySet<AppPermission>>(
    () => new Set(PLANTILLAS_DE_ROL[ROL_AL_INVITAR]),
  );
  const [errorDeCorreo, setErrorDeCorreo] = useState<string | undefined>(undefined);
  const [fallo, setFallo] = useState<string | null>(null);
  const [guardada, setGuardada] = useState(false);
  // `navigator.share` no existe en el escritorio ni fuera de HTTPS.
  const sePuedeCompartir = typeof navigator.share === 'function';

  return (
    <form
      className={styles.formulario}
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault();
        setFallo(null);
        setGuardada(false);

        const resultado = validarInvitacion(correo);
        setErrorDeCorreo(resultado.error ?? undefined);

        if (resultado.email === null) {
          anunciar('Revisa el correo');
          return;
        }

        invitar.mutate(
          { email: resultado.email, role: rol, permissions: enOrden(marcados) },
          {
            onSuccess: () => {
              setCorreo('');
              setGuardada(true);
              anunciar('Invitación guardada');
            },
            onError: (error) => {
              const mensaje = mensajeDeErrorAlGuardar(error, REPETIDA);
              setFallo(mensaje);
              anunciar(mensaje);
            },
          },
        );
      }}
    >
      {/* `type="text"` con teclado de correo: un `type="email"` controlado se
          come los espacios a su manera y descoloca el cursor al escribir. */}
      <Field
        label="Correo"
        hint="El de su cuenta de Google. No se le envía ningún correo."
        required
        type="text"
        inputMode="email"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        value={correo}
        error={errorDeCorreo}
        onChange={(evento) => {
          setCorreo(evento.target.value);
        }}
      />

      <GrupoDeOpciones
        leyenda="Rol"
        opciones={OPCIONES_DE_ROL}
        valor={rol}
        alCambiar={(nuevo) => {
          // Los permisos nacen con la plantilla del rol; después se cambian.
          setRol(nuevo);
          setMarcados(new Set(PLANTILLAS_DE_ROL[nuevo]));
        }}
      />

      <CasillasDePermisos
        marcados={marcados}
        alCambiar={(permiso, marcado) => {
          setMarcados((antes) => conCambio(antes, permiso, marcado));
        }}
      />

      {fallo === null ? null : <p className={styles.fallo}>{fallo}</p>}

      <div>
        <Button type="submit" variant="primary" iconStart="plus" disabled={invitar.isPending}>
          {invitar.isPending ? 'Guardando…' : 'Invitar'}
        </Button>
      </div>

      {guardada ? (
        <div className={styles.bloque}>
          <p className={styles.hecho}>
            Invitación guardada. Dile que entre en la aplicación con esa cuenta de Google: la verá
            en Inicio.
          </p>
          {sePuedeCompartir ? (
            <div>
              <Button
                variant="secondary"
                onClick={() => {
                  // Cancelar la hoja de compartir rechaza la promesa: no es un
                  // fallo y no hay nada que decir.
                  navigator
                    .share({
                      title: 'GavetaStats',
                      text: 'Entra con tu cuenta de Google: verás la invitación al equipo en Inicio.',
                      url: window.location.origin,
                    })
                    .catch(() => undefined);
                }}
              >
                Compartir enlace
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Tarjeta «Invitaciones pendientes»
// ---------------------------------------------------------------------------

function textoDeCaducidad(invitacion: Invitacion, ahora: number): string {
  const caduca = new Date(invitacion.expiresAt);
  const dia = caduca.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

  return caduca.getTime() <= ahora ? `Caducó el ${dia}` : `Caduca el ${dia}`;
}

function InvitacionesDelEquipo({ teamId }: DeEquipoProps) {
  const anunciar = useAnnounce();
  const invitaciones = useInvitaciones(teamId);
  // La mutación vive aquí y no en cada fila: al revocar, la fila desaparece, y
  // una mutación cuyo componente se desmonta pierde sus `onSuccess`.
  const revocar = useRevocarInvitacion(teamId);
  const [fallo, setFallo] = useState<string | null>(null);
  // La hora de abrir la pantalla basta: aquí solo separa «caduca» de «caducó».
  const ahora = useAhora(false);

  if (invitaciones.isPending) {
    return <Cargando />;
  }

  if (invitaciones.isError) {
    return (
      <ErrorDeCarga
        que="las invitaciones"
        onReintentar={() => {
          void invitaciones.refetch();
        }}
      />
    );
  }

  return (
    <>
      {invitaciones.data.length === 0 ? (
        <p className={styles.nota}>No hay invitaciones pendientes.</p>
      ) : (
        <ul className={styles.lista}>
          {invitaciones.data.map((invitacion) => (
            <li key={invitacion.id} className={styles.fila}>
              <div className={styles.datos}>
                <span className={styles.nombre}>{invitacion.email}</span>
                <span className={styles.detalle}>
                  {NOMBRES_DE_ROL[invitacion.role]} · {textoDePermisos(invitacion.permisos.length)}
                </span>
                <span className={styles.detalle}>{textoDeCaducidad(invitacion, ahora)}</span>
              </div>
              <div className={styles.acciones}>
                <Button
                  variant="secondary"
                  aria-label={`Revocar la invitación de ${invitacion.email}`}
                  disabled={revocar.isPending}
                  onClick={() => {
                    setFallo(null);
                    revocar.mutate(invitacion.id, {
                      onSuccess: () => {
                        anunciar(`Invitación de ${invitacion.email} revocada`);
                      },
                      onError: (error) => {
                        const mensaje = mensajeDeErrorAlGuardar(error);
                        setFallo(mensaje);
                        anunciar(mensaje);
                      },
                    });
                  }}
                >
                  {revocar.isPending && revocar.variables === invitacion.id
                    ? 'Revocando…'
                    : 'Revocar'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {fallo === null ? null : <p className={styles.fallo}>{fallo}</p>}
    </>
  );
}

// ---------------------------------------------------------------------------
// Tarjeta «Solicitudes de permisos» (T-301c)
// ---------------------------------------------------------------------------

interface FilaSolicitudProps {
  solicitud: SolicitudRecibida;
  ocupado: boolean;
  alResolver: (decision: Decision) => void;
}

function FilaSolicitud({ solicitud, ocupado, alResolver }: FilaSolicitudProps) {
  const idAceptar = useId();
  const idRechazar = useId();
  const idFormulario = useId();
  const pregunta = useRef<HTMLParagraphElement>(null);
  const nombre = nombreDePersona(solicitud.nombre);
  const [modo, setModo] = useState<'cerrada' | 'aceptando' | 'rechazando'>('cerrada');
  const [rol, setRol] = useState<TeamRole>(ROL_AL_INVITAR);
  const [marcados, setMarcados] = useState<ReadonlySet<AppPermission>>(
    () => new Set(PLANTILLAS_DE_ROL[ROL_AL_INVITAR]),
  );
  // Los botones, el formulario y la pregunta se sustituyen entre sí, y el foco
  // se iría a `body` (2.4.3): va a lo que se abre y vuelve al botón que lo
  // abrió.
  const volverA = useRef<string | null>(null);

  useEffect(() => {
    if (modo === 'aceptando') {
      document.getElementById(idFormulario)?.focus();
    } else if (modo === 'rechazando') {
      pregunta.current?.focus();
    } else if (volverA.current !== null) {
      document.getElementById(volverA.current)?.focus();
      volverA.current = null;
    }
  }, [modo, idFormulario]);

  const datos = (
    <div className={styles.datos}>
      <span className={styles.nombre}>{nombre}</span>
      <span className={styles.detalle}>Lo pidió el {diaDe(solicitud.createdAt)}</span>
      {solicitud.mensaje === null ? null : <p className={styles.mensaje}>«{solicitud.mensaje}»</p>}
    </div>
  );

  if (modo === 'aceptando') {
    return (
      <li className={styles.fila}>
        <form
          id={idFormulario}
          className={styles.formulario}
          aria-label={`Aceptar a ${nombre}`}
          tabIndex={-1}
          noValidate
          onSubmit={(evento) => {
            evento.preventDefault();
            alResolver({ aprobar: true, role: rol, permissions: enOrden(marcados) });
          }}
        >
          {datos}

          <GrupoDeOpciones
            leyenda="Rol"
            opciones={OPCIONES_DE_ROL}
            valor={rol}
            alCambiar={(nuevo) => {
              // Los permisos nacen con la plantilla del rol; después se cambian.
              setRol(nuevo);
              setMarcados(new Set(PLANTILLAS_DE_ROL[nuevo]));
            }}
          />

          <CasillasDePermisos
            marcados={marcados}
            alCambiar={(permiso, marcado) => {
              setMarcados((antes) => conCambio(antes, permiso, marcado));
            }}
          />

          <div className={styles.acciones}>
            <Button type="submit" variant="primary" disabled={ocupado}>
              {ocupado ? 'Aceptando…' : 'Aceptar con estos permisos'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                volverA.current = idAceptar;
                setModo('cerrada');
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={styles.fila}>
      {datos}
      {modo === 'rechazando' ? (
        <div className={styles.confirmar}>
          <p ref={pregunta} className={styles.pregunta} tabIndex={-1}>
            ¿Rechazar la solicitud de {nombre}? Podrá seguir al equipo igualmente, y volver a pedir
            permisos pasados unos días.
          </p>
          <div className={styles.acciones}>
            <Button
              variant="primary"
              disabled={ocupado}
              onClick={() => {
                alResolver({ aprobar: false });
              }}
            >
              {ocupado ? 'Rechazando…' : 'Sí, rechazar'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                volverA.current = idRechazar;
                setModo('cerrada');
              }}
            >
              No, dejarla
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.acciones}>
          <Button
            id={idAceptar}
            variant="primary"
            aria-label={`Aceptar a ${nombre}`}
            disabled={ocupado}
            onClick={() => {
              setModo('aceptando');
            }}
          >
            Aceptar
          </Button>
          <Button
            id={idRechazar}
            variant="secondary"
            aria-label={`Rechazar a ${nombre}`}
            disabled={ocupado}
            onClick={() => {
              setModo('rechazando');
            }}
          >
            Rechazar
          </Button>
        </div>
      )}
    </li>
  );
}

interface SolicitudesProps extends DeEquipoProps {
  /** A dónde va el foco cuando se resuelve la última y la tarjeta desaparece. */
  focoAlVaciarse: RefObject<HTMLHeadingElement | null>;
}

/**
 * SIN SOLICITUDES NO PINTA NADA, ni el título: es lo normal casi siempre.
 * Tampoco mientras carga ni si la consulta falla: es un aviso, y el resto de
 * la pantalla no depende de él.
 */
function Solicitudes({ teamId, focoAlVaciarse }: SolicitudesProps) {
  const anunciar = useAnnounce();
  const solicitudes = useSolicitudesDelEquipo(teamId);
  // La mutación vive aquí y no en cada fila: al resolver, la fila desaparece.
  const resolver = useResolverSolicitud(teamId);
  const titulo = useRef<HTMLHeadingElement>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  // La fila resuelta se lleva el foco con ella (2.4.3): pasa al título de esta
  // tarjeta, o al de «Miembros» si era la última.
  const recolocarFoco = useRef(false);
  const cuantas = solicitudes.data === undefined ? 0 : solicitudes.data.length;

  useEffect(() => {
    if (!recolocarFoco.current) {
      return;
    }

    recolocarFoco.current = false;
    (cuantas === 0 ? focoAlVaciarse.current : titulo.current)?.focus();
  }, [cuantas, focoAlVaciarse]);

  if (solicitudes.data === undefined || solicitudes.data.length === 0) {
    return null;
  }

  return (
    <Card title="Solicitudes de permisos" headingLevel={2} headingRef={titulo}>
      <p className={styles.nota}>
        Personas que quieren anotar en este equipo. Hasta que aceptes, no tienen ningún permiso.
      </p>
      <ul className={styles.lista}>
        {solicitudes.data.map((solicitud) => {
          const nombre = nombreDePersona(solicitud.nombre);

          return (
            <FilaSolicitud
              key={solicitud.id}
              solicitud={solicitud}
              ocupado={resolver.isPending}
              alResolver={(decision) => {
                setFallo(null);
                resolver.mutate(
                  { requestId: solicitud.id, decision },
                  {
                    onSuccess: () => {
                      recolocarFoco.current = true;
                      anunciar(
                        decision.aprobar
                          ? `${nombre} ya forma parte del equipo`
                          : `Solicitud de ${nombre} rechazada`,
                      );
                    },
                    onError: (error) => {
                      const mensaje = mensajeDeLaBase(error);
                      setFallo(mensaje);
                      anunciar(mensaje);
                    },
                  },
                );
              }}
            />
          );
        })}
      </ul>
      {fallo === null ? null : <p className={styles.fallo}>{fallo}</p>}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tarjeta «Seguidores» (T-301c)
// ---------------------------------------------------------------------------

interface FilaSeguidorProps {
  seguidor: Seguidor;
  ocupado: boolean;
  alQuitar: () => void;
}

function FilaSeguidor({ seguidor, ocupado, alQuitar }: FilaSeguidorProps) {
  const idQuitar = useId();
  const pregunta = useRef<HTMLParagraphElement>(null);
  const nombre = nombreDePersona(seguidor.nombre);
  const [confirmando, setConfirmando] = useState(false);
  const preguntado = useRef(false);

  useEffect(() => {
    if (confirmando) {
      preguntado.current = true;
      pregunta.current?.focus();
    } else if (preguntado.current) {
      preguntado.current = false;
      document.getElementById(idQuitar)?.focus();
    }
  }, [confirmando, idQuitar]);

  return (
    <li className={styles.fila}>
      <div className={styles.datos}>
        <span className={styles.nombre}>{nombre}</span>
        <span className={styles.detalle}>Sigue al equipo desde el {diaDe(seguidor.createdAt)}</span>
      </div>
      {confirmando ? (
        <div className={styles.confirmar}>
          <p ref={pregunta} className={styles.pregunta} tabIndex={-1}>
            ¿Quitar a {nombre} de los seguidores? Podrá volver a seguir mientras el equipo esté en
            la lista.
          </p>
          <div className={styles.acciones}>
            <Button variant="primary" disabled={ocupado} onClick={alQuitar}>
              {ocupado ? 'Quitando…' : 'Sí, quitar'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setConfirmando(false);
              }}
            >
              No, dejarlo
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.acciones}>
          <Button
            id={idQuitar}
            variant="secondary"
            aria-label={`Quitar a ${nombre}`}
            disabled={ocupado}
            onClick={() => {
              setConfirmando(true);
            }}
          >
            Quitar
          </Button>
        </div>
      )}
    </li>
  );
}

function Seguidores({ teamId }: DeEquipoProps) {
  const anunciar = useAnnounce();
  const seguidores = useSeguidoresDelEquipo(teamId);
  // La mutación vive aquí y no en cada fila: al quitar, la fila desaparece.
  const quitar = useQuitarSeguidor(teamId);
  const titulo = useRef<HTMLHeadingElement>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const recolocarFoco = useRef(false);
  const cuantos = seguidores.data === undefined ? 0 : seguidores.data.length;

  useEffect(() => {
    if (recolocarFoco.current) {
      recolocarFoco.current = false;
      titulo.current?.focus();
    }
  }, [cuantos]);

  return (
    <Card title="Seguidores" headingLevel={2} headingRef={titulo}>
      {seguidores.isPending ? (
        <Cargando />
      ) : seguidores.isError ? (
        <ErrorDeCarga
          que="los seguidores"
          onReintentar={() => {
            void seguidores.refetch();
          }}
        />
      ) : seguidores.data.length === 0 ? (
        <p className={styles.nota}>
          Nadie sigue a este equipo. Quien lo sigue ve el calendario y los resultados, y no puede
          tocar nada.
        </p>
      ) : (
        <ul className={styles.lista}>
          {seguidores.data.map((seguidor) => (
            <FilaSeguidor
              key={seguidor.userId}
              seguidor={seguidor}
              ocupado={quitar.isPending}
              alQuitar={() => {
                setFallo(null);
                quitar.mutate(seguidor.userId, {
                  onSuccess: () => {
                    recolocarFoco.current = true;
                    anunciar(`${nombreDePersona(seguidor.nombre)} ya no sigue al equipo`);
                  },
                  onError: (error) => {
                    const mensaje = mensajeDeErrorAlGuardar(error);
                    setFallo(mensaje);
                    anunciar(mensaje);
                  },
                });
              }}
            />
          ))}
        </ul>
      )}
      {fallo === null ? null : <p className={styles.fallo}>{fallo}</p>}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tarjeta «Lista de equipos» (T-301c). Solo con `team.manage`.
// ---------------------------------------------------------------------------

interface EnLaListaProps extends DeEquipoProps {
  nombreDelEquipo: string;
}

function EnLaLista({ teamId, nombreDelEquipo }: EnLaListaProps) {
  const anunciar = useAnnounce();
  const enLaLista = useEnLaLista(teamId);
  const guardar = useGuardarEnLaLista(teamId);
  const id = useId();
  const [fallo, setFallo] = useState<string | null>(null);

  if (enLaLista.isPending) {
    return <Cargando />;
  }

  if (enLaLista.isError) {
    return (
      <ErrorDeCarga
        que="si el equipo está en la lista"
        onReintentar={() => {
          void enLaLista.refetch();
        }}
      />
    );
  }

  return (
    <div className={styles.bloque}>
      <label className={styles.opcion} htmlFor={id}>
        {/* Mientras se guarda, la casilla enseña lo que se ha pedido y no
            atiende otro toque. No se desactiva: desactivarla le quitaría el
            foco a quien la acaba de marcar. */}
        <input
          id={id}
          className={styles.casilla}
          type="checkbox"
          checked={guardar.isPending ? guardar.variables : enLaLista.data}
          aria-describedby={`${id}-ayuda`}
          onChange={(evento) => {
            if (guardar.isPending) {
              return;
            }

            const marcada = evento.target.checked;

            setFallo(null);
            guardar.mutate(marcada, {
              onSuccess: () => {
                anunciar(
                  marcada
                    ? `${nombreDelEquipo} está en la lista`
                    : `${nombreDelEquipo} ya no está en la lista`,
                );
              },
              onError: (error) => {
                const mensaje = mensajeDeErrorAlGuardar(error);
                setFallo(mensaje);
                anunciar(mensaje);
              },
            });
          }}
        />
        <span>Este equipo está en la lista</span>
      </label>
      <p id={`${id}-ayuda`} className={styles.motivo}>
        Con esto encendido, cualquier persona con cuenta ve el nombre del equipo y del club, lo
        puede seguir sin esperar a nadie y puede pedir permisos. Quien sigue ve el calendario, los
        resultados, los dorsales y los apodos. Para anotar hace falta que lo aceptes.
      </p>
      {fallo === null ? null : <p className={styles.fallo}>{fallo}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pantalla
// ---------------------------------------------------------------------------

export function PersonasPage() {
  const { id } = useParams();
  const { teams } = useAuth();
  const tituloDeMiembros = useRef<HTMLHeadingElement>(null);
  // Seguir a un equipo no da entrada a su A07: solo cuenta tener función.
  const membresia =
    teams === null
      ? undefined
      : teams.find((candidata) => candidata.team.id === id && candidata.seguidor !== true);

  return (
    <Pantalla id="A07" titulo="Personas y permisos">
      {teams === null ? (
        <Cargando />
      ) : membresia === undefined ? (
        <p className={styles.nota}>No se encuentra ese equipo.</p>
      ) : (
        <>
          <p className={styles.nota}>
            Personas de {membresia.team.name}. El rol es solo el punto de partida: lo que cada una
            puede hacer es lo que tenga marcado.
          </p>
          <Solicitudes teamId={membresia.team.id} focoAlVaciarse={tituloDeMiembros} />
          <Card title="Miembros" headingLevel={2} headingRef={tituloDeMiembros}>
            <Miembros teamId={membresia.team.id} />
          </Card>
          <Card title="Invitar" headingLevel={2}>
            <Invitar teamId={membresia.team.id} />
          </Card>
          <Card title="Invitaciones pendientes" headingLevel={2}>
            <InvitacionesDelEquipo teamId={membresia.team.id} />
          </Card>
          <Seguidores teamId={membresia.team.id} />
          {membresia.permissions.has('team.manage') ? (
            <Card title="Lista de equipos" headingLevel={2}>
              <EnLaLista teamId={membresia.team.id} nombreDelEquipo={membresia.team.name} />
            </Card>
          ) : null}
        </>
      )}
    </Pantalla>
  );
}
