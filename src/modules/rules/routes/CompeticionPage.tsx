// Pantalla A08 — Reglamento de la competición (T-203, E3 del DOC 01).
//
// Todo el reglamento del DOC 04 §4.1 en un formulario por bloques: partido,
// cambios, convocatoria, disciplina y botones del directo. La duración del
// partido se calcula a la vista, nunca se escribe.
//
// LOS BOTONES DEL DIRECTO. Solo se ofrecen los once del MVP. Los ocho que
// nacen apagados —pases, tiros, fueras de juego…— no tienen botón en el
// directo todavía, y encenderlos aquí prometería algo que no existe. Si
// alguien los encendió a mano en la base, se conservan al guardar.

import { useState } from 'react';
import { Link, useParams } from 'react-router';

import { useAnnounce } from '@shared/hooks/announceContext';
import { mensajeDeErrorAlGuardar } from '@shared/lib/guardado';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { Field } from '@shared/ui/Field';
import { GrupoDeOpciones } from '@shared/ui/GrupoDeOpciones';
import { Pantalla } from '@shared/ui/Pantalla';

import {
  useActualizarCompeticion,
  useCompeticion,
  useCompeticiones,
} from '../hooks/useCompeticiones';
import {
  aFormulario,
  duracionDeJuego,
  LARGO_NOMBRE_COMPETICION,
  NOMBRES_DE_EVENTO,
  NOMBRES_DE_TIPO,
  SIN_LIMITE_DE_CAMBIOS,
  TIPOS_DEL_MVP,
  validarCompeticion,
} from '../model/competicion';

import styles from '../components/Formulario.module.css';
import pagina from './CompeticionesPage.module.css';

import type {
  CampoNumerico,
  Competicion,
  FormularioReglamento,
  ResultadoCompeticion,
  TipoDeCompeticion,
  TipoDeEvento,
} from '../model/competicion';

const TIPOS: readonly { valor: TipoDeCompeticion; etiqueta: string }[] = [
  { valor: 'league', etiqueta: NOMBRES_DE_TIPO.league },
  { valor: 'cup', etiqueta: NOMBRES_DE_TIPO.cup },
  { valor: 'friendly', etiqueta: NOMBRES_DE_TIPO.friendly },
];

interface CampoNumeroProps {
  campo: CampoNumerico;
  etiqueta: string;
  ayuda?: string;
  formulario: FormularioReglamento;
  errores: ResultadoCompeticion['errores'];
  alCambiar: (campo: CampoNumerico, valor: string) => void;
}

function CampoNumero({ campo, etiqueta, ayuda, formulario, errores, alCambiar }: CampoNumeroProps) {
  return (
    <Field
      label={etiqueta}
      hint={ayuda}
      required
      inputMode="numeric"
      maxLength={3}
      autoComplete="off"
      value={formulario[campo]}
      error={errores[campo]}
      onChange={(evento) => {
        alCambiar(campo, evento.target.value);
      }}
    />
  );
}

interface FichaProps {
  competicion: Competicion;
  otras: readonly Competicion[];
}

function Ficha({ competicion, otras }: FichaProps) {
  const anunciar = useAnnounce();
  const guardar = useActualizarCompeticion(competicion.id);
  const [formulario, setFormulario] = useState<FormularioReglamento>(() =>
    aFormulario(competicion),
  );
  const [errores, setErrores] = useState<ResultadoCompeticion['errores']>({});
  const [falloAlGuardar, setFalloAlGuardar] = useState<string | null>(null);

  const cambiar = (cambio: Partial<FormularioReglamento>) => {
    setFormulario((anterior) => ({ ...anterior, ...cambio }));
  };
  const cambiarNumero = (campo: CampoNumerico, valor: string) => {
    cambiar({ [campo]: valor });
  };

  const alternarEvento = (tipo: TipoDeEvento, encendido: boolean) => {
    setFormulario((anterior) => ({
      ...anterior,
      enabled_event_types: encendido
        ? [...anterior.enabled_event_types, tipo]
        : anterior.enabled_event_types.filter((otro) => otro !== tipo),
    }));
  };

  // La duración a la vista, calculada de lo escrito. Si todavía no son dos
  // números válidos, no se inventa: se dice que falta.
  const partes = Number(formulario.periods_count);
  const minutos = Number(formulario.period_minutes);
  const duracion =
    Number.isInteger(partes) && Number.isInteger(minutos) && partes > 0 && minutos > 0
      ? `${duracionDeJuego({ periods_count: partes, period_minutes: minutos })} minutos de juego`
      : 'Escribe partes y minutos para ver la duración';

  const comunes = { formulario, errores, alCambiar: cambiarNumero };

  return (
    <form
      className={styles.formulario}
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault();
        setFalloAlGuardar(null);

        const resultado = validarCompeticion(formulario, otras, competicion.id);
        setErrores(resultado.errores);

        if (resultado.valores === null) {
          anunciar('Revisa los campos marcados');
          return;
        }

        guardar.mutate(resultado.valores, {
          onSuccess: () => {
            anunciar('Reglamento guardado');
          },
          onError: (error) => {
            const mensaje = mensajeDeErrorAlGuardar(error);
            setFalloAlGuardar(mensaje);
            anunciar(mensaje);
          },
        });
      }}
    >
      <Field
        label="Nombre"
        hint="Categoría, nivel, ámbito y grupo, como la llama la federación. La temporada va aparte."
        required
        maxLength={LARGO_NOMBRE_COMPETICION}
        autoComplete="off"
        value={formulario.name}
        error={errores.name}
        onChange={(evento) => {
          cambiar({ name: evento.target.value });
        }}
      />
      <GrupoDeOpciones
        leyenda="Tipo"
        opciones={TIPOS}
        valor={formulario.kind}
        alCambiar={(kind) => {
          cambiar({ kind });
        }}
      />

      <fieldset className={styles.bloque}>
        <legend className={styles.titulo}>Partido</legend>
        <div className={styles.numeros}>
          <CampoNumero campo="periods_count" etiqueta="Partes" ayuda="Entre 1 y 4" {...comunes} />
          <CampoNumero
            campo="period_minutes"
            etiqueta="Minutos por parte"
            ayuda="Entre 10 y 60"
            {...comunes}
          />
          <CampoNumero
            campo="halftime_minutes"
            etiqueta="Minutos de descanso"
            ayuda="Entre 0 y 30"
            {...comunes}
          />
        </div>
        <p className={styles.duracion}>Duración: {duracion}</p>
        <GrupoDeOpciones
          leyenda="Reloj"
          opciones={[
            { valor: 'running', etiqueta: 'Corrido: no se para' },
            { valor: 'stopped', etiqueta: 'A tiempo parado: se para con el balón fuera' },
          ]}
          valor={formulario.clock_mode}
          alCambiar={(clock_mode) => {
            cambiar({ clock_mode });
          }}
        />
      </fieldset>

      <fieldset className={styles.bloque}>
        <legend className={styles.titulo}>Cambios</legend>
        <GrupoDeOpciones
          leyenda="Tipo de cambios"
          opciones={[
            { valor: 'fixed', etiqueta: 'Fijos: quien sale no vuelve a entrar' },
            { valor: 'rolling', etiqueta: 'Volantes: quien sale puede volver a entrar' },
          ]}
          valor={formulario.substitution_type}
          alCambiar={(substitution_type) => {
            cambiar({ substitution_type });
          }}
        />
        <CampoNumero
          campo="substitutions_max"
          etiqueta="Cambios por partido"
          ayuda={`Una sustitución doble cuenta dos. ${SIN_LIMITE_DE_CAMBIOS} es sin límite.`}
          {...comunes}
        />
      </fieldset>

      <fieldset className={styles.bloque}>
        <legend className={styles.titulo}>Convocatoria</legend>
        <div className={styles.numeros}>
          <CampoNumero
            campo="squad_max"
            etiqueta="Convocados como mucho"
            ayuda="Entre 5 y 30"
            {...comunes}
          />
          <CampoNumero
            campo="players_on_pitch"
            etiqueta="Jugadores en el campo"
            ayuda="Entre 5 y 11"
            {...comunes}
          />
        </div>
      </fieldset>

      <fieldset className={styles.bloque}>
        <legend className={styles.titulo}>Disciplina</legend>
        <div className={styles.numeros}>
          <CampoNumero
            campo="yellow_cards_for_ban"
            etiqueta="Amarillas para un partido de sanción"
            ayuda="0 lo apaga"
            {...comunes}
          />
          <CampoNumero
            campo="red_card_default_bans"
            etiqueta="Partidos que se proponen por roja"
            ayuda="Es solo la propuesta: decide el comité"
            {...comunes}
          />
        </div>
      </fieldset>

      <fieldset className={styles.bloque}>
        <legend className={styles.titulo}>Botones del directo</legend>
        <p className={styles.nota}>
          Lo que se apaga aquí no sale en el partido en directo. Los pases, tiros y el resto de
          acciones fuera del MVP todavía no tienen botón.
        </p>
        <div className={styles.grupo}>
          {TIPOS_DEL_MVP.map((tipo) => {
            const id = `evento-${competicion.id}-${tipo}`;

            return (
              <label key={tipo} className={styles.opcion} htmlFor={id}>
                <input
                  id={id}
                  className={styles.marca}
                  type="checkbox"
                  checked={formulario.enabled_event_types.includes(tipo)}
                  onChange={(evento) => {
                    alternarEvento(tipo, evento.target.checked);
                  }}
                />
                <span>{NOMBRES_DE_EVENTO[tipo]}</span>
              </label>
            );
          })}
        </div>
        {errores.enabled_event_types === undefined ? null : (
          <p className={styles.fallo}>{errores.enabled_event_types}</p>
        )}
      </fieldset>

      {falloAlGuardar === null ? null : <p className={styles.fallo}>{falloAlGuardar}</p>}

      <div>
        <Button type="submit" variant="primary" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar reglamento'}
        </Button>
      </div>
    </form>
  );
}

export function CompeticionPage() {
  const { id: competicionId = '' } = useParams();
  const competicion = useCompeticion(competicionId);
  // Las otras de la misma temporada, para no repetir nombre. Se sabe cuáles
  // son en cuanto llega la competición.
  const otras = useCompeticiones(
    competicion.data?.clubId ?? null,
    competicion.data?.seasonId ?? null,
  );

  const titulo =
    competicion.data === undefined || competicion.data === null
      ? 'Reglamento de la competición'
      : competicion.data.name;

  const contenido = () => {
    if (competicion.isPending || (competicion.data && otras.isPending)) {
      return <p className={styles.nota}>Cargando…</p>;
    }

    if (competicion.isError || otras.isError) {
      return (
        <div className={styles.bloque}>
          <p className={styles.nota}>
            No se ha podido cargar la competición. Suele ser falta de cobertura.
          </p>
          <div>
            <Button
              variant="secondary"
              onClick={() => {
                void competicion.refetch();
                void otras.refetch();
              }}
            >
              Reintentar
            </Button>
          </div>
        </div>
      );
    }

    if (competicion.data === null) {
      return (
        <p className={styles.nota}>No se encuentra esta competición, o no tienes acceso a ella.</p>
      );
    }

    return (
      <Card title="Reglamento" headingLevel={2}>
        <Ficha key={competicion.data.id} competicion={competicion.data} otras={otras.data ?? []} />
      </Card>
    );
  };

  return (
    <Pantalla id="A08" titulo={titulo}>
      <p>
        <Link className={pagina.volver} to="/competiciones">
          Volver a Competiciones
        </Link>
      </p>
      {contenido()}
    </Pantalla>
  );
}
