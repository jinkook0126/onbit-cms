import { DEFAULT_STATUS_CODE, RETAINED_STATUS_CODE } from '~/features/catalog/defaults';
import {
  catalogOptionRefSelect,
  findCompanyOption,
  findCompanyStatusByCode,
  toOptionRef,
} from '~/features/customers/api/customerCatalog.server';
import { syncLatestNextContact } from '~/features/customers/api/customerConsultations.server';
import { formatContactDate, parseContactDate } from '~/features/customers/api/customerDates.server';
import { readTakenCustomerKeys } from '~/features/customers/api/customerIdentity.server';
import {
  buildInstallmentDrafts,
  readCustomerInstallments,
} from '~/features/customers/api/customerInstallments.server';
import {
  customerVisibilityWhere,
  readAccessibleCustomer,
  resolveCustomerActor,
} from '~/features/customers/api/customerScope.server';
import {
  CUSTOMER_PAGE_SIZE,
  MAX_CUSTOMER_ASSIGNEE_BATCH,
  MAX_CUSTOMER_KEYWORD_LENGTH,
  MAX_CUSTOMER_NAME_LENGTH,
  MAX_CUSTOMER_PHONE_LENGTH,
  MAX_INSTALLMENT_COUNT,
  MAX_RETAIN_AMOUNT,
  MIN_CUSTOMER_PHONE_LENGTH,
  isRetainedStatus,
} from '~/features/customers/type';
import { prisma } from '~/lib/db.server';
import { errorCodeLabel, isMissingRecord, isUniqueConflict } from '~/lib/error.server';
import { isUuid } from '~/lib/uuid.server';

import type { CatalogOptionRef } from '~/features/catalog/type';
import type {
  AccessibleCustomer,
  CustomerActor,
} from '~/features/customers/api/customerScope.server';
import type {
  CustomerAssigneeOption,
  CustomerDetail,
  CustomerProfileFieldErrors,
  CustomerProfileSubmission,
  CustomerListItem,
  CustomerRetainFieldErrors,
  CustomerRetainSubmission,
  CustomerListView,
  CustomerSearchField,
  CustomerSortDirection,
  CustomerSortField,
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

export type CustomerListQuery = {
  field: CustomerSearchField;
  keyword: string;
  statusId: string | null;
  sourceId: string | null;
  from: string;
  to: string;
  sortField: CustomerSortField;
  sortDirection: CustomerSortDirection;
  view: CustomerListView;
  page: number;
};

function seoulDayStart(dateText: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const start = new Date(Date.UTC(year, month - 1, day, -9));
  if (seoulCalendarDay(start) !== dateText) {
    return null;
  }
  return start;
}

function registeredOnFilter(from: string, to: string): Prisma.DateTimeFilter | undefined {
  const gte = from === '' ? null : seoulDayStart(from);
  const endDay = to === '' ? null : seoulDayStart(to);
  if (gte === null && endDay === null) {
    return undefined;
  }
  const end = endDay === null ? null : new Date(endDay.getTime() + 24 * 60 * 60 * 1000);
  return {
    ...(gte === null ? {} : { gte }),
    ...(end === null ? {} : { lt: end }),
  };
}

function keywordWhere(field: CustomerSearchField, keyword: string): Prisma.CustomerWhereInput {
  if (field === 'name') {
    return { name: { contains: keyword, mode: 'insensitive' } };
  }
  if (field === 'phone') {
    return { phone: { contains: keyword.replace(/\D/g, '') || keyword } };
  }
  return {
    assignee: {
      is: { name: { contains: keyword, mode: 'insensitive' } },
    },
  };
}

function toCustomerListItem(customer: {
  id: string;
  name: string;
  phone: string;
  source: CatalogOptionRef;
  status: CatalogOptionRef;
  caseType: CatalogOptionRef | null;
  createdAt: Date;
  nextContactOn: Date | null;
  firstProcessedOn: Date | null;
  assignee: { name: string } | null;
  customerCase: { caseType: CatalogOptionRef; contractedOn: Date } | null;
  consultations: { content: string; nextContactOn: Date | null }[];
  favorites: { userId: string }[];
}): CustomerListItem {
  const latestConsultation = customer.consultations.at(0);
  const nextContactOn = latestConsultation
    ? latestConsultation.nextContactOn
    : customer.nextContactOn;
  const caseType = customer.customerCase?.caseType ?? customer.caseType;
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    source: toOptionRef(customer.source),
    status: toOptionRef(customer.status),
    assigneeName: customer.assignee?.name ?? null,
    caseType: caseType ? toOptionRef(caseType) : null,
    registeredOn: seoulCalendarDay(customer.createdAt),
    nextContactOn: nextContactOn ? formatContactDate(nextContactOn) : null,
    firstProcessedOn: customer.firstProcessedOn
      ? formatContactDate(customer.firstProcessedOn)
      : null,
    contractedOn: customer.customerCase
      ? formatContactDate(customer.customerCase.contractedOn)
      : null,
    latestConsultation: latestConsultation ? latestConsultation.content : null,
    favorited: customer.favorites.length > 0,
  };
}

type CustomerSortKey = {
  id: string;
  createdAt: Date;
  customerCase: { contractedOn: Date } | null;
};

function compareTimestamp(left: Date, right: Date, direction: CustomerSortDirection): number {
  const delta = left.getTime() - right.getTime();
  if (delta === 0) {
    return 0;
  }
  return direction === 'asc' ? delta : -delta;
}

function compareOptionalDate(
  left: Date | null,
  right: Date | null,
  direction: CustomerSortDirection,
): number {
  if (left === null && right === null) {
    return 0;
  }
  if (left === null) {
    return 1;
  }
  if (right === null) {
    return -1;
  }
  return compareTimestamp(left, right, direction);
}

function compareCustomerSortKeys(
  left: CustomerSortKey,
  right: CustomerSortKey,
  field: CustomerSortField,
  direction: CustomerSortDirection,
): number {
  const registered = compareTimestamp(left.createdAt, right.createdAt, direction);
  const contractedDirection = field === 'contracted' ? direction : 'desc';
  const contracted = compareOptionalDate(
    left.customerCase?.contractedOn ?? null,
    right.customerCase?.contractedOn ?? null,
    contractedDirection,
  );
  if (field === 'contracted') {
    if (contracted !== 0) {
      return contracted;
    }
    const registeredNewest = compareTimestamp(left.createdAt, right.createdAt, 'desc');
    if (registeredNewest !== 0) {
      return registeredNewest;
    }
  } else if (registered !== 0) {
    return registered;
  } else if (contracted !== 0) {
    return contracted;
  }
  return left.id.localeCompare(right.id);
}

const customerListSelect = {
  id: true,
  name: true,
  phone: true,
  source: { select: catalogOptionRefSelect },
  status: { select: catalogOptionRefSelect },
  caseType: { select: catalogOptionRefSelect },
  createdAt: true,
  nextContactOn: true,
  firstProcessedOn: true,
  assignee: { select: { name: true } },
  customerCase: { select: { caseType: { select: catalogOptionRefSelect }, contractedOn: true } },
  consultations: {
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 1,
    select: { content: true, nextContactOn: true },
  },
} satisfies Prisma.CustomerSelect;

function customerListSelectFor(userId: string) {
  return {
    ...customerListSelect,
    favorites: {
      where: { userId },
      select: { userId: true },
      take: 1,
    },
  } satisfies Prisma.CustomerSelect;
}

async function readScopedCustomers(
  visibility: Prisma.CustomerWhereInput,
  query: CustomerListQuery,
  userId: string,
): Promise<{ customers: CustomerListItem[]; total: number }> {
  const keyword = query.keyword.trim().slice(0, MAX_CUSTOMER_KEYWORD_LENGTH);
  const createdAt = registeredOnFilter(query.from, query.to);
  const where: Prisma.CustomerWhereInput = {
    ...visibility,
    ...(query.statusId ? { statusId: query.statusId } : {}),
    ...(query.sourceId ? { sourceId: query.sourceId } : {}),
    ...(createdAt === undefined ? {} : { createdAt }),
    ...(keyword ? keywordWhere(query.field, keyword) : {}),
    ...(query.view === 'favorites' ? { favorites: { some: { userId } } } : {}),
  };
  const keys = await prisma.customer.findMany({
    where,
    select: {
      id: true,
      createdAt: true,
      customerCase: { select: { contractedOn: true } },
    },
  });
  const orderedIds = keys
    .slice()
    .sort((left, right) =>
      compareCustomerSortKeys(left, right, query.sortField, query.sortDirection),
    )
    .map((key) => key.id);
  const start = (query.page - 1) * CUSTOMER_PAGE_SIZE;
  const pageIds = orderedIds.slice(start, start + CUSTOMER_PAGE_SIZE);
  const rows =
    pageIds.length === 0
      ? []
      : await prisma.customer.findMany({
          where: { id: { in: pageIds } },
          select: customerListSelectFor(userId),
        });
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  const orderedRows = [];
  for (const id of pageIds) {
    const row = rowsById.get(id);
    if (row) {
      orderedRows.push(row);
    }
  }
  const total = orderedIds.length;
  const customers = orderedRows.map(toCustomerListItem);
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
    const scoped = await readScopedCustomers(visibility, query, actor.userId);
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

export type CustomerFavoriteResult =
  | { status: 'ok'; favorited: boolean }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'failed' };

export async function setCustomerFavorite(
  request: Request,
  customerId: string,
  favorited: boolean,
): Promise<{ result: CustomerFavoriteResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }
  if (!isUuid(customerId)) {
    return { result: { status: 'not-found' }, headers };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer) {
      return { result: { status: 'not-found' }, headers };
    }
    if (favorited) {
      await prisma.customerFavorite.upsert({
        where: { userId_customerId: { userId: actor.userId, customerId } },
        create: { userId: actor.userId, customerId },
        update: {},
      });
    } else {
      await prisma.customerFavorite.deleteMany({
        where: { userId: actor.userId, customerId },
      });
    }
    return { result: { status: 'ok', favorited }, headers };
  } catch (error) {
    console.error('상담 고객 즐겨찾기를 바꾸지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export type CustomerAssigneeResult =
  | { status: 'ok'; currentUserId: string; assignees: CustomerAssigneeOption[] }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'failed' };

export type CustomerProfileResult =
  | { status: 'ok'; id: string }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'invalid'; fieldErrors: CustomerProfileFieldErrors }
  | { status: 'duplicate' }
  | { status: 'failed' };

const NAME_REQUIRED_MESSAGE = '고객명을 입력하세요.';
const NAME_TOO_LONG_MESSAGE = `고객명은 ${MAX_CUSTOMER_NAME_LENGTH}자 이하여야 합니다.`;
const PHONE_REQUIRED_MESSAGE = '연락처를 입력하세요.';
const PHONE_INVALID_MESSAGE = `연락처는 숫자 ${MIN_CUSTOMER_PHONE_LENGTH}자 이상 ${MAX_CUSTOMER_PHONE_LENGTH}자 이하로 입력하세요.`;
const SOURCE_REQUIRED_MESSAGE = '유입처를 선택하세요.';
const ASSIGNEE_REQUIRED_MESSAGE = '담당을 선택하세요.';
const ASSIGNEE_INVALID_MESSAGE = '담당을 다시 선택하세요.';
const FIRST_PROCESSED_INVALID_MESSAGE = 'DB 최초 처리일을 다시 선택하세요.';
const PROFILE_STATUS_INVALID_MESSAGE = '상담 상태를 선택하세요.';
const PROFILE_STATUS_LOCKED_MESSAGE = '수임 상태는 바꿀 수 없습니다.';
const PROFILE_CASE_TYPE_REQUIRED_MESSAGE = '사건 유형을 선택하세요.';
const PROFILE_CONTRACTED_ON_REQUIRED_MESSAGE = '수임날짜를 선택하세요.';
const PROFILE_CONTRACTED_ON_INVALID_MESSAGE = '수임날짜를 다시 선택하세요.';
const PROFILE_RETAINER_FEE_REQUIRED_MESSAGE = '총 수임료를 입력하세요.';
const PROFILE_RETAINER_FEE_INVALID_MESSAGE = '총 수임료는 0 이상 20억 원 이하의 정수로 입력하세요.';

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

const assigneeBatchNotFound = 'AssigneeBatchNotFound';

export type CustomerAssigneeBatchResult =
  | { status: 'ok'; updatedCount: number }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'invalid' }
  | { status: 'bad-request' }
  | { status: 'not-found' }
  | { status: 'failed' };

function isAssigneeBatchNotFound(error: unknown): boolean {
  return error instanceof Error && error.name === assigneeBatchNotFound;
}

function assigneeBatchNotFoundError(): Error {
  const error = new Error('선택한 고객을 찾지 못했습니다.');
  error.name = assigneeBatchNotFound;
  return error;
}

export async function assignCustomerAssignees(
  request: Request,
  customerIds: string[],
  assigneeId: string,
): Promise<{ result: CustomerAssigneeBatchResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  const ids = [...new Set(customerIds)];
  if (
    ids.length < 1 ||
    ids.length > MAX_CUSTOMER_ASSIGNEE_BATCH ||
    ids.some((customerId) => !isUuid(customerId)) ||
    !isUuid(assigneeId)
  ) {
    return { result: { status: 'bad-request' }, headers };
  }

  try {
    const assignees = await readAssigneeOptions(actor);
    if (!assignees.some((assignee) => assignee.id === assigneeId)) {
      return { result: { status: 'invalid' }, headers };
    }

    const visibility = await customerVisibilityWhere(actor);
    const updatedCount = await prisma.$transaction(async (tx) => {
      const found = await tx.customer.findMany({
        where: { id: { in: ids }, ...visibility },
        select: { id: true },
      });
      if (found.length !== ids.length) {
        throw assigneeBatchNotFoundError();
      }
      const updated = await tx.customer.updateMany({
        where: { id: { in: ids }, ...visibility },
        data: { assigneeId },
      });
      if (updated.count !== ids.length) {
        throw assigneeBatchNotFoundError();
      }
      return updated.count;
    });
    return { result: { status: 'ok', updatedCount }, headers };
  } catch (error) {
    if (isAssigneeBatchNotFound(error)) {
      return { result: { status: 'not-found' }, headers };
    }
    console.error('상담 고객 담당을 등록하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

type ProfileDraft =
  | { ok: false; fieldErrors: CustomerProfileFieldErrors }
  | {
      ok: true;
      name: string;
      phone: string;
      source: CatalogOptionRef;
      assigneeId: string;
      status: CatalogOptionRef;
      caseType: CatalogOptionRef | null;
      firstProcessedOn: Date | null;
      contractedOn: Date | null;
      retainerFee: number | null;
    };

/** 수정 중인 고객에 이미 지정된 옵션. 비활성이어도 그대로 둘 수 있다. */
type ProfileCurrent = {
  sourceId: string;
  status: CatalogOptionRef;
  caseTypeIds: (string | null)[];
};

async function readProfileStatus(
  companyId: string,
  statusId: string,
  current: ProfileCurrent | null,
): Promise<CatalogOptionRef | null> {
  if (current === null && statusId.trim().length < 1) {
    return findCompanyStatusByCode(companyId, DEFAULT_STATUS_CODE);
  }
  return findCompanyOption('status', companyId, statusId, [current?.status.id ?? null]);
}

async function readProfileDraft(
  companyId: string,
  submission: CustomerProfileSubmission,
  current: ProfileCurrent | null,
): Promise<ProfileDraft> {
  const fieldErrors: CustomerProfileFieldErrors = {};
  const name = submission.name.trim();
  const phone = submission.phone.trim();

  if (name.length < 1) {
    fieldErrors.name = NAME_REQUIRED_MESSAGE;
  } else if (name.length > MAX_CUSTOMER_NAME_LENGTH) {
    fieldErrors.name = NAME_TOO_LONG_MESSAGE;
  }

  if (phone.length < 1) {
    fieldErrors.phone = PHONE_REQUIRED_MESSAGE;
  } else if (
    !/^\d+$/.test(phone) ||
    phone.length < MIN_CUSTOMER_PHONE_LENGTH ||
    phone.length > MAX_CUSTOMER_PHONE_LENGTH
  ) {
    fieldErrors.phone = PHONE_INVALID_MESSAGE;
  }

  const source = await findCompanyOption('source', companyId, submission.sourceId, [
    current?.sourceId ?? null,
  ]);
  if (!source) {
    fieldErrors.sourceId = SOURCE_REQUIRED_MESSAGE;
  }
  if (submission.assigneeId.trim().length < 1) {
    fieldErrors.assigneeId = ASSIGNEE_REQUIRED_MESSAGE;
  } else if (!isUuid(submission.assigneeId)) {
    fieldErrors.assigneeId = ASSIGNEE_INVALID_MESSAGE;
  }
  const status = await readProfileStatus(companyId, submission.statusId, current);
  if (!status) {
    fieldErrors.statusId = PROFILE_STATUS_INVALID_MESSAGE;
  } else if (
    current !== null &&
    isRetainedStatus(current.status.code) &&
    !isRetainedStatus(status.code)
  ) {
    fieldErrors.statusId = PROFILE_STATUS_LOCKED_MESSAGE;
  }
  if (
    submission.firstProcessedOn !== null &&
    parseContactDate(submission.firstProcessedOn) === null
  ) {
    fieldErrors.firstProcessedOn = FIRST_PROCESSED_INVALID_MESSAGE;
  }

  const caseType =
    submission.caseTypeId === null
      ? null
      : await findCompanyOption(
          'caseType',
          companyId,
          submission.caseTypeId,
          current?.caseTypeIds ?? [],
        );
  const retained = status !== null && isRetainedStatus(status.code);
  if (retained) {
    if (!caseType) {
      fieldErrors.caseTypeId = PROFILE_CASE_TYPE_REQUIRED_MESSAGE;
    }
    if (submission.contractedOn === null || submission.contractedOn.trim().length < 1) {
      fieldErrors.contractedOn = PROFILE_CONTRACTED_ON_REQUIRED_MESSAGE;
    } else if (parseContactDate(submission.contractedOn) === null) {
      fieldErrors.contractedOn = PROFILE_CONTRACTED_ON_INVALID_MESSAGE;
    }
    const feeError = moneyFieldError(
      submission.retainerFee ?? '',
      PROFILE_RETAINER_FEE_REQUIRED_MESSAGE,
      PROFILE_RETAINER_FEE_INVALID_MESSAGE,
    );
    if (feeError) {
      fieldErrors.retainerFee = feeError;
    }
  } else if (submission.caseTypeId !== null && !caseType) {
    fieldErrors.caseTypeId = PROFILE_CASE_TYPE_REQUIRED_MESSAGE;
  }

  if (Object.keys(fieldErrors).length > 0 || !source || !status) {
    return { ok: false, fieldErrors };
  }

  const firstProcessedOn =
    submission.firstProcessedOn === null ? null : parseContactDate(submission.firstProcessedOn);
  if (!retained) {
    return {
      ok: true,
      name,
      phone,
      source,
      assigneeId: submission.assigneeId,
      status,
      caseType,
      firstProcessedOn,
      contractedOn: null,
      retainerFee: null,
    };
  }

  const contractedOn = parseContactDate(submission.contractedOn ?? '');
  const retainerFee = Number(submission.retainerFee);
  if (contractedOn === null || caseType === null || !Number.isSafeInteger(retainerFee)) {
    return { ok: false, fieldErrors };
  }
  return {
    ok: true,
    name,
    phone,
    source,
    assigneeId: submission.assigneeId,
    status,
    caseType,
    firstProcessedOn,
    contractedOn,
    retainerFee,
  };
}

async function assertAssignee(
  actor: Extract<CustomerActor, { status: 'ok' }>,
  assigneeId: string,
): Promise<boolean> {
  const assignees = await readAssigneeOptions(actor);
  return assignees.some((assignee) => assignee.id === assigneeId);
}

async function createRetainedCase(
  tx: Prisma.TransactionClient,
  customerId: string,
  actorId: string,
  input: { contractedOn: Date; caseType: CatalogOptionRef; retainerFee: number },
): Promise<void> {
  await tx.customerCase.create({
    data: {
      customerId,
      caseTypeId: input.caseType.id,
      contractedOn: input.contractedOn,
      retainerFee: input.retainerFee,
      deposit: 0,
      installmentCount: 0,
      firstPaymentOn: input.contractedOn,
    },
  });
  await tx.consultation.create({
    data: {
      customerId,
      content: `수임전환 - ${input.caseType.name}`,
      nextContactOn: null,
      actorId,
    },
  });
  await syncLatestNextContact(tx, customerId);
}

export async function createCustomer(
  request: Request,
  submission: CustomerProfileSubmission,
): Promise<{ result: CustomerProfileResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  try {
    const draft = await readProfileDraft(actor.companyId, submission, null);
    if (!draft.ok) {
      return { result: { status: 'invalid', fieldErrors: draft.fieldErrors }, headers };
    }
    if (!(await assertAssignee(actor, draft.assigneeId))) {
      return {
        result: { status: 'invalid', fieldErrors: { assigneeId: ASSIGNEE_INVALID_MESSAGE } },
        headers,
      };
    }
    const taken = await readTakenCustomerKeys(actor.companyId, [
      { name: draft.name, phone: draft.phone },
    ]);
    if (taken.size > 0) {
      return { result: { status: 'duplicate' }, headers };
    }

    const customer = await prisma.$transaction(async (tx) => {
      const created = await tx.customer.create({
        data: {
          companyId: actor.companyId,
          name: draft.name,
          phone: draft.phone,
          sourceId: draft.source.id,
          assigneeId: draft.assigneeId,
          statusId: draft.status.id,
          caseTypeId: draft.caseType?.id ?? null,
          firstProcessedOn: draft.firstProcessedOn,
        },
        select: { id: true },
      });
      if (
        isRetainedStatus(draft.status.code) &&
        draft.caseType &&
        draft.contractedOn &&
        draft.retainerFee !== null
      ) {
        await createRetainedCase(tx, created.id, actor.userId, {
          contractedOn: draft.contractedOn,
          caseType: draft.caseType,
          retainerFee: draft.retainerFee,
        });
      }
      return created;
    });
    return { result: { status: 'ok', id: customer.id }, headers };
  } catch (error) {
    if (isUniqueConflict(error)) {
      return { result: { status: 'duplicate' }, headers };
    }
    console.error('상담 고객을 등록하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export async function updateCustomerProfile(
  request: Request,
  customerId: string,
  submission: CustomerProfileSubmission,
): Promise<{ result: CustomerProfileResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer) {
      return { result: { status: 'not-found' }, headers };
    }
    const currentCase = await prisma.customerCase.findUnique({
      where: { customerId: customer.id },
      select: { caseTypeId: true },
    });
    const draft = await readProfileDraft(actor.companyId, submission, {
      sourceId: customer.sourceId,
      status: customer.status,
      caseTypeIds: [customer.caseTypeId, currentCase?.caseTypeId ?? null],
    });
    if (!draft.ok) {
      return { result: { status: 'invalid', fieldErrors: draft.fieldErrors }, headers };
    }
    if (!(await assertAssignee(actor, draft.assigneeId))) {
      return {
        result: { status: 'invalid', fieldErrors: { assigneeId: ASSIGNEE_INVALID_MESSAGE } },
        headers,
      };
    }
    const duplicate = await prisma.customer.findFirst({
      where: {
        companyId: actor.companyId,
        name: draft.name,
        phone: draft.phone,
        NOT: { id: customer.id },
      },
      select: { id: true },
    });
    if (duplicate) {
      return { result: { status: 'duplicate' }, headers };
    }

    await prisma.$transaction(async (tx) => {
      const existingCase = await tx.customerCase.findUnique({
        where: { customerId: customer.id },
        select: { caseType: { select: catalogOptionRefSelect } },
      });
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          name: draft.name,
          phone: draft.phone,
          sourceId: draft.source.id,
          assigneeId: draft.assigneeId,
          statusId: draft.status.id,
          caseTypeId: draft.caseType?.id ?? null,
          firstProcessedOn: draft.firstProcessedOn,
        },
      });
      if (isRetainedStatus(customer.status.code)) {
        if (!existingCase || !draft.caseType || !draft.contractedOn || draft.retainerFee === null) {
          return;
        }
        await tx.customerCase.update({
          where: { customerId: customer.id },
          data: {
            caseTypeId: draft.caseType.id,
            contractedOn: draft.contractedOn,
            retainerFee: draft.retainerFee,
          },
        });
        if (existingCase.caseType.id !== draft.caseType.id) {
          await tx.consultation.create({
            data: {
              customerId: customer.id,
              content: `사건 유형 변경 - ${existingCase.caseType.name} -> ${draft.caseType.name}`,
              nextContactOn: null,
              actorId: actor.userId,
            },
          });
          await syncLatestNextContact(tx, customer.id);
        }
        return;
      }
      if (
        isRetainedStatus(draft.status.code) &&
        draft.caseType &&
        draft.contractedOn &&
        draft.retainerFee !== null
      ) {
        await createRetainedCase(tx, customer.id, actor.userId, {
          contractedOn: draft.contractedOn,
          caseType: draft.caseType,
          retainerFee: draft.retainerFee,
        });
      }
    });
    return { result: { status: 'ok', id: customer.id }, headers };
  } catch (error) {
    if (isUniqueConflict(error)) {
      return { result: { status: 'duplicate' }, headers };
    }
    if (isMissingRecord(error)) {
      return { result: { status: 'not-found' }, headers };
    }
    console.error('상담 고객을 수정하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export type CustomerDeleteResult =
  | { status: 'ok' }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'failed' };

export async function deleteCustomer(
  request: Request,
  customerId: string,
): Promise<{ result: CustomerDeleteResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer) {
      return { result: { status: 'not-found' }, headers };
    }
    await prisma.$transaction(async (tx) => {
      await tx.installmentRefund.deleteMany({
        where: { payment: { installment: { customerCase: { customerId: customer.id } } } },
      });
      await tx.installmentPayment.deleteMany({
        where: { installment: { customerCase: { customerId: customer.id } } },
      });
      await tx.customerInstallment.deleteMany({
        where: { customerCase: { customerId: customer.id } },
      });
      await tx.customerCase.deleteMany({ where: { customerId: customer.id } });
      await tx.consultation.deleteMany({ where: { customerId: customer.id } });
      await tx.customer.delete({ where: { id: customer.id } });
    });
    return { result: { status: 'ok' }, headers };
  } catch (error) {
    if (isMissingRecord(error)) {
      return { result: { status: 'not-found' }, headers };
    }
    console.error('상담 고객을 삭제하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export type CustomerDetailResult =
  | { status: 'ok'; customer: CustomerDetail }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'failed' };

export type CustomerStatusResult =
  | { status: 'ok'; customerStatus: CatalogOptionRef }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'invalid' }
  | { status: 'locked' }
  | { status: 'failed' };

function seoulCalendarDay(value: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

function toCustomerDetail(
  customer: AccessibleCustomer,
  source: CatalogOptionRef,
  registeredOn: string,
  assigneeId: string | null,
  firstProcessedOn: string | null,
): Omit<CustomerDetail, 'caseType' | 'contractedOn' | 'retainerFee' | 'remainingRetainer'> {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    source: toOptionRef(source),
    assigneeId,
    assigneeName: customer.assignee?.name ?? null,
    status: toOptionRef(customer.status),
    registeredOn,
    firstProcessedOn,
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
    const profile = await prisma.customer.findUnique({
      where: { id: customer.id },
      select: {
        source: { select: catalogOptionRefSelect },
        createdAt: true,
        assigneeId: true,
        firstProcessedOn: true,
        caseType: { select: catalogOptionRefSelect },
        customerCase: {
          select: {
            caseType: { select: catalogOptionRefSelect },
            contractedOn: true,
            retainerFee: true,
          },
        },
      },
    });
    if (!profile) {
      return { result: { status: 'not-found' }, headers };
    }
    const detail = toCustomerDetail(
      customer,
      profile.source,
      seoulCalendarDay(profile.createdAt),
      profile.assigneeId,
      profile.firstProcessedOn ? formatContactDate(profile.firstProcessedOn) : null,
    );
    const customerCase = profile.customerCase;
    if (!customerCase) {
      return {
        result: {
          status: 'ok',
          customer: {
            ...detail,
            caseType: profile.caseType ? toOptionRef(profile.caseType) : null,
            contractedOn: null,
            retainerFee: null,
            remainingRetainer: null,
          },
        },
        headers,
      };
    }
    const installments = await readCustomerInstallments(customer.id);
    if (installments === null) {
      return { result: { status: 'failed' }, headers };
    }
    const netReceived = installments.reduce((sum, row) => sum + row.receivedAmount, 0);
    return {
      result: {
        status: 'ok',
        customer: {
          ...detail,
          caseType: toOptionRef(customerCase.caseType),
          contractedOn: formatContactDate(customerCase.contractedOn),
          retainerFee: customerCase.retainerFee,
          remainingRetainer: Math.max(customerCase.retainerFee - netReceived, 0),
        },
      },
      headers,
    };
  } catch (error) {
    console.error('상담 고객을 불러오지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export async function updateCustomerStatus(
  request: Request,
  customerId: string,
  statusId: string,
): Promise<{ result: CustomerStatusResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer) {
      return { result: { status: 'not-found' }, headers };
    }
    if (customer.status.id === statusId) {
      return { result: { status: 'ok', customerStatus: toOptionRef(customer.status) }, headers };
    }
    if (isRetainedStatus(customer.status.code)) {
      return { result: { status: 'locked' }, headers };
    }
    const target = await findCompanyOption('status', actor.companyId, statusId);
    if (!target || isRetainedStatus(target.code)) {
      return { result: { status: 'invalid' }, headers };
    }

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: { statusId: target.id },
      select: { status: { select: catalogOptionRefSelect } },
    });
    return { result: { status: 'ok', customerStatus: toOptionRef(updated.status) }, headers };
  } catch (error) {
    if (isMissingRecord(error)) {
      return { result: { status: 'not-found' }, headers };
    }
    console.error('상담 상태를 변경하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export type CustomerCaseTypeResult =
  | { status: 'ok'; caseType: CatalogOptionRef }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'invalid' }
  | { status: 'missing-case' }
  | { status: 'failed' };

export async function updateCustomerCaseType(
  request: Request,
  customerId: string,
  caseTypeId: string,
): Promise<{ result: CustomerCaseTypeResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  try {
    const customer = await readAccessibleCustomer(actor, customerId);
    if (!customer) {
      return { result: { status: 'not-found' }, headers };
    }
    const currentCase = await prisma.customerCase.findUnique({
      where: { customerId: customer.id },
      select: { caseTypeId: true },
    });
    if (!currentCase) {
      return { result: { status: 'missing-case' }, headers };
    }
    const caseType = await findCompanyOption('caseType', actor.companyId, caseTypeId, [
      currentCase.caseTypeId,
    ]);
    if (!caseType) {
      return { result: { status: 'invalid' }, headers };
    }
    const outcome = await prisma.$transaction(async (tx) => {
      const existing = await tx.customerCase.findUnique({
        where: { customerId: customer.id },
        select: { caseType: { select: catalogOptionRefSelect } },
      });
      if (!existing) {
        return { status: 'missing-case' } as const;
      }
      if (existing.caseType.id === caseType.id) {
        return { status: 'ok', caseType } as const;
      }
      const updated = await tx.customerCase.updateMany({
        where: { customerId: customer.id, caseTypeId: existing.caseType.id },
        data: { caseTypeId: caseType.id },
      });
      if (updated.count !== 1) {
        const current = await tx.customerCase.findUnique({
          where: { customerId: customer.id },
          select: { caseType: { select: catalogOptionRefSelect } },
        });
        if (!current) {
          return { status: 'missing-case' } as const;
        }
        return { status: 'ok', caseType: toOptionRef(current.caseType) } as const;
      }
      await tx.consultation.create({
        data: {
          customerId: customer.id,
          content: `사건 유형 변경 - ${existing.caseType.name} -> ${caseType.name}`,
          nextContactOn: null,
          actorId: actor.userId,
        },
      });
      await syncLatestNextContact(tx, customer.id);
      return { status: 'ok', caseType } as const;
    });
    return { result: outcome, headers };
  } catch (error) {
    console.error('사건 유형을 변경하지 못했습니다.', errorCodeLabel(error));
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
  | { status: 'ok'; customerStatus: CatalogOptionRef }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'invalid'; fieldErrors: CustomerRetainFieldErrors }
  | { status: 'failed' };

type RetainWrite =
  | {
      ok: true;
      contractedOn: Date;
      caseTypeId: string;
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
  if (!isUuid(submission.caseTypeId)) {
    fieldErrors.caseTypeId = CASE_TYPE_REQUIRED_MESSAGE;
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
    !Number.isSafeInteger(retainerFee) ||
    !Number.isSafeInteger(deposit) ||
    !Number.isSafeInteger(installmentCount)
  ) {
    return { ok: false, fieldErrors };
  }
  return {
    ok: true,
    contractedOn,
    caseTypeId: submission.caseTypeId,
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
    if (!customer) {
      return { result: { status: 'not-found' }, headers };
    }
    if (isRetainedStatus(customer.status.code)) {
      return { result: { status: 'ok', customerStatus: toOptionRef(customer.status) }, headers };
    }

    const input = readRetainWrite(submission);
    if (!input.ok) {
      return { result: { status: 'invalid', fieldErrors: input.fieldErrors }, headers };
    }
    const caseType = await findCompanyOption('caseType', actor.companyId, input.caseTypeId);
    if (!caseType) {
      return {
        result: { status: 'invalid', fieldErrors: { caseTypeId: CASE_TYPE_REQUIRED_MESSAGE } },
        headers,
      };
    }
    const retainedStatus = await findCompanyStatusByCode(actor.companyId, RETAINED_STATUS_CODE);
    if (!retainedStatus) {
      console.error('회사의 수임 상담 상태를 찾지 못했습니다.');
      return { result: { status: 'failed' }, headers };
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.customer.updateMany({
        where: { id: customer.id, statusId: { not: retainedStatus.id } },
        data: { statusId: retainedStatus.id },
      });
      if (updated.count !== 1) {
        return;
      }
      const customerCase = await tx.customerCase.create({
        data: {
          customerId: customer.id,
          contractedOn: input.contractedOn,
          caseTypeId: caseType.id,
          retainerFee: input.retainerFee,
          deposit: input.deposit,
          installmentCount: input.installmentCount,
          firstPaymentOn: input.firstPaymentOn,
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
          content: `수임전환 - ${caseType.name}`,
          nextContactOn: null,
          actorId: actor.userId,
        },
      });
      await syncLatestNextContact(tx, customer.id);
    });
    return { result: { status: 'ok', customerStatus: toOptionRef(retainedStatus) }, headers };
  } catch (error) {
    if (isMissingRecord(error)) {
      return { result: { status: 'not-found' }, headers };
    }
    console.error('수임으로 전환하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}
