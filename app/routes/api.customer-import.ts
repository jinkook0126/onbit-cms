import { importCustomers } from '~/features/customers/api/customerImport.server';
import { jsonResponse } from '~/lib/jsonResponse.server';

import type { Route } from './+types/api.customer-import';

const INVALID_REQUEST_MESSAGE = '상담 고객 엑셀을 처리하지 못했습니다. 다시 시도하세요.';
const UNAUTHENTICATED_MESSAGE = '다시 로그인하세요.';
const FORBIDDEN_MESSAGE = '상담 고객을 등록할 권한이 없습니다.';
const CREATE_FAILED_MESSAGE = '상담 고객을 등록하지 못했습니다. 다시 시도하세요.';

export function loader(): Response {
  return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 405);
}

export async function action({ request }: Route.ActionArgs): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 405);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }
  const file = form.get('file');
  if (!(file instanceof File)) {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }

  const { result, headers } = await importCustomers(request, file);
  switch (result.status) {
    case 'ok':
      return jsonResponse(
        {
          createdCount: result.createdCount,
          duplicates: result.duplicates.length > 0 ? result.duplicates : undefined,
        },
        200,
        headers,
      );
    case 'anonymous':
      return jsonResponse({ formError: UNAUTHENTICATED_MESSAGE }, 401, headers);
    case 'forbidden':
      return jsonResponse({ formError: FORBIDDEN_MESSAGE }, 403, headers);
    case 'invalid':
      return jsonResponse(
        { formError: result.formError, rowErrors: result.rowErrors },
        400,
        headers,
      );
    case 'failed':
      return jsonResponse({ formError: CREATE_FAILED_MESSAGE }, 500, headers);
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}
