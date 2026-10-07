// Pantalla «Mi equipo» (T-304, DOC 02 §3.1): el equipo activo con su plantilla
// en solo lectura. Es el destino «Equipo» de la barra.
//
// SIN GUARDIA DE PERMISO. La ve quien tiene función en el equipo y quien solo
// lo sigue; la base ya deja leer `squad_memberships` con `can_read_team` y
// `players` siendo del club o siguiendo al equipo. Quien además puede gestionar
// algo encuentra aquí los enlaces a las pantallas que sí piden permiso.
//
// EL EQUIPO SALE DEL CONTEXTO DE ACCESO, no de una consulta: nombre y
// categoría ya vienen en la membresía. Solo la plantilla se pide, y sin
// `availability`, que esta pantalla no enseña.
//
// De los jugadores, solo apodo, dorsal y posición.
//
// SI EL CONTEXTO DE ACCESO FALLA, LO DICE ESTA PANTALLA (T-305). Al no tener
// guardia, `RequirePermission` no le pinta el fallo, y `core` no importa de
// `app/`: el aviso y su «Reintentar» se escriben aquí.

/* oxlint-disable jsx-a11y/no-redundant-roles, jsx-a11y/no-interactive-element-to-noninteractive-role */
// Los `role` de la tabla son redundantes a propósito: con `display: block` en
// pantallas estrechas el navegador pierde la semántica de tabla, y el rol
// explícito la mantiene (mismo caso que el registro de errores, C02).

import { Link } from 'react-router';

import { useAuth, useHasPermission } from '@modules/auth';
import { useAnnounce } from '@shared/hooks/announceContext';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { Pantalla } from '@shared/ui/Pantalla';

import { Cargando, ErrorDeCarga } from '../components/EstadoDeCarga';
import { usePlantillaDeLectura } from '../hooks/usePlantilla';
import { POSICIONES } from '../model/plantilla';

import styles from './MiEquipoPage.module.css';

import type { LecturaDePlantilla } from '../model/plantilla';

const SIN_DATO = '—';

/**
 * Dato que falta: la raya para quien mira y el texto para quien escucha
 * (T-305). Un lector lee la raya «raya» o no la lee, y la celda quedaba vacía.
 */
function SinDato({ texto }: { texto: string }) {
  return (
    <>
      <span aria-hidden="true">{SIN_DATO}</span>
      <span className={styles.oculto}>{texto}</span>
    </>
  );
}

function Tabla({
  nombreDelEquipo,
  plantilla,
}: {
  nombreDelEquipo: string;
  plantilla: readonly LecturaDePlantilla[];
}) {
  return (
    // Los `role` explícitos mantienen la semántica de tabla cuando, por debajo
    // de 600 px, el CSS compone cada fila como una tarjeta con `display: block`
    // (mismo patrón que el registro de errores, C02).
    <table className={styles.tabla} role="table">
      <caption className={styles.caption}>Plantilla de {nombreDelEquipo}</caption>
      <thead role="rowgroup">
        <tr role="row">
          <th scope="col" role="columnheader">
            Dorsal
          </th>
          <th scope="col" role="columnheader">
            Apodo
          </th>
          <th scope="col" role="columnheader">
            Posición
          </th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        {plantilla.map((jugador) => (
          <tr key={jugador.playerId} role="row" className={styles.fila}>
            <td role="cell" data-etiqueta="Dorsal">
              {jugador.shirtNumber === null ? <SinDato texto="Sin dorsal" /> : jugador.shirtNumber}
            </td>
            <th scope="row" role="rowheader" data-etiqueta="Apodo">
              {jugador.nickname}
            </th>
            <td role="cell" data-etiqueta="Posición">
              {jugador.defaultPosition === null ? (
                <SinDato texto="Sin posición" />
              ) : (
                POSICIONES[jugador.defaultPosition]
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function MiEquipoPage() {
  const { teams, activeTeamId, activeSeasonId, errorContexto, reintentarContexto } = useAuth();
  const anunciar = useAnnounce();
  const puedeEditarPlantilla = useHasPermission('roster.manage');
  const puedeGestionarPersonas = useHasPermission('members.manage');
  const puedeGestionarClub = useHasPermission('team.manage');

  const membresia =
    teams === null ? undefined : teams.find((candidata) => candidata.team.id === activeTeamId);
  const equipo = membresia === undefined ? null : membresia.team;

  const plantilla = usePlantillaDeLectura(equipo === null ? null : equipo.id, activeSeasonId);

  if (teams === null && errorContexto !== null) {
    return (
      // La `key` hace que `Pantalla` se monte de nuevo al entrar y al salir del
      // fallo. Cuando el reintento sale bien, el botón desaparece con el foco
      // puesto (2.4.3): así pasa al título, que ya es el nombre del equipo.
      <Pantalla key="sin-acceso" id="A02b" titulo="Mi equipo">
        <div className={styles.fallo}>
          <p>No se pudo cargar tu acceso.</p>
          <div>
            <Button
              variant="primary"
              onClick={() => {
                anunciar('Reintentando');
                reintentarContexto();
              }}
            >
              Reintentar
            </Button>
          </div>
        </div>
      </Pantalla>
    );
  }

  if (teams === null) {
    return (
      <Pantalla id="A02b" titulo="Mi equipo">
        <Cargando />
      </Pantalla>
    );
  }

  if (membresia === undefined || equipo === null) {
    return (
      <Pantalla id="A02b" titulo="Mi equipo">
        <p>Todavía no tienes equipo.</p>
        <p>
          <Link className={styles.enlace} to="/unirse">
            Unirse a un equipo
          </Link>
        </p>
      </Pantalla>
    );
  }

  const enlaces: { to: string; texto: string }[] = [];

  if (puedeEditarPlantilla === true) {
    enlaces.push({ to: `/equipos/${equipo.id}/plantilla`, texto: 'Editar la plantilla' });
  }

  if (puedeGestionarPersonas === true) {
    enlaces.push({ to: `/equipos/${equipo.id}/personas`, texto: 'Personas y permisos' });
  }

  if (puedeGestionarClub === true) {
    enlaces.push({ to: '/club', texto: 'Club' }, { to: '/equipos', texto: 'Equipos del club' });
  }

  const contenidoDeLaPlantilla = () => {
    if (activeSeasonId === null) {
      return <p>No hay temporada en curso.</p>;
    }

    if (plantilla.isPending) {
      return <Cargando />;
    }

    if (plantilla.isError) {
      return (
        <ErrorDeCarga
          que="la plantilla"
          onReintentar={() => {
            void plantilla.refetch();
          }}
        />
      );
    }

    if (plantilla.data.length === 0) {
      return <p>Todavía no hay jugadores en la plantilla.</p>;
    }

    return <Tabla nombreDelEquipo={equipo.name} plantilla={plantilla.data} />;
  };

  return (
    <Pantalla id="A02b" titulo={equipo.name}>
      {equipo.category === null ? null : <p className={styles.categoria}>{equipo.category}</p>}
      {membresia.seguidor === true ? (
        <p>Sigues a este equipo: puedes verlo, no cambiarlo.</p>
      ) : null}

      <Card title="Plantilla" headingLevel={2}>
        {contenidoDeLaPlantilla()}
      </Card>

      {enlaces.length === 0 ? null : (
        <Card title="Gestión" headingLevel={2}>
          <ul className={styles.enlaces}>
            {enlaces.map((enlace) => (
              <li key={enlace.to}>
                <Link className={styles.acceso} to={enlace.to}>
                  {enlace.texto}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </Pantalla>
  );
}
