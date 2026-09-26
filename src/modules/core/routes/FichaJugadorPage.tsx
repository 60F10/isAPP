// Pantalla A06 — Ficha de jugador (T-202, E2-04, E2-06 y E6-04).
//
// Apodo, dorsal, posición habitual y disponibilidad de UN jugador en UN
// equipo y temporada, más la baja de la plantilla.
//
// El equipo llega en `?equipo=` desde la A05; sin él, se usa el equipo activo.
// Un jugador puede estar inscrito en dos equipos del club la misma temporada, y
// el dorsal y la disponibilidad son de cada inscripción, no del jugador.
//
// DISPONIBILIDAD (DOC 04 §12.4): «Disponible» o «No disponible», SIN MOTIVO
// escrito. La app no trata datos de salud. «Sancionado» no se elige aquí: lo
// pone y lo quita el cómputo de sanciones, así que la ficha lo enseña y no deja
// cambiarlo.

import { useId, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';

import { useAuth } from '@modules/auth';
import { useAnnounce } from '@shared/hooks/announceContext';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { Field } from '@shared/ui/Field';
import { Pantalla } from '@shared/ui/Pantalla';

import { Cargando, ErrorDeCarga } from '../components/EstadoDeCarga';
import { SelectorPosicion } from '../components/SelectorPosicion';
import { useDarDeBaja, useGuardarFicha, useInscripcion, usePlantilla } from '../hooks/usePlantilla';
import { limpiarTexto, mensajeDeErrorAlGuardar } from '../model/clubYEquipos';
import { LARGO_APODO, validarJugador } from '../model/plantilla';

import styles from './FichaJugadorPage.module.css';

import type { Disponibilidad, Inscripcion, Posicion, ResultadoJugador } from '../model/plantilla';

const DORSAL_REPETIDO = 'Ese dorsal ya lo lleva otro jugador.';

interface FichaProps {
  equipoId: string;
  inscripcion: Inscripcion;
  companeros: readonly Inscripcion[];
}

function Ficha({ equipoId, inscripcion, companeros }: FichaProps) {
  const anunciar = useAnnounce();
  const guardar = useGuardarFicha(equipoId);
  const idDisponibilidad = useId();
  const [apodo, setApodo] = useState(inscripcion.nickname);
  const [dorsal, setDorsal] = useState(
    inscripcion.shirtNumber === null ? '' : String(inscripcion.shirtNumber),
  );
  const [posicion, setPosicion] = useState<Posicion | ''>(inscripcion.defaultPosition ?? '');
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad>(inscripcion.availability);
  const [errores, setErrores] = useState<ResultadoJugador['errores']>({});
  const [falloAlGuardar, setFalloAlGuardar] = useState<string | null>(null);

  const sancionado = inscripcion.availability === 'sanctioned';

  return (
    <form
      className={styles.formulario}
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault();
        setFalloAlGuardar(null);

        const resultado = validarJugador({ apodo, dorsal, posicion }, companeros, inscripcion.id);
        setErrores(resultado.errores);

        if (resultado.valores === null) {
          anunciar('Revisa los campos marcados');
          return;
        }

        const apodoNuevo = limpiarTexto(apodo);

        guardar.mutate(
          {
            inscripcionId: inscripcion.id,
            jugadorId: inscripcion.playerId,
            apodoCambiado: apodoNuevo === inscripcion.nickname ? null : apodoNuevo,
            cambios: {
              shirt_number: resultado.valores.shirt_number,
              default_position: resultado.valores.default_position,
              // Un sancionado no cambia de estado desde aquí.
              ...(sancionado ? {} : { availability: disponibilidad }),
            },
          },
          {
            onSuccess: () => {
              anunciar('Ficha guardada');
            },
            onError: (error) => {
              const mensaje = mensajeDeErrorAlGuardar(error, DORSAL_REPETIDO);
              setFalloAlGuardar(mensaje);
              anunciar(mensaje);
            },
          },
        );
      }}
    >
      <Field
        label="Apodo"
        hint="Solo el apodo. Nada de nombre ni apellidos."
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
        hint="Del 1 al 99. Puedes dejarlo vacío."
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

      {sancionado ? (
        <p className={styles.nota}>
          <strong>Sancionado.</strong> No se puede convocar hasta que cumpla la sanción, y vuelve a
          estar disponible solo.
        </p>
      ) : (
        <fieldset className={styles.grupo}>
          <legend className={styles.leyenda}>Disponibilidad</legend>
          <label className={styles.opcion} htmlFor={`${idDisponibilidad}-si`}>
            <input
              id={`${idDisponibilidad}-si`}
              className={styles.radio}
              type="radio"
              name={idDisponibilidad}
              checked={disponibilidad === 'available'}
              onChange={() => {
                setDisponibilidad('available');
              }}
            />
            <span>Disponible</span>
          </label>
          <label className={styles.opcion} htmlFor={`${idDisponibilidad}-no`}>
            <input
              id={`${idDisponibilidad}-no`}
              className={styles.radio}
              type="radio"
              name={idDisponibilidad}
              checked={disponibilidad === 'unavailable'}
              onChange={() => {
                setDisponibilidad('unavailable');
              }}
            />
            <span>No disponible: no se podrá convocar</span>
          </label>
        </fieldset>
      )}

      {falloAlGuardar === null ? null : <p className={styles.fallo}>{falloAlGuardar}</p>}

      <div>
        <Button type="submit" variant="primary" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar ficha'}
        </Button>
      </div>
    </form>
  );
}

interface BajaProps {
  equipoId: string;
  inscripcion: Inscripcion;
}

/**
 * Baja en dos pasos, sin ventana emergente: el primer botón pregunta y el
 * segundo confirma, en el mismo sitio. Un toque despistado no saca a nadie.
 */
function Baja({ equipoId, inscripcion }: BajaProps) {
  const anunciar = useAnnounce();
  const navigate = useNavigate();
  const darDeBaja = useDarDeBaja(equipoId);
  const [confirmando, setConfirmando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  return (
    <div className={styles.baja}>
      <p className={styles.nota}>
        Sale de la plantilla de esta temporada. Sus partidos jugados siguen contando y sigue en el
        club.
      </p>

      {confirmando ? (
        <div className={styles.acciones}>
          <Button
            variant="primary"
            disabled={darDeBaja.isPending}
            onClick={() => {
              setFallo(null);
              darDeBaja.mutate(inscripcion.id, {
                onSuccess: () => {
                  anunciar(`${inscripcion.nickname} dado de baja`);
                  void navigate(`/equipos/${equipoId}/plantilla`, { replace: true });
                },
                onError: (error) => {
                  const mensaje = mensajeDeErrorAlGuardar(error);
                  setFallo(mensaje);
                  anunciar(mensaje);
                },
              });
            }}
          >
            {darDeBaja.isPending ? 'Dando de baja…' : `Sí, dar de baja a ${inscripcion.nickname}`}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setConfirmando(false);
            }}
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <div>
          <Button
            variant="secondary"
            onClick={() => {
              setConfirmando(true);
            }}
          >
            Dar de baja
          </Button>
        </div>
      )}

      {fallo === null ? null : <p className={styles.fallo}>{fallo}</p>}
    </div>
  );
}

export function FichaJugadorPage() {
  const { id: jugadorId = '' } = useParams();
  const [busqueda] = useSearchParams();
  const { activeTeamId, activeSeasonId } = useAuth();
  const equipoId = busqueda.get('equipo') ?? activeTeamId ?? '';
  const inscripcion = useInscripcion(equipoId, activeSeasonId, jugadorId);
  // La plantilla entera, para no repetir dorsal. Suele estar ya en caché: se
  // llega desde la A05.
  const plantilla = usePlantilla(equipoId, activeSeasonId);

  const volver = (
    <p>
      <Link className={styles.volver} to={`/equipos/${equipoId}/plantilla`}>
        Volver a la plantilla
      </Link>
    </p>
  );

  const contenido = () => {
    if (activeSeasonId === null) {
      return <p className={styles.nota}>El club no tiene ninguna temporada en curso.</p>;
    }

    if (inscripcion.isPending || plantilla.isPending) {
      return <Cargando />;
    }

    if (inscripcion.isError || plantilla.isError) {
      return (
        <ErrorDeCarga
          que="la ficha"
          onReintentar={() => {
            void inscripcion.refetch();
            void plantilla.refetch();
          }}
        />
      );
    }

    if (inscripcion.data === null) {
      return (
        <p className={styles.nota}>
          Este jugador no está en la plantilla de este equipo esta temporada, o ya se dio de baja.
        </p>
      );
    }

    return (
      <>
        <Card title="Datos" headingLevel={2}>
          {/* La clave vuelve a montar el formulario con los valores guardados
              si cambia de jugador sin salir de la pantalla. */}
          <Ficha
            key={inscripcion.data.id}
            equipoId={equipoId}
            inscripcion={inscripcion.data}
            companeros={plantilla.data}
          />
        </Card>
        <Card title="Baja" headingLevel={2}>
          <Baja equipoId={equipoId} inscripcion={inscripcion.data} />
        </Card>
      </>
    );
  };

  return (
    <Pantalla
      id="A06"
      titulo={
        inscripcion.data === undefined || inscripcion.data === null
          ? 'Ficha de jugador'
          : `Ficha de ${inscripcion.data.nickname}`
      }
    >
      {volver}
      {contenido()}
    </Pantalla>
  );
}
