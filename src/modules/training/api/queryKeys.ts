// Claves de consulta del módulo `training` (DOC 06 §5.3).

export const trainingKeys = {
  all: ['training'] as const,
  lista: (equipoId: string, temporadaId: string) =>
    [...trainingKeys.all, 'lista', equipoId, temporadaId] as const,
  sesion: (id: string) => [...trainingKeys.all, 'sesion', id] as const,
};
