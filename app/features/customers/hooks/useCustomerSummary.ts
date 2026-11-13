import { useQuery } from '@tanstack/react-query';

import { requestCustomerSummary } from '~/features/customers/api/customerApi';
import { customerQueryKeys } from '~/features/customers/api/customerQuery';

import type { UseQueryResult } from '@tanstack/react-query';
import type { CustomerSummary } from '~/features/customers/type';

export function useCustomerSummary(customerId: string): UseQueryResult<CustomerSummary> {
  return useQuery({
    queryKey: customerQueryKeys.summary(customerId),
    queryFn: ({ signal }) => requestCustomerSummary(customerId, signal),
    enabled: customerId !== '',
  });
}
