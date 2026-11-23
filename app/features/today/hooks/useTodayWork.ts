import { useQuery } from '@tanstack/react-query';

import { requestTodayWork } from '~/features/today/api/todayApi';
import { todayQueryKeys } from '~/features/today/api/todayQuery';

import type { UseQueryResult } from '@tanstack/react-query';
import type { TodayWork } from '~/features/today/type';

export function useTodayWork(from: string, to: string, enabled = true): UseQueryResult<TodayWork> {
  return useQuery({
    queryKey: todayQueryKeys.work(from, to),
    queryFn: ({ signal }) => requestTodayWork(from, to, signal),
    enabled,
  });
}
