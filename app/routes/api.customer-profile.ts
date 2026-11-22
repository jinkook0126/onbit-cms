import { updateCustomerProfile } from '~/features/customers/api/customers.server';
import { isCustomerProfileSubmission } from '~/features/customers/type';
import { jsonResponse } from '~/lib/jsonResponse.server';

import type { Route } from './+types/api.customer-profile';

const INVALID_REQUEST_MESSAGE = '상담 고객 정보를 처리하지 못했습니다. 다시 시도하세요.';
const UNAUTHENTICATED_MESSAGE = '다시 로그인하세요.';
const FORBIDDEN_MESSAGE = '상담 고객을 수정할 권한이 없습니다.';
const NOT_FOUND_MESSAGE = '상담 고객을 찾을 수 없습니다.';
const UPDATE_FAILED_MESSAGE = '상담 고객을 수정하지 못했습니다. 다시 시도하세요.';
const DUPLICATE_MESSAGE = '같은 이름과 연락처의 고객이 이미 있습니다.';

export async function action({ request, params }: Route.ActionArgs): Promise<Response> {
  if (request.method !== 'PATCH') {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 405);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }
  if (!isCustomerProfileSubmission(payload)) {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }

  const { result, headers } = await updateCustomerProfile(request, params.customerId, payload);
  switch (result.status) {
    case 'ok':
      return jsonResponse({ id: result.id }, 200, headers);
    case 'invalid':
      return jsonResponse({ fieldErrors: result.fieldErrors }, 400, headers);
    case 'duplicate':
      return jsonResponse({ formError: DUPLICATE_MESSAGE }, 400, headers);
    case 'anonymous':
      return jsonResponse({ formError: UNAUTHENTICATED_MESSAGE }, 401, headers);
    case 'forbidden':
      return jsonResponse({ formError: FORBIDDEN_MESSAGE }, 403, headers);
    case 'not-found':
      return jsonResponse({ formError: NOT_FOUND_MESSAGE }, 404, headers);
    case 'failed':
      return jsonResponse({ formError: UPDATE_FAILED_MESSAGE }, 500, headers);
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}
