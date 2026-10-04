// La A02 con el próximo partido (T-213, D06-34).
//
// Inicio vive en `core`, que no puede importar de `agenda` (DOC 06 §4.2), y el
// DOC 02 §3.3 pide el directo a un toque desde Inicio. Se resuelve como la
// D06-28: `HomePage` expone un enganche, `proximoEvento`, y `agenda` la
// envuelve. El enrutador carga esta pantalla en la ruta índice, por el barril
// de `agenda`.

import { HomePage } from '@modules/core';

import { ProximoPartido } from '../components/ProximoPartido';

export function InicioPage() {
  return <HomePage proximoEvento={<ProximoPartido />} />;
}
