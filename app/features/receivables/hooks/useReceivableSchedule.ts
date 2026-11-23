import { useQuery } from '@tanstack/react-query';

import { requestReceivableSchedule } from '~/features/receivables/api/receivableApi';
import { receivableQueryKeys } from '~/features/receivables/api/receivableQuery';

import type { UseQueryResult } from '@tanstack/react-query';
import type {
  ReceivableScheduleParams,
  ReceivableScheduleResponse,
} from '~/features/receivables/type';

export function useReceivableSchedule(
  params: ReceivableScheduleParams,
  enabled: boolean,
): UseQueryResult<ReceivableScheduleResponse> {
  return useQuery({
    queryKey: receivableQueryKeys.schedule(params),
    queryFn: ({ signal }) => requestReceivableSchedule(params, signal),
    enabled,
  });
}
