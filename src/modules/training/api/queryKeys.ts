// Claves de consulta del módulo `training` (DOC 06 §5.3).

export const trainingKeys = {
  all: ['training'] as const,
  lista: (equipoId: string, temporadaId: string) =>
    [...trainingKeys.all, 'lista', equipoId, temporadaId] as const,
  sesion: (id: string) => [...trainingKeys.all, 'sesion', id] as const,
  finDeTemporada: (temporadaId: string) =>
    [...trainingKeys.all, 'fin-de-temporada', temporadaId] as const,
  asistencia: (sesionId: string) => [...trainingKeys.all, 'asistencia', sesionId] as const,
};
