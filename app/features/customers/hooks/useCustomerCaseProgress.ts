import { useQuery } from '@tanstack/react-query';

import { requestCaseProgress } from '~/features/customers/api/customerApi';
import { customerQueryKeys } from '~/features/customers/api/customerQuery';

import type { UseQueryResult } from '@tanstack/react-query';
import type { CaseProgress } from '~/features/customers/type';

export function useCustomerCaseProgress(
  customerId: string,
  enabled = true,
): UseQueryResult<CaseProgress> {
  return useQuery({
    queryKey: customerQueryKeys.caseProgress(customerId),
    queryFn: ({ signal }) => requestCaseProgress(customerId, signal),
    enabled: enabled && customerId !== '',
  });
}
