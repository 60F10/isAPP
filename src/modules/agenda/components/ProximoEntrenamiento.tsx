// El próximo entrenamiento, debajo del próximo partido en la tarjeta «Próximo
// evento» de Inicio (T-231, D06-42).
//
// Sale si hay algún entrenamiento desde las 00:00 de hoy hasta dentro de siete
// días, y enseña el primero: cuándo, dónde, y los enlaces a su lista y al
// horario entero. El de hoy dice «Hoy» en vez del día.
//
// SI NO HAY NADA QUE ENSEÑAR, NO PINTA NADA: ni mientras carga, ni si la
// consulta falla, ni sin entrenamientos cercanos. La tarjeta es del partido,
// que tiene sus propios estados; un segundo «Cargando…» o un segundo error
// debajo solo estorbarían a quien viene a por el directo.
//
// Lee la misma consulta que el calendario y que `/entrenamientos`,
// `useEntrenamientos`, así que viniendo de allí sale de la caché. Quien solo
// sigue al equipo no puede leer los entrenamientos: la consulta ni se lanza.
//
// No pinta la tarjeta ni su título: eso es de `HomePage`, que vive en `core`
// y recibe esto por su prop `proximoEvento` (D06-34).

import { Link } from 'react-router';

import { useAuth, useHasPermission } from '@modules/auth';
import { useEntrenamientos } from '@modules/training';

import { useEquipoActivo } from '../hooks/usePartidos';
import { esHoy, proximoEntrenamiento, tieneFuncion } from '../model/agenda';

import styles from './ProximoEntrenamiento.module.css';

// Los dos formatos de `ResumenDePartido`: «jue, 8 oct» y «18:00».
const DIA = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const HORA = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });

export function ProximoEntrenamiento() {
  const { equipoId, temporadaId } = useEquipoActivo();
  const { teams, activeTeamId } = useAuth();
  const conFuncion = tieneFuncion(teams, activeTeamId);
  const entrenamientos = useEntrenamientos(conFuncion ? equipoId : null, temporadaId);
  // `undefined` mientras no se saben los permisos: no se enseña el enlace
  // hasta saber que se puede, en vez de enseñarlo y quitarlo.
  const pasaLista = useHasPermission('training.manage') === true;

  if (!entrenamientos.isSuccess) {
    return null;
  }

  const ahora = new Date();
  const proximo = proximoEntrenamiento(entrenamientos.data, ahora);

  if (proximo === null) {
    return null;
  }

  const instante = new Date(proximo.scheduledAt);
  const dia = esHoy(proximo.scheduledAt, ahora) ? 'Hoy' : DIA.format(instante);
  const cuando = `${dia} · ${HORA.format(instante)}`;

  return (
    <div className={styles.bloque}>
      <h3 className={styles.titulo}>Próximo entrenamiento</h3>
      <p className={styles.cuando}>
        <time dateTime={proximo.scheduledAt}>{cuando}</time>
      </p>
      {proximo.location === null ? null : <p className={styles.detalle}>{proximo.location}</p>}
      <div className={styles.acciones}>
        {pasaLista ? (
          <Link
            className={styles.accion}
            to={`/entrenamientos/${proximo.id}/lista`}
            aria-label={`Pasar lista: ${cuando}`}
          >
            Pasar lista
          </Link>
        ) : null}
        <Link className={styles.accion} to="/entrenamientos">
          Todos los entrenamientos
        </Link>
      </div>
    </div>
  );
}
