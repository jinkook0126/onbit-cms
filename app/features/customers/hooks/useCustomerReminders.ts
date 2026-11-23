import { useQuery } from '@tanstack/react-query';

import { requestCustomerReminders } from '~/features/customers/api/customerApi';
import { customerQueryKeys } from '~/features/customers/api/customerQuery';

import type { UseQueryResult } from '@tanstack/react-query';
import type { CustomerReminderResponse } from '~/features/customers/type';

export function useCustomerReminders(): UseQueryResult<CustomerReminderResponse> {
  return useQuery({
    queryKey: customerQueryKeys.reminders(),
    queryFn: ({ signal }) => requestCustomerReminders(signal),
  });
}
