// Un partido en cuatro líneas y sus acciones (T-213).
//
// Lo que pintaba cada fila del calendario, sacado aquí para que A09 y la
// tarjeta «Próximo evento» de Inicio enseñen lo mismo y con las mismas
// condiciones: fecha, enfrentamiento, competición y campo, estado, y los
// enlaces al directo, la convocatoria, la edición y el cierre.
//
// Cada enlace sale con su permiso y con su estado, igual que en la T-204, la
// T-210a y la T-212. Lo que no se puede hacer no se enseña. Los permisos se
// leen aquí y no bajan por props: quien pinta el resumen no tiene que saber
// cuáles son.
//
// No lleva contenedor de lista: el calendario lo mete en un `<li>` y la
// tarjeta de Inicio, suelto.

import { Link } from 'react-router';

import { useHasPermission } from '@modules/auth';

import {
  enfrentamiento,
  NOMBRES_DE_ESTADO,
  sePuedeEditar,
  tieneCierre,
  tieneDirecto,
} from '../model/partido';

import styles from './ResumenDePartido.module.css';

import type { Partido } from '../model/partido';

// «sáb, 25 oct · 11:30». Corto para que quepa en una línea a 320 px.
const DIA = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const HORA = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });

interface ResumenDePartidoProps {
  partido: Partido;
  /** Nombre del equipo activo, para escribir «Local – Visitante». */
  equipo: string;
}

export function ResumenDePartido({ partido, equipo }: ResumenDePartidoProps) {
  // `undefined` mientras no se saben los permisos: no se enseña el enlace
  // hasta saber que se puede, en vez de enseñarlo y quitarlo.
  const programa = useHasPermission('schedule.manage') === true;
  const convoca = useHasPermission('lineup.manage') === true;
  const cierra = useHasPermission('match.close') === true;
  const anota = useHasPermission('match.live.write') === true;

  const instante = new Date(partido.kickoffAt);
  const titulo = enfrentamiento(partido, equipo);
  const pendiente = sePuedeEditar(partido.status);
  const conCierre = cierra && tieneCierre(partido);
  const conDirecto = anota && tieneDirecto(partido.status);

  return (
    <div className={styles.resumen}>
      <p className={styles.cuando}>
        <time dateTime={partido.kickoffAt}>
          {DIA.format(instante)} · {HORA.format(instante)}
        </time>
      </p>
      <p className={styles.partido}>{titulo}</p>
      <p className={styles.detalle}>
        {partido.competitionName}
        {partido.venue === null ? null : ` · ${partido.venue}`}
      </p>
      <p className={styles.estado}>
        {NOMBRES_DE_ESTADO[partido.status]}
        {partido.isRetroactive ? ' · en diferido' : null}
      </p>
      {conDirecto || (programa && pendiente) || (convoca && pendiente) || conCierre ? (
        <div className={styles.acciones}>
          {conDirecto ? (
            <Link
              className={styles.accion}
              to={`/partidos/${partido.id}/directo`}
              aria-label={partido.isRetroactive ? `Apuntar ${titulo}` : `Directo de ${titulo}`}
            >
              {partido.isRetroactive ? 'Apuntar' : 'Directo'}
            </Link>
          ) : null}
          {convoca && pendiente ? (
            <Link
              className={styles.accion}
              to={`/partidos/${partido.id}/convocatoria`}
              aria-label={`Convocatoria de ${titulo}`}
            >
              Convocatoria
            </Link>
          ) : null}
          {programa && pendiente ? (
            <Link
              className={styles.accion}
              to={`/partidos/${partido.id}/editar`}
              aria-label={`Editar ${titulo}`}
            >
              Editar
            </Link>
          ) : null}
          {conCierre ? (
            <Link
              className={styles.accion}
              to={`/partidos/${partido.id}/cierre`}
              aria-label={`Cierre de ${titulo}`}
            >
              Cierre
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
