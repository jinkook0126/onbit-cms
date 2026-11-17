import { useParams } from 'react-router';

import { Skeleton } from '~/components/ui/skeleton';
import { CompanyMasterSection } from '~/features/companies/components/CompanyMasterSection';
import { CompanyNameForm } from '~/features/companies/components/CompanyNameForm';
import { useCompanyDetail } from '~/features/companies/hooks/useCompanyDetail';
import { readQueryError } from '~/lib/formError';
import { pageAlert, pageSurface } from '~/lib/styles';

import type { JSX } from 'react';

function CompanyDetailSkeleton(): JSX.Element {
  return (
    <div className={`${pageSurface} grid max-w-180 gap-4 p-5`} aria-hidden="true">
      <Skeleton className="h-5 w-16" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-10 w-24" />
    </div>
  );
}

export function CompanyDetailPage(): JSX.Element {
  const params = useParams();
  const companyId = params.companyId ?? '';
  const company = useCompanyDetail(companyId);

  if (companyId === '') {
    return (
      <p role="alert" className={pageAlert}>
        회사를 찾을 수 없습니다.
      </p>
    );
  }

  if (company.isPending) {
    return <CompanyDetailSkeleton />;
  }

  if (company.isError) {
    return (
      <p role="alert" className={pageAlert}>
        {readQueryError(company.error, '회사 정보를 불러오지 못했습니다.')}
      </p>
    );
  }

  return (
    <div className={`${pageSurface} grid max-w-180 gap-8 p-5`}>
      <CompanyNameForm company={company.data} />
      <CompanyMasterSection company={company.data} />
    </div>
  );
}
