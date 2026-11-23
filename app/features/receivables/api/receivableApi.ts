import {
  isReceivableCalendarResponse,
  isReceivableDetail,
  isReceivableInstallmentResponse,
  isReceivableListResponse,
  isReceivablePlanResponse,
  isReceivableScheduleResponse,
  receivablePaymentFilterParam,
} from '~/features/receivables/type';
import { ApiError, apiClient } from '~/lib/apiClient';

import type {
  ReceivableCalendarParams,
  ReceivableCalendarResponse,
  ReceivableDetail,
  ReceivableInstallmentResponse,
  ReceivableInstallmentSubmission,
  ReceivableListParams,
  ReceivableListResponse,
  ReceivablePlanResponse,
  ReceivablePlanSubmission,
  ReceivableScheduleParams,
  ReceivableScheduleResponse,
} from '~/features/receivables/type';

const receivablesApiPath = '/api/receivables';

function receivablesPath(params: ReceivableListParams): string {
  const search = new URLSearchParams();
  if (params.field !== 'name') {
    search.set('field', params.field);
  }
  if (params.keyword !== '') {
    search.set('q', params.keyword);
  }
  if (params.from !== '') {
    search.set('from', params.from);
  }
  if (params.to !== '') {
    search.set('to', params.to);
  }
  const status = receivablePaymentFilterParam(params.status);
  if (status !== null) {
    search.set('status', status);
  }
  if (params.sort === 'asc') {
    search.set('sort', params.sort);
  }
  if (params.page > 1) {
    search.set('page', String(params.page));
  }
  const query = search.toString();
  if (query === '') {
    return receivablesApiPath;
  }
  return `${receivablesApiPath}?${query}`;
}

export async function requestReceivableList(
  params: ReceivableListParams,
  signal?: AbortSignal,
): Promise<ReceivableListResponse> {
  const result = await apiClient(receivablesPath(params), { signal });
  if (!result.ok || !isReceivableListResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestReceivableDetail(
  customerId: string,
  signal?: AbortSignal,
): Promise<ReceivableDetail> {
  const result = await apiClient(`${receivablesApiPath}/${customerId}`, { signal });
  if (!result.ok || !isReceivableDetail(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

function receivableSchedulePath(params: ReceivableScheduleParams): string {
  const search = new URLSearchParams();
  search.set('date', params.date);
  if (params.name !== '') {
    search.set('name', params.name);
  }
  return `${receivablesApiPath}/schedule?${search.toString()}`;
}

export async function requestReceivablePlan(
  customerId: string,
  submission: ReceivablePlanSubmission,
): Promise<ReceivablePlanResponse> {
  const result = await apiClient(`${receivablesApiPath}/${customerId}/plan`, {
    method: 'POST',
    body: submission,
  });
  if (!isReceivablePlanResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestReceivableInstallment(
  customerId: string,
  installmentId: string,
  submission: ReceivableInstallmentSubmission,
): Promise<ReceivableInstallmentResponse> {
  const result = await apiClient(
    `${receivablesApiPath}/${customerId}/installments/${encodeURIComponent(installmentId)}`,
    { method: 'PATCH', body: submission },
  );
  if (!isReceivableInstallmentResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

function receivableCalendarPath(params: ReceivableCalendarParams): string {
  const search = new URLSearchParams();
  search.set('month', params.month);
  if (params.name !== '') {
    search.set('name', params.name);
  }
  return `${receivablesApiPath}/calendar?${search.toString()}`;
}

export async function requestReceivableCalendar(
  params: ReceivableCalendarParams,
  signal?: AbortSignal,
): Promise<ReceivableCalendarResponse> {
  const result = await apiClient(receivableCalendarPath(params), { signal });
  if (!result.ok || !isReceivableCalendarResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestReceivableSchedule(
  params: ReceivableScheduleParams,
  signal?: AbortSignal,
): Promise<ReceivableScheduleResponse> {
  const result = await apiClient(receivableSchedulePath(params), { signal });
  if (!result.ok || !isReceivableScheduleResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}
