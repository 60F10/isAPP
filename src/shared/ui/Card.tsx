// Superficie elevada del DOC 07 §9. La sombra la pone --shadow-raised, que en
// alto contraste vale `none`: por eso la tarjeta lleva siempre borde, y ese
// borde se vuelve negro en alto contraste sin que el componente se entere.

import type { ReactNode, Ref } from 'react';

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
  /**
   * Para llevar el foco al título desde fuera, cuando desaparece el control
   * que lo tenía. Con él, el título se puede enfocar por código (`tabIndex`
   * −1) sin entrar en el orden de tabulación.
   */
  headingRef?: Ref<HTMLHeadingElement>;
}

export function Card({
  children,
  title,
  headingLevel = 3,
  as: Container = title ? 'section' : 'div',
  className,
  headingRef,
}: CardProps) {
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';

  return (
    <Container className={[styles.card, className].filter(Boolean).join(' ')}>
      {title ? (
        <Heading
          ref={headingRef}
          className={styles.title}
          tabIndex={headingRef === undefined ? undefined : -1}
        >
          {title}
        </Heading>
      ) : null}
      {children}
    </Container>
  );
}
