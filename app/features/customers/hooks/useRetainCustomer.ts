import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { useCatalogList } from '~/features/catalog/hooks/useCatalogList';
import { requestCustomerRetain } from '~/features/customers/api/customerApi';
import { customerQueryKeys, replaceCustomerDetail } from '~/features/customers/api/customerQuery';
import { toOptionRefs } from '~/features/customers/catalogOption';
import { isRetainedStatus } from '~/features/customers/type';

import type { ChangeEvent } from 'react';
import type { CatalogOptionRef } from '~/features/catalog/type';
import type {
  CustomerRetainFieldErrors,
  CustomerRetainSubmission,
} from '~/features/customers/type';

type RetainCustomerState = {
  open: boolean;
  contractedOn: string;
  caseTypeId: string;
  caseTypeOptions: CatalogOptionRef[];
  retainerFee: string;
  deposit: string;
  installmentCount: string;
  firstPaymentOn: string;
  fieldErrors?: CustomerRetainFieldErrors;
  formError?: string;
  isSubmitting: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  changeContractedOn: (value: string) => void;
  changeCaseType: (caseTypeId: string) => void;
  changeRetainerFee: (event: ChangeEvent<HTMLInputElement>) => void;
  changeDeposit: (event: ChangeEvent<HTMLInputElement>) => void;
  changeInstallmentCount: (event: ChangeEvent<HTMLInputElement>) => void;
  changeFirstPaymentOn: (value: string) => void;
  submitRetain: () => void;
};

const transportErrorMessage = '수임으로 전환하지 못했습니다. 다시 시도하세요.';
const moneyDigitLimit = 10;
const installmentDigitLimit = 3;

function digitsOnly(value: string, maxLength: number): string {
  return value.replace(/\D/g, '').slice(0, maxLength);
}

export function useRetainCustomer(customerId: string): RetainCustomerState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [open, setOpen] = useState(false);
  const [contractedOn, setContractedOn] = useState('');
  const [caseTypeId, setCaseTypeId] = useState('');
  const [retainerFee, setRetainerFee] = useState('');
  const [deposit, setDeposit] = useState('');
  const [installmentCount, setInstallmentCount] = useState('');
  const [firstPaymentOn, setFirstPaymentOn] = useState('');
  const caseTypes = useCatalogList('case-types', true);
  const caseTypeOptions = toOptionRefs(caseTypes.data?.items, null);
  const mutation = useMutation({
    mutationFn: (submission: CustomerRetainSubmission) =>
      requestCustomerRetain(customerId, submission),
    onSuccess: (response, submission) => {
      if (
        response.status === undefined ||
        !isRetainedStatus(response.status.code) ||
        response.fieldErrors ||
        response.formError
      ) {
        return;
      }
      replaceCustomerDetail(queryClient, customerId, {
        status: response.status,
        caseType: caseTypeOptions.find((option) => option.id === submission.caseTypeId) ?? null,
      });
      void queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() });
      void queryClient.invalidateQueries({
        queryKey: customerQueryKeys.consultations(customerId),
      });
      void queryClient.invalidateQueries({
        queryKey: customerQueryKeys.installments(customerId),
      });
      void queryClient.invalidateQueries({
        queryKey: customerQueryKeys.summary(customerId),
      });
      setOpen(false);
      toast('수임으로 전환했습니다.');
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const response = mutation.isError ? undefined : mutation.data;

  function resetForm(): void {
    setContractedOn('');
    setCaseTypeId('');
    setRetainerFee('');
    setDeposit('');
    setInstallmentCount('');
    setFirstPaymentOn('');
  }

  function openDrawer(): void {
    mutation.reset();
    resetForm();
    setOpen(true);
  }

  function closeDrawer(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    setOpen(false);
    mutation.reset();
  }

  function submitRetain(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    submitLock.current = true;
    mutation.mutate({
      contractedOn,
      caseTypeId,
      retainerFee,
      deposit,
      installmentCount,
      firstPaymentOn,
    });
  }

  return {
    open,
    contractedOn,
    caseTypeId,
    caseTypeOptions,
    retainerFee,
    deposit,
    installmentCount,
    firstPaymentOn,
    fieldErrors: response?.fieldErrors,
    formError: mutation.isError ? transportErrorMessage : response?.formError,
    isSubmitting: mutation.isPending,
    openDrawer,
    closeDrawer,
    changeContractedOn: setContractedOn,
    changeCaseType: setCaseTypeId,
    changeRetainerFee: (event) => {
      setRetainerFee(digitsOnly(event.target.value, moneyDigitLimit));
    },
    changeDeposit: (event) => {
      setDeposit(digitsOnly(event.target.value, moneyDigitLimit));
    },
    changeInstallmentCount: (event) => {
      setInstallmentCount(digitsOnly(event.target.value, installmentDigitLimit));
    },
    changeFirstPaymentOn: setFirstPaymentOn,
    submitRetain,
  };
}
