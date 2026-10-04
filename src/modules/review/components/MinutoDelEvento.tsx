// El minuto de un evento, en su sitio (T-210b; aparte desde la T-211).
//
// Lo comparten la tarjeta «Eventos» de la A13 y la A14, «Mis aportaciones»:
// la misma pieza y la misma regla para corregir cuándo pasó algo. Quien la
// usa pone el guardado, con `cambiarMinuto` de `api/discordancias.ts`.

import { useEffect, useId, useRef, useState } from 'react';

import { rangoDeParte, segundosDeMinuto } from '@modules/match';
import { useAnnounce } from '@shared/hooks/announceContext';
import { Button } from '@shared/ui/Button';
import { Field } from '@shared/ui/Field';

import styles from './MinutoDelEvento.module.css';

import type { EventoDelDirecto } from '@modules/match';

interface MinutoDelEventoProps {
  /** Del evento solo hace falta la parte en la que está apuntado. */
  evento: Pick<EventoDelDirecto, 'periodo'>;
  descripcion: string;
  periodos: number;
  minutosDeParte: number;
  ocupado: boolean;
  alGuardar: (periodo: number, segundos: number) => void;
  alCancelar: () => void;
}

/**
 * El minuto de un evento, en su sitio y sin ventana emergente: la parte y el
 * minuto como en el acta, con la misma ayuda y el mismo error que el directo
 * en diferido (T-218). El campo nace vacío, como allí: el minuto de ahora ya
 * se lee en la descripción.
 */
export function MinutoDelEvento({
  evento,
  descripcion,
  periodos,
  minutosDeParte,
  ocupado,
  alGuardar,
  alCancelar,
}: MinutoDelEventoProps) {
  const id = useId();
  const anunciar = useAnnounce();
  const refParte = useRef<HTMLSelectElement>(null);
  const [periodo, setPeriodo] = useState(String(evento.periodo));
  const [minuto, setMinuto] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const parte = Number(periodo);
  const { desde, hasta } = rangoDeParte(parte, minutosDeParte);

  // «Cambiar minuto» desaparece al abrir esto: el foco va al primer control.
  useEffect(() => {
    refParte.current?.focus();
  }, []);

  return (
    <form
      className={styles.minuto}
      aria-label={`Cambiar el minuto de: ${descripcion}`}
      noValidate
      onSubmit={(envio) => {
        envio.preventDefault();

        if (ocupado) {
          return;
        }

        const segundos = segundosDeMinuto(minuto, parte, minutosDeParte);

        if (segundos === null) {
          const mensaje = `Ese minuto no es de la ${parte}.ª parte: va de ${desde} a ${hasta}, o ${hasta}+2 en el descuento.`;

          setError(mensaje);
          anunciar(mensaje);
          return;
        }

        setError(undefined);
        alGuardar(parte, segundos);
      }}
    >
      <div className={styles.campo}>
        <label className={styles.etiqueta} htmlFor={id}>
          Parte
        </label>
        <select
          ref={refParte}
          id={id}
          className={styles.selector}
          value={periodo}
          onChange={(cambio) => {
            setPeriodo(cambio.target.value);
            // El rango es otro: el error de antes ya no dice la verdad.
            setError(undefined);
          }}
        >
          {/* Un evento apuntado en una parte que el reglamento ya no tiene sigue pudiendo elegirla. */}
          {Array.from({ length: Math.max(periodos, evento.periodo) }, (_, i) => (
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
        error={error}
        onChange={(cambio) => {
          setMinuto(cambio.target.value);
        }}
      />
      <div className={styles.acciones}>
        <Button type="submit" variant="primary" disabled={ocupado}>
          {ocupado ? 'Guardando…' : 'Guardar el minuto'}
        </Button>
        <Button variant="secondary" disabled={ocupado} onClick={alCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
