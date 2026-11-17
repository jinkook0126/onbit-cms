import {
  assignCustomerAssignees,
  readCustomerAssignees,
} from '~/features/customers/api/customers.server';
import { isCustomerAssigneeBatchSubmission } from '~/features/customers/type';
import { jsonResponse } from '~/lib/jsonResponse.server';

import type { Route } from './+types/api.customer-assignees';

const INVALID_REQUEST_MESSAGE = '상담 담당 정보를 처리하지 못했습니다. 다시 시도하세요.';
const UNAUTHENTICATED_MESSAGE = '다시 로그인하세요.';
const FORBIDDEN_MESSAGE = '상담 고객을 등록할 권한이 없습니다.';
const READ_FAILED_MESSAGE = '상담 담당 목록을 불러오지 못했습니다. 다시 시도하세요.';
const ASSIGNEE_INVALID_MESSAGE = '담당을 다시 선택하세요.';
const NOT_FOUND_MESSAGE = '선택한 고객을 찾지 못했습니다.';
const UPDATE_FAILED_MESSAGE = '담당을 등록하지 못했습니다. 다시 시도하세요.';

export async function loader({ request }: Route.LoaderArgs): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 405);
  }

  const { result, headers } = await readCustomerAssignees(request);
  switch (result.status) {
    case 'ok':
      return jsonResponse(
        { currentUserId: result.currentUserId, assignees: result.assignees },
        200,
        headers,
      );
    case 'anonymous':
      return jsonResponse({ formError: UNAUTHENTICATED_MESSAGE }, 401, headers);
    case 'forbidden':
      return jsonResponse({ formError: FORBIDDEN_MESSAGE }, 403, headers);
    case 'failed':
      return jsonResponse({ formError: READ_FAILED_MESSAGE }, 500, headers);
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
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
  if (!isCustomerAssigneeBatchSubmission(payload)) {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }

  const { result, headers } = await assignCustomerAssignees(
    request,
    payload.customerIds,
    payload.assigneeId,
  );
  switch (result.status) {
    case 'ok':
      return jsonResponse({ updatedCount: result.updatedCount }, 200, headers);
    case 'anonymous':
      return jsonResponse({ formError: UNAUTHENTICATED_MESSAGE }, 401, headers);
    case 'forbidden':
      return jsonResponse({ formError: FORBIDDEN_MESSAGE }, 403, headers);
    case 'bad-request':
      return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400, headers);
    case 'invalid':
      return jsonResponse({ formError: ASSIGNEE_INVALID_MESSAGE }, 400, headers);
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
