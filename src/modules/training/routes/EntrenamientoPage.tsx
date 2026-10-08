// Pantalla A15b — Alta y edición de entrenamiento (T-228).
//
// Fecha, hora, lugar y objetivo de la sesión. Los dos últimos, opcionales. Un
// entrenamiento ya hecho se mete después: las fechas pasadas se admiten.
//
// EL ALTA TRAE RELLENO lo que casi siempre vale: la fecha de hoy, y la hora y
// el lugar del entrenamiento más reciente. Sin ninguno, el campo de casa del
// club (`clubs.home_venue`).
//
// Las dos rutas cuelgan de `training.manage` en `router.tsx`, y la base lo
// vuelve a pedir: sin el permiso, guardar devuelve cero filas y se dice.
//
// BORRAR se lleva en cascada la lista de asistencia de esa sesión, y la
// pregunta lo dice. Solo se ofrece en la edición.
//
// Va en línea y no por la cola: sin red no se guarda nada.
//
// «REPETIR CADA SEMANA» (T-230) SOLO EXISTE EN EL ALTA. Con la casilla
// marcada se eligen los días y hasta cuándo, una línea viva dice cuántos se
// van a crear, y al guardar entran todos a la vez o ninguno. Sin marcar, el
// alta es la de la T-228. La tanda no existe en la base: son entrenamientos
// sueltos, y cada uno se edita y se borra después como cualquier otro.

import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { useClub } from '@modules/core';
import { useAnnounce } from '@shared/hooks/announceContext';
import { mensajeDeErrorAlGuardar } from '@shared/lib/guardado';
import { partesDeInstante } from '@shared/lib/instante';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { Field } from '@shared/ui/Field';
import { Icon } from '@shared/ui/Icon';
import { Pantalla } from '@shared/ui/Pantalla';

import {
  useActualizarEntrenamiento,
  useBorrarEntrenamiento,
  useCrearEntrenamiento,
  useCrearEntrenamientos,
  useEntrenamiento,
  useEntrenamientos,
  useEquipoDeTrabajo,
  useFinDeTemporada,
} from '../hooks/useEntrenamientos';
import {
  LARGO_LUGAR,
  LARGO_OBJETIVO,
  propuestaDeAlta,
  validarEntrenamiento,
} from '../model/entrenamiento';
import {
  diaDeLaFecha,
  DIAS,
  fechasSemanales,
  planDeLaTanda,
  validarRepeticion,
} from '../model/repeticion';

import styles from './EntrenamientoPage.module.css';

import type { DatosDeEntrenamiento } from '../api/entrenamientos';
import type {
  Entrenamiento,
  FormularioEntrenamiento,
  ResultadoEntrenamiento,
} from '../model/entrenamiento';
import type { DiaDeLaSemana, ErroresDeRepeticion, PlanDeLaTanda } from '../model/repeticion';
import type { UseMutationResult } from '@tanstack/react-query';
import type { RefObject } from 'react';

const LISTA = '/entrenamientos';

const DIA = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

/**
 * La línea viva de «Repetir cada semana»: cuántos se van a crear y entre qué
 * días, y los que se quedan fuera. Vacía mientras falte algo por escribir.
 */
function resumenDeLaTanda(plan: PlanDeLaTanda | null): string {
  if (plan === null) {
    return '';
  }

  const frases: string[] = [];
  const { nuevos, repetidos, imposibles } = plan;

  // Con demasiados no se va a crear nada: decir «Se van a crear 152» sería
  // prometer lo que el botón va a negar.
  if (plan.error !== null && nuevos.length > 0) {
    return plan.error;
  }
  const primero = nuevos.at(0);
  const ultimo = nuevos.at(-1);

  if (primero === undefined || ultimo === undefined) {
    frases.push('No se va a crear ninguno.');
  } else if (nuevos.length === 1) {
    frases.push(`Se va a crear 1 entrenamiento, el ${DIA.format(new Date(primero))}.`);
  } else {
    frases.push(
      `Se van a crear ${nuevos.length} entrenamientos, del ${DIA.format(new Date(primero))} al ${DIA.format(new Date(ultimo))}.`,
    );
  }

  if (repetidos.length === 1) {
    frases.push('1 ya existe y no se repite.');
  } else if (repetidos.length > 1) {
    frases.push(`${repetidos.length} ya existen y no se repiten.`);
  }

  if (imposibles.length === 1) {
    frases.push('1 no se crea porque esa hora no existe ese día.');
  } else if (imposibles.length > 1) {
    frases.push(`${imposibles.length} no se crean porque esa hora no existe ese día.`);
  }

  return frases.join(' ');
}

function creados(cuantos: number): string {
  return cuantos === 1 ? '1 entrenamiento creado.' : `${cuantos} entrenamientos creados.`;
}

/**
 * Lleva el foco al mensaje de error cuando aparece (2.4.3). El botón que lo
 * tenía estaba desactivado mientras se guardaba, y al reactivarse el foco ya
 * se había ido a `body`. Devuelve el `ref` del elemento del mensaje, que
 * tiene que llevar `tabIndex={-1}`.
 */
function useFocoAlFallar<T extends HTMLElement>(fallo: string | null): RefObject<T | null> {
  const mensaje = useRef<T>(null);

  useEffect(() => {
    if (fallo !== null) {
      mensaje.current?.focus();
    }
  }, [fallo]);

  return mensaje;
}

function Volver() {
  return (
    <p>
      <Link className={styles.volver} to={LISTA}>
        Volver a entrenamientos
      </Link>
    </p>
  );
}

/** Lo que «Repetir cada semana» necesita del alta. La edición no lo pasa. */
interface Tanda {
  /** Los `scheduledAt` del horario que ya existe: no se repiten. */
  existentes: readonly string[];
  /** El último día de la temporada, o `null` si no se sabe. */
  finDeTemporada: string | null;
  crear: UseMutationResult<number, Error, DatosDeEntrenamiento[]>;
}

interface FormularioProps {
  inicial: FormularioEntrenamiento;
  guardar: UseMutationResult<Entrenamiento, Error, DatosDeEntrenamiento>;
  textoBoton: string;
  /** Solo en el alta: con ella sale la casilla «Repetir cada semana». */
  tanda?: Tanda;
}

/** El formulario común al alta y a la edición. Al guardar vuelve a la lista. */
function Formulario({ inicial, guardar, textoBoton, tanda }: FormularioProps) {
  const anunciar = useAnnounce();
  const navigate = useNavigate();
  const idCampos = useId();
  const [formulario, setFormulario] = useState<FormularioEntrenamiento>(inicial);
  const [errores, setErrores] = useState<ResultadoEntrenamiento['errores']>({});
  const [falloAlGuardar, setFalloAlGuardar] = useState<string | null>(null);
  const [repetir, setRepetir] = useState(false);
  // `null` hasta que se marca la casilla por primera vez: entonces toma el día
  // de la semana de «Desde». Después no lo vuelve a tocar nadie más que la
  // persona, tampoco al cambiar «Desde».
  const [dias, setDias] = useState<DiaDeLaSemana[] | null>(null);
  // `null` mientras nadie la escriba: vale el fin de la temporada, que puede
  // llegar después de marcar la casilla.
  const [hastaEscrita, setHastaEscrita] = useState<string | null>(null);
  // Los errores de la tanda salen al primer intento de crearla, como los del
  // resto del formulario, y desde ahí siguen a lo escrito: el resumen y el
  // botón se recalculan con cada cambio, y un error viejo los desmentiría.
  const [tandaIntentada, setTandaIntentada] = useState(false);
  // Cuenta los envíos que no pasan la validación: cada uno lleva el foco al
  // primer campo con error, también si es el mismo campo que la vez anterior.
  const [rechazos, setRechazos] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  const mensaje = useFocoAlFallar<HTMLParagraphElement>(falloAlGuardar);

  useEffect(() => {
    if (rechazos > 0) {
      // El de «Días» es de todo el grupo, que no es un campo: el foco va a su
      // primera casilla, que es donde se arregla.
      form.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalido] input')
        ?.focus();
    }
  }, [rechazos]);

  const cambiar = (cambio: Partial<FormularioEntrenamiento>) => {
    setFormulario((anterior) => ({ ...anterior, ...cambio }));
  };

  const repitiendo = tanda !== undefined && repetir;
  const diasElegidos = dias ?? [];
  const hasta = hastaEscrita ?? tanda?.finDeTemporada ?? '';

  // Se recalcula en cada pintado, que es lo que mantiene al día el resumen y
  // el botón. `plan` es `null` mientras falte algo por escribir.
  const calcularTanda = (): { errores: ErroresDeRepeticion; plan: PlanDeLaTanda | null } => {
    if (tanda === undefined || !repetir) {
      return { errores: {}, plan: null };
    }

    const deRepeticion = validarRepeticion({
      desde: formulario.fecha,
      hasta,
      dias: diasElegidos,
      finDeTemporada: tanda.finDeTemporada,
    });

    if (
      Object.keys(deRepeticion).length > 0 ||
      diaDeLaFecha(formulario.fecha) === null ||
      formulario.hora === ''
    ) {
      return { errores: deRepeticion, plan: null };
    }

    return {
      errores: deRepeticion,
      plan: planDeLaTanda({
        fechas: fechasSemanales({ desde: formulario.fecha, hasta, dias: diasElegidos }),
        hora: formulario.hora,
        existentes: tanda.existentes,
      }),
    };
  };

  const { errores: deRepeticion, plan } = calcularTanda();
  // El error del plan (demasiados o ninguno) va bajo «Hasta», que es el campo
  // que decide cuántos salen.
  const deTanda: ErroresDeRepeticion =
    plan === null || plan.error === null ? deRepeticion : { ...deRepeticion, hasta: plan.error };
  const erroresDeTanda: ErroresDeRepeticion = tandaIntentada ? deTanda : {};
  const guardando = guardar.isPending || tanda?.crear.isPending === true;

  const textoDelBoton = (): string => {
    if (guardando) {
      return repitiendo ? 'Creando…' : 'Guardando…';
    }

    if (!repitiendo) {
      return textoBoton;
    }

    // Sin número mientras no se pueda crear: falta algo, son demasiados o no
    // hay ninguno.
    if (plan === null || plan.error !== null) {
      return 'Crear entrenamientos';
    }

    return plan.nuevos.length === 1
      ? 'Crear 1 entrenamiento'
      : `Crear ${plan.nuevos.length} entrenamientos`;
  };

  const alFallar = (error: unknown) => {
    const texto = mensajeDeErrorAlGuardar(error);
    setFalloAlGuardar(texto);
    anunciar(texto);
  };

  return (
    <form
      ref={form}
      className={styles.formulario}
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault();
        setFalloAlGuardar(null);

        const resultado = validarEntrenamiento(formulario);
        setErrores(resultado.errores);

        if (tanda !== undefined && repetir) {
          setTandaIntentada(true);

          if (resultado.valores === null || plan === null || Object.keys(deTanda).length > 0) {
            setRechazos((cuantos) => cuantos + 1);
            anunciar('Revisa los campos marcados');
            return;
          }

          // El lugar y el objetivo, los del formulario, iguales en todos.
          const { location, focus } = resultado.valores;

          tanda.crear.mutate(
            plan.nuevos.map((scheduled_at) => ({ scheduled_at, location, focus })),
            {
              onSuccess: (cuantos) => {
                anunciar(creados(cuantos));
                void navigate(LISTA);
              },
              onError: alFallar,
            },
          );
          return;
        }

        if (resultado.valores === null) {
          setRechazos((cuantos) => cuantos + 1);
          anunciar('Revisa los campos marcados');
          return;
        }

        guardar.mutate(resultado.valores, {
          onSuccess: () => {
            anunciar('Entrenamiento guardado.');
            void navigate(LISTA);
          },
          onError: alFallar,
        });
      }}
    >
      <div className={styles.fechaHora}>
        <Field
          label={repitiendo ? 'Desde' : 'Fecha'}
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

      {tanda === undefined ? null : (
        <div className={styles.repeticion}>
          <label className={styles.opcion} htmlFor={`${idCampos}-repetir`}>
            <input
              id={`${idCampos}-repetir`}
              className={styles.marca}
              type="checkbox"
              checked={repetir}
              onChange={(evento) => {
                setRepetir(evento.target.checked);
                setTandaIntentada(false);

                // Sin fecha de la que sacarlo, se queda sin elegir: lo tomará
                // la próxima vez que se marque la casilla.
                if (evento.target.checked && dias === null) {
                  const deDesde = diaDeLaFecha(formulario.fecha);

                  if (deDesde !== null) {
                    setDias([deDesde]);
                  }
                }
              }}
            />
            <span>Repetir cada semana</span>
          </label>

          {repitiendo ? (
            <>
              <fieldset
                className={styles.dias}
                aria-describedby={
                  erroresDeTanda.dias === undefined ? undefined : `${idCampos}-dias-error`
                }
                data-invalido={erroresDeTanda.dias === undefined ? undefined : ''}
              >
                <legend className={styles.leyenda}>Días</legend>
                <div className={styles.casillas}>
                  {DIAS.map(({ dia, nombre }) => (
                    <label key={dia} className={styles.opcion} htmlFor={`${idCampos}-dia-${dia}`}>
                      <input
                        id={`${idCampos}-dia-${dia}`}
                        className={styles.marca}
                        type="checkbox"
                        checked={diasElegidos.includes(dia)}
                        onChange={(evento) => {
                          setDias(
                            evento.target.checked
                              ? [...diasElegidos, dia]
                              : diasElegidos.filter((elegido) => elegido !== dia),
                          );
                        }}
                      />
                      <span>{nombre}</span>
                    </label>
                  ))}
                </div>
                {erroresDeTanda.dias === undefined ? null : (
                  <p id={`${idCampos}-dias-error`} className={styles.error}>
                    <Icon name="close" size="sm" />
                    <span>{erroresDeTanda.dias}</span>
                  </p>
                )}
              </fieldset>

              <Field
                label="Hasta"
                type="date"
                required
                value={hasta}
                error={erroresDeTanda.hasta}
                onChange={(evento) => {
                  setHastaEscrita(evento.target.value);
                }}
              />
            </>
          ) : null}

          {/* Región viva propia, y no la del `AppLayout`: se recalcula con cada
              cambio y tiene que leerse sin salir del formulario. Está desde
              antes de marcar la casilla, vacía: una región que nace con el
              texto puesto no siempre se anuncia. */}
          <p className={styles.resumen} aria-live="polite">
            {repitiendo ? resumenDeLaTanda(plan) : ''}
          </p>
        </div>
      )}

      <Field
        label="Lugar"
        hint="El campo o la instalación. Se puede dejar vacío."
        maxLength={LARGO_LUGAR}
        autoComplete="off"
        value={formulario.lugar}
        error={errores.lugar}
        onChange={(evento) => {
          cambiar({ lugar: evento.target.value });
        }}
      />
      <Field
        label="Objetivo de la sesión"
        hint="Qué se va a trabajar. Lo ve todo el club. Se puede dejar vacío."
        maxLength={LARGO_OBJETIVO}
        autoComplete="off"
        value={formulario.objetivo}
        error={errores.objetivo}
        onChange={(evento) => {
          cambiar({ objetivo: evento.target.value });
        }}
      />

      {falloAlGuardar === null ? null : (
        <p ref={mensaje} className={styles.fallo} tabIndex={-1}>
          {falloAlGuardar}
        </p>
      )}

      <div>
        <Button type="submit" variant="primary" className={styles.largo} disabled={guardando}>
          {textoDelBoton()}
        </Button>
      </div>
    </form>
  );
}

export function NuevoEntrenamientoPage() {
  const { equipoId, clubId, temporadaId } = useEquipoDeTrabajo();
  const entrenamientos = useEntrenamientos(equipoId, temporadaId);
  // El club, por su campo de casa. Se espera a tenerlo y a tener el horario:
  // el formulario toma su valor inicial una sola vez y no lo cambiaría al
  // llegar tarde.
  const club = useClub(clubId);
  const crear = useCrearEntrenamiento({
    equipoId: equipoId ?? '',
    temporadaId: temporadaId ?? '',
  });
  // Lo de «Repetir cada semana». El fin de la temporada no se espera: si no
  // llega, se repite igual, sin validar contra él.
  const crearVarios = useCrearEntrenamientos({
    equipoId: equipoId ?? '',
    temporadaId: temporadaId ?? '',
  });
  const finDeTemporada = useFinDeTemporada(temporadaId);

  const contenido = () => {
    if (equipoId === null || clubId === null) {
      return (
        <p className={styles.nota}>
          No hay equipo activo, así que no se sabe de quién es el entrenamiento.
        </p>
      );
    }

    if (temporadaId === null) {
      return <p className={styles.nota}>El club no tiene ninguna temporada en curso.</p>;
    }

    if (entrenamientos.isPending || club.isPending) {
      return <p className={styles.nota}>Cargando…</p>;
    }

    if (entrenamientos.isError || club.isError) {
      return (
        <div className={styles.bloque}>
          <p className={styles.nota}>
            No se ha podido cargar lo necesario. Suele ser falta de cobertura.
          </p>
          <div>
            <Button
              variant="secondary"
              onClick={() => {
                void entrenamientos.refetch();
                void club.refetch();
              }}
            >
              Reintentar
            </Button>
          </div>
        </div>
      );
    }

    return (
      <Card title="Datos del entrenamiento" headingLevel={2}>
        <Formulario
          inicial={{
            ...propuestaDeAlta(entrenamientos.data, club.data?.homeVenue ?? null, new Date()),
            objetivo: '',
          }}
          guardar={crear}
          textoBoton="Guardar entrenamiento"
          tanda={{
            existentes: entrenamientos.data.map((entrenamiento) => entrenamiento.scheduledAt),
            finDeTemporada,
            crear: crearVarios,
          }}
        />
      </Card>
    );
  };

  return (
    <Pantalla id="A15b" titulo="Nuevo entrenamiento">
      <Volver />
      {contenido()}
    </Pantalla>
  );
}

/** Borrado en dos pasos en el mismo sitio, sin ventana emergente. */
function Borrar({ entrenamientoId }: { entrenamientoId: string }) {
  const anunciar = useAnnounce();
  const navigate = useNavigate();
  const borrar = useBorrarEntrenamiento(entrenamientoId);
  const idBorrar = useId();
  const pregunta = useRef<HTMLParagraphElement>(null);
  const preguntado = useRef(false);
  const [confirmando, setConfirmando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const mensaje = useFocoAlFallar<HTMLParagraphElement>(fallo);

  // Al abrir la pregunta, el foco va a ella: el botón que lo tenía ya no está.
  // Con «No, dejarlo», vuelve a «Borrar entrenamiento» (2.4.3).
  useEffect(() => {
    if (confirmando) {
      preguntado.current = true;
      pregunta.current?.focus();
    } else if (preguntado.current) {
      preguntado.current = false;
      document.getElementById(idBorrar)?.focus();
    }
  }, [confirmando, idBorrar]);

  return (
    <div className={styles.bloque}>
      {confirmando ? (
        <>
          <p ref={pregunta} className={styles.pregunta} tabIndex={-1}>
            ¿Borrar este entrenamiento? Se borra también su lista de asistencia. No se puede
            deshacer.
          </p>
          <div className={styles.acciones}>
            <Button
              variant="primary"
              disabled={borrar.isPending}
              onClick={() => {
                setFallo(null);
                borrar.mutate(undefined, {
                  onSuccess: () => {
                    anunciar('Entrenamiento borrado.');
                    void navigate(LISTA, { replace: true });
                  },
                  onError: (error) => {
                    const texto = mensajeDeErrorAlGuardar(error);
                    setFallo(texto);
                    anunciar(texto);
                  },
                });
              }}
            >
              {borrar.isPending ? 'Borrando…' : 'Sí, borrar'}
            </Button>
            <Button
              variant="secondary"
              disabled={borrar.isPending}
              onClick={() => {
                setFallo(null);
                setConfirmando(false);
              }}
            >
              No, dejarlo
            </Button>
          </div>
        </>
      ) : (
        <div>
          <Button
            id={idBorrar}
            variant="secondary"
            className={styles.largo}
            onClick={() => {
              setConfirmando(true);
            }}
          >
            Borrar entrenamiento
          </Button>
        </div>
      )}
      {fallo === null ? null : (
        <p ref={mensaje} className={styles.fallo} tabIndex={-1}>
          {fallo}
        </p>
      )}
    </div>
  );
}

export function EditarEntrenamientoPage() {
  const { id: entrenamientoId = '' } = useParams();
  const entrenamiento = useEntrenamiento(entrenamientoId);
  const actualizar = useActualizarEntrenamiento(entrenamientoId);

  const contenido = () => {
    if (entrenamiento.isPending) {
      return <p className={styles.nota}>Cargando…</p>;
    }

    if (entrenamiento.isError) {
      return (
        <div className={styles.bloque}>
          <p className={styles.nota}>
            No se ha podido cargar el entrenamiento. Suele ser falta de cobertura.
          </p>
          <div>
            <Button
              variant="secondary"
              onClick={() => {
                void entrenamiento.refetch();
              }}
            >
              Reintentar
            </Button>
          </div>
        </div>
      );
    }

    if (entrenamiento.data === null) {
      // El enlace a la lista es el «Volver a entrenamientos» de arriba, que
      // sale en todos los estados: no se repite aquí.
      return <p className={styles.nota}>Ese entrenamiento no existe o no puedes verlo.</p>;
    }

    const { fecha, hora } = partesDeInstante(entrenamiento.data.scheduledAt);

    return (
      <>
        <Card title="Datos del entrenamiento" headingLevel={2}>
          <Formulario
            key={entrenamiento.data.id}
            inicial={{
              fecha,
              hora,
              lugar: entrenamiento.data.location ?? '',
              objetivo: entrenamiento.data.focus ?? '',
            }}
            guardar={actualizar}
            textoBoton="Guardar cambios"
          />
        </Card>
        <Card title="Borrar" headingLevel={2}>
          <Borrar entrenamientoId={entrenamiento.data.id} />
        </Card>
      </>
    );
  };

  return (
    <Pantalla id="A15b" titulo="Editar entrenamiento">
      <Volver />
      {contenido()}
    </Pantalla>
  );
}
