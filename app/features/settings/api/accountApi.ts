import {
  isAccountNameResponse,
  isAccountPasswordResponse,
  isAccountProfile,
} from '~/features/settings/type';
import { ApiError, apiClient } from '~/lib/apiClient';

import type {
  AccountNameResponse,
  AccountNameSubmission,
  AccountPasswordResponse,
  AccountPasswordSubmission,
  AccountProfile,
} from '~/features/settings/type';

const accountApiPath = '/api/account';
const accountPasswordApiPath = '/api/account/password';

export async function requestAccountProfile(signal?: AbortSignal): Promise<AccountProfile> {
  const result = await apiClient(accountApiPath, { signal });
  if (!result.ok || !isAccountProfile(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestAccountNameUpdate(
  submission: AccountNameSubmission,
): Promise<AccountNameResponse> {
  const result = await apiClient(accountApiPath, { method: 'PATCH', body: submission });
  if (!isAccountNameResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestAccountPasswordUpdate(
  submission: AccountPasswordSubmission,
): Promise<AccountPasswordResponse> {
  const result = await apiClient(accountPasswordApiPath, { method: 'POST', body: submission });
  if (!isAccountPasswordResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}
