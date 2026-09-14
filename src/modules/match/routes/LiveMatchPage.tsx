// Pantalla A12 — Partido en directo

import { Link } from 'react-router';

import { Pantalla } from '@shared/ui/Pantalla';

export function LiveMatchPage() {
  return (
    <Pantalla id="A12" titulo="Partido en directo">
      <p>
        El panel de registro se construye en la T-207 y la T-208. De momento esta pantalla reserva
        su sitio: el marco a pantalla completa, sin barra ni rail, y su propia salida.
      </p>
      <p>
        {/* Salir del directo es una acción explícita de la pantalla, nunca un
            gesto ni un destino de la navegación (DOC 02 §3.1). */}
        <Link to="/calendario">Salir del partido</Link>
      </p>
    </Pantalla>
  );
}
