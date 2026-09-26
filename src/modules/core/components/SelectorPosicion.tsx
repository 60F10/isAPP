// Selector de posición por defecto (E2-06), compartido por A05 y A06.
//
// Un `<select>` nativo: en el móvil abre el selector del sistema, grande y
// accesible de serie, y cambia al soltar el dedo.

import { useId } from 'react';

import { POSICIONES } from '../model/plantilla';

import styles from './SelectorPosicion.module.css';

import type { Posicion } from '../model/plantilla';

interface SelectorPosicionProps {
  valor: Posicion | '';
  alCambiar: (valor: Posicion | '') => void;
}

function esPosicion(valor: string): valor is Posicion {
  return valor in POSICIONES;
}

export function SelectorPosicion({ valor, alCambiar }: SelectorPosicionProps) {
  const id = useId();

  return (
    <div className={styles.campo}>
      <label className={styles.etiqueta} htmlFor={id}>
        Posición habitual
      </label>
      <select
        id={id}
        className={styles.selector}
        value={valor}
        onChange={(evento) => {
          const elegido = evento.target.value;
          alCambiar(esPosicion(elegido) ? elegido : '');
        }}
      >
        <option value="">Sin decidir</option>
        {Object.entries(POSICIONES).map(([codigo, nombre]) => (
          <option key={codigo} value={codigo}>
            {nombre}
          </option>
        ))}
      </select>
    </div>
  );
}
