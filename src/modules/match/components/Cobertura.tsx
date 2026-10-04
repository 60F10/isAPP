// «Sigues: todo el equipo» y su selector (T-209a, DOC 04 §10.2).
//
// Una línea bajo el marcador dice qué sigue quien anota en este aparato, y
// «Cambiar» abre en su sitio, sin ventana emergente, las opciones: todo el
// equipo, un jugador —que pide cuál entre los convocados— o solo goles y
// tarjetas. `custom` no se ofrece. Lo que hace cada elección lo decide la
// pantalla; aquí solo se pinta y se pregunta.
//
// DECLARAR NO BLOQUEA: la botonera sigue entera elija lo que elija, y el
// selector lo dice.
//
// EL FOCO. Al abrir, va a la pregunta; al elegir o cancelar, vuelve a
// «Cambiar», que es el control que abrió (2.4.3). Los botones son nativos: la
// acción salta al soltar el dedo (2.5.2). Objetivos de 72 px, como el resto
// del directo; «Cambiar», de 48, que no es lo que se pulsa con prisa.

import { useEffect, useRef, useState } from 'react';

import { Button } from '@shared/ui/Button';

import { describirCobertura } from '../model/cobertura';

import styles from './Registro.module.css';

import type { Alcance, CoberturaLocal } from '../model/cobertura';

const NOMBRES: Record<Alcance, string> = {
  full_team: 'Todo el equipo',
  single_player: 'Un jugador',
  goals_cards: 'Solo goles y tarjetas',
};

interface CoberturaProps {
  /** La declaración abierta en este aparato, o `null` si no hay ninguna. */
  cobertura: CoberturaLocal | null;
  /** Los alcances que se pueden elegir. Vacío: no se ofrece cambiar. */
  alcances: readonly Alcance[];
  /** Los convocados, ya ordenados, para «Un jugador». */
  convocados: readonly string[];
  nombre: (jugadorId: string) => string;
  dorsal: (jugadorId: string) => string | null;
  alElegir: (alcance: Alcance, jugador: string | null) => void;
}

export function Cobertura({
  cobertura,
  alcances,
  convocados,
  nombre,
  dorsal,
  alElegir,
}: CoberturaProps) {
  const [paso, setPaso] = useState<'alcance' | 'jugador' | null>(null);
  const pregunta = useRef<HTMLHeadingElement>(null);
  const linea = useRef<HTMLDivElement>(null);
  const abiertoAntes = useRef(false);

  useEffect(() => {
    if (paso !== null) {
      abiertoAntes.current = true;
      pregunta.current?.focus();
    } else if (abiertoAntes.current) {
      abiertoAntes.current = false;
      linea.current?.querySelector('button')?.focus();
    }
  }, [paso]);

  const elegir = (alcance: Alcance, jugador: string | null) => {
    setPaso(null);
    alElegir(alcance, jugador);
  };

  if (paso === null) {
    return (
      <div ref={linea} className={styles.sigues}>
        <p className={styles.siguesTexto}>Sigues: {describirCobertura(cobertura, nombre)}</p>
        {alcances.length === 0 ? null : (
          <Button
            variant="secondary"
            // El nombre empieza por lo que se lee en el botón (2.5.3).
            aria-label="Cambiar lo que sigues"
            onClick={() => {
              setPaso('alcance');
            }}
          >
            Cambiar
          </Button>
        )}
      </div>
    );
  }

  return (
    <section className={styles.flujo} aria-label="Lo que sigues">
      <h2 ref={pregunta} className={styles.pregunta} tabIndex={-1}>
        {paso === 'alcance' ? '¿Qué sigues?' : '¿A quién sigues?'}
      </h2>
      <p className={styles.nota}>
        Es para saber cuánto fiarse de cada dato. Puedes apuntar igual cualquier otra cosa que veas.
      </p>
      {paso === 'alcance' ? (
        <ul className={styles.opciones}>
          {alcances.map((alcance) => (
            <li key={alcance}>
              <button
                type="button"
                className={styles.opcion}
                onClick={() => {
                  if (alcance === 'single_player') {
                    setPaso('jugador');
                  } else {
                    elegir(alcance, null);
                  }
                }}
              >
                {NOMBRES[alcance]}
              </button>
            </li>
          ))}
        </ul>
      ) : convocados.length === 0 ? (
        <p className={styles.nota}>No hay nadie convocado.</p>
      ) : (
        <ul className={styles.opciones}>
          {convocados.map((id) => {
            const numero = dorsal(id);

            return (
              <li key={id}>
                <button
                  type="button"
                  className={styles.jugador}
                  aria-label={`Seguir a ${nombre(id)}`}
                  onClick={() => {
                    elegir('single_player', id);
                  }}
                >
                  {numero === null ? null : <span className={styles.dorsal}>{numero}</span>}
                  <span>{nombre(id).replace(/^\d+ · /, '')}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className={styles.acciones}>
        {paso === 'jugador' ? (
          <Button
            variant="secondary"
            className={styles.grande}
            onClick={() => {
              setPaso('alcance');
            }}
          >
            Atrás
          </Button>
        ) : null}
        <Button
          variant="ghost"
          className={styles.grande}
          onClick={() => {
            setPaso(null);
          }}
        >
          Seguir como estaba
        </Button>
      </div>
    </section>
  );
}
