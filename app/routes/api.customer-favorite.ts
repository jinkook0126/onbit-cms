import { setCustomerFavorite } from '~/features/customers/api/customers.server';
import { isCustomerFavoriteSubmission } from '~/features/customers/type';
import { jsonResponse } from '~/lib/jsonResponse.server';

import type { Route } from './+types/api.customer-favorite';

const INVALID_REQUEST_MESSAGE = '즐겨찾기를 바꾸지 못했습니다. 다시 시도하세요.';
const UNAUTHENTICATED_MESSAGE = '다시 로그인하세요.';
const FORBIDDEN_MESSAGE = '상담 고객을 볼 권한이 없습니다.';
const NOT_FOUND_MESSAGE = '상담 고객을 찾을 수 없습니다.';
const FAILED_MESSAGE = '즐겨찾기를 바꾸지 못했습니다. 다시 시도하세요.';

export async function action({ request, params }: Route.ActionArgs): Promise<Response> {
  if (request.method !== 'PUT') {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 405);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }
  if (!isCustomerFavoriteSubmission(payload)) {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }

  const { result, headers } = await setCustomerFavorite(
    request,
    params.customerId,
    payload.favorited,
  );
  switch (result.status) {
    case 'ok':
      return jsonResponse({ favorited: result.favorited }, 200, headers);
    case 'anonymous':
      return jsonResponse({ formError: UNAUTHENTICATED_MESSAGE }, 401, headers);
    case 'forbidden':
      return jsonResponse({ formError: FORBIDDEN_MESSAGE }, 403, headers);
    case 'not-found':
      return jsonResponse({ formError: NOT_FOUND_MESSAGE }, 404, headers);
    case 'failed':
      return jsonResponse({ formError: FAILED_MESSAGE }, 500, headers);
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}
