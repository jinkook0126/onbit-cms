import { useQuery } from '@tanstack/react-query';

import { requestLedger } from '~/features/customers/api/customerApi';
import { customerQueryKeys } from '~/features/customers/api/customerQuery';

import type { UseQueryResult } from '@tanstack/react-query';
import type { LedgerListResponse } from '~/features/customers/type';

export function useCustomerLedger(customerId: string): UseQueryResult<LedgerListResponse> {
  return useQuery({
    queryKey: customerQueryKeys.ledger(customerId),
    queryFn: ({ signal }) => requestLedger(customerId, signal),
    enabled: customerId !== '',
  });
}
