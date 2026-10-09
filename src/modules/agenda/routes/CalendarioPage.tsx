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
// LOS ENTRENAMIENTOS SALEN DENTRO DEL CALENDARIO (E4-01, T-231, D06-42). Los
// de hoy a catorce días van en «Por jugar», mezclados con los partidos por
// fecha; «Jugados» sigue siendo solo de partidos. El horario entero y los
// pasados están en su pantalla, `/entrenamientos`, con el enlace «Todos los
// entrenamientos». `agenda` los lee de `training` por su barril.
//
// Los ve cualquiera con función en el equipo, que el horario es de todo el
// club. Quien solo sigue al equipo no: la base no le deja leerlos, así que ni
// se piden ni se enlazan.
//
// LOS ENTRENAMIENTOS NO MANDAN SOBRE EL CALENDARIO. La pantalla espera a los
// partidos, como siempre, y los entrenamientos aparecen cuando llegan, sin
// mover el foco. Si su consulta falla, los partidos salen igual y una línea
// bajo la tarjeta lo dice.

import { Link } from 'react-router';

import { useAuth, useHasPermission } from '@modules/auth';
import { useEntrenamientos } from '@modules/training';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { Pantalla } from '@shared/ui/Pantalla';

import { ResumenDeEntrenamiento } from '../components/ResumenDeEntrenamiento';
import { ResumenDePartido } from '../components/ResumenDePartido';
import { useCalendario, useEquipoActivo } from '../hooks/usePartidos';
import { mezclarAgenda, tieneFuncion } from '../model/agenda';
import { separarCalendario } from '../model/partido';

import styles from './CalendarioPage.module.css';

import type { EntradaDeAgenda } from '../model/agenda';

interface ListaProps {
  titulo: string;
  vacio: string;
  entradas: readonly EntradaDeAgenda[];
  equipo: string;
}

function Lista({ titulo, vacio, entradas, equipo }: ListaProps) {
  return (
    <Card title={titulo} headingLevel={2}>
      {entradas.length === 0 ? (
        <p className={styles.nota}>{vacio}</p>
      ) : (
        <ul className={styles.lista}>
          {entradas.map((entrada) =>
            entrada.tipo === 'partido' ? (
              <li key={`partido-${entrada.partido.id}`} className={styles.fila}>
                <ResumenDePartido partido={entrada.partido} equipo={equipo} />
              </li>
            ) : (
              <li key={`entrenamiento-${entrada.entrenamiento.id}`} className={styles.fila}>
                <ResumenDeEntrenamiento entrenamiento={entrada.entrenamiento} />
              </li>
            ),
          )}
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
  // Con función en el equipo activo, y no solo siguiéndolo (T-301c).
  const { teams, activeTeamId } = useAuth();
  const conFuncion = tieneFuncion(teams, activeTeamId);
  // Sin función, la consulta se queda apagada: un seguidor no puede leerlos.
  const entrenamientos = useEntrenamientos(conFuncion ? equipoId : null, temporadaId);

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
    // Mientras los entrenamientos no llegan, o si fallan, la mezcla son solo
    // los partidos, en su orden de siempre.
    const porJugar = mezclarAgenda(proximos, entrenamientos.data ?? [], new Date());

    return (
      <>
        <Lista
          titulo="Por jugar"
          vacio={
            programa
              ? 'No hay partidos programados. Añade el primero con «Nuevo partido».'
              : 'No hay partidos programados.'
          }
          entradas={porJugar}
          equipo={equipoNombre}
        />
        {entrenamientos.isError ? (
          <p className={styles.nota}>No se han podido cargar los entrenamientos.</p>
        ) : null}
        <Lista
          titulo="Jugados"
          vacio="Todavía no se ha jugado ninguno esta temporada."
          entradas={jugados.map((partido) => ({ tipo: 'partido', partido }))}
          equipo={equipoNombre}
        />
      </>
    );
  };

  return (
    <Pantalla id="A09" titulo="Calendario">
      {equipoId !== null && ((programa && temporadaId !== null) || conFuncion) ? (
        <div className={styles.enlaces}>
          {programa && temporadaId !== null ? (
            <Link className={styles.nuevo} to="/partidos/nuevo">
              Nuevo partido
            </Link>
          ) : null}
          {conFuncion ? (
            <Link className={styles.otro} to="/entrenamientos">
              Todos los entrenamientos
            </Link>
          ) : null}
        </div>
      ) : null}
      {contenido()}
    </Pantalla>
  );
}
