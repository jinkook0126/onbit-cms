import {
  isCaseProgress,
  isCaseProgressUpdateResponse,
  isConsultationCreateResponse,
  isConsultationListResponse,
  isCustomerAssigneeResponse,
  isCustomerCreateResponse,
  isCustomerDetail,
  isCustomerListResponse,
  isCustomerRetainResponse,
  isCustomerStatusResponse,
  isCustomerSummary,
  isInstallmentListResponse,
  isLedgerListResponse,
  isRefundResponse,
  isInstallmentPaymentResponse,
  isInstallmentPromiseResponse,
} from '~/features/customers/type';
import { ApiError, apiClient } from '~/lib/apiClient';

import type {
  CaseProgress,
  CaseProgressUpdateResponse,
  CaseProgressUpdateSubmission,
  ConsultationCreateResponse,
  ConsultationCreateSubmission,
  ConsultationListResponse,
  CustomerAssigneeResponse,
  CustomerCreateResponse,
  CustomerCreateSubmission,
  CustomerDetail,
  CustomerListParams,
  CustomerListResponse,
  CustomerRetainResponse,
  CustomerRetainSubmission,
  CustomerStatusResponse,
  CustomerStatusSubmission,
  CustomerSummary,
  InstallmentListResponse,
  InstallmentPaymentResponse,
  InstallmentPaymentSubmission,
  InstallmentPromiseResponse,
  InstallmentPromiseSubmission,
  LedgerListResponse,
  RefundResponse,
  RefundSubmission,
} from '~/features/customers/type';

const customersApiPath = '/api/customers';
const customerAssigneesApiPath = '/api/customers/assignees';

function customersPath(params: CustomerListParams): string {
  const search = new URLSearchParams();
  if (params.field === 'phone') {
    search.set('field', 'phone');
  }
  if (params.keyword !== '') {
    search.set('q', params.keyword);
  }
  if (params.status) {
    search.set('status', params.status);
  }
  if (params.page > 1) {
    search.set('page', String(params.page));
  }
  const query = search.toString();
  if (query === '') {
    return customersApiPath;
  }
  return `${customersApiPath}?${query}`;
}

export async function requestCustomerList(
  params: CustomerListParams,
  signal?: AbortSignal,
): Promise<CustomerListResponse> {
  const result = await apiClient(customersPath(params), { signal });
  if (!result.ok || !isCustomerListResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestCustomerAssignees(
  signal?: AbortSignal,
): Promise<CustomerAssigneeResponse> {
  const result = await apiClient(customerAssigneesApiPath, { signal });
  if (!result.ok || !isCustomerAssigneeResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

function customerPath(customerId: string): string {
  return `${customersApiPath}/${encodeURIComponent(customerId)}`;
}

export async function requestCustomerDetail(
  customerId: string,
  signal?: AbortSignal,
): Promise<CustomerDetail> {
  const result = await apiClient(customerPath(customerId), { signal });
  if (!result.ok || !isCustomerDetail(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestCustomerSummary(
  customerId: string,
  signal?: AbortSignal,
): Promise<CustomerSummary> {
  const result = await apiClient(`${customerPath(customerId)}/summary`, { signal });
  if (!result.ok || !isCustomerSummary(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestCustomerStatusUpdate(
  customerId: string,
  submission: CustomerStatusSubmission,
): Promise<CustomerStatusResponse> {
  const result = await apiClient(customerPath(customerId), { method: 'PATCH', body: submission });
  if (!isCustomerStatusResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestCustomerRetain(
  customerId: string,
  submission: CustomerRetainSubmission,
): Promise<CustomerRetainResponse> {
  const result = await apiClient(`${customerPath(customerId)}/retain`, {
    method: 'POST',
    body: submission,
  });
  if (!isCustomerRetainResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

function customerInstallmentsPath(customerId: string): string {
  return `${customerPath(customerId)}/installments`;
}

export async function requestRefund(
  customerId: string,
  submission: RefundSubmission,
): Promise<RefundResponse> {
  const result = await apiClient(`${customerPath(customerId)}/refunds`, {
    method: 'POST',
    body: submission,
  });
  if (!isRefundResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestCaseProgress(
  customerId: string,
  signal?: AbortSignal,
): Promise<CaseProgress> {
  const result = await apiClient(`${customerPath(customerId)}/case-progress`, { signal });
  if (!result.ok || !isCaseProgress(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestCaseProgressUpdate(
  customerId: string,
  submission: CaseProgressUpdateSubmission,
): Promise<CaseProgressUpdateResponse> {
  const result = await apiClient(`${customerPath(customerId)}/case-progress`, {
    method: 'PATCH',
    body: submission,
  });
  if (!isCaseProgressUpdateResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestLedger(
  customerId: string,
  signal?: AbortSignal,
): Promise<LedgerListResponse> {
  const result = await apiClient(`${customerPath(customerId)}/ledger`, { signal });
  if (!result.ok || !isLedgerListResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestInstallments(
  customerId: string,
  signal?: AbortSignal,
): Promise<InstallmentListResponse> {
  const result = await apiClient(customerInstallmentsPath(customerId), { signal });
  if (!result.ok || !isInstallmentListResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestInstallmentPayment(
  customerId: string,
  submission: InstallmentPaymentSubmission,
): Promise<InstallmentPaymentResponse> {
  const result = await apiClient(`${customerPath(customerId)}/installment-payments`, {
    method: 'POST',
    body: submission,
  });
  if (!isInstallmentPaymentResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestInstallmentPromiseUpdate(
  customerId: string,
  installmentId: string,
  submission: InstallmentPromiseSubmission,
): Promise<InstallmentPromiseResponse> {
  const result = await apiClient(
    `${customerInstallmentsPath(customerId)}/${encodeURIComponent(installmentId)}`,
    { method: 'PATCH', body: submission },
  );
  if (!isInstallmentPromiseResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

function customerConsultationsPath(customerId: string): string {
  return `${customerPath(customerId)}/consultations`;
}

export async function requestConsultations(
  customerId: string,
  signal?: AbortSignal,
): Promise<ConsultationListResponse> {
  const result = await apiClient(customerConsultationsPath(customerId), { signal });
  if (!result.ok || !isConsultationListResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestConsultationCreate(
  customerId: string,
  submission: ConsultationCreateSubmission,
): Promise<ConsultationCreateResponse> {
  const result = await apiClient(customerConsultationsPath(customerId), {
    method: 'POST',
    body: submission,
  });
  if (!isConsultationCreateResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

function customerConsultationPath(customerId: string, consultationId: string): string {
  return `${customerConsultationsPath(customerId)}/${encodeURIComponent(consultationId)}`;
}

export async function requestConsultationUpdate(
  customerId: string,
  consultationId: string,
  submission: ConsultationCreateSubmission,
): Promise<ConsultationCreateResponse> {
  const result = await apiClient(customerConsultationPath(customerId, consultationId), {
    method: 'PATCH',
    body: submission,
  });
  if (!isConsultationCreateResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestCustomerCreate(
  submission: CustomerCreateSubmission,
): Promise<CustomerCreateResponse> {
  const result = await apiClient(customersApiPath, { method: 'POST', body: submission });
  if (!isCustomerCreateResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}
