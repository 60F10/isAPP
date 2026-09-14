// Estado de carga de las guardias.
//
// Texto, no un dibujo que gira. Un indicador mudo no lo anuncia ningún lector
// de pantalla y no dice si la aplicación está trabajando o se ha quedado
// colgada.
//
// Sin `aria-live`. La región viva de la aplicación es una sola y la pone
// `AnnounceProvider` (DOC 06 §6.3); esta pieza entra y sale del DOM en las dos
// guardias y en el `HydrateFallback`, así que montaría y desmontaría una
// segunda región, que es justo lo que rompe a los lectores de pantalla. Y
// anunciar cada carga tampoco es lo que se quiere: es ruido. Cuándo merece la
// pena anunciar una espera lo decide cada pantalla en su tarea, llamando a
// `useAnnounce()`.

import styles from './LoadingState.module.css';

export function LoadingState() {
  return <p className={styles.cargando}>Cargando…</p>;
}
