import { useQuery } from '@tanstack/react-query';

import { requestReceivableDetail } from '~/features/receivables/api/receivableApi';
import { receivableQueryKeys } from '~/features/receivables/api/receivableQuery';

import type { UseQueryResult } from '@tanstack/react-query';
import type { ReceivableDetail } from '~/features/receivables/type';

export function useReceivableDetail(customerId: string): UseQueryResult<ReceivableDetail> {
  return useQuery({
    queryKey: receivableQueryKeys.detail(customerId),
    queryFn: ({ signal }) => requestReceivableDetail(customerId, signal),
    enabled: customerId !== '',
  });
}
