import { useQuery } from '@tanstack/react-query';

import { requestTeamList } from '~/features/teams/api/teamApi';
import { teamQueryKeys } from '~/features/teams/api/teamQuery';

import type { UseQueryResult } from '@tanstack/react-query';
import type { TeamListResponse } from '~/features/teams/type';

export function useTeamList(companyId: string): UseQueryResult<TeamListResponse> {
  return useQuery({
    queryKey: teamQueryKeys.list(companyId),
    queryFn: ({ signal }) => requestTeamList(companyId, signal),
  });
}
