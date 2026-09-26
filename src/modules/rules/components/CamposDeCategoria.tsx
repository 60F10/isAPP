// Los cuatro campos de la categoría de la competición (T-203b, DOC 05 §14.4).
//
// Van en el alta y en la ficha de la A08: la liga tiene que poder nacer con
// ellos. Son opcionales y de texto libre, como en la base: una copa o un
// torneo de verano no tiene grupo, y los niveles cambian de un año a otro.
// El nombre visible sigue siendo `name`, que no se compone con estos cuatro.

import { Field } from '@shared/ui/Field';

import { LARGO_CATEGORIA } from '../model/competicion';

import styles from './Formulario.module.css';

import type { CampoDeCategoria, ResultadoCompeticion } from '../model/competicion';

const CAMPOS: readonly { campo: CampoDeCategoria; etiqueta: string; ayuda: string }[] = [
  { campo: 'category', etiqueta: 'Categoría', ayuda: 'Por ejemplo, «Cadete».' },
  { campo: 'level', etiqueta: 'Nivel', ayuda: 'Por ejemplo, «Primera» o «Preferente».' },
  { campo: 'scope', etiqueta: 'Ámbito', ayuda: 'Por ejemplo, «Tenerife» o «Canarias».' },
  { campo: 'group_label', etiqueta: 'Grupo', ayuda: 'Por ejemplo, «G2». Una copa no tiene.' },
];

interface CamposDeCategoriaProps {
  valores: Record<CampoDeCategoria, string>;
  errores: ResultadoCompeticion['errores'];
  alCambiar: (campo: CampoDeCategoria, valor: string) => void;
}

export function CamposDeCategoria({ valores, errores, alCambiar }: CamposDeCategoriaProps) {
  return (
    <fieldset className={styles.bloque}>
      <legend className={styles.titulo}>Clasificación de la federación</legend>
      <p className={styles.nota}>
        Opcional. En el calendario y en el partido se ve el nombre de la competición.
      </p>
      <div className={styles.numeros}>
        {CAMPOS.map(({ campo, etiqueta, ayuda }) => (
          <Field
            key={campo}
            label={etiqueta}
            hint={ayuda}
            maxLength={LARGO_CATEGORIA}
            autoComplete="off"
            value={valores[campo]}
            error={errores[campo]}
            onChange={(evento) => {
              alCambiar(campo, evento.target.value);
            }}
          />
        ))}
      </div>
    </fieldset>
  );
}
