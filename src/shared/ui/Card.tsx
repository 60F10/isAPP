// Superficie elevada del DOC 07 §9. La sombra la pone --shadow-raised, que en
// alto contraste vale `none`: por eso la tarjeta lleva siempre borde, y ese
// borde se vuelve negro en alto contraste sin que el componente se entere.

import type { ReactNode } from 'react';

import styles from './Card.module.css';

interface CardProps {
  children: ReactNode;
  /** Título de la tarjeta. Si se pasa, se pinta como encabezado real. */
  title?: ReactNode;
  /** Nivel del encabezado. Lo decide la pantalla, no la tarjeta. */
  headingLevel?: 2 | 3 | 4;
  /** Elemento contenedor. `section` cuando la tarjeta es una región con
      título; `li` cuando va dentro de una lista. */
  as?: 'div' | 'section' | 'article' | 'li';
  className?: string;
}

export function Card({
  children,
  title,
  headingLevel = 3,
  as: Container = title ? 'section' : 'div',
  className,
}: CardProps) {
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';

  return (
    <Container className={[styles.card, className].filter(Boolean).join(' ')}>
      {title ? <Heading className={styles.title}>{title}</Heading> : null}
      {children}
    </Container>
  );
}
