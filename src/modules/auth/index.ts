// Contrato público del módulo `auth` (DOC 06 §3.2). Desde fuera solo se
// importa de aquí: lo que no salga por este archivo no existe para nadie más.

export { AuthCallbackPage } from './routes/AuthCallbackPage';
export { ForbiddenPage } from './routes/ForbiddenPage';
export { LoginPage } from './routes/LoginPage';
export { PersonasPage } from './routes/PersonasPage';

export { InvitacionesPendientes } from './components/InvitacionesPendientes';

export { authKeys } from './api/queryKeys';
export { fetchContextoDeAcceso, RUTA_VUELTA } from './api/session';

export {
  elegirEquipoActivo,
  leerEquipoRecordado,
  permisosDe,
  recordarEquipo,
} from './model/permissions';

export { AuthContext, useAuth, useHasPermission } from './hooks/authContext';

export type { ContextoDeAcceso, Profile } from './api/session';
export type { AppPermission, Membership, Team, TeamRole } from './model/permissions';
export type { AuthState } from './hooks/authContext';
