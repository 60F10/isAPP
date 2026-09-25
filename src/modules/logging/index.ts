// Contrato público del módulo `logging` (DOC 06 §3.2). Pantallas C02 y C03.
//
// `app/` importa estas piezas por ruta directa y no por aquí, igual que hace
// con `auth`: el día que la C02 (T-303) entre en perezoso por este barril, una
// importación estática del barril desde `app/` la tiraría al paquete inicial.

export { ErrorBoundary } from './components/ErrorBoundary';
export { PantallaError } from './components/PantallaError';

export { fijarClubDeRegistro, instalarCapturaGlobal, registrarError } from './api/registro';

export type { OrigenDeError } from './model/errorLog';
