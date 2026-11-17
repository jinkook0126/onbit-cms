import { readCustomerImportTemplate } from '~/features/customers/api/customerImport.server';
import { jsonResponse } from '~/lib/jsonResponse.server';
import { mergeResponseHeaders } from '~/lib/supabase.server';

import type { Route } from './+types/api.customer-import-template';

const INVALID_REQUEST_MESSAGE = '상담 고객 템플릿을 처리하지 못했습니다. 다시 시도하세요.';
const UNAUTHENTICATED_MESSAGE = '다시 로그인하세요.';
const FORBIDDEN_MESSAGE = '상담 고객 템플릿을 받을 권한이 없습니다.';
const READ_FAILED_MESSAGE = '상담 고객 템플릿을 만들지 못했습니다. 다시 시도하세요.';

const templateHeaders = {
  'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'Content-Disposition': 'attachment; filename="customer-import-template.xlsx"',
  'Cache-Control': 'no-store',
};

export async function loader({ request }: Route.LoaderArgs): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 405);
  }

  const { result, headers } = await readCustomerImportTemplate(request);
  switch (result.status) {
    case 'ok':
      return mergeResponseHeaders(
        new Response(result.body, { status: 200, headers: templateHeaders }),
        headers,
      );
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

export function action(): Response {
  return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 405);
}
