import {
  readTeam,
  updateTeamLeader,
  updateTeamName,
  updateTeamStatus,
} from '~/features/teams/api/teams.server';
import {
  isTeamLeaderSubmission,
  isTeamNameSubmission,
  isTeamStatusSubmission,
} from '~/features/teams/type';
import { mergeResponseHeaders } from '~/lib/supabase.server';

import type { Route } from './+types/api.team';

const INVALID_REQUEST_MESSAGE = '팀 정보를 처리하지 못했습니다. 다시 시도하세요.';
const UNAUTHENTICATED_MESSAGE = '다시 로그인하세요.';
const FORBIDDEN_MESSAGE = '팀을 관리할 권한이 없습니다.';
const NOT_FOUND_MESSAGE = '팀을 찾을 수 없습니다.';
const NAME_FAILED_MESSAGE = '팀 이름을 변경하지 못했습니다. 다시 시도하세요.';
const STATUS_FAILED_MESSAGE = '팀 상태를 변경하지 못했습니다. 다시 시도하세요.';
const LEADER_FAILED_MESSAGE = '팀장을 변경하지 못했습니다. 다시 시도하세요.';

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

export async function loader({ request, params }: Route.LoaderArgs): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 405);
  }

  const { result, headers } = await readTeam(request, params.teamId);
  switch (result.status) {
    case 'ok':
      return jsonResponse(result.team, 200, headers);
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

export async function action({ request, params }: Route.ActionArgs): Promise<Response> {
  if (request.method !== 'PATCH') {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 405);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }

  if (isTeamStatusSubmission(payload)) {
    const { result, headers } = await updateTeamStatus(request, params.teamId, payload.isActive);
    switch (result.status) {
      case 'ok':
        return jsonResponse({ isActive: result.isActive }, 200, headers);
      case 'anonymous':
        return jsonResponse({ formError: UNAUTHENTICATED_MESSAGE }, 401, headers);
      case 'forbidden':
        return jsonResponse({ formError: FORBIDDEN_MESSAGE }, 403, headers);
      case 'not-found':
        return jsonResponse({ formError: NOT_FOUND_MESSAGE }, 404, headers);
      case 'failed':
        return jsonResponse({ formError: STATUS_FAILED_MESSAGE }, 500, headers);
      default: {
        const unreachable: never = result;
        return unreachable;
      }
    }
  }

  if (isTeamLeaderSubmission(payload)) {
    const { result, headers } = await updateTeamLeader(request, params.teamId, payload.leaderId);
    switch (result.status) {
      case 'ok':
        return jsonResponse(
          { leaderId: result.leaderId, leaderName: result.leaderName },
          200,
          headers,
        );
      case 'invalid':
        return jsonResponse({ formError: result.formError }, 400, headers);
      case 'anonymous':
        return jsonResponse({ formError: UNAUTHENTICATED_MESSAGE }, 401, headers);
      case 'forbidden':
        return jsonResponse({ formError: FORBIDDEN_MESSAGE }, 403, headers);
      case 'not-found':
        return jsonResponse({ formError: NOT_FOUND_MESSAGE }, 404, headers);
      case 'failed':
        return jsonResponse({ formError: LEADER_FAILED_MESSAGE }, 500, headers);
      default: {
        const unreachable: never = result;
        return unreachable;
      }
    }
  }

  if (!isTeamNameSubmission(payload)) {
    return jsonResponse({ formError: INVALID_REQUEST_MESSAGE }, 400);
  }

  const { result, headers } = await updateTeamName(request, params.teamId, payload.name);
  switch (result.status) {
    case 'ok':
      return jsonResponse({ name: result.name }, 200, headers);
    case 'invalid':
      return jsonResponse({ fieldErrors: result.fieldErrors }, 400, headers);
    case 'anonymous':
      return jsonResponse({ formError: UNAUTHENTICATED_MESSAGE }, 401, headers);
    case 'forbidden':
      return jsonResponse({ formError: FORBIDDEN_MESSAGE }, 403, headers);
    case 'not-found':
      return jsonResponse({ formError: NOT_FOUND_MESSAGE }, 404, headers);
    case 'failed':
      return jsonResponse({ formError: NAME_FAILED_MESSAGE }, 500, headers);
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}
