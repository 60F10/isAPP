// Lo que va dentro de la tarjeta «Próximo evento» de Inicio (T-213, D06-34).
//
// El próximo partido del equipo activo, con las mismas acciones que su fila
// del calendario: el DOC 02 §3.3 pide el directo a un toque desde Inicio.
//
// Lee la misma consulta que la A09, `useCalendario`, así que no hay llamada
// nueva a la base y, viniendo del calendario, sale de la caché. Cuál es el
// próximo lo decide `proximoPartido`.
//
// No pinta la tarjeta ni su título: eso es de `HomePage`, que vive en `core`
// y recibe esto por su prop `proximoEvento`.

import { Button } from '@shared/ui/Button';

import { useCalendario, useEquipoActivo } from '../hooks/usePartidos';
import { proximoPartido } from '../model/partido';

import { ResumenDePartido } from './ResumenDePartido';

import styles from './ProximoPartido.module.css';

function SinPartidos() {
  return (
    <p className={styles.nota}>
      Todavía no hay partidos por jugar. Cuando haya uno programado, aquí saldrá el rival, la hora y
      el campo, con el acceso a la convocatoria y al directo.
    </p>
  );
}

export function ProximoPartido() {
  const { equipoId, equipoNombre, temporadaId } = useEquipoActivo();
  const calendario = useCalendario(equipoId, temporadaId);

  // Sin equipo o sin temporada no hay calendario que pedir, y la consulta se
  // quedaría en «cargando» para siempre.
  if (equipoId === null || temporadaId === null) {
    return <SinPartidos />;
  }

  if (calendario.isPending) {
    return <p className={styles.nota}>Cargando…</p>;
  }

  if (calendario.isError) {
    return (
      <div className={styles.error}>
        <p className={styles.nota}>
          No se ha podido cargar el próximo partido. Suele ser falta de cobertura.
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

  const partido = proximoPartido(calendario.data);

  if (partido === null) {
    return <SinPartidos />;
  }

  return <ResumenDePartido partido={partido} equipo={equipoNombre} />;
}
