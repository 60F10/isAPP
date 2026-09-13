// Botón base del DOC 07 §9. Tres variantes, 48 px de alto mínimo y la acción
// siempre en onClick: se dispara al levantar el dedo y se cancela si el dedo
// sale del control antes, que es lo que pide el criterio 2.5.2.

import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { Icon } from './Icon';
import type { IconName } from './icons/registry';

import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonOwnProps {
  variant?: ButtonVariant;
  /** Icono delante del texto. */
  iconStart?: IconName;
  /** Icono detrás del texto. */
  iconEnd?: IconName;
  /** Ocupa todo el ancho disponible. */
  fullWidth?: boolean;
}

type NativeProps = ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * O lleva texto visible, que hace de nombre accesible, o lleva `aria-label`.
 * Un botón solo con icono y sin nombre no lo anuncia ningún lector de
 * pantalla (criterio 4.1.2), así que aquí ni siquiera compila.
 */
export type ButtonProps = ButtonOwnProps &
  NativeProps &
  ({ children: ReactNode } | { children?: undefined; 'aria-label': string });

export function Button(props: ButtonProps) {
  // La unión de arriba vigila la llamada; dentro se trabaja con la forma ya
  // resuelta para no arrastrarla por cada desestructuración.
  const {
    variant = 'primary',
    iconStart,
    iconEnd,
    fullWidth = false,
    className,
    children,
    // Sin esto, un botón dentro de un formulario lo envía sin que nadie lo
    // haya pedido.
    type = 'button',
    ...rest
  } = props as ButtonOwnProps & NativeProps;

  const classes = [
    styles.button,
    styles[variant],
    fullWidth ? styles.fullWidth : '',
    children === undefined ? styles.iconOnly : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button {...rest} type={type} className={classes}>
      {iconStart ? <Icon name={iconStart} /> : null}
      {children === undefined ? null : <span className={styles.label}>{children}</span>}
      {iconEnd ? <Icon name={iconEnd} /> : null}
    </button>
  );
}
