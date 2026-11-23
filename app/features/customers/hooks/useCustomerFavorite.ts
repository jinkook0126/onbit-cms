import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { requestSetCustomerFavorite } from '~/features/customers/api/customerApi';
import { customerQueryKeys } from '~/features/customers/api/customerQuery';
import { readQueryError } from '~/lib/formError';

import type { UseMutationResult } from '@tanstack/react-query';

type CustomerFavoriteInput = {
  customerId: string;
  favorited: boolean;
};

export function useCustomerFavorite(): UseMutationResult<
  { favorited: boolean },
  Error,
  CustomerFavoriteInput
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomerFavoriteInput) =>
      requestSetCustomerFavorite(input.customerId, input.favorited),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() });
    },
    onError: (error) => {
      toast(readQueryError(error, '즐겨찾기를 바꾸지 못했습니다. 다시 시도하세요.'));
    },
  });
}
