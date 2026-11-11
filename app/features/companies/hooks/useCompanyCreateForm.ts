import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { MAX_LOGIN_ID_LENGTH } from '~/features/auth/type';
import { requestCompanyCreate } from '~/features/companies/api/companyApi';
import { companyQueryKeys } from '~/features/companies/api/companyQuery';
import { MAX_COMPANY_NAME_LENGTH } from '~/features/companies/type';

import type { ChangeEvent } from 'react';
import type { CompanyFieldErrors } from '~/features/companies/type';

type CompanyCreateFormState = {
  open: boolean;
  name: string;
  loginId: string;
  fieldErrors?: CompanyFieldErrors;
  formError?: string;
  isSubmitting: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  changeName: (event: ChangeEvent<HTMLInputElement>) => void;
  changeLoginId: (event: ChangeEvent<HTMLInputElement>) => void;
  submitCompany: () => void;
};

const transportErrorMessage = '회사를 추가하지 못했습니다. 다시 시도하세요.';

export function useCompanyCreateForm(): CompanyCreateFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [loginId, setLoginId] = useState('');
  const mutation = useMutation({
    mutationFn: requestCompanyCreate,
    onSuccess: (response) => {
      if (response.company === undefined || response.fieldErrors || response.formError) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: companyQueryKeys.list() });
      setName('');
      setLoginId('');
      setOpen(false);
      toast('회사를 추가했습니다.');
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const response = mutation.isError ? undefined : mutation.data;

  function resetFields(): void {
    setName('');
    setLoginId('');
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
    setName(event.currentTarget.value.slice(0, MAX_COMPANY_NAME_LENGTH));
  }

  function changeLoginId(event: ChangeEvent<HTMLInputElement>): void {
    setLoginId(event.currentTarget.value.slice(0, MAX_LOGIN_ID_LENGTH));
  }

  function submitCompany(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    submitLock.current = true;
    mutation.mutate({ name, loginId });
  }

  function resolveFormError(): string | undefined {
    if (mutation.isError) {
      return transportErrorMessage;
    }
    return response?.formError;
  }

  return {
    open,
    name,
    loginId,
    fieldErrors: open ? response?.fieldErrors : undefined,
    formError: open ? resolveFormError() : undefined,
    isSubmitting: mutation.isPending,
    openDialog,
    closeDialog,
    changeName,
    changeLoginId,
    submitCompany,
  };
}
