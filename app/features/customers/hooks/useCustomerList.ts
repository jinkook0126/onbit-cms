import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { requestCustomerList } from '~/features/customers/api/customerApi';
import { customerQueryKeys } from '~/features/customers/api/customerQuery';

import type { UseQueryResult } from '@tanstack/react-query';
import type { CustomerListParams, CustomerListResponse } from '~/features/customers/type';

export function useCustomerList(params: CustomerListParams): UseQueryResult<CustomerListResponse> {
  return useQuery({
    queryKey: customerQueryKeys.list(params),
    queryFn: ({ signal }) => requestCustomerList(params, signal),
    placeholderData: keepPreviousData,
  });
}
