import { resolveSession } from '~/features/auth/api/auth.server';
import {
  CUSTOMER_PAGE_SIZE,
  MAX_CASE_NEXT_TASK_LENGTH,
  MAX_CONSULTATION_CONTENT_LENGTH,
  MAX_REFUND_REASON_LENGTH,
  MAX_CUSTOMER_KEYWORD_LENGTH,
  MAX_CUSTOMER_NAME_LENGTH,
  MAX_CUSTOMER_PHONE_LENGTH,
  MAX_INSTALLMENT_COUNT,
  MAX_RETAIN_AMOUNT,
  MIN_CUSTOMER_PHONE_LENGTH,
  caseProgressStageLabels,
  caseTypeLabels,
  initialCaseNextTask,
  initialCaseProgressStage,
  installmentScheduleLabel,
  isCaseProgressStage,
  isPaymentMethod,
} from '~/features/customers/type';
import { prisma } from '~/lib/db.server';
import { errorCodeLabel, isMissingRecord } from '~/lib/error.server';
import { createSupabaseServerClient } from '~/lib/supabase.server';
import { isUuid } from '~/lib/uuid.server';

import type {
  CaseProgress,
  CaseProgressUpdateFieldErrors,
  CaseProgressUpdateSubmission,
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
  CustomerSummary,
  CustomerSearchField,
  InflowSource,
  InstallmentKind,
  InstallmentListItem,
  InstallmentPaymentFieldErrors,
  InstallmentPromiseFieldErrors,
  InstallmentPromiseSubmission,
  LedgerEntry,
  RefundFieldErrors,
  RefundSource,
  RefundSubmission,
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

function seoulToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
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

type InstallmentDraft = {
  kind: InstallmentKind;
  sequence: number;
  promisedOn: Date;
  scheduledAmount: number;
};

function addUtcMonths(value: Date, months: number): Date {
  const target = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(value.getUTCDate(), lastDay)),
  );
}

function installmentAmounts(retainerFee: number, deposit: number, count: number): number[] {
  const remaining = Math.max(retainerFee - deposit, 0);
  const base = Math.floor(remaining / count);
  const remainder = remaining - base * count;
  return Array.from({ length: count }, (_, index) =>
    index === count - 1 ? base + remainder : base,
  );
}

function buildInstallmentDrafts(input: {
  contractedOn: Date;
  retainerFee: number;
  deposit: number;
  installmentCount: number;
  firstPaymentOn: Date;
}): InstallmentDraft[] {
  const rounds = installmentAmounts(input.retainerFee, input.deposit, input.installmentCount);
  return [
    {
      kind: 'DEPOSIT',
      sequence: 0,
      promisedOn: input.contractedOn,
      scheduledAmount: input.deposit,
    },
    ...rounds.map((scheduledAmount, index) => ({
      kind: 'INSTALLMENT' as const,
      sequence: index + 1,
      promisedOn: addUtcMonths(input.firstPaymentOn, index),
      scheduledAmount,
    })),
  ];
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
      const customerCase = await tx.customerCase.create({
        data: {
          customerId: customer.id,
          contractedOn: input.contractedOn,
          caseType: input.caseType,
          retainerFee: input.retainerFee,
          deposit: input.deposit,
          installmentCount: input.installmentCount,
          firstPaymentOn: input.firstPaymentOn,
          progressStage: initialCaseProgressStage,
          nextTask: initialCaseNextTask,
          taskDueOn: null,
        },
        select: { id: true },
      });
      await tx.customerInstallment.createMany({
        data: buildInstallmentDrafts(input).map((draft) => ({
          customerCaseId: customerCase.id,
          ...draft,
        })),
      });
      await tx.consultation.create({
        data: {
          customerId: customer.id,
          content: `수임전환 - ${caseTypeLabels[input.caseType]}`,
          nextContactOn: null,
          actorId: actor.userId,
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

const installmentSelect = {
  id: true,
  kind: true,
  sequence: true,
  promisedOn: true,
  scheduledAmount: true,
  receivedAmount: true,
} as const;

type InstallmentRow = {
  id: string;
  kind: string;
  sequence: number;
  promisedOn: Date;
  scheduledAmount: number;
  receivedAmount: number;
};

function toInstallmentListItem(row: InstallmentRow): InstallmentListItem | null {
  if (row.kind !== 'DEPOSIT' && row.kind !== 'INSTALLMENT') {
    return null;
  }
  return {
    id: row.id,
    kind: row.kind,
    sequence: row.sequence,
    promisedOn: formatContactDate(row.promisedOn),
    scheduledAmount: row.scheduledAmount,
    receivedAmount: row.receivedAmount,
  };
}

async function readOrCreateInstallments(customerId: string): Promise<InstallmentListItem[] | null> {
  const customerCase = await prisma.customerCase.findUnique({
    where: { customerId },
    select: {
      id: true,
      contractedOn: true,
      retainerFee: true,
      deposit: true,
      installmentCount: true,
      firstPaymentOn: true,
      installments: { orderBy: { sequence: 'asc' }, select: installmentSelect },
    },
  });
  if (!customerCase) {
    return [];
  }
  const stored =
    customerCase.installments.length > 0
      ? customerCase.installments
      : await prisma.$transaction(async (tx) => {
          await tx.customerInstallment.createMany({
            data: buildInstallmentDrafts(customerCase).map((draft) => ({
              customerCaseId: customerCase.id,
              ...draft,
            })),
            skipDuplicates: true,
          });
          return tx.customerInstallment.findMany({
            where: { customerCaseId: customerCase.id },
            orderBy: { sequence: 'asc' },
            select: installmentSelect,
          });
        });
  const installments: InstallmentListItem[] = [];
  for (const row of stored) {
    const item = toInstallmentListItem(row);
    if (!item) {
      return null;
    }
    installments.push(item);
  }
  return installments;
}

export type InstallmentListResult =
  | { status: 'ok'; installments: InstallmentListItem[] }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'failed' };

export async function readInstallments(
  request: Request,
  customerId: string,
): Promise<{ result: InstallmentListResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer) {
      return { result: { status: 'not-found' }, headers };
    }
    const installments = await readOrCreateInstallments(customer.id);
    if (installments === null) {
      return { result: { status: 'failed' }, headers };
    }
    return { result: { status: 'ok', installments }, headers };
  } catch (error) {
    console.error('분납 일정을 불러오지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export type CustomerSummaryResult =
  | { status: 'ok'; summary: CustomerSummary }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'failed' };

function customerSummaryFromInstallments(
  deposit: number,
  retainerFee: number,
  installments: InstallmentListItem[],
  today: string,
): CustomerSummary {
  const netReceived = installments.reduce((sum, row) => sum + row.receivedAmount, 0);
  const overdue = installments.reduce((sum, row) => {
    if (row.promisedOn >= today) {
      return sum;
    }
    return sum + Math.max(row.scheduledAmount - row.receivedAmount, 0);
  }, 0);
  return {
    totalAmount: retainerFee,
    deposit,
    netReceived,
    remainingRetainer: Math.max(retainerFee - netReceived, 0),
    overdue,
  };
}

export async function readCustomerSummary(
  request: Request,
  customerId: string,
): Promise<{ result: CustomerSummaryResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer) {
      return { result: { status: 'not-found' }, headers };
    }
    const customerCase = await prisma.customerCase.findUnique({
      where: { customerId: customer.id },
      select: { deposit: true, retainerFee: true },
    });
    if (!customerCase) {
      return { result: { status: 'not-found' }, headers };
    }
    const installments = await readOrCreateInstallments(customer.id);
    if (installments === null) {
      return { result: { status: 'failed' }, headers };
    }
    return {
      result: {
        status: 'ok',
        summary: customerSummaryFromInstallments(
          customerCase.deposit,
          customerCase.retainerFee,
          installments,
          seoulToday(),
        ),
      },
      headers,
    };
  } catch (error) {
    console.error('수임 요약을 불러오지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export type CaseProgressResult =
  | { status: 'ok'; progress: CaseProgress }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'failed' };

export async function readCaseProgress(
  request: Request,
  customerId: string,
): Promise<{ result: CaseProgressResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer) {
      return { result: { status: 'not-found' }, headers };
    }
    const customerCase = await prisma.customerCase.findUnique({
      where: { customerId: customer.id },
      select: { progressStage: true, nextTask: true, taskDueOn: true },
    });
    if (!customerCase) {
      return { result: { status: 'not-found' }, headers };
    }
    return {
      result: {
        status: 'ok',
        progress: {
          stage: customerCase.progressStage,
          nextTask: customerCase.nextTask,
          taskDueOn: customerCase.taskDueOn ? formatContactDate(customerCase.taskDueOn) : null,
        },
      },
      headers,
    };
  } catch (error) {
    console.error('사건 진행을 불러오지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

const CASE_STAGE_REQUIRED_MESSAGE = '진행단계를 선택하세요.';
const CASE_TASK_REQUIRED_MESSAGE = '다음 할 일 또는 처리결과를 입력하세요.';
const CASE_DUE_INVALID_MESSAGE = '업무 기한은 올바른 날짜로 입력하세요.';

export type CaseProgressUpdateResult =
  | { status: 'ok'; id: string }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'invalid'; fieldErrors: CaseProgressUpdateFieldErrors }
  | { status: 'not-found' }
  | { status: 'failed' };

function caseProgressChangeContent(from: string, to: string, nextTask: string): string {
  return `${from} -> ${to} / ${nextTask}`;
}

export async function updateCaseProgress(
  request: Request,
  customerId: string,
  submission: CaseProgressUpdateSubmission,
): Promise<{ result: CaseProgressUpdateResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  const fieldErrors: CaseProgressUpdateFieldErrors = {};
  const stage = isCaseProgressStage(submission.stage) ? submission.stage : null;
  if (stage === null) {
    fieldErrors.stage = CASE_STAGE_REQUIRED_MESSAGE;
  }
  const nextTask = submission.nextTask.trim();
  if (nextTask.length < 1) {
    fieldErrors.nextTask = CASE_TASK_REQUIRED_MESSAGE;
  } else if (nextTask.length > MAX_CASE_NEXT_TASK_LENGTH) {
    fieldErrors.nextTask = `다음 할 일 또는 처리결과는 ${MAX_CASE_NEXT_TASK_LENGTH}자 이하여야 합니다.`;
  }
  const taskDueOn = submission.taskDueOn;
  const taskDueDate = taskDueOn === null ? null : parseContactDate(taskDueOn);
  if (taskDueOn !== null && taskDueOn.trim().length < 1) {
    fieldErrors.taskDueOn = CASE_DUE_INVALID_MESSAGE;
  } else if (taskDueOn !== null && taskDueDate === null) {
    fieldErrors.taskDueOn = CASE_DUE_INVALID_MESSAGE;
  }
  if (Object.keys(fieldErrors).length > 0 || stage === null) {
    return { result: { status: 'invalid', fieldErrors }, headers };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer) {
      return { result: { status: 'not-found' }, headers };
    }
    const outcome = await prisma.$transaction(async (tx) => {
      const customerCase = await tx.customerCase.findUnique({
        where: { customerId: customer.id },
        select: { id: true, progressStage: true },
      });
      if (!customerCase) {
        return { status: 'not-found' } as const;
      }
      const content = caseProgressChangeContent(
        caseProgressStageLabels[customerCase.progressStage],
        caseProgressStageLabels[stage],
        nextTask,
      );
      await tx.customerCase.update({
        where: { id: customerCase.id },
        data: { progressStage: stage, nextTask, taskDueOn: taskDueDate },
      });
      await tx.consultation.create({
        data: {
          customerId: customer.id,
          content,
          nextContactOn: null,
          actorId: actor.userId,
        },
      });
      await syncLatestNextContact(tx, customer.id);
      return { status: 'ok', id: customerCase.id } as const;
    });
    if (outcome.status === 'not-found') {
      return { result: { status: 'not-found' }, headers };
    }
    return { result: { status: 'ok', id: outcome.id }, headers };
  } catch (error) {
    console.error('사건 진행을 변경하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export type LedgerListResult =
  | { status: 'ok'; entries: LedgerEntry[]; refundSources: RefundSource[] }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'failed' };

function refundableAmount(paymentAmount: number, refundedAmount: number, receivedAmount: number): number {
  return Math.max(Math.min(paymentAmount - refundedAmount, receivedAmount), 0);
}

export async function readLedger(
  request: Request,
  customerId: string,
): Promise<{ result: LedgerListResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer) {
      return { result: { status: 'not-found' }, headers };
    }
    const payments = await prisma.installmentPayment.findMany({
      where: { installment: { customerCase: { customerId: customer.id } } },
      select: {
        id: true,
        amount: true,
        paidOn: true,
        method: true,
        createdAt: true,
        installment: { select: { receivedAmount: true } },
        refunds: { select: { id: true, amount: true, refundedOn: true, reason: true, createdAt: true } },
      },
    });
    const entries: (LedgerEntry & { createdAt: Date })[] = [];
    const refundSources: RefundSource[] = [];
    for (const payment of payments) {
      const refunded = payment.refunds.reduce((sum, refund) => sum + refund.amount, 0);
      entries.push({
        id: payment.id,
        transactedOn: formatContactDate(payment.paidOn),
        kind: 'PAYMENT',
        amount: payment.amount,
        method: payment.method,
        reason: null,
        createdAt: payment.createdAt,
      });
      for (const refund of payment.refunds) {
        entries.push({
          id: refund.id,
          transactedOn: formatContactDate(refund.refundedOn),
          kind: 'REFUND',
          amount: refund.amount,
          method: payment.method,
          reason: refund.reason,
          createdAt: refund.createdAt,
        });
      }
      const available = refundableAmount(
        payment.amount,
        refunded,
        payment.installment.receivedAmount,
      );
      if (available > 0) {
        refundSources.push({
          id: payment.id,
          paidOn: formatContactDate(payment.paidOn),
          refundableAmount: available,
        });
      }
    }
    entries.sort((left, right) => {
      const byDate = right.transactedOn.localeCompare(left.transactedOn);
      if (byDate !== 0) {
        return byDate;
      }
      const byCreated = right.createdAt.getTime() - left.createdAt.getTime();
      if (byCreated !== 0) {
        return byCreated;
      }
      return right.id.localeCompare(left.id);
    });
    refundSources.sort((left, right) => {
      const byDate = right.paidOn.localeCompare(left.paidOn);
      if (byDate !== 0) {
        return byDate;
      }
      return right.id.localeCompare(left.id);
    });
    return {
      result: {
        status: 'ok',
        entries: entries.map((entry) => ({
          id: entry.id,
          transactedOn: entry.transactedOn,
          kind: entry.kind,
          amount: entry.amount,
          method: entry.method,
          reason: entry.reason,
        })),
        refundSources,
      },
      headers,
    };
  } catch (error) {
    console.error('거래 원장을 불러오지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

const PROMISE_REQUIRED_MESSAGE = '약속일을 선택하세요.';
const PROMISE_INVALID_MESSAGE = '약속일은 올바른 날짜로 입력하세요.';
const PROMISE_UNCHANGED_MESSAGE = '현재 약속일과 다른 날짜를 선택하세요.';
const REASON_REQUIRED_MESSAGE = '변경 사유를 입력하세요.';

export type InstallmentPromiseResult =
  | { status: 'ok'; id: string }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'invalid'; fieldErrors: InstallmentPromiseFieldErrors }
  | { status: 'paid' }
  | { status: 'not-found' }
  | { status: 'failed' };

function promiseChangeContent(label: string, from: string, to: string, reason: string): string {
  return `${label} 납기 ${from} -> ${to} / ${reason}`;
}

function readPromiseChange(
  promisedOn: string,
  reason: string,
): { promisedDate: Date | null; reason: string; fieldErrors: InstallmentPromiseFieldErrors } {
  const fieldErrors: InstallmentPromiseFieldErrors = {};
  const trimmedReason = reason.trim();
  const promisedDate = parseContactDate(promisedOn);
  if (promisedOn.trim().length < 1) {
    fieldErrors.promisedOn = PROMISE_REQUIRED_MESSAGE;
  } else if (promisedDate === null) {
    fieldErrors.promisedOn = PROMISE_INVALID_MESSAGE;
  }
  if (trimmedReason.length < 1) {
    fieldErrors.reason = REASON_REQUIRED_MESSAGE;
  } else if (trimmedReason.length > MAX_CONSULTATION_CONTENT_LENGTH) {
    fieldErrors.reason = `변경 사유는 ${MAX_CONSULTATION_CONTENT_LENGTH}자 이하여야 합니다.`;
  }
  return { promisedDate, reason: trimmedReason, fieldErrors };
}

export async function updateInstallmentPromise(
  request: Request,
  customerId: string,
  installmentId: string,
  submission: InstallmentPromiseSubmission,
): Promise<{ result: InstallmentPromiseResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }
  const input = readPromiseChange(submission.promisedOn, submission.reason);
  if (Object.keys(input.fieldErrors).length > 0 || input.promisedDate === null) {
    return { result: { status: 'invalid', fieldErrors: input.fieldErrors }, headers };
  }
  const promisedDate = input.promisedDate;

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer || !isUuid(installmentId)) {
      return { result: { status: 'not-found' }, headers };
    }
    const installment = await prisma.customerInstallment.findFirst({
      where: { id: installmentId, customerCase: { customerId: customer.id } },
      select: {
        id: true,
        kind: true,
        sequence: true,
        promisedOn: true,
        scheduledAmount: true,
        receivedAmount: true,
      },
    });
    if (!installment) {
      return { result: { status: 'not-found' }, headers };
    }
    if (installment.receivedAmount >= installment.scheduledAmount) {
      return { result: { status: 'paid' }, headers };
    }
    const from = formatContactDate(installment.promisedOn);
    const to = formatContactDate(promisedDate);
    const fieldErrors: InstallmentPromiseFieldErrors = {};
    if (from === to) {
      fieldErrors.promisedOn = PROMISE_UNCHANGED_MESSAGE;
    }
    const content = promiseChangeContent(
      installmentScheduleLabel(installment),
      from,
      to,
      input.reason,
    );
    if (content.length > MAX_CONSULTATION_CONTENT_LENGTH) {
      fieldErrors.reason = `변경 사유는 ${MAX_CONSULTATION_CONTENT_LENGTH - (content.length - input.reason.length)}자 이하여야 합니다.`;
    }
    if (Object.keys(fieldErrors).length > 0) {
      return { result: { status: 'invalid', fieldErrors }, headers };
    }

    const outcome = await prisma.$transaction(async (tx) => {
      const updated = await tx.customerInstallment.updateMany({
        where: {
          id: installment.id,
          promisedOn: installment.promisedOn,
          receivedAmount: { lt: installment.scheduledAmount },
        },
        data: { promisedOn: promisedDate },
      });
      if (updated.count !== 1) {
        const current = await tx.customerInstallment.findFirst({
          where: { id: installment.id, customerCase: { customerId: customer.id } },
          select: { receivedAmount: true, scheduledAmount: true },
        });
        if (current && current.receivedAmount >= current.scheduledAmount) {
          return 'paid' as const;
        }
        return 'not-found' as const;
      }
      await tx.consultation.create({
        data: {
          customerId: customer.id,
          content,
          nextContactOn: null,
          actorId: actor.userId,
        },
      });
      await syncLatestNextContact(tx, customer.id);
      return 'ok' as const;
    });
    if (outcome === 'paid') {
      return { result: { status: 'paid' }, headers };
    }
    if (outcome === 'not-found') {
      return { result: { status: 'not-found' }, headers };
    }
    return { result: { status: 'ok', id: installmentId }, headers };
  } catch (error) {
    console.error('약속일을 변경하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

const PAYMENT_AMOUNT_REQUIRED_MESSAGE = '입금액을 입력하세요.';
const PAYMENT_AMOUNT_INVALID_MESSAGE = '입금액은 1원 이상 20억 원 이하의 정수로 입력하세요.';
const PAYMENT_AMOUNT_EXCEEDS_MESSAGE = '미납액보다 큰 금액은 등록할 수 없습니다.';
const PAYMENT_DATE_REQUIRED_MESSAGE = '입금일을 선택하세요.';
const PAYMENT_DATE_INVALID_MESSAGE = '입금일은 올바른 날짜로 입력하세요.';
const PAYMENT_TARGET_REQUIRED_MESSAGE = '회차를 선택하세요.';
const PAYMENT_METHOD_REQUIRED_MESSAGE = '수단을 선택하세요.';

export type InstallmentPaymentResult =
  | { status: 'ok'; id: string }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'invalid'; fieldErrors: InstallmentPaymentFieldErrors }
  | { status: 'paid' }
  | { status: 'not-found' }
  | { status: 'failed' };

function readPaymentAmount(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > MAX_RETAIN_AMOUNT) {
    return null;
  }
  return amount;
}

export async function createInstallmentPayment(
  request: Request,
  customerId: string,
  installmentId: string,
  amountText: string,
  paidOn: string,
  method: string,
): Promise<{ result: InstallmentPaymentResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  const fieldErrors: InstallmentPaymentFieldErrors = {};
  const amount = readPaymentAmount(amountText.trim());
  if (amountText.trim().length < 1) {
    fieldErrors.amount = PAYMENT_AMOUNT_REQUIRED_MESSAGE;
  } else if (amount === null) {
    fieldErrors.amount = PAYMENT_AMOUNT_INVALID_MESSAGE;
  }
  const paidDate = parseContactDate(paidOn);
  if (paidOn.trim().length < 1) {
    fieldErrors.paidOn = PAYMENT_DATE_REQUIRED_MESSAGE;
  } else if (paidDate === null) {
    fieldErrors.paidOn = PAYMENT_DATE_INVALID_MESSAGE;
  }
  if (installmentId.trim().length < 1 || !isUuid(installmentId)) {
    fieldErrors.installmentId = PAYMENT_TARGET_REQUIRED_MESSAGE;
  }
  if (!isPaymentMethod(method)) {
    fieldErrors.method = PAYMENT_METHOD_REQUIRED_MESSAGE;
  }
  if (
    Object.keys(fieldErrors).length > 0 ||
    amount === null ||
    paidDate === null ||
    !isPaymentMethod(method)
  ) {
    return { result: { status: 'invalid', fieldErrors }, headers };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer) {
      return { result: { status: 'not-found' }, headers };
    }
    const outcome = await prisma.$transaction(async (tx) => {
      const installment = await tx.customerInstallment.findFirst({
        where: { id: installmentId, customerCase: { customerId: customer.id } },
        select: { id: true, scheduledAmount: true, receivedAmount: true },
      });
      if (!installment) {
        return { status: 'not-found' } as const;
      }
      const remaining = installment.scheduledAmount - installment.receivedAmount;
      if (remaining <= 0) {
        return { status: 'paid' } as const;
      }
      if (amount > remaining) {
        return { status: 'exceeds' } as const;
      }
      const updated = await tx.customerInstallment.updateMany({
        where: {
          id: installment.id,
          receivedAmount: { lte: installment.scheduledAmount - amount },
        },
        data: { receivedAmount: { increment: amount } },
      });
      if (updated.count !== 1) {
        return { status: 'paid' } as const;
      }
      const payment = await tx.installmentPayment.create({
        data: {
          installmentId: installment.id,
          amount,
          paidOn: paidDate,
          method,
          actorId: actor.userId,
        },
        select: { id: true },
      });
      return { status: 'ok', id: payment.id } as const;
    });
    if (outcome.status === 'exceeds') {
      return {
        result: {
          status: 'invalid',
          fieldErrors: { amount: PAYMENT_AMOUNT_EXCEEDS_MESSAGE },
        },
        headers,
      };
    }
    if (outcome.status === 'paid') {
      return { result: { status: 'paid' }, headers };
    }
    if (outcome.status === 'not-found') {
      return { result: { status: 'not-found' }, headers };
    }
    return { result: { status: 'ok', id: outcome.id }, headers };
  } catch (error) {
    console.error('입금을 등록하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

const REFUND_AMOUNT_REQUIRED_MESSAGE = '환불금액을 입력하세요.';
const REFUND_AMOUNT_INVALID_MESSAGE = '환불금액은 1원 이상 20억 원 이하의 정수로 입력하세요.';
const REFUND_AMOUNT_EXCEEDS_MESSAGE = '환불가능금액보다 큰 금액은 등록할 수 없습니다.';
const REFUND_DATE_REQUIRED_MESSAGE = '환불일을 선택하세요.';
const REFUND_DATE_INVALID_MESSAGE = '환불일은 올바른 날짜로 입력하세요.';
const REFUND_TARGET_REQUIRED_MESSAGE = '원입금을 선택하세요.';
const REFUND_REASON_REQUIRED_MESSAGE = '환불 사유를 입력하세요.';
const refundWonFormat = new Intl.NumberFormat('ko-KR');

function refundConsultationContent(amount: number, reason: string): string {
  return `환불 ${refundWonFormat.format(amount)}원 · ${reason}`;
}

class RefundLimitError extends Error {
  constructor() {
    super('환불 한도를 넘었습니다.');
    this.name = 'RefundLimitError';
  }
}

export type InstallmentRefundResult =
  | { status: 'ok'; id: string }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'invalid'; fieldErrors: RefundFieldErrors }
  | { status: 'exhausted' }
  | { status: 'not-found' }
  | { status: 'failed' };

export async function createInstallmentRefund(
  request: Request,
  customerId: string,
  submission: RefundSubmission,
): Promise<{ result: InstallmentRefundResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  const fieldErrors: RefundFieldErrors = {};
  const amount = readPaymentAmount(submission.amount.trim());
  if (submission.amount.trim().length < 1) {
    fieldErrors.amount = REFUND_AMOUNT_REQUIRED_MESSAGE;
  } else if (amount === null) {
    fieldErrors.amount = REFUND_AMOUNT_INVALID_MESSAGE;
  }
  const refundedDate = parseContactDate(submission.refundedOn);
  if (submission.refundedOn.trim().length < 1) {
    fieldErrors.refundedOn = REFUND_DATE_REQUIRED_MESSAGE;
  } else if (refundedDate === null) {
    fieldErrors.refundedOn = REFUND_DATE_INVALID_MESSAGE;
  }
  if (submission.paymentId.trim().length < 1 || !isUuid(submission.paymentId)) {
    fieldErrors.paymentId = REFUND_TARGET_REQUIRED_MESSAGE;
  }
  const reason = submission.reason.trim();
  if (reason.length < 1) {
    fieldErrors.reason = REFUND_REASON_REQUIRED_MESSAGE;
  } else if (reason.length > MAX_REFUND_REASON_LENGTH) {
    fieldErrors.reason = `환불 사유는 ${MAX_REFUND_REASON_LENGTH}자 이하여야 합니다.`;
  }
  if (Object.keys(fieldErrors).length > 0 || amount === null || refundedDate === null) {
    return { result: { status: 'invalid', fieldErrors }, headers };
  }
  const content = refundConsultationContent(amount, reason);
  if (content.length > MAX_CONSULTATION_CONTENT_LENGTH) {
    const prefixLength = content.length - reason.length;
    return {
      result: {
        status: 'invalid',
        fieldErrors: {
          reason: `환불 사유는 ${MAX_CONSULTATION_CONTENT_LENGTH - prefixLength}자 이하여야 합니다.`,
        },
      },
      headers,
    };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer) {
      return { result: { status: 'not-found' }, headers };
    }
    const refundId = await prisma.$transaction(async (tx) => {
      const payment = await tx.installmentPayment.findFirst({
        where: { id: submission.paymentId, installment: { customerCase: { customerId: customer.id } } },
        select: {
          id: true,
          amount: true,
          installment: { select: { id: true, receivedAmount: true } },
          refunds: { select: { amount: true } },
        },
      });
      if (!payment) {
        return { status: 'not-found' } as const;
      }
      const refunded = payment.refunds.reduce((sum, refund) => sum + refund.amount, 0);
      const available = refundableAmount(
        payment.amount,
        refunded,
        payment.installment.receivedAmount,
      );
      if (available <= 0) {
        return { status: 'exhausted' } as const;
      }
      if (amount > available) {
        return { status: 'exceeds' } as const;
      }
      const updated = await tx.customerInstallment.updateMany({
        where: { id: payment.installment.id, receivedAmount: { gte: amount } },
        data: { receivedAmount: { decrement: amount } },
      });
      if (updated.count !== 1) {
        return { status: 'exhausted' } as const;
      }
      const refund = await tx.installmentRefund.create({
        data: {
          paymentId: payment.id,
          amount,
          refundedOn: refundedDate,
          reason,
          actorId: actor.userId,
        },
        select: { id: true },
      });
      const totals = await tx.installmentRefund.aggregate({
        where: { paymentId: payment.id },
        _sum: { amount: true },
      });
      if ((totals._sum.amount ?? 0) > payment.amount) {
        throw new RefundLimitError();
      }
      await tx.consultation.create({
        data: {
          customerId: customer.id,
          content,
          nextContactOn: null,
          actorId: actor.userId,
        },
      });
      await syncLatestNextContact(tx, customer.id);
      return { status: 'ok', id: refund.id } as const;
    });
    if (refundId.status === 'exceeds') {
      return {
        result: { status: 'invalid', fieldErrors: { amount: REFUND_AMOUNT_EXCEEDS_MESSAGE } },
        headers,
      };
    }
    if (refundId.status === 'exhausted') {
      return { result: { status: 'exhausted' }, headers };
    }
    if (refundId.status === 'not-found') {
      return { result: { status: 'not-found' }, headers };
    }
    return { result: { status: 'ok', id: refundId.id }, headers };
  } catch (error) {
    if (error instanceof RefundLimitError) {
      return { result: { status: 'exhausted' }, headers };
    }
    console.error('환불을 등록하지 못했습니다.', errorCodeLabel(error));
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
          actorId: actor.userId,
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
          updatedById: actor.userId,
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
