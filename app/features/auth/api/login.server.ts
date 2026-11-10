import {
  changePassword,
  loginWithPassword,
  normalizeLoginId,
} from '~/features/auth/api/auth.server';
import { loginIntent } from '~/features/auth/type';

import type { LoginFieldErrors, LoginResponse, LoginSubmission } from '~/features/auth/type';

const INVALID_CREDENTIALS_MESSAGE = '아이디 또는 비밀번호가 올바르지 않습니다.';

export type LoginHandling =
  | { type: 'redirect'; headers: Headers }
  | { type: 'response'; body: LoginResponse; status?: number };

function validateLoginFields(username: string, password: string): LoginFieldErrors {
  const fieldErrors: LoginFieldErrors = {};
  const loginId = normalizeLoginId(username);

  if (!username) {
    fieldErrors.username = '아이디를 입력하세요.';
  } else if (!loginId) {
    fieldErrors.username = '사용할 수 없는 문자가 포함되어 있습니다.';
  }

  if (password.trim() === '') {
    fieldErrors.password = '비밀번호를 입력하세요.';
  }

  return fieldErrors;
}

async function submitPasswordLogin(
  request: Request,
  submission: Extract<LoginSubmission, { intent: typeof loginIntent.login }>,
): Promise<LoginHandling> {
  const username = submission.username.trim();
  const fieldErrors = validateLoginFields(username, submission.password);

  if (fieldErrors.username ?? fieldErrors.password) {
    return { type: 'response', body: { fieldErrors, values: { username } }, status: 400 };
  }

  const loginId = normalizeLoginId(username);
  if (!loginId) {
    return {
      type: 'response',
      body: {
        fieldErrors: { username: '사용할 수 없는 문자가 포함되어 있습니다.' },
        values: { username },
      },
      status: 400,
    };
  }

  const result = await loginWithPassword(request, loginId, submission.password);
  if (result.status === 'success') {
    return { type: 'redirect', headers: result.headers };
  }
  if (result.status === 'must-change-password') {
    return {
      type: 'response',
      body: {
        mustChangePassword: true,
        showPasswordChange: true,
        values: { username: loginId },
      },
    };
  }

  return {
    type: 'response',
    body: { formError: INVALID_CREDENTIALS_MESSAGE, values: { username: loginId } },
    status: 401,
  };
}

async function submitPasswordChange(
  submission: Extract<LoginSubmission, { intent: typeof loginIntent.changePassword }>,
): Promise<LoginHandling> {
  const username = submission.username.trim();
  const loginId = normalizeLoginId(username);
  const values = { username: loginId ?? username };

  if (!loginId || submission.currentPassword.trim() === '') {
    return {
      type: 'response',
      body: {
        formError: INVALID_CREDENTIALS_MESSAGE,
        showPasswordChange: true,
        values,
      },
      status: 401,
    };
  }

  const result = await changePassword({
    loginId,
    currentPassword: submission.currentPassword,
    newPassword: submission.newPassword,
    confirmPassword: submission.confirmPassword,
  });

  switch (result.status) {
    case 'success':
      return { type: 'response', body: { passwordChanged: true, values } };
    case 'invalid-password':
      return {
        type: 'response',
        body: {
          fieldErrors:
            result.field === 'newPassword'
              ? { newPassword: result.message }
              : { confirmPassword: result.message },
          showPasswordChange: true,
          values,
        },
        status: 400,
      };
    case 'invalid-credentials':
      return {
        type: 'response',
        body: {
          formError: INVALID_CREDENTIALS_MESSAGE,
          showPasswordChange: true,
          values,
        },
        status: 401,
      };
    case 'not-required':
      return {
        type: 'response',
        body: { formError: '이미 비밀번호를 변경했습니다. 다시 로그인하세요.', values },
      };
    case 'profile-update-failed':
      return {
        type: 'response',
        body: {
          formError: '비밀번호는 변경되었습니다. 새 비밀번호로 다시 로그인하세요.',
          values,
        },
      };
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}

export async function handleLoginSubmission(
  request: Request,
  submission: LoginSubmission,
): Promise<LoginHandling> {
  switch (submission.intent) {
    case loginIntent.login:
      return submitPasswordLogin(request, submission);
    case loginIntent.changePassword:
      return submitPasswordChange(submission);
    default: {
      const unreachable: never = submission;
      return unreachable;
    }
  }
}
