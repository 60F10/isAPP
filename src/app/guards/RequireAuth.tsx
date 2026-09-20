// Guardia de sesión (DOC 06 §7).
//
// Sin sesión no se pinta nada de dentro. Igual que `RequirePermission`, esto
// es experiencia de uso, no seguridad: quien de verdad impide leer un dato es
// la RLS del DOC 05, que no se entera de si hay un componente delante.

import { Navigate, Outlet, useLocation } from 'react-router';

import { LoadingState } from '@app/components/LoadingState';
// Ruta directa y NO el barril `@modules/auth`: esta guardia se importa de
// forma estática desde `router.tsx`, que también carga ese barril en
// perezoso para las pantallas de `auth`. Con el barril aquí, el empaquetador
// avisaría INEFFECTIVE_DYNAMIC_IMPORT y esas pantallas caerían al arranque
// (DOC 06 §4.1, regla 1 y DOC 13, hallazgo 3).
import { useAuth } from '@modules/auth/hooks/authContext';

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
