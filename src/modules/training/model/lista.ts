// Lista de asistencia: lógica pura de la pantalla A15 (T-229; DOC 04 §13).
//
// Sin React ni red. Dice qué estado tiene cada jugador, compone las líneas de
// la pantalla, las cuenta, prepara lo que se manda a la base y entiende el
// borrador que se queda en el móvil.
//
// SIN MARCAR ES SIN FILA (T-07). La base tiene tres estados: presente, ausente
// y retraso. Un jugador sin marcar no tiene fila en `training_attendance`, y
// no cuenta ni como presente ni como ausente. Por eso el estado de una línea
// puede ser `null`, y `filasAGuardar` no lo manda.
//
// TRES CAPAS, de la que más manda a la que menos: lo tocado en esta visita
// (`Cambios`), lo guardado en la base, y la partida de la lista (`partida.ts`).
//
// DEL JUGADOR, APODO Y DORSAL. Nada más entra aquí ni sale de aquí.
//
// LAS OBSERVACIONES NUNCA RECOGEN SALUD (T-05). El texto es libre y eso no se
// puede comprobar: lo dice la pantalla, junto al campo.

import { limpiarTexto } from '@shared/lib/guardado';

import type { Partida } from './partida';

export type EstadoDeAsistencia = 'present' | 'absent' | 'late';

/** El estado en palabras: se lee en texto, no solo en color (1.4.1). */
export const ESTADOS_DE_ASISTENCIA: Record<EstadoDeAsistencia, string> = {
  present: 'Presente',
  absent: 'Ausente',
  late: 'Retraso',
};

export const SIN_MARCAR = 'Sin marcar';

/** Largo de interfaz: el esquema no lo limita. */
export const LARGO_OBSERVACION = 280;

/** Una fila guardada de `training_attendance`. */
export interface Asistencia {
  playerId: string;
  nickname: string;
  status: EstadoDeAsistencia;
  notes: string | null;
}

/**
 * Lo tocado en esta visita y todavía sin guardar, por `playerId`. Una
 * observación vaciada sigue contando como tocada: es quitar la que había.
 */
export interface Cambios {
  estados: Partial<Record<string, EstadoDeAsistencia>>;
  observaciones: Partial<Record<string, string>>;
}

export const SIN_CAMBIOS: Cambios = { estados: {}, observaciones: {} };

/** Lo que la lista necesita de cada jugador de la plantilla. */
export interface JugadorDeLista {
  playerId: string;
  nickname: string;
  shirtNumber: number | null;
}

/** Una línea de la pantalla. */
export interface LineaDeLista {
  playerId: string;
  nickname: string;
  shirtNumber: number | null;
  /** `null` es sin marcar. */
  status: EstadoDeAsistencia | null;
  /** Nunca `null`: es el valor de un campo de texto. */
  notes: string;
  /** Tiene fila guardada y ya no está en la plantilla: se lee y no se cambia. */
  fueraDePlantilla: boolean;
}

export interface Recuento {
  presentes: number;
  ausentes: number;
  retrasos: number;
  sinMarcar: number;
}

/** Las columnas que se escriben en `training_attendance`, sin la sesión. */
export interface FilaDeAsistencia {
  player_id: string;
  status: EstadoDeAsistencia;
  notes: string | null;
}

function esEstado(valor: unknown): valor is EstadoDeAsistencia {
  return valor === 'present' || valor === 'absent' || valor === 'late';
}

/**
 * El estado de un jugador: lo tocado gana; si no, lo guardado; si no, lo que
 * diga la partida: presente o sin marcar (`null`).
 */
export function estadoDe(
  playerId: string,
  guardadas: readonly Asistencia[],
  cambios: Cambios,
  partida: Partida,
): EstadoDeAsistencia | null {
  const tocado = cambios.estados[playerId];

  if (tocado !== undefined) {
    return tocado;
  }

  const guardada = guardadas.find((fila) => fila.playerId === playerId);

  if (guardada !== undefined) {
    return guardada.status;
  }

  return partida === 'presentes' ? 'present' : null;
}

/**
 * Las líneas de la pantalla: una por jugador de la plantilla, en su orden, y
 * detrás quien tiene fila guardada y ya no está en la plantilla, por apodo. A
 * estos últimos no les llega lo tocado: se leen y no se cambian.
 */
export function componerLista(
  plantilla: readonly JugadorDeLista[],
  guardadas: readonly Asistencia[],
  cambios: Cambios,
  partida: Partida,
): LineaDeLista[] {
  const enPlantilla = new Set(plantilla.map((jugador) => jugador.playerId));

  const dentro = plantilla.map((jugador): LineaDeLista => {
    const guardada = guardadas.find((fila) => fila.playerId === jugador.playerId);

    return {
      playerId: jugador.playerId,
      nickname: jugador.nickname,
      shirtNumber: jugador.shirtNumber,
      status: estadoDe(jugador.playerId, guardadas, cambios, partida),
      notes: cambios.observaciones[jugador.playerId] ?? guardada?.notes ?? '',
      fueraDePlantilla: false,
    };
  });

  const fuera = guardadas
    .filter((fila) => !enPlantilla.has(fila.playerId))
    .sort((a, b) => a.nickname.localeCompare(b.nickname, 'es'))
    .map((fila): LineaDeLista => ({
      playerId: fila.playerId,
      nickname: fila.nickname,
      shirtNumber: null,
      status: fila.status,
      notes: fila.notes ?? '',
      fueraDePlantilla: true,
    }));

  return [...dentro, ...fuera];
}

/** Cuántos hay de cada. Quien ya no está en la plantilla cuenta: vino o no vino. */
export function recuento(lineas: readonly LineaDeLista[]): Recuento {
  const cuenta: Recuento = { presentes: 0, ausentes: 0, retrasos: 0, sinMarcar: 0 };

  for (const linea of lineas) {
    if (linea.status === 'present') {
      cuenta.presentes += 1;
    } else if (linea.status === 'absent') {
      cuenta.ausentes += 1;
    } else if (linea.status === 'late') {
      cuenta.retrasos += 1;
    } else {
      cuenta.sinMarcar += 1;
    }
  }

  return cuenta;
}

function contado(cuantos: number, uno: string, varios: string): string {
  return `${cuantos} ${cuantos === 1 ? uno : varios}`;
}

/** «18 presentes · 2 ausentes · 1 retraso · 0 sin marcar». */
export function fraseDelRecuento(cuenta: Recuento): string {
  return [
    contado(cuenta.presentes, 'presente', 'presentes'),
    contado(cuenta.ausentes, 'ausente', 'ausentes'),
    contado(cuenta.retrasos, 'retraso', 'retrasos'),
    `${cuenta.sinMarcar} sin marcar`,
  ].join(' · ');
}

/** Lo que se anuncia al guardar bien. */
export function fraseDeGuardado(cuenta: Recuento): string {
  return `Lista guardada: ${contado(cuenta.presentes, 'presente', 'presentes')}, ${contado(
    cuenta.ausentes,
    'ausente',
    'ausentes',
  )} y ${contado(cuenta.retrasos, 'retraso', 'retrasos')}.`;
}

/** El aviso de encima de «Guardar lista», o `null` si no queda nadie. */
export function fraseDeSinMarcar(sinMarcar: number): string | null {
  if (sinMarcar === 0) {
    return null;
  }

  return `${sinMarcar === 1 ? 'Queda 1' : `Quedan ${sinMarcar}`} sin marcar. Puedes guardar y terminar después.`;
}

function observacionLimpia(notes: string): string | null {
  const limpia = limpiarTexto(notes).slice(0, LARGO_OBSERVACION).trimEnd();

  return limpia === '' ? null : limpia;
}

/**
 * Lo que se manda a la base: una fila por jugador de la plantilla con estado.
 * Los sin marcar no salen, y su observación tampoco: sin estado no hay fila.
 * Quien ya no está en la plantilla tampoco sale: su fila no se puede cambiar
 * aquí, y reescribirla solo serviría para pisar lo que otro haya corregido.
 */
export function filasAGuardar(lineas: readonly LineaDeLista[]): FilaDeAsistencia[] {
  const filas: FilaDeAsistencia[] = [];

  for (const linea of lineas) {
    if (linea.status !== null && !linea.fueraDePlantilla) {
      filas.push({
        player_id: linea.playerId,
        status: linea.status,
        notes: observacionLimpia(linea.notes),
      });
    }
  }

  return filas;
}

/**
 * Lo que queda guardado en la base después de guardar esas líneas. Se pone en
 * la caché nada más guardar, para que la pantalla no vuelva un momento a lo de
 * antes mientras llega la relectura.
 */
export function asistenciaTrasGuardar(lineas: readonly LineaDeLista[]): Asistencia[] {
  const guardadas: Asistencia[] = [];

  for (const linea of lineas) {
    if (linea.status !== null) {
      guardadas.push({
        playerId: linea.playerId,
        nickname: linea.nickname,
        status: linea.status,
        notes: observacionLimpia(linea.notes),
      });
    }
  }

  return guardadas;
}

/**
 * Lo tocado que sigue sin guardar después de guardar bien. Casi siempre,
 * nada: lo guardado manda. Quedan dos cosas.
 *
 * La observación escrita a un jugador que se mandó sin marcar. No tiene fila
 * donde ir, y tirarla sin decir nada sería perder lo escrito: se queda, y en
 * el borrador, hasta que se marque al jugador o se descarte.
 *
 * Y lo que se tocó mientras la petición estaba en camino, que no viajó: los
 * radios no se bloquean al guardar, que con mala cobertura son muchos
 * segundos. Es lo que hay en `actuales` y no es igual en `enviados`.
 *
 * @param actuales lo tocado en el momento en que la base contesta
 * @param enviados lo tocado en el momento de guardar
 * @param lineas las líneas que se mandaron
 */
export function cambiosTrasGuardar(
  actuales: Cambios,
  enviados: Cambios,
  lineas: readonly LineaDeLista[],
): Cambios {
  const sinFila = new Set(
    lineas
      .filter((linea) => linea.status === null && !linea.fueraDePlantilla)
      .map((linea) => linea.playerId),
  );
  const cambios: Cambios = { estados: {}, observaciones: {} };

  for (const [playerId, estado] of Object.entries(actuales.estados)) {
    if (estado !== undefined && estado !== enviados.estados[playerId]) {
      cambios.estados[playerId] = estado;
    }
  }

  for (const [playerId, observacion] of Object.entries(actuales.observaciones)) {
    if (observacion === undefined) {
      continue;
    }

    const tocadaDespues = observacion !== enviados.observaciones[playerId];
    const sinGuardar = sinFila.has(playerId) && limpiarTexto(observacion) !== '';

    if (tocadaDespues || sinGuardar) {
      cambios.observaciones[playerId] = observacion;
    }
  }

  return cambios;
}

/** Si hay algo tocado y sin guardar. */
export function hayCambios(cambios: Cambios): boolean {
  return Object.keys(cambios.estados).length > 0 || Object.keys(cambios.observaciones).length > 0;
}

// --- El borrador -------------------------------------------------------------
//
// Cada cambio se escribe en `localStorage`: si la pantalla se bloquea, se
// recarga o falla el guardado, lo marcado sigue ahí. Lleva el `userId` de
// quien lo tocó: en un móvil compartido, el borrador de una cuenta no se le
// enseña a otra.
//
// Ninguna de estas funciones lanza. `window.localStorage` se nombra dentro del
// `try`: con el almacenamiento bloqueado, lanza solo con nombrarlo.
//
// Sin cuenta (`userId` vacío) no hay borrador: ni se lee ni se escribe. La
// ruta va tras la sesión y no debería pasar, pero un borrador de nadie se le
// enseñaría a cualquiera.

export function claveDeBorrador(sesionId: string): string {
  return `sasi.lista.${sesionId}`;
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

/**
 * Convierte lo guardado en `Cambios`. Lo que no se entiende, lo que es de otra
 * cuenta y lo que no trae nada dentro devuelven `null`; dentro de un borrador
 * válido, la entrada que no se entiende se deja fuera.
 */
export function interpretarBorrador(crudo: string | null, userId: string): Cambios | null {
  if (crudo === null || userId === '') {
    return null;
  }

  let datos: unknown;

  try {
    datos = JSON.parse(crudo);
  } catch {
    return null;
  }

  if (!esObjeto(datos) || datos.userId !== userId) {
    return null;
  }

  if (!esObjeto(datos.estados) || !esObjeto(datos.observaciones)) {
    return null;
  }

  const cambios: Cambios = { estados: {}, observaciones: {} };

  for (const [playerId, estado] of Object.entries(datos.estados)) {
    if (esEstado(estado)) {
      cambios.estados[playerId] = estado;
    }
  }

  for (const [playerId, observacion] of Object.entries(datos.observaciones)) {
    if (typeof observacion === 'string') {
      cambios.observaciones[playerId] = observacion;
    }
  }

  return hayCambios(cambios) ? cambios : null;
}

/** El borrador de esa cuenta para ese entrenamiento, o `null`. */
export function leerBorrador(
  sesionId: string,
  userId: string,
  almacen?: Pick<Storage, 'getItem'>,
): Cambios | null {
  try {
    return interpretarBorrador(
      (almacen ?? window.localStorage).getItem(claveDeBorrador(sesionId)),
      userId,
    );
  } catch {
    return null;
  }
}

/** Quita el borrador de ese entrenamiento. */
export function borrarBorrador(sesionId: string, almacen?: Pick<Storage, 'removeItem'>): void {
  try {
    (almacen ?? window.localStorage).removeItem(claveDeBorrador(sesionId));
  } catch {
    // Sin almacenamiento no había borrador que quitar.
  }
}

/**
 * Escribe el borrador, o lo quita si no queda nada tocado. Si no se puede, lo
 * marcado dura lo que dure la pantalla.
 */
export function guardarBorrador(
  sesionId: string,
  userId: string,
  cambios: Cambios,
  almacen?: Pick<Storage, 'setItem' | 'removeItem'>,
): void {
  if (userId === '') {
    return;
  }

  if (!hayCambios(cambios)) {
    borrarBorrador(sesionId, almacen);
    return;
  }

  try {
    (almacen ?? window.localStorage).setItem(
      claveDeBorrador(sesionId),
      JSON.stringify({ userId, estados: cambios.estados, observaciones: cambios.observaciones }),
    );
  } catch {
    // Sin almacenamiento, el cambio vale para esta visita.
  }
}
