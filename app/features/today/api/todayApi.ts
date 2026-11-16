import { isTodayWork } from '~/features/today/type';
import { ApiError, apiClient } from '~/lib/apiClient';

import type { TodayWork } from '~/features/today/type';

export async function requestTodayWork(signal?: AbortSignal): Promise<TodayWork> {
  const result = await apiClient('/api/today', { signal });
  if (!result.ok || !isTodayWork(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}
