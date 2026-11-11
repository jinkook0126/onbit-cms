import { updateAccountPassword } from '~/features/settings/api/account.server';
import { isAccountPasswordSubmission } from '~/features/settings/type';
import { mergeResponseHeaders } from '~/lib/supabase.server';

import type { AccountPasswordResponse } from '~/features/settings/type';
import type { Route } from './+types/api.account-password';

const INVALID_REQUEST_MESSAGE = '비밀번호를 변경하지 못했습니다. 다시 시도하세요.';
const UNAUTHENTICATED_MESSAGE = '다시 로그인하세요.';
const INVALID_CREDENTIALS_MESSAGE = '현재 비밀번호가 올바르지 않습니다.';

function jsonResponse(body: AccountPasswordResponse, status: number, extra?: Headers): Response {
  const response = Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
  if (!extra) {
    return response;
  }
  return mergeResponseHeaders(response, extra);
}

export function loader(): Response {
  return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 405);
}

export async function action({ request }: Route.ActionArgs): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 405);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }
  if (!isAccountPasswordSubmission(payload)) {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }

  const { result, headers } = await updateAccountPassword(
    request,
    payload.currentPassword,
    payload.newPassword,
    payload.confirmPassword,
  );

  switch (result.status) {
    case 'ok':
      return jsonResponse({ passwordChanged: true }, 200, headers);
    case 'invalid':
      return jsonResponse({ fieldErrors: result.fieldErrors }, 400, headers);
    case 'invalid-credentials':
      return jsonResponse({ formError: INVALID_CREDENTIALS_MESSAGE }, 401, headers);
    case 'anonymous':
      return jsonResponse({ formError: UNAUTHENTICATED_MESSAGE }, 401, headers);
    case 'failed':
      return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 500, headers);
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}
