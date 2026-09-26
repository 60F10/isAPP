// Pantalla A04 — Equipos (T-201, E2-02).
//
// Los equipos del club en dos listas: los propios, con plantilla, y los
// rivales, que son equipos de referencia con solo el nombre (DOC 05 §5.4).
// Se dan de alta y se editan aquí; no se borran, porque `teams` no tiene
// política de borrado.
//
// Un rival se da de alta DENTRO del club, como manda el DOC 05 §5.4: es la
// forma de tener rivales sin un catálogo global de equipos (deuda E17-03).
//
// El tipo se elige al crear y no se cambia después: el porqué está en
// `actualizarEquipo`.

import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';

import { useAnnounce } from '@shared/hooks/announceContext';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { Field } from '@shared/ui/Field';
import { Pantalla } from '@shared/ui/Pantalla';

import { Cargando, ErrorDeCarga } from '../components/EstadoDeCarga';
import {
  useActualizarEquipo,
  useClubActivo,
  useCrearEquipo,
  useEquipos,
} from '../hooks/useClubYEquipos';
import {
  LARGO_CATEGORIA,
  LARGO_NOMBRE_EQUIPO,
  mensajeDeErrorAlGuardar,
  validarEquipo,
} from '../model/clubYEquipos';

import styles from './EquiposPage.module.css';

import type { Equipo, ResultadoEquipo, TipoDeEquipo } from '../model/clubYEquipos';

// ---------------------------------------------------------------------------
// Alta
// ---------------------------------------------------------------------------

interface NuevoEquipoProps {
  clubId: string;
  equipos: readonly Equipo[];
}

function NuevoEquipo({ clubId, equipos }: NuevoEquipoProps) {
  const anunciar = useAnnounce();
  const crear = useCrearEquipo(clubId);
  const idTipo = useId();
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  // Rival por defecto: es lo que más se da de alta, uno por cada partido nuevo.
  const [tipo, setTipo] = useState<TipoDeEquipo>('reference');
  const [errores, setErrores] = useState<ResultadoEquipo['errores']>({});
  const [falloAlGuardar, setFalloAlGuardar] = useState<string | null>(null);

  return (
    <form
      className={styles.formulario}
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault();
        setFalloAlGuardar(null);

        const resultado = validarEquipo({ nombre, categoria, tipo }, equipos);
        setErrores(resultado.errores);

        if (resultado.valores === null) {
          anunciar('Revisa los campos marcados');
          return;
        }

        crear.mutate(resultado.valores, {
          onSuccess: (creado) => {
            setNombre('');
            setCategoria('');
            anunciar(`${creado.name} añadido`);
          },
          onError: (error) => {
            const mensaje = mensajeDeErrorAlGuardar(error);
            setFalloAlGuardar(mensaje);
            anunciar(mensaje);
          },
        });
      }}
    >
      <fieldset className={styles.grupo}>
        <legend className={styles.leyenda}>Tipo de equipo</legend>
        <label className={styles.opcion} htmlFor={`${idTipo}-rival`}>
          <input
            id={`${idTipo}-rival`}
            className={styles.radio}
            type="radio"
            name={idTipo}
            checked={tipo === 'reference'}
            onChange={() => {
              setTipo('reference');
            }}
          />
          <span>Rival: solo el nombre, sin jugadores</span>
        </label>
        <label className={styles.opcion} htmlFor={`${idTipo}-propio`}>
          <input
            id={`${idTipo}-propio`}
            className={styles.radio}
            type="radio"
            name={idTipo}
            checked={tipo === 'managed'}
            onChange={() => {
              setTipo('managed');
            }}
          />
          <span>Del club: con plantilla y personas</span>
        </label>
      </fieldset>

      {tipo === 'managed' ? (
        <p className={styles.nota}>
          Un equipo nuevo del club empieza sin personas. Hasta que existan las invitaciones, nadie
          puede llevar su plantilla ni sus partidos.
        </p>
      ) : null}

      <Field
        label="Nombre"
        required
        maxLength={LARGO_NOMBRE_EQUIPO}
        autoComplete="off"
        value={nombre}
        error={errores.nombre}
        onChange={(evento) => {
          setNombre(evento.target.value);
        }}
      />
      <Field
        label="Categoría"
        hint="Cadete, Infantil… Puedes dejarla vacía."
        maxLength={LARGO_CATEGORIA}
        autoComplete="off"
        value={categoria}
        error={errores.categoria}
        onChange={(evento) => {
          setCategoria(evento.target.value);
        }}
      />

      {falloAlGuardar === null ? null : <p className={styles.fallo}>{falloAlGuardar}</p>}

      <div>
        <Button type="submit" variant="primary" iconStart="plus" disabled={crear.isPending}>
          {crear.isPending ? 'Añadiendo…' : 'Añadir equipo'}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Una fila de la lista, que se abre para editar
// ---------------------------------------------------------------------------

interface FilaEquipoProps {
  clubId: string;
  equipo: Equipo;
  equipos: readonly Equipo[];
}

function FilaEquipo({ clubId, equipo, equipos }: FilaEquipoProps) {
  const anunciar = useAnnounce();
  const actualizar = useActualizarEquipo(clubId);
  const idNombre = useId();
  const idEditar = useId();
  const [editando, setEditando] = useState(false);
  // Al cerrar la edición, el foco vuelve al botón que la abrió (2.4.3). Sin
  // esto se quedaría en el `<body>` y el teclado empezaría desde arriba.
  const devolverFoco = useRef(false);
  const [nombre, setNombre] = useState(equipo.name);
  const [categoria, setCategoria] = useState(equipo.category ?? '');
  const [errores, setErrores] = useState<ResultadoEquipo['errores']>({});
  const [falloAlGuardar, setFalloAlGuardar] = useState<string | null>(null);

  useEffect(() => {
    if (editando) {
      document.getElementById(idNombre)?.focus();
    } else if (devolverFoco.current) {
      devolverFoco.current = false;
      document.getElementById(idEditar)?.focus();
    }
  }, [editando, idNombre, idEditar]);

  const cerrar = () => {
    devolverFoco.current = true;
    setEditando(false);
    setErrores({});
    setFalloAlGuardar(null);
  };

  if (!editando) {
    return (
      <li className={styles.fila}>
        <div className={styles.datos}>
          <span className={styles.nombre}>{equipo.name}</span>
          {equipo.category === null ? null : (
            <span className={styles.categoria}>{equipo.category}</span>
          )}
        </div>
        <div className={styles.acciones}>
          {equipo.kind === 'managed' ? (
            <Link
              className={styles.enlace}
              to={`/equipos/${equipo.id}/plantilla`}
              aria-label={`Plantilla de ${equipo.name}`}
            >
              Plantilla
            </Link>
          ) : null}
          <Button
            id={idEditar}
            variant="secondary"
            aria-label={`Editar ${equipo.name}`}
            onClick={() => {
              setNombre(equipo.name);
              setCategoria(equipo.category ?? '');
              setEditando(true);
            }}
          >
            Editar
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className={styles.fila}>
      <form
        className={styles.formulario}
        aria-label={`Editar ${equipo.name}`}
        noValidate
        onSubmit={(evento) => {
          evento.preventDefault();
          setFalloAlGuardar(null);

          const resultado = validarEquipo(
            { nombre, categoria, tipo: equipo.kind },
            equipos,
            equipo.id,
          );
          setErrores(resultado.errores);

          if (resultado.valores === null) {
            anunciar('Revisa los campos marcados');
            return;
          }

          actualizar.mutate(
            {
              equipoId: equipo.id,
              cambios: { name: resultado.valores.name, category: resultado.valores.category },
            },
            {
              onSuccess: (guardado) => {
                anunciar(`${guardado.name} guardado`);
                cerrar();
              },
              onError: (error) => {
                const mensaje = mensajeDeErrorAlGuardar(error);
                setFalloAlGuardar(mensaje);
                anunciar(mensaje);
              },
            },
          );
        }}
      >
        <Field
          id={idNombre}
          label="Nombre"
          required
          maxLength={LARGO_NOMBRE_EQUIPO}
          autoComplete="off"
          value={nombre}
          error={errores.nombre}
          onChange={(evento) => {
            setNombre(evento.target.value);
          }}
        />
        <Field
          label="Categoría"
          maxLength={LARGO_CATEGORIA}
          autoComplete="off"
          value={categoria}
          error={errores.categoria}
          onChange={(evento) => {
            setCategoria(evento.target.value);
          }}
        />

        {falloAlGuardar === null ? null : <p className={styles.fallo}>{falloAlGuardar}</p>}

        <div className={styles.acciones}>
          <Button type="submit" variant="primary" disabled={actualizar.isPending}>
            {actualizar.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
          <Button variant="secondary" onClick={cerrar}>
            Cancelar
          </Button>
        </div>
      </form>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Pantalla
// ---------------------------------------------------------------------------

interface ListaProps {
  clubId: string;
  titulo: string;
  vacio: string;
  lista: readonly Equipo[];
  equipos: readonly Equipo[];
}

function Lista({ clubId, titulo, vacio, lista, equipos }: ListaProps) {
  return (
    <Card title={titulo} headingLevel={2}>
      {lista.length === 0 ? (
        <p className={styles.nota}>{vacio}</p>
      ) : (
        <ul className={styles.lista}>
          {lista.map((equipo) => (
            <FilaEquipo key={equipo.id} clubId={clubId} equipo={equipo} equipos={equipos} />
          ))}
        </ul>
      )}
    </Card>
  );
}

export function EquiposPage() {
  const clubId = useClubActivo();
  const equipos = useEquipos(clubId);

  return (
    <Pantalla id="A04" titulo="Equipos">
      {clubId === null ? (
        // Una consulta apagada no sale nunca de «pendiente»: sin este caso,
        // la pantalla se quedaría en «Cargando…» para siempre.
        <p className={styles.nota}>
          No hay equipo activo, así que no se sabe de qué club se trata.
        </p>
      ) : equipos.isPending ? (
        <Cargando />
      ) : equipos.isError ? (
        <ErrorDeCarga
          que="los equipos"
          onReintentar={() => {
            void equipos.refetch();
          }}
        />
      ) : (
        <>
          <Lista
            clubId={clubId}
            titulo="Equipos del club"
            vacio="El club todavía no tiene equipos propios."
            lista={equipos.data.filter((equipo) => equipo.kind === 'managed')}
            equipos={equipos.data}
          />
          <Lista
            clubId={clubId}
            titulo="Rivales"
            vacio="Todavía no hay rivales. Añade el primero con el formulario de abajo."
            lista={equipos.data.filter((equipo) => equipo.kind === 'reference')}
            equipos={equipos.data}
          />
          <Card title="Añadir equipo" headingLevel={2}>
            <NuevoEquipo clubId={clubId} equipos={equipos.data} />
          </Card>
        </>
      )}
    </Pantalla>
  );
}
