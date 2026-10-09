// Contrato público del módulo `training` (DOC 06 §3.2). Pantallas A15a y A15b
// (T-228) y A15, la lista de asistencia (T-229).

export { EditarEntrenamientoPage, NuevoEntrenamientoPage } from './routes/EntrenamientoPage';
export { EntrenamientosPage } from './routes/EntrenamientosPage';
export { ListaPage } from './routes/ListaPage';

// Para `agenda`, que enseña los entrenamientos cercanos en el calendario y el
// próximo en Inicio (T-231, D06-42). `training` sigue sin importar de `agenda`.
// Hoy `agenda` usa el hook y el tipo; `separarEntrenamientos` sale porque así
// lo fija la D06-42, pero `agenda/model` corta su propia ventana y no la llama:
// un `model/` no importa barriles en tiempo de ejecución.
export { useEntrenamientos } from './hooks/useEntrenamientos';
export { separarEntrenamientos } from './model/entrenamiento';

export type { Entrenamiento } from './model/entrenamiento';
