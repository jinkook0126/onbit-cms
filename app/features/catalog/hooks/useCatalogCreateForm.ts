import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { requestCatalogCreate } from '~/features/catalog/api/catalogApi';
import { catalogQueryKeys } from '~/features/catalog/api/catalogQuery';
import { catalogKindItemLabels, MAX_CATALOG_NAME_LENGTH } from '~/features/catalog/type';

import type { ChangeEvent } from 'react';
import type { CatalogFieldErrors, CatalogKind } from '~/features/catalog/type';

type CatalogCreateFormState = {
  open: boolean;
  name: string;
  fieldErrors?: CatalogFieldErrors;
  formError?: string;
  isSubmitting: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  changeName: (event: ChangeEvent<HTMLInputElement>) => void;
  submitItem: () => void;
};

const transportErrorMessage = '항목을 등록하지 못했습니다. 다시 시도하세요.';

export function useCatalogCreateForm(kind: CatalogKind): CatalogCreateFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const mutation = useMutation({
    mutationFn: (itemName: string) => requestCatalogCreate(kind, { name: itemName }),
    onSuccess: (response) => {
      if (response.item === undefined || response.fieldErrors || response.formError) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: catalogQueryKeys.kind(kind) });
      setName('');
      setOpen(false);
      toast(`${catalogKindItemLabels[kind]}을(를) 등록했습니다.`);
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const response = mutation.isError ? undefined : mutation.data;

  function resetFields(): void {
    setName('');
    mutation.reset();
  }

  function openDialog(): void {
    resetFields();
    setOpen(true);
  }

  function closeDialog(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    setOpen(false);
    resetFields();
  }

  function changeName(event: ChangeEvent<HTMLInputElement>): void {
    setName(event.currentTarget.value.slice(0, MAX_CATALOG_NAME_LENGTH));
  }

  function submitItem(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    submitLock.current = true;
    mutation.mutate(name);
  }

  return {
    open,
    name,
    fieldErrors: response?.fieldErrors,
    formError: mutation.isError ? transportErrorMessage : response?.formError,
    isSubmitting: mutation.isPending,
    openDialog,
    closeDialog,
    changeName,
    submitItem,
  };
}
