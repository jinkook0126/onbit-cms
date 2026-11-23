import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { requestReceivableList } from '~/features/receivables/api/receivableApi';
import { receivableQueryKeys } from '~/features/receivables/api/receivableQuery';

import type { UseQueryResult } from '@tanstack/react-query';
import type { ReceivableListParams, ReceivableListResponse } from '~/features/receivables/type';

export function useReceivableList(
  params: ReceivableListParams,
  enabled = true,
): UseQueryResult<ReceivableListResponse> {
  return useQuery({
    queryKey: receivableQueryKeys.list(params),
    queryFn: ({ signal }) => requestReceivableList(params, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}
