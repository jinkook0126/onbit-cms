import { createLoginAuthUser, resolveOrganizationActor } from '~/features/auth/api/auth.server';
import {
  MAX_EMPLOYEE_LOGIN_ID_LENGTH,
  MIN_EMPLOYEE_LOGIN_ID_LENGTH,
} from '~/features/employees/type';
import { MAX_ACCOUNT_NAME_LENGTH } from '~/features/settings/type';
import { prisma } from '~/lib/db.server';
import { errorCodeLabel, isMissingRecord, isUniqueConflict } from '~/lib/error.server';
import { isUuid } from '~/lib/uuid.server';

import type {
  EmployeeCompanyOption,
  EmployeeFieldErrors,
  EmployeeListItem,
} from '~/features/employees/type';

export type EmployeeListResult =
  | {
      status: 'ok';
      company: EmployeeCompanyOption | null;
      companies: EmployeeCompanyOption[];
      employees: EmployeeListItem[];
    }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' };

export type EmployeeCreateResult =
  | { status: 'ok'; employee: EmployeeListItem }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'invalid'; fieldErrors: EmployeeFieldErrors }
  | { status: 'failed' };

export type EmployeeTeamResult =
  | { status: 'ok'; teamId: string | null; teamName: string | null }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'invalid'; formError: string }
  | { status: 'failed' };

const NAME_REQUIRED_MESSAGE = '이름을 입력하세요.';
const NAME_TOO_LONG_MESSAGE = `이름은 ${MAX_ACCOUNT_NAME_LENGTH}자 이하여야 합니다.`;
const LOGIN_ID_REQUIRED_MESSAGE = '아이디를 입력하세요.';
const LOGIN_ID_POLICY_MESSAGE = `아이디는 영문과 숫자를 조합한 ${MIN_EMPLOYEE_LOGIN_ID_LENGTH}자 이상 ${MAX_EMPLOYEE_LOGIN_ID_LENGTH}자 이하여야 합니다.`;
const LOGIN_ID_CONFLICT_MESSAGE = '이미 사용 중인 아이디입니다.';
const TEAM_INVALID_MESSAGE = '같은 회사의 팀을 선택하세요.';
const employeeLoginIdPattern = new RegExp(
  `^[a-z\\d]{${MIN_EMPLOYEE_LOGIN_ID_LENGTH},${MAX_EMPLOYEE_LOGIN_ID_LENGTH}}$`,
);

function normalizeEmployeeLoginId(value: string): string | null {
  const loginId = value.trim().toLowerCase();
  const hasLetter = /[a-z]/.test(loginId);
  const hasDigit = /\d/.test(loginId);
  if (!employeeLoginIdPattern.test(loginId) || !hasLetter || !hasDigit) {
    return null;
  }
  return loginId;
}

function validateEmployee(loginId: string, name: string): EmployeeFieldErrors {
  const fieldErrors: EmployeeFieldErrors = {};
  const trimmedName = name.trim();
  const trimmedLoginId = loginId.trim();

  if (trimmedName.length < 1) {
    fieldErrors.name = NAME_REQUIRED_MESSAGE;
  } else if (trimmedName.length > MAX_ACCOUNT_NAME_LENGTH) {
    fieldErrors.name = NAME_TOO_LONG_MESSAGE;
  }

  if (trimmedLoginId.length < 1) {
    fieldErrors.loginId = LOGIN_ID_REQUIRED_MESSAGE;
  } else if (!normalizeEmployeeLoginId(trimmedLoginId)) {
    fieldErrors.loginId = LOGIN_ID_POLICY_MESSAGE;
  }

  return fieldErrors;
}

async function readCompanyOptions(): Promise<EmployeeCompanyOption[]> {
  return prisma.company.findMany({
    select: { id: true, name: true },
    orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
  });
}

function toEmployeeListItem(employee: {
  id: string;
  loginId: string;
  name: string;
  team: { id: string; name: string } | null;
}): EmployeeListItem {
  return {
    id: employee.id,
    loginId: employee.loginId,
    name: employee.name,
    teamId: employee.team?.id ?? null,
    teamName: employee.team?.name ?? null,
  };
}

async function readCompanyEmployees(
  companyId: string,
): Promise<{ company: EmployeeCompanyOption; employees: EmployeeListItem[] } | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      users: {
        where: { role: 'EMPLOYEE' },
        select: {
          id: true,
          loginId: true,
          name: true,
          team: { select: { id: true, name: true } },
        },
        orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });
  if (!company) {
    return null;
  }
  return {
    company: { id: company.id, name: company.name },
    employees: company.users.map(toEmployeeListItem),
  };
}

export async function readEmployees(
  request: Request,
  requestedCompanyId: string | null,
): Promise<{ result: EmployeeListResult; headers: Headers }> {
  const { actor, headers } = await resolveOrganizationActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  if (actor.role === 'COMPANY_ADMIN') {
    const scoped = await readCompanyEmployees(actor.companyId);
    if (!scoped) {
      return { result: { status: 'not-found' }, headers };
    }
    return {
      result: {
        status: 'ok',
        company: scoped.company,
        companies: [],
        employees: scoped.employees,
      },
      headers,
    };
  }

  const companies = await readCompanyOptions();
  if (!requestedCompanyId) {
    return { result: { status: 'ok', company: null, companies, employees: [] }, headers };
  }
  if (!isUuid(requestedCompanyId)) {
    return { result: { status: 'not-found' }, headers };
  }
  const scoped = await readCompanyEmployees(requestedCompanyId);
  if (!scoped) {
    return { result: { status: 'not-found' }, headers };
  }
  return {
    result: {
      status: 'ok',
      company: scoped.company,
      companies,
      employees: scoped.employees,
    },
    headers,
  };
}

export async function createEmployee(
  request: Request,
  loginId: string,
  name: string,
  requestedCompanyId: string | undefined,
): Promise<{ result: EmployeeCreateResult; headers: Headers }> {
  const { actor, headers } = await resolveOrganizationActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  const fieldErrors = validateEmployee(loginId, name);
  if (fieldErrors.loginId ?? fieldErrors.name) {
    return { result: { status: 'invalid', fieldErrors }, headers };
  }

  const normalizedLoginId = normalizeEmployeeLoginId(loginId);
  if (!normalizedLoginId) {
    return {
      result: { status: 'invalid', fieldErrors: { loginId: LOGIN_ID_POLICY_MESSAGE } },
      headers,
    };
  }

  const companyId = actor.role === 'COMPANY_ADMIN' ? actor.companyId : requestedCompanyId;
  if (!companyId || !isUuid(companyId)) {
    return { result: { status: 'not-found' }, headers };
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
      const authUser = await createLoginAuthUser(tx, normalizedLoginId);
      const employee = await tx.user.create({
        data: {
          id: authUser.userId,
          loginId: normalizedLoginId,
          name: name.trim(),
          companyId,
          role: 'EMPLOYEE',
        },
        select: {
          id: true,
          loginId: true,
          name: true,
          team: { select: { id: true, name: true } },
        },
      });
      return { employee };
    });
    return {
      result: { status: 'ok', employee: toEmployeeListItem(created.employee) },
      headers,
    };
  } catch (error) {
    if (isUniqueConflict(error)) {
      return {
        result: { status: 'invalid', fieldErrors: { loginId: LOGIN_ID_CONFLICT_MESSAGE } },
        headers,
      };
    }
    if (isMissingRecord(error)) {
      return { result: { status: 'not-found' }, headers };
    }
    console.error('직원을 등록하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export async function updateEmployeeTeam(
  request: Request,
  employeeId: string,
  teamId: string | null,
): Promise<{ result: EmployeeTeamResult; headers: Headers }> {
  const { actor, headers } = await resolveOrganizationActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }
  if (!isUuid(employeeId)) {
    return { result: { status: 'not-found' }, headers };
  }

  const employee = await prisma.user.findFirst({
    where: { id: employeeId, role: 'EMPLOYEE' },
    select: { id: true, companyId: true },
  });
  if (!employee?.companyId) {
    return { result: { status: 'not-found' }, headers };
  }
  const companyId = employee.companyId;
  if (actor.role === 'COMPANY_ADMIN' && companyId !== actor.companyId) {
    return { result: { status: 'not-found' }, headers };
  }

  if (teamId !== null && !isUuid(teamId)) {
    return { result: { status: 'invalid', formError: TEAM_INVALID_MESSAGE }, headers };
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const team =
        teamId === null
          ? null
          : await tx.team.findFirst({
              where: { id: teamId, companyId },
              select: { id: true, name: true },
            });
      if (teamId !== null && !team) {
        return null;
      }
      await tx.team.updateMany({
        where: {
          leaderId: employee.id,
          ...(team ? { id: { not: team.id } } : {}),
        },
        data: { leaderId: null },
      });
      await tx.user.update({
        where: { id: employee.id },
        data: { teamId: team?.id ?? null },
        select: { id: true },
      });
      return { teamId: team?.id ?? null, teamName: team?.name ?? null };
    });
    if (!updated) {
      return { result: { status: 'invalid', formError: TEAM_INVALID_MESSAGE }, headers };
    }
    return { result: { status: 'ok', ...updated }, headers };
  } catch (error) {
    if (isMissingRecord(error)) {
      return { result: { status: 'not-found' }, headers };
    }
    console.error('직원 팀을 변경하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}
