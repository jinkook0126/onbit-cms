import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { requestCustomerStatusUpdate } from '~/features/customers/api/customerApi';
import { customerQueryKeys, replaceCustomerDetail } from '~/features/customers/api/customerQuery';

import type { ConsultationStatus, CustomerStatusSubmission } from '~/features/customers/type';

type ConsultationStatusFormState = {
  status: ConsultationStatus;
  isDirty: boolean;
  formError?: string;
  isSubmitting: boolean;
  changeStatus: (status: ConsultationStatus) => void;
  saveStatus: () => void;
};

const transportErrorMessage = '상담 상태를 변경하지 못했습니다. 다시 시도하세요.';

export function useConsultationStatusForm(
  customerId: string,
  savedStatus: ConsultationStatus,
): ConsultationStatusFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [draft, setDraft] = useState<ConsultationStatus | null>(null);
  const mutation = useMutation({
    mutationFn: (submission: CustomerStatusSubmission) =>
      requestCustomerStatusUpdate(customerId, submission),
    onSuccess: (response) => {
      if (response.status === undefined || response.formError) {
        return;
      }
      replaceCustomerDetail(queryClient, customerId, { status: response.status });
      void queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() });
      setDraft(null);
      toast('상담 상태를 변경했습니다.');
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const response = mutation.isError ? undefined : mutation.data;
  const status = savedStatus === 'RETAINED' ? savedStatus : (draft ?? savedStatus);

  function changeStatus(nextStatus: ConsultationStatus): void {
    if (mutation.isPending || savedStatus === 'RETAINED') {
      return;
    }
    setDraft(nextStatus === savedStatus ? null : nextStatus);
  }

  function saveStatus(): void {
    if (
      submitLock.current ||
      mutation.isPending ||
      savedStatus === 'RETAINED' ||
      draft === null ||
      draft === savedStatus
    ) {
      return;
    }
    submitLock.current = true;
    mutation.mutate({ status: draft });
  }

  return {
    status,
    isDirty: status !== savedStatus,
    formError: mutation.isError ? transportErrorMessage : response?.formError,
    isSubmitting: mutation.isPending,
    changeStatus,
    saveStatus,
  };
}
