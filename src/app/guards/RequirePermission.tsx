// Guardia de permiso (DOC 06 §7).
//
// ATENCIÓN, que esto se malinterpreta solo: el frontend ESCONDE lo que no se
// puede hacer, NO lo impide. Quien decide es la RLS del DOC 05. Cualquiera
// puede saltarse esta guardia escribiendo la dirección a mano o tocando el
// estado desde la consola, y lo único que se va a encontrar es una pantalla
// que no devuelve ni una fila. Esta guardia existe para no enseñar botones que
// van a fallar, no como medida de seguridad. Nunca se le pone aquí una regla
// que no esté también en una política de la base de datos.

import { Navigate, Outlet } from 'react-router';

import { ErrorDeAcceso } from '@app/components/ErrorDeAcceso';
import { LoadingState } from '@app/components/LoadingState';
// Ruta directa y NO el barril `@modules/auth`: misma razón que en
// `RequireAuth` (DOC 06 §4.1, regla 1 y DOC 13, hallazgo 3).
import { useAuth, useHasPermission } from '@modules/auth/hooks/authContext';

interface RequirePermissionProps {
  /** Permiso del DOC 05 §4, por ejemplo `roster.manage`. */
  permission: string;
}

export function RequirePermission({ permission }: RequirePermissionProps) {
  const permitido = useHasPermission(permission);
  const { errorContexto } = useAuth();

  // `undefined` es «todavía no se sabe». Tratarlo como un «no» mandaría al
  // 403 a quien sí tiene el permiso, cada vez que recarga la página.
  if (permitido === undefined) {
    // Pero si no se sabe porque la consulta falló, esperar es esperar para
    // siempre (T-106). Tampoco es un «no»: es un «no se pudo preguntar».
    return errorContexto === null ? <LoadingState /> : <ErrorDeAcceso />;
  }

  if (!permitido) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
