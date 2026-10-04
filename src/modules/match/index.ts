// Contrato público del módulo `match` (DOC 06 §3.2). Pantalla A12, y la A11
// con la precarga del partido encima (D06-28).
//
// Todo lo de aquí arrastra Dexie: el enrutador lo carga en perezoso, nunca
// con una importación estática (D06-26). Desde la T-207 la A12 tampoco va en
// el paquete inicial (D06-29).

export { ConvocatoriaConPrecarga } from './routes/ConvocatoriaConPrecarga';
export { LiveMatchPage } from './routes/LiveMatchPage';

// Para `review`, que enseña los eventos en el cierre y limpia el aparato al
// cerrar (T-210a).
export { olvidarPartido } from './api/precarga';
export { describirEvento } from './model/describir';
export { desdeFilas } from './model/eventos';
// Para el panel de eventos del cierre, que corrige el minuto con la misma
// regla que el directo en diferido (T-210b).
export { rangoDeParte, segundosDeMinuto } from './model/reloj';

export type { EstadoDeEvento, EventoDelDirecto } from './model/eventos';
