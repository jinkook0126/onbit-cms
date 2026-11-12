import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  requestCustomerAssignees,
  requestCustomerCreate,
} from '~/features/customers/api/customerApi';
import { customerQueryKeys } from '~/features/customers/api/customerQuery';
import { MAX_CUSTOMER_NAME_LENGTH, customerPhoneDigits } from '~/features/customers/type';

import type { UseQueryResult } from '@tanstack/react-query';
import type { ChangeEvent } from 'react';
import type {
  CustomerAssigneeOption,
  CustomerAssigneeResponse,
  CustomerCreateFieldErrors,
  CustomerCreateSubmission,
  InflowSource,
} from '~/features/customers/type';

type CustomerCreateFormState = {
  open: boolean;
  name: string;
  phone: string;
  source: InflowSource | '';
  assigneeId: string;
  nextContactOn: string;
  assignees: UseQueryResult<CustomerAssigneeResponse>;
  fieldErrors?: CustomerCreateFieldErrors;
  formError?: string;
  isSubmitting: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  changeName: (event: ChangeEvent<HTMLInputElement>) => void;
  changePhone: (event: ChangeEvent<HTMLInputElement>) => void;
  changeSource: (source: InflowSource) => void;
  changeAssignee: (assigneeId: string) => void;
  changeNextContactOn: (value: string) => void;
  submitCustomer: () => void;
};

const transportErrorMessage = '상담 고객을 등록하지 못했습니다. 다시 시도하세요.';

function defaultAssigneeId(
  options: CustomerAssigneeOption[],
  currentUserId: string | undefined,
): string {
  const self =
    currentUserId === undefined
      ? undefined
      : options.find((assignee) => assignee.id === currentUserId);
  if (self) {
    return self.id;
  }
  if (options.length === 0) {
    return '';
  }
  return options[0].id;
}

export function useCustomerCreateForm(): CustomerCreateFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState<InflowSource | ''>('');
  const [assigneeOverride, setAssigneeOverride] = useState<string | null>(null);
  const [nextContactOn, setNextContactOn] = useState('');
  const assignees = useQuery({
    queryKey: customerQueryKeys.assignees(),
    queryFn: ({ signal }) => requestCustomerAssignees(signal),
    enabled: open,
  });
  const mutation = useMutation({
    mutationFn: (submission: CustomerCreateSubmission) => requestCustomerCreate(submission),
    onSuccess: (response) => {
      if (response.id === undefined || response.fieldErrors || response.formError) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() });
      setOpen(false);
      resetFields();
      toast('상담 고객을 등록했습니다.');
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

  function resetFields(): void {
    setName('');
    setPhone('');
    setSource('');
    setAssigneeOverride(null);
    setNextContactOn('');
    mutation.reset();
  }

  function openDrawer(): void {
    resetFields();
    setOpen(true);
  }

  function closeDrawer(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    setOpen(false);
    resetFields();
  }

  function changeName(event: ChangeEvent<HTMLInputElement>): void {
    setName(event.currentTarget.value.slice(0, MAX_CUSTOMER_NAME_LENGTH));
  }

  function changePhone(event: ChangeEvent<HTMLInputElement>): void {
    setPhone(customerPhoneDigits(event.currentTarget.value));
  }

  function changeSource(nextSource: InflowSource): void {
    setSource(nextSource);
  }

  function changeAssignee(nextAssigneeId: string): void {
    setAssigneeOverride(nextAssigneeId);
  }

  function changeNextContactOn(value: string): void {
    setNextContactOn(value);
  }

  function submitCustomer(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    submitLock.current = true;
    const trimmedDate = nextContactOn.trim();
    mutation.mutate({
      name,
      phone,
      source,
      assigneeId,
      nextContactOn: trimmedDate === '' ? null : trimmedDate,
    });
  }

  function resolveFormError(): string | undefined {
    if (mutation.isError) {
      return transportErrorMessage;
    }
    return response?.formError;
  }

  return {
    open,
    name,
    phone,
    source,
    assigneeId,
    nextContactOn,
    assignees,
    fieldErrors: open ? response?.fieldErrors : undefined,
    formError: open ? resolveFormError() : undefined,
    isSubmitting: mutation.isPending,
    openDrawer,
    closeDrawer,
    changeName,
    changePhone,
    changeSource,
    changeAssignee,
    changeNextContactOn,
    submitCustomer,
  };
}
