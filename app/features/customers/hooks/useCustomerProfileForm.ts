import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { DEFAULT_STATUS_CODE } from '~/features/catalog/defaults';
import { useCatalogList } from '~/features/catalog/hooks/useCatalogList';
import {
  requestCustomerAssignees,
  requestCustomerCreate,
  requestCustomerProfileUpdate,
} from '~/features/customers/api/customerApi';
import { customerQueryKeys } from '~/features/customers/api/customerQuery';
import { defaultAssigneeId } from '~/features/customers/assigneeOption';
import { toOptionRefs } from '~/features/customers/catalogOption';
import {
  MAX_CUSTOMER_NAME_LENGTH,
  customerPhoneDigits,
  isRetainedStatus,
} from '~/features/customers/type';

import type { UseQueryResult } from '@tanstack/react-query';
import type { ChangeEvent } from 'react';
import type { CatalogOptionRef } from '~/features/catalog/type';
import type {
  CustomerAssigneeResponse,
  CustomerDetail,
  CustomerProfileFieldErrors,
  CustomerProfileSubmission,
} from '~/features/customers/type';

type CustomerProfileFormState = {
  name: string;
  phone: string;
  sourceId: string;
  assigneeId: string;
  statusId: string;
  caseTypeId: string;
  firstProcessedOn: string;
  contractedOn: string;
  retainerFee: string;
  statusLocked: boolean;
  retainFieldsEnabled: boolean;
  assignees: UseQueryResult<CustomerAssigneeResponse>;
  sourceOptions: CatalogOptionRef[];
  statusOptions: CatalogOptionRef[];
  caseTypeOptions: CatalogOptionRef[];
  catalogError: boolean;
  fieldErrors?: CustomerProfileFieldErrors;
  formError?: string;
  isSubmitting: boolean;
  changeName: (event: ChangeEvent<HTMLInputElement>) => void;
  changePhone: (event: ChangeEvent<HTMLInputElement>) => void;
  changeSource: (sourceId: string) => void;
  changeAssignee: (assigneeId: string) => void;
  changeStatus: (statusId: string) => void;
  changeCaseType: (caseTypeId: string) => void;
  changeFirstProcessedOn: (value: string) => void;
  changeContractedOn: (value: string) => void;
  changeRetainerFee: (event: ChangeEvent<HTMLInputElement>) => void;
  submitProfile: () => void;
};

const createErrorMessage = '상담 고객을 등록하지 못했습니다. 다시 시도하세요.';
const updateErrorMessage = '상담 고객을 수정하지 못했습니다. 다시 시도하세요.';
const retainerDigitLimit = 10;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '').slice(0, retainerDigitLimit);
}

function readFormError(
  failed: boolean,
  mode: 'create' | 'edit',
  formError: string | undefined,
): string | undefined {
  if (!failed) {
    return formError;
  }
  if (mode === 'create') {
    return createErrorMessage;
  }
  return updateErrorMessage;
}

export function useCustomerProfileForm(
  mode: 'create' | 'edit',
  customer: CustomerDetail | null,
  onSaved: () => void,
): CustomerProfileFormState {
  const queryClient = useQueryClient();
  const submitLock = useRef(false);
  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [sourceId, setSourceId] = useState(customer?.source.id ?? '');
  const [assigneeOverride, setAssigneeOverride] = useState<string | null>(
    customer?.assigneeId ?? null,
  );
  const [statusOverride, setStatusOverride] = useState<string | null>(customer?.status.id ?? null);
  const [caseTypeId, setCaseTypeId] = useState(customer?.caseType?.id ?? '');
  const [firstProcessedOn, setFirstProcessedOn] = useState(customer?.firstProcessedOn ?? '');
  const [contractedOn, setContractedOn] = useState(customer?.contractedOn ?? '');
  const [retainerFee, setRetainerFee] = useState(
    customer?.retainerFee === null || customer?.retainerFee === undefined
      ? ''
      : String(customer.retainerFee),
  );
  const assignees = useQuery({
    queryKey: customerQueryKeys.assignees(),
    queryFn: ({ signal }) => requestCustomerAssignees(signal),
  });
  const sources = useCatalogList('inflow-sources', true);
  const statuses = useCatalogList('consultation-statuses', true);
  const caseTypes = useCatalogList('case-types', true);
  const sourceOptions = toOptionRefs(sources.data?.items, customer?.source);
  const statusOptions = toOptionRefs(statuses.data?.items, customer?.status);
  const caseTypeOptions = toOptionRefs(caseTypes.data?.items, customer?.caseType);
  const defaultStatusId = statusOptions.find((option) => option.code === DEFAULT_STATUS_CODE)?.id;
  const statusId = statusOverride ?? (mode === 'create' ? (defaultStatusId ?? '') : '');
  const retained = isRetainedStatus(
    statusOptions.find((option) => option.id === statusId)?.code ?? null,
  );
  const mutation = useMutation({
    mutationFn: (submission: CustomerProfileSubmission) =>
      mode === 'create' || customer === null
        ? requestCustomerCreate(submission)
        : requestCustomerProfileUpdate(customer.id, submission),
    onSuccess: (response) => {
      if (response.fieldErrors || response.formError) {
        return;
      }
      if (mode === 'create' && response.id === undefined) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() });
      if (customer) {
        void queryClient.invalidateQueries({ queryKey: customerQueryKeys.detail(customer.id) });
        void queryClient.invalidateQueries({
          queryKey: customerQueryKeys.consultations(customer.id),
        });
        void queryClient.invalidateQueries({ queryKey: customerQueryKeys.summary(customer.id) });
        void queryClient.invalidateQueries({
          queryKey: customerQueryKeys.installments(customer.id),
        });
      }
      toast(mode === 'create' ? '상담 고객을 등록했습니다.' : '고객 정보를 수정했습니다.');
      onSaved();
    },
    onSettled: () => {
      submitLock.current = false;
    },
  });
  const response = mutation.isError ? undefined : mutation.data;
  const assigneeOptions = assignees.data?.assignees ?? [];
  let assigneeId = '';
  if (assigneeOverride !== null) {
    assigneeId = assigneeOverride;
  } else if (mode === 'create') {
    assigneeId = defaultAssigneeId(assigneeOptions, assignees.data?.currentUserId);
  }

  function changeStatus(nextStatusId: string): void {
    setStatusOverride(nextStatusId);
    const next = statusOptions.find((option) => option.id === nextStatusId);
    if (!isRetainedStatus(next?.code ?? null)) {
      setContractedOn('');
      setRetainerFee('');
    }
  }

  function submitProfile(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    submitLock.current = true;
    mutation.mutate({
      name,
      phone,
      sourceId,
      assigneeId,
      statusId,
      caseTypeId: caseTypeId === '' ? null : caseTypeId,
      firstProcessedOn: firstProcessedOn.trim() === '' ? null : firstProcessedOn,
      contractedOn: retained && contractedOn.trim() !== '' ? contractedOn : null,
      retainerFee: retained && retainerFee.trim() !== '' ? retainerFee : null,
    });
  }

  return {
    name,
    phone,
    sourceId,
    assigneeId,
    statusId,
    caseTypeId,
    firstProcessedOn,
    contractedOn,
    retainerFee,
    statusLocked: isRetainedStatus(customer?.status.code ?? null),
    retainFieldsEnabled: retained,
    assignees,
    sourceOptions,
    statusOptions,
    caseTypeOptions,
    catalogError: sources.isError || statuses.isError || caseTypes.isError,
    fieldErrors: response?.fieldErrors,
    formError: readFormError(mutation.isError, mode, response?.formError),
    isSubmitting: mutation.isPending,
    changeName: (event) => {
      setName(event.currentTarget.value.slice(0, MAX_CUSTOMER_NAME_LENGTH));
    },
    changePhone: (event) => {
      setPhone(customerPhoneDigits(event.currentTarget.value));
    },
    changeSource: setSourceId,
    changeAssignee: setAssigneeOverride,
    changeStatus,
    changeCaseType: setCaseTypeId,
    changeFirstProcessedOn: setFirstProcessedOn,
    changeContractedOn: setContractedOn,
    changeRetainerFee: (event) => {
      setRetainerFee(digitsOnly(event.currentTarget.value));
    },
    submitProfile,
  };
}
