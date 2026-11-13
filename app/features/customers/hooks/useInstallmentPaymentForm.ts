import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { requestInstallmentPayment } from '~/features/customers/api/customerApi';
import { customerQueryKeys } from '~/features/customers/api/customerQuery';
import { INSTALLMENT_ALREADY_PAID_MESSAGE } from '~/features/customers/type';

import type { ChangeEvent } from 'react';
import type {
  InstallmentListItem,
  InstallmentPaymentFieldErrors,
  InstallmentPaymentSubmission,
  PaymentMethod,
} from '~/features/customers/type';

type InstallmentPaymentFormState = {
  open: boolean;
  amount: string;
  paidOn: string;
  installmentId: string;
  method: PaymentMethod | '';
  fieldErrors?: InstallmentPaymentFieldErrors;
  formError?: string;
  isSubmitting: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  changeAmount: (event: ChangeEvent<HTMLInputElement>) => void;
  changePaidOn: (value: string) => void;
  changeInstallment: (installmentId: string) => void;
  changeMethod: (method: PaymentMethod) => void;
  submitPayment: () => void;
};

const transportErrorMessage = '입금을 등록하지 못했습니다. 다시 시도하세요.';
const amountDigitLimit = 10;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '').slice(0, amountDigitLimit);
}

function isFullyPaid(installment: InstallmentListItem | undefined): boolean {
  return installment !== undefined && installment.receivedAmount >= installment.scheduledAmount;
}

export function useInstallmentPaymentForm(
  customerId: string,
  installments: InstallmentListItem[],
): InstallmentPaymentFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [paidOn, setPaidOn] = useState('');
  const [installmentId, setInstallmentId] = useState('');
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [paidNotice, setPaidNotice] = useState<string | undefined>(undefined);
  const mutation = useMutation({
    mutationFn: (submission: InstallmentPaymentSubmission) =>
      requestInstallmentPayment(customerId, submission),
    onSuccess: (response) => {
      if (response.formError === INSTALLMENT_ALREADY_PAID_MESSAGE) {
        toast(INSTALLMENT_ALREADY_PAID_MESSAGE);
        return;
      }
      if (response.id === undefined || response.fieldErrors || response.formError) {
        return;
      }
      void queryClient.invalidateQueries({
        queryKey: customerQueryKeys.installments(customerId),
      });
      void queryClient.invalidateQueries({
        queryKey: customerQueryKeys.ledger(customerId),
      });
      void queryClient.invalidateQueries({
        queryKey: customerQueryKeys.summary(customerId),
      });
      setOpen(false);
      toast('입금을 등록했습니다.');
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const response = mutation.isError ? undefined : mutation.data;

  function resetForm(): void {
    setAmount('');
    setPaidOn('');
    setInstallmentId('');
    setMethod('');
    setPaidNotice(undefined);
    mutation.reset();
  }

  function openDialog(): void {
    resetForm();
    setOpen(true);
  }

  function closeDialog(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    setOpen(false);
  }

  function changeInstallment(nextId: string): void {
    setInstallmentId(nextId);
    const selected = installments.find((installment) => installment.id === nextId);
    if (!isFullyPaid(selected)) {
      setPaidNotice(undefined);
      return;
    }
    setPaidNotice(INSTALLMENT_ALREADY_PAID_MESSAGE);
    toast(INSTALLMENT_ALREADY_PAID_MESSAGE);
  }

  function submitPayment(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    const selected = installments.find((installment) => installment.id === installmentId);
    if (isFullyPaid(selected)) {
      setPaidNotice(INSTALLMENT_ALREADY_PAID_MESSAGE);
      toast(INSTALLMENT_ALREADY_PAID_MESSAGE);
      return;
    }
    submitLock.current = true;
    mutation.mutate({
      amount,
      paidOn,
      installmentId,
      method,
    });
  }

  const serverFormError = mutation.isError ? transportErrorMessage : response?.formError;

  return {
    open,
    amount,
    paidOn,
    installmentId,
    method,
    fieldErrors: response?.fieldErrors,
    formError: paidNotice ?? serverFormError,
    isSubmitting: mutation.isPending,
    openDialog,
    closeDialog,
    changeAmount: (event) => {
      setAmount(digitsOnly(event.target.value));
    },
    changePaidOn: setPaidOn,
    changeInstallment,
    changeMethod: setMethod,
    submitPayment,
  };
}
