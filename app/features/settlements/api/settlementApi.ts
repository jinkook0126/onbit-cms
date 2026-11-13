import { isSettlementResponse } from '~/features/settlements/type';
import { ApiError, apiClient } from '~/lib/apiClient';

import type { SettlementResponse } from '~/features/settlements/type';

export async function requestSettlement(
  month: string,
  signal?: AbortSignal,
): Promise<SettlementResponse> {
  const search = new URLSearchParams({ month });
  const result = await apiClient(`/api/settlements?${search.toString()}`, { signal });
  if (!result.ok || !isSettlementResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}
