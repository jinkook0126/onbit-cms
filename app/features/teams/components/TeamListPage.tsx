import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { Badge } from '~/components/ui/badge';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Skeleton } from '~/components/ui/skeleton';
import { TeamCreateDialog } from '~/features/teams/components/TeamCreateDialog';
import { useTeamList } from '~/features/teams/hooks/useTeamList';
import { teamFormError } from '~/features/teams/type';
import { ApiError } from '~/lib/apiClient';
import { focusRing } from '~/lib/styles';
import { cn } from '~/lib/utils';

import type { JSX, MouseEvent } from 'react';
import type { TeamListItem } from '~/features/teams/type';

const teamCreatedAtLabel = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function TeamListSkeleton(): JSX.Element {
  return (
    <div className="grid gap-3" aria-hidden="true">
      <Skeleton className="h-10 w-28" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function teamListErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return teamFormError(error.body) ?? '팀 목록을 불러오지 못했습니다.';
  }
  return '팀 목록을 불러오지 못했습니다.';
}

function TeamStatusBadge({ isActive }: { isActive: boolean }): JSX.Element {
  if (isActive) {
    return <Badge>활성</Badge>;
  }
  return <Badge variant="outline">비활성</Badge>;
}

function TeamLeaderBadge({ leaderName }: { leaderName: string | null }): JSX.Element {
  if (leaderName) {
    return <span className="text-foreground">{leaderName}</span>;
  }
  return <Badge variant="outline">미정</Badge>;
}

function TeamRow({ team, search }: { team: TeamListItem; search: string }): JSX.Element {
  const navigate = useNavigate();
  const createdAt = new Date(team.createdAt);
  const to = `/settings/teams/${team.id}${search}`;

  function openTeam(event: MouseEvent<HTMLTableRowElement>): void {
    if (event.target instanceof Element && event.target.closest('a')) {
      return;
    }
    void navigate(to);
  }

  return (
    <tr
      className="cursor-pointer border-b border-border last:border-b-0 hover:bg-muted"
      onClick={openTeam}
    >
      <td className="px-4 py-3">
        <Link to={to} className={cn('rounded-sm text-foreground', focusRing)}>
          {team.name}
        </Link>
      </td>
      <td className="px-4 py-3">
        <TeamLeaderBadge leaderName={team.leaderName} />
      </td>
      <td className="px-4 py-3 text-foreground">{team.memberCount}명</td>
      <td className="px-4 py-3 text-muted-foreground">
        <time dateTime={team.createdAt}>{teamCreatedAtLabel.format(createdAt)}</time>
      </td>
      <td className="px-4 py-3">
        <TeamStatusBadge isActive={team.isActive} />
      </td>
    </tr>
  );
}

export function TeamListPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCompanyId = searchParams.get('companyId') ?? '';
  const search = searchParams.toString();
  const detailSearch = search === '' ? '' : `?${search}`;
  const teams = useTeamList(requestedCompanyId);
  const companies = teams.data?.companies ?? [];
  const onlyCompanyId = companies.length === 1 ? companies[0]?.id : undefined;

  useEffect(() => {
    if (requestedCompanyId !== '' || onlyCompanyId === undefined) {
      return;
    }
    setSearchParams({ companyId: onlyCompanyId }, { replace: true });
  }, [onlyCompanyId, requestedCompanyId, setSearchParams]);

  if (teams.isPending) {
    return <TeamListSkeleton />;
  }

  if (teams.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {teamListErrorMessage(teams.error)}
      </p>
    );
  }

  const company = teams.data.company;
  let listBody: JSX.Element;
  if (company === null) {
    listBody = (
      <p className="text-sm text-muted-foreground">
        {companies.length === 0 ? '등록된 회사가 없습니다.' : '회사를 선택하세요.'}
      </p>
    );
  } else if (teams.data.teams.length === 0) {
    listBody = <p className="text-sm text-muted-foreground">등록된 팀이 없습니다.</p>;
  } else {
    listBody = (
      <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-border">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">팀 목록</caption>
          <thead className="border-b border-border">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium text-foreground">
                팀명
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-foreground">
                팀장
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-foreground">
                팀원 수
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-foreground">
                생성일
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-foreground">
                상태
              </th>
            </tr>
          </thead>
          <tbody>
            {teams.data.teams.map((team) => (
              <TeamRow key={team.id} team={team} search={detailSearch} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function changeCompany(companyId: string): void {
    setSearchParams({ companyId }, { replace: true });
  }

  return (
    <div className="grid max-w-240 gap-4">
      <div
        className={cn(
          'flex flex-wrap items-end gap-4',
          companies.length > 0 ? 'justify-between' : 'justify-end',
        )}
      >
        {companies.length > 0 ? (
          <div className="grid w-full max-w-80 gap-2">
            <Label htmlFor="team-company">회사</Label>
            <Select value={company?.id} onValueChange={changeCompany}>
              <SelectTrigger id="team-company" className="w-full">
                <SelectValue placeholder="회사를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {company ? <TeamCreateDialog companyId={company.id} /> : null}
      </div>
      {listBody}
    </div>
  );
}
