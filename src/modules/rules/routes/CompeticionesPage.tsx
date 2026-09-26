// Pantalla A08 — Competiciones (T-203, E3-01).
//
// Las competiciones del club en la temporada en curso y el alta de una nueva.
//
// LA CATEGORÍA VA EN EL NOMBRE. `competitions` solo tiene `name` y `kind`: no
// hay columnas de categoría, nivel, ámbito ni grupo. Hasta que las haya (DOC
// 13), el nombre se escribe como lo llama la federación —«Cadete Primera
// Tenerife G2»— y la temporada no se repite en él: la competición ya
// pertenece a una.
//
// Una competición nueva nace con el reglamento del cadete, que Isaac confirmó
// el 26/09/2026, y se ajusta en su ficha. Es el único equipo que hay; nacer
// con los 45 minutos por defecto de la base obligaría a cambiarlo siempre.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { useAnnounce } from '@shared/hooks/announceContext';
import { mensajeDeErrorAlGuardar } from '@shared/lib/guardado';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { Field } from '@shared/ui/Field';
import { GrupoDeOpciones } from '@shared/ui/GrupoDeOpciones';
import { Pantalla } from '@shared/ui/Pantalla';

import {
  useClubYTemporada,
  useCompeticiones,
  useCrearCompeticion,
} from '../hooks/useCompeticiones';
import {
  aFormulario,
  LARGO_NOMBRE_COMPETICION,
  NOMBRES_DE_TIPO,
  REGLAMENTO_CADETE,
  resumenDelReglamento,
  validarCompeticion,
} from '../model/competicion';

import formulario from '../components/Formulario.module.css';
import styles from './CompeticionesPage.module.css';

import type { Competicion, TipoDeCompeticion } from '../model/competicion';

const TIPOS: readonly { valor: TipoDeCompeticion; etiqueta: string }[] = [
  { valor: 'league', etiqueta: NOMBRES_DE_TIPO.league },
  { valor: 'cup', etiqueta: NOMBRES_DE_TIPO.cup },
  { valor: 'friendly', etiqueta: NOMBRES_DE_TIPO.friendly },
];

interface NuevaCompeticionProps {
  clubId: string;
  temporadaId: string;
  existentes: readonly Competicion[];
}

function NuevaCompeticion({ clubId, temporadaId, existentes }: NuevaCompeticionProps) {
  const anunciar = useAnnounce();
  const navigate = useNavigate();
  const crear = useCrearCompeticion(clubId, temporadaId);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoDeCompeticion>('league');
  const [error, setError] = useState<string | undefined>(undefined);
  const [falloAlGuardar, setFalloAlGuardar] = useState<string | null>(null);

  return (
    <form
      className={formulario.formulario}
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault();
        setFalloAlGuardar(null);

        const resultado = validarCompeticion(
          { ...aFormulario({ ...REGLAMENTO_CADETE, name: nombre, kind: tipo }) },
          existentes,
        );
        setError(resultado.errores.name);

        if (resultado.valores === null) {
          anunciar('Revisa los campos marcados');
          return;
        }

        crear.mutate(resultado.valores, {
          onSuccess: (creada) => {
            anunciar(`${creada.name} creada. Revisa su reglamento`);
            void navigate(`/competiciones/${creada.id}`);
          },
          onError: (fallo) => {
            const mensaje = mensajeDeErrorAlGuardar(fallo);
            setFalloAlGuardar(mensaje);
            anunciar(mensaje);
          },
        });
      }}
    >
      <Field
        label="Nombre"
        hint="Categoría, nivel, ámbito y grupo, como la llama la federación: «Cadete Primera Tenerife G2». La temporada no hace falta, va aparte."
        required
        maxLength={LARGO_NOMBRE_COMPETICION}
        autoComplete="off"
        value={nombre}
        error={error}
        onChange={(evento) => {
          setNombre(evento.target.value);
        }}
      />
      <GrupoDeOpciones leyenda="Tipo" opciones={TIPOS} valor={tipo} alCambiar={setTipo} />
      <p className={formulario.nota}>
        Empieza con el reglamento del cadete: {resumenDelReglamento(REGLAMENTO_CADETE)}. Se cambia
        después en su ficha.
      </p>

      {falloAlGuardar === null ? null : <p className={formulario.fallo}>{falloAlGuardar}</p>}

      <div>
        <Button type="submit" variant="primary" iconStart="plus" disabled={crear.isPending}>
          {crear.isPending ? 'Creando…' : 'Crear competición'}
        </Button>
      </div>
    </form>
  );
}

export function CompeticionesPage() {
  const { clubId, temporadaId } = useClubYTemporada();
  const competiciones = useCompeticiones(clubId, temporadaId);

  const contenido = () => {
    if (clubId === null) {
      return (
        <p className={formulario.nota}>
          No hay equipo activo, así que no se sabe de qué club se trata.
        </p>
      );
    }

    if (temporadaId === null) {
      return (
        <p className={formulario.nota}>
          El club no tiene ninguna temporada en curso, y las competiciones van por temporada.
        </p>
      );
    }

    if (competiciones.isPending) {
      return <p className={formulario.nota}>Cargando…</p>;
    }

    if (competiciones.isError) {
      return (
        <div className={formulario.bloque}>
          <p className={formulario.nota}>
            No se han podido cargar las competiciones. Suele ser falta de cobertura.
          </p>
          <div>
            <Button
              variant="secondary"
              onClick={() => {
                void competiciones.refetch();
              }}
            >
              Reintentar
            </Button>
          </div>
        </div>
      );
    }

    return (
      <>
        <Card title="Esta temporada" headingLevel={2}>
          {competiciones.data.length === 0 ? (
            <p className={formulario.nota}>
              Todavía no hay competiciones. Crea la liga del equipo con el formulario de abajo.
            </p>
          ) : (
            <ul className={styles.lista}>
              {competiciones.data.map((competicion) => (
                <li key={competicion.id} className={styles.fila}>
                  <Link className={styles.nombre} to={`/competiciones/${competicion.id}`}>
                    {competicion.name}
                  </Link>
                  <span className={styles.resumen}>
                    {NOMBRES_DE_TIPO[competicion.kind]} · {resumenDelReglamento(competicion)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Crear competición" headingLevel={2}>
          <NuevaCompeticion
            clubId={clubId}
            temporadaId={temporadaId}
            existentes={competiciones.data}
          />
        </Card>
      </>
    );
  };

  return (
    <Pantalla id="A08" titulo="Competiciones">
      {contenido()}
    </Pantalla>
  );
}
