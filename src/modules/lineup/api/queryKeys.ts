// Claves de consulta del módulo `lineup` (DOC 06 §5.3).

export const lineupKeys = {
  all: ['lineup'] as const,
  convocatoria: (partidoId: string) => [...lineupKeys.all, 'convocatoria', partidoId] as const,
};
