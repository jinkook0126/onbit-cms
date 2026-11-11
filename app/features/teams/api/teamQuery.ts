import type { QueryClient } from '@tanstack/react-query';
import type { TeamDetail, TeamListItem, TeamListResponse } from '~/features/teams/type';

export const teamQueryKeys = {
  all: ['teams'] as const,
  lists: () => [...teamQueryKeys.all, 'list'] as const,
  list: (companyId: string) => [...teamQueryKeys.lists(), companyId] as const,
  details: () => [...teamQueryKeys.all, 'detail'] as const,
  detail: (teamId: string) => [...teamQueryKeys.details(), teamId] as const,
};

export function replaceListedTeam(
  queryClient: QueryClient,
  teamId: string,
  patch: Partial<Pick<TeamListItem, 'name' | 'isActive' | 'leaderName'>>,
): void {
  queryClient.setQueriesData<TeamListResponse>({ queryKey: teamQueryKeys.lists() }, (current) => {
    if (!current) {
      return current;
    }
    return {
      ...current,
      teams: current.teams.map((team) => (team.id === teamId ? { ...team, ...patch } : team)),
    };
  });
}

export function replaceTeamDetail(
  queryClient: QueryClient,
  teamId: string,
  patch: Partial<TeamDetail>,
): void {
  queryClient.setQueryData<TeamDetail>(teamQueryKeys.detail(teamId), (current) => {
    if (!current) {
      return current;
    }
    return { ...current, ...patch };
  });
}
