// Envoltorio de toda pantalla (DOC 06 §6.3).
//
// Resuelve de una vez los dos criterios que se olvidan pantalla a pantalla:
// 2.4.2, cada página con su título, y 2.4.3, el foco donde toca al entrar. Al
// navegar, react-router cambia el árbol pero no mueve el foco ni toca el
// título: sin esto, quien usa lector de pantalla se queda en el enlace que
// acaba de pulsar y no se entera de que ha cambiado de pantalla.
//
// Vive en `shared/ui` y no en `app/` porque lo usa la pantalla de cada módulo,
// y de `app/` no importa nadie (DOC 06 §4.1, regla 1).

import { useEffect, useRef } from 'react';

import styles from './Pantalla.module.css';

import type { ReactNode } from 'react';

/** Nombre visible de la aplicación (DOC 03 §F1.1: vive en una sola constante). */
const NOMBRE_APP = 'GavetaStats';

interface PantallaProps {
  /** Identificador de pantalla del DOC 02 §2: A02, C05, B01… */
  id: string;
  /** Encabezado de nivel 1 y primera mitad del título del documento. */
  titulo: string;
  children: ReactNode;
}

export function Pantalla({ id, titulo, children }: PantallaProps) {
  const encabezado = useRef<HTMLHeadingElement>(null);

  // Depende del `id`, no del título: dos pantallas distintas mueven el foco
  // aunque se llamen igual, y una que solo cambia de título —la ficha de otro
  // jugador, por ejemplo— no se lo roba a quien esté escribiendo.
  useEffect(() => {
    encabezado.current?.focus();
  }, [id]);

  useEffect(() => {
    document.title = `${titulo} · ${NOMBRE_APP}`;
  }, [titulo]);

  return (
    <div className={styles.pantalla} data-pantalla={id}>
      <h1 ref={encabezado} className={styles.titulo} tabIndex={-1}>
        {titulo}
      </h1>
      {children}
    </div>
  );
}
