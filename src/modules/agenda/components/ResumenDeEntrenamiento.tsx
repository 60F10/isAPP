// Un entrenamiento dentro del calendario (T-231).
//
// La fila que va entre los partidos de la tarjeta «Por jugar»: cuándo, la
// palabra «Entrenamiento», y debajo el lugar y el objetivo, si los tiene. Con
// el ritmo de `ResumenDePartido`, para que la lista se lea de corrido, y con
// el tipo escrito: que una fila es un entrenamiento no lo dice ni un color ni
// un icono (1.4.1).
//
// «Pasar lista» sale solo con `training.manage`, que es quien puede abrir la
// lista. El permiso se lee aquí y no baja por props, como en
// `ResumenDePartido`. Editar el entrenamiento se queda en su pantalla,
// `/entrenamientos`: aquí se viene a mirar la semana y a pasar lista.
//
// No lleva contenedor de lista: el calendario lo mete en un `<li>`.

import { Link } from 'react-router';

import { useHasPermission } from '@modules/auth';

import styles from './ResumenDeEntrenamiento.module.css';

import type { Entrenamiento } from '@modules/training';

// «jue, 8 oct · 18:00». Los dos formatos de `ResumenDePartido`.
const DIA = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const HORA = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });

interface ResumenDeEntrenamientoProps {
  entrenamiento: Entrenamiento;
}

export function ResumenDeEntrenamiento({ entrenamiento }: ResumenDeEntrenamientoProps) {
  // `undefined` mientras no se saben los permisos: no se enseña el enlace
  // hasta saber que se puede, en vez de enseñarlo y quitarlo.
  const pasaLista = useHasPermission('training.manage') === true;

  const instante = new Date(entrenamiento.scheduledAt);
  const cuando = `${DIA.format(instante)} · ${HORA.format(instante)}`;

  return (
    <div className={styles.resumen}>
      <p className={styles.cuando}>
        <time dateTime={entrenamiento.scheduledAt}>{cuando}</time>
      </p>
      <p className={styles.tipo}>Entrenamiento</p>
      {entrenamiento.location === null ? null : (
        <p className={styles.detalle}>{entrenamiento.location}</p>
      )}
      {entrenamiento.focus === null ? null : (
        <p className={styles.detalle}>{entrenamiento.focus}</p>
      )}
      {pasaLista ? (
        <div className={styles.acciones}>
          {/* El día va en el nombre: con dos entrenamientos en la lista, dos
              «Pasar lista» iguales no dicen a un lector de pantalla cuál es
              cuál (2.4.4). Empieza por el texto que se ve (2.5.3). */}
          <Link
            className={styles.accion}
            to={`/entrenamientos/${entrenamiento.id}/lista`}
            aria-label={`Pasar lista: ${cuando}`}
          >
            Pasar lista
          </Link>
        </div>
      ) : null}
    </div>
  );
}
