import { readTodayWork } from '~/features/today/api/today.server';
import { jsonResponse } from '~/lib/jsonResponse.server';

import type { Route } from './+types/api.today';

const INVALID_REQUEST_MESSAGE = '오늘의 업무를 처리하지 못했습니다. 다시 시도하세요.';
const UNAUTHENTICATED_MESSAGE = '다시 로그인하세요.';
const FORBIDDEN_MESSAGE = '오늘의 업무를 볼 권한이 없습니다.';
const NOT_FOUND_MESSAGE = '회사를 찾을 수 없습니다.';
const READ_FAILED_MESSAGE = '오늘의 업무를 불러오지 못했습니다. 다시 시도하세요.';

export async function loader({ request }: Route.LoaderArgs): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 405);
  }

  const { result, headers } = await readTodayWork(request);
  switch (result.status) {
    case 'ok':
      return jsonResponse(
        {
          recontactCount: result.recontactCount,
          overdueCustomerCount: result.overdueCustomerCount,
          overdueAmount: result.overdueAmount,
          contacts: result.contacts,
          overdueInstallments: result.overdueInstallments,
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
