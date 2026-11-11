import { useParams } from 'react-router';

import { Skeleton } from '~/components/ui/skeleton';
import { CompanyMasterSection } from '~/features/companies/components/CompanyMasterSection';
import { CompanyNameForm } from '~/features/companies/components/CompanyNameForm';
import { useCompanyDetail } from '~/features/companies/hooks/useCompanyDetail';
import { companyFormError } from '~/features/companies/type';
import { ApiError } from '~/lib/apiClient';

import type { JSX } from 'react';

function CompanyDetailSkeleton(): JSX.Element {
  return (
    <div className="grid max-w-180 gap-4" aria-hidden="true">
      <Skeleton className="h-5 w-16" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-10 w-24" />
    </div>
  );
}

function companyDetailErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return companyFormError(error.body) ?? '회사 정보를 불러오지 못했습니다.';
  }
  return '회사 정보를 불러오지 못했습니다.';
}

export function CompanyDetailPage(): JSX.Element {
  const params = useParams();
  const companyId = params.companyId ?? '';
  const company = useCompanyDetail(companyId);

  if (companyId === '') {
    return (
      <p role="alert" className="text-sm text-destructive">
        회사를 찾을 수 없습니다.
      </p>
    );
  }

  if (company.isPending) {
    return <CompanyDetailSkeleton />;
  }

  if (company.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {companyDetailErrorMessage(company.error)}
      </p>
    );
  }

  return (
    <div className="grid max-w-180 gap-8">
      <CompanyNameForm company={company.data} />
      <CompanyMasterSection company={company.data} />
    </div>
  );
}
