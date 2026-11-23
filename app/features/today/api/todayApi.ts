import { isTodayWork } from '~/features/today/type';
import { ApiError, apiClient } from '~/lib/apiClient';

import type { TodayWork } from '~/features/today/type';

export async function requestTodayWork(
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<TodayWork> {
  const search = new URLSearchParams({ from, to });
  const result = await apiClient(`/api/today?${search.toString()}`, { signal });
  if (!result.ok || !isTodayWork(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}
