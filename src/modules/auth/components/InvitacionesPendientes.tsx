// Tarjeta «Invitaciones» de Inicio (T-301b).
//
// Quien entra con una cuenta de Google invitada ve aquí la invitación y la
// acepta. No hay correo ni enlace con testigo: la invitación se casa con el
// correo de la cuenta (DOC 05 §14.8).
//
// SIN INVITACIONES NO PINTA NADA, ni el título: es lo normal casi siempre, y
// una tarjeta vacía arriba de Inicio sería ruido para todo el mundo. Tampoco
// pinta nada mientras carga ni si la consulta falla: es un aviso, no el
// contenido de la pantalla.
//
// Aceptar va por función (`aceptar_invitacion`), no escribiendo en tablas:
// quien acepta todavía no es nadie en el equipo.

import { useState } from 'react';

import { useAnnounce } from '@shared/hooks/announceContext';
import { mensajeDeErrorAlGuardar } from '@shared/lib/guardado';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';

import { useAuth } from '../hooks/authContext';
import { useAceptarInvitacion, useMisInvitaciones } from '../hooks/usePersonas';
import { fraseDeInvitacion } from '../model/personas';

import styles from './InvitacionesPendientes.module.css';

/**
 * Frase para cuando aceptar falla.
 *
 * Lo que rechaza la función de la base ya viene en español y dice el motivo
 * («La invitación ya no está vigente»): se enseña tal cual. Lo que no viene de
 * la función —sin red, o un `PGRST…` de PostgREST, que habla en inglés— pasa
 * por el texto común.
 */
function mensajeAlAceptar(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    !error.code.startsWith('PGRST') &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message !== ''
  ) {
    return error.message;
  }

  return mensajeDeErrorAlGuardar(error);
}

export function InvitacionesPendientes() {
  const anunciar = useAnnounce();
  const { reintentarContexto } = useAuth();
  const invitaciones = useMisInvitaciones();
  // La mutación vive aquí y no en cada fila: al aceptar, la fila desaparece.
  const aceptar = useAceptarInvitacion();
  const [fallo, setFallo] = useState<string | null>(null);

  if (invitaciones.data === undefined || invitaciones.data.length === 0) {
    return null;
  }

  return (
    <Card title="Invitaciones" headingLevel={2}>
      <ul className={styles.lista}>
        {invitaciones.data.map((invitacion) => (
          <li key={invitacion.id} className={styles.fila}>
            <p className={styles.frase}>{fraseDeInvitacion(invitacion)}</p>
            <div>
              <Button
                variant="primary"
                aria-label={`Aceptar la invitación a ${invitacion.teamName}`}
                disabled={aceptar.isPending}
                onClick={() => {
                  setFallo(null);
                  aceptar.mutate(invitacion.id, {
                    onSuccess: () => {
                      // El equipo aparece sin recargar la página.
                      reintentarContexto();
                      anunciar(
                        invitacion.asFollower
                          ? `Ya sigues a ${invitacion.teamName}`
                          : `Ya formas parte de ${invitacion.teamName}`,
                      );
                    },
                    onError: (error) => {
                      const mensaje = mensajeAlAceptar(error);
                      setFallo(mensaje);
                      anunciar(mensaje);
                    },
                  });
                }}
              >
                {aceptar.isPending && aceptar.variables === invitacion.id
                  ? 'Aceptando…'
                  : 'Aceptar'}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {fallo === null ? null : <p className={styles.fallo}>{fallo}</p>}
    </Card>
  );
}
