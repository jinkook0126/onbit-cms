import { createCustomer, readCustomers } from '~/features/customers/api/customers.server';
import {
  MAX_CUSTOMER_KEYWORD_LENGTH,
  isConsultationStatusParam,
  isCustomerProfileSubmission,
  isInflowSourceParam,
  parseConsultationStatus,
  parseCustomerDate,
  parseCustomerListView,
  parseCustomerSearchField,
  parseCustomerSortDirection,
  parseCustomerSortField,
  parseInflowSource,
} from '~/features/customers/type';
import { jsonResponse } from '~/lib/jsonResponse.server';

import type { CustomerListQuery } from '~/features/customers/api/customers.server';
import type { Route } from './+types/api.customers';

const INVALID_REQUEST_MESSAGE = '상담 고객 정보를 처리하지 못했습니다. 다시 시도하세요.';
const UNAUTHENTICATED_MESSAGE = '다시 로그인하세요.';
const FORBIDDEN_MESSAGE = '상담 고객을 볼 권한이 없습니다.';
const NOT_FOUND_MESSAGE = '회사를 찾을 수 없습니다.';
const READ_FAILED_MESSAGE = '상담 고객 목록을 불러오지 못했습니다. 다시 시도하세요.';
const CREATE_FORBIDDEN_MESSAGE = '상담 고객을 등록할 권한이 없습니다.';
const CREATE_FAILED_MESSAGE = '상담 고객을 등록하지 못했습니다. 다시 시도하세요.';
const DATE_RANGE_MESSAGE = '등록일 시작일은 종료일보다 늦을 수 없습니다.';

function parsePage(value: string | null): number | null {
  if (value === null) {
    return 1;
  }
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }
  const page = Number(value);
  if (!Number.isSafeInteger(page)) {
    return null;
  }
  return page;
}

function readListQuery(url: URL): CustomerListQuery | 'range' | null {
  const field = parseCustomerSearchField(url.searchParams.get('field'));
  const statusParam = url.searchParams.get('status');
  const sourceParam = url.searchParams.get('source');
  const from = parseCustomerDate(url.searchParams.get('from'));
  const to = parseCustomerDate(url.searchParams.get('to'));
  const page = parsePage(url.searchParams.get('page'));
  const sortField = parseCustomerSortField(url.searchParams.get('sort'));
  const sortDirection = parseCustomerSortDirection(url.searchParams.get('order'));
  const view = parseCustomerListView(url.searchParams.get('view'));
  const keyword = (url.searchParams.get('q') ?? '').trim();
  if (
    field === null ||
    page === null ||
    from === null ||
    to === null ||
    sortField === null ||
    sortDirection === null ||
    view === null ||
    !isConsultationStatusParam(statusParam) ||
    !isInflowSourceParam(sourceParam)
  ) {
    return null;
  }
  if (keyword.length > MAX_CUSTOMER_KEYWORD_LENGTH) {
    return null;
  }
  if (from !== '' && to !== '' && from > to) {
    return 'range';
  }
  return {
    field,
    keyword,
    status: parseConsultationStatus(statusParam),
    source: parseInflowSource(sourceParam),
    from,
    to,
    sortField,
    sortDirection,
    view,
    page,
  };
}

export async function loader({ request }: Route.LoaderArgs): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 405);
  }

  const query = readListQuery(new URL(request.url));
  if (query === 'range') {
    return jsonResponse({ formError: DATE_RANGE_MESSAGE }, 400);
  }
  if (!query) {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }

  const { result, headers } = await readCustomers(request, query);
  switch (result.status) {
    case 'ok':
      return jsonResponse(
        {
          customers: result.customers,
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
        },
        200,
        headers,
      );
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
  if (!isCustomerProfileSubmission(payload)) {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }

  const { result, headers } = await createCustomer(request, payload);
  switch (result.status) {
    case 'ok':
      return jsonResponse({ id: result.id }, 200, headers);
    case 'invalid':
      return jsonResponse({ fieldErrors: result.fieldErrors }, 400, headers);
    case 'duplicate':
      return jsonResponse(
        { formError: '같은 이름과 연락처의 고객이 이미 있습니다.' },
        400,
        headers,
      );
    case 'anonymous':
      return jsonResponse({ formError: UNAUTHENTICATED_MESSAGE }, 401, headers);
    case 'forbidden':
      return jsonResponse({ formError: CREATE_FORBIDDEN_MESSAGE }, 403, headers);
    case 'not-found':
      return jsonResponse({ formError: CREATE_FAILED_MESSAGE }, 404, headers);
    case 'failed':
      return jsonResponse({ formError: CREATE_FAILED_MESSAGE }, 500, headers);
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}
