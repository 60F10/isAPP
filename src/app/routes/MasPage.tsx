// Pantalla «Más» (T-304, DOC 02 §3.1): un índice con lo que no cabe en la
// barra. Es el destino «Más».
//
// Vive en `app/` como Ajustes, y es perezosa por ruta directa por lo mismo.
// Sin guardia de permiso: el enlace sale según el permiso, pero la pantalla
// la ve cualquiera con sesión. Las rutas de destino conservan sus guardias.
//
// `useHasPermission` devuelve `undefined` mientras los permisos cargan: un
// enlace solo sale con `true`.

import { Link } from 'react-router';

// Rutas directas y no el barril: ver `AuthProvider`.
import { useAuth, useHasPermission } from '@modules/auth/hooks/authContext';
import { Pantalla } from '@shared/ui/Pantalla';

import styles from './MasPage.module.css';

export function MasPage() {
  const { profile } = useAuth();
  const puedeAportar = useHasPermission('match.live.write');

  return (
    <Pantalla id="C06" titulo="Más">
      <ul className={styles.enlaces}>
        {puedeAportar === true ? (
          <li>
            <Link className={styles.acceso} to="/mis-aportaciones">
              Mis aportaciones
            </Link>
          </li>
        ) : null}
        <li>
          <Link className={styles.acceso} to="/ajustes">
            Ajustes
          </Link>
        </li>
        {profile?.is_platform_admin === true ? (
          <li>
            <Link className={styles.acceso} to="/admin/logs">
              Registro de errores
            </Link>
          </li>
        ) : null}
      </ul>
    </Pantalla>
  );
}
