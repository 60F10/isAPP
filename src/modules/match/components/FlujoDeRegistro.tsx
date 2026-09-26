// Un paso del flujo de registro, a pantalla completa (T-208, DOC 04 §7.4).
//
// Cada paso, una pregunta con objetivos de 72 px. Al cambiar de paso, el foco
// va a la pregunta: quien usa lector de pantalla sabe dónde está sin buscar.
// «Atrás» deshace la última respuesta y «Cancelar» tira el evento entero.

import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '@shared/ui/Button';
import { Field } from '@shared/ui/Field';

import styles from './Registro.module.css';

import type { Paso } from '../model/flujo';

interface FlujoProps {
  paso: Paso;
  titulo: string;
  nombre: (id: string) => string;
  /** El dorsal suelto, para pintarlo grande. */
  dorsal: (id: string) => string | null;
  error: string | null;
  alResponder: (clave: string, valor: string | null) => void;
  alResponderMinuto: (periodo: string, minuto: string) => void;
  alAtras: (() => void) | null;
  alCancelar: () => void;
}

function Minuto({
  periodos,
  alResponder,
}: {
  periodos: number;
  alResponder: (periodo: string, minuto: string) => void;
}) {
  const id = useId();
  const [periodo, setPeriodo] = useState('1');
  const [minuto, setMinuto] = useState('');

  return (
    <form
      className={styles.flujo}
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault();
        alResponder(periodo, minuto);
      }}
    >
      <div className={styles.campo}>
        <label className={styles.etiqueta} htmlFor={id}>
          Parte
        </label>
        <select
          id={id}
          className={styles.selector}
          value={periodo}
          onChange={(evento) => {
            setPeriodo(evento.target.value);
          }}
        >
          {Array.from({ length: periodos }, (_, i) => (
            <option key={i + 1} value={String(i + 1)}>
              {i + 1}ª parte
            </option>
          ))}
        </select>
      </div>
      <Field
        label="Minuto"
        hint="Como se enseña en el marcador: 35, o 40+2 en el descuento."
        inputMode="text"
        autoComplete="off"
        value={minuto}
        onChange={(evento) => {
          setMinuto(evento.target.value);
        }}
      />
      <div className={styles.acciones}>
        <Button type="submit" variant="primary" className={styles.grande}>
          Seguir
        </Button>
      </div>
    </form>
  );
}

function Texto({
  pregunta,
  alResponder,
}: {
  pregunta: string;
  alResponder: (texto: string) => void;
}) {
  const id = useId();
  const [texto, setTexto] = useState('');

  return (
    <form
      className={styles.flujo}
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault();
        alResponder(texto);
      }}
    >
      <div className={styles.campo}>
        <label className={styles.etiqueta} htmlFor={id}>
          {pregunta}
        </label>
        <textarea
          id={id}
          className={styles.area}
          maxLength={280}
          value={texto}
          onChange={(evento) => {
            setTexto(evento.target.value);
          }}
        />
      </div>
      <div className={styles.acciones}>
        <Button type="submit" variant="primary" className={styles.grande}>
          Guardar la nota
        </Button>
      </div>
    </form>
  );
}

export function FlujoDeRegistro({
  paso,
  titulo,
  nombre,
  dorsal,
  error,
  alResponder,
  alResponderMinuto,
  alAtras,
  alCancelar,
}: FlujoProps) {
  const pregunta = useRef<HTMLHeadingElement>(null);
  const clave = paso.clase === 'minuto' ? 'minuto' : paso.clave;

  useEffect(() => {
    pregunta.current?.focus();
  }, [clave]);

  const cuerpo = () => {
    switch (paso.clase) {
      case 'minuto':
        return <Minuto periodos={paso.periodos} alResponder={alResponderMinuto} />;

      case 'texto':
        return (
          <Texto
            pregunta={paso.pregunta}
            alResponder={(texto) => {
              alResponder(paso.clave, texto);
            }}
          />
        );

      case 'opciones':
        return (
          <ul className={styles.opciones}>
            {paso.opciones.map((opcion) => (
              <li key={opcion.valor}>
                <button
                  type="button"
                  className={styles.opcion}
                  onClick={() => {
                    alResponder(paso.clave, opcion.valor);
                  }}
                >
                  {opcion.etiqueta}
                </button>
              </li>
            ))}
          </ul>
        );

      case 'jugador':
        return paso.candidatos.length === 0 ? (
          <p className={styles.nota}>No hay nadie que pueda ser.</p>
        ) : (
          <ul className={styles.opciones}>
            {paso.candidatos.map((id) => {
              const numero = dorsal(id);

              return (
                <li key={id}>
                  <button
                    type="button"
                    className={styles.jugador}
                    aria-label={nombre(id)}
                    onClick={() => {
                      alResponder(paso.clave, id);
                    }}
                  >
                    {numero === null ? null : <span className={styles.dorsal}>{numero}</span>}
                    <span>{nombre(id).replace(/^\d+ · /, '')}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        );
    }
  };

  const titular = paso.clase === 'minuto' ? '¿Cuándo pasó?' : paso.pregunta;

  return (
    <section className={styles.flujo} aria-label={titulo}>
      <h2 ref={pregunta} className={styles.pregunta} tabIndex={-1}>
        {titulo}: {titular}
      </h2>
      {/* Siempre pintada, vacía si no hay error: una región viva que aparece a
          la vez que su texto no la anuncia la mitad de los lectores. */}
      <p className={styles.error} aria-live="polite">
        {error ?? ''}
      </p>
      {cuerpo()}
      <div className={styles.acciones}>
        {paso.clase !== 'minuto' && paso.clase !== 'texto' && paso.saltar !== undefined ? (
          <Button
            variant="secondary"
            className={styles.grande}
            onClick={() => {
              alResponder(paso.clave, null);
            }}
          >
            {paso.saltar}
          </Button>
        ) : null}
        {alAtras === null ? null : (
          <Button variant="secondary" className={styles.grande} onClick={alAtras}>
            Atrás
          </Button>
        )}
        <Button variant="ghost" className={styles.grande} onClick={alCancelar}>
          Cancelar
        </Button>
      </div>
    </section>
  );
}
