export const MIN_EMPLOYEE_LOGIN_ID_LENGTH = 3;
export const MAX_EMPLOYEE_LOGIN_ID_LENGTH = 10;
export const EMPLOYEE_LOGIN_ID_PLACEHOLDER = '영문과 숫자 조합, 3자 이상 10자 이하';

export type EmployeeCompanyOption = {
  id: string;
  name: string;
};

export type EmployeeListItem = {
  id: string;
  loginId: string;
  name: string;
  teamId: string | null;
  teamName: string | null;
};

export type EmployeeListResponse = {
  company: EmployeeCompanyOption | null;
  companies: EmployeeCompanyOption[];
  employees: EmployeeListItem[];
};

export type EmployeeFieldErrors = {
  loginId?: string;
  name?: string;
};

export type EmployeeCreateSubmission = {
  loginId: string;
  name: string;
  companyId?: string;
};

export type EmployeeCreateResponse = {
  employee?: EmployeeListItem;
  fieldErrors?: EmployeeFieldErrors;
  formError?: string;
};

export type EmployeeTeamSubmission = {
  teamId: string | null;
};

export type EmployeeTeamResponse = {
  teamId?: string | null;
  teamName?: string | null;
  formError?: string;
};

const employeeFieldErrorKeys = ['loginId', 'name'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return true;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === 'string';
}

function isEmployeeCompanyOption(value: unknown): value is EmployeeCompanyOption {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.id === 'string' && typeof value.name === 'string';
}

function isEmployeeListItem(value: unknown): value is EmployeeListItem {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.loginId === 'string' &&
    typeof value.name === 'string' &&
    isNullableString(value.teamId) &&
    isNullableString(value.teamName)
  );
}

export function isEmployeeListResponse(value: unknown): value is EmployeeListResponse {
  if (!isRecord(value) || !Array.isArray(value.companies) || !Array.isArray(value.employees)) {
    return false;
  }
  if (value.company !== null && !isEmployeeCompanyOption(value.company)) {
    return false;
  }
  return (
    value.companies.every(isEmployeeCompanyOption) && value.employees.every(isEmployeeListItem)
  );
}

export function isEmployeeCreateSubmission(value: unknown): value is EmployeeCreateSubmission {
  if (!isRecord(value) || typeof value.loginId !== 'string' || typeof value.name !== 'string') {
    return false;
  }
  return isOptionalString(value.companyId);
}

function hasOnlyOptionalStrings(
  value: unknown,
  keys: readonly string[],
): value is Record<string, string | undefined> {
  if (!isRecord(value)) {
    return false;
  }
  return keys.every((key) => isOptionalString(value[key]));
}

export function isEmployeeCreateResponse(value: unknown): value is EmployeeCreateResponse {
  if (!isRecord(value) || !isOptionalString(value.formError)) {
    return false;
  }
  if (value.employee !== undefined && !isEmployeeListItem(value.employee)) {
    return false;
  }
  return (
    value.fieldErrors === undefined ||
    hasOnlyOptionalStrings(value.fieldErrors, employeeFieldErrorKeys)
  );
}

export function employeeFormError(value: unknown): string | undefined {
  if (!isRecord(value) || typeof value.formError !== 'string') {
    return undefined;
  }
  return value.formError;
}

export function isEmployeeTeamSubmission(value: unknown): value is EmployeeTeamSubmission {
  if (!isRecord(value) || !isNullableString(value.teamId)) {
    return false;
  }
  return !Object.hasOwn(value, 'loginId') && !Object.hasOwn(value, 'name');
}

export function isEmployeeTeamResponse(value: unknown): value is EmployeeTeamResponse {
  if (!isRecord(value) || !isOptionalString(value.formError)) {
    return false;
  }
  if (value.teamId !== undefined && !isNullableString(value.teamId)) {
    return false;
  }
  return value.teamName === undefined || isNullableString(value.teamName);
}
