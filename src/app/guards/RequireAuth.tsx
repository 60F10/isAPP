// Guardia de sesión (DOC 06 §7).
//
// Sin sesión no se pinta nada de dentro. Igual que `RequirePermission`, esto
// es experiencia de uso, no seguridad: quien de verdad impide leer un dato es
// la RLS del DOC 05, que no se entera de si hay un componente delante.

import { Navigate, Outlet, useLocation } from 'react-router';

import { LoadingState } from '@app/components/LoadingState';
import { useAuth } from '@app/providers/authContext';

export function RequireAuth() {
  const { session, cargando } = useAuth();
  const location = useLocation();

  if (cargando) {
    return <LoadingState />;
  }

  if (session === null) {
    // `desde` deja apuntado a dónde iba, para devolverlo ahí después de
    // entrar. Quien lo recoge es la T-105.
    return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  }

  return <Outlet />;
}
