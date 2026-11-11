import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { MAX_LOGIN_ID_LENGTH } from '~/features/auth/type';
import { requestCompanyMasterCreate } from '~/features/companies/api/companyApi';
import { replaceCompanyDetail } from '~/features/companies/api/companyQuery';
import { MAX_ACCOUNT_NAME_LENGTH } from '~/features/settings/type';

import type { ChangeEvent } from 'react';
import type { CompanyMasterFieldErrors } from '~/features/companies/type';

type IssuedMasterAccount = {
  loginId: string;
  temporaryPassword: string;
};

type CompanyMasterFormState = {
  open: boolean;
  loginId: string;
  name: string;
  issued: IssuedMasterAccount | null;
  fieldErrors?: CompanyMasterFieldErrors;
  formError?: string;
  isSubmitting: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  changeLoginId: (event: ChangeEvent<HTMLInputElement>) => void;
  changeName: (event: ChangeEvent<HTMLInputElement>) => void;
  submitMaster: () => void;
};

const transportErrorMessage = '마스터 계정을 만들지 못했습니다. 다시 시도하세요.';

export function useCompanyMasterForm(companyId: string): CompanyMasterFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [open, setOpen] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [name, setName] = useState('');
  const [issued, setIssued] = useState<IssuedMasterAccount | null>(null);
  const mutation = useMutation({
    mutationFn: (submission: { loginId: string; name: string }) =>
      requestCompanyMasterCreate(companyId, submission),
    retry: 0,
    gcTime: 0,
    onSuccess: (response) => {
      if (
        response.master === undefined ||
        response.temporaryPassword === undefined ||
        response.temporaryPassword.length < 1 ||
        response.fieldErrors ||
        response.formError
      ) {
        return;
      }
      const master = response.master;
      replaceCompanyDetail(queryClient, companyId, { masters: [master] });
      setLoginId('');
      setName('');
      setIssued({ loginId: master.loginId, temporaryPassword: response.temporaryPassword });
      toast('마스터 계정을 만들었습니다.');
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const response = mutation.isError ? undefined : mutation.data;

  function resetFields(): void {
    setLoginId('');
    setName('');
    setIssued(null);
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

  function changeLoginId(event: ChangeEvent<HTMLInputElement>): void {
    setLoginId(event.currentTarget.value.slice(0, MAX_LOGIN_ID_LENGTH));
  }

  function changeName(event: ChangeEvent<HTMLInputElement>): void {
    setName(event.currentTarget.value.slice(0, MAX_ACCOUNT_NAME_LENGTH));
  }

  function submitMaster(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    submitLock.current = true;
    mutation.mutate({ loginId, name });
  }

  function resolveFormError(): string | undefined {
    if (mutation.isError) {
      return transportErrorMessage;
    }
    return response?.formError;
  }

  return {
    open,
    loginId,
    name,
    issued,
    fieldErrors: open && issued === null ? response?.fieldErrors : undefined,
    formError: open && issued === null ? resolveFormError() : undefined,
    isSubmitting: mutation.isPending,
    openDialog,
    closeDialog,
    changeLoginId,
    changeName,
    submitMaster,
  };
}
