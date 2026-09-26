// Pantalla A10 — Alta y edición de partido (T-204, E4-02, E4-03 y D5).
//
// Competición, rival, en casa o fuera, fecha, hora y campo. Y la casilla del
// partido en diferido: el que ya se jugó y se mete después, con el reloj
// parado (DOC 03, D5; DOC 04 §5.4).
//
// El rival sale de los equipos de referencia del club (A04) y la competición,
// de las de la temporada (A08). La pantalla no deja elegir nada de otro club.
//
// EL CAMPO. En un partido en casa se propone el campo de casa del club, que
// vive en `clubs.home_venue` desde el 26/09 (DOC 05 §14.4, T-203b). Si el club
// no lo tiene rellenado, el del último partido en casa que lo tuviera.
//
// Se edita mientras el partido no ha empezado (DOC 04 §8.1), y solo se borra
// si sigue programado: con convocatoria, borrarlo se la llevaría en cascada.

import { useId, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { useClub, useEquipos } from '@modules/core';
import { useCompeticiones } from '@modules/rules';
import { useAnnounce } from '@shared/hooks/announceContext';
import { mensajeDeErrorAlGuardar } from '@shared/lib/guardado';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { Field } from '@shared/ui/Field';
import { GrupoDeOpciones } from '@shared/ui/GrupoDeOpciones';
import { Pantalla } from '@shared/ui/Pantalla';

import {
  useActualizarPartido,
  useBorrarPartido,
  useCalendario,
  useCrearPartido,
  useEquipoActivo,
  usePartido,
} from '../hooks/usePartidos';
import {
  campoDeCasaPropuesto,
  enfrentamiento,
  LARGO_CAMPO,
  NOMBRES_DE_ESTADO,
  partesDeInstante,
  sePuedeEditar,
  validarPartido,
} from '../model/partido';

import styles from './PartidoPage.module.css';

import type { DatosDePartido } from '../api/partidos';
import type { FormularioPartido, Partido, ResultadoPartido } from '../model/partido';
import type { UseMutationResult } from '@tanstack/react-query';

interface Opcion {
  id: string;
  nombre: string;
}

interface SelectorProps {
  etiqueta: string;
  vacio: string;
  opciones: readonly Opcion[];
  valor: string;
  error?: string;
  alCambiar: (valor: string) => void;
}

/** `<select>` nativo con etiqueta y error, con el aspecto de `Field`. */
function Selector({ etiqueta, vacio, opciones, valor, error, alCambiar }: SelectorProps) {
  const id = useId();
  const idError = `${id}-error`;

  return (
    <div className={styles.campo}>
      <label className={styles.etiqueta} htmlFor={id}>
        {etiqueta} <span className={styles.obligatorio}>(obligatorio)</span>
      </label>
      <select
        id={id}
        className={[styles.selector, error === undefined ? '' : styles.invalido]
          .filter(Boolean)
          .join(' ')}
        value={valor}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={error === undefined ? undefined : idError}
        onChange={(evento) => {
          alCambiar(evento.target.value);
        }}
      >
        <option value="">{vacio}</option>
        {opciones.map((opcion) => (
          <option key={opcion.id} value={opcion.id}>
            {opcion.nombre}
          </option>
        ))}
      </select>
      {error === undefined ? null : (
        <p id={idError} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}

interface FormularioProps {
  inicial: FormularioPartido;
  competiciones: readonly Opcion[];
  rivales: readonly Opcion[];
  campoDeCasa: string;
  guardar: UseMutationResult<Partido, Error, DatosDePartido>;
  textoBoton: string;
  alGuardar: (partido: Partido) => void;
}

function Formulario({
  inicial,
  competiciones,
  rivales,
  campoDeCasa,
  guardar,
  textoBoton,
  alGuardar,
}: FormularioProps) {
  const anunciar = useAnnounce();
  const idCampos = useId();
  const [formulario, setFormulario] = useState<FormularioPartido>(inicial);
  const [errores, setErrores] = useState<ResultadoPartido['errores']>({});
  const [falloAlGuardar, setFalloAlGuardar] = useState<string | null>(null);

  const cambiar = (cambio: Partial<FormularioPartido>) => {
    setFormulario((anterior) => ({ ...anterior, ...cambio }));
  };

  return (
    <form
      className={styles.formulario}
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault();
        setFalloAlGuardar(null);

        const resultado = validarPartido(formulario, new Date());
        setErrores(resultado.errores);

        if (resultado.valores === null) {
          anunciar('Revisa los campos marcados');
          return;
        }

        guardar.mutate(resultado.valores, {
          onSuccess: alGuardar,
          onError: (error) => {
            const mensaje = mensajeDeErrorAlGuardar(error);
            setFalloAlGuardar(mensaje);
            anunciar(mensaje);
          },
        });
      }}
    >
      <Selector
        etiqueta="Competición"
        vacio="Elige la competición"
        opciones={competiciones}
        valor={formulario.competicionId}
        error={errores.competicionId}
        alCambiar={(competicionId) => {
          cambiar({ competicionId });
        }}
      />
      <Selector
        etiqueta="Rival"
        vacio="Elige el rival"
        opciones={rivales}
        valor={formulario.rivalId}
        error={errores.rivalId}
        alCambiar={(rivalId) => {
          cambiar({ rivalId });
        }}
      />
      <GrupoDeOpciones
        leyenda="Dónde"
        opciones={[
          { valor: 'casa', etiqueta: 'En casa' },
          { valor: 'fuera', etiqueta: 'Fuera' },
        ]}
        valor={formulario.enCasa ? 'casa' : 'fuera'}
        alCambiar={(donde) => {
          const enCasa = donde === 'casa';
          // Al pasar a «en casa» con el campo vacío, se propone el de casa.
          cambiar(
            enCasa && formulario.campo.trim() === '' ? { enCasa, campo: campoDeCasa } : { enCasa },
          );
        }}
      />
      <div className={styles.fechaHora}>
        <Field
          label="Fecha"
          type="date"
          required
          value={formulario.fecha}
          error={errores.fecha}
          onChange={(evento) => {
            cambiar({ fecha: evento.target.value });
          }}
        />
        <Field
          label="Hora"
          type="time"
          required
          value={formulario.hora}
          error={errores.hora}
          onChange={(evento) => {
            cambiar({ hora: evento.target.value });
          }}
        />
      </div>
      <Field
        label="Campo"
        hint="Nombre del campo y, si hace falta, la zona."
        maxLength={LARGO_CAMPO}
        autoComplete="off"
        list={campoDeCasa === '' ? undefined : `${idCampos}-casa`}
        value={formulario.campo}
        error={errores.campo}
        onChange={(evento) => {
          cambiar({ campo: evento.target.value });
        }}
      />
      {campoDeCasa === '' ? null : (
        <datalist id={`${idCampos}-casa`}>
          <option value={campoDeCasa}>{campoDeCasa}</option>
        </datalist>
      )}

      <label className={styles.opcion} htmlFor={`${idCampos}-diferido`}>
        <input
          id={`${idCampos}-diferido`}
          className={styles.marca}
          type="checkbox"
          checked={formulario.enDiferido}
          aria-describedby={`${idCampos}-diferido-ayuda`}
          onChange={(evento) => {
            cambiar({ enDiferido: evento.target.checked });
          }}
        />
        <span>Ya se jugó: lo meto en diferido</span>
      </label>
      <p id={`${idCampos}-diferido-ayuda`} className={styles.nota}>
        Para apuntar después un partido que no se siguió en directo. Los eventos llevan su minuto a
        mano.
      </p>

      {falloAlGuardar === null ? null : <p className={styles.fallo}>{falloAlGuardar}</p>}

      <div>
        <Button type="submit" variant="primary" disabled={guardar.isPending}>
          {guardar.isPending ? 'Guardando…' : textoBoton}
        </Button>
      </div>
    </form>
  );
}

/** Carga lo que el formulario necesita y explica qué falta si falta algo. */
function useDatosDelFormulario() {
  const { equipoId, equipoNombre, clubId, temporadaId } = useEquipoActivo();
  const competiciones = useCompeticiones(clubId, temporadaId);
  const equipos = useEquipos(clubId);
  const calendario = useCalendario(equipoId, temporadaId);
  // El club, por su campo de casa. Se espera a tenerlo: el formulario toma
  // su valor inicial una sola vez y no lo cambiaría al llegar tarde.
  const club = useClub(clubId);

  const cargando =
    competiciones.isPending || equipos.isPending || calendario.isPending || club.isPending;
  const error = competiciones.isError || equipos.isError || calendario.isError || club.isError;

  return {
    equipoId,
    equipoNombre,
    clubId,
    temporadaId,
    cargando,
    error,
    reintentar: () => {
      void competiciones.refetch();
      void equipos.refetch();
      void calendario.refetch();
      void club.refetch();
    },
    competiciones: (competiciones.data ?? []).map((c) => ({ id: c.id, nombre: c.name })),
    rivales: (equipos.data ?? [])
      .filter((equipo) => equipo.kind === 'reference')
      .map((equipo) => ({ id: equipo.id, nombre: equipo.name })),
    campoDeCasa: campoDeCasaPropuesto(club.data?.homeVenue ?? null, calendario.data ?? []),
  };
}

type Datos = ReturnType<typeof useDatosDelFormulario>;

/** Lo que impide rellenar el formulario, o `null` si está todo. */
function Impedimento({ datos }: { datos: Datos }) {
  if (datos.equipoId === null || datos.clubId === null) {
    return (
      <p className={styles.nota}>
        No hay equipo activo, así que no se sabe de quién es el partido.
      </p>
    );
  }

  if (datos.temporadaId === null) {
    return <p className={styles.nota}>El club no tiene ninguna temporada en curso.</p>;
  }

  if (datos.cargando) {
    return <p className={styles.nota}>Cargando…</p>;
  }

  if (datos.error) {
    return (
      <div className={styles.bloque}>
        <p className={styles.nota}>
          No se ha podido cargar lo necesario. Suele ser falta de cobertura.
        </p>
        <div>
          <Button variant="secondary" onClick={datos.reintentar}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (datos.competiciones.length === 0 || datos.rivales.length === 0) {
    return (
      <div className={styles.bloque}>
        {datos.competiciones.length === 0 ? (
          <p className={styles.nota}>
            Todavía no hay ninguna competición esta temporada.{' '}
            <Link to="/competiciones">Crea la liga en Competiciones</Link>.
          </p>
        ) : null}
        {datos.rivales.length === 0 ? (
          <p className={styles.nota}>
            Todavía no hay ningún rival. <Link to="/equipos">Añádelo en Equipos</Link>.
          </p>
        ) : null}
      </div>
    );
  }

  return null;
}

export function NuevoPartidoPage() {
  const anunciar = useAnnounce();
  const navigate = useNavigate();
  const datos = useDatosDelFormulario();
  const crear = useCrearPartido({
    clubId: datos.clubId ?? '',
    equipoId: datos.equipoId ?? '',
    temporadaId: datos.temporadaId ?? '',
  });

  const impedimento = <Impedimento datos={datos} />;
  const bloqueado =
    datos.equipoId === null ||
    datos.clubId === null ||
    datos.temporadaId === null ||
    datos.cargando ||
    datos.error ||
    datos.competiciones.length === 0 ||
    datos.rivales.length === 0;

  return (
    <Pantalla id="A10" titulo="Nuevo partido">
      <p>
        <Link className={styles.volver} to="/calendario">
          Volver al calendario
        </Link>
      </p>
      {bloqueado ? (
        impedimento
      ) : (
        <Card title="Datos del partido" headingLevel={2}>
          <Formulario
            inicial={{
              // Con una sola competición, ya viene elegida: es el caso normal.
              competicionId:
                datos.competiciones.length === 1 ? (datos.competiciones[0]?.id ?? '') : '',
              rivalId: '',
              enCasa: true,
              fecha: '',
              hora: '',
              campo: datos.campoDeCasa,
              enDiferido: false,
            }}
            competiciones={datos.competiciones}
            rivales={datos.rivales}
            campoDeCasa={datos.campoDeCasa}
            guardar={crear}
            textoBoton="Añadir al calendario"
            alGuardar={(partido) => {
              anunciar(`${enfrentamiento(partido, datos.equipoNombre)} añadido al calendario`);
              void navigate('/calendario');
            }}
          />
        </Card>
      )}
    </Pantalla>
  );
}

/** Borrado en dos pasos en el mismo sitio, sin ventana emergente. */
function Borrar({ partido, titulo }: { partido: Partido; titulo: string }) {
  const anunciar = useAnnounce();
  const navigate = useNavigate();
  const borrar = useBorrarPartido(partido.id);
  const [confirmando, setConfirmando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  return (
    <div className={styles.bloque}>
      <p className={styles.nota}>Solo se puede borrar mientras no tenga convocatoria.</p>
      {confirmando ? (
        <div className={styles.acciones}>
          <Button
            variant="primary"
            disabled={borrar.isPending}
            onClick={() => {
              setFallo(null);
              borrar.mutate(undefined, {
                onSuccess: () => {
                  anunciar(`${titulo} borrado`);
                  void navigate('/calendario', { replace: true });
                },
                onError: (error) => {
                  const mensaje = mensajeDeErrorAlGuardar(error);
                  setFallo(mensaje);
                  anunciar(mensaje);
                },
              });
            }}
          >
            {borrar.isPending ? 'Borrando…' : 'Sí, borrar el partido'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setConfirmando(false);
            }}
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <div>
          <Button
            variant="secondary"
            onClick={() => {
              setConfirmando(true);
            }}
          >
            Borrar partido
          </Button>
        </div>
      )}
      {fallo === null ? null : <p className={styles.fallo}>{fallo}</p>}
    </div>
  );
}

export function EditarPartidoPage() {
  const { id: partidoId = '' } = useParams();
  const anunciar = useAnnounce();
  const navigate = useNavigate();
  const datos = useDatosDelFormulario();
  const partido = usePartido(partidoId);
  const actualizar = useActualizarPartido(partidoId);

  const titulo =
    partido.data === undefined || partido.data === null
      ? 'Editar partido'
      : enfrentamiento(partido.data, datos.equipoNombre);

  const contenido = () => {
    if (partido.isPending) {
      return <p className={styles.nota}>Cargando…</p>;
    }

    if (partido.isError) {
      return (
        <div className={styles.bloque}>
          <p className={styles.nota}>
            No se ha podido cargar el partido. Suele ser falta de cobertura.
          </p>
          <div>
            <Button
              variant="secondary"
              onClick={() => {
                void partido.refetch();
              }}
            >
              Reintentar
            </Button>
          </div>
        </div>
      );
    }

    if (partido.data === null) {
      return <p className={styles.nota}>No se encuentra este partido, o no tienes acceso a él.</p>;
    }

    if (!sePuedeEditar(partido.data.status)) {
      return (
        <p className={styles.nota}>
          Este partido está «{NOMBRES_DE_ESTADO[partido.data.status]}»: ya empezó, y su fecha, rival
          y campo ya no se cambian.
        </p>
      );
    }

    const impedimento = <Impedimento datos={datos} />;

    if (
      datos.cargando ||
      datos.error ||
      datos.competiciones.length === 0 ||
      datos.rivales.length === 0
    ) {
      return impedimento;
    }

    const { fecha, hora } = partesDeInstante(partido.data.kickoffAt);

    return (
      <>
        <Card title="Datos del partido" headingLevel={2}>
          <Formulario
            key={partido.data.id}
            inicial={{
              competicionId: partido.data.competitionId,
              rivalId: partido.data.opponentTeamId,
              enCasa: partido.data.isHome,
              fecha,
              hora,
              campo: partido.data.venue ?? '',
              enDiferido: partido.data.isRetroactive,
            }}
            competiciones={datos.competiciones}
            rivales={datos.rivales}
            campoDeCasa={datos.campoDeCasa}
            guardar={actualizar}
            textoBoton="Guardar cambios"
            alGuardar={(guardado) => {
              anunciar(`${enfrentamiento(guardado, datos.equipoNombre)} guardado`);
              void navigate('/calendario');
            }}
          />
        </Card>
        {partido.data.status === 'scheduled' ? (
          <Card title="Borrar" headingLevel={2}>
            <Borrar partido={partido.data} titulo={titulo} />
          </Card>
        ) : null}
      </>
    );
  };

  return (
    <Pantalla id="A10" titulo={titulo}>
      <p>
        <Link className={styles.volver} to="/calendario">
          Volver al calendario
        </Link>
      </p>
      {contenido()}
    </Pantalla>
  );
}
