// Últimos eventos del directo, con «Deshacer» (T-208, E8-10, DOC 02 §4).
//
// Los cinco más recientes que conoce el aparato. Cada uno con su estado en
// palabras: pendiente, aprobado o rechazado (1.4.1). Solo se deshace lo
// apuntado en este aparato; lo de otros se corrige en el cierre (T-210).

import { Button } from '@shared/ui/Button';

import styles from './Registro.module.css';

import type { EventoDelDirecto } from '../model/eventos';

const ESTADOS = { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' } as const;

interface UltimosProps {
  eventos: readonly EventoDelDirecto[];
  describir: (evento: EventoDelDirecto) => string;
  alDeshacer: ((evento: EventoDelDirecto) => void) | null;
}

export function UltimosEventos({ eventos, describir, alDeshacer }: UltimosProps) {
  const ultimos = [...eventos].reverse().slice(0, 5);

  return (
    <section className={styles.ultimos} aria-labelledby="ultimos-eventos">
      <h2 id="ultimos-eventos" className={styles.subtitulo}>
        Últimos eventos
      </h2>
      {ultimos.length === 0 ? (
        <p className={styles.nota}>Todavía no hay nada apuntado.</p>
      ) : (
        <ul className={styles.lista}>
          {ultimos.map((evento) => (
            <li key={evento.clientEventId} className={styles.linea}>
              <span>
                {describir(evento)}{' '}
                <span className={styles.estado}>· {ESTADOS[evento.estado]}</span>
              </span>
              {evento.propio && alDeshacer !== null ? (
                <Button
                  variant="secondary"
                  aria-label={`Deshacer: ${describir(evento)}`}
                  onClick={() => {
                    alDeshacer(evento);
                  }}
                >
                  Deshacer
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
