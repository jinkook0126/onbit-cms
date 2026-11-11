import {
  isCompanyCreateResponse,
  isCompanyDetail,
  isCompanyListResponse,
  isCompanyMasterResponse,
  isCompanyNameResponse,
  isCompanyStatusResponse,
} from '~/features/companies/type';
import { ApiError, apiClient } from '~/lib/apiClient';

import type {
  CompanyCreateResponse,
  CompanyCreateSubmission,
  CompanyDetail,
  CompanyListResponse,
  CompanyMasterResponse,
  CompanyMasterSubmission,
  CompanyNameResponse,
  CompanyNameSubmission,
  CompanyStatusResponse,
  CompanyStatusSubmission,
} from '~/features/companies/type';

const companiesApiPath = '/api/companies';

function companyPath(companyId: string): string {
  return `${companiesApiPath}/${encodeURIComponent(companyId)}`;
}

export async function requestCompanyList(signal?: AbortSignal): Promise<CompanyListResponse> {
  const result = await apiClient(companiesApiPath, { signal });
  if (!result.ok || !isCompanyListResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestCompanyCreate(
  submission: CompanyCreateSubmission,
): Promise<CompanyCreateResponse> {
  const result = await apiClient(companiesApiPath, { method: 'POST', body: submission });
  if (!isCompanyCreateResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestCompanyDetail(
  companyId: string,
  signal?: AbortSignal,
): Promise<CompanyDetail> {
  const result = await apiClient(companyPath(companyId), { signal });
  if (!result.ok || !isCompanyDetail(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestCompanyNameUpdate(
  companyId: string,
  submission: CompanyNameSubmission,
): Promise<CompanyNameResponse> {
  const result = await apiClient(companyPath(companyId), { method: 'PATCH', body: submission });
  if (!isCompanyNameResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestCompanyStatusUpdate(
  companyId: string,
  submission: CompanyStatusSubmission,
): Promise<CompanyStatusResponse> {
  const result = await apiClient(companyPath(companyId), { method: 'PATCH', body: submission });
  if (!isCompanyStatusResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestCompanyMasterCreate(
  companyId: string,
  submission: CompanyMasterSubmission,
): Promise<CompanyMasterResponse> {
  const result = await apiClient(`${companyPath(companyId)}/master`, {
    method: 'POST',
    body: submission,
  });
  if (!isCompanyMasterResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}
