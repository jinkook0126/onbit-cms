import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { requestCatalogNameUpdate } from '~/features/catalog/api/catalogApi';
import { catalogQueryKeys } from '~/features/catalog/api/catalogQuery';
import { MAX_CATALOG_NAME_LENGTH } from '~/features/catalog/type';

import type { ChangeEvent } from 'react';
import type { CatalogFieldErrors, CatalogKind } from '~/features/catalog/type';

type CatalogNameFormState = {
  name: string;
  fieldErrors?: CatalogFieldErrors;
  formError?: string;
  isSubmitting: boolean;
  changeName: (event: ChangeEvent<HTMLInputElement>) => void;
  submitName: () => void;
};

const transportErrorMessage = '이름을 저장하지 못했습니다. 다시 시도하세요.';

type CatalogNameFormOptions = {
  onSaved?: () => void;
};

export function useCatalogNameForm(
  kind: CatalogKind,
  id: string,
  savedName: string,
  options?: CatalogNameFormOptions,
): CatalogNameFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [draft, setDraft] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (nextName: string) => requestCatalogNameUpdate(kind, id, { name: nextName }),
    onSuccess: (response) => {
      if (response.name === undefined || response.fieldErrors || response.formError) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: catalogQueryKeys.kind(kind) });
      setDraft(null);
      toast('이름을 저장했습니다.');
      options?.onSaved?.();
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const response = mutation.isError ? undefined : mutation.data;
  const name = draft ?? savedName;

  function changeName(event: ChangeEvent<HTMLInputElement>): void {
    setDraft(event.currentTarget.value.slice(0, MAX_CATALOG_NAME_LENGTH));
  }

  function submitName(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    submitLock.current = true;
    mutation.mutate(name);
  }

  return {
    name,
    fieldErrors: response?.fieldErrors,
    formError: mutation.isError ? transportErrorMessage : response?.formError,
    isSubmitting: mutation.isPending,
    changeName,
    submitName,
  };
}
