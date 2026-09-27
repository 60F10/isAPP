// Claves de consulta de `review` (DOC 06 §5.3).

export const reviewKeys = {
  all: ['review'] as const,
  cierre: (partidoId: string) => [...reviewKeys.all, 'cierre', partidoId] as const,
  cola: (partidoId: string) => [...reviewKeys.all, 'cola', partidoId] as const,
};
