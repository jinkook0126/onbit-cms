import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { requestEmployeeCreate } from '~/features/employees/api/employeeApi';
import { employeeQueryKeys } from '~/features/employees/api/employeeQuery';
import { MAX_EMPLOYEE_LOGIN_ID_LENGTH } from '~/features/employees/type';
import { MAX_ACCOUNT_NAME_LENGTH } from '~/features/settings/type';

import type { ChangeEvent } from 'react';
import type { EmployeeFieldErrors } from '~/features/employees/type';

type EmployeeCreateFormState = {
  open: boolean;
  loginId: string;
  name: string;
  fieldErrors?: EmployeeFieldErrors;
  formError?: string;
  isSubmitting: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  changeLoginId: (event: ChangeEvent<HTMLInputElement>) => void;
  changeName: (event: ChangeEvent<HTMLInputElement>) => void;
  submitEmployee: () => void;
};

const transportErrorMessage = '직원을 등록하지 못했습니다. 다시 시도하세요.';

export function useEmployeeCreateForm(companyId: string): EmployeeCreateFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [open, setOpen] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [name, setName] = useState('');
  const mutation = useMutation({
    mutationFn: (submission: { loginId: string; name: string }) =>
      requestEmployeeCreate({ ...submission, companyId }),
    onSuccess: (response) => {
      if (response.employee === undefined || response.fieldErrors || response.formError) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: employeeQueryKeys.all });
      setLoginId('');
      setName('');
      setOpen(false);
      toast('직원을 등록했습니다.');
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const response = mutation.isError ? undefined : mutation.data;

  function resetFields(): void {
    setLoginId('');
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

  function changeLoginId(event: ChangeEvent<HTMLInputElement>): void {
    setLoginId(event.currentTarget.value.slice(0, MAX_EMPLOYEE_LOGIN_ID_LENGTH));
  }

  function changeName(event: ChangeEvent<HTMLInputElement>): void {
    setName(event.currentTarget.value.slice(0, MAX_ACCOUNT_NAME_LENGTH));
  }

  function submitEmployee(): void {
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
    fieldErrors: open ? response?.fieldErrors : undefined,
    formError: open ? resolveFormError() : undefined,
    isSubmitting: mutation.isPending,
    openDialog,
    closeDialog,
    changeLoginId,
    changeName,
    submitEmployee,
  };
}
