import {
  isConsultationCreateResponse,
  isConsultationListResponse,
  isCustomerAssigneeResponse,
  isCustomerCreateResponse,
  isCustomerDetail,
  isCustomerListResponse,
  isCustomerStatusResponse,
} from '~/features/customers/type';
import { ApiError, apiClient } from '~/lib/apiClient';

import type {
  ConsultationCreateResponse,
  ConsultationCreateSubmission,
  ConsultationListResponse,
  CustomerAssigneeResponse,
  CustomerCreateResponse,
  CustomerCreateSubmission,
  CustomerDetail,
  CustomerListParams,
  CustomerListResponse,
  CustomerStatusResponse,
  CustomerStatusSubmission,
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

export async function requestCustomerCreate(
  submission: CustomerCreateSubmission,
): Promise<CustomerCreateResponse> {
  const result = await apiClient(customersApiPath, { method: 'POST', body: submission });
  if (!isCustomerCreateResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}
