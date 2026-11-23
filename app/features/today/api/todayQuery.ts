export const todayQueryKeys = {
  all: ['today'] as const,
  work: (from: string, to: string) => [...todayQueryKeys.all, 'work', from, to] as const,
};
