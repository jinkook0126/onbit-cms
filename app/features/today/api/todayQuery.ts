export const todayQueryKeys = {
  all: ['today'] as const,
  work: () => [...todayQueryKeys.all, 'work'] as const,
};
