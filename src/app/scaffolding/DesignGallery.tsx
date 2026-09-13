// ANDAMIAJE DE LA T-103 — NO ES UNA PANTALLA DEL DOC 02.
//
// Galería de comprobación del sistema de diseño: pinta los veintiún iconos y
// los seis componentes base en todos sus estados para poder mirarlos en el
// navegador, medir contrastes y recorrerlos con el teclado. No tiene ruta, no
// entra en el inventario de pantallas y no se usa desde ninguna otra parte.
//
// La T-104 monta el enrutador y sustituye este archivo junto con lo que queda
// de andamiaje en `main.tsx`. Cuando eso pase, esta carpeta entera se borra.

import { useState } from 'react';

import { Button } from '@shared/ui/Button';
import { Card } from '@shared/ui/Card';
import { Field } from '@shared/ui/Field';
import { Icon } from '@shared/ui/Icon';
import { StatusChip, type DataStatus } from '@shared/ui/StatusChip';
import { Toast, type ToastTone } from '@shared/ui/Toast';
import { ICON_NAMES } from '@shared/ui/icons/registry';
import { env } from '@shared/lib/env';

import styles from './DesignGallery.module.css';

const STATUSES: DataStatus[] = ['pending', 'approved', 'rejected'];

const TOASTS: { tone: ToastTone; message: string }[] = [
  { tone: 'success', message: 'Gol registrado' },
  { tone: 'sync', message: '3 eventos pendientes de sincronizar' },
  { tone: 'danger', message: 'No se pudo guardar el evento' },
];

const TYPE_SCALE = [
  { token: '--font-size-600', use: 'Reloj del directo', sample: '34:12' },
  { token: '--font-size-500', use: 'Marcador', sample: '1 - 0' },
  { token: '--font-size-400', use: 'Título de pantalla', sample: 'Partido en directo' },
  { token: '--font-size-300', use: 'Título de sección', sample: 'Últimos eventos' },
  { token: '--font-size-200', use: 'Nombre de jugador', sample: 'El Guanche' },
  { token: '--font-size-100', use: 'Texto base', sample: 'Segunda parte, minuto 34' },
  { token: '--font-size-75', use: 'Etiqueta y pie', sample: 'Dorsal' },
];

export function DesignGallery() {
  const [highContrast, setHighContrast] = useState(false);
  const [toast, setToast] = useState<(typeof TOASTS)[number] | null>(null);

  const toggleContrast = () => {
    const next = !highContrast;
    setHighContrast(next);
    // En la aplicación de verdad esto lo hará Ajustes (C01, T-107) antes del
    // primer pintado. Aquí es solo un interruptor para mirar el modo.
    if (next) {
      document.documentElement.dataset.contrast = 'high';
    } else {
      delete document.documentElement.dataset.contrast;
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.banner}>Andamiaje de la T-103 · la T-104 sustituye esta pantalla</p>
        <h1>Sistema de diseño</h1>
        <p className={styles.lead}>
          Los veintiún iconos y los seis componentes base del DOC 07, en sus estados. Entorno:{' '}
          {env.APP_ENV}.
        </p>
        <Button variant="secondary" iconStart="settings" onClick={toggleContrast}>
          {highContrast ? 'Volver al contraste normal' : 'Probar el alto contraste'}
        </Button>
      </header>

      <Card as="section" title="Iconos" headingLevel={2}>
        <ul className={styles.icons}>
          {ICON_NAMES.map((name) => (
            <li key={name}>
              <Icon name={name} size="lg" />
              <code>{name}</code>
            </li>
          ))}
        </ul>
      </Card>

      <Card as="section" title="Botones" headingLevel={2}>
        <div className={styles.row}>
          <Button>Registrar gol</Button>
          <Button variant="secondary">Cancelar</Button>
          <Button variant="ghost">Deshacer</Button>
        </div>
        <div className={styles.row}>
          <Button iconStart="plus">Con icono</Button>
          <Button variant="secondary" iconEnd="chevron">
            Siguiente
          </Button>
          <Button variant="ghost" iconStart="settings" aria-label="Ajustes" />
        </div>
        <div className={styles.row}>
          <Button disabled>Deshabilitado</Button>
          <Button variant="secondary" disabled>
            Deshabilitado
          </Button>
          <Button variant="ghost" disabled>
            Deshabilitado
          </Button>
        </div>
        <Button fullWidth iconStart="check">
          Ancho completo
        </Button>
      </Card>

      <Card as="section" title="Campos" headingLevel={2}>
        <Field label="Apodo" defaultValue="El Guanche" required />
        <Field label="Dorsal" type="number" hint="Entre 1 y 99, sin repetir en la plantilla" />
        <Field label="Rival" placeholder="Nombre del equipo" error="Elige un equipo de la lista" />
        <Field label="Competición" defaultValue="Liga cadete" disabled />
      </Card>

      <Card as="section" title="Estados del dato" headingLevel={2}>
        <div className={styles.row}>
          {STATUSES.map((status) => (
            <StatusChip key={status} status={status} />
          ))}
        </div>
      </Card>

      <Card as="section" title="Confirmaciones" headingLevel={2}>
        <div className={styles.row}>
          {TOASTS.map((item) => (
            <Button key={item.tone} variant="secondary" onClick={() => setToast(item)}>
              {item.message}
            </Button>
          ))}
        </div>
      </Card>

      <Card as="section" title="Escala tipográfica" headingLevel={2}>
        <div className={styles.tableWrap}>
          <table className={styles.scale}>
            <caption>Tamaños del DOC 07 §5.2 con su uso</caption>
            <thead>
              <tr>
                <th scope="col">Muestra</th>
                <th scope="col">Token</th>
                <th scope="col">Uso</th>
              </tr>
            </thead>
            <tbody>
              {TYPE_SCALE.map((row) => (
                <tr key={row.token}>
                  <td style={{ fontSize: `var(${row.token})` }} className="tabular">
                    {row.sample}
                  </td>
                  <td>
                    <code>{row.token}</code>
                  </td>
                  <td>{row.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Toast
        open={toast !== null}
        message={toast?.message ?? ''}
        tone={toast?.tone}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
