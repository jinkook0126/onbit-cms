import { useParams } from 'react-router';

import { Skeleton } from '~/components/ui/skeleton';
import { TeamLeaderForm } from '~/features/teams/components/TeamLeaderForm';
import { TeamNameForm } from '~/features/teams/components/TeamNameForm';
import { useTeamDetail } from '~/features/teams/hooks/useTeamDetail';
import { teamFormError } from '~/features/teams/type';
import { ApiError } from '~/lib/apiClient';

import type { JSX } from 'react';

function TeamDetailSkeleton(): JSX.Element {
  return (
    <div className="grid max-w-180 gap-4" aria-hidden="true">
      <Skeleton className="h-5 w-16" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-10 w-24" />
    </div>
  );
}

function teamDetailErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return teamFormError(error.body) ?? '팀 정보를 불러오지 못했습니다.';
  }
  return '팀 정보를 불러오지 못했습니다.';
}

export function TeamDetailPage(): JSX.Element {
  const params = useParams();
  const teamId = params.teamId ?? '';
  const team = useTeamDetail(teamId);

  if (teamId === '') {
    return (
      <p role="alert" className="text-sm text-destructive">
        팀을 찾을 수 없습니다.
      </p>
    );
  }

  if (team.isPending) {
    return <TeamDetailSkeleton />;
  }

  if (team.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {teamDetailErrorMessage(team.error)}
      </p>
    );
  }

  return (
    <div className="grid max-w-180 gap-8">
      <TeamNameForm team={team.data} />
      <TeamLeaderForm team={team.data} />
    </div>
  );
}
