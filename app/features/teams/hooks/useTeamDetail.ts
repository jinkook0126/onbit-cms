import { useQuery } from '@tanstack/react-query';

import { requestTeamDetail } from '~/features/teams/api/teamApi';
import { teamQueryKeys } from '~/features/teams/api/teamQuery';

import type { UseQueryResult } from '@tanstack/react-query';
import type { TeamDetail } from '~/features/teams/type';

export function useTeamDetail(teamId: string): UseQueryResult<TeamDetail> {
  return useQuery({
    queryKey: teamQueryKeys.detail(teamId),
    queryFn: ({ signal }) => requestTeamDetail(teamId, signal),
    enabled: teamId !== '',
  });
}
