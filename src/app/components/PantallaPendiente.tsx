// Hueco de pantalla sin construir.
//
// Una sola pieza para todas las rutas que todavía no tienen su pantalla. Así
// el árbol de rutas del DOC 02 §3 está entero desde hoy —se navega, se prueba
// el foco y se comprueban los permisos— sin fingir funcionalidad que no hay.

import { Pantalla } from '@shared/ui/Pantalla';

import styles from './PantallaPendiente.module.css';

interface PantallaPendienteProps {
  /** Identificador de pantalla del DOC 02 §2. */
  id: string;
  titulo: string;
  /** Tarea del DOC 08 que la construye, tal como se quiere leer en la frase. */
  tarea: string;
}

export function PantallaPendiente({ id, titulo, tarea }: PantallaPendienteProps) {
  return (
    <Pantalla id={id} titulo={titulo}>
      <p className={styles.aviso}>Esta pantalla todavía no está construida. Llega con {tarea}.</p>
    </Pantalla>
  );
}
