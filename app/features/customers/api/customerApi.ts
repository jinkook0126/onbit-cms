import {
  isConsultationCreateResponse,
  isConsultationListResponse,
  isCustomerAssigneeBatchResponse,
  isCustomerAssigneeResponse,
  isCustomerCaseTypeResponse,
  isCustomerCreateResponse,
  isCustomerDetail,
  isCustomerImportResponse,
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
  ConsultationCreateResponse,
  ConsultationCreateSubmission,
  ConsultationListResponse,
  CustomerAssigneeBatchResponse,
  CustomerAssigneeBatchSubmission,
  CustomerAssigneeResponse,
  CustomerCaseTypeResponse,
  CustomerCaseTypeSubmission,
  CustomerCreateResponse,
  CustomerCreateSubmission,
  CustomerImportResponse,
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
const customerImportApiPath = '/api/customers/import';
const customerImportTemplateApiPath = '/api/customers/import-template';
const customerImportTemplateName = '상담고객_업로드_템플릿.xlsx';

function customersPath(params: CustomerListParams): string {
  const search = new URLSearchParams();
  if (params.field !== 'name') {
    search.set('field', params.field);
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

export async function requestCustomerAssigneeBatch(
  submission: CustomerAssigneeBatchSubmission,
): Promise<CustomerAssigneeBatchResponse> {
  const result = await apiClient(customerAssigneesApiPath, { method: 'PATCH', body: submission });
  if (!isCustomerAssigneeBatchResponse(result.body)) {
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

export async function requestCustomerCaseTypeUpdate(
  customerId: string,
  submission: CustomerCaseTypeSubmission,
): Promise<CustomerCaseTypeResponse> {
  const result = await apiClient(`${customerPath(customerId)}/case-type`, {
    method: 'PATCH',
    body: submission,
  });
  if (!isCustomerCaseTypeResponse(result.body)) {
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

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.trim() === '') {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function requestCustomerImportTemplate(signal?: AbortSignal): Promise<void> {
  const response = await fetch(customerImportTemplateApiPath, {
    credentials: 'same-origin',
    signal,
  });
  if (!response.ok) {
    throw new ApiError(response.status, await readResponseBody(response));
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = customerImportTemplateName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function requestCustomerImport(
  file: File,
  signal?: AbortSignal,
): Promise<CustomerImportResponse> {
  const body = new FormData();
  body.set('file', file);
  const response = await fetch(customerImportApiPath, {
    method: 'POST',
    credentials: 'same-origin',
    body,
    signal,
  });
  const responseBody = await readResponseBody(response);
  if (response.status >= 500) {
    throw new ApiError(response.status, responseBody);
  }
  if (!isCustomerImportResponse(responseBody)) {
    throw new ApiError(response.status, responseBody);
  }
  return responseBody;
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
