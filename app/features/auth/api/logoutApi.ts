import { ApiError, apiClient } from '~/lib/apiClient';

export async function requestLogout(): Promise<void> {
  const result = await apiClient('/api/logout', { method: 'POST' });
  if (!result.ok) {
    throw new ApiError(result.status, result.body);
  }
}
