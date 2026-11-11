import {
  createLoginAuthUser,
  normalizeLoginId,
  resolveSession,
} from '~/features/auth/api/auth.server';
import { MAX_LOGIN_ID_LENGTH } from '~/features/auth/type';
import { MAX_COMPANY_NAME_LENGTH } from '~/features/companies/type';
import { MAX_ACCOUNT_NAME_LENGTH } from '~/features/settings/type';
import { prisma } from '~/lib/db.server';
import { errorCodeLabel, isMissingRecord, isUniqueConflict } from '~/lib/error.server';
import { createSupabaseServerClient } from '~/lib/supabase.server';
import { isUuid } from '~/lib/uuid.server';

import type {
  CompanyDetail,
  CompanyFieldErrors,
  CompanyListItem,
  CompanyMasterAccount,
  CompanyMasterFieldErrors,
  CompanyNameFieldErrors,
} from '~/features/companies/type';

export type CompanyListResult =
  | { status: 'ok'; companies: CompanyListItem[] }
  | { status: 'anonymous' }
  | { status: 'forbidden' };

export type CompanyCreateResult =
  | { status: 'ok'; company: CompanyListItem }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'invalid'; fieldErrors: CompanyFieldErrors }
  | { status: 'failed' };

type CompanyActor = { status: 'ok' } | { status: 'anonymous' } | { status: 'forbidden' };

const NAME_REQUIRED_MESSAGE = '회사 이름을 입력하세요.';
const NAME_TOO_LONG_MESSAGE = `회사 이름은 ${MAX_COMPANY_NAME_LENGTH}자 이하여야 합니다.`;
const LOGIN_ID_REQUIRED_MESSAGE = '아이디를 입력하세요.';
const LOGIN_ID_TOO_LONG_MESSAGE = `아이디는 ${MAX_LOGIN_ID_LENGTH}자 이하여야 합니다.`;
const LOGIN_ID_INVALID_MESSAGE = '사용할 수 없는 문자가 포함되어 있습니다.';
const LOGIN_ID_CONFLICT_MESSAGE = '이미 사용 중인 아이디입니다.';

async function resolveCompanyActor(
  request: Request,
): Promise<{ actor: CompanyActor; headers: Headers }> {
  const { supabase, headers } = createSupabaseServerClient(request);
  const session = await resolveSession(supabase);
  if (session.status !== 'authenticated') {
    return { actor: { status: 'anonymous' }, headers };
  }
  if (session.user.role !== 'SUPER_ADMIN') {
    return { actor: { status: 'forbidden' }, headers };
  }
  return { actor: { status: 'ok' }, headers };
}

function toCompanyListItem(company: {
  id: string;
  name: string;
  createdAt: Date;
  isActive: boolean;
}): CompanyListItem {
  return {
    id: company.id,
    name: company.name,
    createdAt: company.createdAt.toISOString(),
    isActive: company.isActive,
  };
}

function validateCompany(name: string, loginId: string): CompanyFieldErrors {
  const fieldErrors: CompanyFieldErrors = {};
  const trimmedName = name.trim();
  const trimmedLoginId = loginId.trim();

  if (trimmedName.length < 1) {
    fieldErrors.name = NAME_REQUIRED_MESSAGE;
  } else if (trimmedName.length > MAX_COMPANY_NAME_LENGTH) {
    fieldErrors.name = NAME_TOO_LONG_MESSAGE;
  }

  if (trimmedLoginId.length < 1) {
    fieldErrors.loginId = LOGIN_ID_REQUIRED_MESSAGE;
  } else if (trimmedLoginId.length > MAX_LOGIN_ID_LENGTH) {
    fieldErrors.loginId = LOGIN_ID_TOO_LONG_MESSAGE;
  } else if (!normalizeLoginId(trimmedLoginId)) {
    fieldErrors.loginId = LOGIN_ID_INVALID_MESSAGE;
  }

  return fieldErrors;
}

export async function readCompanies(
  request: Request,
): Promise<{ result: CompanyListResult; headers: Headers }> {
  const { actor, headers } = await resolveCompanyActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  const companies = await prisma.company.findMany({
    select: { id: true, name: true, createdAt: true, isActive: true },
    orderBy: [{ createdAt: 'desc' }, { name: 'asc' }],
  });

  return { result: { status: 'ok', companies: companies.map(toCompanyListItem) }, headers };
}

export async function createCompany(
  request: Request,
  name: string,
  loginId: string,
): Promise<{ result: CompanyCreateResult; headers: Headers }> {
  const { actor, headers } = await resolveCompanyActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  const fieldErrors = validateCompany(name, loginId);
  if (fieldErrors.name ?? fieldErrors.loginId) {
    return { result: { status: 'invalid', fieldErrors }, headers };
  }

  const normalizedLoginId = normalizeLoginId(loginId);
  if (!normalizedLoginId) {
    return {
      result: { status: 'invalid', fieldErrors: { loginId: LOGIN_ID_INVALID_MESSAGE } },
      headers,
    };
  }

  try {
    const company = await prisma.company.create({
      data: { name: name.trim(), loginId: normalizedLoginId },
      select: { id: true, name: true, createdAt: true, isActive: true },
    });
    return { result: { status: 'ok', company: toCompanyListItem(company) }, headers };
  } catch (error) {
    if (isUniqueConflict(error)) {
      return {
        result: { status: 'invalid', fieldErrors: { loginId: LOGIN_ID_CONFLICT_MESSAGE } },
        headers,
      };
    }
    console.error('회사를 추가하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export type CompanyDetailResult =
  | { status: 'ok'; company: CompanyDetail }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' };

export type CompanyNameResult =
  | { status: 'ok'; name: string }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'invalid'; fieldErrors: CompanyNameFieldErrors }
  | { status: 'failed' };

export type CompanyStatusResult =
  | { status: 'ok'; isActive: boolean }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'failed' };

export type CompanyMasterResult =
  | { status: 'ok'; master: CompanyMasterAccount; temporaryPassword: string }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'invalid'; fieldErrors: CompanyMasterFieldErrors }
  | { status: 'conflict' }
  | { status: 'failed' };

const ACCOUNT_NAME_REQUIRED_MESSAGE = '이름을 입력하세요.';
const ACCOUNT_NAME_TOO_LONG_MESSAGE = `이름은 ${MAX_ACCOUNT_NAME_LENGTH}자 이하여야 합니다.`;

function validateCompanyName(name: string): CompanyNameFieldErrors {
  const fieldErrors: CompanyNameFieldErrors = {};
  const trimmed = name.trim();
  if (trimmed.length < 1) {
    fieldErrors.name = NAME_REQUIRED_MESSAGE;
  } else if (trimmed.length > MAX_COMPANY_NAME_LENGTH) {
    fieldErrors.name = NAME_TOO_LONG_MESSAGE;
  }
  return fieldErrors;
}

function validateMasterAccount(loginId: string, name: string): CompanyMasterFieldErrors {
  const fieldErrors: CompanyMasterFieldErrors = {};
  const trimmedName = name.trim();
  const trimmedLoginId = loginId.trim();

  if (trimmedName.length < 1) {
    fieldErrors.name = ACCOUNT_NAME_REQUIRED_MESSAGE;
  } else if (trimmedName.length > MAX_ACCOUNT_NAME_LENGTH) {
    fieldErrors.name = ACCOUNT_NAME_TOO_LONG_MESSAGE;
  }

  if (trimmedLoginId.length < 1) {
    fieldErrors.loginId = LOGIN_ID_REQUIRED_MESSAGE;
  } else if (trimmedLoginId.length > MAX_LOGIN_ID_LENGTH) {
    fieldErrors.loginId = LOGIN_ID_TOO_LONG_MESSAGE;
  } else if (!normalizeLoginId(trimmedLoginId)) {
    fieldErrors.loginId = LOGIN_ID_INVALID_MESSAGE;
  }

  return fieldErrors;
}

export async function readCompany(
  request: Request,
  companyId: string,
): Promise<{ result: CompanyDetailResult; headers: Headers }> {
  const { actor, headers } = await resolveCompanyActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }
  if (!isUuid(companyId)) {
    return { result: { status: 'not-found' }, headers };
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      loginId: true,
      isActive: true,
      users: {
        where: { role: 'COMPANY_ADMIN' },
        select: { id: true, loginId: true, name: true, mustChangePassword: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!company) {
    return { result: { status: 'not-found' }, headers };
  }

  return {
    result: {
      status: 'ok',
      company: {
        id: company.id,
        name: company.name,
        loginId: company.loginId,
        isActive: company.isActive,
        masters: company.users,
      },
    },
    headers,
  };
}

export async function updateCompanyName(
  request: Request,
  companyId: string,
  name: string,
): Promise<{ result: CompanyNameResult; headers: Headers }> {
  const { actor, headers } = await resolveCompanyActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }
  if (!isUuid(companyId)) {
    return { result: { status: 'not-found' }, headers };
  }

  const fieldErrors = validateCompanyName(name);
  if (fieldErrors.name) {
    return { result: { status: 'invalid', fieldErrors }, headers };
  }

  try {
    const updated = await prisma.company.update({
      where: { id: companyId },
      data: { name: name.trim() },
      select: { name: true },
    });
    return { result: { status: 'ok', name: updated.name }, headers };
  } catch (error) {
    if (isMissingRecord(error)) {
      return { result: { status: 'not-found' }, headers };
    }
    console.error('회사 이름을 변경하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export async function updateCompanyStatus(
  request: Request,
  companyId: string,
  isActive: boolean,
): Promise<{ result: CompanyStatusResult; headers: Headers }> {
  const { actor, headers } = await resolveCompanyActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }
  if (!isUuid(companyId)) {
    return { result: { status: 'not-found' }, headers };
  }

  try {
    const updated = await prisma.company.update({
      where: { id: companyId },
      data: { isActive },
      select: { isActive: true },
    });
    return { result: { status: 'ok', isActive: updated.isActive }, headers };
  } catch (error) {
    if (isMissingRecord(error)) {
      return { result: { status: 'not-found' }, headers };
    }
    console.error('회사 상태를 변경하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export async function createCompanyMaster(
  request: Request,
  companyId: string,
  loginId: string,
  name: string,
): Promise<{ result: CompanyMasterResult; headers: Headers }> {
  const { actor, headers } = await resolveCompanyActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }
  if (!isUuid(companyId)) {
    return { result: { status: 'not-found' }, headers };
  }

  const fieldErrors = validateMasterAccount(loginId, name);
  if (fieldErrors.loginId ?? fieldErrors.name) {
    return { result: { status: 'invalid', fieldErrors }, headers };
  }

  const normalizedLoginId = normalizeLoginId(loginId);
  if (!normalizedLoginId) {
    return {
      result: { status: 'invalid', fieldErrors: { loginId: LOGIN_ID_INVALID_MESSAGE } },
      headers,
    };
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });
  if (!company) {
    return { result: { status: 'not-found' }, headers };
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findFirst({
        where: { companyId, role: 'COMPANY_ADMIN' },
        select: { id: true },
      });
      if (existing) {
        return null;
      }
      const authUser = await createLoginAuthUser(tx, normalizedLoginId);
      const master = await tx.user.create({
        data: {
          id: authUser.userId,
          loginId: normalizedLoginId,
          name: name.trim(),
          companyId,
          role: 'COMPANY_ADMIN',
        },
        select: { id: true, loginId: true, name: true, mustChangePassword: true },
      });
      return { master, temporaryPassword: authUser.temporaryPassword };
    });
    if (!created) {
      return { result: { status: 'conflict' }, headers };
    }
    return {
      result: {
        status: 'ok',
        master: created.master,
        temporaryPassword: created.temporaryPassword,
      },
      headers,
    };
  } catch (error) {
    if (isUniqueConflict(error)) {
      return {
        result: { status: 'invalid', fieldErrors: { loginId: LOGIN_ID_CONFLICT_MESSAGE } },
        headers,
      };
    }
    console.error('마스터 계정을 만들지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}
