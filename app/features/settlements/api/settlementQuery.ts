export const settlementQueryKeys = {
  all: ['settlements'] as const,
  detail: (month: string) => [...settlementQueryKeys.all, month] as const,
};
