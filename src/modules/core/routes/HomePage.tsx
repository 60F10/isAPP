// Pantalla A02 — Inicio
//
// Los tres bloques del DOC 02 §3: próximo evento, accesos rápidos y avisos
// pendientes. Sin datos de servidor todavía —eso es la T-204—, así que cada
// bloque enseña su estado vacío escrito de verdad. Un «TODO» en pantalla no
// dice nada; un estado vacío bien redactado explica qué va a salir ahí.

import { Link } from 'react-router';

import { Card } from '@shared/ui/Card';
import { Pantalla } from '@shared/ui/Pantalla';

import styles from './HomePage.module.css';

interface Acceso {
  to: string;
  texto: string;
}

const ACCESOS: readonly Acceso[] = [
  { to: '/calendario', texto: 'Ver el calendario' },
  { to: '/equipos', texto: 'Ver el equipo' },
  { to: '/mis-aportaciones', texto: 'Mis aportaciones' },
];

export function HomePage() {
  return (
    <Pantalla id="A02" titulo="Inicio">
      <Card title="Próximo evento" headingLevel={2}>
        <p className={styles.vacio}>
          Todavía no hay partidos en el calendario. Cuando haya uno programado, aquí saldrá el
          rival, la hora y el campo, con el acceso directo a la convocatoria.
        </p>
      </Card>

      <Card title="Accesos rápidos" headingLevel={2}>
        <ul className={styles.accesos}>
          {ACCESOS.map((acceso) => (
            <li key={acceso.to}>
              <Link className={styles.acceso} to={acceso.to}>
                {acceso.texto}
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Avisos pendientes" headingLevel={2}>
        <p className={styles.vacio}>
          No hay nada pendiente. Aquí saldrán los datos sin aprobar, los partidos sin cerrar y lo
          que quede por sincronizar.
        </p>
      </Card>
    </Pantalla>
  );
}
