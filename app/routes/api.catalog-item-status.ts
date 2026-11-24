import { catalogStatusBody, updateCatalogStatus } from '~/features/catalog/api/catalog.server';
import { isCatalogKind, isCatalogStatusSubmission } from '~/features/catalog/type';
import { jsonResponse } from '~/lib/jsonResponse.server';

import type { Route } from './+types/api.catalog-item-status';

const INVALID_REQUEST_MESSAGE = '마스터를 처리하지 못했습니다. 다시 시도하세요.';
const UNAUTHENTICATED_MESSAGE = '다시 로그인하세요.';
const FORBIDDEN_MESSAGE = '마스터를 관리할 권한이 없습니다.';
const NOT_FOUND_MESSAGE = '항목을 찾을 수 없습니다.';
const UPDATE_FAILED_MESSAGE = '상태를 바꾸지 못했습니다. 다시 시도하세요.';

export async function action({ request, params }: Route.ActionArgs): Promise<Response> {
  if (request.method !== 'PATCH') {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 405);
  }
  if (!isCatalogKind(params.kind)) {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }
  if (!isCatalogStatusSubmission(body)) {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }
  const { result, headers } = await updateCatalogStatus(
    request,
    params.kind,
    params.itemId,
    body.isActive,
  );
  switch (result.status) {
    case 'ok':
      return jsonResponse(catalogStatusBody(result), 200, headers);
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

export function loader(): Response {
  return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 405);
}
