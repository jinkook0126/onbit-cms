import { createClient } from '@supabase/supabase-js';
import { createContext } from 'react-router';

import { MAX_LOGIN_ID_LENGTH } from '~/features/auth/type';
import { prisma } from '~/lib/db.server';
import { requiredServerEnv } from '~/lib/env.server';
import { createSupabaseServerClient } from '~/lib/supabase.server';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Prisma, UserRole } from '../../../../generated/prisma/client';

const AUTH_EMAIL_DOMAIN = 'onbit.local';
const LOGIN_ID_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 16;

export type AuthenticatedUser = {
  id: string;
  loginId: string;
  role: UserRole;
  companyId: string | null;
  companyName: string | null;
};

export const authenticatedUserContext = createContext<AuthenticatedUser | null>(null);

export type SessionResolution =
  | { status: 'anonymous' }
  | { status: 'rejected' }
  | { status: 'authenticated'; user: AuthenticatedUser };

export type LoginResult =
  | { status: 'success'; headers: Headers }
  | { status: 'must-change-password' }
  | { status: 'invalid-credentials' };

export type PasswordChangeResult =
  | { status: 'success' }
  | { status: 'invalid-credentials' }
  | { status: 'not-required' }
  | { status: 'profile-update-failed' }
  | {
      status: 'invalid-password';
      field: 'newPassword' | 'confirmPassword';
      message: string;
    };

type LoginProfile = {
  id: string;
  loginId: string;
  companyId: string | null;
  role: UserRole;
  mustChangePassword: boolean;
  isActive: boolean;
  company: { isActive: boolean; name: string } | null;
};

export function normalizeLoginId(value: string): string | null {
  const loginId = value.trim().toLowerCase();
  if (loginId.length < 1 || loginId.length > MAX_LOGIN_ID_LENGTH) {
    return null;
  }
  if (!LOGIN_ID_PATTERN.test(loginId)) {
    return null;
  }
  return loginId;
}

function toAuthEmail(loginId: string): string {
  return `${loginId}@${AUTH_EMAIL_DOMAIN}`;
}

// signUp은 @onbit.local 주소를 거절한다. 로그인에 쓰는 주소이므로 Auth 사용자와 이메일 identity를 직접 만든다.
// 초기 비밀번호는 정규화된 아이디와 같다.
export async function createLoginAuthUser(
  db: Prisma.TransactionClient,
  loginId: string,
): Promise<{ userId: string; temporaryPassword: string }> {
  const userId = crypto.randomUUID();
  const temporaryPassword = loginId;
  const email = toAuthEmail(loginId);

  await db.$executeRaw`
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      is_sso_user, is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid,
      ${userId}::uuid,
      'authenticated',
      'authenticated',
      ${email},
      extensions.crypt(${temporaryPassword}, extensions.gen_salt('bf')),
      now(),
      '',
      '',
      '',
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      false,
      false
    )
  `;
  await db.$executeRaw`
    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, created_at, updated_at
    ) VALUES (
      ${userId},
      ${userId}::uuid,
      jsonb_build_object(
        'sub', ${userId}::text,
        'email', ${email}::text,
        'email_verified', false,
        'phone_verified', false
      ),
      'email',
      now(),
      now()
    )
  `;

  return { userId, temporaryPassword };
}

function createMemoryAuthClient() {
  return createClient(requiredServerEnv('SUPABASE_URL'), requiredServerEnv('SUPABASE_ANON_KEY'), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

async function findLoginProfile(userId: string): Promise<LoginProfile | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      loginId: true,
      companyId: true,
      role: true,
      mustChangePassword: true,
      isActive: true,
      company: { select: { isActive: true, name: true } },
    },
  });
}

function isActiveProfile(profile: LoginProfile): boolean {
  if (!profile.isActive) {
    return false;
  }
  if (profile.companyId === null) {
    return profile.role === 'SUPER_ADMIN';
  }
  return profile.company?.isActive === true;
}

function toAuthenticatedUser(profile: LoginProfile): AuthenticatedUser {
  return {
    id: profile.id,
    loginId: profile.loginId,
    role: profile.role,
    companyId: profile.companyId,
    companyName: profile.company?.name ?? null,
  };
}

async function revokeMemorySession(client: SupabaseClient): Promise<void> {
  try {
    await client.auth.signOut({ scope: 'global' });
  } catch (error) {
    console.error('임시 인증 세션을 종료하지 못했습니다.', error);
  }
}

export async function resolveSession(supabase: SupabaseClient): Promise<SessionResolution> {
  const { data, error } = await supabase.auth.getClaims();
  if (error) {
    return { status: 'anonymous' };
  }

  const userId = data?.claims.sub;
  if (!userId) {
    return { status: 'anonymous' };
  }

  const profile = await findLoginProfile(userId);
  if (!profile || !isActiveProfile(profile) || profile.mustChangePassword) {
    return { status: 'rejected' };
  }

  return { status: 'authenticated', user: toAuthenticatedUser(profile) };
}

export type OrganizationActor =
  | { status: 'ok'; role: 'SUPER_ADMIN' }
  | { status: 'ok'; role: 'COMPANY_ADMIN'; companyId: string }
  | { status: 'anonymous' }
  | { status: 'forbidden' };

export async function resolveOrganizationActor(
  request: Request,
): Promise<{ actor: OrganizationActor; headers: Headers }> {
  const { supabase, headers } = createSupabaseServerClient(request);
  const session = await resolveSession(supabase);
  if (session.status !== 'authenticated') {
    return { actor: { status: 'anonymous' }, headers };
  }
  if (session.user.role === 'SUPER_ADMIN') {
    return { actor: { status: 'ok', role: 'SUPER_ADMIN' }, headers };
  }
  if (session.user.role === 'COMPANY_ADMIN' && session.user.companyId) {
    return {
      actor: { status: 'ok', role: 'COMPANY_ADMIN', companyId: session.user.companyId },
      headers,
    };
  }
  return { actor: { status: 'forbidden' }, headers };
}

export async function loginWithPassword(
  request: Request,
  loginId: string,
  password: string,
): Promise<LoginResult> {
  const memoryClient = createMemoryAuthClient();
  const { data, error } = await memoryClient.auth.signInWithPassword({
    email: toAuthEmail(loginId),
    password,
  });

  if (error) {
    return { status: 'invalid-credentials' };
  }

  const profile = await findLoginProfile(data.user.id);
  if (!profile) {
    await revokeMemorySession(memoryClient);
    return { status: 'invalid-credentials' };
  }
  if (profile.loginId !== loginId || !isActiveProfile(profile)) {
    await revokeMemorySession(memoryClient);
    return { status: 'invalid-credentials' };
  }

  if (profile.mustChangePassword) {
    await revokeMemorySession(memoryClient);
    return { status: 'must-change-password' };
  }

  const { supabase, headers } = createSupabaseServerClient(request);
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
  if (sessionError) {
    await revokeMemorySession(memoryClient);
    return { status: 'invalid-credentials' };
  }

  return { status: 'success', headers };
}

type InvalidPassword = Extract<PasswordChangeResult, { status: 'invalid-password' }>;

function validateNewPassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): InvalidPassword | null {
  if (newPassword !== confirmPassword) {
    return {
      status: 'invalid-password',
      field: 'confirmPassword',
      message: '새 비밀번호가 서로 다릅니다.',
    };
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      status: 'invalid-password',
      field: 'newPassword',
      message: '비밀번호는 8자 이상이어야 합니다.',
    };
  }
  if (newPassword.length > MAX_PASSWORD_LENGTH) {
    return {
      status: 'invalid-password',
      field: 'newPassword',
      message: `비밀번호는 ${MAX_PASSWORD_LENGTH}자 이하여야 합니다.`,
    };
  }
  if (newPassword === currentPassword) {
    return {
      status: 'invalid-password',
      field: 'newPassword',
      message: '현재 비밀번호와 다른 비밀번호를 입력하세요.',
    };
  }
  return null;
}

export async function changePassword(input: {
  loginId: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<PasswordChangeResult> {
  const validationError = validateNewPassword(
    input.currentPassword,
    input.newPassword,
    input.confirmPassword,
  );
  if (validationError) {
    return validationError;
  }

  const memoryClient = createMemoryAuthClient();
  const { data, error } = await memoryClient.auth.signInWithPassword({
    email: toAuthEmail(input.loginId),
    password: input.currentPassword,
  });
  if (error) {
    return { status: 'invalid-credentials' };
  }

  const profile = await findLoginProfile(data.user.id);
  if (!profile) {
    await revokeMemorySession(memoryClient);
    return { status: 'invalid-credentials' };
  }
  if (profile.loginId !== input.loginId || !isActiveProfile(profile)) {
    await revokeMemorySession(memoryClient);
    return { status: 'invalid-credentials' };
  }
  if (!profile.mustChangePassword) {
    await revokeMemorySession(memoryClient);
    return { status: 'not-required' };
  }

  const { error: updateError } = await memoryClient.auth.updateUser({
    password: input.newPassword,
  });
  if (updateError) {
    await revokeMemorySession(memoryClient);
    return {
      status: 'invalid-password',
      field: 'newPassword',
      message: '비밀번호를 변경하지 못했습니다. 다시 시도하세요.',
    };
  }

  try {
    await prisma.user.update({
      where: { id: profile.id },
      data: { mustChangePassword: false },
    });
  } catch (updateProfileError) {
    console.error('비밀번호 변경 표시를 저장하지 못했습니다.', updateProfileError);
    await revokeMemorySession(memoryClient);
    return { status: 'profile-update-failed' };
  }

  await revokeMemorySession(memoryClient);
  return { status: 'success' };
}

export type OwnPasswordChangeResult =
  { status: 'success' } | { status: 'invalid-credentials' } | InvalidPassword;

export async function changeOwnPassword(input: {
  userId: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<OwnPasswordChangeResult> {
  const validationError = validateNewPassword(
    input.currentPassword,
    input.newPassword,
    input.confirmPassword,
  );
  if (validationError) {
    return validationError;
  }

  const profile = await findLoginProfile(input.userId);
  if (!profile || !isActiveProfile(profile)) {
    return { status: 'invalid-credentials' };
  }

  const memoryClient = createMemoryAuthClient();
  const { data, error } = await memoryClient.auth.signInWithPassword({
    email: toAuthEmail(profile.loginId),
    password: input.currentPassword,
  });
  if (error || data.user.id !== profile.id) {
    if (!error) {
      await revokeMemorySession(memoryClient);
    }
    return { status: 'invalid-credentials' };
  }

  const { error: updateError } = await memoryClient.auth.updateUser({
    password: input.newPassword,
  });
  await revokeMemorySession(memoryClient);
  if (updateError) {
    return {
      status: 'invalid-password',
      field: 'newPassword',
      message: '비밀번호를 변경하지 못했습니다. 다시 시도하세요.',
    };
  }

  return { status: 'success' };
}
