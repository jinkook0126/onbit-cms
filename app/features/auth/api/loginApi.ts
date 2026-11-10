import { isLoginResponse } from '~/features/auth/type';
import { ApiError, apiClient } from '~/lib/apiClient';

import type { LoginResponse, LoginSubmission } from '~/features/auth/type';

const loginApiPath = '/api/login';

export async function requestLogin(submission: LoginSubmission): Promise<LoginResponse> {
  const result = await apiClient(loginApiPath, { method: 'POST', body: submission });
  if (!isLoginResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}
