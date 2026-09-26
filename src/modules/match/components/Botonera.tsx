// La botonera del directo (T-208, DOC 02 §4). Un botón por acción, con la
// definición de lo que cuenta escrita debajo (DOC 04 §7.6): sin ella, dos
// anotadores producen números que no se pueden comparar.

import { useId } from 'react';

import { Icon } from '@shared/ui/Icon';

import styles from './Registro.module.css';

import type { Boton, BotonDeBotonera } from '../model/flujo';

interface BotoneraProps {
  botones: readonly BotonDeBotonera[];
  /** Botones desactivados, con el motivo en palabras (R-04: cambios agotados). */
  desactivados?: Partial<Record<Boton, string>>;
  alElegir: (boton: Boton) => void;
}

export function Botonera({ botones, desactivados = {}, alElegir }: BotoneraProps) {
  const id = useId();

  // El nombre del botón es la acción; la definición va como descripción, que
  // el lector de pantalla lee después y sin mezclarla con el nombre.
  return (
    <ul className={styles.botonera} aria-label="Apuntar">
      {botones.map((boton) => (
        <li key={boton.boton}>
          <button
            type="button"
            className={styles.evento}
            aria-label={boton.nombre}
            aria-describedby={`${id}-${boton.boton}`}
            disabled={desactivados[boton.boton] !== undefined}
            onClick={() => {
              alElegir(boton.boton);
            }}
          >
            <span className={styles.nombre}>
              <Icon name={boton.icono} />
              <span>{boton.nombre}</span>
            </span>
            <span id={`${id}-${boton.boton}`} className={styles.definicion}>
              {desactivados[boton.boton] ?? boton.definicion}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
