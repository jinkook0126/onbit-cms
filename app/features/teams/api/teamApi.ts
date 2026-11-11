import {
  isTeamCreateResponse,
  isTeamDetail,
  isTeamLeaderResponse,
  isTeamListResponse,
  isTeamNameResponse,
  isTeamStatusResponse,
} from '~/features/teams/type';
import { ApiError, apiClient } from '~/lib/apiClient';

import type {
  TeamCreateResponse,
  TeamCreateSubmission,
  TeamDetail,
  TeamLeaderResponse,
  TeamLeaderSubmission,
  TeamListResponse,
  TeamNameResponse,
  TeamNameSubmission,
  TeamStatusResponse,
  TeamStatusSubmission,
} from '~/features/teams/type';

const teamsApiPath = '/api/teams';

function teamsPath(companyId: string): string {
  if (companyId === '') {
    return teamsApiPath;
  }
  const params = new URLSearchParams({ companyId });
  return `${teamsApiPath}?${params.toString()}`;
}

function teamPath(teamId: string): string {
  return `${teamsApiPath}/${encodeURIComponent(teamId)}`;
}

export async function requestTeamList(
  companyId: string,
  signal?: AbortSignal,
): Promise<TeamListResponse> {
  const result = await apiClient(teamsPath(companyId), { signal });
  if (!result.ok || !isTeamListResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestTeamCreate(
  submission: TeamCreateSubmission,
): Promise<TeamCreateResponse> {
  const result = await apiClient(teamsApiPath, { method: 'POST', body: submission });
  if (!isTeamCreateResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestTeamDetail(teamId: string, signal?: AbortSignal): Promise<TeamDetail> {
  const result = await apiClient(teamPath(teamId), { signal });
  if (!result.ok || !isTeamDetail(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestTeamNameUpdate(
  teamId: string,
  submission: TeamNameSubmission,
): Promise<TeamNameResponse> {
  const result = await apiClient(teamPath(teamId), { method: 'PATCH', body: submission });
  if (!isTeamNameResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestTeamStatusUpdate(
  teamId: string,
  submission: TeamStatusSubmission,
): Promise<TeamStatusResponse> {
  const result = await apiClient(teamPath(teamId), { method: 'PATCH', body: submission });
  if (!isTeamStatusResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestTeamLeaderUpdate(
  teamId: string,
  submission: TeamLeaderSubmission,
): Promise<TeamLeaderResponse> {
  const result = await apiClient(teamPath(teamId), { method: 'PATCH', body: submission });
  if (!isTeamLeaderResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}
