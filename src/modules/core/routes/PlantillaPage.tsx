// Pantalla A05 — Plantilla (T-202, E2-03 y E2-04).
//
// Los jugadores inscritos en el equipo de la ruta durante la temporada en
// curso, por dorsal, y el alta de uno nuevo. Cada jugador lleva a su ficha
// (A06) para cambiar dorsal, posición, disponibilidad o darlo de baja.
//
// Y dos listas que solo salen si tienen algo (PR #51):
// inscribir a alguien que ya es del club, sin crear otro jugador con el
// mismo apodo, y reincorporar a quien se dio de baja esta temporada.
//
// Del jugador solo se pide y se enseña APODO, DORSAL y POSICIÓN. Nada de
// nombre real, foto ni dato de salud (DOC 05 §6.1, CLAUDE.md).
//
// La temporada es la del club del equipo activo. Si el equipo de la ruta es de
// otro club, o el usuario no tiene `roster.manage` en él, la RLS decide: la
// lista sale vacía o el alta dice «No tienes permiso».

import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router';

import { useAuth } from '@modules/auth';
import { useAnnounce } from '@shared/hooks/announceContext';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { Field } from '@shared/ui/Field';
import { Pantalla } from '@shared/ui/Pantalla';

import { Cargando, ErrorDeCarga } from '../components/EstadoDeCarga';
import { SelectorPosicion } from '../components/SelectorPosicion';
import {
  useBajas,
  useCrearJugador,
  useDelClubSinInscribir,
  useEquipoDePlantilla,
  useInscribirDelClub,
  usePlantilla,
  useReincorporar,
} from '../hooks/usePlantilla';
import { mensajeDeErrorAlGuardar } from '../model/clubYEquipos';
import { DISPONIBILIDADES, LARGO_APODO, POSICIONES, validarJugador } from '../model/plantilla';

import styles from './PlantillaPage.module.css';

import type { Inscripcion, Posicion, ResultadoJugador } from '../model/plantilla';

const DORSAL_REPETIDO = 'Ese dorsal ya lo lleva otro jugador.';

// ---------------------------------------------------------------------------
// Alta
// ---------------------------------------------------------------------------

interface NuevoJugadorProps {
  destino: { clubId: string; equipoId: string; temporadaId: string };
  plantilla: readonly Inscripcion[];
}

function NuevoJugador({ destino, plantilla }: NuevoJugadorProps) {
  const anunciar = useAnnounce();
  const crear = useCrearJugador(destino);
  const [apodo, setApodo] = useState('');
  const [dorsal, setDorsal] = useState('');
  const [posicion, setPosicion] = useState<Posicion | ''>('');
  const [errores, setErrores] = useState<ResultadoJugador['errores']>({});
  const [falloAlGuardar, setFalloAlGuardar] = useState<string | null>(null);

  return (
    <form
      className={styles.formulario}
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault();
        setFalloAlGuardar(null);

        const resultado = validarJugador({ apodo, dorsal, posicion }, plantilla);
        setErrores(resultado.errores);

        if (resultado.valores === null) {
          anunciar('Revisa los campos marcados');
          return;
        }

        crear.mutate(resultado.valores, {
          onSuccess: (inscrito) => {
            setApodo('');
            setDorsal('');
            setPosicion('');
            anunciar(`${inscrito.nickname} añadido a la plantilla`);
          },
          onError: (error) => {
            const mensaje = mensajeDeErrorAlGuardar(error, DORSAL_REPETIDO);
            setFalloAlGuardar(mensaje);
            anunciar(mensaje);
          },
        });
      }}
    >
      <Field
        label="Apodo"
        hint="Solo el apodo con el que se le llama en el campo. Nada de nombre ni apellidos."
        required
        maxLength={LARGO_APODO}
        autoComplete="off"
        value={apodo}
        error={errores.apodo}
        onChange={(evento) => {
          setApodo(evento.target.value);
        }}
      />
      <Field
        label="Dorsal"
        hint="Del 1 al 99. Puedes dejarlo vacío y ponerlo después."
        inputMode="numeric"
        maxLength={2}
        autoComplete="off"
        value={dorsal}
        error={errores.dorsal}
        onChange={(evento) => {
          setDorsal(evento.target.value);
        }}
      />
      <SelectorPosicion valor={posicion} alCambiar={setPosicion} />

      {falloAlGuardar === null ? null : <p className={styles.fallo}>{falloAlGuardar}</p>}

      <div>
        <Button type="submit" variant="primary" iconStart="plus" disabled={crear.isPending}>
          {crear.isPending ? 'Añadiendo…' : 'Añadir jugador'}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Lista
// ---------------------------------------------------------------------------

interface ListaProps {
  equipoId: string;
  plantilla: readonly Inscripcion[];
}

function Lista({ equipoId, plantilla }: ListaProps) {
  if (plantilla.length === 0) {
    return (
      <p className={styles.nota}>
        Todavía no hay jugadores en la plantilla de esta temporada. Añade el primero con el
        formulario de abajo.
      </p>
    );
  }

  return (
    <ul className={styles.lista}>
      {plantilla.map((jugador) => (
        <li key={jugador.id} className={styles.fila}>
          {/* El dorsal se lee como parte del nombre: «7, El Rubio». Sin dorsal,
              un guion que el lector de pantalla se salta. */}
          <span className={styles.dorsal}>
            {jugador.shirtNumber === null ? (
              <span aria-hidden="true">—</span>
            ) : (
              <>
                <span className={styles.oculto}>Dorsal </span>
                {jugador.shirtNumber}
              </>
            )}
          </span>
          <div className={styles.datos}>
            <span className={styles.apodo}>{jugador.nickname}</span>
            <span className={styles.detalle}>
              {jugador.defaultPosition === null
                ? 'Posición sin decidir'
                : POSICIONES[jugador.defaultPosition]}
              {/* Solo se escribe cuando no puede jugar: es la excepción que hay
                  que ver. En palabras, nunca solo con color (1.4.1). */}
              {jugador.availability === 'available' ? null : (
                <span className={styles.aviso}> · {DISPONIBILIDADES[jugador.availability]}</span>
              )}
            </span>
          </div>
          <Link
            className={styles.enlace}
            to={`/jugadores/${jugador.playerId}/editar?equipo=${equipoId}`}
            aria-label={`Editar ficha de ${jugador.nickname}`}
          >
            Editar
          </Link>
        </li>
      ))}
    </ul>
  );
}

interface DestinoProps {
  clubId: string;
  equipoId: string;
  temporadaId: string;
  plantilla: readonly Inscripcion[];
  /**
   * Al inscribir o reincorporar, la fila del botón pulsado desaparece y el
   * foco se perdería con ella. Se lleva a la lista de jugadores, que es donde
   * aparece quien acaba de entrar.
   */
  alEntrar: () => void;
}

/** Bajas de la temporada, con «Reincorporar». No sale si no hay ninguna. */
function Bajas({ equipoId, temporadaId, plantilla, alEntrar }: DestinoProps) {
  const anunciar = useAnnounce();
  const bajas = useBajas(equipoId, temporadaId);
  const reincorporar = useReincorporar(equipoId);
  const [fallo, setFallo] = useState<string | null>(null);

  if (bajas.data === undefined || bajas.data.length === 0) {
    return null;
  }

  return (
    <Card title={`Bajas de esta temporada (${bajas.data.length})`} headingLevel={2}>
      <ul className={styles.lista}>
        {bajas.data.map((baja) => (
          <li key={baja.id} className={styles.fila}>
            <span className={styles.dorsal}>
              {baja.shirtNumber === null ? (
                <span aria-hidden="true">—</span>
              ) : (
                <>
                  <span className={styles.oculto}>Dorsal </span>
                  {baja.shirtNumber}
                </>
              )}
            </span>
            <div className={styles.datos}>
              <span className={styles.apodo}>{baja.nickname}</span>
            </div>
            <Button
              variant="secondary"
              disabled={reincorporar.isPending}
              aria-label={`Reincorporar a ${baja.nickname}`}
              onClick={() => {
                setFallo(null);
                reincorporar.mutate(
                  { baja, plantilla },
                  {
                    onSuccess: ({ sinDorsal }) => {
                      alEntrar();
                      anunciar(
                        sinDorsal
                          ? `${baja.nickname} vuelve a la plantilla sin dorsal: el ${baja.shirtNumber ?? ''} lo lleva otro`
                          : `${baja.nickname} vuelve a la plantilla`,
                      );
                    },
                    onError: (error) => {
                      const mensaje = mensajeDeErrorAlGuardar(error);
                      setFallo(mensaje);
                      anunciar(mensaje);
                    },
                  },
                );
              }}
            >
              Reincorporar
            </Button>
          </li>
        ))}
      </ul>
      {fallo === null ? null : <p className={styles.fallo}>{fallo}</p>}
    </Card>
  );
}

/** Jugadores del club sin inscribir en este equipo. No sale si no hay ninguno. */
function DelClub({ clubId, equipoId, temporadaId, alEntrar }: DestinoProps) {
  const anunciar = useAnnounce();
  const delClub = useDelClubSinInscribir(clubId, equipoId, temporadaId);
  const inscribir = useInscribirDelClub({ equipoId, temporadaId });
  const [fallo, setFallo] = useState<string | null>(null);

  if (delClub.data === undefined || delClub.data.length === 0) {
    return null;
  }

  return (
    <Card title={`Inscribir a alguien del club (${delClub.data.length})`} headingLevel={2}>
      <p className={styles.nota}>
        Ya son jugadores del club, de otro equipo. Inscribirlos aquí no crea otro jugador: sus
        estadísticas siguen siendo las suyas. El dorsal y la posición se ponen en su ficha.
      </p>
      <ul className={styles.lista}>
        {delClub.data.map((jugador) => (
          <li key={jugador.playerId} className={styles.fila}>
            <div className={styles.datos}>
              <span className={styles.apodo}>{jugador.nickname}</span>
            </div>
            <Button
              variant="secondary"
              disabled={inscribir.isPending}
              aria-label={`Inscribir a ${jugador.nickname}`}
              onClick={() => {
                setFallo(null);
                inscribir.mutate(jugador.playerId, {
                  onSuccess: () => {
                    alEntrar();
                    anunciar(`${jugador.nickname} inscrito en la plantilla`);
                  },
                  onError: (error) => {
                    const mensaje = mensajeDeErrorAlGuardar(
                      error,
                      'Ya está inscrito en este equipo.',
                    );
                    setFallo(mensaje);
                    anunciar(mensaje);
                  },
                });
              }}
            >
              Inscribir
            </Button>
          </li>
        ))}
      </ul>
      {fallo === null ? null : <p className={styles.fallo}>{fallo}</p>}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Pantalla
// ---------------------------------------------------------------------------

export function PlantillaPage() {
  const { id: equipoId = '' } = useParams();
  const { activeSeasonId } = useAuth();
  const equipo = useEquipoDePlantilla(equipoId);
  // Solo se pregunta por la plantilla cuando se sabe que el equipo es propio:
  // un rival no tiene, y pedirla sería un viaje de red para nada.
  const plantilla = usePlantilla(equipoId, equipo.data?.kind === 'managed' ? activeSeasonId : null);
  const tituloJugadores = useRef<HTMLHeadingElement>(null);
  const alEntrar = () => {
    tituloJugadores.current?.focus();
  };

  const titulo =
    equipo.data === undefined || equipo.data === null
      ? 'Plantilla'
      : `Plantilla de ${equipo.data.name}`;

  const contenido = () => {
    if (equipo.isPending) {
      return <Cargando />;
    }

    if (equipo.isError) {
      return (
        <ErrorDeCarga
          que="el equipo"
          onReintentar={() => {
            void equipo.refetch();
          }}
        />
      );
    }

    if (equipo.data === null) {
      return <p className={styles.nota}>No se encuentra este equipo, o no tienes acceso a él.</p>;
    }

    if (equipo.data.kind === 'reference') {
      return (
        <p className={styles.nota}>
          {equipo.data.name} es un rival: no tiene plantilla. De los rivales solo se apuntan los
          goles y los córners del equipo.
        </p>
      );
    }

    if (activeSeasonId === null) {
      return (
        <p className={styles.nota}>
          El club no tiene ninguna temporada en curso, y la plantilla se apunta por temporada. Hasta
          que haya una, no se pueden inscribir jugadores.
        </p>
      );
    }

    if (plantilla.isPending) {
      return <Cargando />;
    }

    if (plantilla.isError) {
      return (
        <ErrorDeCarga
          que="la plantilla"
          onReintentar={() => {
            void plantilla.refetch();
          }}
        />
      );
    }

    return (
      <>
        <Card
          title={`Jugadores (${plantilla.data.length})`}
          headingLevel={2}
          headingRef={tituloJugadores}
        >
          <Lista equipoId={equipoId} plantilla={plantilla.data} />
        </Card>
        <Card title="Añadir jugador" headingLevel={2}>
          <NuevoJugador
            destino={{ clubId: equipo.data.clubId, equipoId, temporadaId: activeSeasonId }}
            plantilla={plantilla.data}
          />
        </Card>
        <DelClub
          clubId={equipo.data.clubId}
          equipoId={equipoId}
          temporadaId={activeSeasonId}
          plantilla={plantilla.data}
          alEntrar={alEntrar}
        />
        <Bajas
          clubId={equipo.data.clubId}
          equipoId={equipoId}
          temporadaId={activeSeasonId}
          plantilla={plantilla.data}
          alEntrar={alEntrar}
        />
      </>
    );
  };

  return (
    <Pantalla id="A05" titulo={titulo}>
      <p>
        <Link className={styles.volver} to="/equipos">
          Volver a Equipos
        </Link>
      </p>
      {contenido()}
    </Pantalla>
  );
}
