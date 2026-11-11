import { updateEmployeeTeam } from '~/features/employees/api/employees.server';
import { isEmployeeTeamSubmission } from '~/features/employees/type';
import { mergeResponseHeaders } from '~/lib/supabase.server';

import type { Route } from './+types/api.employee';

const INVALID_REQUEST_MESSAGE = '직원 정보를 처리하지 못했습니다. 다시 시도하세요.';
const UNAUTHENTICATED_MESSAGE = '다시 로그인하세요.';
const FORBIDDEN_MESSAGE = '직원을 관리할 권한이 없습니다.';
const NOT_FOUND_MESSAGE = '직원을 찾을 수 없습니다.';
const UPDATE_FAILED_MESSAGE = '직원 팀을 변경하지 못했습니다. 다시 시도하세요.';

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
  if (!isEmployeeTeamSubmission(payload)) {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }

  const { result, headers } = await updateEmployeeTeam(request, params.employeeId, payload.teamId);
  switch (result.status) {
    case 'ok':
      return jsonResponse({ teamId: result.teamId, teamName: result.teamName }, 200, headers);
    case 'invalid':
      return jsonResponse({ formError: result.formError }, 400, headers);
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
