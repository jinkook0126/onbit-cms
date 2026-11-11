import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { requestAccountNameUpdate } from '~/features/settings/api/accountApi';
import { accountQueryKeys } from '~/features/settings/api/accountQuery';
import { MAX_ACCOUNT_NAME_LENGTH } from '~/features/settings/type';

import type { ChangeEvent } from 'react';
import type { AccountNameFieldErrors, AccountProfile } from '~/features/settings/type';

type AccountNameFormState = {
  name: string;
  fieldErrors?: AccountNameFieldErrors;
  formError?: string;
  isSubmitting: boolean;
  changeName: (event: ChangeEvent<HTMLInputElement>) => void;
  submitName: () => void;
};

const transportErrorMessage = '이름을 변경하지 못했습니다. 다시 시도하세요.';

export function useAccountNameForm(savedName: string): AccountNameFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [draft, setDraft] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: requestAccountNameUpdate,
    onSuccess: (response) => {
      if (response.name === undefined || response.fieldErrors || response.formError) {
        return;
      }
      const saved = response.name;
      queryClient.setQueryData<AccountProfile>(accountQueryKeys.profile(), (current) => {
        if (!current) {
          return current;
        }
        return { ...current, name: saved };
      });
      setDraft(null);
      toast('이름을 변경했습니다.');
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const response = mutation.isError ? undefined : mutation.data;

  function changeName(event: ChangeEvent<HTMLInputElement>): void {
    setDraft(event.currentTarget.value.slice(0, MAX_ACCOUNT_NAME_LENGTH));
  }

  function submitName(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    submitLock.current = true;
    mutation.mutate({ name: draft ?? savedName });
  }

  function resolveFormError(): string | undefined {
    if (mutation.isError) {
      return transportErrorMessage;
    }
    return response?.formError;
  }

  return {
    name: draft ?? savedName,
    fieldErrors: response?.fieldErrors,
    formError: resolveFormError(),
    isSubmitting: mutation.isPending,
    changeName,
    submitName,
  };
}
