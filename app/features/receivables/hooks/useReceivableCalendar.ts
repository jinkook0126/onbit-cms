import { useQuery } from '@tanstack/react-query';

import { requestReceivableCalendar } from '~/features/receivables/api/receivableApi';
import { receivableQueryKeys } from '~/features/receivables/api/receivableQuery';

import type { UseQueryResult } from '@tanstack/react-query';
import type {
  ReceivableCalendarParams,
  ReceivableCalendarResponse,
} from '~/features/receivables/type';

export function useReceivableCalendar(
  params: ReceivableCalendarParams,
): UseQueryResult<ReceivableCalendarResponse> {
  return useQuery({
    queryKey: receivableQueryKeys.calendar(params),
    queryFn: ({ signal }) => requestReceivableCalendar(params, signal),
  });
}
