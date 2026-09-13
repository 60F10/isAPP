// Componente único de icono (DOC 07 §8.1). Ninguna pantalla importa un .svg:
// todas piden <Icon name="goal" />.

import { ICON_MARKUP, type IconName } from './icons/registry';

import styles from './Icon.module.css';

export type { IconName };

export type IconSize = 'sm' | 'md' | 'lg';

interface IconProps {
  /** Nombre del archivo de `icons/`, sin extensión. */
  name: IconName;
  /** Lienzo del icono. Por defecto 24 px, el del contrato del §8.1. */
  size?: IconSize;
  /** Clases del control que lo lleva, si necesita colocarlo. */
  className?: string;
}

/**
 * Icono monocolor. Hereda el color del texto del control que lo contiene y
 * queda oculto al lector de pantalla: el nombre accesible lo pone ese
 * control, nunca el icono (§8.1).
 */
export function Icon({ name, size = 'md', className }: IconProps) {
  const classes = [styles.icon, styles[size], className].filter(Boolean).join(' ');

  return (
    <span
      className={classes}
      aria-hidden="true"
      // El contenido sale de src/shared/ui/icons/*.svg, archivos del propio
      // repositorio: por aquí no entra nada escrito por un usuario. Se inyecta
      // el SVG entero, con su viewBox y su trazo, para que el contrato del
      // icono siga viviendo solo en el archivo.
      dangerouslySetInnerHTML={{ __html: ICON_MARKUP[name] }}
    />
  );
}
