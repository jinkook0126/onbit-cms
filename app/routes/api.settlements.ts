import { readSettlement } from '~/features/settlements/api/settlements.server';
import { parseSettlementMonth } from '~/features/settlements/type';
import { mergeResponseHeaders } from '~/lib/supabase.server';

import type { Route } from './+types/api.settlements';

const INVALID_REQUEST_MESSAGE = '정산 정보를 처리하지 못했습니다. 다시 시도하세요.';
const UNAUTHENTICATED_MESSAGE = '다시 로그인하세요.';
const FORBIDDEN_MESSAGE = '정산을 볼 권한이 없습니다.';
const NOT_FOUND_MESSAGE = '회사를 찾을 수 없습니다.';
const READ_FAILED_MESSAGE = '월별 정산을 불러오지 못했습니다. 다시 시도하세요.';

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

  const month = parseSettlementMonth(new URL(request.url).searchParams.get('month'));
  if (month === null) {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }

  const { result, headers } = await readSettlement(request, month);
  switch (result.status) {
    case 'ok':
      return jsonResponse(
        {
          month: result.month,
          paymentTotal: result.paymentTotal,
          refundTotal: result.refundTotal,
          netTotal: result.netTotal,
          entries: result.entries,
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
