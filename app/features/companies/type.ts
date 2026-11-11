export const MAX_COMPANY_NAME_LENGTH = 10;

export type CompanyListItem = {
  id: string;
  name: string;
  createdAt: string;
  isActive: boolean;
};

export type CompanyListResponse = {
  companies: CompanyListItem[];
};

export type CompanyFieldErrors = {
  name?: string;
  loginId?: string;
};

export type CompanyCreateSubmission = {
  name: string;
  loginId: string;
};

export type CompanyCreateResponse = {
  company?: CompanyListItem;
  fieldErrors?: CompanyFieldErrors;
  formError?: string;
};

const companyFieldErrorKeys = ['name', 'loginId'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isCompanyListItem(value: unknown): value is CompanyListItem {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.isActive === 'boolean'
  );
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

export function isCompanyListResponse(value: unknown): value is CompanyListResponse {
  if (!isRecord(value) || !Array.isArray(value.companies)) {
    return false;
  }
  return value.companies.every(isCompanyListItem);
}

export function isCompanyCreateSubmission(value: unknown): value is CompanyCreateSubmission {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.name === 'string' && typeof value.loginId === 'string';
}

export function isCompanyCreateResponse(value: unknown): value is CompanyCreateResponse {
  if (!isRecord(value) || !isOptionalString(value.formError)) {
    return false;
  }
  if (value.company !== undefined && !isCompanyListItem(value.company)) {
    return false;
  }
  return (
    value.fieldErrors === undefined ||
    hasOnlyOptionalStrings(value.fieldErrors, companyFieldErrorKeys)
  );
}

export function companyFormError(value: unknown): string | undefined {
  if (!isRecord(value) || typeof value.formError !== 'string') {
    return undefined;
  }
  return value.formError;
}

export type CompanyMasterAccount = {
  id: string;
  loginId: string;
  name: string;
  mustChangePassword: boolean;
};

export type CompanyDetail = {
  id: string;
  name: string;
  loginId: string;
  isActive: boolean;
  masters: CompanyMasterAccount[];
};

export type CompanyNameFieldErrors = {
  name?: string;
};

export type CompanyNameSubmission = {
  name: string;
};

export type CompanyNameResponse = {
  name?: string;
  fieldErrors?: CompanyNameFieldErrors;
  formError?: string;
};

export type CompanyMasterFieldErrors = {
  loginId?: string;
  name?: string;
};

export type CompanyMasterSubmission = {
  loginId: string;
  name: string;
};

export type CompanyMasterResponse = {
  master?: CompanyMasterAccount;
  temporaryPassword?: string;
  fieldErrors?: CompanyMasterFieldErrors;
  formError?: string;
};

const companyNameErrorKeys = ['name'] as const;
const companyMasterErrorKeys = ['loginId', 'name'] as const;

function isCompanyMasterAccount(value: unknown): value is CompanyMasterAccount {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.loginId === 'string' &&
    typeof value.name === 'string' &&
    typeof value.mustChangePassword === 'boolean'
  );
}

export function isCompanyDetail(value: unknown): value is CompanyDetail {
  if (!isRecord(value) || !Array.isArray(value.masters)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.loginId === 'string' &&
    typeof value.isActive === 'boolean' &&
    value.masters.every(isCompanyMasterAccount)
  );
}

export function isCompanyNameSubmission(value: unknown): value is CompanyNameSubmission {
  return isRecord(value) && typeof value.name === 'string' && !Object.hasOwn(value, 'isActive');
}

export type CompanyStatusSubmission = {
  isActive: boolean;
};

export type CompanyStatusResponse = {
  isActive?: boolean;
  formError?: string;
};

export function isCompanyStatusSubmission(value: unknown): value is CompanyStatusSubmission {
  return isRecord(value) && typeof value.isActive === 'boolean' && !Object.hasOwn(value, 'name');
}

export function isCompanyStatusResponse(value: unknown): value is CompanyStatusResponse {
  if (!isRecord(value) || !isOptionalString(value.formError)) {
    return false;
  }
  return value.isActive === undefined || typeof value.isActive === 'boolean';
}

export function isCompanyNameResponse(value: unknown): value is CompanyNameResponse {
  if (!isRecord(value) || !isOptionalString(value.name) || !isOptionalString(value.formError)) {
    return false;
  }
  return (
    value.fieldErrors === undefined ||
    hasOnlyOptionalStrings(value.fieldErrors, companyNameErrorKeys)
  );
}

export function isCompanyMasterSubmission(value: unknown): value is CompanyMasterSubmission {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.loginId === 'string' && typeof value.name === 'string';
}

export function isCompanyMasterResponse(value: unknown): value is CompanyMasterResponse {
  if (
    !isRecord(value) ||
    !isOptionalString(value.formError) ||
    !isOptionalString(value.temporaryPassword)
  ) {
    return false;
  }
  if (value.master !== undefined && !isCompanyMasterAccount(value.master)) {
    return false;
  }
  return (
    value.fieldErrors === undefined ||
    hasOnlyOptionalStrings(value.fieldErrors, companyMasterErrorKeys)
  );
}
