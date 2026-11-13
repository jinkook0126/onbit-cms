import { useQuery } from '@tanstack/react-query';

import { requestConsultations } from '~/features/customers/api/customerApi';
import { customerQueryKeys } from '~/features/customers/api/customerQuery';

import type { UseQueryResult } from '@tanstack/react-query';
import type { ConsultationListResponse } from '~/features/customers/type';

export function useCustomerConsultations(
  customerId: string,
  enabled: boolean,
): UseQueryResult<ConsultationListResponse> {
  return useQuery({
    queryKey: customerQueryKeys.consultations(customerId),
    queryFn: ({ signal }) => requestConsultations(customerId, signal),
    enabled: enabled && customerId !== '',
  });
}
