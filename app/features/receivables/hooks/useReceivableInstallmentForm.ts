import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { customerQueryKeys } from '~/features/customers/api/customerQuery';
import { requestReceivableInstallment } from '~/features/receivables/api/receivableApi';
import { receivableQueryKeys } from '~/features/receivables/api/receivableQuery';

import type { ChangeEvent } from 'react';
import type {
  ReceivableInstallmentFieldErrors,
  ReceivableInstallmentSubmission,
  ReceivablePlanItem,
} from '~/features/receivables/type';

type ReceivableInstallmentFormState = {
  promisedOn: string;
  scheduledAmount: string;
  fieldErrors?: ReceivableInstallmentFieldErrors;
  formError?: string;
  isSubmitting: boolean;
  closeDialog: () => void;
  changePromisedOn: (value: string) => void;
  changeScheduledAmount: (event: ChangeEvent<HTMLInputElement>) => void;
  submitInstallment: () => void;
};

const transportErrorMessage = '예정일과 예정액을 변경하지 못했습니다. 다시 시도하세요.';
const amountDigitLimit = 10;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '').slice(0, amountDigitLimit);
}

export function useReceivableInstallmentForm(
  customerId: string,
  plan: ReceivablePlanItem,
  onClose: () => void,
): ReceivableInstallmentFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [promisedOn, setPromisedOn] = useState(plan.promisedOn);
  const [scheduledAmount, setScheduledAmount] = useState(String(plan.scheduledAmount));
  const mutation = useMutation({
    mutationFn: (submission: ReceivableInstallmentSubmission) =>
      requestReceivableInstallment(customerId, plan.id, submission),
    onSuccess: (response) => {
      if (response.id === undefined || response.fieldErrors || response.formError) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: receivableQueryKeys.detail(customerId) });
      void queryClient.invalidateQueries({ queryKey: receivableQueryKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: receivableQueryKeys.schedules() });
      void queryClient.invalidateQueries({ queryKey: receivableQueryKeys.calendars() });
      void queryClient.invalidateQueries({
        queryKey: customerQueryKeys.installments(customerId),
      });
      void queryClient.invalidateQueries({ queryKey: customerQueryKeys.summary(customerId) });
      onClose();
      toast('예정일과 예정액을 변경했습니다.');
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

  function submitInstallment(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    submitLock.current = true;
    mutation.mutate({ promisedOn, scheduledAmount });
  }

  return {
    promisedOn,
    scheduledAmount,
    fieldErrors: response?.fieldErrors,
    formError: mutation.isError ? transportErrorMessage : response?.formError,
    isSubmitting: mutation.isPending,
    closeDialog,
    changePromisedOn: setPromisedOn,
    changeScheduledAmount: (event) => {
      setScheduledAmount(digitsOnly(event.target.value));
    },
    submitInstallment,
  };
}
