// Lógica pura del registro de errores (DOC 06 §10.1, DOC 05 §9.5).
//
// Sin React ni red: convierte cualquier cosa lanzada en una fila de
// `error_logs` limpia y decide si merece la pena mandarla.
//
// LA REGLA QUE MANDA AQUÍ: en `error_logs` no entra ni un dato personal ni un
// testigo de sesión. El contenido de un formulario no llega nunca a estas
// funciones —nadie se lo pasa—, pero un mensaje de error sí puede arrastrar
// una URL con el `access_token` de la vuelta de Google, una cabecera
// `Authorization` o el correo de alguien. `limpiarTexto` los tapa antes de
// que la fila salga del móvil.

/** Largo máximo del mensaje. Un mensaje de más de mil caracteres ya es una traza. */
export const LARGO_MENSAJE = 1000;

/** Largo máximo de la traza. Con las primeras líneas basta para ubicar el fallo. */
export const LARGO_TRAZA = 4000;

/** Datos del dispositivo: solo lo que ayuda a reproducir el fallo. */
export type Dispositivo = Record<string, string | number | boolean>;

/** De dónde viene el error. Va delante del mensaje, entre corchetes. */
export type OrigenDeError = 'boundary' | 'ruta' | 'global' | 'promesa' | 'contexto';

export interface EntradaDeError {
  origen: OrigenDeError;
  mensaje: string;
  traza: string | null;
  /** `location.pathname`, o la ruta entera: la consulta y el fragmento se tiran. */
  ruta: string;
  userId: string;
  clubId: string | null;
  appVersion: string;
  dispositivo: Dispositivo;
}

/** Fila lista para insertar en `error_logs`, con los nombres de sus columnas. */
export interface FilaDeError {
  user_id: string;
  club_id: string | null;
  route: string;
  message: string;
  stack: string | null;
  device: Dispositivo;
  app_version: string;
}

// Parámetros cuyo valor es un testigo o un código que canjea uno. `code` es el
// de la vuelta de Google (PKCE), y con él y el verificador se abre sesión.
const PARAMETROS_SENSIBLES =
  /\b(access_token|refresh_token|provider_token|provider_refresh_token|id_token|token|code|apikey|api_key|password)=[^&#\s"'`]*/gi;

// Tres trozos en base64url separados por puntos y empezando por `eyJ`, que es
// `{"` codificado: la cabecera de cualquier JWT.
const JWT = /\beyJ[\w-]+\.[\w-]+\.[\w-]+/g;

const BEARER = /\bBearer\s+[\w.~+/=-]+/gi;

const CORREO = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;

/** Tapa testigos, códigos de sesión y correos. El resto del texto se queda igual. */
export function limpiarTexto(texto: string): string {
  return texto
    .replace(JWT, '[token]')
    .replace(BEARER, 'Bearer [token]')
    .replace(PARAMETROS_SENSIBLES, (_coincidencia, nombre: string) => `${nombre}=[oculto]`)
    .replace(CORREO, '[correo]');
}

function recortar(texto: string, largo: number): string {
  return texto.length <= largo ? texto : `${texto.slice(0, largo - 1)}…`;
}

/** Solo el camino: `?code=` y `#access_token=` se quedan fuera por construcción. */
function soloElCamino(ruta: string): string {
  const corte = ruta.search(/[?#]/);

  return corte === -1 ? ruta : ruta.slice(0, corte);
}

/**
 * Saca mensaje y traza de cualquier cosa lanzada.
 *
 * En JavaScript se puede lanzar lo que sea, y Supabase devuelve sus errores
 * como objetos con `message` que no son `Error`. Se aceptan los tres casos y
 * nunca se deja el mensaje vacío, que es la única columna obligatoria.
 */
export function normalizarError(error: unknown): { mensaje: string; traza: string | null } {
  if (error instanceof Error) {
    return {
      mensaje: error.message === '' ? error.name : error.message,
      traza: error.stack ?? null,
    };
  }

  if (typeof error === 'string' && error !== '') {
    return { mensaje: error, traza: null };
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const { message } = error;

    if (typeof message === 'string' && message !== '') {
      return { mensaje: message, traza: null };
    }
  }

  return { mensaje: 'Error sin mensaje', traza: null };
}

/** Convierte la entrada en la fila de `error_logs`, limpia y recortada. */
export function construirFilaDeError(entrada: EntradaDeError): FilaDeError {
  const mensaje = limpiarTexto(`[${entrada.origen}] ${entrada.mensaje}`);
  const traza = entrada.traza === null ? null : limpiarTexto(entrada.traza);

  return {
    user_id: entrada.userId,
    club_id: entrada.clubId,
    route: soloElCamino(entrada.ruta),
    message: recortar(mensaje, LARGO_MENSAJE),
    stack: traza === null ? null : recortar(traza, LARGO_TRAZA),
    device: entrada.dispositivo,
    app_version: entrada.appVersion,
  };
}

/**
 * Freno para no llenar `error_logs` con el mismo fallo.
 *
 * Un componente que revienta en cada render, o un `setInterval` que falla cada
 * segundo, mandaría cientos de filas iguales y se comería los datos del móvil
 * a pie de campo. Dos límites:
 *
 *   · El mismo mensaje no se repite dentro de `ventanaMs`.
 *   · Por carga de la aplicación no salen más de `maximo` filas, sean las que
 *     sean. A partir de ahí la aplicación está rota de verdad y con las
 *     primeras basta para verlo.
 */
export function crearLimitador(opciones: {
  maximo: number;
  ventanaMs: number;
}): (clave: string, ahoraMs: number) => boolean {
  const ultimaVez = new Map<string, number>();
  let enviados = 0;

  return (clave, ahoraMs) => {
    if (enviados >= opciones.maximo) {
      return false;
    }

    const anterior = ultimaVez.get(clave);

    if (anterior !== undefined && ahoraMs - anterior < opciones.ventanaMs) {
      return false;
    }

    ultimaVez.set(clave, ahoraMs);
    enviados += 1;

    return true;
  };
}
