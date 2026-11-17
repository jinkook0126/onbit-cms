import { useParams } from 'react-router';

import { Skeleton } from '~/components/ui/skeleton';
import { TeamLeaderForm } from '~/features/teams/components/TeamLeaderForm';
import { TeamNameForm } from '~/features/teams/components/TeamNameForm';
import { useTeamDetail } from '~/features/teams/hooks/useTeamDetail';
import { readQueryError } from '~/lib/formError';
import { pageAlert, pageSurface } from '~/lib/styles';

import type { JSX } from 'react';

function TeamDetailSkeleton(): JSX.Element {
  return (
    <div className={`${pageSurface} grid max-w-180 gap-4 p-5`} aria-hidden="true">
      <Skeleton className="h-5 w-16" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-10 w-24" />
    </div>
  );
}

export function TeamDetailPage(): JSX.Element {
  const params = useParams();
  const teamId = params.teamId ?? '';
  const team = useTeamDetail(teamId);

  if (teamId === '') {
    return (
      <p role="alert" className={pageAlert}>
        팀을 찾을 수 없습니다.
      </p>
    );
  }

  if (team.isPending) {
    return <TeamDetailSkeleton />;
  }

  if (team.isError) {
    return (
      <p role="alert" className={pageAlert}>
        {readQueryError(team.error, '팀 정보를 불러오지 못했습니다.')}
      </p>
    );
  }

  return (
    <div className={`${pageSurface} grid max-w-180 gap-8 p-5`}>
      <TeamNameForm team={team.data} />
      <TeamLeaderForm team={team.data} />
    </div>
  );
}
