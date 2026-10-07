// Pantalla C01 — Ajustes (T-107, DOC 02 §2 y §5.2).
//
// Tres cosas: alto contraste, movimiento reducido y cerrar sesión. Desde la
// T-301c, también los equipos que se siguen: una línea por equipo con «Dejar
// de seguir», y el enlace a «Unirse a un equipo». Si el contexto de acceso
// falla, esa tarjeta lo dice y ofrece reintentar (T-305).
//
// Vive en `app/` y no en un módulo porque es del ámbito `platform`, que no
// tiene carpeta en `modules/` (DOC 06 §3.3). Entra en perezoso desde el
// enrutador: nadie la necesita para arrancar.
//
// LOS INTERRUPTORES SON CASILLAS NATIVAS. Una casilla ya trae nombre, estado y
// teclado, y el cambio se dispara al soltar, que es lo que pide el criterio
// 2.5.2. Un interruptor dibujado a mano obligaría a rehacer todo eso para
// ganar solo el aspecto.

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';

// Rutas directas y no el barril: ver `AuthProvider`.
import { cerrarSesion } from '@modules/auth/api/session';
import { useAuth } from '@modules/auth/hooks/authContext';
import { useDejarDeSeguir } from '@modules/auth/hooks/useSolicitudes';
import { mensajeDeLaBase } from '@modules/auth/model/solicitudes';
import { useAnnounce } from '@shared/hooks/announceContext';
import {
  aplicarPreferencias,
  guardarPreferencias,
  leerPreferencias,
} from '@shared/lib/preferencias';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { Pantalla } from '@shared/ui/Pantalla';

import styles from './AjustesPage.module.css';

import type { Preferencias } from '@shared/lib/preferencias';

interface OpcionProps {
  etiqueta: string;
  ayuda: string;
  marcada: boolean;
  alCambiar: (marcada: boolean) => void;
}

/** Casilla con su etiqueta y su ayuda. Toda la fila es objetivo táctil. */
function Opcion({ etiqueta, ayuda, marcada, alCambiar }: OpcionProps) {
  const id = useId();
  const ayudaId = `${id}-ayuda`;

  return (
    <div className={styles.opcion}>
      <label className={styles.fila} htmlFor={id}>
        <input
          id={id}
          className={styles.casilla}
          type="checkbox"
          checked={marcada}
          aria-describedby={ayudaId}
          onChange={(evento) => {
            alCambiar(evento.target.checked);
          }}
        />
        <span className={styles.etiqueta}>{etiqueta}</span>
      </label>
      <p id={ayudaId} className={styles.ayuda}>
        {ayuda}
      </p>
    </div>
  );
}

export function AjustesPage() {
  const { session, profile, teams, errorContexto, reintentarContexto } = useAuth();
  // Con el contexto de acceso fallado no se sabe a quién sigue: se dice y se
  // ofrece reintentar, en vez de un «Cargando…» sin salida (T-305).
  const sinAcceso = teams === null && errorContexto !== null;
  const dejarDeSeguir = useDejarDeSeguir();
  const [falloAlDejar, setFalloAlDejar] = useState<string | null>(null);
  // La línea del equipo desaparece al dejar de seguirlo, y el foco con ella
  // (2.4.3): pasa al título de la tarjeta.
  const tituloDeEquipos = useRef<HTMLHeadingElement>(null);
  const seguidos = teams === null ? [] : teams.filter((membresia) => membresia.seguidor === true);
  const anunciar = useAnnounce();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [preferencias, setPreferencias] = useState<Preferencias>(() => leerPreferencias());
  const [saliendo, setSaliendo] = useState(false);
  const [falloAlSalir, setFalloAlSalir] = useState(false);
  const [pendientesAlSalir, setPendientesAlSalir] = useState<number | null>(null);
  // El botón y la confirmación se sustituyen el uno a la otra, y el foco se
  // iría a `body` (2.4.3). Se lleva al aviso al preguntar y de vuelta al botón
  // al quedarse dentro.
  const avisoAlSalir = useRef<HTMLParagraphElement>(null);
  const botonDeSalir = useRef<HTMLDivElement>(null);
  const preguntado = useRef(false);

  useEffect(() => {
    if (pendientesAlSalir !== null) {
      preguntado.current = true;
      avisoAlSalir.current?.focus();
    } else if (preguntado.current) {
      preguntado.current = false;
      botonDeSalir.current?.querySelector('button')?.focus();
    }
  }, [pendientesAlSalir]);

  const cambiar = (cambio: Partial<Preferencias>) => {
    const nuevas = { ...preferencias, ...cambio };

    setPreferencias(nuevas);
    guardarPreferencias(nuevas);
    aplicarPreferencias(nuevas);
  };

  /**
   * Antes de salir se mira la cola (T-206). Lo pendiente no se
   * pierde: se queda en el dispositivo y sale cuando vuelva a entrar esta
   * misma cuenta, nunca con la sesión de otra (T-206). Pero quien sale tiene
   * que saberlo. Si el trozo de `sync` no baja, se sale sin preguntar: no hay
   * forma de contar, y bloquear la salida sería peor.
   */
  const pedirSalida = async () => {
    const userId = session === null ? null : session.user.id;

    if (userId !== null) {
      try {
        const { contarPendientes } = await import('@modules/sync');
        const cuantos = await contarPendientes(userId);

        if (cuantos > 0) {
          setPendientesAlSalir(cuantos);
          anunciar(
            `Hay ${cuantos === 1 ? '1 anotación' : `${cuantos} anotaciones`} sin enviar en este dispositivo`,
          );
          return;
        }
      } catch {
        // Sin cola legible, se sale sin preguntar (ver arriba).
      }
    }

    await salir();
  };

  const salir = async () => {
    setPendientesAlSalir(null);
    setSaliendo(true);
    setFalloAlSalir(false);

    try {
      await cerrarSesion();
      // Lo que la caché guardó con la sesión que se va no puede verlo quien
      // entre después en el mismo móvil (DOC 06 §5.5).
      queryClient.clear();
      anunciar('Sesión cerrada');
      void navigate('/login', { replace: true });
    } catch {
      setFalloAlSalir(true);
      setSaliendo(false);
      anunciar('No se pudo cerrar la sesión');
    }
  };

  // Nombre de Google, y si no lo hay, el correo: es la cuenta de la persona
  // que mira la pantalla, para que sepa con cuál está dentro.
  const cuenta = profile?.display_name ?? (session === null ? null : (session.user.email ?? null));

  return (
    <Pantalla id="C01" titulo="Ajustes">
      <Card title="Pantalla" headingLevel={2}>
        <div className={styles.opciones}>
          <Opcion
            etiqueta="Alto contraste"
            ayuda="Negro sobre blanco y bordes gruesos, para leer la pantalla al sol."
            marcada={preferencias.altoContraste}
            alCambiar={(marcada) => {
              cambiar({ altoContraste: marcada });
            }}
          />
          <Opcion
            etiqueta="Reducir el movimiento"
            ayuda="Quita las animaciones. Si el móvil ya lo pide en sus ajustes, se respeta aunque esto esté apagado."
            marcada={preferencias.movimientoReducido}
            alCambiar={(marcada) => {
              cambiar({ movimientoReducido: marcada });
            }}
          />
        </div>
        <p className={styles.nota}>Se guardan en este dispositivo.</p>
      </Card>

      <Card title="Equipos que sigues" headingLevel={2} headingRef={tituloDeEquipos}>
        {sinAcceso ? (
          <div className={styles.sinAcceso}>
            <p className={styles.nota}>No se pudo cargar tu acceso.</p>
            <div>
              <Button
                variant="secondary"
                onClick={() => {
                  // Si el reintento sale bien, el botón desaparece con el foco
                  // puesto (2.4.3): pasa antes al título de la tarjeta.
                  tituloDeEquipos.current?.focus();
                  anunciar('Reintentando');
                  reintentarContexto();
                }}
              >
                Reintentar
              </Button>
            </div>
          </div>
        ) : seguidos.length === 0 ? (
          <p className={styles.nota}>
            {teams === null
              ? 'Cargando…'
              : 'Ahora mismo solo ves los equipos donde tienes función.'}
          </p>
        ) : (
          <ul className={styles.seguidos}>
            {seguidos.map(({ team }) => (
              <li key={team.id} className={styles.seguido}>
                <span className={styles.etiqueta}>{team.name}</span>
                <Button
                  variant="secondary"
                  aria-label={`Dejar de seguir a ${team.name}`}
                  disabled={dejarDeSeguir.isPending}
                  onClick={() => {
                    setFalloAlDejar(null);
                    dejarDeSeguir.mutate(team.id, {
                      onSuccess: () => {
                        tituloDeEquipos.current?.focus();
                        reintentarContexto();
                        anunciar(`Has dejado de seguir a ${team.name}`);
                      },
                      onError: (error) => {
                        const mensaje = mensajeDeLaBase(error);
                        setFalloAlDejar(mensaje);
                        anunciar(mensaje);
                      },
                    });
                  }}
                >
                  {dejarDeSeguir.isPending && dejarDeSeguir.variables === team.id
                    ? 'Dejando de seguir…'
                    : 'Dejar de seguir'}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {falloAlDejar === null ? null : <p className={styles.fallo}>{falloAlDejar}</p>}
        <p>
          <Link to="/unirse">Seguir a otro equipo</Link>
        </p>
      </Card>

      <Card title="Cuenta" headingLevel={2}>
        {cuenta === null ? null : (
          <p>
            Has entrado como <strong className={styles.cuenta}>{cuenta}</strong>.
          </p>
        )}
        {pendientesAlSalir === null ? (
          <div ref={botonDeSalir}>
            <Button
              variant="secondary"
              disabled={saliendo}
              onClick={() => {
                void pedirSalida();
              }}
            >
              {saliendo ? 'Cerrando sesión…' : 'Cerrar sesión'}
            </Button>
          </div>
        ) : (
          <div className={styles.confirmar}>
            <p ref={avisoAlSalir} className={styles.aviso} tabIndex={-1}>
              Hay{' '}
              {pendientesAlSalir === 1
                ? '1 anotación sin enviar'
                : `${pendientesAlSalir} anotaciones sin enviar`}{' '}
              en este dispositivo. Se quedan guardadas aquí y se envían cuando vuelvas a entrar con
              esta cuenta, nunca con la de otra persona.
            </p>
            <div className={styles.acciones}>
              <Button
                variant="primary"
                onClick={() => {
                  setPendientesAlSalir(null);
                }}
              >
                Seguir dentro
              </Button>
              <Button
                variant="secondary"
                disabled={saliendo}
                onClick={() => {
                  void salir();
                }}
              >
                Cerrar sesión igualmente
              </Button>
            </div>
          </div>
        )}
        {falloAlSalir ? (
          <p className={styles.fallo}>No se pudo cerrar la sesión. Vuelve a intentarlo.</p>
        ) : null}
        {profile?.is_platform_admin === true ? (
          <p>
            <Link to="/admin/logs">Registro de errores</Link>
          </p>
        ) : null}
      </Card>
    </Pantalla>
  );
}
