// Pantalla A15a — Entrenamientos (T-228).
//
// El horario del equipo activo en la temporada en curso, en dos listas:
// próximos, del más cercano al más lejano, y pasados, del más reciente al más
// antiguo. Lo abre cualquiera con función en el equipo: el horario es de todo
// el club (decisión de Raúl del 08/10; DOC 04 §13, T-06).
//
// Crear, editar y pasar lista piden `training.manage`. Sin el permiso la
// pantalla es de solo lectura y no dice nada de lo que falta: lo que no se
// puede hacer no se enseña.
//
// «ENTRENAMIENTO DE HOY». Un toque crea el de ahora mismo y sale hacia su
// lista de asistencia. Si hoy ya hay uno, en vez del botón sale el enlace a su
// lista: no se crea un segundo sin querer.
//
// Va en línea y no por la cola: sin red no se crea ni se edita nada.

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { useHasPermission } from '@modules/auth';
import { useClub } from '@modules/core';
import { useAnnounce } from '@shared/hooks/announceContext';
import { mensajeDeErrorAlGuardar } from '@shared/lib/guardado';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { Pantalla } from '@shared/ui/Pantalla';

import {
  useCrearEntrenamiento,
  useEntrenamientos,
  useEquipoDeTrabajo,
} from '../hooks/useEntrenamientos';
import {
  entrenamientoDeHoy,
  instanteDeAhora,
  propuestaDeAlta,
  separarEntrenamientos,
} from '../model/entrenamiento';

import styles from './EntrenamientosPage.module.css';

import type { Entrenamiento } from '../model/entrenamiento';

// «jue, 8 oct · 18:00». Los dos formatos de `ResumenDePartido` (agenda), que
// desde aquí no se puede importar: corto, para que quepa en una línea a 320 px.
const DIA = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const HORA = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });

/** Cuántos pasados se enseñan antes de pedir el resto. */
const PASADOS_A_LA_VISTA = 10;

function cuando(entrenamiento: Entrenamiento): string {
  const instante = new Date(entrenamiento.scheduledAt);

  return `${DIA.format(instante)} · ${HORA.format(instante)}`;
}

interface FilaProps {
  entrenamiento: Entrenamiento;
  gestiona: boolean;
}

/** Lo de dentro de cada `<li>`: cuándo, dónde, para qué y sus dos enlaces. */
function Fila({ entrenamiento, gestiona }: FilaProps) {
  const dia = cuando(entrenamiento);

  return (
    <>
      <p className={styles.cuando}>
        <time dateTime={entrenamiento.scheduledAt}>{dia}</time>
      </p>
      {entrenamiento.location === null ? null : (
        <p className={styles.detalle}>{entrenamiento.location}</p>
      )}
      {entrenamiento.focus === null ? null : (
        <p className={styles.detalle}>{entrenamiento.focus}</p>
      )}
      {gestiona ? (
        <div className={styles.acciones}>
          {/* El día va en el nombre: sin él, una lista de «Editar» iguales no
              dice a un lector de pantalla cuál es cuál (2.4.4). */}
          <Link
            className={styles.accion}
            to={`/entrenamientos/${entrenamiento.id}/lista`}
            aria-label={`Pasar lista: ${dia}`}
          >
            Pasar lista
          </Link>
          <Link
            className={styles.accion}
            to={`/entrenamientos/${entrenamiento.id}/editar`}
            aria-label={`Editar: ${dia}`}
          >
            Editar
          </Link>
        </div>
      ) : null}
    </>
  );
}

interface ProximosProps {
  entrenamientos: readonly Entrenamiento[];
  gestiona: boolean;
}

function Proximos({ entrenamientos, gestiona }: ProximosProps) {
  return (
    <Card title="Próximos" headingLevel={2}>
      {entrenamientos.length === 0 ? (
        <p className={styles.nota}>No hay entrenamientos programados.</p>
      ) : (
        <ul className={styles.lista}>
          {entrenamientos.map((entrenamiento) => (
            <li key={entrenamiento.id} className={styles.fila}>
              <Fila entrenamiento={entrenamiento} gestiona={gestiona} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Los diez más recientes y, si hay más, un botón que enseña el resto. */
function Pasados({ entrenamientos, gestiona }: ProximosProps) {
  const [todos, setTodos] = useState(false);
  const primeroDelResto = useRef<HTMLLIElement>(null);
  const resto = entrenamientos.length - PASADOS_A_LA_VISTA;
  const visibles = todos ? entrenamientos : entrenamientos.slice(0, PASADOS_A_LA_VISTA);

  // Al enseñar el resto, el botón desaparece con el foco dentro. Se lleva a la
  // primera fila que acaba de salir, que es por donde se sigue leyendo (2.4.3).
  useEffect(() => {
    if (todos) {
      primeroDelResto.current?.focus();
    }
  }, [todos]);

  return (
    <Card title="Pasados" headingLevel={2}>
      {entrenamientos.length === 0 ? (
        <p className={styles.nota}>Todavía no hay ninguno esta temporada.</p>
      ) : (
        <ul className={styles.lista}>
          {visibles.map((entrenamiento, indice) => (
            <li
              key={entrenamiento.id}
              ref={indice === PASADOS_A_LA_VISTA ? primeroDelResto : undefined}
              className={styles.fila}
              tabIndex={indice === PASADOS_A_LA_VISTA ? -1 : undefined}
            >
              <Fila entrenamiento={entrenamiento} gestiona={gestiona} />
            </li>
          ))}
        </ul>
      )}
      {!todos && resto > 0 ? (
        <div className={styles.mas}>
          <Button
            variant="secondary"
            className={styles.largo}
            onClick={() => {
              setTodos(true);
            }}
          >
            {resto === 1 ? 'Ver el anterior' : `Ver los ${resto} anteriores`}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

export function EntrenamientosPage() {
  const anunciar = useAnnounce();
  const navigate = useNavigate();
  const { equipoId, clubId, temporadaId } = useEquipoDeTrabajo();
  const entrenamientos = useEntrenamientos(equipoId, temporadaId);
  // `undefined` mientras no se saben los permisos: no se enseña ningún botón
  // hasta saber que se puede, en vez de enseñarlo y quitarlo.
  const gestiona = useHasPermission('training.manage') === true;
  // El club, por su campo de casa: es el lugar que propone «Entrenamiento de
  // hoy» cuando no hay ninguno anterior. Quien solo mira no lo necesita.
  const club = useClub(gestiona ? clubId : null);
  // La mutación vive aquí y no en el botón: al crear, el botón se cambia por
  // el enlace «Pasar lista de hoy» y se llevaría la mutación con él.
  const crear = useCrearEntrenamiento({
    equipoId: equipoId ?? '',
    temporadaId: temporadaId ?? '',
  });
  const [fallo, setFallo] = useState<string | null>(null);
  const mensaje = useRef<HTMLParagraphElement>(null);

  // El botón estaba desactivado mientras creaba y el foco se había ido a
  // `body`: va al mensaje, que es lo que hay que leer (2.4.3).
  useEffect(() => {
    if (fallo !== null) {
      mensaje.current?.focus();
    }
  }, [fallo]);

  const conEquipo = equipoId !== null && temporadaId !== null;
  // Con el permiso se espera también al club, para no proponer un lugar vacío
  // por haber tocado antes de tiempo. Si el club falla, se sigue sin él.
  const cargando = entrenamientos.isPending || (gestiona && clubId !== null && club.isPending);
  const lista = entrenamientos.data ?? [];

  // También tras salir bien: entre que la base contesta y la pantalla cambia,
  // la lista todavía no trae el de hoy, y otro toque crearía un segundo.
  const creando = crear.isPending || crear.isSuccess;

  const crearElDeHoy = () => {
    const ahora = new Date();

    setFallo(null);
    crear.mutate(
      {
        scheduled_at: instanteDeAhora(ahora),
        location: propuestaDeAlta(lista, club.data?.homeVenue ?? null, ahora).lugar || null,
        focus: null,
      },
      {
        onSuccess: (creado) => {
          void navigate(`/entrenamientos/${creado.id}/lista`);
        },
        onError: (error) => {
          const texto = mensajeDeErrorAlGuardar(error);
          setFallo(texto);
          anunciar(texto);
        },
      },
    );
  };

  const acciones = () => {
    if (!gestiona || !conEquipo || cargando || entrenamientos.isError) {
      return null;
    }

    const hoy = entrenamientoDeHoy(lista, new Date());

    return (
      <div className={styles.cabecera}>
        <div className={styles.acciones}>
          {hoy === null ? (
            <Button
              variant="primary"
              className={styles.largo}
              disabled={creando}
              onClick={crearElDeHoy}
            >
              {creando ? 'Creando…' : 'Entrenamiento de hoy'}
            </Button>
          ) : (
            <Link className={styles.principal} to={`/entrenamientos/${hoy.id}/lista`}>
              Pasar lista de hoy
            </Link>
          )}
          <Link className={styles.accion} to="/entrenamientos/nuevo">
            Nuevo entrenamiento
          </Link>
        </div>
        {fallo === null ? null : (
          <p ref={mensaje} className={styles.fallo} tabIndex={-1}>
            {fallo}
          </p>
        )}
      </div>
    );
  };

  const contenido = () => {
    if (equipoId === null) {
      return (
        <p className={styles.nota}>
          No hay equipo activo, así que no hay entrenamientos que enseñar.
        </p>
      );
    }

    if (temporadaId === null) {
      return (
        <p className={styles.nota}>
          El club no tiene ninguna temporada en curso, y los entrenamientos van por temporada.
        </p>
      );
    }

    if (cargando) {
      return <p className={styles.nota}>Cargando…</p>;
    }

    if (entrenamientos.isError) {
      return (
        <div className={styles.error}>
          <p className={styles.nota}>
            No se han podido cargar los entrenamientos. Suele ser falta de cobertura.
          </p>
          <div>
            <Button
              variant="secondary"
              onClick={() => {
                void entrenamientos.refetch();
              }}
            >
              Reintentar
            </Button>
          </div>
        </div>
      );
    }

    const { proximos, pasados } = separarEntrenamientos(lista, new Date());

    return (
      <>
        <Proximos entrenamientos={proximos} gestiona={gestiona} />
        <Pasados entrenamientos={pasados} gestiona={gestiona} />
      </>
    );
  };

  return (
    <Pantalla id="A15a" titulo="Entrenamientos">
      {acciones()}
      {contenido()}
    </Pantalla>
  );
}
