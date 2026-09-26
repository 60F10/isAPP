// La A11 con la precarga del partido (DOC 06 §8.3, T-206).
//
// D06-11 pide precargar el partido al entrar en la convocatoria, pero `lineup`
// no puede importar de `sync` ni de la capa offline (DOC 06 §4.2). Lo resuelve
// el enrutador (decisión de Raúl, 26/09): la ruta de la convocatoria carga
// esta pantalla, que es la de `lineup` con el estado de la precarga encima.
//
// Al guardar la convocatoria se precarga otra vez, para que el directo no se
// quede con la de antes. La pantalla ya ha navegado para entonces: si falla,
// la siguiente entrada lo vuelve a intentar y el directo lo dirá.
//
// NO SALE POR EL BARRIL DE `match`, que va en el paquete inicial con la A12.
// `app/router.tsx` la importa por ruta directa y en perezoso: arrastra Dexie.

import { useParams } from 'react-router';

import { ConvocatoriaPage } from '@modules/lineup';

import { precargarPartido } from '../api/precarga';
import { EstadoDePrecarga } from '../components/EstadoDePrecarga';

export function ConvocatoriaConPrecarga() {
  const { id: partidoId = '' } = useParams();

  return (
    <ConvocatoriaPage
      aviso={<EstadoDePrecarga partidoId={partidoId} />}
      alGuardar={() => {
        void precargarPartido(partidoId).catch(() => undefined);
      }}
    />
  );
}
