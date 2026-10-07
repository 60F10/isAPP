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

import { useEffect, useId, useRef, useState } from 'react';
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

import styles from './PersonasPage.module.css';

import type { Invitacion, Miembro } from '../model/personas';
import type { AppPermission, TeamRole } from '../model/permissions';

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
// Pantalla
// ---------------------------------------------------------------------------

export function PersonasPage() {
  const { id } = useParams();
  const { teams } = useAuth();
  const membresia =
    teams === null ? undefined : teams.find((candidata) => candidata.team.id === id);

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
          <Card title="Miembros" headingLevel={2}>
            <Miembros teamId={membresia.team.id} />
          </Card>
          <Card title="Invitar" headingLevel={2}>
            <Invitar teamId={membresia.team.id} />
          </Card>
          <Card title="Invitaciones pendientes" headingLevel={2}>
            <InvitacionesDelEquipo teamId={membresia.team.id} />
          </Card>
        </>
      )}
    </Pantalla>
  );
}
