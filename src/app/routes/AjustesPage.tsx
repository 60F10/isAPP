// Pantalla C01 — Ajustes (T-107, DOC 02 §2 y §5.2).
//
// Tres cosas: alto contraste, movimiento reducido y cerrar sesión.
//
// Vive en `app/` y no en un módulo porque es del ámbito `platform`, que no
// tiene carpeta en `modules/` (DOC 06 §3.3). Entra en perezoso desde el
// enrutador: nadie la necesita para arrancar.
//
// LOS INTERRUPTORES SON CASILLAS NATIVAS. Una casilla ya trae nombre, estado y
// teclado, y el cambio se dispara al soltar, que es lo que pide el criterio
// 2.5.2. Un interruptor dibujado a mano obligaría a rehacer todo eso para
// ganar solo el aspecto.

import { useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { useNavigate } from 'react-router';

// Rutas directas y no el barril: ver `AuthProvider`.
import { cerrarSesion } from '@modules/auth/api/session';
import { useAuth } from '@modules/auth/hooks/authContext';
import { useAnnounce } from '@shared/hooks/announceContext';
import {
  aplicarPreferencias,
  guardarPreferencias,
  leerPreferencias,
} from '@shared/lib/preferencias';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { Pantalla } from '@shared/ui/Pantalla';

import styles from './AjustesPage.module.css';

import type { Preferencias } from '@shared/lib/preferencias';

interface OpcionProps {
  etiqueta: string;
  ayuda: string;
  marcada: boolean;
  alCambiar: (marcada: boolean) => void;
}

/** Casilla con su etiqueta y su ayuda. Toda la fila es objetivo táctil. */
function Opcion({ etiqueta, ayuda, marcada, alCambiar }: OpcionProps) {
  const id = useId();
  const ayudaId = `${id}-ayuda`;

  return (
    <div className={styles.opcion}>
      <label className={styles.fila} htmlFor={id}>
        <input
          id={id}
          className={styles.casilla}
          type="checkbox"
          checked={marcada}
          aria-describedby={ayudaId}
          onChange={(evento) => {
            alCambiar(evento.target.checked);
          }}
        />
        <span className={styles.etiqueta}>{etiqueta}</span>
      </label>
      <p id={ayudaId} className={styles.ayuda}>
        {ayuda}
      </p>
    </div>
  );
}

export function AjustesPage() {
  const { session, profile } = useAuth();
  const anunciar = useAnnounce();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [preferencias, setPreferencias] = useState<Preferencias>(() => leerPreferencias());
  const [saliendo, setSaliendo] = useState(false);
  const [falloAlSalir, setFalloAlSalir] = useState(false);

  const cambiar = (cambio: Partial<Preferencias>) => {
    const nuevas = { ...preferencias, ...cambio };

    setPreferencias(nuevas);
    guardarPreferencias(nuevas);
    aplicarPreferencias(nuevas);
  };

  const salir = async () => {
    setSaliendo(true);
    setFalloAlSalir(false);

    try {
      await cerrarSesion();
      // Lo que la caché guardó con la sesión que se va no puede verlo quien
      // entre después en el mismo móvil (DOC 06 §5.5).
      queryClient.clear();
      anunciar('Sesión cerrada');
      void navigate('/login', { replace: true });
    } catch {
      setFalloAlSalir(true);
      setSaliendo(false);
      anunciar('No se pudo cerrar la sesión');
    }
  };

  // Nombre de Google, y si no lo hay, el correo: es la cuenta de la persona
  // que mira la pantalla, para que sepa con cuál está dentro.
  const cuenta = profile?.display_name ?? (session === null ? null : (session.user.email ?? null));

  return (
    <Pantalla id="C01" titulo="Ajustes">
      <Card title="Pantalla" headingLevel={2}>
        <div className={styles.opciones}>
          <Opcion
            etiqueta="Alto contraste"
            ayuda="Negro sobre blanco y bordes gruesos, para leer la pantalla al sol."
            marcada={preferencias.altoContraste}
            alCambiar={(marcada) => {
              cambiar({ altoContraste: marcada });
            }}
          />
          <Opcion
            etiqueta="Reducir el movimiento"
            ayuda="Quita las animaciones. Si el móvil ya lo pide en sus ajustes, se respeta aunque esto esté apagado."
            marcada={preferencias.movimientoReducido}
            alCambiar={(marcada) => {
              cambiar({ movimientoReducido: marcada });
            }}
          />
        </div>
        <p className={styles.nota}>Se guardan en este dispositivo.</p>
      </Card>

      <Card title="Cuenta" headingLevel={2}>
        {cuenta === null ? null : (
          <p>
            Has entrado como <strong className={styles.cuenta}>{cuenta}</strong>.
          </p>
        )}
        <div>
          <Button
            variant="secondary"
            disabled={saliendo}
            onClick={() => {
              void salir();
            }}
          >
            {saliendo ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </Button>
        </div>
        {falloAlSalir ? (
          <p className={styles.fallo}>No se pudo cerrar la sesión. Vuelve a intentarlo.</p>
        ) : null}
      </Card>
    </Pantalla>
  );
}
