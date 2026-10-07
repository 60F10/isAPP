// Claves de consulta del módulo `auth` (DOC 06 §5.3).
//
// Una fábrica por módulo y ningún literal suelto por los componentes: una
// clave mal escrita invalida otra cosa y el fallo no da la cara hasta dos
// pantallas después.

export const authKeys = {
  all: ['auth'] as const,
  /**
   * Contexto de acceso de un usuario. El identificador entra en la clave a
   * propósito: si entra otro usuario en el mismo dispositivo, la caché no le
   * sirve los equipos ni los permisos del anterior.
   */
  contexto: (userId: string | null) => [...authKeys.all, 'contexto', userId] as const,
  /** Miembros de un equipo, con sus permisos (A07). */
  miembros: (teamId: string) => [...authKeys.all, 'miembros', teamId] as const,
  /** Invitaciones pendientes de un equipo (A07). */
  invitaciones: (teamId: string) => [...authKeys.all, 'invitaciones', teamId] as const,
  /** Invitaciones dirigidas a la cuenta que ha entrado (tarjeta de Inicio). */
  misInvitaciones: (userId: string | null) =>
    [...authKeys.all, 'mis-invitaciones', userId] as const,
};
