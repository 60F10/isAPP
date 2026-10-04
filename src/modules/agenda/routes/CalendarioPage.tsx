// Pantalla A09 — Calendario (T-204, E4-02 a E4-04).
//
// Los partidos del equipo activo en la temporada en curso, en dos listas: por
// jugar, del más cercano al más lejano, y jugados, del más reciente al más
// antiguo. La abre cualquiera que pertenezca al equipo; programar y editar
// solo quien tiene `schedule.manage`, la convocatoria quien tiene
// `lineup.manage` y el directo (T-212) quien tiene `match.live.write`. Lo que
// no se puede hacer no se enseña. Cada partido lo pinta `ResumenDePartido`
// (T-213), que es quien lee esos permisos; aquí solo queda el de programar.
//
// Los entrenamientos (E4-01) no salen todavía: su pantalla es de después del
// MVP (DOC 08 §7).

import { Link } from 'react-router';

import { useHasPermission } from '@modules/auth';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { Pantalla } from '@shared/ui/Pantalla';

import { ResumenDePartido } from '../components/ResumenDePartido';
import { useCalendario, useEquipoActivo } from '../hooks/usePartidos';
import { separarCalendario } from '../model/partido';

import styles from './CalendarioPage.module.css';

import type { Partido } from '../model/partido';

interface ListaProps {
  titulo: string;
  vacio: string;
  partidos: readonly Partido[];
  equipo: string;
}

function Lista({ titulo, vacio, partidos, equipo }: ListaProps) {
  return (
    <Card title={titulo} headingLevel={2}>
      {partidos.length === 0 ? (
        <p className={styles.nota}>{vacio}</p>
      ) : (
        <ul className={styles.lista}>
          {partidos.map((partido) => (
            <li key={partido.id} className={styles.fila}>
              <ResumenDePartido partido={partido} equipo={equipo} />
            </li>
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
        />
        <Lista
          titulo="Jugados"
          vacio="Todavía no se ha jugado ninguno esta temporada."
          partidos={jugados}
          equipo={equipoNombre}
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
