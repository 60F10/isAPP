// Claves de consulta de `review` (DOC 06 §5.3).

export const reviewKeys = {
  all: ['review'] as const,
  cierre: (partidoId: string) => [...reviewKeys.all, 'cierre', partidoId] as const,
  cola: (partidoId: string) => [...reviewKeys.all, 'cola', partidoId] as const,
  autores: (ids: readonly string[]) => [...reviewKeys.all, 'autores', ids] as const,
  /** El prefijo de las de «Mis aportaciones»: para invalidarlas todas. */
  aportaciones: () => [...reviewKeys.all, 'aportaciones'] as const,
  aportacionesDe: (teamId: string, seasonId: string, userId: string) =>
    [...reviewKeys.aportaciones(), teamId, seasonId, userId] as const,
};
