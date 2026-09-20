// Pantalla A01b — Vuelta del acceso con Google
//
// No está en el inventario del DOC 02, y es a propósito: es una parada
// técnica de medio segundo, no una pantalla que nadie busque en un menú. Se
// le da el identificador A01b para dejarla atada a A01, que es de donde sale.
//
// Qué ocurre aquí: el cliente de Supabase canjea el código que Google deja en
// la dirección —`detectSessionInUrl`, en `shared/lib/supabase.ts`— y limpia la
// barra del navegador. `fetchSesionActual()` espera a ese canje, así que su
// respuesta ya es definitiva: o hay sesión, o el acceso se quedó por el
// camino.

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { Pantalla } from '@shared/ui/Pantalla';

import { recogerDestino } from '../api/session';
import { fetchSesionActual } from '../api/sesionActual';

const MENSAJE_FALLO = 'El acceso no llegó a completarse.';

/**
 * Motivo que Google o Supabase dejan en la dirección cuando algo falla.
 *
 * Se lee el código y JAMÁS `error_description`: ese texto lo compone quien
 * arma la dirección, así que pintarlo tal cual sería dejar que cualquiera que
 * mande un enlace escriba en esta pantalla. El código, además, se filtra
 * contra un patrón cerrado antes de enseñarlo.
 */
function codigoDeError(): string | null {
  const consulta = new URLSearchParams(window.location.search);
  const fragmento = new URLSearchParams(window.location.hash.replace('#', ''));
  const codigo = consulta.get('error') ?? fragmento.get('error');

  return codigo !== null && /^[a-z_]{1,40}$/.test(codigo) ? codigo : null;
}

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [fallo, setFallo] = useState<string | null>(null);

  useEffect(() => {
    let montado = true;

    void fetchSesionActual()
      .then((sesion) => {
        if (!montado) {
          return;
        }

        if (sesion === null) {
          setFallo(MENSAJE_FALLO);

          return;
        }

        // `replace` a propósito: sin él, el botón de atrás devolvería a esta
        // pantalla, que ya no tiene código que canjear y acabaría enseñando
        // un fallo que no ha ocurrido.
        const destino = recogerDestino();

        navigate(destino === null ? '/' : destino, { replace: true });
      })
      .catch(() => {
        if (montado) {
          setFallo(MENSAJE_FALLO);
        }
      });

    return () => {
      montado = false;
    };
  }, [navigate]);

  if (fallo === null) {
    return (
      <Pantalla id="A01b" titulo="Entrando">
        <p>Un momento, que se está comprobando el acceso con Google.</p>
      </Pantalla>
    );
  }

  const codigo = codigoDeError();

  return (
    <Pantalla id="A01b" titulo="No se pudo entrar">
      {/* Misma salvedad que en A01: la región viva buena vive en `app/` y un
          módulo no puede importar de ahí (DOC 06 §4.1, regla 1). */}
      <p role="alert">{fallo}</p>
      {codigo === null ? null : <p>Google contestó «{codigo}».</p>}
      <p>
        <Link to="/login">Volver a la pantalla de acceso</Link>
      </p>
    </Pantalla>
  );
}
