import {
  catalogCreateBody,
  catalogListBody,
  createCatalogItem,
  readCatalogList,
} from '~/features/catalog/api/catalog.server';
import { isCatalogCreateSubmission, isCatalogKind } from '~/features/catalog/type';
import { jsonResponse } from '~/lib/jsonResponse.server';

import type { Route } from './+types/api.catalog';

const INVALID_REQUEST_MESSAGE = '마스터를 처리하지 못했습니다. 다시 시도하세요.';
const UNAUTHENTICATED_MESSAGE = '다시 로그인하세요.';
const FORBIDDEN_MESSAGE = '마스터를 관리할 권한이 없습니다.';
const READ_FAILED_MESSAGE = '마스터 목록을 불러오지 못했습니다. 다시 시도하세요.';
const CREATE_FAILED_MESSAGE = '항목을 추가하지 못했습니다. 다시 시도하세요.';

export async function loader({ request, params }: Route.LoaderArgs): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 405);
  }
  if (!isCatalogKind(params.kind)) {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }
  const url = new URL(request.url);
  const activeOnly = url.searchParams.get('active') === '1';
  const { result, headers } = await readCatalogList(request, params.kind, activeOnly);
  switch (result.status) {
    case 'ok':
      return jsonResponse(catalogListBody(result), 200, headers);
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

export async function action({ request, params }: Route.ActionArgs): Promise<Response> {
  if (request.method !== 'POST') {
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
  if (!isCatalogCreateSubmission(body)) {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }
  const { result, headers } = await createCatalogItem(request, params.kind, body.name);
  switch (result.status) {
    case 'ok':
      return jsonResponse(catalogCreateBody(result), 201, headers);
    case 'invalid':
    case 'conflict':
      return jsonResponse(catalogCreateBody(result), 400, headers);
    case 'anonymous':
      return jsonResponse({ formError: UNAUTHENTICATED_MESSAGE }, 401, headers);
    case 'forbidden':
      return jsonResponse({ formError: FORBIDDEN_MESSAGE }, 403, headers);
    case 'not-found':
    case 'in-use':
    case 'failed':
      return jsonResponse({ formError: CREATE_FAILED_MESSAGE }, 500, headers);
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}
