// Grupo de opciones excluyentes con `fieldset` y `legend`. Nace en `rules`
// con la T-203 y sube aquí en la T-204, cuando `agenda` lo necesita también.
//
// Radios nativos: nombre, estado y teclado de serie, y el cambio se dispara al
// soltar el dedo (2.5.2). Toda la fila responde al toque.
//
// `enLinea` pone las opciones una al lado de otra y las baja de línea si no
// caben: lo pide la convocatoria (T-205), con tres opciones por jugador.

import { useId } from 'react';

import styles from './GrupoDeOpciones.module.css';

interface Opcion<T extends string> {
  valor: T;
  etiqueta: string;
}

interface GrupoDeOpcionesProps<T extends string> {
  leyenda: string;
  opciones: readonly Opcion<T>[];
  valor: T;
  alCambiar: (valor: T) => void;
  enLinea?: boolean;
}

export function GrupoDeOpciones<T extends string>({
  leyenda,
  opciones,
  valor,
  alCambiar,
  enLinea = false,
}: GrupoDeOpcionesProps<T>) {
  const nombre = useId();

  return (
    <fieldset className={enLinea ? `${styles.grupo} ${styles.enLinea}` : styles.grupo}>
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
