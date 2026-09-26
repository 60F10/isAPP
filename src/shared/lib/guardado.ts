// Lo común a guardar datos en Supabase desde cualquier módulo (DOC 06 §10.1).
//
// Nace en la T-201 dentro de `core` y se muda aquí en la T-203, cuando `rules`
// lo necesita también. Es la primera pieza del «ayudante común» del §10.1
// (punto 16 del DOC 13): lo que falta es envolver cada `{ data, error }`.

/** Quita espacios de los bordes y junta los repetidos de dentro. */
export function limpiarTexto(texto: string): string {
  return texto.trim().replace(/\s+/g, ' ');
}

/**
 * Marca de «la base no tocó ninguna fila». Una actualización que la RLS no
 * deja hacer no da error en PostgREST: devuelve cero filas. `api/` la
 * convierte en un error con este mensaje para que no pase por un éxito.
 */
export const SIN_FILAS = 'SIN_FILAS';

function codigoDe(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const { code } = error;

    return typeof code === 'string' ? code : null;
  }

  return null;
}

/**
 * Frase para quien está delante cuando guardar no sale bien.
 *
 * @param repetido qué decir si la base rechaza un duplicado (23505). Cada
 *   pantalla sabe qué es lo que no se puede repetir.
 */
export function mensajeDeErrorAlGuardar(error: unknown, repetido = 'Ya existe uno igual.'): string {
  const codigo = codigoDe(error);

  if (codigo === '23505') {
    return repetido;
  }

  // 42501: la RLS rechazó la escritura.
  if (codigo === '42501' || (error instanceof Error && error.message === SIN_FILAS)) {
    return 'No tienes permiso para cambiar esto.';
  }

  // 23514: una restricción `check` de la base. La pantalla valida los mismos
  // rangos antes de enviar, así que llegar aquí es que alguien los ha tocado
  // en un sitio y no en el otro.
  if (codigo === '23514') {
    return 'Algún valor está fuera de lo permitido. Revisa los campos.';
  }

  // `fetch` sin red lanza un TypeError. No es un fallo del dato: es la
  // cobertura del campo.
  if (error instanceof TypeError) {
    return 'No hay conexión. No se ha guardado nada: vuelve a intentarlo con cobertura.';
  }

  return 'No se ha podido guardar. Vuelve a intentarlo.';
}

/**
 * Clases de SQLSTATE que son del servidor y no del dato: conexión (08),
 * recursos (53), intervención del operador (57), sistema (58) e interno (XX).
 */
const DEL_SERVIDOR = /^(08|53|57|58|XX)/;

/** Los `PGRST3xx` son del testigo de sesión: caducado, se renueva solo. */
const DE_LA_SESION = /^PGRST3/;

/**
 * Si repetir la petición no va a arreglar el error: es del dato o del
 * permiso (DOC 06 §10.1, DOC 13 punto 16). Lo usa la caché de lectura para no
 * reintentar un 42501 de la RLS dos veces antes de enseñarlo.
 *
 * Las funciones de `api/` lanzan el `PostgrestError` de Supabase, que trae
 * `code` y no `status`: por eso se miran los dos. Lo que no se reconoce se
 * reintenta, que mejor una vez de más que rendirse sin motivo.
 */
export function esErrorDefinitivo(error: unknown): boolean {
  if (error instanceof Error && error.message === SIN_FILAS) {
    return true;
  }

  if (typeof error === 'object' && error !== null && 'status' in error) {
    const { status } = error;

    if (typeof status === 'number') {
      return status >= 400 && status <= 499 && status !== 401 && status !== 408 && status !== 429;
    }
  }

  const codigo = codigoDe(error);

  if (codigo === null || codigo === '') {
    return false;
  }

  return !DEL_SERVIDOR.test(codigo) && !DE_LA_SESION.test(codigo);
}
