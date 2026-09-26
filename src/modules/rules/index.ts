// Contrato público del módulo `rules` (DOC 06 §3.2). Pantalla A08.
//
// El directo (T-207) leerá de aquí el reglamento de cada partido: por eso el
// modelo sale por este archivo y no solo las pantallas.

export { CompeticionesPage } from './routes/CompeticionesPage';
export { CompeticionPage } from './routes/CompeticionPage';

export {
  duracionDeJuego,
  NOMBRES_DE_EVENTO,
  REGLAMENTO_CADETE,
  TIPOS_DEL_MVP,
} from './model/competicion';

export type {
  Competicion,
  ModoDeReloj,
  Reglamento,
  TipoDeCambios,
  TipoDeCompeticion,
  TipoDeEvento,
} from './model/competicion';
