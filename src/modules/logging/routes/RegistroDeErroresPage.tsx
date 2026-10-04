// Pantalla C02 — Registro de errores (T-303, DOC 02 §2).
//
// Solo lo lee el administrador de plataforma: lo decide la política
// `error_logs_select`. Quien no lo es recibiría cero filas, que no se
// distingue de «no hay errores», así que la frase de la cuenta la decide el
// perfil. Aquí no se enseña ningún correo: de quien tuvo el error, el nombre.
//
// Una tabla de verdad a partir de 600 px. Por debajo, el mismo marcado se
// compone en tarjetas con CSS, para no duplicar el contenido en el DOM.

import { useState } from 'react';

import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { Field } from '@shared/ui/Field';
import { Pantalla } from '@shared/ui/Pantalla';

import { useErrores, useEsAdministrador, useRecuento } from '../hooks/useErrores';
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
import type { FiltrosDeErrores, OrigenConocido } from '../model/consulta';

const FECHA = new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' });

function plural(cuantos: number): string {
  return cuantos === 1 ? '1 error' : `${cuantos} errores`;
}

function Detalle({ error }: { error: ErrorRegistrado }) {
  const datos = Object.entries(error.dispositivo);

  return (
    <details className={styles.detalle}>
      <summary className={styles.resumenDetalle}>Ver detalle</summary>
      <h4 className={styles.subtitulo}>Mensaje</h4>
      <p className={styles.mensaje}>{error.mensaje}</p>
      <h4 className={styles.subtitulo}>Traza</h4>
      {error.traza === null ? (
        <p>Sin traza.</p>
      ) : (
        // Con foco para poder desplazarla con el teclado (2.1.1).
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        <pre className={styles.traza} tabIndex={0}>
          {error.traza}
        </pre>
      )}
      <h4 className={styles.subtitulo}>Dispositivo</h4>
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

function FilasDeLaPagina({ filtros, pagina }: { filtros: FiltrosDeErrores; pagina: number }) {
  const errores = useErrores(filtros, pagina);

  if (errores.data === undefined) {
    return null;
  }

  return (
    <>
      {errores.data.filas.map((error) => (
        <tbody key={error.id} className={styles.error}>
          <tr>
            <th scope="row" data-etiqueta="Fecha">
              <time dateTime={error.createdAt}>{FECHA.format(new Date(error.createdAt))}</time>
            </th>
            <td data-etiqueta="Origen">{NOMBRES_DE_ORIGEN[origenDe(error.mensaje)]}</td>
            <td data-etiqueta="Ruta">{error.ruta ?? '—'}</td>
            <td data-etiqueta="Mensaje">{resumenDeMensaje(error.mensaje)}</td>
            <td data-etiqueta="Versión">{error.appVersion ?? '—'}</td>
            <td data-etiqueta="Quién">{error.nombre ?? 'Otra persona'}</td>
          </tr>
          <tr className={styles.filaDetalle}>
            <td colSpan={6}>
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
  const [paginas, setPaginas] = useState(1);
  const [rutaEscrita, setRutaEscrita] = useState('');
  const administrador = useEsAdministrador();
  const esAdministrador = administrador.data === true;
  const primera = useErrores(filtros, 0, esAdministrador);
  const ultima = useErrores(filtros, paginas - 1, esAdministrador);
  const ultimas24 = useRecuento(24, esAdministrador);
  const ultimos7 = useRecuento(24 * 7, esAdministrador);

  // Cambiar un filtro vuelve a la primera página.
  const setFiltros = (nuevos: FiltrosDeErrores) => {
    ponerFiltros(nuevos);
    setPaginas(1);
  };
  const hayFiltros = filtros.origen !== 'todos' || filtros.ruta !== '' || filtros.soloHoy;

  const aplicarRuta = () => {
    const ruta = rutaEscrita.trim();

    if (ruta !== filtros.ruta) {
      setFiltros({ ...filtros, ruta });
    }
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
            <table className={styles.tabla}>
              <caption className={styles.caption}>
                Errores registrados, del más reciente al más antiguo
              </caption>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Origen</th>
                  <th scope="col">Ruta</th>
                  <th scope="col">Mensaje</th>
                  <th scope="col">Versión</th>
                  <th scope="col">Quién</th>
                </tr>
              </thead>
              {Array.from({ length: paginas }, (_, pagina) => (
                <FilasDeLaPagina
                  key={`${JSON.stringify(filtros)}-${pagina}`}
                  filtros={filtros}
                  pagina={pagina}
                />
              ))}
            </table>
          </div>
        ) : null}

        {ultima.data?.hayMas === true ? (
          <div>
            <Button
              variant="secondary"
              disabled={ultima.isFetching}
              onClick={() => {
                setPaginas(paginas + 1);
              }}
            >
              {ultima.isFetching ? 'Cargando…' : `Cargar ${TAMANO_DE_PAGINA} más`}
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
