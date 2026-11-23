import { MAX_CUSTOMER_KEYWORD_LENGTH } from '~/features/customers/type';
import { readReceivables } from '~/features/receivables/api/receivables.server';
import {
  parseReceivableDate,
  parseReceivablePaymentFilter,
  parseReceivableSearchField,
  parseReceivableSort,
} from '~/features/receivables/type';
import { jsonResponse } from '~/lib/jsonResponse.server';

import type { ReceivableListQuery } from '~/features/receivables/api/receivables.server';
import type { Route } from './+types/api.receivables';

const INVALID_REQUEST_MESSAGE = '분납 정보를 처리하지 못했습니다. 다시 시도하세요.';
const UNAUTHENTICATED_MESSAGE = '다시 로그인하세요.';
const FORBIDDEN_MESSAGE = '분납 내역을 볼 권한이 없습니다.';
const NOT_FOUND_MESSAGE = '회사를 찾을 수 없습니다.';
const READ_FAILED_MESSAGE = '분납 목록을 불러오지 못했습니다. 다시 시도하세요.';
const DATE_RANGE_MESSAGE = '납부예정 시작일은 종료일보다 늦을 수 없습니다.';

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

function readListQuery(url: URL): ReceivableListQuery | 'range' | null {
  const field = parseReceivableSearchField(url.searchParams.get('field'));
  const page = parsePage(url.searchParams.get('page'));
  const from = parseReceivableDate(url.searchParams.get('from'));
  const to = parseReceivableDate(url.searchParams.get('to'));
  const status = parseReceivablePaymentFilter(url.searchParams.get('status'));
  const sort = parseReceivableSort(url.searchParams.get('sort'));
  const keyword = (url.searchParams.get('q') ?? '').trim();
  if (
    field === null ||
    page === null ||
    from === null ||
    to === null ||
    status === null ||
    sort === null ||
    keyword.length > MAX_CUSTOMER_KEYWORD_LENGTH
  ) {
    return null;
  }
  if (from !== '' && to !== '' && from > to) {
    return 'range';
  }
  return { field, keyword, from, to, status, sort, page };
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

  const { result, headers } = await readReceivables(request, query);
  switch (result.status) {
    case 'ok':
      return jsonResponse(
        {
          receivables: result.receivables,
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
