// Pantalla A02 — Inicio
//
// Los tres bloques del DOC 02 §3: próximo evento, accesos rápidos y avisos
// pendientes. Un «TODO» en pantalla no dice nada; un estado vacío bien
// redactado explica qué va a salir ahí.
//
// EL PRÓXIMO EVENTO LLEGA DE FUERA (T-213, D06-34). El próximo partido sale
// del calendario, que es de `agenda`, y `core` no puede importar de `agenda`
// (DOC 06 §4.2). Así que esta pantalla expone un enganche, `proximoEvento`, y
// es `agenda` quien la envuelve con `InicioPage`, que es la que carga el
// enrutador. Sin la prop, la tarjeta enseña su estado vacío. No importes de
// `agenda` aquí.
//
// Los avisos pendientes siguen sin datos de servidor.

import { Link } from 'react-router';

import { Card } from '@shared/ui/Card';
import { Pantalla } from '@shared/ui/Pantalla';

import styles from './HomePage.module.css';

import type { ReactNode } from 'react';

interface Acceso {
  to: string;
  texto: string;
}

const ACCESOS: readonly Acceso[] = [
  { to: '/calendario', texto: 'Ver el calendario' },
  { to: '/equipos', texto: 'Ver el equipo' },
  { to: '/mis-aportaciones', texto: 'Mis aportaciones' },
];

interface HomePageProps {
  /** Lo que va dentro de la tarjeta «Próximo evento», en vez del texto vacío. */
  proximoEvento?: ReactNode;
}

export function HomePage({ proximoEvento }: HomePageProps = {}) {
  return (
    <Pantalla id="A02" titulo="Inicio">
      <Card title="Próximo evento" headingLevel={2}>
        {proximoEvento === undefined ? (
          <p className={styles.vacio}>
            Todavía no hay partidos en el calendario. Cuando haya uno programado, aquí saldrá el
            rival, la hora y el campo, con el acceso directo a la convocatoria.
          </p>
        ) : (
          proximoEvento
        )}
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
