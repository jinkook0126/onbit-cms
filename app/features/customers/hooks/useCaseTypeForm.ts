import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { requestCustomerCaseTypeUpdate } from '~/features/customers/api/customerApi';
import { customerQueryKeys, replaceCustomerDetail } from '~/features/customers/api/customerQuery';

import type { CaseType, CustomerCaseTypeSubmission } from '~/features/customers/type';

type CaseTypeFormState = {
  editing: boolean;
  caseType: CaseType;
  isDirty: boolean;
  formError?: string;
  isSubmitting: boolean;
  beginEditing: () => void;
  cancelEditing: () => void;
  changeCaseType: (caseType: CaseType) => void;
  saveCaseType: () => void;
};

const transportErrorMessage = '사건 유형을 변경하지 못했습니다. 다시 시도하세요.';

export function useCaseTypeForm(customerId: string, savedCaseType: CaseType): CaseTypeFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CaseType | null>(null);
  const mutation = useMutation({
    mutationFn: (submission: CustomerCaseTypeSubmission) =>
      requestCustomerCaseTypeUpdate(customerId, submission),
    onSuccess: (response) => {
      if (response.caseType === undefined || response.formError) {
        return;
      }
      replaceCustomerDetail(queryClient, customerId, { caseType: response.caseType });
      void queryClient.invalidateQueries({
        queryKey: customerQueryKeys.consultations(customerId),
      });
      void queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() });
      setDraft(null);
      setEditing(false);
      toast('사건 유형을 변경했습니다.');
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const response = mutation.isError ? undefined : mutation.data;
  const caseType = draft ?? savedCaseType;

  function beginEditing(): void {
    if (mutation.isPending) {
      return;
    }
    mutation.reset();
    setDraft(null);
    setEditing(true);
  }

  function cancelEditing(): void {
    if (mutation.isPending) {
      return;
    }
    mutation.reset();
    setDraft(null);
    setEditing(false);
  }

  function changeCaseType(nextCaseType: CaseType): void {
    if (mutation.isPending) {
      return;
    }
    setDraft(nextCaseType === savedCaseType ? null : nextCaseType);
  }

  function saveCaseType(): void {
    if (submitLock.current || mutation.isPending || draft === null || draft === savedCaseType) {
      return;
    }
    submitLock.current = true;
    mutation.mutate({ caseType: draft });
  }

  return {
    editing,
    caseType,
    isDirty: caseType !== savedCaseType,
    formError: mutation.isError ? transportErrorMessage : response?.formError,
    isSubmitting: mutation.isPending,
    beginEditing,
    cancelEditing,
    changeCaseType,
    saveCaseType,
  };
}
