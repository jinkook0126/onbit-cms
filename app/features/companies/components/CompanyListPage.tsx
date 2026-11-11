import { Link, useNavigate } from 'react-router';

import { Badge } from '~/components/ui/badge';
import { Skeleton } from '~/components/ui/skeleton';
import { CompanyCreateDialog } from '~/features/companies/components/CompanyCreateDialog';
import { useCompanyList } from '~/features/companies/hooks/useCompanyList';
import { companyFormError } from '~/features/companies/type';
import { ApiError } from '~/lib/apiClient';
import { focusRing } from '~/lib/styles';
import { cn } from '~/lib/utils';

import type { JSX, MouseEvent } from 'react';
import type { CompanyListItem } from '~/features/companies/type';

const companyCreatedAtLabel = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function CompanyListSkeleton(): JSX.Element {
  return (
    <div className="grid gap-3" aria-hidden="true">
      <Skeleton className="h-10 w-28" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function companyListErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return companyFormError(error.body) ?? '회사 목록을 불러오지 못했습니다.';
  }
  return '회사 목록을 불러오지 못했습니다.';
}

function CompanyStatusBadge({ isActive }: { isActive: boolean }): JSX.Element {
  if (isActive) {
    return <Badge>활성</Badge>;
  }
  return <Badge variant="outline">비활성</Badge>;
}

function CompanyRow({ company }: { company: CompanyListItem }): JSX.Element {
  const navigate = useNavigate();
  const createdAt = new Date(company.createdAt);
  const to = `/settings/companies/${company.id}`;

  function openCompany(event: MouseEvent<HTMLTableRowElement>): void {
    if (event.target instanceof Element && event.target.closest('a')) {
      return;
    }
    void navigate(to);
  }

  return (
    <tr
      className="cursor-pointer border-b border-border last:border-b-0 hover:bg-muted"
      onClick={openCompany}
    >
      <td className="px-4 py-3">
        <Link to={to} className={cn('rounded-sm text-foreground', focusRing)}>
          {company.name}
        </Link>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        <time dateTime={company.createdAt}>{companyCreatedAtLabel.format(createdAt)}</time>
      </td>
      <td className="px-4 py-3">
        <CompanyStatusBadge isActive={company.isActive} />
      </td>
    </tr>
  );
}

export function CompanyListPage(): JSX.Element {
  const companies = useCompanyList();

  if (companies.isPending) {
    return <CompanyListSkeleton />;
  }

  if (companies.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {companyListErrorMessage(companies.error)}
      </p>
    );
  }

  return (
    <div className="grid max-w-240 gap-4">
      <div className="flex justify-end">
        <CompanyCreateDialog />
      </div>
      {companies.data.companies.length === 0 ? (
        <p className="text-sm text-muted-foreground">등록된 회사가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">회사 목록</caption>
            <thead className="border-b border-border">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium text-foreground">
                  회사 명
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
              {companies.data.companies.map((company) => (
                <CompanyRow key={company.id} company={company} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
