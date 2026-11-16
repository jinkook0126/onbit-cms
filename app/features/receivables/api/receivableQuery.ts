import type { ReceivableListParams } from '~/features/receivables/type';

export const receivableQueryKeys = {
  all: ['receivables'] as const,
  lists: () => [...receivableQueryKeys.all, 'list'] as const,
  list: (params: ReceivableListParams) => [...receivableQueryKeys.lists(), params] as const,
};
