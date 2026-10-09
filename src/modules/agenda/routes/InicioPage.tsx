// La A02 con el próximo partido (T-213, D06-34) y, debajo, el próximo
// entrenamiento (T-231, D06-42).
//
// Inicio vive en `core`, que no puede importar de `agenda` (DOC 06 §4.2), y el
// DOC 02 §3.3 pide el directo a un toque desde Inicio. Se resuelve como la
// D06-28: `HomePage` expone un enganche, `proximoEvento`, y `agenda` la
// envuelve. El enrutador carga esta pantalla en la ruta índice, por el barril
// de `agenda`.
//
// El partido va primero y no se toca: el entrenamiento es un bloque aparte,
// que no pinta nada si no hay ninguno en siete días.

import { HomePage } from '@modules/core';

import { ProximoEntrenamiento } from '../components/ProximoEntrenamiento';
import { ProximoPartido } from '../components/ProximoPartido';

export function InicioPage() {
  return (
    <HomePage
      proximoEvento={
        <>
          <ProximoPartido />
          <ProximoEntrenamiento />
        </>
      }
    />
  );
}
