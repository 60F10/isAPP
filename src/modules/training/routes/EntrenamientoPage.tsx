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

import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { useClub } from '@modules/core';
import { useAnnounce } from '@shared/hooks/announceContext';
import { mensajeDeErrorAlGuardar } from '@shared/lib/guardado';
import { partesDeInstante } from '@shared/lib/instante';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { Field } from '@shared/ui/Field';
import { Pantalla } from '@shared/ui/Pantalla';

import {
  useActualizarEntrenamiento,
  useBorrarEntrenamiento,
  useCrearEntrenamiento,
  useEntrenamiento,
  useEntrenamientos,
  useEquipoDeTrabajo,
} from '../hooks/useEntrenamientos';
import {
  LARGO_LUGAR,
  LARGO_OBJETIVO,
  propuestaDeAlta,
  validarEntrenamiento,
} from '../model/entrenamiento';

import styles from './EntrenamientoPage.module.css';

import type { DatosDeEntrenamiento } from '../api/entrenamientos';
import type {
  Entrenamiento,
  FormularioEntrenamiento,
  ResultadoEntrenamiento,
} from '../model/entrenamiento';
import type { UseMutationResult } from '@tanstack/react-query';
import type { RefObject } from 'react';

const LISTA = '/entrenamientos';

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

interface FormularioProps {
  inicial: FormularioEntrenamiento;
  guardar: UseMutationResult<Entrenamiento, Error, DatosDeEntrenamiento>;
  textoBoton: string;
}

/** El formulario común al alta y a la edición. Al guardar vuelve a la lista. */
function Formulario({ inicial, guardar, textoBoton }: FormularioProps) {
  const anunciar = useAnnounce();
  const navigate = useNavigate();
  const [formulario, setFormulario] = useState<FormularioEntrenamiento>(inicial);
  const [errores, setErrores] = useState<ResultadoEntrenamiento['errores']>({});
  const [falloAlGuardar, setFalloAlGuardar] = useState<string | null>(null);
  // Cuenta los envíos que no pasan la validación: cada uno lleva el foco al
  // primer campo con error, también si es el mismo campo que la vez anterior.
  const [rechazos, setRechazos] = useState(0);
  const form = useRef<HTMLFormElement>(null);
  const mensaje = useFocoAlFallar<HTMLParagraphElement>(falloAlGuardar);

  useEffect(() => {
    if (rechazos > 0) {
      form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [rechazos]);

  const cambiar = (cambio: Partial<FormularioEntrenamiento>) => {
    setFormulario((anterior) => ({ ...anterior, ...cambio }));
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
          onError: (error) => {
            const texto = mensajeDeErrorAlGuardar(error);
            setFalloAlGuardar(texto);
            anunciar(texto);
          },
        });
      }}
    >
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
        <Button
          type="submit"
          variant="primary"
          className={styles.largo}
          disabled={guardar.isPending}
        >
          {guardar.isPending ? 'Guardando…' : textoBoton}
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
