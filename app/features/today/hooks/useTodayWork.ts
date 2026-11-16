import { useQuery } from '@tanstack/react-query';

import { requestTodayWork } from '~/features/today/api/todayApi';
import { todayQueryKeys } from '~/features/today/api/todayQuery';

import type { UseQueryResult } from '@tanstack/react-query';
import type { TodayWork } from '~/features/today/type';

export function useTodayWork(): UseQueryResult<TodayWork> {
  return useQuery({
    queryKey: todayQueryKeys.work(),
    queryFn: ({ signal }) => requestTodayWork(signal),
  });
}
