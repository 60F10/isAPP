// Distintivo de los tres estados de `match_events` (DOC 07 §2.2). Tinta,
// fondo suave, icono y palabra: el color nunca va solo.
//
// Ojo con el eje: aquí se pinta el estado de la ANOTACIÓN —si el dato es
// bueno—, no el del transporte hacia el servidor. Son cosas distintas y viven
// en sitios distintos (DOC 06 §8.6).

import { Icon } from './Icon';
import type { IconName } from './icons/registry';

import styles from './StatusChip.module.css';

export type DataStatus = 'pending' | 'approved' | 'rejected';

const LABELS: Record<DataStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Descartado',
};

const ICONS: Record<DataStatus, IconName> = {
  pending: 'clock',
  approved: 'check',
  rejected: 'close',
};

interface StatusChipProps {
  status: DataStatus;
  className?: string;
}

export function StatusChip({ status, className }: StatusChipProps) {
  const classes = [styles.chip, styles[status], className].filter(Boolean).join(' ');

  return (
    <span className={classes}>
      <Icon name={ICONS[status]} size="sm" />
      {LABELS[status]}
    </span>
  );
}
