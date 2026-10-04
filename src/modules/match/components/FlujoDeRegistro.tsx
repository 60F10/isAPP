// Un paso del flujo de registro, a pantalla completa (T-208, DOC 04 §7.4).
//
// Cada paso, una pregunta con objetivos de 72 px. Al cambiar de paso, el foco
// va a la pregunta: quien usa lector de pantalla sabe dónde está sin buscar.
// «Atrás» deshace la última respuesta y «Cancelar» tira el evento entero.
//
// Mientras el evento se guarda (T-215), el paso lo dice y desactiva todos sus
// botones: un segundo toque no puede guardar dos veces ni tirar a medias lo
// que ya se está guardando.
//
// Encima de la pregunta va lo ya respondido (T-218): cada paso ocupa la
// pantalla entera y borra el anterior, y en «¿Asistencia?» ya no se veía de
// qué minuto era el gol ni quién lo marcó. Son pastillas que se leen, no
// botones: para volver está «Atrás».

import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '@shared/ui/Button';
import { Field } from '@shared/ui/Field';

import { rangoDeParte } from '../model/reloj';
import styles from './Registro.module.css';

import type { Paso } from '../model/flujo';

interface FlujoProps {
  paso: Paso;
  titulo: string;
  nombre: (id: string) => string;
  /** El dorsal suelto, para pintarlo grande. */
  dorsal: (id: string) => string | null;
  error: string | null;
  /** El evento se está guardando: ningún botón del paso responde. */
  ocupado: boolean;
  /** Lo que se dice mientras guarda, o `null` si no hay nada que decir. */
  estado: string | null;
  /** Lo ya respondido, en el orden de los pasos. Vacío, no se pinta. */
  resumen: readonly string[];
  /** En diferido, la parte con la que abre el paso del minuto: la del último evento guardado. */
  periodoInicial: string;
  alResponder: (clave: string, valor: string | null) => void;
  alResponderMinuto: (periodo: string, minuto: string) => void;
  alAtras: (() => void) | null;
  alCancelar: () => void;
}

function Minuto({
  periodos,
  minutosDeParte,
  periodoInicial,
  ocupado,
  alResponder,
}: {
  periodos: number;
  minutosDeParte: number;
  periodoInicial: string;
  ocupado: boolean;
  alResponder: (periodo: string, minuto: string) => void;
}) {
  const id = useId();
  const [periodo, setPeriodo] = useState(periodoInicial);
  const [minuto, setMinuto] = useState('');
  // La ayuda dice los minutos de la parte elegida: en la 2.ª de 40, de 41 a 80.
  const { desde, hasta } = rangoDeParte(Number(periodo), minutosDeParte);

  return (
    <form
      className={styles.flujo}
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault();

        if (ocupado) {
          return;
        }

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
              {i + 1}.ª parte
            </option>
          ))}
        </select>
      </div>
      <Field
        label="Minuto"
        hint={`De ${desde} a ${hasta}, como en el acta. En el descuento, ${hasta}+2.`}
        inputMode="text"
        autoComplete="off"
        value={minuto}
        onChange={(evento) => {
          setMinuto(evento.target.value);
        }}
      />
      <div className={styles.acciones}>
        <Button type="submit" variant="primary" className={styles.grande} disabled={ocupado}>
          Seguir
        </Button>
      </div>
    </form>
  );
}

function Texto({
  pregunta,
  ocupado,
  alResponder,
}: {
  pregunta: string;
  ocupado: boolean;
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

        if (ocupado) {
          return;
        }

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
        <Button type="submit" variant="primary" className={styles.grande} disabled={ocupado}>
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
  ocupado,
  estado,
  resumen,
  periodoInicial,
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

  // Si el guardado falla, el botón pulsado se desactivó con el foco puesto y
  // el foco se iba a `body`: al soltarse el paso, vuelve a la pregunta.
  const estabaOcupado = useRef(ocupado);

  useEffect(() => {
    if (estabaOcupado.current && !ocupado) {
      pregunta.current?.focus();
    }

    estabaOcupado.current = ocupado;
  }, [ocupado]);

  // «Sin asistencia», «Sin motivo»: va encima de la lista, el primero del paso.
  const saltar =
    paso.clase !== 'minuto' && paso.clase !== 'texto' && paso.saltar !== undefined ? (
      <Button
        variant="secondary"
        className={styles.saltar}
        disabled={ocupado}
        onClick={() => {
          alResponder(paso.clave, null);
        }}
      >
        {paso.saltar}
      </Button>
    ) : null;

  const cuerpo = () => {
    switch (paso.clase) {
      case 'minuto':
        return (
          <Minuto
            periodos={paso.periodos}
            minutosDeParte={paso.minutosDeParte}
            periodoInicial={periodoInicial}
            ocupado={ocupado}
            alResponder={alResponderMinuto}
          />
        );

      case 'texto':
        return (
          <Texto
            pregunta={paso.pregunta}
            ocupado={ocupado}
            alResponder={(texto) => {
              alResponder(paso.clave, texto);
            }}
          />
        );

      case 'opciones':
        return (
          <>
            {saltar}
            <ul className={styles.opciones}>
              {paso.opciones.map((opcion) => (
                <li key={opcion.valor}>
                  <button
                    type="button"
                    className={styles.opcion}
                    disabled={ocupado}
                    onClick={() => {
                      alResponder(paso.clave, opcion.valor);
                    }}
                  >
                    {opcion.etiqueta}
                  </button>
                </li>
              ))}
            </ul>
          </>
        );

      case 'jugador':
        return (
          <>
            {saltar}
            {paso.candidatos.length === 0 ? (
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
                        disabled={ocupado}
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
            )}
          </>
        );
    }
  };

  const titular = paso.clase === 'minuto' ? '¿Cuándo pasó?' : paso.pregunta;

  return (
    <section className={styles.flujo} aria-label={titulo}>
      <h2 ref={pregunta} className={styles.pregunta} tabIndex={-1}>
        {titulo}: {titular}
      </h2>
      {resumen.length === 0 ? null : (
        <ol className={styles.migas} aria-label="Lo apuntado hasta ahora">
          {resumen.map((miga, orden) => (
            // Dos pasos pueden decir lo mismo: la clave lleva también el orden.
            <li key={`${orden}-${miga}`} className={styles.miga}>
              {miga}
            </li>
          ))}
        </ol>
      )}
      {/* Siempre pintada, vacía si no hay error: una región viva que aparece a
          la vez que su texto no la anuncia la mitad de los lectores. */}
      <p className={styles.error} aria-live="polite">
        {error ?? ''}
      </p>
      {/* Lo mismo para el estado del guardado: pintada siempre, vacía si no
          hay nada que decir. */}
      <p className={styles.nota} aria-live="polite">
        {estado ?? ''}
      </p>
      {cuerpo()}
      <div className={styles.acciones}>
        {alAtras === null ? null : (
          <Button
            variant="secondary"
            className={styles.grande}
            disabled={ocupado}
            onClick={alAtras}
          >
            Atrás
          </Button>
        )}
        <Button variant="ghost" className={styles.grande} disabled={ocupado} onClick={alCancelar}>
          Cancelar
        </Button>
      </div>
    </section>
  );
}
