import {
  catalogDeleteBody,
  catalogNameBody,
  deleteCatalogItem,
  readCatalogDetail,
  updateCatalogName,
} from '~/features/catalog/api/catalog.server';
import { isCatalogKind, isCatalogNameSubmission } from '~/features/catalog/type';
import { jsonResponse } from '~/lib/jsonResponse.server';

import type { Route } from './+types/api.catalog-item';

const INVALID_REQUEST_MESSAGE = '마스터를 처리하지 못했습니다. 다시 시도하세요.';
const UNAUTHENTICATED_MESSAGE = '다시 로그인하세요.';
const FORBIDDEN_MESSAGE = '마스터를 관리할 권한이 없습니다.';
const NOT_FOUND_MESSAGE = '항목을 찾을 수 없습니다.';
const READ_FAILED_MESSAGE = '항목을 불러오지 못했습니다. 다시 시도하세요.';
const UPDATE_FAILED_MESSAGE = '이름을 바꾸지 못했습니다. 다시 시도하세요.';
const DELETE_FAILED_MESSAGE = '항목을 삭제하지 못했습니다. 다시 시도하세요.';

export async function loader({ request, params }: Route.LoaderArgs): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 405);
  }
  if (!isCatalogKind(params.kind)) {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }
  const { result, headers } = await readCatalogDetail(request, params.kind, params.itemId);
  switch (result.status) {
    case 'ok':
      return jsonResponse(result.item, 200, headers);
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
  if (!isCatalogKind(params.kind)) {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }

  if (request.method === 'DELETE') {
    const { result, headers } = await deleteCatalogItem(request, params.kind, params.itemId);
    switch (result.status) {
      case 'ok':
        return jsonResponse(catalogDeleteBody(result), 200, headers);
      case 'in-use':
        return jsonResponse(catalogDeleteBody(result), 409, headers);
      case 'anonymous':
        return jsonResponse({ formError: UNAUTHENTICATED_MESSAGE }, 401, headers);
      case 'forbidden':
        return jsonResponse({ formError: FORBIDDEN_MESSAGE }, 403, headers);
      case 'not-found':
        return jsonResponse({ formError: NOT_FOUND_MESSAGE }, 404, headers);
      case 'failed':
        return jsonResponse({ formError: DELETE_FAILED_MESSAGE }, 500, headers);
      default: {
        const unreachable: never = result;
        return unreachable;
      }
    }
  }

  if (request.method !== 'PATCH') {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 405);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }
  if (!isCatalogNameSubmission(body)) {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }

  const { result, headers } = await updateCatalogName(
    request,
    params.kind,
    params.itemId,
    body.name,
  );
  switch (result.status) {
    case 'ok':
      return jsonResponse(catalogNameBody(result), 200, headers);
    case 'invalid':
    case 'conflict':
      return jsonResponse(catalogNameBody(result), 400, headers);
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
