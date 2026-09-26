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
