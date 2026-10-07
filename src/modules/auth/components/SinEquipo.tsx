// Tarjeta de Inicio para quien no tiene función en ningún equipo (T-301c).
//
// Dos casos, y en los demás no pinta nada:
//
//  - SIN NINGÚN EQUIPO. Quien entra con Google sin equipo ni invitación veía
//    una aplicación vacía. Aquí se le dice a dónde ir: «Unirse a un equipo».
//  - EL EQUIPO ACTIVO ES UNO QUE SOLO SIGUE. Ve el próximo partido y el
//    calendario, y nada más. Las estadísticas, que es lo que un seguidor viene
//    a mirar, son del bloque B y llegan después de la liga: se le dice, para
//    que no las busque.
//
// Mientras el contexto de acceso no contesta (`teams` a `null`) no pinta nada:
// es un aviso, y enseñarlo un instante a quien sí tiene equipo sería mentirle.

import { Link } from 'react-router';

import { Card } from '@shared/ui/Card';

import { useAuth } from '../hooks/authContext';

export function SinEquipo() {
  const { teams, activeTeamId } = useAuth();

  if (teams === null) {
    return null;
  }

  if (teams.length === 0) {
    return (
      <Card title="¿Buscas tu equipo?" headingLevel={2}>
        <p>
          Todavía no estás en ningún equipo. Si el tuyo está en la lista, puedes seguirlo ahora
          mismo y ver su calendario, o pedir permisos para anotar.
        </p>
        <p>
          <Link to="/unirse">Unirse a un equipo</Link>
        </p>
      </Card>
    );
  }

  const activa = teams.find((membresia) => membresia.team.id === activeTeamId);

  if (activa === undefined || activa.seguidor !== true) {
    return null;
  }

  return (
    <Card title="Equipo que sigues" headingLevel={2}>
      <p>Sigues a {activa.team.name}. Las estadísticas llegarán más adelante.</p>
      <p>
        Ves su calendario y su próximo partido. Si quieres anotar, puedes pedir permisos desde{' '}
        <Link to="/unirse">Unirse a un equipo</Link>.
      </p>
    </Card>
  );
}
