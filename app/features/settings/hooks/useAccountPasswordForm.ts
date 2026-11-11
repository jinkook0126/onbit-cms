import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { requestAccountPasswordUpdate } from '~/features/settings/api/accountApi';

import type { ChangeEvent } from 'react';
import type { AccountPasswordFieldErrors } from '~/features/settings/type';

type PasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword';

type AccountPasswordFormState = {
  open: boolean;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  fieldErrors?: AccountPasswordFieldErrors;
  formError?: string;
  isSubmitting: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  changePasswordField: (field: PasswordField, event: ChangeEvent<HTMLInputElement>) => void;
  submitPassword: () => void;
};

const transportErrorMessage = '비밀번호를 변경하지 못했습니다. 다시 시도하세요.';

export function useAccountPasswordForm(): AccountPasswordFormState {
  const submitLock = useRef(false);
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const mutation = useMutation({
    mutationFn: requestAccountPasswordUpdate,
    retry: 0,
    gcTime: 0,
    onSuccess: (response) => {
      if (response.passwordChanged !== true) {
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOpen(false);
      toast('비밀번호를 변경했습니다.');
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const response = mutation.isError ? undefined : mutation.data;

  function resetFields(): void {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
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

  function changePasswordField(field: PasswordField, event: ChangeEvent<HTMLInputElement>): void {
    const value = event.currentTarget.value;
    if (field === 'currentPassword') {
      setCurrentPassword(value);
      return;
    }
    if (field === 'newPassword') {
      setNewPassword(value);
      return;
    }
    setConfirmPassword(value);
  }

  function submitPassword(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    submitLock.current = true;
    mutation.mutate({ currentPassword, newPassword, confirmPassword });
  }

  function resolveFormError(): string | undefined {
    if (mutation.isError) {
      return transportErrorMessage;
    }
    return response?.formError;
  }

  return {
    open,
    currentPassword,
    newPassword,
    confirmPassword,
    fieldErrors: open ? response?.fieldErrors : undefined,
    formError: open ? resolveFormError() : undefined,
    isSubmitting: mutation.isPending,
    openDialog,
    closeDialog,
    changePasswordField,
    submitPassword,
  };
}
