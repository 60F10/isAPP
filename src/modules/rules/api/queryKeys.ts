// Claves de consulta del módulo `rules` (DOC 06 §5.3).

export const rulesKeys = {
  all: ['rules'] as const,
  competiciones: (clubId: string, temporadaId: string) =>
    [...rulesKeys.all, 'competiciones', clubId, temporadaId] as const,
  competicion: (competicionId: string) => [...rulesKeys.all, 'competicion', competicionId] as const,
};
