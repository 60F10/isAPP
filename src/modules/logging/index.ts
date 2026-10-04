// Contrato público del módulo `logging` (DOC 06 §3.2). Pantallas C02 y C03.
//
// `app/` importa estas piezas por ruta directa y no por aquí, igual que hace
// con `auth`: la C02 (T-303) entra en perezoso por este barril, y una
// importación estática del barril desde `app/` la tiraría al paquete inicial.

export { ErrorBoundary } from './components/ErrorBoundary';
export { PantallaError } from './components/PantallaError';
export { RegistroDeErroresPage } from './routes/RegistroDeErroresPage';

export { fijarClubDeRegistro, instalarCapturaGlobal, registrarError } from './api/registro';

export type { OrigenDeError } from './model/errorLog';
