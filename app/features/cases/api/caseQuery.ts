import type { CaseListParams } from '~/features/cases/type';

export const caseQueryKeys = {
  all: ['cases'] as const,
  lists: () => [...caseQueryKeys.all, 'list'] as const,
  list: (params: CaseListParams) => [...caseQueryKeys.lists(), params] as const,
};
