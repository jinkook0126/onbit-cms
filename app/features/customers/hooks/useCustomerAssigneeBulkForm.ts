import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  requestCustomerAssigneeBatch,
  requestCustomerAssignees,
} from '~/features/customers/api/customerApi';
import { customerQueryKeys } from '~/features/customers/api/customerQuery';
import { defaultAssigneeId } from '~/features/customers/assigneeOption';
import { readQueryError } from '~/lib/formError';

import type { UseQueryResult } from '@tanstack/react-query';
import type { CustomerAssigneeResponse } from '~/features/customers/type';

type CustomerAssigneeBulkFormState = {
  open: boolean;
  assigneeId: string;
  assignees: UseQueryResult<CustomerAssigneeResponse>;
  formError?: string;
  isSubmitting: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  changeAssignee: (assigneeId: string) => void;
  submitAssignees: () => void;
};

const transportErrorMessage = '담당을 등록하지 못했습니다. 다시 시도하세요.';

export function useCustomerAssigneeBulkForm(
  customerIds: string[],
  onAssigned: () => void,
): CustomerAssigneeBulkFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [open, setOpen] = useState(false);
  const [assigneeOverride, setAssigneeOverride] = useState<string | null>(null);
  const assignees = useQuery({
    queryKey: customerQueryKeys.assignees(),
    queryFn: ({ signal }) => requestCustomerAssignees(signal),
    enabled: open,
  });
  const mutation = useMutation({
    mutationFn: requestCustomerAssigneeBatch,
    onSuccess: (response) => {
      if (response.updatedCount === undefined || response.formError !== undefined) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: customerQueryKeys.details() });
      setOpen(false);
      setAssigneeOverride(null);
      onAssigned();
      toast(`${response.updatedCount}명의 담당을 등록했습니다.`);
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const response = mutation.isError ? undefined : mutation.data;
  const assigneeOptions = assignees.data?.assignees ?? [];
  const assigneeId =
    assigneeOverride !== null &&
    assigneeOptions.some((assignee) => assignee.id === assigneeOverride)
      ? assigneeOverride
      : defaultAssigneeId(assigneeOptions, assignees.data?.currentUserId);

  function resetForm(): void {
    setAssigneeOverride(null);
    mutation.reset();
  }

  function openDialog(): void {
    if (customerIds.length === 0) {
      return;
    }
    resetForm();
    setOpen(true);
  }

  function closeDialog(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    setOpen(false);
    resetForm();
  }

  function changeAssignee(nextAssigneeId: string): void {
    setAssigneeOverride(nextAssigneeId);
  }

  function submitAssignees(): void {
    if (submitLock.current || mutation.isPending || customerIds.length === 0 || assigneeId === '') {
      return;
    }
    submitLock.current = true;
    mutation.mutate({ customerIds, assigneeId });
  }

  function resolveFormError(): string | undefined {
    if (!open) {
      return undefined;
    }
    if (response?.formError !== undefined) {
      return response.formError;
    }
    if (mutation.isError) {
      return readQueryError(mutation.error, transportErrorMessage);
    }
    return undefined;
  }

  return {
    open,
    assigneeId,
    assignees,
    formError: resolveFormError(),
    isSubmitting: mutation.isPending,
    openDialog,
    closeDialog,
    changeAssignee,
    submitAssignees,
  };
}
