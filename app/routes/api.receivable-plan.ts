import { saveReceivablePlan } from '~/features/receivables/api/receivablePlan.server';
import { isReceivablePlanSubmission } from '~/features/receivables/type';
import { jsonResponse } from '~/lib/jsonResponse.server';

import type { Route } from './+types/api.receivable-plan';

const INVALID_REQUEST_MESSAGE = '분납 계획을 처리하지 못했습니다. 다시 시도하세요.';
const UNAUTHENTICATED_MESSAGE = '다시 로그인하세요.';
const FORBIDDEN_MESSAGE = '분납 계획을 수정할 권한이 없습니다.';
const NOT_FOUND_MESSAGE = '분납 고객을 찾을 수 없습니다.';
const LOCKED_MESSAGE = '입금이 등록된 분납 계획은 수정할 수 없습니다.';
const SAVE_FAILED_MESSAGE = '분납 계획을 저장하지 못했습니다. 다시 시도하세요.';

export function loader(): Response {
  return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 405);
}

export async function action({ request, params }: Route.ActionArgs): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 405);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }
  if (!isReceivablePlanSubmission(payload)) {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }

  const { result, headers } = await saveReceivablePlan(request, params.customerId, payload);
  switch (result.status) {
    case 'ok':
      return jsonResponse({ id: result.id }, 200, headers);
    case 'invalid':
      return jsonResponse({ fieldErrors: result.fieldErrors }, 400, headers);
    case 'locked':
      return jsonResponse({ formError: LOCKED_MESSAGE }, 409, headers);
    case 'anonymous':
      return jsonResponse({ formError: UNAUTHENTICATED_MESSAGE }, 401, headers);
    case 'forbidden':
      return jsonResponse({ formError: FORBIDDEN_MESSAGE }, 403, headers);
    case 'not-found':
      return jsonResponse({ formError: NOT_FOUND_MESSAGE }, 404, headers);
    case 'failed':
      return jsonResponse({ formError: SAVE_FAILED_MESSAGE }, 500, headers);
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}
