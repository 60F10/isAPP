// Región viva única de la aplicación (DOC 06 §6.3).
//
// Una sola, y pintada siempre. Si el contenedor apareciera a la vez que el
// texto, la mitad de los lectores de pantalla no anunciarían nada: la región
// tiene que existir en el árbol antes de que el mensaje entre en ella.
//
// Ojo, no sustituye al `Toast`: el aviso visible es otra cosa y tiene su
// propia región. Esta es para lo que no se ve, como «Convocatoria guardada»
// al terminar una acción que no cambia la pantalla.

import { useEffect, useMemo, useRef, useState } from 'react';

import { AnnounceContext } from '@shared/hooks/announceContext';

import styles from './AnnounceProvider.module.css';

import type { AnnounceApi } from '@shared/hooks/announceContext';
import type { ReactNode } from 'react';

interface AnnounceProviderProps {
  children: ReactNode;
}

export function AnnounceProvider({ children }: AnnounceProviderProps) {
  const [mensaje, setMensaje] = useState('');
  const temporizador = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      window.clearTimeout(temporizador.current);
    };
  }, []);

  const valor = useMemo<AnnounceApi>(
    () => ({
      anunciar: (texto) => {
        // Se vacía y se vuelve a llenar en dos pasos. El lector compara el
        // contenido de la región y, si no cambia, se calla: sin esto el
        // segundo «Gol registrado» seguido no se anunciaría. El corte en dos
        // tiempos es lo que rompe el agrupado de React y fuerza el cambio.
        window.clearTimeout(temporizador.current);
        setMensaje('');
        temporizador.current = window.setTimeout(() => {
          setMensaje(texto);
        });
      },
    }),
    [],
  );

  return (
    <AnnounceContext value={valor}>
      {children}
      {/* `aria-live` + `aria-atomic` es exactamente lo que aporta
          `role="status"`, y no choca con la regla `prefer-tag-over-role` de
          oxlint. Mismo par que usa `shared/ui/Toast`. */}
      <p className={styles.visualmenteOculto} aria-live="polite" aria-atomic="true">
        {mensaje}
      </p>
    </AnnounceContext>
  );
}
