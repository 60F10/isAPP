// Pantalla A01 — Acceso

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';

import { useAnnounce } from '@shared/hooks/announceContext';
import { Button } from '@shared/ui/Button';
import { Pantalla } from '@shared/ui/Pantalla';

import { signInWithGoogle } from '../api/session';

/** Ruta a la que volver si nadie dijo a dónde iba. */
const DESTINO_POR_DEFECTO = '/';

function destinoDe(estado: unknown): string {
  if (typeof estado === 'object' && estado !== null && 'desde' in estado) {
    const { desde } = estado as { desde: unknown };

    // Solo rutas de esta aplicación. Una dirección completa aquí sería un
    // redirector abierto: cualquiera podría mandar un enlace que, tras
    // entrar, deja al usuario en una página de fuera con pinta de ser esta.
    if (typeof desde === 'string' && desde.startsWith('/') && !desde.startsWith('//')) {
      return desde;
    }
  }

  return DESTINO_POR_DEFECTO;
}

export function LoginPage() {
  const location = useLocation();
  const anunciar = useAnnounce();
  const [entrando, setEntrando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  // El texto se pinta como párrafo normal; quien lo anuncia es la región viva
  // única de la aplicación (DOC 06 §6.3), no un `role="alert"` propio.
  useEffect(() => {
    if (fallo !== null) {
      anunciar(fallo);
    }
  }, [fallo, anunciar]);

  async function entrar() {
    setEntrando(true);
    setFallo(null);

    try {
      await signInWithGoogle(destinoDe(location.state));
      // Si todo va bien, el navegador ya se ha ido a Google y nada de lo que
      // se escriba a partir de aquí llega a pintarse.
    } catch {
      setEntrando(false);
      setFallo('No se ha podido conectar con Google. Comprueba la conexión e inténtalo otra vez.');
    }
  }

  return (
    <Pantalla id="A01" titulo="Entrar">
      <p>
        Entra con la misma cuenta de Google con la que te invitaron al equipo. La aplicación pide tu
        nombre, tu correo y tu foto de perfil, y nada más.
      </p>

      <Button fullWidth disabled={entrando} onClick={() => void entrar()}>
        {entrando ? 'Conectando con Google…' : 'Entrar con Google'}
      </Button>

      {fallo === null ? null : <p>{fallo}</p>}
    </Pantalla>
  );
}
