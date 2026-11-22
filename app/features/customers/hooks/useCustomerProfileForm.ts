import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  requestCustomerAssignees,
  requestCustomerCreate,
  requestCustomerProfileUpdate,
} from '~/features/customers/api/customerApi';
import { customerQueryKeys } from '~/features/customers/api/customerQuery';
import { defaultAssigneeId } from '~/features/customers/assigneeOption';
import {
  MAX_CUSTOMER_NAME_LENGTH,
  customerPhoneDigits,
  isCaseType,
} from '~/features/customers/type';

import type { UseQueryResult } from '@tanstack/react-query';
import type { ChangeEvent } from 'react';
import type {
  CaseType,
  ConsultationStatus,
  CustomerAssigneeResponse,
  CustomerDetail,
  CustomerProfileFieldErrors,
  CustomerProfileSubmission,
  InflowSource,
} from '~/features/customers/type';

type CustomerProfileFormState = {
  name: string;
  phone: string;
  source: InflowSource | '';
  assigneeId: string;
  status: ConsultationStatus;
  caseType: CaseType | '';
  firstProcessedOn: string;
  contractedOn: string;
  retainerFee: string;
  statusLocked: boolean;
  retainFieldsEnabled: boolean;
  assignees: UseQueryResult<CustomerAssigneeResponse>;
  fieldErrors?: CustomerProfileFieldErrors;
  formError?: string;
  isSubmitting: boolean;
  changeName: (event: ChangeEvent<HTMLInputElement>) => void;
  changePhone: (event: ChangeEvent<HTMLInputElement>) => void;
  changeSource: (source: InflowSource) => void;
  changeAssignee: (assigneeId: string) => void;
  changeStatus: (status: ConsultationStatus) => void;
  changeCaseType: (caseType: CaseType) => void;
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
  const [source, setSource] = useState<InflowSource | ''>(customer?.source ?? '');
  const [assigneeOverride, setAssigneeOverride] = useState<string | null>(customer?.assigneeId ?? null);
  const [status, setStatus] = useState<ConsultationStatus>(customer?.status ?? 'IN_CONSULTATION');
  const [caseType, setCaseType] = useState<CaseType | ''>(customer?.caseType ?? '');
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

  function changeStatus(nextStatus: ConsultationStatus): void {
    setStatus(nextStatus);
    if (nextStatus !== 'RETAINED') {
      setContractedOn('');
      setRetainerFee('');
    }
  }

  function submitProfile(): void {
    if (submitLock.current || mutation.isPending) {
      return;
    }
    submitLock.current = true;
    const retained = status === 'RETAINED';
    mutation.mutate({
      name,
      phone,
      source,
      assigneeId,
      status,
      caseType: caseType === '' ? null : caseType,
      firstProcessedOn: firstProcessedOn.trim() === '' ? null : firstProcessedOn,
      contractedOn: retained && contractedOn.trim() !== '' ? contractedOn : null,
      retainerFee: retained && retainerFee.trim() !== '' ? retainerFee : null,
    });
  }

  return {
    name,
    phone,
    source,
    assigneeId,
    status,
    caseType,
    firstProcessedOn,
    contractedOn,
    retainerFee,
    statusLocked: customer?.status === 'RETAINED',
    retainFieldsEnabled: status === 'RETAINED',
    assignees,
    fieldErrors: response?.fieldErrors,
    formError: readFormError(mutation.isError, mode, response?.formError),
    isSubmitting: mutation.isPending,
    changeName: (event) => {
      setName(event.currentTarget.value.slice(0, MAX_CUSTOMER_NAME_LENGTH));
    },
    changePhone: (event) => {
      setPhone(customerPhoneDigits(event.currentTarget.value));
    },
    changeSource: setSource,
    changeAssignee: setAssigneeOverride,
    changeStatus,
    changeCaseType: (nextCaseType) => {
      if (isCaseType(nextCaseType)) {
        setCaseType(nextCaseType);
      }
    },
    changeFirstProcessedOn: setFirstProcessedOn,
    changeContractedOn: setContractedOn,
    changeRetainerFee: (event) => {
      setRetainerFee(digitsOnly(event.currentTarget.value));
    },
    submitProfile,
  };
}
