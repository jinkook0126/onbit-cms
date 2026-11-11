import {
  readCompany,
  updateCompanyName,
  updateCompanyStatus,
} from '~/features/companies/api/companies.server';
import { isCompanyNameSubmission, isCompanyStatusSubmission } from '~/features/companies/type';
import { mergeResponseHeaders } from '~/lib/supabase.server';

import type { Route } from './+types/api.company';

const INVALID_REQUEST_MESSAGE = '회사 정보를 처리하지 못했습니다. 다시 시도하세요.';
const UNAUTHENTICATED_MESSAGE = '다시 로그인하세요.';
const FORBIDDEN_MESSAGE = '회사를 관리할 권한이 없습니다.';
const NOT_FOUND_MESSAGE = '회사를 찾을 수 없습니다.';
const NAME_FAILED_MESSAGE = '회사 이름을 변경하지 못했습니다. 다시 시도하세요.';
const STATUS_FAILED_MESSAGE = '회사 상태를 변경하지 못했습니다. 다시 시도하세요.';

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

export async function loader({ request, params }: Route.LoaderArgs): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 405);
  }

  const { result, headers } = await readCompany(request, params.companyId);
  switch (result.status) {
    case 'ok':
      return jsonResponse(result.company, 200, headers);
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
  if (isCompanyStatusSubmission(payload)) {
    const { result, headers } = await updateCompanyStatus(
      request,
      params.companyId,
      payload.isActive,
    );
    switch (result.status) {
      case 'ok':
        return jsonResponse({ isActive: result.isActive }, 200, headers);
      case 'anonymous':
        return jsonResponse({ formError: UNAUTHENTICATED_MESSAGE }, 401, headers);
      case 'forbidden':
        return jsonResponse({ formError: FORBIDDEN_MESSAGE }, 403, headers);
      case 'not-found':
        return jsonResponse({ formError: NOT_FOUND_MESSAGE }, 404, headers);
      case 'failed':
        return jsonResponse({ formError: STATUS_FAILED_MESSAGE }, 500, headers);
      default: {
        const unreachable: never = result;
        return unreachable;
      }
    }
  }

  if (!isCompanyNameSubmission(payload)) {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }

  const { result, headers } = await updateCompanyName(request, params.companyId, payload.name);
  switch (result.status) {
    case 'ok':
      return jsonResponse({ name: result.name }, 200, headers);
    case 'invalid':
      return jsonResponse({ fieldErrors: result.fieldErrors }, 400, headers);
    case 'anonymous':
      return jsonResponse({ formError: UNAUTHENTICATED_MESSAGE }, 401, headers);
    case 'forbidden':
      return jsonResponse({ formError: FORBIDDEN_MESSAGE }, 403, headers);
    case 'not-found':
      return jsonResponse({ formError: NOT_FOUND_MESSAGE }, 404, headers);
    case 'failed':
      return jsonResponse({ formError: NAME_FAILED_MESSAGE }, 500, headers);
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}
