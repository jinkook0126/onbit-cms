import { createCompanyMaster } from '~/features/companies/api/companies.server';
import { isCompanyMasterSubmission } from '~/features/companies/type';
import { mergeResponseHeaders } from '~/lib/supabase.server';

import type { Route } from './+types/api.company-master';

const INVALID_REQUEST_MESSAGE = '마스터 계정을 처리하지 못했습니다. 다시 시도하세요.';
const UNAUTHENTICATED_MESSAGE = '다시 로그인하세요.';
const FORBIDDEN_MESSAGE = '회사를 관리할 권한이 없습니다.';
const NOT_FOUND_MESSAGE = '회사를 찾을 수 없습니다.';
const CONFLICT_MESSAGE = '이미 마스터 계정이 있습니다.';
const CREATE_FAILED_MESSAGE = '마스터 계정을 만들지 못했습니다. 다시 시도하세요.';

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
  if (request.method !== 'POST') {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 405);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }
  if (!isCompanyMasterSubmission(payload)) {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }

  const { result, headers } = await createCompanyMaster(
    request,
    params.companyId,
    payload.loginId,
    payload.name,
  );
  switch (result.status) {
    case 'ok':
      return jsonResponse(
        { master: result.master, temporaryPassword: result.temporaryPassword },
        200,
        headers,
      );
    case 'invalid':
      return jsonResponse({ fieldErrors: result.fieldErrors }, 400, headers);
    case 'anonymous':
      return jsonResponse({ formError: UNAUTHENTICATED_MESSAGE }, 401, headers);
    case 'forbidden':
      return jsonResponse({ formError: FORBIDDEN_MESSAGE }, 403, headers);
    case 'not-found':
      return jsonResponse({ formError: NOT_FOUND_MESSAGE }, 404, headers);
    case 'conflict':
      return jsonResponse({ formError: CONFLICT_MESSAGE }, 409, headers);
    case 'failed':
      return jsonResponse({ formError: CREATE_FAILED_MESSAGE }, 500, headers);
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}
