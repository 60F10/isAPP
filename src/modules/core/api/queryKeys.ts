// Claves de consulta del módulo `core` (DOC 06 §5.3). Mismo patrón que
// `authKeys`: una fábrica y ningún literal suelto por los componentes.

export const coreKeys = {
  all: ['core'] as const,
  club: (clubId: string) => [...coreKeys.all, 'club', clubId] as const,
  equipos: (clubId: string) => [...coreKeys.all, 'equipos', clubId] as const,
  equipo: (equipoId: string) => [...coreKeys.all, 'equipo', equipoId] as const,
  /** Todo lo de la plantilla de un equipo: la lista y cada ficha. */
  plantillaDe: (equipoId: string) => [...coreKeys.all, 'plantilla', equipoId] as const,
  plantilla: (equipoId: string, temporadaId: string) =>
    [...coreKeys.plantillaDe(equipoId), temporadaId] as const,
  bajas: (equipoId: string, temporadaId: string) =>
    [...coreKeys.plantillaDe(equipoId), temporadaId, 'bajas'] as const,
  delClubSinInscribir: (equipoId: string, temporadaId: string) =>
    [...coreKeys.plantillaDe(equipoId), temporadaId, 'del-club'] as const,
  inscripcion: (equipoId: string, temporadaId: string, jugadorId: string) =>
    [...coreKeys.plantillaDe(equipoId), temporadaId, 'jugador', jugadorId] as const,
};
