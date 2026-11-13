import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { requestRefund } from '~/features/customers/api/customerApi';
import { customerQueryKeys } from '~/features/customers/api/customerQuery';
import { MAX_REFUND_REASON_LENGTH, REFUND_EXHAUSTED_MESSAGE } from '~/features/customers/type';

import type { ChangeEvent } from 'react';
import type { RefundFieldErrors, RefundSubmission } from '~/features/customers/type';

type RefundFormState = {
  open: boolean;
  paymentId: string;
  amount: string;
  refundedOn: string;
  reason: string;
  fieldErrors?: RefundFieldErrors;
  formError?: string;
  isSubmitting: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  changePayment: (paymentId: string) => void;
  changeAmount: (event: ChangeEvent<HTMLInputElement>) => void;
  changeRefundedOn: (value: string) => void;
  changeReason: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  submitRefund: () => void;
};

const transportErrorMessage = '환불을 등록하지 못했습니다. 다시 시도하세요.';
const amountDigitLimit = 10;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '').slice(0, amountDigitLimit);
}

export function useRefundForm(customerId: string): RefundFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [open, setOpen] = useState(false);
  const [paymentId, setPaymentId] = useState('');
  const [amount, setAmount] = useState('');
  const [refundedOn, setRefundedOn] = useState('');
  const [reason, setReason] = useState('');
  const mutation = useMutation({
    mutationFn: (submission: RefundSubmission) => requestRefund(customerId, submission),
    onSuccess: (response) => {
      if (response.formError === REFUND_EXHAUSTED_MESSAGE) {
        toast(REFUND_EXHAUSTED_MESSAGE);
        return;
      }
      if (response.id === undefined || response.fieldErrors || response.formError) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: customerQueryKeys.ledger(customerId) });
      void queryClient.invalidateQueries({
        queryKey: customerQueryKeys.installments(customerId),
      });
      void queryClient.invalidateQueries({
        queryKey: customerQueryKeys.consultations(customerId),
      });
      void queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: customerQueryKeys.summary(customerId) });
      setOpen(false);
      toast('환불을 등록했습니다.');
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const response = mutation.isError ? undefined : mutation.data;

  function resetForm(): void {
    setPaymentId('');
    setAmount('');
    setRefundedOn('');
    setReason('');
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

  function submitRefund(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    submitLock.current = true;
    mutation.mutate({
      paymentId,
      amount,
      refundedOn,
      reason: reason.trim(),
    });
  }

  return {
    open,
    paymentId,
    amount,
    refundedOn,
    reason,
    fieldErrors: response?.fieldErrors,
    formError: mutation.isError ? transportErrorMessage : response?.formError,
    isSubmitting: mutation.isPending,
    openDialog,
    closeDialog,
    changePayment: setPaymentId,
    changeAmount: (event) => {
      setAmount(digitsOnly(event.target.value));
    },
    changeRefundedOn: setRefundedOn,
    changeReason: (event) => {
      setReason(event.target.value.slice(0, MAX_REFUND_REASON_LENGTH));
    },
    submitRefund,
  };
}
