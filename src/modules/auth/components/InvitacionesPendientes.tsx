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

import { useEffect, useRef, useState } from 'react';

import { useAnnounce } from '@shared/hooks/announceContext';
import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';

import { useAuth } from '../hooks/authContext';
import { useAceptarInvitacion, useMisInvitaciones } from '../hooks/usePersonas';
import { fraseDeInvitacion } from '../model/personas';
import { mensajeDeLaBase } from '../model/solicitudes';

import styles from './InvitacionesPendientes.module.css';

export function InvitacionesPendientes() {
  const anunciar = useAnnounce();
  const { reintentarContexto } = useAuth();
  const invitaciones = useMisInvitaciones();
  // La mutación vive aquí y no en cada fila: al aceptar, la fila desaparece.
  const aceptar = useAceptarInvitacion();
  const [fallo, setFallo] = useState<string | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const mensaje = useRef<HTMLParagraphElement>(null);

  // El foco va al mensaje cuando aceptar falla: el botón que lo tenía estaba
  // desactivado mientras se aceptaba (2.4.3).
  useEffect(() => {
    if (fallo !== null) {
      mensaje.current?.focus();
    }
  }, [fallo]);

  // Con un fallo la tarjeta se queda aunque la lista haya quedado vacía (la
  // invitación ya no vale): si no, el mensaje se iría con ella.
  if (fallo === null && (invitaciones.data === undefined || invitaciones.data.length === 0)) {
    return null;
  }

  return (
    <Card title="Invitaciones" headingLevel={2} headingRef={titulo}>
      <ul className={styles.lista}>
        {(invitaciones.data ?? []).map((invitacion) => (
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
                      // La tarjeta se va con la última invitación: el foco, al
                      // `h1` de la pantalla, como hace la banda de sincronización.
                      document.querySelector('h1')?.focus();
                      // El equipo aparece sin recargar la página.
                      reintentarContexto();
                      anunciar(
                        invitacion.asFollower
                          ? `Ya sigues a ${invitacion.teamName}`
                          : `Ya formas parte de ${invitacion.teamName}`,
                      );
                    },
                    onError: (error) => {
                      const texto = mensajeDeLaBase(error);
                      setFallo(texto);
                      anunciar(texto);
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
      {fallo === null ? null : (
        <div className={styles.aviso}>
          <p ref={mensaje} className={styles.fallo} tabIndex={-1}>
            {fallo}
          </p>
          <div>
            <Button
              variant="secondary"
              onClick={() => {
                setFallo(null);
                titulo.current?.focus();
              }}
            >
              Cerrar
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
