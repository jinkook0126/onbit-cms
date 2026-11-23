import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { requestCustomerDelete } from '~/features/customers/api/customerApi';
import { customerQueryKeys } from '~/features/customers/api/customerQuery';

import type { UseMutationResult } from '@tanstack/react-query';

export function useCustomerDelete(
  onDeleted: (customerId: string) => void,
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (customerId: string) => requestCustomerDelete(customerId),
    onSuccess: (_result, customerId) => {
      void queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() });
      queryClient.removeQueries({ queryKey: customerQueryKeys.detail(customerId) });
      queryClient.removeQueries({ queryKey: customerQueryKeys.consultations(customerId) });
      queryClient.removeQueries({ queryKey: customerQueryKeys.summary(customerId) });
      queryClient.removeQueries({ queryKey: customerQueryKeys.installments(customerId) });
      queryClient.removeQueries({ queryKey: customerQueryKeys.ledger(customerId) });
      toast('고객을 삭제했습니다.');
      onDeleted(customerId);
    },
  });
}
