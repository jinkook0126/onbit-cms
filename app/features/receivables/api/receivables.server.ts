import { parseContactDate } from '~/features/customers/api/customerDates.server';
import {
  customerVisibilityWhere,
  resolveCustomerActor,
} from '~/features/customers/api/customerScope.server';
import { MAX_CUSTOMER_KEYWORD_LENGTH } from '~/features/customers/type';
import { RECEIVABLE_PAGE_SIZE, receivableInstallmentStatus } from '~/features/receivables/type';
import { prisma } from '~/lib/db.server';
import { errorCodeLabel } from '~/lib/error.server';

import type {
  ReceivableCalendarDay,
  ReceivableListItem,
  ReceivablePaymentFilter,
  ReceivableScheduleItem,
  ReceivableSearchField,
  ReceivableSort,
} from '~/features/receivables/type';
import type { Prisma } from '../../../../generated/prisma/client';

export type ReceivableListResult =
  | {
      status: 'ok';
      receivables: ReceivableListItem[];
      page: number;
      pageSize: number;
      total: number;
    }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'failed' };

export type ReceivableListQuery = {
  field: ReceivableSearchField;
  keyword: string;
  from: string;
  to: string;
  status: ReceivablePaymentFilter;
  sort: ReceivableSort;
  page: number;
};

function seoulToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function formatPromisedOn(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function keywordWhere(field: ReceivableSearchField, keyword: string): Prisma.CustomerWhereInput {
  if (field === 'name') {
    return { name: { contains: keyword, mode: 'insensitive' } };
  }
  return {
    assignee: {
      is: { name: { contains: keyword, mode: 'insensitive' } },
    },
  };
}

const installmentListSelect = {
  id: true,
  kind: true,
  sequence: true,
  promisedOn: true,
  scheduledAmount: true,
  receivedAmount: true,
  customerCase: {
    select: {
      customer: { select: { id: true, name: true } },
    },
  },
} as const;

function installmentListOrder(sort: ReceivableSort) {
  return [{ promisedOn: sort }, { sequence: sort }, { id: sort }] as const;
}

type InstallmentListRow = {
  id: string;
  kind: ReceivableListItem['kind'];
  sequence: number;
  promisedOn: Date;
  scheduledAmount: number;
  receivedAmount: number;
  customerCase: { customer: { id: string; name: string } };
};

function promisedOnFilter(from: string, to: string): Prisma.DateTimeFilter | undefined {
  const gte = from === '' ? null : parseContactDate(from);
  const lte = to === '' ? null : parseContactDate(to);
  if (gte === null && lte === null) {
    return undefined;
  }
  return {
    ...(gte === null ? {} : { gte }),
    ...(lte === null ? {} : { lte }),
  };
}

function matchesPaymentFilter(
  row: InstallmentListRow,
  status: ReceivablePaymentFilter,
  today: string,
): boolean {
  if (status === 'ALL') {
    return true;
  }
  const remainingAmount = Math.max(row.scheduledAmount - row.receivedAmount, 0);
  const computed = receivableInstallmentStatus(
    formatPromisedOn(row.promisedOn),
    remainingAmount,
    today,
  );
  return computed === status;
}

function toListItem(row: InstallmentListRow, today: string): ReceivableListItem {
  const promisedOn = formatPromisedOn(row.promisedOn);
  const remainingAmount = Math.max(row.scheduledAmount - row.receivedAmount, 0);
  return {
    id: row.id,
    customerId: row.customerCase.customer.id,
    customerName: row.customerCase.customer.name,
    kind: row.kind,
    sequence: row.sequence,
    promisedOn,
    scheduledAmount: row.scheduledAmount,
    remainingAmount,
    status: receivableInstallmentStatus(promisedOn, remainingAmount, today),
  };
}

async function readScopedReceivables(
  visibility: Prisma.CustomerWhereInput,
  query: ReceivableListQuery,
  today: string,
): Promise<{ receivables: ReceivableListItem[]; total: number }> {
  const keyword = query.keyword.trim().slice(0, MAX_CUSTOMER_KEYWORD_LENGTH);
  const promisedOn = promisedOnFilter(query.from, query.to);
  const where: Prisma.CustomerInstallmentWhereInput = {
    ...(promisedOn === undefined ? {} : { promisedOn }),
    customerCase: {
      customer: {
        ...visibility,
        ...(keyword ? keywordWhere(query.field, keyword) : {}),
      },
    },
  };
  const skip = (query.page - 1) * RECEIVABLE_PAGE_SIZE;
  if (query.status === 'ALL') {
    const [total, rows] = await prisma.$transaction([
      prisma.customerInstallment.count({ where }),
      prisma.customerInstallment.findMany({
        where,
        select: installmentListSelect,
        orderBy: [...installmentListOrder(query.sort)],
        skip,
        take: RECEIVABLE_PAGE_SIZE,
      }),
    ]);
    return { receivables: rows.map((row) => toListItem(row, today)), total };
  }
  const rows = await prisma.customerInstallment.findMany({
    where,
    select: installmentListSelect,
    orderBy: [...installmentListOrder(query.sort)],
  });
  const filtered = rows.filter((row) => matchesPaymentFilter(row, query.status, today));
  return {
    receivables: filtered
      .slice(skip, skip + RECEIVABLE_PAGE_SIZE)
      .map((row) => toListItem(row, today)),
    total: filtered.length,
  };
}

export async function readReceivables(
  request: Request,
  query: ReceivableListQuery,
): Promise<{ result: ReceivableListResult; headers: Headers }> {
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
    const scoped = await readScopedReceivables(visibility, query, seoulToday());
    return {
      result: {
        status: 'ok',
        receivables: scoped.receivables,
        page: query.page,
        pageSize: RECEIVABLE_PAGE_SIZE,
        total: scoped.total,
      },
      headers,
    };
  } catch (error) {
    console.error('분납 목록을 불러오지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export type ReceivableScheduleQuery = {
  promisedOn: Date;
  name: string;
};

export type ReceivableScheduleResult =
  | { status: 'ok'; receivables: ReceivableScheduleItem[] }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'failed' };

export async function readReceivableSchedule(
  request: Request,
  query: ReceivableScheduleQuery,
): Promise<{ result: ReceivableScheduleResult; headers: Headers }> {
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
    const name = query.name.trim().slice(0, MAX_CUSTOMER_KEYWORD_LENGTH);
    const today = seoulToday();
    const promisedOn = formatPromisedOn(query.promisedOn);
    const rows = await prisma.customerInstallment.findMany({
      where: {
        promisedOn: query.promisedOn,
        customerCase: {
          customer: {
            ...visibility,
            ...(name === '' ? {} : { name: { contains: name, mode: 'insensitive' } }),
          },
        },
      },
      select: {
        id: true,
        kind: true,
        sequence: true,
        scheduledAmount: true,
        receivedAmount: true,
        customerCase: {
          select: {
            customer: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [
        { customerCase: { customer: { name: 'asc' } } },
        { sequence: 'asc' },
        { id: 'asc' },
      ],
    });
    const receivables = rows.map((row) => {
      const remainingAmount = Math.max(row.scheduledAmount - row.receivedAmount, 0);
      return {
        id: row.id,
        customerId: row.customerCase.customer.id,
        customerName: row.customerCase.customer.name,
        kind: row.kind,
        sequence: row.sequence,
        status: receivableInstallmentStatus(promisedOn, remainingAmount, today),
      };
    });
    return { result: { status: 'ok', receivables }, headers };
  } catch (error) {
    console.error('납부 일정을 불러오지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

export type ReceivableCalendarQuery = {
  month: string;
  name: string;
};

export type ReceivableCalendarResult =
  | { status: 'ok'; days: ReceivableCalendarDay[] }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'not-found' }
  | { status: 'failed' };

function monthBounds(month: string): { start: Date; end: Date } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) {
    return null;
  }
  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    end: new Date(Date.UTC(year, monthNumber, 0)),
  };
}

export async function readReceivableCalendar(
  request: Request,
  query: ReceivableCalendarQuery,
): Promise<{ result: ReceivableCalendarResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }
  const bounds = monthBounds(query.month);
  if (!bounds) {
    return { result: { status: 'failed' }, headers };
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
    const name = query.name.trim().slice(0, MAX_CUSTOMER_KEYWORD_LENGTH);
    const rows = await prisma.customerInstallment.findMany({
      where: {
        promisedOn: { gte: bounds.start, lte: bounds.end },
        customerCase: {
          customer: {
            ...visibility,
            ...(name === '' ? {} : { name: { contains: name, mode: 'insensitive' } }),
          },
        },
      },
      select: {
        promisedOn: true,
        scheduledAmount: true,
        customerCase: {
          select: {
            customer: { select: { id: true, name: true } },
          },
        },
      },
    });
    const peopleByDate = new Map<string, Map<string, { name: string; amount: number }>>();
    for (const row of rows) {
      const date = formatPromisedOn(row.promisedOn);
      const customer = row.customerCase.customer;
      const people = peopleByDate.get(date) ?? new Map<string, { name: string; amount: number }>();
      const current = people.get(customer.id);
      if (current) {
        current.amount += row.scheduledAmount;
      } else {
        people.set(customer.id, { name: customer.name, amount: row.scheduledAmount });
      }
      peopleByDate.set(date, people);
    }
    const days: ReceivableCalendarDay[] = [];
    const dates = [...peopleByDate.keys()].sort();
    for (const date of dates) {
      const people = peopleByDate.get(date);
      if (!people) {
        continue;
      }
      const list = [...people.values()].sort((left, right) =>
        left.name.localeCompare(right.name, 'ko'),
      );
      if (list.length === 0) {
        continue;
      }
      const first = list[0];
      days.push({
        date,
        totalAmount: list.reduce((sum, person) => sum + person.amount, 0),
        customerName: first.name,
        extraCount: list.length - 1,
      });
    }
    return { result: { status: 'ok', days }, headers };
  } catch (error) {
    console.error('분납 캘린더를 불러오지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}
