export const accountQueryKeys = {
  all: ['account'] as const,
  profile: () => [...accountQueryKeys.all, 'profile'] as const,
};
