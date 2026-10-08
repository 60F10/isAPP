// Contrato público del módulo `core` (DOC 06 §3.2). Pantallas A02 a A06 y «Mi equipo».

export { ClubPage } from './routes/ClubPage';
export { EquiposPage } from './routes/EquiposPage';
export { FichaJugadorPage } from './routes/FichaJugadorPage';
export { HomePage } from './routes/HomePage';
export { MiEquipoPage } from './routes/MiEquipoPage';
export { PlantillaPage } from './routes/PlantillaPage';

// Para `agenda`, que elige rival entre los equipos de referencia del club y
// propone el campo de casa del club en la A10 (T-203b).
export { useClub, useClubActivo, useEquipos } from './hooks/useClubYEquipos';

// Para `lineup`, que convoca sobre la plantilla del equipo (T-205), y para
// `training`, que pasa lista sobre ella con apodo y dorsal (T-229).
export { usePlantilla, usePlantillaDeLectura } from './hooks/usePlantilla';
export { DISPONIBILIDADES, POSICIONES } from './model/plantilla';

export type { Club, Equipo, TipoDeEquipo } from './model/clubYEquipos';
export type { Disponibilidad, Inscripcion, LecturaDePlantilla, Posicion } from './model/plantilla';
