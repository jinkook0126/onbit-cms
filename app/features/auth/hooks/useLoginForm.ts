import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { authQueryKeys } from '~/features/auth/api/authQuery';
import { requestLogin } from '~/features/auth/api/loginApi';
import { loginIntent } from '~/features/auth/type';

import type { ChangeEvent } from 'react';
import type {
  LoginFieldErrors,
  LoginIntent,
  LoginResponse,
  LoginSubmission,
} from '~/features/auth/type';

type LoginFormValues = {
  username: string;
  password: string;
};

type PasswordChangeValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type LoginFormState = {
  password: string;
  username: string;
  fieldErrors?: LoginFieldErrors;
  formError?: string;
  dialogFormError?: string;
  passwordChanged: boolean;
  showPasswordChange: boolean;
  isLoggingIn: boolean;
  isChangingPassword: boolean;
  changePassword: (event: ChangeEvent<HTMLInputElement>) => void;
  dismissPasswordChange: () => void;
  submitLogin: (values: LoginFormValues) => void;
  submitPasswordChange: (values: PasswordChangeValues) => void;
};

function transportErrorMessage(intent: LoginIntent | undefined): string {
  if (intent === loginIntent.changePassword) {
    return '비밀번호를 변경하지 못했습니다. 다시 시도하세요.';
  }
  return '로그인하지 못했습니다. 다시 시도하세요.';
}

function notifyPasswordChangeResult(result: LoginResponse): void {
  if (result.passwordChanged === true) {
    toast('비밀번호를 변경했습니다. 새 비밀번호로 다시 로그인하세요.');
    return;
  }
  if (result.formError) {
    toast(result.formError);
    return;
  }
  const fieldMessage = result.fieldErrors?.newPassword ?? result.fieldErrors?.confirmPassword;
  if (fieldMessage) {
    toast(fieldMessage);
    return;
  }
  if (result.fieldErrors) {
    toast('비밀번호를 변경하지 못했습니다.');
  }
}

function shouldClearPassword(
  showPasswordChange: boolean,
  isError: boolean,
  response: LoginResponse | undefined,
): boolean {
  if (showPasswordChange || (!isError && !response)) {
    return false;
  }
  if (isError) {
    return true;
  }
  return response?.passwordChanged === true || response?.formError !== undefined;
}

export function useLoginForm(): LoginFormState {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [password, setPassword] = useState('');
  const [passwordOwner, setPasswordOwner] = useState<number | null>(null);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const loginMutation = useMutation({
    mutationFn: requestLogin,
    retry: 0,
    gcTime: 0,
    onSuccess: (result, variables) => {
      if (variables.intent === loginIntent.changePassword) {
        notifyPasswordChangeResult(result);
      }
      if (!result.redirectTo) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: authQueryKeys.all });
      void navigate(result.redirectTo);
    },
    onError: (_error, variables) => {
      if (variables.intent === loginIntent.changePassword) {
        toast(transportErrorMessage(loginIntent.changePassword));
      }
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const submission = loginMutation.variables;
  const response = loginMutation.isError ? undefined : loginMutation.data;
  const submittedAt = loginMutation.submittedAt;
  const changeFailed = loginMutation.isError && submission?.intent === loginIntent.changePassword;
  const showPasswordChange =
    dismissedAt !== submittedAt && (changeFailed || response?.showPasswordChange === true);
  const currentPassword =
    shouldClearPassword(showPasswordChange, loginMutation.isError, response) &&
    passwordOwner !== submittedAt
      ? ''
      : password;

  function changePassword(event: ChangeEvent<HTMLInputElement>): void {
    setPasswordOwner(submittedAt);
    setPassword(event.currentTarget.value);
  }

  function dismissPasswordChange(): void {
    setDismissedAt(submittedAt);
    setPasswordOwner(submittedAt);
    setPassword('');
  }

  function startSubmission(input: LoginSubmission): void {
    if (submitLock.current || loginMutation.isPending) {
      return;
    }
    submitLock.current = true;
    loginMutation.mutate(input);
  }

  function submitLogin(values: LoginFormValues): void {
    startSubmission({
      intent: loginIntent.login,
      username: values.username,
      password: values.password,
    });
  }

  function submitPasswordChange(values: PasswordChangeValues): void {
    startSubmission({
      intent: loginIntent.changePassword,
      username: response?.values?.username ?? submission?.username ?? '',
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      confirmPassword: values.confirmPassword,
    });
  }

  function resolveUsername(): string {
    if (response?.values?.username) {
      return response.values.username;
    }
    return submission?.username ?? '';
  }

  function resolveFormError(): string | undefined {
    if (showPasswordChange) {
      return undefined;
    }
    if (loginMutation.isError) {
      return transportErrorMessage(submission?.intent);
    }
    return response?.formError;
  }

  function resolveDialogFormError(): string | undefined {
    if (!showPasswordChange) {
      return undefined;
    }
    if (changeFailed) {
      return transportErrorMessage(loginIntent.changePassword);
    }
    return response?.formError;
  }

  return {
    password: currentPassword,
    username: resolveUsername(),
    fieldErrors: loginMutation.isError ? undefined : response?.fieldErrors,
    formError: resolveFormError(),
    dialogFormError: resolveDialogFormError(),
    passwordChanged: response?.passwordChanged === true,
    showPasswordChange,
    isLoggingIn: loginMutation.isPending && submission?.intent === loginIntent.login,
    isChangingPassword:
      loginMutation.isPending && submission?.intent === loginIntent.changePassword,
    changePassword,
    dismissPasswordChange,
    submitLogin,
    submitPasswordChange,
  };
}
