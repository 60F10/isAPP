// Campo de formulario del DOC 07 §9: etiqueta siempre visible, nunca el
// placeholder haciendo de etiqueta, y el error con icono y texto.

import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

import { Icon } from './Icon';

import styles from './Field.module.css';

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  /** Etiqueta visible. Obligatoria: es el nombre accesible del campo. */
  label: string;
  /** Ayuda breve bajo la etiqueta, si el campo la necesita. */
  hint?: ReactNode;
  /** Mensaje de error. Su presencia marca el campo como inválido. */
  error?: string;
  className?: string;
}

export function Field({ label, hint, error, id, className, required, ...rest }: FieldProps) {
  const generated = useId();
  const inputId = id ?? `field${generated}`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  const describedBy =
    [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined;

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
        {/* «Obligatorio» en palabras y no un asterisco: el asterisco hay que
            explicarlo en una leyenda que nadie lee y que el lector de
            pantalla anuncia como «asterisco». */}
        {required ? <span className={styles.required}> (obligatorio)</span> : null}
      </label>

      {hint ? (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      ) : null}

      <input
        {...rest}
        id={inputId}
        required={required}
        className={[styles.input, error ? styles.invalid : ''].filter(Boolean).join(' ')}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
      />

      {/* Sin aria-live: el error ya viaja en aria-describedby y el lector lo
          leería dos veces. Los avisos de envío van a la región viva única
          del AppLayout (DOC 06 §6.3). */}
      {error ? (
        <p className={styles.error} id={errorId}>
          <Icon name="close" size="sm" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
