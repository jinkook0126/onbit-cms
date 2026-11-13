import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { requestInstallmentPromiseUpdate } from '~/features/customers/api/customerApi';
import { customerQueryKeys } from '~/features/customers/api/customerQuery';
import { MAX_PROMISE_REASON_LENGTH } from '~/features/customers/type';

import type { ChangeEvent } from 'react';
import type {
  InstallmentListItem,
  InstallmentPromiseFieldErrors,
  InstallmentPromiseSubmission,
} from '~/features/customers/type';

type InstallmentPromiseFormState = {
  promisedOn: string;
  reason: string;
  fieldErrors?: InstallmentPromiseFieldErrors;
  formError?: string;
  isSubmitting: boolean;
  canSave: boolean;
  closeDialog: () => void;
  changePromisedOn: (value: string) => void;
  changeReason: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  submitPromise: () => void;
};

const transportErrorMessage = '약속일을 변경하지 못했습니다. 다시 시도하세요.';

export function useInstallmentPromiseForm(
  customerId: string,
  installment: InstallmentListItem,
  onClose: () => void,
): InstallmentPromiseFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [promisedOn, setPromisedOn] = useState(installment.promisedOn);
  const [reason, setReason] = useState('');
  const mutation = useMutation({
    mutationFn: (submission: InstallmentPromiseSubmission) =>
      requestInstallmentPromiseUpdate(customerId, installment.id, submission),
    onSuccess: (response) => {
      if (response.id === undefined || response.fieldErrors || response.formError) {
        return;
      }
      void queryClient.invalidateQueries({
        queryKey: customerQueryKeys.installments(customerId),
      });
      void queryClient.invalidateQueries({
        queryKey: customerQueryKeys.consultations(customerId),
      });
      void queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: customerQueryKeys.summary(customerId) });
      toast('약속일을 변경했습니다.');
      onClose();
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const response = mutation.isError ? undefined : mutation.data;

  function closeDialog(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    onClose();
  }

  function submitPromise(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    submitLock.current = true;
    mutation.mutate({ promisedOn, reason: reason.trim() });
  }

  return {
    promisedOn,
    reason,
    fieldErrors: response?.fieldErrors,
    formError: mutation.isError ? transportErrorMessage : response?.formError,
    isSubmitting: mutation.isPending,
    canSave: !mutation.isPending,
    closeDialog,
    changePromisedOn: setPromisedOn,
    changeReason: (event) => {
      setReason(event.target.value.slice(0, MAX_PROMISE_REASON_LENGTH));
    },
    submitPromise,
  };
}
