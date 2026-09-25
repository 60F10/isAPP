// Pantalla C03 — Error de aplicación (DOC 02 §2, E12-02).
//
// Vista pura: ni red, ni contexto, ni enrutador. Tiene que poder pintarse
// cuando todo lo demás ha fallado —el Error Boundary por encima de los
// proveedores, el arranque sin configuración—, así que no depende de nada que
// pueda ser justo lo que falló. Por eso las dos salidas recargan la página
// entera en vez de navegar con react-router: después de un fallo así, el
// estado en memoria no es de fiar y lo sano es empezar de cero.
//
// Lleva su propio `<main>`: sale fuera de las maquetas, que son quienes lo
// ponen en el resto de pantallas.

import { Button } from '@shared/ui/Button';
import { Pantalla } from '@shared/ui/Pantalla';

import styles from './PantallaError.module.css';

import type { ReactNode } from 'react';

interface PantallaErrorProps {
  /** Encabezado. Por defecto, «Algo ha fallado». */
  titulo?: string;
  /** Qué ha pasado y qué puede hacer quien lo lee, en su idioma. */
  children: ReactNode;
  /**
   * Texto técnico para quien lleve la aplicación. Sale plegado: a pie de campo
   * nadie lo necesita, pero una captura de pantalla con él abierto ahorra
   * media tarde de depuración.
   */
  detalle?: string;
}

export function PantallaError({
  titulo = 'Algo ha fallado',
  children,
  detalle,
}: PantallaErrorProps) {
  return (
    <main id="contenido" className={styles.marco}>
      <Pantalla id="C03" titulo={titulo}>
        <div className={styles.texto}>{children}</div>

        <div className={styles.acciones}>
          <Button
            variant="primary"
            onClick={() => {
              window.location.reload();
            }}
          >
            Recargar
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              window.location.assign('/');
            }}
          >
            Ir al inicio
          </Button>
        </div>

        {detalle === undefined ? null : (
          <details className={styles.detalle}>
            <summary className={styles.resumen}>Detalle técnico</summary>
            <pre className={styles.pre}>{detalle}</pre>
          </details>
        )}
      </Pantalla>
    </main>
  );
}
