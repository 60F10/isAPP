// Claves de consulta del módulo `agenda` (DOC 06 §5.3).

export const agendaKeys = {
  all: ['agenda'] as const,
  calendario: (equipoId: string, temporadaId: string) =>
    [...agendaKeys.all, 'calendario', equipoId, temporadaId] as const,
  partido: (partidoId: string) => [...agendaKeys.all, 'partido', partidoId] as const,
};
