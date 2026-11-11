import {
  isEmployeeCreateResponse,
  isEmployeeListResponse,
  isEmployeeTeamResponse,
} from '~/features/employees/type';
import { ApiError, apiClient } from '~/lib/apiClient';

import type {
  EmployeeCreateResponse,
  EmployeeCreateSubmission,
  EmployeeListResponse,
  EmployeeTeamResponse,
  EmployeeTeamSubmission,
} from '~/features/employees/type';

const employeesApiPath = '/api/employees';

function employeesPath(companyId: string): string {
  if (companyId === '') {
    return employeesApiPath;
  }
  const params = new URLSearchParams({ companyId });
  return `${employeesApiPath}?${params.toString()}`;
}

function employeePath(employeeId: string): string {
  return `${employeesApiPath}/${encodeURIComponent(employeeId)}`;
}

export async function requestEmployeeList(
  companyId: string,
  signal?: AbortSignal,
): Promise<EmployeeListResponse> {
  const result = await apiClient(employeesPath(companyId), { signal });
  if (!result.ok || !isEmployeeListResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestEmployeeCreate(
  submission: EmployeeCreateSubmission,
): Promise<EmployeeCreateResponse> {
  const result = await apiClient(employeesApiPath, { method: 'POST', body: submission });
  if (!isEmployeeCreateResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}

export async function requestEmployeeTeamUpdate(
  employeeId: string,
  submission: EmployeeTeamSubmission,
): Promise<EmployeeTeamResponse> {
  const result = await apiClient(employeePath(employeeId), { method: 'PATCH', body: submission });
  if (!isEmployeeTeamResponse(result.body)) {
    throw new ApiError(result.status, result.body);
  }
  return result.body;
}
