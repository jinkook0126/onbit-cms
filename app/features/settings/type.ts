export const MAX_ACCOUNT_NAME_LENGTH = 10;

export type AccountProfile = {
  loginId: string;
  name: string;
};

export type AccountNameFieldErrors = {
  name?: string;
};

export type AccountNameResponse = {
  name?: string;
  fieldErrors?: AccountNameFieldErrors;
  formError?: string;
};

export type AccountPasswordFieldErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export type AccountPasswordResponse = {
  passwordChanged?: boolean;
  fieldErrors?: AccountPasswordFieldErrors;
  formError?: string;
};

export type AccountNameSubmission = {
  name: string;
};

export type AccountPasswordSubmission = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const accountNameErrorKeys = ['name'] as const;
const accountPasswordErrorKeys = ['currentPassword', 'newPassword', 'confirmPassword'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isOptionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === 'boolean';
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

export function isAccountProfile(value: unknown): value is AccountProfile {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.loginId === 'string' && typeof value.name === 'string';
}

export function isAccountNameSubmission(value: unknown): value is AccountNameSubmission {
  return isRecord(value) && typeof value.name === 'string';
}

export function isAccountNameResponse(value: unknown): value is AccountNameResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (!isOptionalString(value.name) || !isOptionalString(value.formError)) {
    return false;
  }
  return (
    value.fieldErrors === undefined ||
    hasOnlyOptionalStrings(value.fieldErrors, accountNameErrorKeys)
  );
}

export function isAccountPasswordSubmission(value: unknown): value is AccountPasswordSubmission {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.currentPassword === 'string' &&
    typeof value.newPassword === 'string' &&
    typeof value.confirmPassword === 'string'
  );
}

export function isAccountPasswordResponse(value: unknown): value is AccountPasswordResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (!isOptionalBoolean(value.passwordChanged) || !isOptionalString(value.formError)) {
    return false;
  }
  return (
    value.fieldErrors === undefined ||
    hasOnlyOptionalStrings(value.fieldErrors, accountPasswordErrorKeys)
  );
}
