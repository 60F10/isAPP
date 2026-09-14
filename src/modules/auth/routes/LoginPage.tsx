// Pantalla A01 — Acceso

import { Pantalla } from '@shared/ui/Pantalla';

export function LoginPage() {
  return (
    <Pantalla id="A01" titulo="Entrar">
      <p>
        El acceso con la cuenta de Google llega en la T-105. Hasta entonces esta pantalla no hace
        nada: no hay formulario porque no hay nada detrás que lo atienda, y un botón que no funciona
        solo sirve para que alguien piense que la aplicación está rota.
      </p>
    </Pantalla>
  );
}
