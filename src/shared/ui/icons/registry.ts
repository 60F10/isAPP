// Registro de los veintiún iconos del DOC 07 §8.2.
//
// Cada archivo .svg se importa como texto con el sufijo `?raw` de Vite y se
// inyecta tal cual dentro del envoltorio que pone el componente Icon. El
// dibujo, el viewBox, el trazo y el aria-hidden siguen viviendo en un solo
// sitio —el propio archivo—, así que sustituir un icono es cambiar un .svg y
// nada más, que es exactamente lo que promete el contrato del §8.1.
//
// Por qué no SVGR: haría falta `vite-plugin-svgr`, una dependencia fuera de
// la lista cerrada del DOC 06 §2.3, para ganar un envoltorio que aquí cuesta
// seis líneas de CSS. El razonamiento completo, con lo que se descartó, está
// en el traspaso de la T-103.

import check from './check.svg?raw';
import chevron from './chevron.svg?raw';
import clock from './clock.svg?raw';
import close from './close.svg?raw';
import corner from './corner.svg?raw';
import foulCommitted from './foul_committed.svg?raw';
import foulReceived from './foul_received.svg?raw';
import goal from './goal.svg?raw';
import note from './note.svg?raw';
import ownGoal from './own_goal.svg?raw';
import plus from './plus.svg?raw';
import positionChange from './position_change.svg?raw';
import redCard from './red_card.svg?raw';
import reliability from './reliability.svg?raw';
import secondYellow from './second_yellow.svg?raw';
import settings from './settings.svg?raw';
import substitution from './substitution.svg?raw';
import sync from './sync.svg?raw';
import team from './team.svg?raw';
import user from './user.svg?raw';
import yellowCard from './yellow_card.svg?raw';

/**
 * El nombre de cada icono es el del archivo, sin extensión, y coincide con el
 * tipo de evento del DOC 04 §7.1 en los once de evento. Esa coincidencia es
 * la que permite pintar un evento sin una tabla de traducción por el medio.
 */
export const ICON_MARKUP = {
  // De evento (11)
  goal,
  own_goal: ownGoal,
  yellow_card: yellowCard,
  second_yellow: secondYellow,
  red_card: redCard,
  foul_committed: foulCommitted,
  foul_received: foulReceived,
  corner,
  substitution,
  position_change: positionChange,
  note,
  // De interfaz (10)
  check,
  close,
  clock,
  reliability,
  sync,
  chevron,
  plus,
  settings,
  user,
  team,
} as const;

export type IconName = keyof typeof ICON_MARKUP;

/** Los veintiún nombres, en el orden del inventario del DOC 07 §8.2. */
export const ICON_NAMES = Object.keys(ICON_MARKUP) as IconName[];
