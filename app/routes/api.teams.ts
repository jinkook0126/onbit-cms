import { createTeam, readTeams } from '~/features/teams/api/teams.server';
import { isTeamCreateSubmission } from '~/features/teams/type';
import { mergeResponseHeaders } from '~/lib/supabase.server';

import type { Route } from './+types/api.teams';

const INVALID_REQUEST_MESSAGE = '팀 정보를 처리하지 못했습니다. 다시 시도하세요.';
const UNAUTHENTICATED_MESSAGE = '다시 로그인하세요.';
const FORBIDDEN_MESSAGE = '팀을 관리할 권한이 없습니다.';
const NOT_FOUND_MESSAGE = '회사를 찾을 수 없습니다.';
const CREATE_FAILED_MESSAGE = '팀을 등록하지 못했습니다. 다시 시도하세요.';

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

  const companyId = new URL(request.url).searchParams.get('companyId');
  const { result, headers } = await readTeams(request, companyId);
  switch (result.status) {
    case 'ok':
      return jsonResponse(
        { company: result.company, companies: result.companies, teams: result.teams },
        200,
        headers,
      );
    case 'anonymous':
      return jsonResponse({ formError: UNAUTHENTICATED_MESSAGE }, 401, headers);
    case 'forbidden':
      return jsonResponse({ formError: FORBIDDEN_MESSAGE }, 403, headers);
    case 'not-found':
      return jsonResponse({ formError: NOT_FOUND_MESSAGE }, 404, headers);
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
  if (!isTeamCreateSubmission(payload)) {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }

  const { result, headers } = await createTeam(request, payload.name, payload.companyId);
  switch (result.status) {
    case 'ok':
      return jsonResponse({ team: result.team }, 200, headers);
    case 'invalid':
      return jsonResponse({ fieldErrors: result.fieldErrors }, 400, headers);
    case 'anonymous':
      return jsonResponse({ formError: UNAUTHENTICATED_MESSAGE }, 401, headers);
    case 'forbidden':
      return jsonResponse({ formError: FORBIDDEN_MESSAGE }, 403, headers);
    case 'not-found':
      return jsonResponse({ formError: NOT_FOUND_MESSAGE }, 404, headers);
    case 'failed':
      return jsonResponse({ formError: CREATE_FAILED_MESSAGE }, 500, headers);
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}
