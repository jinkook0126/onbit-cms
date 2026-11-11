import { useQuery } from '@tanstack/react-query';

import { requestCompanyList } from '~/features/companies/api/companyApi';
import { companyQueryKeys } from '~/features/companies/api/companyQuery';

import type { UseQueryResult } from '@tanstack/react-query';
import type { CompanyListResponse } from '~/features/companies/type';

export function useCompanyList(): UseQueryResult<CompanyListResponse> {
  return useQuery({
    queryKey: companyQueryKeys.list(),
    queryFn: ({ signal }) => requestCompanyList(signal),
  });
}
