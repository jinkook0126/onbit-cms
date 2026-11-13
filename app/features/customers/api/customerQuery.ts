import type { QueryClient } from '@tanstack/react-query';
import type { CustomerDetail, CustomerListParams } from '~/features/customers/type';

export const customerQueryKeys = {
  all: ['customers'] as const,
  lists: () => [...customerQueryKeys.all, 'list'] as const,
  list: (params: CustomerListParams) => [...customerQueryKeys.lists(), params] as const,
  details: () => [...customerQueryKeys.all, 'detail'] as const,
  detail: (customerId: string) => [...customerQueryKeys.details(), customerId] as const,
  consultations: (customerId: string) =>
    [...customerQueryKeys.all, 'consultations', customerId] as const,
  installments: (customerId: string) =>
    [...customerQueryKeys.all, 'installments', customerId] as const,
  ledger: (customerId: string) => [...customerQueryKeys.all, 'ledger', customerId] as const,
  caseProgress: (customerId: string) =>
    [...customerQueryKeys.all, 'case-progress', customerId] as const,
  summary: (customerId: string) => [...customerQueryKeys.all, 'summary', customerId] as const,
  assignees: () => [...customerQueryKeys.all, 'assignees'] as const,
};

export function replaceCustomerDetail(
  queryClient: QueryClient,
  customerId: string,
  patch: Partial<CustomerDetail>,
): void {
  queryClient.setQueryData<CustomerDetail>(customerQueryKeys.detail(customerId), (current) => {
    if (!current) {
      return current;
    }
    return { ...current, ...patch };
  });
}
