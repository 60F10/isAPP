// Los cinco destinos de la barra y la regla que decide cuál se marca (T-304).
//
// Viven aparte del componente para que la regla sea una función pura que se
// prueba sin pintar nada, y para que haya un único sitio donde mirar qué
// destino marca cada ruta (CLAUDE.md, «Navegación»).

import type { IconName } from '@shared/ui/icons/registry';

export interface Destino {
  to: string;
  texto: string;
  icono: IconName;
  /** Solo la ruta exacta. Sin `end`, «Inicio» quedaría activo en todas las rutas. */
  end?: boolean;
  /**
   * Otros prefijos de ruta que también marcan este destino: las pantallas que
   * cuelgan de él en el árbol del DOC 02 §3 aunque su dirección no empiece
   * igual.
   */
  tambien?: readonly string[];
}

export const DESTINOS: readonly Destino[] = [
  { to: '/', texto: 'Inicio', icono: 'clock', end: true },
  {
    to: '/equipo',
    texto: 'Equipo',
    icono: 'team',
    tambien: ['/equipos', '/club', '/jugadores'],
  },
  { to: '/calendario', texto: 'Agenda', icono: 'plus', tambien: ['/entrenamientos'] },
  { to: '/estadisticas', texto: 'Datos', icono: 'reliability' },
  {
    to: '/mas',
    texto: 'Más',
    icono: 'settings',
    tambien: ['/ajustes', '/mis-aportaciones', '/admin'],
  },
];

/** La ruta es el prefijo exacto o sigue con `/`: «/equipaje» no cuelga de «/equipo». */
function cuelgaDe(ruta: string, prefijo: string): boolean {
  return ruta === prefijo || ruta.startsWith(`${prefijo}/`);
}

/**
 * Si el destino es el de la ruta en la que se está.
 *
 * Con `end`, solo la ruta exacta (con o sin barra final). Sin él, la propia
 * ruta del destino o cualquiera de `tambien`, y siempre por segmentos
 * completos: `/equipos` no marca «Equipo» por parecerse a `/equipo`, marca
 * porque está en `tambien`.
 */
export function esDestinoActual(destino: Destino, ruta: string): boolean {
  if (destino.end === true) {
    return ruta === destino.to || ruta === `${destino.to}/`;
  }

  return [destino.to, ...(destino.tambien ?? [])].some((prefijo) => cuelgaDe(ruta, prefijo));
}
