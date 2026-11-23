import { MAX_CUSTOMER_KEYWORD_LENGTH } from '~/features/customers/type';
import { readReceivableCalendar } from '~/features/receivables/api/receivables.server';
import { jsonResponse } from '~/lib/jsonResponse.server';

import type { Route } from './+types/api.receivable-calendar';

const INVALID_REQUEST_MESSAGE = '분납 캘린더를 처리하지 못했습니다. 다시 시도하세요.';
const UNAUTHENTICATED_MESSAGE = '다시 로그인하세요.';
const FORBIDDEN_MESSAGE = '분납 캘린더를 볼 권한이 없습니다.';
const NOT_FOUND_MESSAGE = '회사를 찾을 수 없습니다.';
const READ_FAILED_MESSAGE = '분납 캘린더를 불러오지 못했습니다. 다시 시도하세요.';

function isCalendarMonth(value: string): boolean {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

export async function loader({ request }: Route.LoaderArgs): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 405);
  }

  const url = new URL(request.url);
  const month = url.searchParams.get('month') ?? '';
  const name = (url.searchParams.get('name') ?? '').trim();
  if (!isCalendarMonth(month) || name.length > MAX_CUSTOMER_KEYWORD_LENGTH) {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }

  const { result, headers } = await readReceivableCalendar(request, { month, name });
  switch (result.status) {
    case 'ok':
      return jsonResponse({ days: result.days }, 200, headers);
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

export function action(): Response {
  return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 405);
}
