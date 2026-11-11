import { useQuery } from '@tanstack/react-query';

import { requestCompanyDetail } from '~/features/companies/api/companyApi';
import { companyQueryKeys } from '~/features/companies/api/companyQuery';

import type { UseQueryResult } from '@tanstack/react-query';
import type { CompanyDetail } from '~/features/companies/type';

export function useCompanyDetail(companyId: string): UseQueryResult<CompanyDetail> {
  return useQuery({
    queryKey: companyQueryKeys.detail(companyId),
    queryFn: ({ signal }) => requestCompanyDetail(companyId, signal),
    enabled: companyId !== '',
  });
}
