import {
  customerVisibilityWhere,
  resolveCustomerActor,
} from '~/features/customers/api/customerScope.server';
import { MAX_CUSTOMER_KEYWORD_LENGTH } from '~/features/customers/type';
import { RECEIVABLE_PAGE_SIZE } from '~/features/receivables/type';
import { prisma } from '~/lib/db.server';
import { errorCodeLabel } from '~/lib/error.server';

import type {
  ReceivableListItem,
  ReceivableSearchField,
  ReceivableStatus,
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

function installmentStatus(
  promisedOn: string,
  remainingAmount: number,
  today: string,
): ReceivableStatus {
  if (remainingAmount === 0) {
    return 'PAID';
  }
  if (promisedOn < today) {
    return 'OVERDUE';
  }
  return 'SCHEDULED';
}

async function readScopedReceivables(
  visibility: Prisma.CustomerWhereInput,
  query: ReceivableListQuery,
  today: string,
): Promise<{ receivables: ReceivableListItem[]; total: number }> {
  const keyword = query.keyword.trim().slice(0, MAX_CUSTOMER_KEYWORD_LENGTH);
  const where: Prisma.CustomerInstallmentWhereInput = {
    customerCase: {
      customer: {
        ...visibility,
        ...(keyword ? keywordWhere(query.field, keyword) : {}),
      },
    },
  };
  const [total, rows] = await prisma.$transaction([
    prisma.customerInstallment.count({ where }),
    prisma.customerInstallment.findMany({
      where,
      select: {
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
      },
      orderBy: [{ promisedOn: 'asc' }, { sequence: 'asc' }, { id: 'asc' }],
      skip: (query.page - 1) * RECEIVABLE_PAGE_SIZE,
      take: RECEIVABLE_PAGE_SIZE,
    }),
  ]);
  const receivables = rows.map((row) => {
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
      status: installmentStatus(promisedOn, remainingAmount, today),
    };
  });
  return { receivables, total };
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
