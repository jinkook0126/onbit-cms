import { updateCustomerCaseType } from '~/features/customers/api/customers.server';
import { isCustomerCaseTypeSubmission } from '~/features/customers/type';
import { jsonResponse } from '~/lib/jsonResponse.server';

import type { Route } from './+types/api.customer-case-type';

const INVALID_REQUEST_MESSAGE = '사건 유형을 처리하지 못했습니다. 다시 시도하세요.';
const UNAUTHENTICATED_MESSAGE = '다시 로그인하세요.';
const FORBIDDEN_MESSAGE = '사건 유형을 변경할 권한이 없습니다.';
const NOT_FOUND_MESSAGE = '상담 고객을 찾을 수 없습니다.';
const MISSING_CASE_MESSAGE = '수임 후에 사건 유형을 바꿀 수 있습니다.';
const UPDATE_FAILED_MESSAGE = '사건 유형을 변경하지 못했습니다. 다시 시도하세요.';

export function loader(): Response {
  return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 405);
}

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
  if (!isCustomerCaseTypeSubmission(payload)) {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }

  const { result, headers } = await updateCustomerCaseType(
    request,
    params.customerId,
    payload.caseType,
  );
  switch (result.status) {
    case 'ok':
      return jsonResponse({ caseType: result.caseType }, 200, headers);
    case 'anonymous':
      return jsonResponse({ formError: UNAUTHENTICATED_MESSAGE }, 401, headers);
    case 'forbidden':
      return jsonResponse({ formError: FORBIDDEN_MESSAGE }, 403, headers);
    case 'not-found':
      return jsonResponse({ formError: NOT_FOUND_MESSAGE }, 404, headers);
    case 'missing-case':
      return jsonResponse({ formError: MISSING_CASE_MESSAGE }, 400, headers);
    case 'failed':
      return jsonResponse({ formError: UPDATE_FAILED_MESSAGE }, 500, headers);
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}
