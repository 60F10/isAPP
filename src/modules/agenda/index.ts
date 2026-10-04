// Contrato público del módulo `agenda` (DOC 06 §3.2). Pantallas A09 y A10, y
// la A02 de `core` con el próximo partido dentro (T-213, D06-34).

export { CalendarioPage } from './routes/CalendarioPage';
export { InicioPage } from './routes/InicioPage';
export { EditarPartidoPage, NuevoPartidoPage } from './routes/PartidoPage';

// Para `lineup`, que convoca sobre un partido y lo pasa a convocado (T-205).
export { marcarComoConvocado } from './api/partidos';
export { agendaKeys } from './api/queryKeys';
export { usePartido } from './hooks/usePartidos';
export { enfrentamiento, NOMBRES_DE_ESTADO, tieneDirecto } from './model/partido';

export type { EstadoDePartido, Partido } from './model/partido';
