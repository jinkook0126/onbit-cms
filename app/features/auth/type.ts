export const PASSWORD_POLICY_PLACEHOLDER = '8자 이상 16자 이하';

export const loginIntent = {
  login: 'login',
  changePassword: 'change-password',
} as const;

export const MAX_LOGIN_ID_LENGTH = 64;

export type LoginIntent = (typeof loginIntent)[keyof typeof loginIntent];

export type LoginFieldErrors = {
  username?: string;
  password?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export type LoginCredentials = {
  intent: typeof loginIntent.login;
  username: string;
  password: string;
};

export type PasswordChangeSubmission = {
  intent: typeof loginIntent.changePassword;
  username: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type LoginSubmission = LoginCredentials | PasswordChangeSubmission;

export type LoginResponse = {
  fieldErrors?: LoginFieldErrors;
  formError?: string;
  values?: { username: string };
  showPasswordChange?: boolean;
  mustChangePassword?: boolean;
  passwordChanged?: boolean;
  redirectTo?: '/';
};

const loginFieldErrorKeys = ['username', 'password', 'newPassword', 'confirmPassword'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isOptionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === 'boolean';
}

function isLoginFieldErrors(value: unknown): value is LoginFieldErrors {
  if (!isRecord(value)) {
    return false;
  }
  return loginFieldErrorKeys.every((key) => isOptionalString(value[key]));
}

export function isLoginSubmission(value: unknown): value is LoginSubmission {
  if (!isRecord(value) || typeof value.username !== 'string') {
    return false;
  }
  if (value.intent === loginIntent.login) {
    return typeof value.password === 'string';
  }
  if (value.intent === loginIntent.changePassword) {
    return (
      typeof value.currentPassword === 'string' &&
      typeof value.newPassword === 'string' &&
      typeof value.confirmPassword === 'string'
    );
  }
  return false;
}

export function isLoginResponse(value: unknown): value is LoginResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (!isOptionalString(value.formError) || !isOptionalBoolean(value.showPasswordChange)) {
    return false;
  }
  if (!isOptionalBoolean(value.mustChangePassword) || !isOptionalBoolean(value.passwordChanged)) {
    return false;
  }
  if (value.redirectTo !== undefined && value.redirectTo !== '/') {
    return false;
  }
  if (value.fieldErrors !== undefined && !isLoginFieldErrors(value.fieldErrors)) {
    return false;
  }
  if (value.values === undefined) {
    return true;
  }
  return isRecord(value.values) && typeof value.values.username === 'string';
}
