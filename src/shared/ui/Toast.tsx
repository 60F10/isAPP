// Confirmación efímera del DOC 07 §9. Dos segundos, `aria-live="polite"` y
// por encima de la botonera.
//
// La región viva se pinta siempre, vacía mientras no haya mensaje. Si el
// contenedor apareciera a la vez que el texto, la mitad de los lectores de
// pantalla no anunciarían nada: la región tiene que existir antes de que el
// mensaje entre en ella.

import { useEffect, useRef } from 'react';

import { Icon } from './Icon';
import type { IconName } from './icons/registry';

import styles from './Toast.module.css';

export type ToastTone = 'success' | 'danger' | 'sync';

const ICONS: Record<ToastTone, IconName> = {
  success: 'check',
  danger: 'close',
  sync: 'sync',
};

/** Duración de referencia si el token no se puede leer. Ver `readDuration`. */
const FALLBACK_DURATION_MS = 2000;

/**
 * Lee `--duration-toast` del documento. Da un rodeo, sí, pero mantiene el
 * tiempo en `tokens.css` y no en dos sitios (DOC 07 §10, regla 1).
 */
function readDuration(): number {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--duration-toast')
    .trim();
  const value = Number.parseFloat(raw);

  if (!Number.isFinite(value)) {
    return FALLBACK_DURATION_MS;
  }

  return raw.endsWith('ms') ? value : value * 1000;
}

interface ToastProps {
  /** Si hay mensaje en pantalla. */
  open: boolean;
  /** Texto de la confirmación. Corto: se lee de pie y con el partido andando. */
  message: string;
  tone?: ToastTone;
  /** Milisegundos en pantalla. Por defecto, los del token `--duration-toast`. */
  durationMs?: number;
  /** Se llama al agotarse el tiempo. Quien lo reciba baja `open`. */
  onClose: () => void;
  className?: string;
}

export function Toast({
  open,
  message,
  tone = 'success',
  durationMs,
  onClose,
  className,
}: ToastProps) {
  // El temporizador no se reinicia porque el padre pase una función nueva en
  // cada render: solo lo reinicia un mensaje nuevo.
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = window.setTimeout(() => {
      onCloseRef.current();
    }, durationMs ?? readDuration());

    return () => {
      window.clearTimeout(timer);
    };
  }, [open, message, durationMs]);

  return (
    <div
      className={[styles.viewport, className].filter(Boolean).join(' ')}
      aria-live="polite"
      aria-atomic="true"
    >
      {open ? (
        <div className={[styles.toast, styles[tone]].join(' ')}>
          <Icon name={ICONS[tone]} />
          <span>{message}</span>
        </div>
      ) : null}
    </div>
  );
}
