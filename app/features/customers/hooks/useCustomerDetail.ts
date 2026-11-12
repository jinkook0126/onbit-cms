import { useQuery } from '@tanstack/react-query';

import { requestCustomerDetail } from '~/features/customers/api/customerApi';
import { customerQueryKeys } from '~/features/customers/api/customerQuery';

import type { UseQueryResult } from '@tanstack/react-query';
import type { CustomerDetail } from '~/features/customers/type';

export function useCustomerDetail(customerId: string): UseQueryResult<CustomerDetail> {
  return useQuery({
    queryKey: customerQueryKeys.detail(customerId),
    queryFn: ({ signal }) => requestCustomerDetail(customerId, signal),
    enabled: customerId !== '',
  });
}
