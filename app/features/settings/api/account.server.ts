import { changeOwnPassword, resolveSession } from '~/features/auth/api/auth.server';
import { MAX_ACCOUNT_NAME_LENGTH } from '~/features/settings/type';
import { prisma } from '~/lib/db.server';
import { errorCodeLabel } from '~/lib/error.server';
import { createSupabaseServerClient } from '~/lib/supabase.server';

import type {
  AccountNameFieldErrors,
  AccountPasswordFieldErrors,
  AccountProfile,
} from '~/features/settings/type';

export type AccountReadResult = { status: 'ok'; profile: AccountProfile } | { status: 'anonymous' };

export type AccountNameResult =
  | { status: 'ok'; name: string }
  | { status: 'anonymous' }
  | { status: 'invalid'; fieldErrors: AccountNameFieldErrors }
  | { status: 'failed' };

export type AccountPasswordResult =
  | { status: 'ok' }
  | { status: 'anonymous' }
  | { status: 'invalid'; fieldErrors: AccountPasswordFieldErrors }
  | { status: 'invalid-credentials' }
  | { status: 'failed' };

type AccountActor = { status: 'ok'; userId: string } | { status: 'anonymous' };

const NAME_REQUIRED_MESSAGE = '이름을 입력하세요.';
const NAME_TOO_LONG_MESSAGE = `이름은 ${MAX_ACCOUNT_NAME_LENGTH}자 이하여야 합니다.`;
const CURRENT_PASSWORD_REQUIRED_MESSAGE = '현재 비밀번호를 입력하세요.';

async function resolveAccountActor(
  request: Request,
): Promise<{ actor: AccountActor; headers: Headers }> {
  const { supabase, headers } = createSupabaseServerClient(request);
  const session = await resolveSession(supabase);
  if (session.status !== 'authenticated') {
    return { actor: { status: 'anonymous' }, headers };
  }
  return { actor: { status: 'ok', userId: session.user.id }, headers };
}

function validateAccountName(name: string): AccountNameFieldErrors {
  const fieldErrors: AccountNameFieldErrors = {};
  const trimmed = name.trim();
  if (trimmed.length < 1) {
    fieldErrors.name = NAME_REQUIRED_MESSAGE;
  } else if (trimmed.length > MAX_ACCOUNT_NAME_LENGTH) {
    fieldErrors.name = NAME_TOO_LONG_MESSAGE;
  }
  return fieldErrors;
}

export async function readAccount(
  request: Request,
): Promise<{ result: AccountReadResult; headers: Headers }> {
  const { actor, headers } = await resolveAccountActor(request);
  if (actor.status !== 'ok') {
    return { result: { status: 'anonymous' }, headers };
  }

  const profile = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: { loginId: true, name: true },
  });
  if (!profile) {
    return { result: { status: 'anonymous' }, headers };
  }

  return { result: { status: 'ok', profile }, headers };
}

export async function updateAccountName(
  request: Request,
  name: string,
): Promise<{ result: AccountNameResult; headers: Headers }> {
  const { actor, headers } = await resolveAccountActor(request);
  if (actor.status !== 'ok') {
    return { result: { status: 'anonymous' }, headers };
  }

  const fieldErrors = validateAccountName(name);
  if (fieldErrors.name) {
    return { result: { status: 'invalid', fieldErrors }, headers };
  }

  try {
    const updated = await prisma.user.update({
      where: { id: actor.userId },
      data: { name: name.trim() },
      select: { name: true },
    });
    return { result: { status: 'ok', name: updated.name }, headers };
  } catch (error) {
    console.error('이름을 변경하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export async function updateAccountPassword(
  request: Request,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): Promise<{ result: AccountPasswordResult; headers: Headers }> {
  const { actor, headers } = await resolveAccountActor(request);
  if (actor.status !== 'ok') {
    return { result: { status: 'anonymous' }, headers };
  }

  if (currentPassword.trim() === '') {
    return {
      result: {
        status: 'invalid',
        fieldErrors: { currentPassword: CURRENT_PASSWORD_REQUIRED_MESSAGE },
      },
      headers,
    };
  }

  const changed = await changeOwnPassword({
    userId: actor.userId,
    currentPassword,
    newPassword,
    confirmPassword,
  });

  switch (changed.status) {
    case 'success':
      return { result: { status: 'ok' }, headers };
    case 'invalid-password':
      return {
        result: {
          status: 'invalid',
          fieldErrors:
            changed.field === 'newPassword'
              ? { newPassword: changed.message }
              : { confirmPassword: changed.message },
        },
        headers,
      };
    case 'invalid-credentials':
      return { result: { status: 'invalid-credentials' }, headers };
    default: {
      const unreachable: never = changed;
      return unreachable;
    }
  }
}
