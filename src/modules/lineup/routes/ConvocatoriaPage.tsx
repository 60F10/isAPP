// Pantalla A11 — Convocatoria y alineación inicial (T-205, E7-01, E7-02,
// E7-05 y E7-06).
//
// Toda la plantilla del equipo, cada jugador con tres opciones: titular,
// suplente o no convocado (L-01). Al convocarlo salen su dorsal y su posición
// de este partido, propuestos desde la inscripción (L-05, L-06). Quien no está
// disponible sale con el motivo y sin opciones (L-04). Arriba, la cuenta de
// titulares y convocados frente al reglamento de la competición del partido.
//
// Guardar exige los titulares exactos (L-03) y no pasar del máximo (R-01), y
// pasa el partido a convocado (L-07). Empezado el partido, la convocatoria se
// enseña y no se cambia (L-08).
//
// Se prepara también en el portátil (DOC 02 §5): todo es un control nativo y
// se recorre con el tabulador.
//
// DOS PUNTOS DE ENGANCHE, `aviso` y `alGuardar` (T-206). La ruta de verdad es
// la de `match`, que pone encima el estado de la precarga del partido y vuelve
// a precargar al guardar. `lineup` no sabe nada de la capa offline: no puede
// importar de `sync` (DOC 06 §4.2).

import { useId, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { enfrentamiento, NOMBRES_DE_ESTADO, usePartido } from '@modules/agenda';
import { useAuth } from '@modules/auth';
import { DISPONIBILIDADES, POSICIONES, usePlantilla } from '@modules/core';
import { useCompeticion } from '@modules/rules';
import { useAnnounce } from '@shared/hooks/announceContext';
import { mensajeDeErrorAlGuardar } from '@shared/lib/guardado';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { Field } from '@shared/ui/Field';
import { GrupoDeOpciones } from '@shared/ui/GrupoDeOpciones';
import { Pantalla } from '@shared/ui/Pantalla';

import { useConvocatoriaGuardada, useGuardarConvocatoria } from '../hooks/useConvocatoria';
import {
  construirConvocatoria,
  contar,
  NOMBRES_DE_LLAMADA,
  sePuedeConvocar,
  validarConvocatoria,
} from '../model/convocatoria';

import styles from './ConvocatoriaPage.module.css';

import type { FilaConvocatoria, Llamada, ResultadoConvocatoria } from '../model/convocatoria';
import type { Partido } from '@modules/agenda';
import type { Posicion } from '@modules/core';
import type { ReactNode } from 'react';

interface Reglamento {
  squad_max: number;
  players_on_pitch: number;
}

const LLAMADAS: readonly Llamada[] = ['starter', 'substitute', 'not_called'];

const OPCIONES = LLAMADAS.map((valor) => ({ valor, etiqueta: NOMBRES_DE_LLAMADA[valor] }));

function esPosicion(valor: string): valor is Posicion {
  return valor in POSICIONES;
}

/** Quien no se puede convocar: por qué, en palabras. */
function motivo(fila: FilaConvocatoria): string {
  return fila.availability === null
    ? 'Ya no está en la plantilla'
    : DISPONIBILIDADES[fila.availability];
}

function nombreConDorsal(fila: Pick<FilaConvocatoria, 'dorsal' | 'nickname'>): string {
  const dorsal = fila.dorsal.trim();

  return dorsal === '' ? fila.nickname : `${dorsal} · ${fila.nickname}`;
}

interface SelectorProps {
  etiqueta: string;
  valor: Posicion | '';
  alCambiar: (valor: Posicion | '') => void;
}

/** Posición de este partido: `<select>` nativo, como el de la A05. */
function SelectorPosicion({ etiqueta, valor, alCambiar }: SelectorProps) {
  const id = useId();

  return (
    <div className={styles.campo}>
      <label className={styles.etiqueta} htmlFor={id}>
        {etiqueta}
      </label>
      <select
        id={id}
        className={styles.selector}
        value={valor}
        onChange={(evento) => {
          const elegido = evento.target.value;
          alCambiar(esPosicion(elegido) ? elegido : '');
        }}
      >
        <option value="">Sin decidir</option>
        {Object.entries(POSICIONES).map(([codigo, nombre]) => (
          <option key={codigo} value={codigo}>
            {nombre}
          </option>
        ))}
      </select>
    </div>
  );
}

interface JugadorProps {
  fila: FilaConvocatoria;
  errorDorsal: string | undefined;
  alCambiar: (cambio: Partial<FilaConvocatoria>) => void;
}

function Jugador({ fila, errorDorsal, alCambiar }: JugadorProps) {
  if (!sePuedeConvocar(fila.availability)) {
    return (
      <li className={styles.jugador}>
        <p className={styles.nombre}>{fila.nickname}</p>
        <p className={styles.nota}>{motivo(fila)}: no se puede convocar.</p>
        {fila.retirado ? (
          <p className={styles.aviso}>Estaba convocado: se quita al guardar.</p>
        ) : null}
      </li>
    );
  }

  return (
    <li className={styles.jugador}>
      <GrupoDeOpciones
        enLinea
        leyenda={nombreConDorsal(fila)}
        opciones={OPCIONES}
        valor={fila.llamada}
        alCambiar={(llamada) => {
          alCambiar({ llamada });
        }}
      />
      {fila.llamada === 'not_called' ? null : (
        <div className={styles.detalle}>
          <Field
            label={`Dorsal de ${fila.nickname}`}
            inputMode="numeric"
            maxLength={2}
            autoComplete="off"
            value={fila.dorsal}
            error={errorDorsal}
            onChange={(evento) => {
              alCambiar({ dorsal: evento.target.value });
            }}
          />
          <SelectorPosicion
            etiqueta={`Posición de ${fila.nickname}`}
            valor={fila.posicion}
            alCambiar={(posicion) => {
              alCambiar({ posicion });
            }}
          />
        </div>
      )}
    </li>
  );
}

/** Titulares, suplentes y convocados frente al reglamento. */
function Cuenta({
  filas,
  reglamento,
}: {
  filas: readonly FilaConvocatoria[];
  reglamento: Reglamento;
}) {
  const { titulares, suplentes, convocados } = contar(filas);

  return (
    <p className={styles.cuenta}>
      Titulares: {titulares} de {reglamento.players_on_pitch} · Suplentes: {suplentes} · Convocados:{' '}
      {convocados} de {reglamento.squad_max} como mucho
    </p>
  );
}

interface EditorProps {
  partidoId: string;
  inicial: FilaConvocatoria[];
  reglamento: Reglamento;
  alGuardar: (() => void) | undefined;
}

function Editor({ partidoId, inicial, reglamento, alGuardar }: EditorProps) {
  const anunciar = useAnnounce();
  const navigate = useNavigate();
  const guardar = useGuardarConvocatoria(partidoId);
  const [filas, setFilas] = useState(inicial);
  const [errores, setErrores] = useState<ResultadoConvocatoria['errores']>({
    general: [],
    dorsales: {},
  });
  const [falloAlGuardar, setFalloAlGuardar] = useState<string | null>(null);
  const [sinMarcar, setSinMarcar] = useState(false);

  const cambiar = (playerId: string, cambio: Partial<FilaConvocatoria>) => {
    setFilas((anteriores) =>
      anteriores.map((fila) => (fila.playerId === playerId ? { ...fila, ...cambio } : fila)),
    );
  };

  return (
    <form
      className={styles.formulario}
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault();
        setFalloAlGuardar(null);
        setSinMarcar(false);

        const resultado = validarConvocatoria(filas, reglamento);
        setErrores(resultado.errores);

        if (resultado.valores === null) {
          anunciar(
            resultado.errores.general.length > 0
              ? resultado.errores.general.join(' ')
              : 'Revisa los dorsales marcados',
          );
          return;
        }

        guardar.mutate(resultado.valores, {
          onSuccess: ({ marcado }) => {
            alGuardar?.();

            if (marcado) {
              anunciar('Convocatoria guardada');
              void navigate('/calendario');
              return;
            }

            setSinMarcar(true);
            anunciar('Convocatoria guardada, pero el partido no ha pasado a convocado');
          },
          onError: (error) => {
            const mensaje = mensajeDeErrorAlGuardar(error);
            setFalloAlGuardar(mensaje);
            anunciar(mensaje);
          },
        });
      }}
    >
      {/* La cuenta cambia con cada toque. Sin región viva: repetiría la cifra
          en cada cambio, y el radio ya anuncia lo que se ha elegido. */}
      <Cuenta filas={filas} reglamento={reglamento} />

      <ul className={styles.lista}>
        {filas.map((fila) => (
          <Jugador
            key={fila.playerId}
            fila={fila}
            errorDorsal={errores.dorsales[fila.playerId]}
            alCambiar={(cambio) => {
              cambiar(fila.playerId, cambio);
            }}
          />
        ))}
      </ul>

      <Cuenta filas={filas} reglamento={reglamento} />

      {errores.general.length === 0 ? null : (
        <ul className={styles.errores}>
          {errores.general.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
      {falloAlGuardar === null ? null : <p className={styles.fallo}>{falloAlGuardar}</p>}
      {sinMarcar ? (
        <p className={styles.aviso}>
          Convocatoria guardada. El partido sigue como «Programado»: pasarlo a «Convocado» pide el
          permiso de programar partidos.
        </p>
      ) : null}

      <div>
        <Button type="submit" variant="primary" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : 'Guardar convocatoria'}
        </Button>
      </div>
    </form>
  );
}

/** La convocatoria de un partido empezado: se enseña y no se toca (L-08). */
function SoloLectura({ partido, filas }: { partido: Partido; filas: FilaConvocatoria[] }) {
  return (
    <div className={styles.bloque}>
      <p className={styles.nota}>
        Este partido está «{NOMBRES_DE_ESTADO[partido.status]}»: la convocatoria ya no se cambia
        desde aquí.
      </p>
      <div className={styles.grupos}>
        {(['starter', 'substitute'] as const).map((llamada) => {
          const deEste = filas.filter((fila) => fila.llamada === llamada);

          return (
            <section key={llamada} className={styles.bloque}>
              <h2 className={styles.subtitulo}>
                {llamada === 'starter' ? 'Titulares' : 'Suplentes'} ({deEste.length})
              </h2>
              {deEste.length === 0 ? (
                <p className={styles.nota}>Ninguno.</p>
              ) : (
                <ul>
                  {deEste.map((fila) => (
                    <li key={fila.playerId}>
                      {nombreConDorsal(fila)}
                      {fila.posicion === '' ? '' : ` · ${POSICIONES[fila.posicion]}`}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Reintentar({ texto, alPulsar }: { texto: string; alPulsar: () => void }) {
  return (
    <div className={styles.bloque}>
      <p className={styles.nota}>{texto} Suele ser falta de cobertura.</p>
      <div>
        <Button variant="secondary" onClick={alPulsar}>
          Reintentar
        </Button>
      </div>
    </div>
  );
}

interface ConvocatoriaPageProps {
  /** Lo que va debajo de «Volver al calendario», antes de la convocatoria. */
  aviso?: ReactNode;
  /** Se llama cada vez que la convocatoria se guarda, marcado o no el partido. */
  alGuardar?: () => void;
}

export function ConvocatoriaPage({ aviso, alGuardar }: ConvocatoriaPageProps = {}) {
  const { id: partidoId = '' } = useParams();
  const { teams, activeSeasonId } = useAuth();
  const partido = usePartido(partidoId);
  const datos = partido.data ?? null;
  const competicion = useCompeticion(datos === null ? '' : datos.competitionId);
  const plantilla = usePlantilla(
    datos === null ? '' : datos.teamId,
    datos === null ? null : activeSeasonId,
  );
  const guardada = useConvocatoriaGuardada(partidoId);

  const equipo =
    datos === null || teams === null
      ? undefined
      : teams.find((membresia) => membresia.team.id === datos.teamId);
  const titulo =
    datos === null || equipo === undefined
      ? 'Convocatoria'
      : `Convocatoria: ${enfrentamiento(datos, equipo.team.name)}`;

  const contenido = () => {
    if (partido.isPending) {
      return <p className={styles.nota}>Cargando…</p>;
    }

    if (partido.isError) {
      return (
        <Reintentar
          texto="No se ha podido cargar el partido."
          alPulsar={() => {
            void partido.refetch();
          }}
        />
      );
    }

    if (datos === null) {
      return <p className={styles.nota}>No se encuentra este partido, o no tienes acceso a él.</p>;
    }

    if (activeSeasonId === null) {
      return <p className={styles.nota}>El club no tiene ninguna temporada en curso.</p>;
    }

    if (competicion.isPending || plantilla.isPending || guardada.isPending) {
      return <p className={styles.nota}>Cargando…</p>;
    }

    if (competicion.isError || plantilla.isError || guardada.isError) {
      return (
        <Reintentar
          texto="No se ha podido cargar la plantilla o el reglamento."
          alPulsar={() => {
            void competicion.refetch();
            void plantilla.refetch();
            void guardada.refetch();
          }}
        />
      );
    }

    if (competicion.data === null) {
      return (
        <p className={styles.nota}>
          No se encuentra la competición de este partido, y sin su reglamento no se sabe cuántos van
          convocados.
        </p>
      );
    }

    const filas = construirConvocatoria(plantilla.data, guardada.data);
    const editable = datos.status === 'scheduled' || datos.status === 'called';

    if (!editable) {
      return <SoloLectura partido={datos} filas={filas} />;
    }

    if (filas.length === 0) {
      return (
        <p className={styles.nota}>
          La plantilla está vacía.{' '}
          <Link to={`/equipos/${datos.teamId}/plantilla`}>Da de alta a los jugadores</Link>.
        </p>
      );
    }

    return (
      <>
        <p className={styles.nota}>
          {datos.competitionName} · {NOMBRES_DE_ESTADO[datos.status]}. Van{' '}
          {competicion.data.players_on_pitch} titulares y hasta {competicion.data.squad_max}{' '}
          convocados.
        </p>
        <Card title="Plantilla" headingLevel={2}>
          <Editor
            key={datos.id}
            partidoId={datos.id}
            inicial={filas}
            reglamento={competicion.data}
            alGuardar={alGuardar}
          />
        </Card>
      </>
    );
  };

  return (
    <Pantalla id="A11" titulo={titulo}>
      <p>
        <Link className={styles.volver} to="/calendario">
          Volver al calendario
        </Link>
      </p>
      {aviso}
      {contenido()}
    </Pantalla>
  );
}
