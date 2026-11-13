import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { requestCaseList } from '~/features/cases/api/caseApi';
import { caseQueryKeys } from '~/features/cases/api/caseQuery';

import type { UseQueryResult } from '@tanstack/react-query';
import type { CaseListParams, CaseListResponse } from '~/features/cases/type';

export function useCaseList(params: CaseListParams): UseQueryResult<CaseListResponse> {
  return useQuery({
    queryKey: caseQueryKeys.list(params),
    queryFn: ({ signal }) => requestCaseList(params, signal),
    placeholderData: keepPreviousData,
  });
}
