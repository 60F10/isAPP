// Claves de consulta del módulo `core` (DOC 06 §5.3). Mismo patrón que
// `authKeys`: una fábrica y ningún literal suelto por los componentes.

export const coreKeys = {
  all: ['core'] as const,
  club: (clubId: string) => [...coreKeys.all, 'club', clubId] as const,
  equipos: (clubId: string) => [...coreKeys.all, 'equipos', clubId] as const,
};
