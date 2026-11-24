import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { requestCatalogStatusUpdate } from '~/features/catalog/api/catalogApi';
import { catalogQueryKeys } from '~/features/catalog/api/catalogQuery';

import type { CatalogKind, CatalogListResponse } from '~/features/catalog/type';

type CatalogStatusFormState = {
  isActive: boolean;
  isSubmitting: boolean;
  changeStatus: (next: boolean) => void;
};

const transportErrorMessage = '상태를 저장하지 못했습니다. 다시 시도하세요.';

function updateCatalogListActive(
  current: CatalogListResponse | undefined,
  id: string,
  isActive: boolean,
): CatalogListResponse | undefined {
  if (current === undefined) {
    return current;
  }
  return {
    ...current,
    items: current.items.map((item) => (item.id === id ? { ...item, isActive } : item)),
  };
}

export function useCatalogStatusForm(
  kind: CatalogKind,
  id: string,
  savedActive: boolean,
): CatalogStatusFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [draft, setDraft] = useState<boolean | null>(null);
  const mutation = useMutation({
    mutationFn: (next: boolean) => requestCatalogStatusUpdate(kind, id, { isActive: next }),
    onSuccess: (response) => {
      if (response.isActive === undefined || response.formError) {
        setDraft(null);
        toast.error(response.formError ?? transportErrorMessage);
        return;
      }
      queryClient.setQueriesData<CatalogListResponse>(
        { queryKey: catalogQueryKeys.kind(kind) },
        (current) => updateCatalogListActive(current, id, response.isActive === true),
      );
      setDraft(null);
      toast(response.isActive ? '항목을 활성화했습니다.' : '항목을 비활성화했습니다.');
    },
    onError: () => {
      setDraft(null);
      toast.error(transportErrorMessage);
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const isActive = draft ?? savedActive;

  function changeStatus(next: boolean): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    submitLock.current = true;
    setDraft(next);
    mutation.mutate(next);
  }

  return {
    isActive,
    isSubmitting: mutation.isPending,
    changeStatus,
  };
}
