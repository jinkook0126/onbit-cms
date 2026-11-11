import { readAccount, updateAccountName } from '~/features/settings/api/account.server';
import { isAccountNameSubmission } from '~/features/settings/type';
import { mergeResponseHeaders } from '~/lib/supabase.server';

import type { Route } from './+types/api.account';

const INVALID_REQUEST_MESSAGE = '계정 정보를 처리하지 못했습니다. 다시 시도하세요.';
const UNAUTHENTICATED_MESSAGE = '다시 로그인하세요.';
const NAME_FAILED_MESSAGE = '이름을 변경하지 못했습니다. 다시 시도하세요.';

function jsonResponse(body: unknown, status: number, extra?: Headers): Response {
  const response = Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
  if (!extra) {
    return response;
  }
  return mergeResponseHeaders(response, extra);
}

export async function loader({ request }: Route.LoaderArgs): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 405);
  }

  const { result, headers } = await readAccount(request);
  if (result.status === 'anonymous') {
    return jsonResponse({ formError: UNAUTHENTICATED_MESSAGE }, 401, headers);
  }
  return jsonResponse(result.profile, 200, headers);
}

export async function action({ request }: Route.ActionArgs): Promise<Response> {
  if (request.method !== 'PATCH') {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 405);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }
  if (!isAccountNameSubmission(payload)) {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }

  const { result, headers } = await updateAccountName(request, payload.name);
  switch (result.status) {
    case 'ok':
      return jsonResponse({ name: result.name }, 200, headers);
    case 'invalid':
      return jsonResponse({ fieldErrors: result.fieldErrors }, 400, headers);
    case 'anonymous':
      return jsonResponse({ formError: UNAUTHENTICATED_MESSAGE }, 401, headers);
    case 'failed':
      return jsonResponse({ formError: NAME_FAILED_MESSAGE }, 500, headers);
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}
