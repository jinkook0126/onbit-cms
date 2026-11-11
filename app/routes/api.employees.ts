import { createEmployee, readEmployees } from '~/features/employees/api/employees.server';
import { isEmployeeCreateSubmission } from '~/features/employees/type';
import { mergeResponseHeaders } from '~/lib/supabase.server';

import type { Route } from './+types/api.employees';

const INVALID_REQUEST_MESSAGE = '직원 정보를 처리하지 못했습니다. 다시 시도하세요.';
const UNAUTHENTICATED_MESSAGE = '다시 로그인하세요.';
const FORBIDDEN_MESSAGE = '직원을 관리할 권한이 없습니다.';
const NOT_FOUND_MESSAGE = '회사를 찾을 수 없습니다.';
const CREATE_FAILED_MESSAGE = '직원을 등록하지 못했습니다. 다시 시도하세요.';

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

  const companyId = new URL(request.url).searchParams.get('companyId');
  const { result, headers } = await readEmployees(request, companyId);
  switch (result.status) {
    case 'ok':
      return jsonResponse(
        { company: result.company, companies: result.companies, employees: result.employees },
        200,
        headers,
      );
    case 'anonymous':
      return jsonResponse({ formError: UNAUTHENTICATED_MESSAGE }, 401, headers);
    case 'forbidden':
      return jsonResponse({ formError: FORBIDDEN_MESSAGE }, 403, headers);
    case 'not-found':
      return jsonResponse({ formError: NOT_FOUND_MESSAGE }, 404, headers);
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
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
  if (!isEmployeeCreateSubmission(payload)) {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }

  const { result, headers } = await createEmployee(
    request,
    payload.loginId,
    payload.name,
    payload.companyId,
  );
  switch (result.status) {
    case 'ok':
      return jsonResponse({ employee: result.employee }, 200, headers);
    case 'invalid':
      return jsonResponse({ fieldErrors: result.fieldErrors }, 400, headers);
    case 'anonymous':
      return jsonResponse({ formError: UNAUTHENTICATED_MESSAGE }, 401, headers);
    case 'forbidden':
      return jsonResponse({ formError: FORBIDDEN_MESSAGE }, 403, headers);
    case 'not-found':
      return jsonResponse({ formError: NOT_FOUND_MESSAGE }, 404, headers);
    case 'failed':
      return jsonResponse({ formError: CREATE_FAILED_MESSAGE }, 500, headers);
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}
