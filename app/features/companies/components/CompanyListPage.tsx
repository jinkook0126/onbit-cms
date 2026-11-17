import { Link, useNavigate } from 'react-router';

import { Badge } from '~/components/ui/badge';
import { Skeleton } from '~/components/ui/skeleton';
import { CompanyCreateDialog } from '~/features/companies/components/CompanyCreateDialog';
import { useCompanyList } from '~/features/companies/hooks/useCompanyList';
import { readQueryError } from '~/lib/formError';
import { focusRing, pageAlert, pageSurface, tableHeaderSurface } from '~/lib/styles';
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
    <div className="grid gap-5" aria-hidden="true">
      <div className={`${pageSurface} p-5`}>
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
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
      <p role="alert" className={pageAlert}>
        {readQueryError(companies.error, '회사 목록을 불러오지 못했습니다.')}
      </p>
    );
  }

  return (
    <div className="grid max-w-240 gap-5">
      <div className="flex justify-end">
        <CompanyCreateDialog />
      </div>
      {companies.data.companies.length === 0 ? (
        <p className={`${pageSurface} px-6 py-10 text-center text-sm text-muted-foreground`}>
          등록된 회사가 없습니다.
        </p>
      ) : (
        <div className={`${pageSurface} overflow-x-auto`}>
          <table className="w-full text-left text-sm">
            <caption className="sr-only">회사 목록</caption>
            <thead className={`border-b border-border ${tableHeaderSurface}`}>
              <tr>
                <th
                  scope="col"
                  className={`${tableHeaderSurface} px-4 py-3 font-medium text-foreground`}
                >
                  회사 명
                </th>
                <th
                  scope="col"
                  className={`${tableHeaderSurface} px-4 py-3 font-medium text-foreground`}
                >
                  생성일
                </th>
                <th
                  scope="col"
                  className={`${tableHeaderSurface} px-4 py-3 font-medium text-foreground`}
                >
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
