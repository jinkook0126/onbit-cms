import { createConsultation, readConsultations } from '~/features/customers/api/customers.server';
import { isConsultationCreateSubmission } from '~/features/customers/type';
import { mergeResponseHeaders } from '~/lib/supabase.server';

import type { Route } from './+types/api.customer-consultations';

const INVALID_REQUEST_MESSAGE = '상담 이력 정보를 처리하지 못했습니다. 다시 시도하세요.';
const UNAUTHENTICATED_MESSAGE = '다시 로그인하세요.';
const FORBIDDEN_MESSAGE = '상담 이력을 볼 권한이 없습니다.';
const CREATE_FORBIDDEN_MESSAGE = '상담 이력을 등록할 권한이 없습니다.';
const NOT_FOUND_MESSAGE = '상담 고객을 찾을 수 없습니다.';
const READ_FAILED_MESSAGE = '상담 이력을 불러오지 못했습니다. 다시 시도하세요.';
const CREATE_FAILED_MESSAGE = '상담 이력을 등록하지 못했습니다. 다시 시도하세요.';

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

  const { result, headers } = await readConsultations(request, params.customerId);
  switch (result.status) {
    case 'ok':
      return jsonResponse({ consultations: result.consultations }, 200, headers);
    case 'anonymous':
      return jsonResponse({ formError: UNAUTHENTICATED_MESSAGE }, 401, headers);
    case 'forbidden':
      return jsonResponse({ formError: FORBIDDEN_MESSAGE }, 403, headers);
    case 'not-found':
      return jsonResponse({ formError: NOT_FOUND_MESSAGE }, 404, headers);
    case 'failed':
      return jsonResponse({ formError: READ_FAILED_MESSAGE }, 500, headers);
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
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
  if (!isConsultationCreateSubmission(payload)) {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }

  const { result, headers } = await createConsultation(
    request,
    params.customerId,
    payload.content,
    payload.nextContactOn,
  );
  switch (result.status) {
    case 'ok':
      return jsonResponse({ id: result.id }, 200, headers);
    case 'invalid':
      return jsonResponse({ fieldErrors: result.fieldErrors }, 400, headers);
    case 'anonymous':
      return jsonResponse({ formError: UNAUTHENTICATED_MESSAGE }, 401, headers);
    case 'forbidden':
      return jsonResponse({ formError: CREATE_FORBIDDEN_MESSAGE }, 403, headers);
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
