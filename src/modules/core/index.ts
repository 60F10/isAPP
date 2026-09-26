// Contrato público del módulo `core` (DOC 06 §3.2). Pantallas A02 a A06.

export { ClubPage } from './routes/ClubPage';
export { EquiposPage } from './routes/EquiposPage';
export { FichaJugadorPage } from './routes/FichaJugadorPage';
export { HomePage } from './routes/HomePage';
export { PlantillaPage } from './routes/PlantillaPage';

// Para `agenda`, que elige rival entre los equipos de referencia del club.
export { useClubActivo, useEquipos } from './hooks/useClubYEquipos';

export type { Club, Equipo, TipoDeEquipo } from './model/clubYEquipos';
export type { Disponibilidad, Inscripcion, Posicion } from './model/plantilla';
