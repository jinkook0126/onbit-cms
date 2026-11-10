import { handleLoginSubmission } from '~/features/auth/api/login.server';
import { isLoginSubmission } from '~/features/auth/type';
import { mergeResponseHeaders } from '~/lib/supabase.server';

import type { LoginResponse } from '~/features/auth/type';
import type { Route } from './+types/api.login';

const INVALID_REQUEST_MESSAGE = '로그인하지 못했습니다. 다시 시도하세요.';

function jsonResponse(body: LoginResponse, status: number, extra?: Headers): Response {
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
  if (!isLoginSubmission(payload)) {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }

  const result = await handleLoginSubmission(request, payload);
  if (result.type === 'redirect') {
    return jsonResponse({ redirectTo: '/' }, 200, result.headers);
  }
  return jsonResponse(result.body, result.status ?? 200);
}
