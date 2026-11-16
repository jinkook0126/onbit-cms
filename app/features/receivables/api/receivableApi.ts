import { isReceivableListResponse } from '~/features/receivables/type';
import { ApiError, apiClient } from '~/lib/apiClient';

import type { ReceivableListParams, ReceivableListResponse } from '~/features/receivables/type';

const receivablesApiPath = '/api/receivables';

function receivablesPath(params: ReceivableListParams): string {
  const search = new URLSearchParams();
  if (params.field !== 'name') {
    search.set('field', params.field);
  }
  if (params.keyword !== '') {
    search.set('q', params.keyword);
  }
  if (params.page > 1) {
    search.set('page', String(params.page));
  }
  const query = search.toString();
  if (query === '') {
    return receivablesApiPath;
  }
  return `${receivablesApiPath}?${query}`;
}

export async function requestReceivableList(
  params: ReceivableListParams,
  signal?: AbortSignal,
): Promise<ReceivableListResponse> {
  const result = await apiClient(receivablesPath(params), { signal });
  if (!result.ok || !isReceivableListResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}
