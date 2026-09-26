// Grupo de opciones excluyentes con `fieldset` y `legend` (T-203).
//
// Radios nativos: nombre, estado y teclado de serie, y el cambio se dispara al
// soltar el dedo (2.5.2). Toda la fila responde al toque.

import { useId } from 'react';

import styles from './Formulario.module.css';

interface Opcion<T extends string> {
  valor: T;
  etiqueta: string;
}

interface GrupoDeOpcionesProps<T extends string> {
  leyenda: string;
  opciones: readonly Opcion<T>[];
  valor: T;
  alCambiar: (valor: T) => void;
}

export function GrupoDeOpciones<T extends string>({
  leyenda,
  opciones,
  valor,
  alCambiar,
}: GrupoDeOpcionesProps<T>) {
  const nombre = useId();

  return (
    <fieldset className={styles.grupo}>
      <legend className={styles.leyenda}>{leyenda}</legend>
      {opciones.map((opcion) => (
        <label key={opcion.valor} className={styles.opcion} htmlFor={`${nombre}-${opcion.valor}`}>
          <input
            id={`${nombre}-${opcion.valor}`}
            className={styles.marca}
            type="radio"
            name={nombre}
            checked={valor === opcion.valor}
            onChange={() => {
              alCambiar(opcion.valor);
            }}
          />
          <span>{opcion.etiqueta}</span>
        </label>
      ))}
    </fieldset>
  );
}
