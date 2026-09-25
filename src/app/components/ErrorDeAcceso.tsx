// Fallo al leer el contexto de acceso (T-106, DOC 06 §10.1, capa 2).
//
// Cierra el `errorContexto` que la T-105 dejó sin pintar. Sin esta pantalla,
// si la consulta de perfil, equipos y permisos fallaba, las rutas guardadas se
// quedaban en «Cargando…» para siempre: `permisos` sigue en `null`, que es
// «todavía no se sabe», y la guardia esperaba a una respuesta que no llega.
//
// Sale dentro de la maqueta, que ya pone el `<main>`. No es la C03 de pantalla
// completa: la navegación sigue a mano y el inicio, que no pide permisos,
// sigue abriendo.

// Ruta directa y no el barril: ver `RequireAuth`.
import { useAuth } from '@modules/auth/hooks/authContext';
import { useAnnounce } from '@shared/hooks/announceContext';
import { Button } from '@shared/ui/Button';
import { Pantalla } from '@shared/ui/Pantalla';

import styles from './ErrorDeAcceso.module.css';

export function ErrorDeAcceso() {
  const { reintentarContexto } = useAuth();
  const anunciar = useAnnounce();

  return (
    <Pantalla id="C03" titulo="No se pudo cargar tu acceso">
      <p className={styles.texto}>
        No ha llegado la lista de tus equipos y permisos, así que esta pantalla no sabe si puedes
        entrar. Suele ser falta de cobertura.
      </p>
      <div>
        <Button
          variant="primary"
          onClick={() => {
            anunciar('Reintentando');
            reintentarContexto();
          }}
        >
          Reintentar
        </Button>
      </div>
    </Pantalla>
  );
}
