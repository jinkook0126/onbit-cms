import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { requestCatalogDelete } from '~/features/catalog/api/catalogApi';
import { catalogQueryKeys } from '~/features/catalog/api/catalogQuery';
import { catalogKindItemLabels } from '~/features/catalog/type';

import type { CatalogKind } from '~/features/catalog/type';

type CatalogDeleteState = {
  isDeleting: boolean;
  deleteItem: () => void;
};

const transportErrorMessage = '항목을 삭제하지 못했습니다. 다시 시도하세요.';

export function useCatalogDelete(kind: CatalogKind, id: string): CatalogDeleteState {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => requestCatalogDelete(kind, id),
    onSuccess: (response) => {
      if (response.deleted !== true || response.formError) {
        toast.error(response.formError ?? transportErrorMessage);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: catalogQueryKeys.kind(kind) });
      toast(`${catalogKindItemLabels[kind]}을(를) 삭제했습니다.`);
    },
    onError: () => {
      toast.error(transportErrorMessage);
    },
  });

  return {
    isDeleting: mutation.isPending,
    deleteItem: () => {
      if (mutation.isPending) {
        return;
      }
      mutation.mutate();
    },
  };
}
