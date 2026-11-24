import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { useCatalogList } from '~/features/catalog/hooks/useCatalogList';
import { requestCustomerStatusUpdate } from '~/features/customers/api/customerApi';
import { customerQueryKeys, replaceCustomerDetail } from '~/features/customers/api/customerQuery';
import { toOptionRefs } from '~/features/customers/catalogOption';
import { isRetainedStatus } from '~/features/customers/type';

import type { CatalogOptionRef } from '~/features/catalog/type';
import type { CustomerStatusSubmission } from '~/features/customers/type';

type ConsultationStatusFormState = {
  statusId: string;
  statusOptions: CatalogOptionRef[];
  isDirty: boolean;
  formError?: string;
  isSubmitting: boolean;
  changeStatus: (statusId: string) => void;
  saveStatus: () => void;
};

const transportErrorMessage = '상담 상태를 변경하지 못했습니다. 다시 시도하세요.';

export function useConsultationStatusForm(
  customerId: string,
  savedStatus: CatalogOptionRef,
): ConsultationStatusFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [draft, setDraft] = useState<string | null>(null);
  const statuses = useCatalogList('consultation-statuses', true);
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
  const retained = isRetainedStatus(savedStatus.code);
  const statusId = retained ? savedStatus.id : (draft ?? savedStatus.id);

  function changeStatus(nextStatusId: string): void {
    if (mutation.isPending || retained) {
      return;
    }
    setDraft(nextStatusId === savedStatus.id ? null : nextStatusId);
  }

  function saveStatus(): void {
    if (
      submitLock.current ||
      mutation.isPending ||
      retained ||
      draft === null ||
      draft === savedStatus.id
    ) {
      return;
    }
    submitLock.current = true;
    mutation.mutate({ statusId: draft });
  }

  return {
    statusId,
    statusOptions: toOptionRefs(statuses.data?.items, savedStatus),
    isDirty: statusId !== savedStatus.id,
    formError: mutation.isError ? transportErrorMessage : response?.formError,
    isSubmitting: mutation.isPending,
    changeStatus,
    saveStatus,
  };
}
