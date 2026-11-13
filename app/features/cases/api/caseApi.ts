import { isCaseListResponse } from '~/features/cases/type';
import { ApiError, apiClient } from '~/lib/apiClient';

import type { CaseListParams, CaseListResponse } from '~/features/cases/type';

const casesApiPath = '/api/cases';

function casesPath(params: CaseListParams): string {
  const search = new URLSearchParams();
  if (params.field !== 'name') {
    search.set('field', params.field);
  }
  if (params.keyword !== '') {
    search.set('q', params.keyword);
  }
  if (params.stage) {
    search.set('stage', params.stage);
  }
  if (params.page > 1) {
    search.set('page', String(params.page));
  }
  const query = search.toString();
  if (query === '') {
    return casesApiPath;
  }
  return `${casesApiPath}?${query}`;
}

export async function requestCaseList(
  params: CaseListParams,
  signal?: AbortSignal,
): Promise<CaseListResponse> {
  const result = await apiClient(casesPath(params), { signal });
  if (!result.ok || !isCaseListResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}
