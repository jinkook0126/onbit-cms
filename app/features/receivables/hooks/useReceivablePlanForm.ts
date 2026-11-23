import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { requestReceivablePlan } from '~/features/receivables/api/receivableApi';
import { receivableQueryKeys } from '~/features/receivables/api/receivableQuery';

import type { ChangeEvent } from 'react';
import type {
  ReceivablePlanFieldErrors,
  ReceivablePlanSubmission,
} from '~/features/receivables/type';

export type ReceivablePlanDefaults = {
  deposit: string;
  installmentCount: string;
  paidOn: string;
  amount: string;
};

type ReceivablePlanFormState = {
  open: boolean;
  deposit: string;
  installmentCount: string;
  paidOn: string;
  amount: string;
  fieldErrors?: ReceivablePlanFieldErrors;
  formError?: string;
  isSubmitting: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  changeDeposit: (event: ChangeEvent<HTMLInputElement>) => void;
  changeInstallmentCount: (event: ChangeEvent<HTMLInputElement>) => void;
  changePaidOn: (value: string) => void;
  changeAmount: (event: ChangeEvent<HTMLInputElement>) => void;
  submitPlan: () => void;
};

const transportErrorMessage = '분납 계획을 저장하지 못했습니다. 다시 시도하세요.';
const amountDigitLimit = 10;
const countDigitLimit = 3;

function digitsOnly(value: string, limit: number): string {
  return value.replace(/\D/g, '').slice(0, limit);
}

export function useReceivablePlanForm(
  customerId: string,
  defaults: ReceivablePlanDefaults,
): ReceivablePlanFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [open, setOpen] = useState(false);
  const [deposit, setDeposit] = useState(defaults.deposit);
  const [installmentCount, setInstallmentCount] = useState(defaults.installmentCount);
  const [paidOn, setPaidOn] = useState(defaults.paidOn);
  const [amount, setAmount] = useState(defaults.amount);
  const mutation = useMutation({
    mutationFn: (submission: ReceivablePlanSubmission) =>
      requestReceivablePlan(customerId, submission),
    onSuccess: (response) => {
      if (response.id === undefined || response.fieldErrors || response.formError) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: receivableQueryKeys.detail(customerId) });
      void queryClient.invalidateQueries({ queryKey: receivableQueryKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: receivableQueryKeys.schedules() });
      void queryClient.invalidateQueries({ queryKey: receivableQueryKeys.calendars() });
      setOpen(false);
      toast('분납 계획을 저장했습니다.');
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const response = mutation.isError ? undefined : mutation.data;

  function openDialog(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    setDeposit(defaults.deposit);
    setInstallmentCount(defaults.installmentCount);
    setPaidOn(defaults.paidOn);
    setAmount(defaults.amount);
    mutation.reset();
    setOpen(true);
  }

  function closeDialog(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    setOpen(false);
  }

  function submitPlan(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    submitLock.current = true;
    mutation.mutate({ deposit, installmentCount, paidOn, amount });
  }

  return {
    open,
    deposit,
    installmentCount,
    paidOn,
    amount,
    fieldErrors: response?.fieldErrors,
    formError: mutation.isError ? transportErrorMessage : response?.formError,
    isSubmitting: mutation.isPending,
    openDialog,
    closeDialog,
    changeDeposit: (event) => {
      setDeposit(digitsOnly(event.target.value, amountDigitLimit));
    },
    changeInstallmentCount: (event) => {
      setInstallmentCount(digitsOnly(event.target.value, countDigitLimit));
    },
    changePaidOn: setPaidOn,
    changeAmount: (event) => {
      setAmount(digitsOnly(event.target.value, amountDigitLimit));
    },
    submitPlan,
  };
}
