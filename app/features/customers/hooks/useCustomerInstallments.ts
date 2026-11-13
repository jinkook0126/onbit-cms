import { useQuery } from '@tanstack/react-query';

import { requestInstallments } from '~/features/customers/api/customerApi';
import { customerQueryKeys } from '~/features/customers/api/customerQuery';

import type { UseQueryResult } from '@tanstack/react-query';
import type { InstallmentListResponse } from '~/features/customers/type';

export function useCustomerInstallments(
  customerId: string,
): UseQueryResult<InstallmentListResponse> {
  return useQuery({
    queryKey: customerQueryKeys.installments(customerId),
    queryFn: ({ signal }) => requestInstallments(customerId, signal),
    enabled: customerId !== '',
  });
}
