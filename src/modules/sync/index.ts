// Contrato público del módulo `sync` (DOC 06 §3.2 y §8). Pantalla C04.
//
// LA COLA NO SABE QUÉ ES UN GOL (DOC 06 §4.2). `match` encola filas con
// `encolar`; la cola las manda en orden, con reintento e idempotencia.
//
// Todo esto arrastra Dexie, que no cabe en el paquete inicial: `app/` lo
// carga con `import()`, nunca con una importación estática.

export { BandaDeSincronizacion } from './components/BandaDeSincronizacion';

export { contarPendientes, purgarPartido } from './api/almacen';
export { arrancarSincronizacion, sincronizarAhora } from './api/arranque';
export { encolar } from './api/encolar';

export type { EntradaDeTrabajo, EstadoDeCola } from './model/cola';
