import { resolveSession } from '~/features/auth/api/auth.server';
import {
  CUSTOMER_PAGE_SIZE,
  MAX_CONSULTATION_CONTENT_LENGTH,
  MAX_CUSTOMER_KEYWORD_LENGTH,
  MAX_CUSTOMER_NAME_LENGTH,
  MAX_CUSTOMER_PHONE_LENGTH,
  MAX_INSTALLMENT_COUNT,
  MAX_RETAIN_AMOUNT,
  MIN_CUSTOMER_PHONE_LENGTH,
  caseTypeLabels,
} from '~/features/customers/type';
import { prisma } from '~/lib/db.server';
import { errorCodeLabel, isMissingRecord } from '~/lib/error.server';
import { createSupabaseServerClient } from '~/lib/supabase.server';
import { isUuid } from '~/lib/uuid.server';

import type {
  CaseType,
  ConsultationStatus,
  CustomerAssigneeOption,
  ConsultationCreateFieldErrors,
  ConsultationListItem,
  CustomerCreateFieldErrors,
  CustomerDetail,
  CustomerListItem,
  CustomerRetainFieldErrors,
  CustomerRetainSubmission,
  CustomerSearchField,
  InflowSource,
} from '~/features/customers/type';
import type { Prisma } from '../../../../generated/prisma/client';

export type CustomerListResult =
  | {
      status: 'ok';
      customers: CustomerListItem[];
      page: number;
      pageSize: number;
      total: number;
    }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'failed' };

type CustomerActor =
  | { status: 'ok'; role: 'COMPANY_ADMIN'; companyId: string; userId: string }
  | { status: 'ok'; role: 'EMPLOYEE'; companyId: string; userId: string }
  | { status: 'anonymous' }
  | { status: 'forbidden' };

const consultationStatuses: readonly ConsultationStatus[] = [
  'IN_CONSULTATION',
  'CONSIDERING',
  'ABSENT',
  'REJECTED',
  'RETAINED',
];

const inflowSources: readonly InflowSource[] = ['HOMEPAGE', 'NAVER', 'REFERRAL', 'PHONE', 'OTHER'];

const caseTypes: readonly CaseType[] = [
  'PERSONAL_REHABILITATION',
  'PERSONAL_BANKRUPTCY',
  'PERSONAL_WORKOUT',
  'FAST_DEBT_ADJUSTMENT',
  'FRESH_START_FUND',
];

export type CustomerListQuery = {
  field: CustomerSearchField;
  keyword: string;
  status: ConsultationStatus | null;
  page: number;
};

function isConsultationStatus(value: string): value is ConsultationStatus {
  return consultationStatuses.some((status) => status === value);
}

function isInflowSource(value: string): value is InflowSource {
  return inflowSources.some((source) => source === value);
}

function isCaseType(value: string): value is CaseType {
  return caseTypes.some((caseType) => caseType === value);
}

async function resolveCustomerActor(
  request: Request,
): Promise<{ actor: CustomerActor; headers: Headers }> {
  const { supabase, headers } = createSupabaseServerClient(request);
  const session = await resolveSession(supabase);
  if (session.status !== 'authenticated') {
    return { actor: { status: 'anonymous' }, headers };
  }
  if (session.user.role === 'SUPER_ADMIN' || !session.user.companyId) {
    return { actor: { status: 'forbidden' }, headers };
  }
  if (session.user.role === 'COMPANY_ADMIN') {
    return {
      actor: {
        status: 'ok',
        role: 'COMPANY_ADMIN',
        companyId: session.user.companyId,
        userId: session.user.id,
      },
      headers,
    };
  }
  return {
    actor: {
      status: 'ok',
      role: 'EMPLOYEE',
      companyId: session.user.companyId,
      userId: session.user.id,
    },
    headers,
  };
}

async function customerVisibilityWhere(
  actor: Extract<CustomerActor, { status: 'ok' }>,
): Promise<Prisma.CustomerWhereInput> {
  if (actor.role === 'COMPANY_ADMIN') {
    return { companyId: actor.companyId };
  }

  const ledTeams = await prisma.team.findMany({
    where: { companyId: actor.companyId, leaderId: actor.userId },
    select: { id: true },
  });
  if (ledTeams.length > 0) {
    return {
      companyId: actor.companyId,
      OR: [{ assignee: { teamId: { in: ledTeams.map((team) => team.id) } } }, { assigneeId: null }],
    };
  }
  return { companyId: actor.companyId, assigneeId: actor.userId };
}

function formatContactDate(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toCustomerListItem(customer: {
  id: string;
  name: string;
  phone: string;
  source: string;
  status: string;
  nextContactOn: Date | null;
  assignee: { name: string } | null;
  consultations: { nextContactOn: Date | null }[];
}): CustomerListItem | null {
  if (!isInflowSource(customer.source) || !isConsultationStatus(customer.status)) {
    return null;
  }
  const latestConsultation = customer.consultations.at(0);
  const nextContactOn = latestConsultation
    ? latestConsultation.nextContactOn
    : customer.nextContactOn;
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    source: customer.source,
    status: customer.status,
    assigneeName: customer.assignee?.name ?? null,
    nextContactOn: nextContactOn ? formatContactDate(nextContactOn) : null,
  };
}

async function readScopedCustomers(
  visibility: Prisma.CustomerWhereInput,
  query: CustomerListQuery,
): Promise<{ customers: CustomerListItem[]; total: number }> {
  const keyword = query.keyword.trim().slice(0, MAX_CUSTOMER_KEYWORD_LENGTH);
  const where: Prisma.CustomerWhereInput = {
    ...visibility,
    ...(query.status ? { status: query.status } : {}),
    ...(keyword && query.field === 'name'
      ? { name: { contains: keyword, mode: 'insensitive' } }
      : {}),
    ...(keyword && query.field === 'phone'
      ? {
          phone: {
            contains: keyword.replace(/\D/g, '') || keyword,
          },
        }
      : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        source: true,
        status: true,
        nextContactOn: true,
        assignee: { select: { name: true } },
        consultations: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 1,
          select: { nextContactOn: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { name: 'asc' }],
      skip: (query.page - 1) * CUSTOMER_PAGE_SIZE,
      take: CUSTOMER_PAGE_SIZE,
    }),
  ]);
  const customers: CustomerListItem[] = [];
  for (const row of rows) {
    const item = toCustomerListItem(row);
    if (item) {
      customers.push(item);
    }
  }
  return { customers, total };
}

export async function readCustomers(
  request: Request,
  query: CustomerListQuery,
): Promise<{ result: CustomerListResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: actor.companyId },
      select: { id: true },
    });
    if (!company) {
      return { result: { status: 'not-found' }, headers };
    }
    const visibility = await customerVisibilityWhere(actor);
    const scoped = await readScopedCustomers(visibility, query);
    return {
      result: {
        status: 'ok',
        customers: scoped.customers,
        page: query.page,
        pageSize: CUSTOMER_PAGE_SIZE,
        total: scoped.total,
      },
      headers,
    };
  } catch (error) {
    console.error('상담 고객 목록을 불러오지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export type CustomerAssigneeResult =
  | { status: 'ok'; currentUserId: string; assignees: CustomerAssigneeOption[] }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'failed' };

export type CustomerCreateResult =
  | { status: 'ok'; id: string }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'invalid'; fieldErrors: CustomerCreateFieldErrors }
  | { status: 'failed' };

const NAME_REQUIRED_MESSAGE = '고객명을 입력하세요.';
const NAME_TOO_LONG_MESSAGE = `고객명은 ${MAX_CUSTOMER_NAME_LENGTH}자 이하여야 합니다.`;
const PHONE_REQUIRED_MESSAGE = '연락처를 입력하세요.';
const PHONE_INVALID_MESSAGE = `연락처는 숫자 ${MIN_CUSTOMER_PHONE_LENGTH}자 이상 ${MAX_CUSTOMER_PHONE_LENGTH}자 이하로 입력하세요.`;
const SOURCE_REQUIRED_MESSAGE = '유입처를 선택하세요.';
const ASSIGNEE_REQUIRED_MESSAGE = '담당을 선택하세요.';
const ASSIGNEE_INVALID_MESSAGE = '담당을 다시 선택하세요.';
const CONTACT_DATE_INVALID_MESSAGE = '다음 상담일을 다시 선택하세요.';

async function assigneeWhere(
  actor: Extract<CustomerActor, { status: 'ok' }>,
): Promise<Prisma.UserWhereInput> {
  if (actor.role === 'COMPANY_ADMIN') {
    return {
      companyId: actor.companyId,
      isActive: true,
      OR: [{ role: 'EMPLOYEE' }, { id: actor.userId }],
    };
  }

  const ledTeams = await prisma.team.findMany({
    where: { companyId: actor.companyId, leaderId: actor.userId },
    select: { id: true },
  });
  if (ledTeams.length === 0) {
    return { id: actor.userId, companyId: actor.companyId, isActive: true };
  }

  return {
    companyId: actor.companyId,
    isActive: true,
    OR: [
      { role: 'EMPLOYEE', teamId: { in: ledTeams.map((team) => team.id) } },
      { id: actor.userId },
    ],
  };
}

async function readAssigneeOptions(
  actor: Extract<CustomerActor, { status: 'ok' }>,
): Promise<CustomerAssigneeOption[]> {
  return prisma.user.findMany({
    where: await assigneeWhere(actor),
    select: { id: true, name: true },
    orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function readCustomerAssignees(
  request: Request,
): Promise<{ result: CustomerAssigneeResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  try {
    const assignees = await readAssigneeOptions(actor);
    return {
      result: { status: 'ok', currentUserId: actor.userId, assignees },
      headers,
    };
  } catch (error) {
    console.error('상담 담당 목록을 불러오지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

function parseContactDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function validateCustomer(
  name: string,
  phone: string,
  source: string,
  assigneeId: string,
  nextContactOn: string | null,
): CustomerCreateFieldErrors {
  const fieldErrors: CustomerCreateFieldErrors = {};
  const trimmedName = name.trim();
  const trimmedPhone = phone.trim();

  if (trimmedName.length < 1) {
    fieldErrors.name = NAME_REQUIRED_MESSAGE;
  } else if (trimmedName.length > MAX_CUSTOMER_NAME_LENGTH) {
    fieldErrors.name = NAME_TOO_LONG_MESSAGE;
  }

  if (trimmedPhone.length < 1) {
    fieldErrors.phone = PHONE_REQUIRED_MESSAGE;
  } else if (
    !/^\d+$/.test(trimmedPhone) ||
    trimmedPhone.length < MIN_CUSTOMER_PHONE_LENGTH ||
    trimmedPhone.length > MAX_CUSTOMER_PHONE_LENGTH
  ) {
    fieldErrors.phone = PHONE_INVALID_MESSAGE;
  }

  if (!isInflowSource(source)) {
    fieldErrors.source = SOURCE_REQUIRED_MESSAGE;
  }

  if (assigneeId.trim().length < 1) {
    fieldErrors.assigneeId = ASSIGNEE_REQUIRED_MESSAGE;
  } else if (!isUuid(assigneeId)) {
    fieldErrors.assigneeId = ASSIGNEE_INVALID_MESSAGE;
  }

  if (nextContactOn !== null && parseContactDate(nextContactOn) === null) {
    fieldErrors.nextContactOn = CONTACT_DATE_INVALID_MESSAGE;
  }

  return fieldErrors;
}

export async function createCustomer(
  request: Request,
  name: string,
  phone: string,
  source: string,
  assigneeId: string,
  nextContactOn: string | null,
): Promise<{ result: CustomerCreateResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  const fieldErrors = validateCustomer(name, phone, source, assigneeId, nextContactOn);
  if (Object.keys(fieldErrors).length > 0) {
    return { result: { status: 'invalid', fieldErrors }, headers };
  }
  if (!isInflowSource(source)) {
    return {
      result: { status: 'invalid', fieldErrors: { source: SOURCE_REQUIRED_MESSAGE } },
      headers,
    };
  }

  const contactDate = nextContactOn === null ? null : parseContactDate(nextContactOn);
  if (nextContactOn !== null && contactDate === null) {
    return {
      result: { status: 'invalid', fieldErrors: { nextContactOn: CONTACT_DATE_INVALID_MESSAGE } },
      headers,
    };
  }

  try {
    const assignees = await readAssigneeOptions(actor);
    if (!assignees.some((assignee) => assignee.id === assigneeId)) {
      return {
        result: { status: 'invalid', fieldErrors: { assigneeId: ASSIGNEE_INVALID_MESSAGE } },
        headers,
      };
    }

    const customer = await prisma.customer.create({
      data: {
        companyId: actor.companyId,
        name: name.trim(),
        phone: phone.trim(),
        source,
        assigneeId,
        nextContactOn: contactDate,
      },
      select: { id: true },
    });
    return { result: { status: 'ok', id: customer.id }, headers };
  } catch (error) {
    console.error('상담 고객을 등록하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

type AccessibleCustomer = {
  id: string;
  name: string;
  phone: string;
  status: string;
  assignee: { name: string } | null;
};

export type CustomerDetailResult =
  | { status: 'ok'; customer: CustomerDetail }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'failed' };

export type CustomerStatusResult =
  | { status: 'ok'; customerStatus: ConsultationStatus }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'invalid' }
  | { status: 'locked' }
  | { status: 'failed' };

async function readAccessibleCustomer(
  actor: Extract<CustomerActor, { status: 'ok' }>,
  customerId: string,
): Promise<AccessibleCustomer | null> {
  if (!isUuid(customerId)) {
    return null;
  }
  const visibility = await customerVisibilityWhere(actor);
  return prisma.customer.findFirst({
    where: { id: customerId, ...visibility },
    select: {
      id: true,
      name: true,
      phone: true,
      status: true,
      assignee: { select: { name: true } },
    },
  });
}

function toCustomerDetail(customer: AccessibleCustomer): CustomerDetail | null {
  if (!isConsultationStatus(customer.status)) {
    return null;
  }
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    assigneeName: customer.assignee?.name ?? null,
    status: customer.status,
  };
}

export async function readCustomer(
  request: Request,
  customerId: string,
): Promise<{ result: CustomerDetailResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer) {
      return { result: { status: 'not-found' }, headers };
    }
    const detail = toCustomerDetail(customer);
    if (!detail) {
      return { result: { status: 'not-found' }, headers };
    }
    return { result: { status: 'ok', customer: detail }, headers };
  } catch (error) {
    console.error('상담 고객을 불러오지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export async function updateCustomerStatus(
  request: Request,
  customerId: string,
  customerStatus: ConsultationStatus,
): Promise<{ result: CustomerStatusResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer || !isConsultationStatus(customer.status)) {
      return { result: { status: 'not-found' }, headers };
    }
    if (customer.status === customerStatus) {
      return { result: { status: 'ok', customerStatus }, headers };
    }
    if (customer.status === 'RETAINED') {
      return { result: { status: 'locked' }, headers };
    }
    if (customerStatus === 'RETAINED') {
      return { result: { status: 'invalid' }, headers };
    }

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: { status: customerStatus },
      select: { status: true },
    });
    if (!isConsultationStatus(updated.status)) {
      return { result: { status: 'failed' }, headers };
    }
    return { result: { status: 'ok', customerStatus: updated.status }, headers };
  } catch (error) {
    if (isMissingRecord(error)) {
      return { result: { status: 'not-found' }, headers };
    }
    console.error('상담 상태를 변경하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

const CONTRACT_DATE_REQUIRED_MESSAGE = '계약일을 선택하세요.';
const CONTRACT_DATE_INVALID_MESSAGE = '계약일은 올바른 날짜로 입력하세요.';
const CASE_TYPE_REQUIRED_MESSAGE = '사건유형을 선택하세요.';
const RETAINER_FEE_REQUIRED_MESSAGE = '수임료를 입력하세요.';
const RETAINER_FEE_INVALID_MESSAGE = '수임료는 0 이상 20억 원 이하의 정수로 입력하세요.';
const DEPOSIT_REQUIRED_MESSAGE = '계약금을 입력하세요.';
const DEPOSIT_INVALID_MESSAGE = '계약금은 0 이상 20억 원 이하의 정수로 입력하세요.';
const INSTALLMENT_REQUIRED_MESSAGE = '분납 회수를 입력하세요.';
const INSTALLMENT_INVALID_MESSAGE = '분납 회수는 1 이상 120 이하의 정수로 입력하세요.';
const FIRST_PAYMENT_REQUIRED_MESSAGE = '첫 회차 납부일을 선택하세요.';
const FIRST_PAYMENT_INVALID_MESSAGE = '첫 회차 납부일은 올바른 날짜로 입력하세요.';

export type CustomerRetainResult =
  | { status: 'ok'; customerStatus: 'RETAINED' }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'invalid'; fieldErrors: CustomerRetainFieldErrors }
  | { status: 'failed' };

type RetainWrite =
  | {
      ok: true;
      contractedOn: Date;
      caseType: CaseType;
      retainerFee: number;
      deposit: number;
      installmentCount: number;
      firstPaymentOn: Date;
    }
  | { ok: false; fieldErrors: CustomerRetainFieldErrors };

function dateFieldError(value: string, required: string, invalid: string): string | undefined {
  if (value.trim().length < 1) {
    return required;
  }
  if (parseContactDate(value) === null) {
    return invalid;
  }
  return undefined;
}

function moneyFieldError(value: string, required: string, invalid: string): string | undefined {
  if (value.trim().length < 1) {
    return required;
  }
  if (!/^\d+$/.test(value)) {
    return invalid;
  }
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount > MAX_RETAIN_AMOUNT) {
    return invalid;
  }
  return undefined;
}

function readRetainWrite(submission: CustomerRetainSubmission): RetainWrite {
  const fieldErrors: CustomerRetainFieldErrors = {};
  const contractedOnError = dateFieldError(
    submission.contractedOn,
    CONTRACT_DATE_REQUIRED_MESSAGE,
    CONTRACT_DATE_INVALID_MESSAGE,
  );
  if (contractedOnError) {
    fieldErrors.contractedOn = contractedOnError;
  }
  if (!isCaseType(submission.caseType)) {
    fieldErrors.caseType = CASE_TYPE_REQUIRED_MESSAGE;
  }
  const retainerFeeError = moneyFieldError(
    submission.retainerFee,
    RETAINER_FEE_REQUIRED_MESSAGE,
    RETAINER_FEE_INVALID_MESSAGE,
  );
  if (retainerFeeError) {
    fieldErrors.retainerFee = retainerFeeError;
  }
  const depositError = moneyFieldError(
    submission.deposit,
    DEPOSIT_REQUIRED_MESSAGE,
    DEPOSIT_INVALID_MESSAGE,
  );
  if (depositError) {
    fieldErrors.deposit = depositError;
  }
  if (submission.installmentCount.trim().length < 1) {
    fieldErrors.installmentCount = INSTALLMENT_REQUIRED_MESSAGE;
  } else if (!/^\d+$/.test(submission.installmentCount)) {
    fieldErrors.installmentCount = INSTALLMENT_INVALID_MESSAGE;
  } else {
    const installmentCount = Number(submission.installmentCount);
    if (
      !Number.isSafeInteger(installmentCount) ||
      installmentCount < 1 ||
      installmentCount > MAX_INSTALLMENT_COUNT
    ) {
      fieldErrors.installmentCount = INSTALLMENT_INVALID_MESSAGE;
    }
  }
  const firstPaymentError = dateFieldError(
    submission.firstPaymentOn,
    FIRST_PAYMENT_REQUIRED_MESSAGE,
    FIRST_PAYMENT_INVALID_MESSAGE,
  );
  if (firstPaymentError) {
    fieldErrors.firstPaymentOn = firstPaymentError;
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const contractedOn = parseContactDate(submission.contractedOn);
  const firstPaymentOn = parseContactDate(submission.firstPaymentOn);
  const retainerFee = Number(submission.retainerFee);
  const deposit = Number(submission.deposit);
  const installmentCount = Number(submission.installmentCount);
  if (
    contractedOn === null ||
    firstPaymentOn === null ||
    !isCaseType(submission.caseType) ||
    !Number.isSafeInteger(retainerFee) ||
    !Number.isSafeInteger(deposit) ||
    !Number.isSafeInteger(installmentCount)
  ) {
    return { ok: false, fieldErrors };
  }
  return {
    ok: true,
    contractedOn,
    caseType: submission.caseType,
    retainerFee,
    deposit,
    installmentCount,
    firstPaymentOn,
  };
}

export async function retainCustomer(
  request: Request,
  customerId: string,
  submission: CustomerRetainSubmission,
): Promise<{ result: CustomerRetainResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer || !isConsultationStatus(customer.status)) {
      return { result: { status: 'not-found' }, headers };
    }
    if (customer.status === 'RETAINED') {
      return { result: { status: 'ok', customerStatus: 'RETAINED' }, headers };
    }

    const input = readRetainWrite(submission);
    if (!input.ok) {
      return { result: { status: 'invalid', fieldErrors: input.fieldErrors }, headers };
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.customer.updateMany({
        where: { id: customer.id, status: { not: 'RETAINED' } },
        data: { status: 'RETAINED' },
      });
      if (updated.count !== 1) {
        return;
      }
      await tx.customerCase.create({
        data: {
          customerId: customer.id,
          contractedOn: input.contractedOn,
          caseType: input.caseType,
          retainerFee: input.retainerFee,
          deposit: input.deposit,
          installmentCount: input.installmentCount,
          firstPaymentOn: input.firstPaymentOn,
        },
      });
      await tx.consultation.create({
        data: {
          customerId: customer.id,
          content: `수임전환 - ${caseTypeLabels[input.caseType]}`,
          nextContactOn: null,
        },
      });
      await syncLatestNextContact(tx, customer.id);
    });
    return { result: { status: 'ok', customerStatus: 'RETAINED' }, headers };
  } catch (error) {
    if (isMissingRecord(error)) {
      return { result: { status: 'not-found' }, headers };
    }
    console.error('수임으로 전환하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

const CONTENT_REQUIRED_MESSAGE = '상담 내용을 입력하세요.';
const CONTENT_TOO_LONG_MESSAGE = `상담 내용은 ${MAX_CONSULTATION_CONTENT_LENGTH}자 이하여야 합니다.`;
const NEXT_SCHEDULE_INVALID_MESSAGE = '다음 상담일정은 올바른 날짜로 입력하세요.';

export type ConsultationListResult =
  | { status: 'ok'; consultations: ConsultationListItem[] }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'failed' };

export type ConsultationCreateResult =
  | { status: 'ok'; id: string }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'invalid'; fieldErrors: ConsultationCreateFieldErrors }
  | { status: 'not-found' }
  | { status: 'failed' };

type ConsultationInput =
  | { ok: true; content: string; nextContactOn: Date | null }
  | { ok: false; fieldErrors: ConsultationCreateFieldErrors };

function validateConsultation(
  content: string,
  nextContactOn: string | null,
): ConsultationCreateFieldErrors {
  const fieldErrors: ConsultationCreateFieldErrors = {};
  const trimmed = content.trim();
  if (trimmed.length < 1) {
    fieldErrors.content = CONTENT_REQUIRED_MESSAGE;
  } else if (trimmed.length > MAX_CONSULTATION_CONTENT_LENGTH) {
    fieldErrors.content = CONTENT_TOO_LONG_MESSAGE;
  }
  if (nextContactOn !== null && parseContactDate(nextContactOn) === null) {
    fieldErrors.nextContactOn = NEXT_SCHEDULE_INVALID_MESSAGE;
  }
  return fieldErrors;
}

function readConsultationInput(content: string, nextContactOn: string | null): ConsultationInput {
  const fieldErrors = validateConsultation(content, nextContactOn);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  const contactDate = nextContactOn === null ? null : parseContactDate(nextContactOn);
  if (nextContactOn !== null && contactDate === null) {
    return {
      ok: false,
      fieldErrors: { nextContactOn: NEXT_SCHEDULE_INVALID_MESSAGE },
    };
  }
  return { ok: true, content: content.trim(), nextContactOn: contactDate };
}

export async function readConsultations(
  request: Request,
  customerId: string,
): Promise<{ result: ConsultationListResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer) {
      return { result: { status: 'not-found' }, headers };
    }
    const rows = await prisma.consultation.findMany({
      where: { customerId: customer.id },
      select: { id: true, content: true, nextContactOn: true, createdAt: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return {
      result: {
        status: 'ok',
        consultations: rows.map((row) => ({
          id: row.id,
          content: row.content,
          nextContactOn: row.nextContactOn ? formatContactDate(row.nextContactOn) : null,
          createdAt: row.createdAt.toISOString(),
        })),
      },
      headers,
    };
  } catch (error) {
    console.error('상담 이력을 불러오지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

async function syncLatestNextContact(
  tx: Prisma.TransactionClient,
  customerId: string,
): Promise<void> {
  const latest = await tx.consultation.findFirst({
    where: { customerId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { nextContactOn: true },
  });
  if (!latest) {
    return;
  }
  await tx.customer.update({
    where: { id: customerId },
    data: { nextContactOn: latest.nextContactOn },
  });
}

export async function createConsultation(
  request: Request,
  customerId: string,
  content: string,
  nextContactOn: string | null,
): Promise<{ result: ConsultationCreateResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  const input = readConsultationInput(content, nextContactOn);
  if (!input.ok) {
    return { result: { status: 'invalid', fieldErrors: input.fieldErrors }, headers };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer) {
      return { result: { status: 'not-found' }, headers };
    }
    const consultation = await prisma.$transaction(async (tx) => {
      const created = await tx.consultation.create({
        data: {
          customerId: customer.id,
          content: input.content,
          nextContactOn: input.nextContactOn,
        },
        select: { id: true },
      });
      await syncLatestNextContact(tx, customer.id);
      return created;
    });
    return { result: { status: 'ok', id: consultation.id }, headers };
  } catch (error) {
    console.error('상담 이력을 등록하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export type ConsultationUpdateResult =
  | { status: 'ok'; id: string }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'invalid'; fieldErrors: ConsultationCreateFieldErrors }
  | { status: 'not-found' }
  | { status: 'failed' };

export async function updateConsultation(
  request: Request,
  customerId: string,
  consultationId: string,
  content: string,
  nextContactOn: string | null,
): Promise<{ result: ConsultationUpdateResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }
  if (!isUuid(consultationId)) {
    return { result: { status: 'not-found' }, headers };
  }

  const input = readConsultationInput(content, nextContactOn);
  if (!input.ok) {
    return { result: { status: 'invalid', fieldErrors: input.fieldErrors }, headers };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer) {
      return { result: { status: 'not-found' }, headers };
    }
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.consultation.updateMany({
        where: { id: consultationId, customerId: customer.id },
        data: {
          content: input.content,
          nextContactOn: input.nextContactOn,
        },
      });
      if (result.count === 1) {
        await syncLatestNextContact(tx, customer.id);
      }
      return result;
    });
    if (updated.count !== 1) {
      return { result: { status: 'not-found' }, headers };
    }
    return { result: { status: 'ok', id: consultationId }, headers };
  } catch (error) {
    console.error('상담 이력을 수정하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}
