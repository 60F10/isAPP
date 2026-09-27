// Pantalla A09 — Calendario (T-204, E4-02 a E4-04).
//
// Los partidos del equipo activo en la temporada en curso, en dos listas: por
// jugar, del más cercano al más lejano, y jugados, del más reciente al más
// antiguo. La abre cualquiera que pertenezca al equipo; programar y editar
// solo quien tiene `schedule.manage`, y la convocatoria quien tiene
// `lineup.manage`. Lo que no se puede hacer no se enseña.
//
// Los entrenamientos (E4-01) no salen todavía: su pantalla es de después del
// MVP (DOC 08 §7).

import { Link } from 'react-router';

import { useHasPermission } from '@modules/auth';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { Pantalla } from '@shared/ui/Pantalla';

import { useCalendario, useEquipoActivo } from '../hooks/usePartidos';
import {
  enfrentamiento,
  NOMBRES_DE_ESTADO,
  separarCalendario,
  sePuedeEditar,
  tieneCierre,
} from '../model/partido';

import styles from './CalendarioPage.module.css';

import type { Partido } from '../model/partido';

// «sáb, 25 oct · 11:30». Corto para que quepa en una línea a 320 px.
const DIA = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const HORA = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' });

interface FilaProps {
  partido: Partido;
  equipo: string;
  programa: boolean;
  convoca: boolean;
  cierra: boolean;
}

function Fila({ partido, equipo, programa, convoca, cierra }: FilaProps) {
  const instante = new Date(partido.kickoffAt);
  const titulo = enfrentamiento(partido, equipo);
  const pendiente = sePuedeEditar(partido.status);
  const conCierre = cierra && tieneCierre(partido);

  return (
    <li className={styles.fila}>
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
      {(programa && pendiente) || (convoca && pendiente) || conCierre ? (
        <div className={styles.acciones}>
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
    </li>
  );
}

interface ListaProps {
  titulo: string;
  vacio: string;
  partidos: readonly Partido[];
  equipo: string;
  programa: boolean;
  convoca: boolean;
  cierra: boolean;
}

function Lista({ titulo, vacio, partidos, equipo, programa, convoca, cierra }: ListaProps) {
  return (
    <Card title={titulo} headingLevel={2}>
      {partidos.length === 0 ? (
        <p className={styles.nota}>{vacio}</p>
      ) : (
        <ul className={styles.lista}>
          {partidos.map((partido) => (
            <Fila
              key={partido.id}
              partido={partido}
              equipo={equipo}
              programa={programa}
              convoca={convoca}
              cierra={cierra}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

export function CalendarioPage() {
  const { equipoId, equipoNombre, temporadaId } = useEquipoActivo();
  const calendario = useCalendario(equipoId, temporadaId);
  // `undefined` mientras no se saben los permisos: no se enseña el botón
  // hasta saber que se puede, en vez de enseñarlo y quitarlo.
  const programa = useHasPermission('schedule.manage') === true;
  const convoca = useHasPermission('lineup.manage') === true;
  const cierra = useHasPermission('match.close') === true;

  const contenido = () => {
    if (equipoId === null) {
      return (
        <p className={styles.nota}>No hay equipo activo, así que no hay calendario que enseñar.</p>
      );
    }

    if (temporadaId === null) {
      return (
        <p className={styles.nota}>
          El club no tiene ninguna temporada en curso, y el calendario va por temporada.
        </p>
      );
    }

    if (calendario.isPending) {
      return <p className={styles.nota}>Cargando…</p>;
    }

    if (calendario.isError) {
      return (
        <div className={styles.error}>
          <p className={styles.nota}>
            No se ha podido cargar el calendario. Suele ser falta de cobertura.
          </p>
          <div>
            <Button
              variant="secondary"
              onClick={() => {
                void calendario.refetch();
              }}
            >
              Reintentar
            </Button>
          </div>
        </div>
      );
    }

    const { proximos, jugados } = separarCalendario(calendario.data);

    return (
      <>
        <Lista
          titulo="Por jugar"
          vacio={
            programa
              ? 'No hay partidos programados. Añade el primero con «Nuevo partido».'
              : 'No hay partidos programados.'
          }
          partidos={proximos}
          equipo={equipoNombre}
          programa={programa}
          convoca={convoca}
          cierra={cierra}
        />
        <Lista
          titulo="Jugados"
          vacio="Todavía no se ha jugado ninguno esta temporada."
          partidos={jugados}
          equipo={equipoNombre}
          programa={programa}
          convoca={convoca}
          cierra={cierra}
        />
      </>
    );
  };

  return (
    <Pantalla id="A09" titulo="Calendario">
      {programa && equipoId !== null && temporadaId !== null ? (
        <p>
          <Link className={styles.nuevo} to="/partidos/nuevo">
            Nuevo partido
          </Link>
        </p>
      ) : null}
      {contenido()}
    </Pantalla>
  );
}
