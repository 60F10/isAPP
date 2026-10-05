// Pantalla C02 — Registro de errores (T-303, DOC 02 §2).
//
// Solo lo lee el administrador de plataforma: lo decide la política
// `error_logs_select`. Quien no lo es recibiría cero filas, que no se
// distingue de «no hay errores», así que la frase de la cuenta la decide el
// perfil. Aquí no se enseña ningún correo: de quien tuvo el error, el nombre.
//
// Una tabla de verdad a partir de 600 px. Por debajo, el mismo marcado se
// compone en tarjetas con CSS, para no duplicar el contenido en el DOM.

// Los roles de la tabla van escritos a mano, a propósito: por debajo de 600 px
// el CSS la pasa a `display: block` y los navegadores le quitan su semántica.
// Con los roles puestos, sigue siendo una tabla para quien la lee con un lector.
/* oxlint-disable jsx-a11y/no-redundant-roles, jsx-a11y/no-interactive-element-to-noninteractive-role */

import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { useAnnounce } from '@shared/hooks/announceContext';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { Field } from '@shared/ui/Field';
import { Pantalla } from '@shared/ui/Pantalla';

import {
  useActualizarErrores,
  useErrores,
  useEsAdministrador,
  useRecuento,
} from '../hooks/useErrores';
import {
  NOMBRES_DE_ORIGEN,
  ORIGENES,
  SIN_FILTROS,
  TAMANO_DE_PAGINA,
  origenDe,
  resumenDeMensaje,
} from '../model/consulta';

import styles from './RegistroDeErroresPage.module.css';

import type { ErrorRegistrado } from '../api/errorLogs';
import type { CursorDeErrores, FiltrosDeErrores, OrigenConocido } from '../model/consulta';

const FECHA = new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' });

function plural(cuantos: number): string {
  return cuantos === 1 ? '1 error' : `${cuantos} errores`;
}

function Detalle({ error }: { error: ErrorRegistrado }) {
  const datos = Object.entries(error.dispositivo);

  return (
    <details className={styles.detalle}>
      <summary className={styles.resumenDetalle}>Ver detalle</summary>
      <h3 className={styles.subtitulo}>Mensaje</h3>
      <p className={styles.mensaje}>{error.mensaje}</p>
      <h3 className={styles.subtitulo}>Traza</h3>
      {error.traza === null ? (
        <p>Sin traza.</p>
      ) : (
        // Con foco para poder desplazarla con el teclado (2.1.1).
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        <pre className={styles.traza} tabIndex={0}>
          {error.traza}
        </pre>
      )}
      <h3 className={styles.subtitulo}>Dispositivo</h3>
      {datos.length === 0 ? (
        <p>Sin datos del dispositivo.</p>
      ) : (
        <dl className={styles.dispositivo}>
          {datos.map(([nombre, valor]) => (
            <div key={nombre} className={styles.dato}>
              <dt>{nombre}</dt>
              <dd>{String(valor)}</dd>
            </div>
          ))}
        </dl>
      )}
    </details>
  );
}

interface FilasDeLaPaginaProps {
  filtros: FiltrosDeErrores;
  cursor: CursorDeErrores | null;
  /** La página se acaba de añadir con «Cargar más»: su primera fila recibe el foco. */
  enfocar: boolean;
}

function FilasDeLaPagina({ filtros, cursor, enfocar }: FilasDeLaPaginaProps) {
  const errores = useErrores(filtros, cursor);
  const refPrimera = useRef<HTMLTableRowElement>(null);
  const llegaron = errores.data !== undefined;

  // El botón que se pulsó sigue en su sitio, pero quien lo usa no sabe qué ha
  // llegado: el foco va a la primera fila nueva.
  useEffect(() => {
    if (enfocar && llegaron) {
      refPrimera.current?.focus();
    }
  }, [enfocar, llegaron]);

  if (errores.data === undefined) {
    return null;
  }

  return (
    <>
      {errores.data.filas.map((error, indice) => (
        <tbody key={error.id} className={styles.error} role="rowgroup">
          <tr
            ref={indice === 0 ? refPrimera : undefined}
            role="row"
            tabIndex={indice === 0 ? -1 : undefined}
          >
            <th scope="row" role="rowheader" data-etiqueta="Fecha">
              <time dateTime={error.createdAt}>{FECHA.format(new Date(error.createdAt))}</time>
            </th>
            <td role="cell" data-etiqueta="Origen">
              {NOMBRES_DE_ORIGEN[origenDe(error.mensaje)]}
            </td>
            <td role="cell" data-etiqueta="Ruta">
              {error.ruta ?? '—'}
            </td>
            <td role="cell" data-etiqueta="Mensaje">
              {resumenDeMensaje(error.mensaje)}
            </td>
            <td role="cell" data-etiqueta="Versión">
              {error.appVersion ?? '—'}
            </td>
            <td role="cell" data-etiqueta="Quién">
              {error.nombre ?? 'Otra persona'}
            </td>
          </tr>
          <tr className={styles.filaDetalle} role="row">
            <td role="cell" colSpan={6}>
              <Detalle error={error} />
            </td>
          </tr>
        </tbody>
      ))}
    </>
  );
}

export function RegistroDeErroresPage() {
  const [filtros, ponerFiltros] = useState<FiltrosDeErrores>(SIN_FILTROS);
  /** El cursor de cada página desde la segunda: la última fila de la anterior. */
  const [cursores, setCursores] = useState<readonly CursorDeErrores[]>([]);
  const anunciar = useAnnounce();
  const [rutaEscrita, setRutaEscrita] = useState('');
  const administrador = useEsAdministrador();
  const esAdministrador = administrador.data === true;
  const primera = useErrores(filtros, null, esAdministrador);
  const ultima = useErrores(filtros, cursores.at(-1) ?? null, esAdministrador);
  const ultimas24 = useRecuento(24, esAdministrador);
  const ultimos7 = useRecuento(24 * 7, esAdministrador);
  const actualizarErrores = useActualizarErrores();
  /** Sube con cada «Actualizar»: anuncia el resultado aunque la lista no haya cambiado. */
  const [actualizaciones, setActualizaciones] = useState(0);
  const actualizando = useRef(false);

  // Cambiar un filtro vuelve a la primera página.
  const setFiltros = (nuevos: FiltrosDeErrores) => {
    ponerFiltros(nuevos);
    setCursores([]);
  };
  const hayFiltros = filtros.origen !== 'todos' || filtros.ruta !== '' || filtros.soloHoy;

  const aplicarRuta = () => {
    const ruta = rutaEscrita.trim();

    if (ruta !== filtros.ruta) {
      setFiltros({ ...filtros, ruta });
    }
  };

  const actualizar = async () => {
    actualizando.current = true;
    // Las páginas siguientes se desmontan ANTES de invalidar: si siguieran
    // montadas, se volverían a pedir también y no se usarían.
    flushSync(() => {
      setCursores([]);
    });

    try {
      await actualizarErrores();
    } finally {
      actualizando.current = false;
      setActualizaciones((n) => n + 1);
    }
  };

  // Lo que da filtrar se anuncia: nadie ve la lista cambiar si no mira.
  const { data: datosDePrimera, isError: falloDePrimera } = primera;

  useEffect(() => {
    // Mientras se actualiza, lo anuncia `actualizar` al terminar, una sola vez.
    if (actualizando.current) {
      return;
    }

    if (falloDePrimera) {
      anunciar('No se pudieron cargar los errores. Vuelve a intentarlo.');
    } else if (datosDePrimera !== undefined) {
      anunciar(
        datosDePrimera.filas.length === 0
          ? hayFiltros
            ? 'Ningún error cumple esos filtros.'
            : 'No hay ningún error registrado.'
          : `${plural(datosDePrimera.filas.length)}${datosDePrimera.hayMas ? ' o más' : ''}`,
      );
    }
  }, [datosDePrimera, falloDePrimera, hayFiltros, anunciar, actualizaciones]);

  // El fallo de una página con cursor se anuncia: el botón sigue en su sitio y
  // quien lo usa no ve que nada ha llegado.
  const falloDeMas = cursores.length > 0 && ultima.isError;

  useEffect(() => {
    if (falloDeMas) {
      anunciar('No se pudieron cargar más errores. Vuelve a intentarlo.');
    }
  }, [falloDeMas, anunciar]);

  const cargarMas = () => {
    // Reintentar vuelve a pedir esa misma página, sin añadir otro cursor.
    if (falloDeMas) {
      if (!ultima.isFetching) {
        void ultima.refetch();
      }

      return;
    }

    const filas = ultima.data?.filas;
    const ultimaFila = filas === undefined ? undefined : filas.at(-1);

    if (ultima.isFetching || ultimaFila === undefined) {
      return;
    }

    setCursores([...cursores, { createdAt: ultimaFila.createdAt, id: ultimaFila.id }]);
  };

  let contenido;

  if (administrador.isPending) {
    contenido = <output>Cargando…</output>;
  } else if (administrador.isError) {
    contenido = (
      <p className={styles.fallo}>No se pudo comprobar tu cuenta. Vuelve a intentarlo.</p>
    );
  } else if (!esAdministrador) {
    contenido = <p>Tu cuenta no puede ver el registro de errores.</p>;
  } else {
    contenido = (
      <>
        <Card title="Resumen" headingLevel={2}>
          <p>
            {ultimas24.data === undefined ? '…' : plural(ultimas24.data)} en las últimas 24 horas
          </p>
          <p>{ultimos7.data === undefined ? '…' : plural(ultimos7.data)} en los últimos 7 días</p>
        </Card>

        <Card title="Filtros" headingLevel={2}>
          <form
            className={styles.filtros}
            onSubmit={(evento) => {
              evento.preventDefault();
              aplicarRuta();
            }}
          >
            <div className={styles.campo}>
              <label htmlFor="filtro-origen" className={styles.etiqueta}>
                Origen
              </label>
              <select
                id="filtro-origen"
                className={styles.selector}
                value={filtros.origen}
                onChange={(evento) => {
                  setFiltros({
                    ...filtros,
                    origen: evento.target.value as OrigenConocido | 'todos',
                  });
                }}
              >
                <option value="todos">Todos</option>
                {ORIGENES.map((origen) => (
                  <option key={origen} value={origen}>
                    {NOMBRES_DE_ORIGEN[origen]}
                  </option>
                ))}
              </select>
            </div>
            <Field
              label="La ruta contiene"
              type="search"
              value={rutaEscrita}
              onChange={(evento) => {
                setRutaEscrita(evento.target.value);
              }}
              onBlur={aplicarRuta}
            />
            <label className={styles.casilla}>
              <input
                type="checkbox"
                checked={filtros.soloHoy}
                onChange={(evento) => {
                  setFiltros({ ...filtros, soloHoy: evento.target.checked });
                }}
              />
              <span>Solo de hoy</span>
            </label>
            <div>
              <Button
                variant="secondary"
                onClick={() => {
                  void actualizar();
                }}
              >
                Actualizar
              </Button>
            </div>
          </form>
        </Card>

        {primera.isPending ? <output>Cargando errores…</output> : null}
        {primera.isError || ultima.isError ? (
          <p className={styles.fallo}>No se pudieron cargar los errores. Vuelve a intentarlo.</p>
        ) : null}

        {primera.isSuccess && primera.data.filas.length === 0 ? (
          <p>
            {hayFiltros ? 'Ningún error cumple esos filtros.' : 'No hay ningún error registrado.'}
          </p>
        ) : null}

        {primera.isSuccess && primera.data.filas.length > 0 ? (
          <div className={styles.envoltorio}>
            <table className={styles.tabla} role="table">
              <caption className={styles.caption}>
                Errores registrados, del más reciente al más antiguo
              </caption>
              <thead role="rowgroup">
                <tr role="row">
                  <th scope="col" role="columnheader">
                    Fecha
                  </th>
                  <th scope="col" role="columnheader">
                    Origen
                  </th>
                  <th scope="col" role="columnheader">
                    Ruta
                  </th>
                  <th scope="col" role="columnheader">
                    Mensaje
                  </th>
                  <th scope="col" role="columnheader">
                    Versión
                  </th>
                  <th scope="col" role="columnheader">
                    Quién
                  </th>
                </tr>
              </thead>
              {[null, ...cursores].map((cursor, pagina) => (
                <FilasDeLaPagina
                  key={`${JSON.stringify(filtros)}-${cursor?.id ?? 'primera'}`}
                  filtros={filtros}
                  cursor={cursor}
                  enfocar={pagina > 0 && pagina === cursores.length}
                />
              ))}
            </table>
          </div>
        ) : null}

        {ultima.data?.hayMas === true ||
        (cursores.length > 0 && (ultima.isPending || falloDeMas)) ? (
          <div>
            <Button
              variant="secondary"
              aria-disabled={ultima.isFetching || ultima.isPending}
              onClick={cargarMas}
            >
              {ultima.isFetching || ultima.isPending
                ? 'Cargando…'
                : falloDeMas
                  ? 'Reintentar'
                  : `Cargar ${TAMANO_DE_PAGINA} más`}
            </Button>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <Pantalla id="C02" titulo="Registro de errores">
      {contenido}
    </Pantalla>
  );
}
