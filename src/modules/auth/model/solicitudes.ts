// Seguir a un equipo y pedirle permisos (T-301c, DOC 05 §14.8).
//
// Vive en `model/` porque no sabe de React ni de red (DOC 06 §3.2).
//
// SEGUIR ES INMEDIATO; TENER PERMISOS, NO (decisión I1). Quien sigue lee desde
// ese momento. Quien pide permisos deja una solicitud, y hasta que la acepte
// alguien con `members.manage` no cambia nada.
//
// De las personas, aquí solo hay `display_name`.

import { mensajeDeErrorAlGuardar } from '@shared/lib/guardado';

import type { Enums } from '@app-types/database.types';

export type EstadoDeSolicitud = Enums<'access_request_status'>;

/** El tope de la base: `access_requests_message`, DOC 05 §14.8. */
export const LARGO_MAXIMO_DEL_MENSAJE = 280;

/** El estado de una solicitud, en palabras. */
export const NOMBRES_DE_ESTADO: Record<EstadoDeSolicitud, string> = {
  pending: 'Pendiente',
  approved: 'Aceptada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
};

/** Un equipo que está en la lista (`equipos_que_admiten_solicitudes`). */
export interface EquipoDeLaLista {
  teamId: string;
  teamName: string;
  clubName: string;
  category: string | null;
}

/** Una solicitud de quien ha entrado. */
export interface MiSolicitud {
  id: string;
  teamId: string;
  status: EstadoDeSolicitud;
  createdAt: string;
}

/** Una solicitud pendiente que ha recibido el equipo (`solicitudes_del_equipo`). */
export interface SolicitudRecibida {
  id: string;
  userId: string;
  /** `display_name` del perfil. `null` si la persona no tiene nombre puesto. */
  nombre: string | null;
  mensaje: string | null;
  createdAt: string;
}

/** Alguien que sigue al equipo (`seguidores_del_equipo`). */
export interface Seguidor {
  userId: string;
  nombre: string | null;
  createdAt: string;
}

export interface ResultadoMensaje {
  /** El mensaje listo para enviar. `null` es «sin mensaje», que también vale. */
  mensaje: string | null;
  /** Si no es `null`, la solicitud no se envía. */
  error: string | null;
}

/**
 * Deja el mensaje de la solicitud como lo guarda la base: recortado, y `null`
 * si no dice nada. El mensaje es opcional; lo que no puede es pasar del tope.
 *
 * Cuenta caracteres y no unidades de UTF-16, que es lo que cuenta
 * `char_length`: un emoji es uno.
 */
export function validarMensaje(texto: string): ResultadoMensaje {
  const mensaje = texto.trim();

  if (mensaje === '') {
    return { mensaje: null, error: null };
  }

  const sobran = [...mensaje].length - LARGO_MAXIMO_DEL_MENSAJE;

  if (sobran > 0) {
    return {
      mensaje: null,
      error: `El mensaje no puede pasar de ${String(LARGO_MAXIMO_DEL_MENSAJE)} caracteres. ${
        sobran === 1 ? 'Sobra 1.' : `Sobran ${String(sobran)}.`
      }`,
    };
  }

  return { mensaje, error: null };
}

/** Nombre para enseñar: el del perfil, o un texto que diga que no lo hay. */
export function nombreDePersona(nombre: string | null): string {
  return nombre === null || nombre.trim() === '' ? 'Sin nombre' : nombre;
}

/**
 * Frase para cuando una función de la base dice que no.
 *
 * Lo que rechaza la función ya viene en español y dice el motivo («Ese equipo
 * no admite seguidores»): se enseña tal cual. Lo que no viene de la función
 * —sin red, o un `PGRST…` de PostgREST, que habla en inglés— pasa por el
 * texto común.
 *
 * DEUDA (T-301c): `InvitacionesPendientes` tiene una copia privada de esta
 * misma función desde la T-301b.
 */
export function mensajeDeLaBase(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    !error.code.startsWith('PGRST') &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message !== ''
  ) {
    return error.message;
  }

  return mensajeDeErrorAlGuardar(error);
}

/** «6 de octubre», en la hora del móvil. */
export function diaDe(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
}
