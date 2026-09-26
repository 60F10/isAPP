// Estados de carga y error de las pantallas de `core` (DOC 06 §10.1, capa 2).
//
// El error se queda dentro de la pantalla y no la tumba: el título, la
// navegación y el resto siguen en su sitio, y «Reintentar» vuelve a preguntar.

import { Button } from '@shared/ui/Button';

import styles from './EstadoDeCarga.module.css';

export function Cargando() {
  return <p className={styles.texto}>Cargando…</p>;
}

interface ErrorDeCargaProps {
  /** Qué no se ha podido cargar, en minúscula: «el club», «los equipos». */
  que: string;
  onReintentar: () => void;
}

export function ErrorDeCarga({ que, onReintentar }: ErrorDeCargaProps) {
  return (
    <div className={styles.error}>
      <p className={styles.texto}>No se ha podido cargar {que}. Suele ser falta de cobertura.</p>
      <div>
        <Button variant="secondary" onClick={onReintentar}>
          Reintentar
        </Button>
      </div>
    </div>
  );
}
